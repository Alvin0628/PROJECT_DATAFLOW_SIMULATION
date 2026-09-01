import AutoRefresh from "@/components/AutoRefresh";
import { Suspense } from "react";
import ArchitectureNarrative from "@/components/overview/ArchitectureNarrative";
import LiveStatusStrip from "@/components/overview/LiveStatusStrip";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-12">
      <AutoRefresh intervalMs={60000} />

      {/* 1. Bagian Atas: Presentasi Arsitektur Pipeline (Statis/UI) */}
      <ArchitectureNarrative />

      {/* 2. Bagian Bawah: Pembuktian Data Live (Server Component Dinamis) */}
      <Suspense
        fallback={
          <div className="mt-8 bg-slate-900 rounded-xl h-40 border border-slate-800 flex flex-col items-center justify-center text-slate-500 font-mono text-sm animate-pulse space-y-2">
            <span className="relative flex h-3 w-3 mb-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <p>{">"} Initializing connection to Supabase DB...</p>
            <p className="text-xs text-slate-600">
              Fetching latest pipeline metrics
            </p>
          </div>
        }
      >
        <LiveStatusStrip />
      </Suspense>
    </div>
  );
}
