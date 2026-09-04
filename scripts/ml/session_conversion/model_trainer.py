import pandas as pd
import numpy as np
import optuna
import joblib
import os
import warnings
import re 
import glob
import json

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.metrics import f1_score, average_precision_score, mutual_info_score
from sklearn.feature_selection import mutual_info_classif
from xgboost import XGBClassifier

from scripts.ml.session_conversion.data_loader import load_session_conversion_data
from scripts.ml.session_conversion.preprocessor import clean_structural_data, get_sklearn_preprocessor

warnings.filterwarnings('ignore')

def diagnose_feature_signal(X: pd.DataFrame, y: pd.Series, categorical_features: list, numeric_features: list):
    print("\n" + "=" * 80)
    print("DIAGNOSTIK: Mutual Information (fitur vs target 'is_converted')")
    print("=" * 80)

    if numeric_features:
        X_num = X[numeric_features].fillna(0)
        mi_numeric = mutual_info_classif(X_num, y, random_state=42)
        for feat, score in sorted(zip(numeric_features, mi_numeric), key=lambda x: -x[1]):
            print(f"  [numeric]     {feat:<35s} MI = {score:.5f}")

    if categorical_features:
        from sklearn.preprocessing import LabelEncoder
        for feat in categorical_features:
            le = LabelEncoder()
            encoded = le.fit_transform(X[feat].astype(str).fillna("MISSING"))
            score = mutual_info_score(encoded, y)
            print(f"  [categorical] {feat:<35s} MI = {score:.5f}")
    print("=" * 80 + "\n")

def find_best_threshold(y_true, y_proba) -> float:
    candidate_thresholds = np.unique(y_proba)
    best_threshold = 0.5
    best_f1 = -1.0

    for t in candidate_thresholds:
        preds = (y_proba >= t).astype(int)
        score = f1_score(y_true, preds, average='macro', zero_division=0)
        if score > best_f1:
            best_f1 = score
            best_threshold = t

    print(f"Optimal threshold found: {best_threshold:.4f} (F1 Macro = {best_f1:.4f})")
    return float(best_threshold)


def train_model():
    print("Starting Session Conversion Model Training (Fast Version)...")

    df_raw = load_session_conversion_data()
    df_clean = clean_structural_data(df_raw)

    target_col = "is_converted"
    X = df_clean.drop(columns=[target_col])
    y = df_clean[target_col]

    categorical_features = X.select_dtypes(include=['object', 'category']).columns.tolist()
    numeric_features = X.select_dtypes(exclude=['object', 'category']).columns.tolist()

    diagnose_feature_signal(X, y, categorical_features, numeric_features)

    # 1. Split Data (80% Train Full, 20% Test/Holdout for evaluation)
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 2. Split Data Validation for Optuna 
    X_train_opt, X_val_opt, y_train_opt, y_val_opt = train_test_split(
        X_train_full, y_train_full, test_size=0.2, random_state=42, stratify=y_train_full
    )

    count_class_0 = (y_train_opt == 0).sum()
    count_class_1 = (y_train_opt == 1).sum()
    dynamic_ratio = count_class_0 / count_class_1

    def objective(trial):
        param = {
            'n_estimators': trial.suggest_int('n_estimators', 50, 200),
            'max_depth': trial.suggest_int('max_depth', 3, 6),
            'learning_rate': trial.suggest_float('learning_rate', 0.05, 0.2, log=True),
            'scale_pos_weight': dynamic_ratio, 
            'objective': 'binary:logistic',
            'tree_method': 'hist',
            'random_state': 42,
            'n_jobs': 1
        }

        # Train 1 time only
        fold_pipeline = Pipeline(steps=[
            ('preprocessor', get_sklearn_preprocessor(categorical_features, numeric_features)),
            ('classifier', XGBClassifier(**param))
        ])

        fold_pipeline.fit(X_train_opt, y_train_opt)
        proba = fold_pipeline.predict_proba(X_val_opt)[:, 1]
        return average_precision_score(y_val_opt, proba)

    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=5, show_progress_bar=False)

    best_params = study.best_params

    final_pipeline = Pipeline(steps=[
        ('preprocessor', get_sklearn_preprocessor(categorical_features, numeric_features)),
        ('classifier', XGBClassifier(**best_params, scale_pos_weight=dynamic_ratio, objective='binary:logistic', tree_method='hist', random_state=42, n_jobs=1))
    ])

    # 4. Find the Optimal Threshold Using Validation Data
    final_pipeline.fit(X_train_opt, y_train_opt)
    val_proba = final_pipeline.predict_proba(X_val_opt)[:, 1]
    best_threshold = find_best_threshold(y_val_opt, val_proba)

    # 5. Re-fit Final with all train data
    final_pipeline.fit(X_train_full, y_train_full)

    output_dir_model = "/opt/airflow/models/session_conversion"
    output_dir_test_set = "/opt/airflow/models/session_conversion/test_set" 
    
    os.makedirs(output_dir_model, exist_ok=True)
    os.makedirs(output_dir_test_set, exist_ok=True)
    
    existing_models = glob.glob(os.path.join(output_dir_model, "session_conversion_model_v*.joblib"))
    versions = []

    for m in existing_models:
        match = re.search(r'_v(\d+)\.joblib', m)
        if match:
            versions.append(int(match.group(1)))
            
    next_version = max(versions) + 1 if versions else 1
    v_tag = f"v{next_version}"
    
    joblib.dump(final_pipeline, os.path.join(output_dir_model, f"session_conversion_model_{v_tag}.joblib"))
    joblib.dump(best_threshold, os.path.join(output_dir_model, f"session_conversion_threshold_{v_tag}.joblib"))
    joblib.dump(X_test, os.path.join(output_dir_test_set, f"X_test_session_conversion_{v_tag}.joblib"))
    joblib.dump(y_test, os.path.join(output_dir_test_set, f"y_test_session_conversion_{v_tag}.joblib"))

    best_params_path = os.path.join(output_dir_model, f"session_conversion_best_params_{v_tag}.json")
    with open(best_params_path, 'w') as f:
        json.dump(best_params, f) 
        
    print(f"Session Conversion Pipeline saved as Version: {v_tag} !")
    return final_pipeline, X_test, y_test

if __name__ == "__main__":
    train_model()