import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
# from sklearn.preprocessing import StandardScaler

from category_encoders import TargetEncoder 

def clean_structural_data(df: pd.DataFrame) -> pd.DataFrame:
    
    # Supaya tidak memodifikasi dataframe asli dari memori (best practice Pandas)
    df = df.copy()
    
    # 1. Dropping Identifier & Fitur Zero Variance
    cols_to_drop = ["user_id", "total_discount_enjoyed"] 
    existing_drops = [c for c in cols_to_drop if c in df.columns]
    if existing_drops:
        # Pandas menggunakan parameter 'columns' untuk drop
        df = df.drop(columns=existing_drops)
        print(f"Kolom yang dihapus: {existing_drops}")

    # 2. Penanganan Anomali Bisnis (Single-Order Users)
    if "avg_days_between_orders" in df.columns:
        # Menggunakan .fillna() bawaan Pandas
        df["avg_days_between_orders"] = df["avg_days_between_orders"].fillna(-1.0)
        print("Imputasi NULL pada 'avg_days_between_orders' dengan -1.0 selesai.")

    if "is_churned" in df.columns:
        # Casting ke integer standar
        df["is_churned"] = df["is_churned"].astype(int)

    return df


def get_sklearn_preprocessor(categorical_features: list, numeric_features: list) -> ColumnTransformer:

    # Pipeline untuk fitur numerik
    numeric_transformer = Pipeline(steps=[
        # Mengisi sisa NULL yang tidak terduga dengan 0
        ('imputer', SimpleImputer(strategy='constant', fill_value=0)),
        # StandardScaler dibiarkan ter-comment karena Tree (XGBoost) tidak butuh scaling.
        # Bisa di-uncomment jika nanti Anda ingin mencoba Logistic Regression atau Neural Network.
        # ('scaler', StandardScaler()) 
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
        remainder='passthrough' # Kolom yang tidak disebutkan dibiarkan saja
    )

    return preprocessor