export default function ArchitectureNarrative() {
  const stages = [
    { n: "01", title: "Data layer", subtitle: "Medallion architecture", accent: "bg-amber-500", items: ["Bronze · raw", "Silver · clean", "Gold · features"] },
    { n: "02", title: "Orchestrator", subtitle: "Apache Airflow", accent: "bg-rose-500", items: ["Trigger DAGs", "Task routing", "Error handling"] },
    { n: "03", title: "ML pipeline", subtitle: "Docker-out-of-Docker", accent: "bg-blue-500", items: ["Train model", "Quality gate", "Persist metrics"] },
    { n: "04", title: "Serving", subtitle: "Next.js UI", accent: "bg-emerald-500", items: ["REST API", "Actionable insight", "Dynamic export"] },
  ];
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl"><p className="dashboard-eyebrow">System overview / production topology</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Data Flow Simulation <span className="text-muted">&amp; MLOps Pipeline</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">End-to-end machine learning operations with automated training, quality gates, and business-ready outputs.</p></div>
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-success/20 bg-success-soft px-3 py-2 text-xs font-semibold text-success"><span className="size-2 rounded-full bg-success" />Live environment</div>
      </div>
      <div className="dashboard-panel flex flex-col gap-3 p-5 text-sm leading-6 text-muted md:p-6"><p><strong className="text-foreground">Executive summary.</strong> This production-scale MLOps ecosystem moves raw data from Bronze to Gold, detects changes, triggers isolated continuous training, evaluates candidates through strict quality gates, and publishes actionable insights in near real time.</p><div className="flex flex-wrap gap-2 pt-2"><span className="rounded-md bg-primary-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">NEXT.JS 16</span><span className="rounded-md bg-surface-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-muted">AIRFLOW</span><span className="rounded-md bg-surface-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-muted">POSTGRESQL</span><span className="rounded-md bg-surface-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-muted">QUALITY GATES</span></div></div>
      <div className="flex flex-col gap-4"><div><p className="dashboard-eyebrow">Pipeline architecture</p><h2 className="mt-1 text-lg font-bold text-foreground">From source data to decision surface</h2></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{stages.map((stage) => <div key={stage.n} className="dashboard-panel group relative p-5 transition-shadow hover:shadow-md"><div className={`mb-5 flex size-9 items-center justify-center rounded-md ${stage.accent} text-xs font-bold text-white`}>{stage.n}</div><h3 className="font-bold text-foreground">{stage.title}</h3><p className="mt-1 font-mono text-[11px] text-muted">{stage.subtitle}</p><ul className="mt-4 flex flex-col gap-2 text-xs text-muted">{stage.items.map((item) => <li key={item} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-border-strong" />{item}</li>)}</ul></div>)}</div></div>
    </div>
  );
}
