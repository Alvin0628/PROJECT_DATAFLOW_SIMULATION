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

function NavSection({
  label,
  items,
  pathname,
  accent,
}: {
  label: string;
  items: typeof MLOPS_ITEMS;
  pathname: string;
  accent: "blue" | "green";
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-3 font-mono text-[9px] font-bold tracking-[0.2em] text-muted">
        <span
          className={`size-1.5 rounded-full ${
            accent === "blue" ? "bg-primary" : "bg-success"
          }`}
        />
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-3 text-[12px] font-medium transition-all ${
                isActive
                  ? "bg-primary-soft text-foreground shadow-[inset_0_0_22px_rgb(120_169_255_/_0.08)]"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span
                className={`font-mono text-[9px] ${
                  isActive
                    ? accent === "blue"
                      ? "text-primary"
                      : "text-success"
                    : "text-muted/50"
                }`}
              >
                {item.mark}
              </span>
              <span className="truncate">{item.name}</span>
              {isActive && (
                <span
                  className={`absolute inset-y-2 left-0 w-0.5 rounded-full shadow-[0_0_12px_currentColor] ${
                    accent === "blue"
                      ? "bg-primary text-primary"
                      : "bg-success text-success"
                  }`}
                />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border bg-[#070d15]/90 text-foreground backdrop-blur-xl lg:flex">
      <div className="border-b border-border px-6 py-7">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/50 bg-primary-soft font-mono text-xs font-bold text-primary shadow-[0_0_24px_rgb(120_169_255_/_0.15)]">
            DF
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">
              Dataflow Simulation
            </h1>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Operational intelligence
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-[9px] text-muted">
          <span>WORKSPACE</span>
          <span className="text-foreground">
            PRODUCTION <span className="text-success">●</span>
          </span>
        </div>
      </div>

      <nav
        className="flex flex-1 flex-col gap-9 overflow-y-auto px-4 py-8"
        aria-label="Primary navigation"
      >
        <NavSection
          label="MACHINE LEARNING"
          items={MLOPS_ITEMS}
          pathname={pathname}
          accent="blue"
        />
        <NavSection
          label="BUSINESS INTELLIGENCE"
          items={ANALYTICS_ITEMS}
          pathname={pathname}
          accent="green"
        />
      </nav>

      <div className="border-t border-border px-5 py-5">
        <div className="rounded-lg border border-success/20 bg-success-soft/40 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <p className="text-xs font-semibold">System online</p>
          </div>
          <p className="mt-2 font-mono text-[9px] tracking-wide text-muted">
            ALL SERVICES NOMINAL
          </p>
          <div className="mt-3 flex justify-between border-t border-success/15 pt-3 font-mono text-[9px] text-muted">
            <span>UPTIME</span>
            <span className="text-success">98.7%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}