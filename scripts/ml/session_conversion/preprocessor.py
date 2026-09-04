import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from category_encoders import TargetEncoder 

def clean_structural_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    cols_to_drop = ["session_id", "user_id"] 
    existing_drops = [c for c in cols_to_drop if c in df.columns]
    if existing_drops:
        df = df.drop(columns=existing_drops)
        print(f"Kolom identifier yang dihapus: {existing_drops}")

    if "is_converted" in df.columns:
        df["is_converted"] = df["is_converted"].astype(int)

    return df


def get_sklearn_preprocessor(categorical_features: list, numeric_features: list) -> ColumnTransformer:

    # Pipeline for numeric feature
    numeric_transformer = Pipeline(steps=[
        # Mengisi sisa NULL yang tidak terduga dengan 0
        ('imputer', SimpleImputer(strategy='constant', fill_value=0)),
    ])

    # Pipeline for categorial feature
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('target_encoder', TargetEncoder())
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='drop' 
    )

    return preprocessor