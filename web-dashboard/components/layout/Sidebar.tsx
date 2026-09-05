"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

type NavItem = {
  name: string;
  href: string;
  mark: string;
};

function NavSection({
  label,
  items,
  pathname,
  accent,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  accent: "blue" | "green";
  onNavigate?: () => void;
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
              onClick={onNavigate}
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

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Brand / workspace */}
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

      {/* Navigation */}
      <nav
        className="flex flex-1 flex-col gap-9 overflow-y-auto px-4 py-8"
        aria-label="Primary navigation"
      >
        <NavSection
          label="MACHINE LEARNING"
          items={MLOPS_ITEMS}
          pathname={pathname}
          accent="blue"
          onNavigate={onNavigate}
        />

        <NavSection
          label="BUSINESS INTELLIGENCE"
          items={ANALYTICS_ITEMS}
          pathname={pathname}
          accent="green"
          onNavigate={onNavigate}
        />
      </nav>

      {/* System status */}
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
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Prevent the page from scrolling behind the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ============================================================
          DESKTOP SIDEBAR
          ============================================================ */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border bg-[#070d15]/90 text-foreground backdrop-blur-xl lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ============================================================
          MOBILE HEADER
          ============================================================ */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-[#070d15]/95 px-4 text-foreground backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/50 bg-primary-soft font-mono text-[11px] font-bold text-primary shadow-[0_0_20px_rgb(120_169_255_/_0.12)]">
            DF
          </div>

          <div>
            <p className="text-xs font-semibold tracking-tight">
              Dataflow Simulation
            </p>

            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
              Operational intelligence
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-muted/60 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
          </span>
        </button>
      </header>

      {/* ============================================================
          MOBILE OVERLAY
          ============================================================ */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* ============================================================
          MOBILE DRAWER
          ============================================================ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-border bg-[#070d15] text-foreground shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/50 bg-primary-soft font-mono text-[11px] font-bold text-primary">
              DF
            </div>

            <div>
              <p className="text-xs font-semibold">Dataflow Simulation</p>

              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
                Navigation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Drawer content */}
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}