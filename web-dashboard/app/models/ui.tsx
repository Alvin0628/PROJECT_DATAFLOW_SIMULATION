import Link from "next/link";
import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import ModelHistoryTable from "@/components/models/ModelHistoryTable";

const models = [{ name: "Session Conversion", key: "session_conversion", detail: "Predictive signal quality and champion history." }, { name: "Customer Churn", key: "customer_churn", detail: "Quality-gated challenger evaluation history." }] as const;

export default function ModelsUI() {
  return <main className="page-stack"><AutoRefresh intervalMs={60000}/><header className="page-header"><div><p className="dashboard-eyebrow">Registry / lifecycle control</p><h1>Model operations</h1><p>Production candidates, champion lineage, and the training runs behind every decision.</p></div><div className="header-signals"><span className="signal signal-success">2 registered</span><span className="signal">Quality gate active</span></div></header><section className="metric-grid metric-grid-three"><article className="metric-card metric-card-primary"><p className="dashboard-eyebrow">Champion</p><h2>customer_churn</h2><p>Serving production traffic</p><div className="metric-card-foot"><strong>v2</strong><span className="status status-success">HEALTHY</span></div></article><article className="metric-card"><p className="dashboard-eyebrow">Registry coverage</p><strong className="metric-value">2</strong><p>Models with tracked history</p><div className="meter"><span style={{width:"100%"}}/></div></article><article className="metric-card"><p className="dashboard-eyebrow">Review queue</p><strong className="metric-value">1</strong><p>Challenger awaiting evaluation</p><Link href="/predictions" className="inline-link">Review predictions →</Link></article></section><section className="page-section"><div className="section-heading"><div><p className="dashboard-eyebrow">Version registry</p><h2>Model history</h2></div><span className="section-meta">LATEST RUNS / 2 MODELS</span></div><div className="table-shell"><Suspense fallback={<div className="state-box">Loading model history…</div>}><div className="table-scroll">{models.map((model)=><div key={model.key} className="model-lane"><div><span className="status-dot"/><strong>{model.name}</strong><p>{model.detail}</p></div><ModelHistoryTable modelName={model.key}/></div>)}</div></Suspense></div></section></main>;
}

export { models };
