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

  // Tidak render apapun kalau model ini SUDAH lolos quality gate -- banner
  // cuma muncul saat memang perlu jadi perhatian, bukan noise di semua kondisi.
  if (champion && champion.quality_gate_passed) {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-start gap-2">
      <span>⚠️</span>
      <span>
        Model ini <strong>belum lolos quality gate</strong> (F1 Macro tidak
        mengalahkan baseline classifier trivial). Prediksi di bawah
        ditampilkan untuk transparansi, <strong>bukan</strong> untuk
        actionable insight.
      </span>
    </div>
  );
}