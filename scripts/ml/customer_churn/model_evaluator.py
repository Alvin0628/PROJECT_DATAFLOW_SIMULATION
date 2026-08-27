import os
import glob
import re
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score,
    log_loss,
    roc_auc_score,
    average_precision_score,
    f1_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    roc_curve,
    auc
)

from scripts.ml.customer_churn.model_trainer import train_model

def evaluate_model():
    print("Mencari model Customer Churn versi terbaru...")
    
    # 1. Update ke folder Auto-Versioning yang benar
    model_dir = "/opt/airflow/models/customer_churn"
    test_set_dir = os.path.join(model_dir, "test_set")
    
    # 2. Logika Auto-Discovery (Mencari file berakhiran _v1, _v2, dst)
    existing_models = glob.glob(os.path.join(model_dir, "customer_churn_model_v*.joblib"))
    
    if not existing_models:
        print("⚠️ Tidak ada model ditemukan. Menjalankan proses training...")
        pipeline, X_test, y_test = train_model()
        return
        
    # Cari angka versi terbesar
    versions = []
    for m in existing_models:
        match = re.search(r'_v(\d+)\.joblib', m)
        if match:
            versions.append(int(match.group(1)))
            
    latest_version = max(versions)
    v_tag = f"v{latest_version}"
    
    print(f"-> Mengevaluasi Model {v_tag.upper()}")

    # 3. Definisikan path menggunakan versi terbaru
    model_path = os.path.join(model_dir, f"customer_churn_model_{v_tag}.joblib")
    threshold_path = os.path.join(model_dir, f"customer_churn_threshold_{v_tag}.joblib")
    X_test_path = os.path.join(test_set_dir, f"X_test_customer_churn_{v_tag}.joblib")
    y_test_path = os.path.join(test_set_dir, f"y_test_customer_churn_{v_tag}.joblib")

    # 4. Load File
    pipeline = joblib.load(model_path)
    X_test = joblib.load(X_test_path)
    y_test = joblib.load(y_test_path)
    decision_threshold = joblib.load(threshold_path) if os.path.exists(threshold_path) else 0.5

    # 5. Prediksi dan Evaluasi
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= decision_threshold).astype(int)

    acc = accuracy_score(y_test, y_pred)
    loss = log_loss(y_test, pipeline.predict_proba(X_test))
    roc_auc = roc_auc_score(y_test, y_proba)
    pr_auc = average_precision_score(y_test, y_proba)
    f1_macro = f1_score(y_test, y_pred, average='macro', zero_division=0)
    f1_binary = f1_score(y_test, y_pred, average='binary', zero_division=0)

    print("\n" + "="*60)
    print(f"MLOps Pipeline — Churn Model Evaluation Metrics ({v_tag.upper()})")
    print("="*60)
    print(f"Decision Threshold: {decision_threshold:.4f}")
    print(f"ROC-AUC   : {roc_auc:.4f}")
    print(f"PR-AUC    : {pr_auc:.4f}")
    print(f"F1 (Binary): {f1_binary:.4f}")
    print(f"F1 Macro  : {f1_macro:.4f}")
    print("-" * 60)

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Retained (0)', 'Churn (1)'], zero_division=0))

    # 6. Plotting
    output_dir = "/opt/airflow/output"
    os.makedirs(output_dir, exist_ok=True)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Retained', 'Churn'])
    disp.plot(cmap=plt.cm.Blues, ax=axes[0], values_format='d')
    axes[0].set_title(f"Confusion Matrix ({v_tag.upper()})")

    fpr, tpr, _ = roc_curve(y_test, y_proba)
    axes[1].plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC AUC = {auc(fpr, tpr):.3f}')
    axes[1].plot([0, 1], [0, 1], 'k--')
    axes[1].legend(loc="lower right")

    plot_path = os.path.join(output_dir, f"customer_churn_evaluation_{v_tag}.png")
    plt.savefig(plot_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"Grafik tersimpan di: {plot_path}")

if __name__ == "__main__":
    evaluate_model()