const stages = [
  { n: "01", title: "Data sources", subtitle: "Medallion layer", accent: "text-warning", glow: "bg-warning", items: ["Bronze · raw", "Silver · clean", "Gold · features"] },
  { n: "02", title: "Orchestrator", subtitle: "Apache Airflow", accent: "text-danger", glow: "bg-danger", items: ["Trigger DAGs", "Task routing", "Quality gates"] },
  { n: "03", title: "ML pipeline", subtitle: "Training runtime", accent: "text-primary", glow: "bg-primary", items: ["Train model", "Persist metrics", "Register candidate"] },
  { n: "04", title: "Serving", subtitle: "Decision surface", accent: "text-success", glow: "bg-success", items: ["REST API", "Actionable insight", "Business intelligence"] },
];

export default function ArchitectureNarrative() {
  return (
    <div className="flex flex-col gap-8">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-7 md:px-10 md:py-9">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_center,rgb(120_169_255_/_0.14),transparent_68%)]" />
        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3"><p className="dashboard-eyebrow">MLOPS COMMAND CENTER</p><span className="rounded-full border border-success/30 bg-success-soft px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-success">Production / live</span></div>
            <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.06em] md:text-6xl">See the system<br /><span className="text-muted">think in real time.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-muted">A unified operating view across data movement, model lifecycle, inference health, and the business signals those systems produce.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-l border-border pl-5 font-mono text-[10px] text-muted md:grid-cols-4 xl:w-[430px] xl:grid-cols-2">
            <Metric label="Environment" value="PRODUCTION" />
            <Metric label="Refresh cadence" value="AUTO" />
            <Metric label="Data plane" value="OBSERVED" valueClass="text-success" />
            <Metric label="Runtime mode" value="CONTINUOUS" />
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="dashboard-panel command-grid overflow-hidden p-5 md:p-7">
          <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-start md:justify-between"><div><p className="dashboard-eyebrow">Runtime topology</p><h2 className="mt-2 text-xl font-semibold tracking-tight">From raw signal to business decision</h2></div><p className="max-w-xs text-right text-xs leading-5 text-muted">Continuous path through governed data, training, and serving layers.</p></div>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {stages.map((stage, index) => <div key={stage.n} className="relative"><div className="h-full rounded-xl border border-border bg-background/75 p-4 transition-colors hover:border-border-strong"><div className="flex items-center justify-between"><span className={`font-mono text-[10px] font-bold ${stage.accent}`}>{stage.n}</span><span className={`size-2 rounded-full ${stage.glow} shadow-[0_0_12px_currentColor]`} /></div><h3 className="mt-7 text-sm font-semibold">{stage.title}</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">{stage.subtitle}</p><ul className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted">{stage.items.map((item) => <li key={item} className="flex items-center gap-2"><span className={`size-1 rounded-full ${stage.glow}`} />{item}</li>)}</ul></div>{index < stages.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden h-px w-3 bg-primary/70 md:block" />}</div>)}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted"><span className="text-success">● healthy path</span><span>·</span><span>4 runtime layers</span><span>·</span><span>quality gates enforced</span></div>
        </div>
        <aside className="dashboard-panel flex flex-col justify-between p-5 md:p-6"><div><p className="dashboard-eyebrow text-success">Executive readout</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">Platform signal</h2><p className="mt-3 text-sm leading-6 text-muted">The command center keeps operational health and model intelligence in the same field of view.</p></div><div className="mt-8 flex flex-col gap-4 border-t border-border pt-5"><Signal label="Pipeline runtime" value="NOMINAL" tone="text-success" /><Signal label="Model registry" value="2 ONLINE" tone="text-primary" /><Signal label="Decision latency" value="REAL-TIME" tone="text-warning" /></div></aside>
      </section>
    </div>
  );
}

function Metric({ label, value, valueClass = "text-foreground" }: { label: string; value: string; valueClass?: string }) { return <div><p className="text-[9px] uppercase tracking-[0.14em]">{label}</p><p className={`mt-1 text-xs font-bold ${valueClass}`}>{value}</p></div>; }
function Signal({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted">{label}</span><span className={`font-mono text-[10px] font-bold ${tone}`}>{value}</span></div>; }
