import os

import glob

import re

import joblib

import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score, log_loss, roc_auc_score, average_precision_score, 
    f1_score, precision_score, recall_score, classification_report, # <-- Additional metrics
    confusion_matrix, ConfusionMatrixDisplay, roc_curve, auc

)

from scripts.ml.session_conversion.model_trainer import train_model

from scripts.common.model_registry import push_model_metrics # <-- Additional Supabase Pipeline

def evaluate_model(**context): # <-- Additional **context for Airflow
    print("Searching for the latest Session Conversion model...")
    # 1. Update to the new folder
    model_dir = "/opt/airflow/models/session_conversion"
    test_set_dir = os.path.join(model_dir, "test_set")
    # 2. Auto-Discovery Logic (Find Highest Version)
    existing_models = glob.glob(os.path.join(model_dir, "session_conversion_model_v*.joblib"))
    if not existing_models:
        print("⚠️ No model found. Running training process...")
        pipeline, X_test, y_test = train_model()
        return
    # Find the highest version number
    versions = []
    for m in existing_models:
        match = re.search(r'_v(\d+)\.joblib', m)
        if match:
            versions.append(int(match.group(1)))
    latest_version = max(versions)
    v_tag = f"v{latest_version}"
    print(f"-> Evaluating Model {v_tag.upper()}")
    # 3. Define paths using the latest version
    model_path = os.path.join(model_dir, f"session_conversion_model_{v_tag}.joblib")
    threshold_path = os.path.join(model_dir, f"session_conversion_threshold_{v_tag}.joblib")
    X_test_path = os.path.join(test_set_dir, f"X_test_session_conversion_{v_tag}.joblib")
    y_test_path = os.path.join(test_set_dir, f"y_test_session_conversion_{v_tag}.joblib")
    # 4. Load File
    pipeline = joblib.load(model_path)
    X_test = joblib.load(X_test_path)
    y_test = joblib.load(y_test_path)
    decision_threshold = joblib.load(threshold_path) if os.path.exists(threshold_path) else 0.5
    # 5. Prediction and Evaluation
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= decision_threshold).astype(int)
    # <-- Calculate all metrics required by the Supabase Model Registry
    pr_auc = average_precision_score(y_test, y_proba)
    roc_auc = roc_auc_score(y_test, y_proba)
    f1_macro = f1_score(y_test, y_pred, average='macro', zero_division=0)
    precision_positive = precision_score(y_test, y_pred, pos_label=1, zero_division=0)
    recall_positive = recall_score(y_test, y_pred, pos_label=1, zero_division=0)
    print("\n" + "="*60)
    print(f"Session Conversion Model Evaluation ({v_tag.upper()})")
    print("="*60)
    print(f"Decision Threshold: {decision_threshold:.4f}")
    print(f"PR-AUC   : {pr_auc:.4f}")
    print(f"ROC-AUC  : {roc_auc:.4f}")
    print(f"F1 Macro : {f1_macro:.4f}")
    print(classification_report(y_test, y_pred, target_names=['Not Converted (0)', 'Converted (1)'], zero_division=0))
    # 6. Plotting
    output_dir = "/opt/airflow/output"
    os.makedirs(output_dir, exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Not Convert', 'Convert'])
    disp.plot(cmap=plt.cm.Greens, ax=axes[0], values_format='d')
    axes[0].set_title(f"Confusion Matrix ({v_tag.upper()})")
    fpr, tpr, _ = roc_curve(y_test, y_proba)
    axes[1].plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC AUC = {auc(fpr, tpr):.3f}')
    axes[1].plot([0, 1], [0, 1], 'k--')
    axes[1].legend(loc="lower right")
    # Make sure the plot is also saved with its version name!
    plot_path = os.path.join(output_dir, f"session_conversion_evaluation_{v_tag}.png")
    plt.savefig(plot_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"Plot saved to: {plot_path}")
# ========================================================================
    # 6.5 PUSH IMAGE TO SUPABASE STORAGE & READ BEST PARAMS
    # ========================================================================

    import json

    # FIX: Wrap ALL Supabase processes in a strong Try-Except
    try:
        # Move the import inside try so the script does not crash if the library is not installed
        from supabase import create_client, Client
        dag_run = context.get('dag_run')
        batch_number = int((dag_run.conf or {}).get('batch_number', 0)) if dag_run else 0
        public_url = None
        URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if URL and KEY:
            supabase: Client = create_client(URL, KEY)
            bucket_name = "model-evaluations"
            # Make sure the v_tag variable matches the model (churn / conversion)
            storage_file_name = f"model_eval_{v_tag}_batch{batch_number}.png" 
            with open(plot_path, 'rb') as f:
                supabase.storage.from_(bucket_name).upload(
                    storage_file_name, 
                    f, 
                    file_options={"content-type": "image/png", "upsert": "true"}
                )
            public_url = supabase.storage.from_(bucket_name).get_public_url(storage_file_name)
            print(f"✅ Image uploaded successfully: {public_url}")
    except ImportError:
        print("⚠️ Library 'supabase' is not installed. Skipping image upload.")
        public_url = None
    except Exception as e:
        print(f"⚠️ Failed to upload image to Storage: {e}")
        public_url = None
    # JSON format for database
    evaluation_images_json = {"roc_and_cm": public_url} if public_url else {}
    # READ BEST PARAMS
    best_params_json = {}
    try:
        # Match the file name prefix with the model name (customer_churn / session_conversion)
        best_params_path = os.path.join(model_dir, f"session_conversion_best_params_{v_tag}.json")
        if os.path.exists(best_params_path):
            with open(best_params_path, 'r') as f:
                best_params_json = json.load(f)
    except Exception as e:
        print(f"⚠️ Failed to read best_params: {e}")
    # ========================================================================
    # 7. PUSH TO SUPABASE
    # ========================================================================
    try:
        push_model_metrics(
            model_name="session_conversion",
            batch_number=batch_number,
            f1_macro=float(f1_macro),
            pr_auc=float(pr_auc),
            roc_auc=float(roc_auc),
            precision_positive=float(precision_positive),
            recall_positive=float(recall_positive),
            decision_threshold=float(decision_threshold),
            y_true_for_baseline=y_test,
            best_params=best_params_json,          
            evaluation_images=evaluation_images_json 
        )
        print("✅ Metrics successfully sent to Supabase Model Registry!")
    except Exception as e:
        print(f"⚠️ Warning: Failed to push metrics to Supabase: {e}")
if __name__ == "__main__":
    evaluate_model()