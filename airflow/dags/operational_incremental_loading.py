"""
Operational Incremental Loading DAG - FIXED VERSION (Bash-based with proper quote escaping)

This version uses BashOperator instead of PythonOperator to avoid
Airflow 2.10 SDK API gateway issues. Uses single quotes for bash heredoc.

Workflow:
  1. check_pipeline_completion: Bash script checks if complete
  2. incremental_loader_batch: Run loader
  3. validate_batch_processing: Bash validation
  4. report_pipeline_status: Bash reporting
"""

import sys
sys.path.insert(0, '/opt/airflow')

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.utils.trigger_rule import TriggerRule
from datetime import datetime, timedelta

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=1),
}

dag = DAG(
    "operational_incremental_loading",
    default_args=default_args,
    description="Incremental loading: operational_raw → operational (batch by batch)",
    schedule="*/5 * * * *",  # Every 5 minutes
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["data-loading", "incremental", "operational"],
)

# ========================================================================
# Task 1: Check Pipeline Completion
# ========================================================================
check_progress_task = BashOperator(
    task_id="check_pipeline_completion",
    bash_command="""
cd /opt/airflow && python << 'EOF'
import sys
sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.config import PIPELINE

pipeline_name = PIPELINE['pipeline_name']

with Postgres() as db:
    metadata = PipelineMetadata(db)
    repo = OperationalRepository(db)
    
    total_users = repo.get_total_users_in_raw()
    progress = metadata.validate_progress(pipeline_name, total_users)
    
    print('='*80)
    print('Pipeline Status Check')
    print(f'  Progress: {progress["offset"]}/{progress["total"]} users')
    print(f'  Percentage: {progress["progress_pct"]:.2f}%')
    print(f'  Batch #: {progress["batch_number"]}')
    print(f'  Complete: {progress["is_complete"]}')
    print('='*80)
    
    if progress['is_complete']:
        print('Pipeline already complete. Skipping incremental load.')
        sys.exit(99)  # Exit code 86 triggers skip
EOF
    """,
    dag=dag,
)

# ========================================================================
# Task 2: Run Incremental Loader
# ========================================================================
incremental_load_task = BashOperator(
    task_id="incremental_loader_batch",
    bash_command="""
cd /opt/airflow && python -m scripts.loaders.incremental_loader
    """,
    dag=dag,
)

# ========================================================================
# Task 3: Validate Batch Processing
# ========================================================================
validate_task = BashOperator(
    task_id="validate_batch_processing",
    bash_command="""
cd /opt/airflow && python << 'EOF'
import sys
sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.config import SCHEMA

with Postgres() as db:
    db.execute(f'SELECT COUNT(*) FROM {SCHEMA["operational"]}.users')
    operational_users = db.fetchone()[0]
    
    db.execute(f'SELECT COUNT(*) FROM {SCHEMA["raw"]}.users')
    raw_users = db.fetchone()[0]
    
    print('='*80)
    print('Batch Validation')
    print(f'  Users in operational_raw: {raw_users}')
    print(f'  Users in operational: {operational_users}')
    print(f'  Progress: {operational_users}/{raw_users}')
    print('='*80)
    
    assert operational_users > 0, 'No users loaded to operational'
    assert operational_users <= raw_users, 'Operational has more users than raw'
EOF
    """,
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    dag=dag,
)

# ========================================================================
# Task 4: Report Pipeline Status
# ========================================================================
report_task = BashOperator(
    task_id="report_pipeline_status",
    bash_command="""
cd /opt/airflow && python << 'EOF'
import sys
sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.config import PIPELINE, SCHEMA

pipeline_name = PIPELINE['pipeline_name']

with Postgres() as db:
    metadata = PipelineMetadata(db)
    repo = OperationalRepository(db)
    
    state = metadata.get(pipeline_name)
    total_users = repo.get_total_users_in_raw()
    progress = metadata.validate_progress(pipeline_name, total_users)
    
    db.execute(f'SELECT COUNT(*) FROM {SCHEMA["operational"]}.users')
    operational_users = db.fetchone()[0]
    
    print('='*80)
    print('Pipeline Status Report')
    print(f'  Total Users (raw): {total_users}')
    print(f'  Loaded Users (operational): {operational_users}')
    print(f'  Current Offset: {progress["offset"]}')
    print(f'  Current Batch: {progress["batch_number"]}')
    print(f'  Progress: {progress["progress_pct"]:.2f}%')
    status = 'COMPLETE' if progress['is_complete'] else 'IN PROGRESS'
    print(f'  Status: {status}')
    print('='*80)
EOF
    """,
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    dag=dag,
)

# ========================================================================
# Dependencies
# ========================================================================
check_progress_task >> incremental_load_task >> validate_task >> report_task
