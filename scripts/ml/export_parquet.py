import os
from sqlalchemy import create_engine
import pandas as pd

def export_gold_to_parquet():
    print("Start export process....")
    
    db_user = os.getenv("POSTGRES_USER_warehouse", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD_warehouse", "postgres") 
    db_host = os.getenv("POSTGRES_HOST", "postgres_warehouse")
    db_port = os.getenv("POSTGRES_PORT_warehouse", "5432")
    db_name = os.getenv("POSTGRES_DB_warehouse", "postgres")
    
    db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    engine = create_engine(db_url)

    try:
        # Mengambil waktu maksimum dari order sebagai patokan waktu di dunia simulasi
        sim_time_query = "SELECT MAX(created_at) FROM silver.orders"
        current_sim_time = pd.read_sql(sim_time_query, engine).iloc[0, 0]
        
        # Format waktu menjadi YYYY_MM (Contoh: 2019_08 untuk Agustus 2019)
        sim_month_str = current_sim_time.strftime("%Y_%m") 
        print(f"Waktu Simulasi Terdeteksi: {current_sim_time} -> Label Bulan: {sim_month_str}")
        
    except Exception as e:
        print(f"Gagal mengambil waktu simulasi, fallback ke waktu lokal: {e}")
        sim_month_str = pd.Timestamp.now().strftime("%Y_%m")


    gold_tables = [
        "ml_customer_churn_training",
        "ml_customer_churn_inference",
        "ml_session_conversion_training",
        "ml_session_conversion_inference"
    ]
    
    output_dir = "/opt/airflow/datasets/feature_store"
    os.makedirs(output_dir, exist_ok=True)
    
    for table in gold_tables:
        try:
            query = f"SELECT * FROM public.{table}"
            df = pd.read_sql(query, engine)
            
            if df.empty:
                print(f"⚠️ Empty table {table}. Skip export.")
                continue

            if "inference" in table:
                # INFERENCE: temporal (example: ml_customer_churn_inference_2019_08.parquet)
                file_path = f"{output_dir}/{table}_{sim_month_str}.parquet"
            else:
                # TRAINING: cummulative (example: ml_customer_churn_training_latest.parquet)
                file_path = f"{output_dir}/{table}_latest.parquet"
                
            df.to_parquet(file_path, index=False)
            print(f"✅ Export Success {table} ({len(df)} rows) -> {file_path}")
            
        except Exception as e:
            print(f"Failed to export {table}: {str(e)}")
            
    print("All tables have been loaded to parquet format")

if __name__ == "__main__":
    export_gold_to_parquet()