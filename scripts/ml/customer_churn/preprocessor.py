import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
# from sklearn.preprocessing import StandardScaler

from category_encoders import TargetEncoder 

def clean_structural_data(df: pd.DataFrame) -> pd.DataFrame:
    
    df = df.copy()
    
    cols_to_drop = ["user_id", "total_discount_enjoyed"] 
    existing_drops = [c for c in cols_to_drop if c in df.columns]
    if existing_drops:
        df = df.drop(columns=existing_drops)
        print(f"Kolom yang dihapus: {existing_drops}")

    if "avg_days_between_orders" in df.columns:
        df["avg_days_between_orders"] = df["avg_days_between_orders"].fillna(-1.0)
        print("Imputasi NULL pada 'avg_days_between_orders' dengan -1.0 selesai.")

    if "is_churned" in df.columns:
        df["is_churned"] = df["is_churned"].astype(int)

    return df


def get_sklearn_preprocessor(categorical_features: list, numeric_features: list) -> ColumnTransformer:

    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value=0)),

    ])

    # Pipeline for categorical feature 
    categorical_transformer = Pipeline(steps=[ 
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('target_encoder', TargetEncoder())
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='passthrough' 
    )

    return preprocessor