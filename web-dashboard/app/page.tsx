import AutoRefresh from "@/components/AutoRefresh";
import { Suspense } from "react";
import ArchitectureNarrative from "@/components/overview/ArchitectureNarrative";
import LiveStatusStrip from "@/components/overview/LiveStatusStrip";

export default function HomePage() {
  return <div className="flex flex-col gap-8 pb-10"><AutoRefresh intervalMs={60000} /><ArchitectureNarrative /><Suspense fallback={<div className="dashboard-panel flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center font-mono text-xs text-muted"><span className="size-2 animate-pulse rounded-full bg-primary" /><p>INITIALIZING DATABASE CONNECTION</p><p className="text-muted">Fetching latest pipeline metrics</p></div>}><LiveStatusStrip /></Suspense></div>;
}
