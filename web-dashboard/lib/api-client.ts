import type {
  ModelMetrics,
  Prediction,
  PipelineHealth,
  ApiResponse,
} from "@/types/Database.types";

// Hanya butuh path relatif karena selalu dipanggil dari Browser/Client
async function fetchApi<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(path);
    const body: ApiResponse<T> = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: body.error ?? `Request gagal (status ${res.status})`,
      };
    }
    return body;
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Gagal menghubungi server.",
    };
  }
}

export function getPipelineHealth(): Promise<ApiResponse<PipelineHealth[]>> {
  return fetchApi<PipelineHealth[]>("/api/health");
}

export function getModelMetrics(
  params: { modelName?: string; championOnly?: boolean } = {},
): Promise<ApiResponse<ModelMetrics[]>> {
  const search = new URLSearchParams();
  if (params.modelName) search.set("model_name", params.modelName);
  if (params.championOnly) search.set("champion_only", "true");

  const qs = search.toString();
  return fetchApi<ModelMetrics[]>(`/api/metrics${qs ? `?${qs}` : ""}`);
}

// Tambahkan predictedLabel di interface parameter
export function getPredictions(params: {
  modelName: string;
  batchNumber?: number;
  limit?: number;
  offset?: number;
  entityId?: string;
  predictedLabel?: number; // <-- TAMBAHAN BARU
}): Promise<ApiResponse<Prediction[]>> {
  const search = new URLSearchParams();
  search.set('model_name', params.modelName);
  
  if (params.batchNumber !== undefined) search.set('batch_number', String(params.batchNumber));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  if (params.entityId) search.set('entity_id', params.entityId);
  
  // <-- TAMBAHAN BARU: Kirim filter label ke backend
  if (params.predictedLabel !== undefined) search.set('predicted_label', String(params.predictedLabel)); 

  return fetchApi<Prediction[]>(`/api/predictions?${search.toString()}`);
}
