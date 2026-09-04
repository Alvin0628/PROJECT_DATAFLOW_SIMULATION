import type {
  ModelMetrics,
  Prediction,
  PipelineHealth,
  ApiResponse,
} from "@/types/Database.types";

// Relative path is sufficient since this is only called from the client
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

export function getPredictions(params: {
  modelName: string;
  batchNumber?: number;
  limit?: number;
  offset?: number;
  entityId?: string;
  predictedLabel?: number; 
}): Promise<ApiResponse<Prediction[]>> {
  const search = new URLSearchParams();
  search.set('model_name', params.modelName);
  
  if (params.batchNumber !== undefined) search.set('batch_number', String(params.batchNumber));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  if (params.entityId) search.set('entity_id', params.entityId);
  
  if (params.predictedLabel !== undefined) search.set('predicted_label', String(params.predictedLabel)); 

  return fetchApi<Prediction[]>(`/api/predictions?${search.toString()}`);
}
