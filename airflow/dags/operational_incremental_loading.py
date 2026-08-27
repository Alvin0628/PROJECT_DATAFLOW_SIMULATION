"""
Operational Incremental Loading DAG - TIME-BASED VERSION
(Bash-based with proper quote escaping)

This version uses BashOperator instead of PythonOperator to avoid
Airflow 2.10 SDK API gateway issues. Uses single quotes for bash heredoc.

Workflow:
  1. check_pipeline_completion: Checks Time Window state from metadata
  2. incremental_loader_batch: Run loader for 1 Month Window
  3. validate_batch_processing: Validates orders are loaded
  4. report_pipeline_status: Reports progress based on dates
"""

import sys
sys.path.insert(0, '/opt/airflow')

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.utils.trigger_rule import TriggerRule
from datetime import datetime, timedelta
from airflow.operators.trigger_dagrun import TriggerDagRunOperator

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=1),
}

dag = DAG(
    "operational_incremental_loading",
    default_args=default_args,
    description="Incremental loading: operational_raw → operational (Time-based by Month)",
    schedule="*/3 * * * *",  # setiap 3 menit (sebelumnya: setiap 1 menit)
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["data-loading", "incremental", "operational"],
)

check_progress_task = BashOperator(
    task_id="check_pipeline_completion",
    bash_command="""
cd /opt/airflow && python << 'EOF'
import sys
sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE

pipeline_name = PIPELINE['pipeline_name']

with Postgres() as db:
    metadata = PipelineMetadata(db)
    state = metadata.get(pipeline_name)
    
    print('='*80)
    print('Pipeline Status Check (Time-Based)')
    print(f'  Window Start: {state["current_period_start"]}')
    print(f'  Window End  : {state["current_period_end"]}')
    print(f'  Batch #     : {state["batch_number"]}')
    print(f'  Complete    : {state["is_completed"]}')
    print('='*80)
    
    if state['is_completed']:
        print('Pipeline already complete (Reached latest data). Skipping incremental load.')
        sys.exit(99)
EOF
    """,
    dag=dag,
)

incremental_load_task = BashOperator(
    task_id="incremental_loader_batch",
    bash_command="""
cd /opt/airflow && python -m scripts.loaders.incremental_loader
    """,
    dag=dag,
)

validate_task = BashOperator(
    task_id="validate_batch_processing",
    bash_command="""
cd /opt/airflow && python << 'EOF'
import sys
sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.config import SCHEMA

with Postgres() as db:
    db.execute(f'SELECT COUNT(*) FROM {SCHEMA["operational"]}.orders')
    operational_orders = db.fetchone()[0]
    
    db.execute(f'SELECT COUNT(*) FROM {SCHEMA["raw"]}.orders')
    raw_orders = db.fetchone()[0]
    
    print('='*80)
    print('Batch Validation')
    print(f'  Orders in operational_raw: {raw_orders}')
    print(f'  Orders in operational: {operational_orders}')
    print(f'  Progress: {operational_orders}/{raw_orders}')
    print('='*80)
    
    assert operational_orders > 0, 'No orders loaded to operational in this batch'
    assert operational_orders <= raw_orders, 'Operational has more orders than raw'
EOF
    """,
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    dag=dag,
)

report_task = BashOperator(
    task_id="report_pipeline_status",
    bash_command="""
cd /opt/airflow && python << 'EOF'
import sys
sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE, SCHEMA

pipeline_name = PIPELINE['pipeline_name']

with Postgres() as db:
    metadata = PipelineMetadata(db)
    state = metadata.get(pipeline_name)
    
    db.execute(f'SELECT COUNT(*) FROM {SCHEMA["operational"]}.orders')
    operational_orders = db.fetchone()[0]
    
    db.execute(f'SELECT COUNT(*) FROM {SCHEMA["raw"]}.orders')
    raw_orders = db.fetchone()[0]
    
    progress_pct = (operational_orders / raw_orders * 100) if raw_orders > 0 else 0
    
    print('='*80)
    print('Pipeline Status Report')
    print(f'  Total Orders (raw)    : {raw_orders}')
    print(f'  Loaded Orders         : {operational_orders}')
    print(f'  Overall Progress      : {progress_pct:.2f}%')
    print(f'  Current Window Start  : {state["current_period_start"]}')
    print(f'  Current Window End    : {state["current_period_end"]}')
    print(f'  Current Batch #       : {state["batch_number"]}')
    status = 'COMPLETE' if state['is_completed'] else 'IN PROGRESS'
    print(f'  Status: {status}')
    print('='*80)
EOF
    """,
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    dag=dag,
)

trigger_dbt_gold_task = TriggerDagRunOperator(
    task_id="trigger_dbt_gold_pipeline",
    trigger_dag_id="dbt_gold_pipeline",
    wait_for_completion=True,   
    poke_interval=10,
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    dag=dag,
)

check_progress_task >> incremental_load_task >> validate_task >> report_task >> trigger_dbt_gold_task
