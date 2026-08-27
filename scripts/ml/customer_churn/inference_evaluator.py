import os
import pandas as pd
from sqlalchemy import create_engine
from sklearn.metrics import classification_report, average_precision_score, f1_score

def evaluate_production_inference():
    print("Memulai Evaluasi Produksi (Model Drift / Champion-Challenger)...")
    
    DB_USER = os.getenv("POSTGRES_USER_warehouse", "postgres_warehouse")
    DB_PASS = os.getenv("POSTGRES_PASSWORD_warehouse", "WH721HDA")
    DB_DB   = os.getenv("POSTGRES_DB_warehouse", "Looker_ECommerce")
    DB_URI = f"postgresql://{DB_USER}:{DB_PASS}@postgres_warehouse:5432/{DB_DB}"
    
    engine = create_engine(DB_URI)
    
    # PERUBAHAN: Menambahkan CTE sim_time dan Filter Delta (90-120 days)
    query = """
    WITH sim_time AS (
        SELECT MAX(created_at) AS current_sim_time FROM silver.orders
    ),
    
    mature_predictions AS (
        SELECT 
            l.user_id, 
            l.model_version, 
            l.predicted_to_churn, 
            l.churn_probability, 
            l.predicted_at
        FROM ml_churn_inference_logs l
        CROSS JOIN sim_time st
        -- PERBAIKAN: Kunci evaluasi ke tebakan yang dibuat TEPAT 3 bulan yang lalu
        WHERE DATE_TRUNC('month', l.predicted_at) = DATE_TRUNC('month', st.current_sim_time - INTERVAL '3 months')
    ),
    
    actual_future_orders AS (
        SELECT 
            mp.user_id,
            mp.model_version,
            MAX(CASE WHEN o.created_at > mp.predicted_at 
                      AND o.created_at <= (mp.predicted_at + INTERVAL '90 days') 
                 THEN 1 ELSE 0 END) AS has_repeat_order
        FROM mature_predictions mp
        LEFT JOIN silver.orders o ON mp.user_id = o.user_id 
        GROUP BY mp.user_id, mp.model_version
    )
    
    SELECT 
        mp.user_id,
        mp.model_version,
        mp.predicted_to_churn,
        mp.churn_probability,
        COALESCE(CASE WHEN afo.has_repeat_order = 1 THEN 0 ELSE 1 END, 1) AS actual_churn
    FROM mature_predictions mp
    JOIN actual_future_orders afo 
      ON mp.user_id = afo.user_id 
     AND mp.model_version = afo.model_version;
    """
    
    print("Mengekstrak prediksi matang dari database...")
    try:
        df_eval = pd.read_sql(query, engine)
    except Exception as e:
        print(f"⚠️ Tabel log atau orders belum siap: {e}")
        return

    if df_eval.empty:
        print("⚠️ Belum ada prediksi yang 'matang' (>90 hari) untuk dievaluasi. Menunggu waktu simulasi berjalan...")
        return
        
    versions = df_eval['model_version'].unique()
    print("\n" + "="*60)
    print("🏆 HASIL EVALUASI PRODUKSI (REAL-WORLD PERFORMANCE) 🏆")
    print("="*60)
    
    for v in sorted(versions):
        df_v = df_eval[df_eval['model_version'] == v]
        y_true = df_v['actual_churn']
        y_pred = df_v['predicted_to_churn']
        y_prob = df_v['churn_probability']
        
        pr_auc = average_precision_score(y_true, y_prob)
        f1_mac = f1_score(y_true, y_pred, average='macro', zero_division=0)
        
        print(f"\n[ MODEL {v.upper()} ] - Jumlah Sampel: {len(df_v)}")
        print(f"PR-AUC (Production) : {pr_auc:.4f}")
        print(f"F1 Macro (Production): {f1_mac:.4f}")
        print(classification_report(y_true, y_pred, target_names=['Retained (0)', 'Churn (1)'], zero_division=0))
        
if __name__ == "__main__":
    evaluate_production_inference()