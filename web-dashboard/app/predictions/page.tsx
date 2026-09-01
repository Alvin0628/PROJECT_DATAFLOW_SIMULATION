import AutoRefresh from "@/components/AutoRefresh";
import { Suspense } from "react";
import PredictionsTable from "@/components/predictions/PredictionsTable";
import QualityGateWarning from "@/components/predictions/Qualitygatewarning";

export default function PredictionsPage() {
  return <div className="flex flex-col gap-8 pb-10"><AutoRefresh intervalMs={60000} /><header><p className="dashboard-eyebrow">Machine learning / decision support</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Actionable predictions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Prioritized entities with the highest predicted risk or opportunity, ready for business action and CSV export.</p></header><div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{["customer_churn", "session_conversion"].map((model) => <section key={model} className="dashboard-panel overflow-hidden"><div className="border-b border-border bg-surface-muted/60 px-5 py-4"><h2 className="font-bold">{model === "customer_churn" ? "Customer Churn" : "Session Conversion"}</h2><p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">Model output / ranked signals</p></div><Suspense fallback={null}><QualityGateWarning modelName={model as "customer_churn" | "session_conversion"} /></Suspense><PredictionsTable modelName={model as "customer_churn" | "session_conversion"} /></section>)}</div></div>;
}
