import AutoRefresh from "@/components/AutoRefresh";
import { Suspense } from "react";
import ModelHistoryTable from "@/components/models/ModelHistoryTable";

const models = [{ name: "Session Conversion", key: "session_conversion", detail: "Predictive signal quality and champion history." }, { name: "Customer Churn", key: "customer_churn", detail: "Quality-gated challenger evaluation history." }] as const;

export default function ModelsPage() {
  return <div className="flex flex-col gap-8 pb-10"><AutoRefresh intervalMs={60000} /><header><p className="dashboard-eyebrow">Machine learning / model registry</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Model performance</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">A complete training history for every model, including challenger runs that did not pass the quality gate.</p></header><div className="flex flex-col gap-5">{models.map((model) => <section key={model.key} className="dashboard-panel overflow-hidden"><div className="flex flex-col gap-1 border-b border-border bg-surface-muted/60 px-5 py-4 md:px-6"><h2 className="font-bold">{model.name}</h2><p className="text-xs text-muted">{model.detail}</p></div><Suspense fallback={<div className="p-8 text-center font-mono text-xs text-muted">LOADING TRAINING HISTORY...</div>}><ModelHistoryTable modelName={model.key} /></Suspense></section>)}</div></div>;
}
