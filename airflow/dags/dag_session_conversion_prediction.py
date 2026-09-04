from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import sys

sys.path.insert(0, '/opt/airflow')
from scripts.ml.session_conversion.batch_inference import run_batch_inference
from scripts.ml.session_conversion.inference_evaluator import evaluate_production_inference
from scripts.common.airflow_callbacks import dag_success_callback, dag_failure_callback

default_args = {
    "owner": "data-science-team",
    "retries": 1,
    "retry_delay": timedelta(minutes=1),
}

with DAG(
    dag_id="ml_session_conversion_inference_pipeline",
    default_args=default_args,
    description="Inference runs independently on every batch",
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "inference"],
    max_active_runs=3, 
    on_success_callback=dag_success_callback,
    on_failure_callback=dag_failure_callback,
) as dag:

    inference_conversion_task = PythonOperator(
        task_id="inference_conversion_model",
        python_callable=run_batch_inference,
    )
    
    evaluation_production_task = PythonOperator(
        task_id="evaluate_production_inference",
        python_callable=evaluate_production_inference,
    )

    inference_conversion_task >> evaluation_production_task