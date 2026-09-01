from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator
from datetime import datetime, timedelta
import sys

# Pastikan path modul terbaca
sys.path.insert(0, '/opt/airflow')
from scripts.ml.customer_churn.model_evaluator import evaluate_model
from scripts.common.airflow_callbacks import dag_success_callback, dag_failure_callback

default_args = {
    "owner": "data-science-team",
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

def check_if_training_needed(**context):
    dag_conf = context.get("dag_run").conf or {}
    try:
        current_batch = int(dag_conf.get("batch_number", 0))
    except (TypeError, ValueError):
        current_batch = 0
        
    print(f"📥 Target Batch untuk Churn Training: {current_batch}")
    
    if current_batch > 0 and current_batch % 6 == 0:
        return "train_churn_model"
    else:
        return "skip_training"

with DAG(
    dag_id="ml_churn_training_pipeline",
    default_args=default_args,
    description="Event-driven ML Training (Every 6 Batches)",
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "training", "churn"],
    max_active_runs=1,
    on_success_callback=dag_success_callback,
    on_failure_callback=dag_failure_callback,
) as dag:

    branching_task = BranchPythonOperator(
        task_id="check_if_training_needed",
        python_callable=check_if_training_needed,
    )

    # Eksekusi berat di-offload ke Docker daemon Host (DooD)
    train_churn_task = BashOperator(
        task_id="train_churn_model",
        bash_command=(
            'cd "$PROJECT_ROOT" && '
            'docker compose run --rm --no-deps ml-trainer'
        ),
        execution_timeout=timedelta(minutes=30),
    )

    evaluate_churn_task = PythonOperator(
        task_id="evaluate_churn_model",
        python_callable=evaluate_model,
    )
    
    skip_training = BashOperator(
        task_id="skip_training",
        bash_command="echo 'Bukan kelipatan 6. Skip Churn Training.'",
    )

    branching_task >> train_churn_task >> evaluate_churn_task
    branching_task >> skip_training