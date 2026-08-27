from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import sys

sys.path.insert(0, '/opt/airflow')
from scripts.ml.customer_churn.batch_inference import run_batch_inference
from scripts.ml.customer_churn.inference_evaluator import evaluate_production_inference

default_args = {
    "owner": "data-science-team",
    "retries": 1,
    "retry_delay": timedelta(minutes=1),
}

with DAG(
    dag_id="ml_churn_inference_pipeline",
    default_args=default_args,
    description="Inference dijalankan SETIAP batch secara independen untuk Churn",
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "inference", "churn"],
    max_active_runs=3, 
) as dag:

    inference_churn_task = PythonOperator(
        task_id="inference_churn_model",
        python_callable=run_batch_inference,
    )
    
    # Task ini memantau kinerja produksi model terhadap kenyataan
    evaluation_production_task = PythonOperator(
        task_id="evaluate_production_inference",
        python_callable=evaluate_production_inference,
    )

    inference_churn_task >> evaluation_production_task