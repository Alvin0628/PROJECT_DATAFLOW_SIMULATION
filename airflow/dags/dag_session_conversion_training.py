from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator
from datetime import datetime, timedelta
import sys

sys.path.insert(0, '/opt/airflow')
from scripts.ml.session_conversion.model_evaluator import evaluate_model
from scripts.common.airflow_callbacks import dag_success_callback, dag_failure_callback

default_args = {
    "owner": "data-science-team",
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

def check_if_training_needed(**context):
    dag_conf = context.get("dag_run").conf or {}
    current_batch = int(dag_conf.get("batch_number", 0))
    
    if current_batch > 0 and current_batch % 6 == 0:
        return "train_conversion_model"
    else:
        return "skip_training" # Selesai, tidak ngapa-ngapain

with DAG(
    dag_id="ml_session_conversion_training_pipeline",
    default_args=default_args,
    description="Training hanya jalan kelipatan 6, tidak memblokir inference",
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "training"],
    max_active_runs=1,
    on_success_callback=dag_success_callback,
    on_failure_callback=dag_failure_callback,
) as dag:

    branching_task = BranchPythonOperator(
        task_id="check_if_training_needed",
        python_callable=check_if_training_needed,
    )

    train_conversion_task = BashOperator(
        task_id="train_conversion_model",
        bash_command=(
            'cd "$PROJECT_ROOT" && '
            'docker compose run --rm --no-deps ml-trainer-conversion'
        ),
        execution_timeout=timedelta(minutes=30),
    )

    evaluate_conversion_task = PythonOperator(
        task_id="evaluate_conversion_model",
        python_callable=evaluate_model,
    )
    
    # Task kosong untuk jalur skip
    skip_training = BashOperator(
        task_id="skip_training",
        bash_command="echo 'Bukan kelipatan 6. Skip Training.'",
    )

    branching_task >> train_conversion_task >> evaluate_conversion_task
    branching_task >> skip_training