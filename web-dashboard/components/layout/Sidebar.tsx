"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MLOPS_ITEMS = [
  { name: "System Overview", href: "/", mark: "01" },
  { name: "Model Performance", href: "/models", mark: "02" },
  { name: "Actionable Predictions", href: "/predictions", mark: "03" },
  { name: "Pipeline Orchestration", href: "/pipelines", mark: "04" },
];
const ANALYTICS_ITEMS = [
  { name: "Sales & Revenue", href: "/analytics/sales-revenue", mark: "01" },
  { name: "Logistics SLA", href: "/analytics/logistics-sla", mark: "02" },
  { name: "User Funnel", href: "/analytics/user-funnel", mark: "03" },
];

function NavSection({ label, items, pathname, accent }: { label: string; items: typeof MLOPS_ITEMS; pathname: string; accent: "blue" | "green" }) {
  return <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 px-3 text-[10px] font-bold tracking-[0.18em] text-muted"><span className={`size-1.5 rounded-full ${accent === "blue" ? "bg-primary" : "bg-success"}`} />{label}</div>
    <div className="flex flex-col gap-1">
      {items.map((item) => { const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={`group relative flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-[13px] font-medium transition-all ${isActive ? (accent === "blue" ? "border-primary/20 bg-primary-soft text-foreground" : "border-success/20 bg-success-soft text-foreground") : "text-muted hover:border-border hover:bg-surface-muted hover:text-foreground"}`}><span className={`font-mono text-[10px] ${isActive ? (accent === "blue" ? "text-primary" : "text-success") : "text-muted/60 group-hover:text-muted"}`}>{item.mark}</span><span className="truncate">{item.name}</span>{isActive && <span className={`absolute inset-y-2 left-0 w-0.5 rounded-full ${accent === "blue" ? "bg-primary" : "bg-success"}`} />}</Link>; })}
    </div>
  </div>;
}

export default function Sidebar() {
  const pathname = usePathname();
  return <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border bg-background/95 text-foreground lg:flex">
    <div className="border-b border-border px-7 py-7"><div className="flex items-start gap-3"><div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary-soft font-mono text-xs font-bold text-primary">DF</div><div><h1 className="text-sm font-bold tracking-tight">Data Flow Simulation</h1><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">MLOps command center</p></div></div></div>
    <nav className="flex flex-1 flex-col gap-10 overflow-y-auto px-4 py-8" aria-label="Primary navigation"><NavSection label="MACHINE LEARNING" items={MLOPS_ITEMS} pathname={pathname} accent="blue" /><NavSection label="BUSINESS INTELLIGENCE" items={ANALYTICS_ITEMS} pathname={pathname} accent="green" /></nav>
    <div className="border-t border-border px-6 py-6"><div className="flex items-center gap-3"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" /><span className="relative inline-flex size-2.5 rounded-full bg-success" /></span><div><p className="text-xs font-semibold">System online</p><p className="mt-1 font-mono text-[10px] tracking-wide text-muted">ALL SERVICES NOMINAL</p></div></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4 font-mono text-[10px] text-muted"><span>ENV / PRODUCTION</span><span className="text-success">98.7%</span></div></div>
  </aside>;
}
