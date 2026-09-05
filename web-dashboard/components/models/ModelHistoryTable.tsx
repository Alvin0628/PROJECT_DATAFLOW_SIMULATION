import { getBaseUrl } from "@/lib/get-base-url";
import type { ModelMetrics, ApiResponse } from "@/types/Database.types";
import MetricsHistoryChart from "./MetricsHistoryChart";
import Link from "next/link";

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
      <div className="m-5 rounded-md border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
        Unable to load model history: {body.error}
      </div>
    );
  }

  const data = body.data ?? [];

  if (!data.length) {
    return (
      <div className="p-10 text-center font-mono text-xs text-muted">
        NO TRAINING RUNS FOUND
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="min-w-0 overflow-hidden border-b border-border px-5 py-4 md:px-6">
        <p className="dashboard-eyebrow">Evaluation trend</p>

        <MetricsHistoryChart data={data} />
      </div>

      <div className="overflow-x-auto">
        <table className="dashboard-table w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-5 py-3">Batch</th>
              <th className="px-5 py-3">Trained at</th>
              <th className="px-5 py-3">F1 macro</th>
              <th className="px-5 py-3">PR-AUC</th>
              <th className="px-5 py-3">Quality gate</th>
              <th className="px-5 py-3">Role</th>
            </tr>
          </thead>

          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-4">
                  <Link
                    href={`/models/${modelName}/${m.batch_number}`}
                    className="font-mono text-xs font-bold text-primary hover:underline"
                  >
                    B#{m.batch_number} →
                  </Link>
                </td>

                <td className="px-5 py-4 text-xs text-muted">
                  {new Date(m.trained_at).toLocaleString("id-ID")}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  {m.f1_macro?.toFixed(4) ?? "-"}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  {m.pr_auc?.toFixed(4) ?? "-"}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-md px-2 py-1 font-mono text-[10px] font-bold ${
                      m.quality_gate_passed
                        ? "bg-success-soft text-success"
                        : "bg-danger-soft text-danger"
                    }`}
                  >
                    {m.quality_gate_passed ? "PASSED" : "FAILED"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  {m.is_champion ? (
                    <span className="rounded-md bg-warning-soft px-2 py-1 font-mono text-[10px] font-bold text-warning">
                      CHAMPION
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-muted">
                      CHALLENGER
                    </span>
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