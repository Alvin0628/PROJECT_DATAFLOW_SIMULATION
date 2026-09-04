import os
import glob
import re
import joblib
import pandas as pd
from sqlalchemy import create_engine
import sys

# Make sure you have the conversion preprocessor as well
from scripts.ml.session_conversion.preprocessor import clean_structural_data
from scripts.common.supabase_postgres import SupabasePostgres # <-- 1. IMPORT SECRET WEAPON

def run_batch_inference(**kwargs):
    print("Starting Multi-Model Batch Inference Session Conversion...")
    # =========================================================================
    # 1. GET MONTH NAME & BATCH NUMBER FROM AIRFLOW PAYLOAD
    # =========================================================================
    sim_month = "unknown"
    batch_number = 0 # <-- Added for Supabase
    if "dag_run" in kwargs and kwargs["dag_run"].conf:
        sim_month = kwargs["dag_run"].conf.get("sim_month", "unknown")
        batch_number = int(kwargs["dag_run"].conf.get("batch_number", 0))
    if sim_month == "unknown":
        sim_month = os.getenv("SIM_MONTH", "unknown")
    print(f"Running Inference for Simulation Month: {sim_month} | Batch: {batch_number}")
    # =========================================================================
    # 2. READ CURRENT MONTH INFERENCE FILE (DELTA)
    # =========================================================================
    inference_path = f"/opt/airflow/datasets/feature_store/ml_session_conversion_inference_{sim_month}.parquet"
    if not os.path.exists(inference_path):
        print(f"⚠️ Inference parquet file not available yet: {inference_path}")
        return
    df_inference = pd.read_parquet(inference_path)
    if df_inference.empty:
        return
    model_files = glob.glob("/opt/airflow/models/session_conversion/session_conversion_model_v*.joblib")
    if not model_files:
        print("⚠️ No models available yet (Cold Start). Skip Inference.")
        return 
    # Clean data the same way as during training
    df_clean = clean_structural_data(df_inference)
    X_inference = df_clean.drop(columns=['session_id', 'user_id', 'is_converted'], errors='ignore')
    all_logs = []
    df_parquet = df_inference.copy()
    DB_USER = os.getenv("POSTGRES_USER_warehouse", "postgres_warehouse")
    DB_PASS = os.getenv("POSTGRES_PASSWORD_warehouse", "WH721HDA")
    DB_DB   = os.getenv("POSTGRES_DB_warehouse", "Looker_ECommerce")
    DB_URI = f"postgresql://{DB_USER}:{DB_PASS}@postgres_warehouse:5432/{DB_DB}"
    engine = create_engine(DB_URI)
    try:
        sim_time_query = "SELECT MAX(created_at) FROM silver.events"
        current_sim_time = pd.read_sql(sim_time_query, engine).iloc[0, 0]
    except Exception as e:
        print(f"Failed to get simulation time: {e}")
        current_sim_time = pd.Timestamp.now()
    for model_path in model_files:
        match = re.search(r'_v(\d+)\.joblib', model_path)
        v_tag = f"v{match.group(1)}" if match else "v0"
        threshold_path = f"/opt/airflow/models/session_conversion/session_conversion_threshold_{v_tag}.joblib"
        print(f"-> Running prediction using Model {v_tag}...")
        pipeline = joblib.load(model_path)
        threshold = joblib.load(threshold_path) if os.path.exists(threshold_path) else 0.5
        probabilities = pipeline.predict_proba(X_inference)[:, 1]
        predictions = (probabilities >= threshold).astype(int)
        df_parquet[f'prob_{v_tag}'] = probabilities
        df_parquet[f'pred_{v_tag}'] = predictions
        df_log_version = pd.DataFrame({
            'session_id': df_inference['session_id'],
            'predicted_to_convert': predictions,
            'conversion_probability': probabilities,
            'model_version': v_tag, 
            'predicted_at': current_sim_time 
        })
        all_logs.append(df_log_version)
    df_final_log = pd.concat(all_logs, ignore_index=True)
    # save all result to parquet 
    output_dir = "/opt/airflow/datasets/prediction"
    os.makedirs(output_dir, exist_ok=True)
    out_file = os.path.join(output_dir, f"session_conversion_predictions_{sim_month}.parquet")
    df_parquet.to_parquet(out_file, index=False)
    df_final_log.to_sql('ml_inference_logs', engine, schema='public', if_exists='append', index=False)
    print(f"✅ Saved {len(df_final_log)} total prediction logs from {len(model_files)} models to Local DWH.")
    # push all to supabase
    print("Preparing data to push to Supabase Cloud...")
    try:
        df_supabase = df_final_log[['session_id', 'conversion_probability', 'predicted_to_convert']].copy()
        df_supabase.rename(columns={
            'session_id': 'entity_id',
            'conversion_probability': 'probability',
            'predicted_to_convert': 'predicted_label'
        }, inplace=True)
        df_supabase['model_name'] = 'session_conversion'
        df_supabase['batch_number'] = batch_number
        df_supabase['entity_id'] = df_supabase['entity_id'].astype(str)
        columns_to_push = ['model_name', 'batch_number', 'entity_id', 'probability', 'predicted_label']
        df_supabase = df_supabase[columns_to_push]
        # Bulk insert into Supabase
        with SupabasePostgres() as db:
            db.copy_dataframe(
                dataframe=df_supabase,
                schema='public',
                table='predictions',
                columns=columns_to_push
            )
        print("🚀 Successfully pushed thousands/millions of predictions to Supabase Cloud!")
    except Exception as e:
        print(f"⚠️ Failed to push predictions to Supabase: {e}")
if __name__ == "__main__":
    if len(sys.argv) > 1:
        os.environ["SIM_MONTH"] = sys.argv[1]
    run_batch_inference()