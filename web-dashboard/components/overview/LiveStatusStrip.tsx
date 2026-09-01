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
  return <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-slate-200 shadow-sm"><div className="flex items-center justify-between border-b border-slate-800 px-5 py-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${status ? "bg-emerald-400" : "bg-amber-400"}`} /><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-slate-400">LIVE SYSTEM TELEMETRY</span></div><span className="font-mono text-[10px] text-slate-500">AUTO-REFRESH / 60S</span></div><div className="grid grid-cols-1 divide-y divide-slate-800 md:grid-cols-3 md:divide-x md:divide-y-0"><div className="p-5"><p className="font-mono text-[10px] tracking-wider text-slate-500">LAST PIPELINE RUN</p><p className="mt-2 text-sm">{health?.last_run_at ? new Date(health.last_run_at as string).toLocaleString("id-ID") : "Unknown time"}</p><p className={`mt-1 font-mono text-xs font-bold ${status ? "text-emerald-400" : "text-amber-400"}`}>{String(health?.last_run_status || "unknown").toUpperCase()}</p></div><Champion label="CHAMPION / CHURN" champion={churnChampion} /><Champion label="CHAMPION / CONVERSION" champion={conversionChampion} /></div></section>;
}

function Champion({ label, champion }: { label: string; champion?: ModelMetrics }) { return <div className="p-5"><p className="font-mono text-[10px] tracking-wider text-slate-500">{label}</p>{champion ? <><p className="mt-2 font-mono text-sm font-bold text-blue-300">F1 {champion.f1_macro?.toFixed(4) ?? "-"} <span className="font-normal text-slate-500">/ B#{champion.batch_number}</span></p><p className="mt-1 text-xs text-slate-400">Quality gate passed</p></> : <p className="mt-2 text-xs italic text-slate-500">No champion passed</p>}</div>; }
