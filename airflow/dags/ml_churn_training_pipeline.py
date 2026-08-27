from airflow import DAG
from airflow.operators.python import PythonOperator, ShortCircuitOperator
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta
import sys

# Tambahkan path root agar modul kustom terbaca
sys.path.insert(0, '/opt/airflow')

from scripts.ml.customer_churn.model_evaluator import evaluate_model

default_args = {
    "owner": "data-science-team",
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}


def validate_triggered_batch(**context):
    """
    Mengambil nomor batch langsung dari conf yang dikirim oleh DAG 2,
    memastikan proses training murni hanya mengeksekusi kelipatan batch ke-6.
    """
    dag_conf = context.get("dag_run").conf or {}

    raw_batch = dag_conf.get("batch_number", 0)
    try:
        current_batch = int(raw_batch)
    except (TypeError, ValueError):
        print(f"⚠️ batch_number tidak valid: {raw_batch!r}, dianggap 0")
        current_batch = 0

    print(f"📥 [Conf Payload Received] Target Batch untuk Training ini: {current_batch}")

    if current_batch > 0 and current_batch % 6 == 0:
        print(f"✅ Batch {current_batch} valid kelipatan 6. Menjalankan MLOps Training...")
        return True
    else:
        print(f"⏭️ Batch {current_batch} bukan kelipatan 6. Melewati (skip) training.")
        return False


with DAG(
    dag_id="ml_churn_training_pipeline",
    default_args=default_args,
    description="Event-driven ML Training locked to exact batch payload (Every 6 Batches)",
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mlops", "xgboost", "optuna", "churn", "batch-locked"],
    max_active_runs=1,
) as dag:

    # Task 0: ShortCircuit filter pengaman kelipatan 6 berdasarkan payload conf
    filter_batch_task = ShortCircuitOperator(
        task_id="validate_triggered_batch",
        python_callable=validate_triggered_batch,
    )

    # ==========================================================================
    # Task 1: Training Model -- DIJALANKAN DI CONTAINER TERPISAH (DooD)
    # ==========================================================================
    # SEBELUM: PythonOperator memanggil train_model() LANGSUNG di proses
    #   scheduler (LocalExecutor = subprocess fork dari scheduler). Training
    #   CPU-heavy berebut CPU dengan scheduler -> heartbeat telat -> scheduler
    #   salah declare "zombie" -> up_for_retry walau training sukses.
    #
    # SESUDAH: BashOperator cuma "menitip perintah" ke Docker daemon HOST
    #   (lewat socket yang di-mount di airflow-scheduler) untuk menyalakan
    #   container `ml-trainer` SIBLING yang terpisah total dari scheduler.
    #   Task Airflow ini jadi ringan (menunggu, bukan CPU-bound), heartbeat
    #   tetap lancar.
    #
    # `cd "$PROJECT_ROOT"` WAJIB ada -- supaya `docker compose` membaca
    # docker-compose.yaml dari path IDENTIK dengan yang dipakai Docker
    # daemon di host untuk resolve bind-mount relatif (./scripts, ./models).
    train_model_task = BashOperator(
        task_id="train_churn_model",
        bash_command=(
            'cd "$PROJECT_ROOT" && '
            'docker compose run --rm ml-trainer'
        ),
        execution_timeout=timedelta(minutes=30),
    )

    # Task 2: Evaluasi Model -- TETAP PythonOperator biasa (ringan, cuma
    # inference + plotting, bukan CPU-bound). Baca file .joblib dari shared
    # volume ./models yang sama-sama di-mount ke airflow-scheduler & ml-trainer.
    evaluate_model_task = PythonOperator(
        task_id="evaluate_churn_model",
        python_callable=evaluate_model,
    )

    # Alur Eksekusi
    filter_batch_task >> train_model_task >> evaluate_model_task