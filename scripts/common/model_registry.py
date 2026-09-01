import pandas as pd
import json  # <-- Tambahkan import json
from sklearn.metrics import f1_score

from scripts.common.supabase_postgres import SupabasePostgres
from scripts.common.logger import get_logger

logger = get_logger(__name__)

def compute_baseline_f1_macro(y_true) -> float:

    y_true = pd.Series(y_true)
    majority_class = y_true.mode()[0]
    y_trivial_pred = [majority_class] * len(y_true)
    return f1_score(y_true, y_trivial_pred, average='macro', zero_division=0)


def push_model_metrics(
    model_name: str,
    batch_number: int,
    f1_macro: float,
    pr_auc: float,
    roc_auc: float,
    precision_positive: float,
    recall_positive: float,
    decision_threshold: float,
    y_true_for_baseline,
    best_params: dict = None,          # <-- Tambahan argumen
    evaluation_images: dict = None,    # <-- Tambahan argumen
) -> dict:
    """
    Hitung quality gate, tentukan Champion/Challenger, push hasilnya ke tabel model_metrics.
    """
    baseline_f1_macro = compute_baseline_f1_macro(y_true_for_baseline)
    quality_gate_passed = bool(f1_macro > baseline_f1_macro)

    with SupabasePostgres() as db:
        db.execute(
            "SELECT f1_macro FROM model_metrics "
            "WHERE model_name = %s AND is_champion = true "
            "ORDER BY trained_at DESC LIMIT 1",
            (model_name,)
        )
        row = db.fetchone()
        current_champion_f1_macro = row[0] if row else None

        is_new_champion = quality_gate_passed and (
            current_champion_f1_macro is None or f1_macro > current_champion_f1_macro
        )

        if is_new_champion:
            db.execute(
                "UPDATE model_metrics SET is_champion = false "
                "WHERE model_name = %s AND is_champion = true",
                (model_name,)
            )

        # <-- UPDATE QUERY SQL UNTUK MEMASUKKAN JSONB
        db.execute(
            """
            INSERT INTO model_metrics (
                model_name, batch_number, pr_auc, roc_auc, f1_macro,
                precision_positive, recall_positive, decision_threshold,
                is_champion, quality_gate_passed,
                best_params, evaluation_images
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                model_name, batch_number, pr_auc, roc_auc, f1_macro,
                precision_positive, recall_positive, decision_threshold,
                is_new_champion, quality_gate_passed,
                json.dumps(best_params) if best_params else None,          # Convert dict ke JSON string
                json.dumps(evaluation_images) if evaluation_images else None # Convert dict ke JSON string
            )
        )

    logger.info(
        f"[{model_name}] batch {batch_number}: F1 Macro={f1_macro:.4f} "
        f"(baseline trivial={baseline_f1_macro:.4f}) -> "
        f"quality_gate={'PASSED' if quality_gate_passed else 'FAILED'}, "
        f"champion={'YES (promoted)' if is_new_champion else 'no (recorded as challenger)'}"
    )

    return {
        "baseline_f1_macro": baseline_f1_macro,
        "quality_gate_passed": quality_gate_passed,
        "is_new_champion": is_new_champion,
    }