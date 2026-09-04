import os
import pandas as pd

def load_churn_data(container_path: str = "/opt/airflow/datasets/feature_store/ml_customer_churn_training_latest.parquet") -> pd.DataFrame:

    print(f"Check existing file in path : {container_path}")
    
    if not os.path.exists(container_path):
        raise FileNotFoundError(
            f"There are no parquet file {container_path}. "
        )
    
    df = pd.read_parquet(container_path)
    
    print(f"Data loaded: {df.shape[0]} rows, {df.shape[1]} columns.")
    return df