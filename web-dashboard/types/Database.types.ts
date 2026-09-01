// types/database.types.ts
// Cetakan tipe data untuk 4 tabel di Supabase.
// Kolom yang di database nullable (tidak selalu diisi) ditandai `| null`.

export interface ModelMetrics {
  id: number;
  model_name: string; // 'customer_churn' | 'session_conversion'
  batch_number: number;
  trained_at: string; // ISO timestamp string dari Postgres
  pr_auc: number | null;
  roc_auc: number | null;
  f1_macro: number | null;
  precision_positive: number | null;
  recall_positive: number | null;
  decision_threshold: number | null;
  is_champion: boolean;
  quality_gate_passed: boolean | null;
  mi_diagnostic_summary: Record<string, unknown> | null; // JSONB, belum diisi evaluator saat ini
}

export interface Prediction {
  id: number;
  model_name: string;
  batch_number: number;
  generated_at: string;
  entity_id: string; // session_id / user_id
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

// Bentuk response standar semua API route -- konsisten di semua endpoint,
// supaya frontend fetcher (3.3) bisa pakai satu tipe generik untuk parsing.
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
