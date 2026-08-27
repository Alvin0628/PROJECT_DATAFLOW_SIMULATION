import os
import pandas as pd

def load_session_conversion_data(container_path: str = "/opt/airflow/datasets/feature_store/ml_session_conversion_training_latest.parquet") -> pd.DataFrame:
    """
    Memuat dataset training untuk session conversion.
    """
    print(f"Check existing file in path : {container_path}")
    
    if not os.path.exists(container_path):
        raise FileNotFoundError(
            f"There are no parquet file {container_path}. "
        )
    
    # Menggunakan pandas read_parquet
    df = pd.read_parquet(container_path)
    
    print(f"Data loaded: {df.shape[0]} rows, {df.shape[1]} columns.")
    return df