import { getBaseUrl } from "@/lib/get-base-url";
import type { PipelineHealth, ModelMetrics, ApiResponse } from "@/types/Database.types";

export default async function LiveStatusStrip() {
  const [healthRes, championRes] = await Promise.all([fetch(`${getBaseUrl()}/api/health`, { cache: "no-store" }), fetch(`${getBaseUrl()}/api/metrics?champion_only=true`, { cache: "no-store" })]);
  const healthBody: ApiResponse<PipelineHealth[]> = await healthRes.json();
  const championBody: ApiResponse<ModelMetrics[]> = await championRes.json();
  if (healthBody.error || championBody.error) return <div className="dashboard-panel border-danger/30 bg-danger-soft p-5 font-mono text-xs text-danger">CONNECTION_FAILED · Unable to load live telemetry</div>;
  const health = healthBody.data?.[0]; const champions = championBody.data ?? [];
  const churnChampion = champions.find((c) => c.model_name === "customer_churn"); const conversionChampion = champions.find((c) => c.model_name === "session_conversion");
  const status = health?.last_run_status === "success";
  return <section className="dashboard-panel overflow-hidden"><div className="flex items-center justify-between border-b border-border bg-surface-muted/50 px-5 py-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${status ? "bg-success" : "bg-warning"}`} /><span className="dashboard-eyebrow">Live system telemetry</span></div><span className="font-mono text-[10px] text-muted">AUTO-REFRESH / 60S</span></div><div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0"><div className="p-5"><p className="dashboard-eyebrow text-muted">Last pipeline run</p><p className="mt-2 text-sm">{health?.last_run_at ? new Date(health.last_run_at as string).toLocaleString("id-ID") : "Unknown time"}</p><p className={`mt-1 font-mono text-xs font-bold ${status ? "text-success" : "text-warning"}`}>{String(health?.last_run_status || "unknown").toUpperCase()}</p></div><Champion label="CHAMPION / CHURN" champion={churnChampion} /><Champion label="CHAMPION / CONVERSION" champion={conversionChampion} /></div></section>;
}

function Champion({ label, champion }: { label: string; champion?: ModelMetrics }) { return <div className="p-5"><p className="dashboard-eyebrow text-muted">{label}</p>{champion ? <><p className="mt-2 font-mono text-sm font-bold text-primary">F1 {champion.f1_macro?.toFixed(4) ?? "-"} <span className="font-normal text-muted">/ B#{champion.batch_number}</span></p><p className="mt-1 text-xs text-muted">Quality gate passed</p></> : <p className="mt-2 text-xs italic text-muted">No champion passed</p>}</div>; }
