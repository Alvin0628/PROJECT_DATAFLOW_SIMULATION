from scripts.common.supabase_postgres import SupabasePostgres

def log_pipeline_health(context, status):
    """
    Fungsi inti untuk mengirim status DAG ke Supabase.
    """
    dag_id = context['dag'].dag_id
    
    # Ekstrak batch_number dari DAG Run Configuration (jika ada)
    dag_run = context.get('dag_run')
    batch_number = 0
    if dag_run and dag_run.conf:
        try:
            batch_number = int(dag_run.conf.get('batch_number', 0))
        except (TypeError, ValueError):
            batch_number = 0

    try:
        # Tembak ke Supabase
        with SupabasePostgres() as db:
            db.execute(
                """
                INSERT INTO pipeline_health 
                (dag_id, last_run_at, last_run_status, current_batch_number, updated_at) 
                VALUES (%s, NOW(), %s, %s, NOW())
                """,
                (dag_id, status, batch_number)
            )
        print(f"✅ Pipeline Health Logged to Supabase: {dag_id} -> {status}")
    except Exception as e:
        print(f"⚠️ Gagal push pipeline health ke Supabase: {e}")

def dag_success_callback(context):
    log_pipeline_health(context, 'success')

def dag_failure_callback(context):
    log_pipeline_health(context, 'failed')