import os
import glob
import re
import joblib
import pandas as pd
from sqlalchemy import create_engine
import sys

from scripts.ml.customer_churn.preprocessor import clean_structural_data

# TAMBAHKAN **kwargs UNTUK MENANGKAP PAYLOAD DARI AIRFLOW DAG
def run_batch_inference(**kwargs):
    print("Memulai Multi-Model Batch Inference Customer Churn...")
    
    # =========================================================================
    # 1. TANGKAP NAMA BULAN DARI AIRFLOW PAYLOAD
    # =========================================================================
    sim_month = "unknown"
    if "dag_run" in kwargs and kwargs["dag_run"].conf:
        sim_month = kwargs["dag_run"].conf.get("sim_month", "unknown")
        
    if sim_month == "unknown":
        sim_month = os.getenv("SIM_MONTH", "unknown")
        
    print(f"Mengeksekusi Inference untuk Bulan Simulasi: {sim_month}")
    
    # =========================================================================
    # 2. BACA FILE INFERENCE BULAN BERJALAN (DELTA)
    # =========================================================================
    inference_path = f"/opt/airflow/datasets/feature_store/ml_customer_churn_inference_{sim_month}.parquet"
    if not os.path.exists(inference_path):
        print(f"⚠️ File parquet inference belum tersedia: {inference_path}")
        return
        
    df_inference = pd.read_parquet(inference_path)
    if df_inference.empty:
        return
        
    model_files = glob.glob("/opt/airflow/models/customer_churn/customer_churn_model_v*.joblib")
    
    if not model_files:
        print("⚠️ Belum ada model sama sekali (Cold Start). Skip Inference.")
        return 
    
    df_clean = clean_structural_data(df_inference)    
    X_inference = df_clean.drop(columns=['user_id',"is_churned"], errors='ignore')
    
    all_logs = []
    df_parquet = df_inference.copy()

    DB_USER = os.getenv("POSTGRES_USER_warehouse", "postgres_warehouse")
    DB_PASS = os.getenv("POSTGRES_PASSWORD_warehouse", "WH721HDA")
    DB_DB   = os.getenv("POSTGRES_DB_warehouse", "Looker_ECommerce")
    DB_URI = f"postgresql://{DB_USER}:{DB_PASS}@postgres_warehouse:5432/{DB_DB}"
    engine = create_engine(DB_URI)
    
    try:
        sim_time_query = "SELECT MAX(created_at) FROM silver.orders"
        current_sim_time = pd.read_sql(sim_time_query, engine).iloc[0, 0]
    except Exception as e:
        print(f"Gagal mengambil waktu simulasi, fallback ke waktu lokal: {e}")
        current_sim_time = pd.Timestamp.now()

    for model_path in model_files:
        match = re.search(r'_v(\d+)\.joblib', model_path)
        v_tag = f"v{match.group(1)}" if match else "v0"
        
        threshold_path = f"/opt/airflow/models/customer_churn/customer_churn_threshold_{v_tag}.joblib"
        print(f"-> Menjalankan prediksi menggunakan Model {v_tag}...")
        
        pipeline = joblib.load(model_path)
        threshold = joblib.load(threshold_path) if os.path.exists(threshold_path) else 0.5
        
        probabilities = pipeline.predict_proba(X_inference)[:, 1]
        predictions = (probabilities >= threshold).astype(int)
        
        df_parquet[f'prob_{v_tag}'] = probabilities
        df_parquet[f'pred_{v_tag}'] = predictions
        
        df_log_version = pd.DataFrame({
            'user_id': df_inference['user_id'],
            'predicted_to_churn': predictions,
            'churn_probability': probabilities,
            'model_version': v_tag,
            'predicted_at': current_sim_time 
        })
        all_logs.append(df_log_version)

    df_final_log = pd.concat(all_logs, ignore_index=True)
    
    # =========================================================================
    # 3. SIMPAN HASIL PREDIKSI DENGAN NAMA BULAN BERJALAN
    # =========================================================================
    output_dir = "/opt/airflow/datasets/prediction"
    os.makedirs(output_dir, exist_ok=True)
    
    out_file = os.path.join(output_dir, f"customer_churn_predictions_{sim_month}.parquet")
    df_parquet.to_parquet(out_file, index=False)
    
    df_final_log.to_sql('ml_churn_inference_logs', engine, schema='public', if_exists='append', index=False)
    print(f"✅ Tersimpan {len(df_final_log)} total log prediksi dari {len(model_files)} model ke database.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        os.environ["SIM_MONTH"] = sys.argv[1]
    run_batch_inference()