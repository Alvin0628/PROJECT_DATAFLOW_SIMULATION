from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from datetime import datetime
import sys
import os
import pandas as pd
from sqlalchemy import create_engine

sys.path.insert(0, '/opt/airflow')
from scripts.ml.export_parquet import export_gold_to_parquet
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE

default_args = {
    "owner": "data-engineering",
    "retries": 1,
}

# 1. PERBAIKAN: Fungsi ini sekarang mengambil Batch DAN Waktu Simulasi
def fetch_current_metadata(**context):
    # A. Ambil Batch Number
    with Postgres() as db:
        metadata = PipelineMetadata(db)
        state = metadata.get(PIPELINE['pipeline_name'])
        batch_num = state.get("batch_number", 0)
        
    # B. Ambil Bulan Simulasi (YYYY_MM)
    try:
        db_user = os.getenv("POSTGRES_USER_warehouse", "postgres")
        db_password = os.getenv("POSTGRES_PASSWORD_warehouse", "postgres") 
        db_host = os.getenv("POSTGRES_HOST", "postgres_warehouse")
        db_port = os.getenv("POSTGRES_PORT_warehouse", "5432")
        db_name = os.getenv("POSTGRES_DB_warehouse", "postgres")
        
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        engine = create_engine(db_url)
        
        sim_time_query = "SELECT MAX(created_at) FROM silver.orders"
        current_sim_time = pd.read_sql(sim_time_query, engine).iloc[0, 0]
        sim_month_str = current_sim_time.strftime("%Y_%m") 
    except Exception as e:
        print(f"Gagal deteksi waktu, fallback ke lokal: {e}")
        sim_month_str = pd.Timestamp.now().strftime("%Y_%m")
        
    print(f"DEBUG: Current batch number: {batch_num}")
    print(f"DEBUG: Current sim month: {sim_month_str}")
    
    # C. Return sebagai Dictionary agar bisa ditarik semuanya via XCom
    return {
        "batch_number": batch_num,
        "sim_month": sim_month_str
    }

with DAG(
    dag_id="dbt_gold_pipeline",
    default_args=default_args,
    description="dbt run, export to Parquet, and trigger ML pipelines with payload",
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["data-loading", "gold", "dbt"],
    max_active_runs=1,
) as dag:

    run_dbt_task = BashOperator(
        task_id="run_dbt_gold_layer",
        bash_command="cd /opt/airflow/dbt_gold_layer/gold_layer_models && dbt run",
    )

    test_dbt_task = BashOperator(
        task_id="test_dbt_gold_layer",
        bash_command="cd /opt/airflow/dbt_gold_layer/gold_layer_models && dbt test",
    )

    # 2. PERBAIKAN: Tarik metadata SEBELUM export parquet
    get_metadata_task = PythonOperator(
        task_id="fetch_current_metadata",
        python_callable=fetch_current_metadata,
    )

    # 3. PERBAIKAN: Lempar 'sim_month' ke dalam script Python Export via op_kwargs
    export_parquet_task = PythonOperator(
        task_id="export_gold_tables_to_parquet",
        python_callable=export_gold_to_parquet,
        op_kwargs={
            "sim_month": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['sim_month'] }}"
        }
    )
    
    # =========================================================================
    # 4 TRIGGER MLOPS (JALAN PARALEL)
    # =========================================================================
    
    # 4. PERBAIKAN: Payload 'conf' sekarang melempar batch_number DAN sim_month
    trigger_ml_churn_training_task = TriggerDagRunOperator(
        task_id="trigger_ml_churn_training",
        trigger_dag_id="ml_churn_training_pipeline",
        conf={
            "batch_number": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['batch_number'] }}",
            "sim_month": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['sim_month'] }}"
        },
        wait_for_completion=False, 
    )

    trigger_ml_churn_inference_task = TriggerDagRunOperator(
        task_id="trigger_ml_churn_inference",
        trigger_dag_id="ml_churn_inference_pipeline",
        conf={
            "batch_number": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['batch_number'] }}",
            "sim_month": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['sim_month'] }}"
        },
        wait_for_completion=False, 
    )

    trigger_ml_conversion_training_task = TriggerDagRunOperator(
        task_id="trigger_ml_session_conversion_training",
        trigger_dag_id="ml_session_conversion_training_pipeline", 
        conf={
            "batch_number": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['batch_number'] }}",
            "sim_month": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['sim_month'] }}"
        },
        wait_for_completion=False, 
    )

    trigger_ml_conversion_inference_task = TriggerDagRunOperator(
        task_id="trigger_ml_session_conversion_inference",
        trigger_dag_id="ml_session_conversion_inference_pipeline", 
        conf={
            "batch_number": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['batch_number'] }}",
            "sim_month": "{{ ti.xcom_pull(task_ids='fetch_current_metadata')['sim_month'] }}"
        },
        wait_for_completion=False, 
    )

    # 5. PERBAIKAN: Alur eksekusi diubah urutannya
    run_dbt_task >> test_dbt_task >> get_metadata_task >> export_parquet_task >> [
        trigger_ml_churn_training_task,
        trigger_ml_churn_inference_task, 
        trigger_ml_conversion_training_task, 
        trigger_ml_conversion_inference_task
    ]