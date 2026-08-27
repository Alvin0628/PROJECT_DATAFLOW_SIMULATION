import pandas as pd
from sqlalchemy import create_engine, inspect
from sklearn.metrics import classification_report, average_precision_score
import os

def evaluate_production_inference():
    print("Memulai Evaluasi Multi-Model (Leaderboard)...")
    
    DB_USER = os.getenv("POSTGRES_USER_warehouse", "postgres_warehouse")
    DB_PASS = os.getenv("POSTGRES_PASSWORD_warehouse", "WH721HDA")
    DB_DB   = os.getenv("POSTGRES_DB_warehouse", "Looker_ECommerce")
    engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@postgres_warehouse:5432/{DB_DB}")
    
    inspector = inspect(engine)
    if not inspector.has_table("ml_inference_logs", schema="public"):
        print("⚠️ Tabel 'ml_inference_logs' belum ada. Skip Evaluasi.")
        return
    
    # PERUBAHAN: Menambahkan CTE sim_time dan Filter Delta (30-60 days)
    query = """
    WITH sim_time AS (
        SELECT MAX(created_at) AS current_sim_time FROM silver.events
    ),
    
    RankedLogs AS (
        SELECT 
            l.session_id,
            l.predicted_to_convert,
            l.conversion_probability,
            l.model_version,
            l.predicted_at,
            ROW_NUMBER() OVER (PARTITION BY l.session_id, l.model_version ORDER BY l.predicted_at DESC) as rn
        FROM public.ml_inference_logs l
        CROSS JOIN sim_time st
        -- PERBAIKAN: Kunci evaluasi ke tebakan yang dibuat TEPAT 1 bulan yang lalu
        WHERE DATE_TRUNC('month', l.predicted_at) = DATE_TRUNC('month', st.current_sim_time - INTERVAL '1 month')
    )
    
    SELECT 
        l.session_id,
        l.predicted_to_convert,
        l.conversion_probability,
        l.model_version,
        t.is_converted AS actual_conversion
    FROM RankedLogs l
    JOIN public.ml_session_conversion_training t ON l.session_id = t.session_id
    WHERE l.rn = 1
    """
    
    try:
        df_eval = pd.read_sql(query, engine)
    except Exception as e:
        print(f"Gagal mengambil data dari database: {e}")
        return

    if df_eval.empty:
        print("Belum ada irisan data. Skip.")
        return
        
    print("\n" + "🏆" * 20)
    print("      PRODUCTION MODEL LEADERBOARD")
    print("🏆" * 20)
    
    unique_models = df_eval['model_version'].unique()
    
    for model_v in sorted(unique_models):
        df_model = df_eval[df_eval['model_version'] == model_v]
        
        y_true = df_model['actual_conversion']
        y_pred = df_model['predicted_to_convert']
        y_proba = df_model['conversion_probability']
        
        total_converted = y_true.sum()
        total_data = len(y_true)
        
        pr_auc = average_precision_score(y_true, y_proba) if total_converted > 0 else 0.0
        
        print(f"\n--- HASIL UNTUK MODEL [{model_v.upper()}] ---")
        print(f"Data Dievaluasi: {total_data} sesi | Actual Converts: {total_converted}")
        print(f"PR-AUC Score   : {pr_auc:.4f}")
        
        if total_converted > 0:
            print(classification_report(y_true, y_pred, target_names=['Not Converted', 'Converted'], zero_division=0))
        else:
            print("Belum ada user yang convert. Menunggu data lebih matang.")

if __name__ == "__main__":
    evaluate_production_inference()