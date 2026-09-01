"use client"; // Wajib karena kita butuh hook navigasi dari browser

import Link from "next/link";
import { usePathname } from "next/navigation";

// 1. Kategori Menu Pertama: MLOps & Data Engineering
const MLOPS_ITEMS = [
  { name: "System Overview", href: "/" },
  { name: "Model Performance", href: "/models" },
  { name: "Actionable Predictions", href: "/predictions" },
  { name: "Pipeline Orchestration", href: "/pipelines" },
];

// 2. Kategori Menu Kedua: Business Intelligence (Data Marts)
const ANALYTICS_ITEMS = [
  { name: "Sales & Revenue", href: "/analytics/sales-revenue" },
  { name: "Logistics SLA", href: "/analytics/logistics-sla" },
  { name: "User Funnel", href: "/analytics/user-funnel" },
];

export default function Sidebar() {
  const pathname = usePathname(); // Mengambil URL yang sedang aktif

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0">
      {/* HEADER LOGO */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-base font-bold text-white tracking-tight flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-500 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <span className="leading-snug">Data Flow Simulation Dashboard</span>
        </h1>
        <p className="text-xs text-slate-500 mt-2 font-medium pl-9">
          Evaluation Center
        </p>
      </div>

      {/* MENU NAVIGASI */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* BAGIAN 1: MACHINE LEARNING */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 mb-3 px-2 tracking-wider">
            MACHINE LEARNING
          </div>
          {MLOPS_ITEMS.map((item) => {
            // Logika active: spesial untuk "/" harus exact match, sisanya pakai startsWith agar nested route tetap aktif
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  block px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm" // Style aktif
                      : "hover:bg-slate-800 hover:text-white" // Style tidak aktif
                  }
                `}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* BAGIAN 2: BUSINESS INSIGHTS */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 mb-3 px-2 tracking-wider">
            BUSINESS INSIGHTS
          </div>
          {ANALYTICS_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  block px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm" // Membedakan warna agar terasa beda konteks
                      : "hover:bg-slate-800 hover:text-white"
                  }
                `}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FOOTER STATUS LIVE */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="text-xs">
            <p className="text-slate-300 font-medium">System Online</p>
            <p className="text-slate-500">Connected to Supabase</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
