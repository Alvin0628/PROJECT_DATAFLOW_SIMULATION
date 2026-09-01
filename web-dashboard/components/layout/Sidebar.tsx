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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-3 pb-1 text-[10px] font-bold tracking-[0.16em] text-slate-500">
        <span className={`h-1.5 w-1.5 rounded-full ${accent === "blue" ? "bg-blue-400" : "bg-emerald-400"}`} />
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors ${isActive ? (accent === "blue" ? "bg-blue-500/15 text-blue-100" : "bg-emerald-500/15 text-emerald-100") : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"}`}>
              <span className={`font-mono text-[10px] ${isActive ? (accent === "blue" ? "text-blue-300" : "text-emerald-300") : "text-slate-600 group-hover:text-slate-400"}`}>{item.mark}</span>
              <span className="truncate">{item.name}</span>
              {isActive && <span className={`absolute inset-y-2 left-0 w-0.5 rounded-full ${accent === "blue" ? "bg-blue-400" : "bg-emerald-400"}`} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300 lg:flex">
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-500/15 font-mono text-xs font-bold text-blue-300">DF</div>
          <div>
            <h1 className="text-sm font-bold leading-tight tracking-tight text-white">Data Flow Simulation</h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">Evaluation Center</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-8 overflow-y-auto px-3 py-7" aria-label="Primary navigation">
        <NavSection label="MACHINE LEARNING" items={MLOPS_ITEMS} pathname={pathname} accent="blue" />
        <NavSection label="BUSINESS INTELLIGENCE" items={ANALYTICS_ITEMS} pathname={pathname} accent="green" />
      </nav>
      <div className="border-t border-slate-800 bg-slate-900/50 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" /></span>
          <div><p className="text-xs font-semibold text-slate-200">System online</p><p className="mt-0.5 font-mono text-[10px] text-slate-500">SUPABASE CONNECTED</p></div>
        </div>
      </div>
    </aside>
  );
}
