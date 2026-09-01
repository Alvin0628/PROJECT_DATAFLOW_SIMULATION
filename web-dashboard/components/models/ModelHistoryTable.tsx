import { getBaseUrl } from "@/lib/get-base-url";
import type { ModelMetrics, ApiResponse } from "@/types/Database.types";
import MetricsHistoryChart from "./MetricsHistoryChart";
import Link from "next/link"; // <-- 1. Import Link dari Next.js

interface ModelHistoryTableProps {
  modelName: "customer_churn" | "session_conversion";
}

export default async function ModelHistoryTable({
  modelName,
}: ModelHistoryTableProps) {
  const res = await fetch(
    `${getBaseUrl()}/api/metrics?model_name=${modelName}`,
    {
      cache: "no-store",
    },
  );
  const body: ApiResponse<ModelMetrics[]> = await res.json();

  if (body.error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
        Gagal memuat riwayat model: {body.error}
      </div>
    );
  }

  const data = body.data ?? [];

  if (data.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed rounded-lg text-slate-500 text-sm">
        Belum ada riwayat training untuk model ini.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <MetricsHistoryChart data={data} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="py-3 px-4 font-semibold">Batch</th>
              <th className="py-3 px-4 font-semibold">Trained At</th>
              <th className="py-3 px-4 font-semibold">F1 Macro</th>
              <th className="py-3 px-4 font-semibold">PR-AUC</th>
              <th className="py-3 px-4 font-semibold">Quality Gate</th>
              <th className="py-3 px-4 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                {/* 2. Ubah kolom Batch menjadi Link yang bisa diklik */}
                <td className="py-3 px-4">
                  <Link
                    href={`/models/${modelName}/${m.batch_number}`}
                    className="text-blue-600 font-semibold hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                  >
                    #{m.batch_number} <span className="text-xs">&rarr;</span>
                  </Link>
                </td>

                <td className="py-3 px-4 text-slate-500">
                  {new Date(m.trained_at).toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-4 font-mono">
                  {m.f1_macro?.toFixed(4) ?? "-"}
                </td>
                <td className="py-3 px-4 font-mono">
                  {m.pr_auc?.toFixed(4) ?? "-"}
                </td>
                <td className="py-3 px-4">
                  {m.quality_gate_passed ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      PASSED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                      FAILED
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {m.is_champion ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Champion
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Challenger</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
