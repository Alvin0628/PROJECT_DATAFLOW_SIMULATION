export interface ModelMetrics {
  id: number;
  model_name: string; 
  batch_number: number;
  trained_at: string; 
  pr_auc: number | null;
  roc_auc: number | null;
  f1_macro: number | null;
  precision_positive: number | null;
  recall_positive: number | null;
  decision_threshold: number | null;
  is_champion: boolean;
  quality_gate_passed: boolean | null;
  mi_diagnostic_summary: Record<string, unknown> | null; // JSONB, not populated by the evaluator yet
}

export interface Prediction {
  id: number;
  model_name: string;
  batch_number: number;
  generated_at: string;
  entity_id: string; 
  probability: number;
  predicted_label: 0 | 1;
  model_metrics_id: number | null;
}

export interface PredictionReconciliation {
  id: number;
  model_name: string;
  reconciled_at: string;
  evaluation_batch_range: string | null;
  actual_precision: number | null;
  actual_recall: number | null;
  total_predictions_checked: number | null;
  notes: string | null;
}

export interface PipelineHealth {
  id: number;
  dag_id: string;
  last_run_at: string | null;
  last_run_status: "success" | "failed" | "running" | null;
  current_batch_number: number | null;
  updated_at: string;
}

// Standard API response shape used across all endpoints.
// Keeps frontend parsing consistent with a single generic type.
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
