import { getBaseUrl } from '@/lib/get-base-url';
import type { ModelMetrics, ApiResponse } from '@/types/Database.types';

interface QualityGateWarningProps {
  modelName: string;
}

export default async function QualityGateWarning({ modelName }: QualityGateWarningProps) {
  const res = await fetch(
    `${getBaseUrl()}/api/metrics?model_name=${modelName}&champion_only=true`,
    { cache: 'no-store' }
  );
  const body: ApiResponse<ModelMetrics[]> = await res.json();
  const champion = body.data?.[0];

  // Show only when the quality gate fails to avoid unnecessary noise
  if (champion && champion.quality_gate_passed) {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-start gap-2">
      <span>⚠️</span>
      <span>
        This model <strong>has not passed the quality gate</strong> (Macro F1 does not outperform the trivial classifier baseline). The predictions below are shown for transparency, <strong>not for actionable insights</strong>.
      </span>
    </div>
  );
}