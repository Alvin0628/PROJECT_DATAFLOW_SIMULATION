import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from category_encoders import TargetEncoder 

def clean_structural_data(df: pd.DataFrame) -> pd.DataFrame:
    # Supaya tidak memodifikasi dataframe asli dari memori (best practice Pandas)
    df = df.copy()
    
    # 1. Dropping Identifier agar tidak menjadi data leakage
    cols_to_drop = ["session_id", "user_id"] 
    existing_drops = [c for c in cols_to_drop if c in df.columns]
    if existing_drops:
        # Pandas menggunakan parameter 'columns' untuk drop
        df = df.drop(columns=existing_drops)
        print(f"Kolom identifier yang dihapus: {existing_drops}")

    # 2. Standarisasi Target (Hanya jika kolomnya ada, misal saat training)
    if "is_converted" in df.columns:
        df["is_converted"] = df["is_converted"].astype(int)

    return df


def get_sklearn_preprocessor(categorical_features: list, numeric_features: list) -> ColumnTransformer:

    # Pipeline untuk fitur numerik
    numeric_transformer = Pipeline(steps=[
        # Mengisi sisa NULL yang tidak terduga dengan 0
        ('imputer', SimpleImputer(strategy='constant', fill_value=0)),
    ])

    # Pipeline untuk fitur kategorikal
    categorical_transformer = Pipeline(steps=[
        # Jika ada kategori yang NULL, isi dengan nilai yang paling sering muncul
        ('imputer', SimpleImputer(strategy='most_frequent')),
        # Menggunakan Target Encoding (Berdasarkan rata-rata target di kategori tersebut)
        ('target_encoder', TargetEncoder())
    ])

    # Menggabungkan kedua pipeline ke dalam satu ColumnTransformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='drop' # Kolom yang tidak disebutkan otomatis dibuang demi keamanan
    )

    return preprocessor