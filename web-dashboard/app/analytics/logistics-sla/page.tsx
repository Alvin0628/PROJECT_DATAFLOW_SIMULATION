import AutoRefresh from "@/components/AutoRefresh";
import { supabase } from "@/lib/supabase-client";
import KPICard from "@/components/analytics/KPICard";
import FulfillmentTimelineChart from "@/components/analytics/logistics-sla/FulfillmentTimelineChart";
import DeliveryMapChart from "@/components/analytics/logistics-sla/DeliveryMapChart";
import TopNodesChart from "@/components/analytics/logistics-sla/TopNodesChart";

export const dynamic = "force-dynamic";
type DatabaseValue = string | number | boolean | null;
type DataRow = Record<string, DatabaseValue>;
function aggregateCount(data: DataRow[], key: string) { const result: Record<string, number> = {}; data.forEach((item) => { const name = String(item[key] || "Unknown Node"); if (name !== "Unknown Node") result[name] = (result[name] || 0) + 1; }); return Object.entries(result).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }

export default async function LogisticsSLADashboard() {
  const { data: rawData, error } = await supabase.from("mart_logistics_sla").select("*");
  if (error) return <div className="dashboard-panel border-danger/30 p-6 text-danger">Error: {error.message}</div>;
  if (!rawData || rawData.length === 0) return <div className="dashboard-panel flex min-h-96 items-center justify-center border-dashed p-6 text-muted">No logistics data available.</div>;
  const logisticsData = rawData as DataRow[];
  const totalPackages = logisticsData.length;
  const validTimes = logisticsData.filter((d) => Number(d.processing_time_days) > 0);
  const avgProcessingDays = validTimes.length ? validTimes.reduce((sum, d) => sum + Number(d.processing_time_days), 0) / validTimes.length : 0;
  const lateProcessing = logisticsData.reduce((sum, d) => sum + Number(d.is_late_processing || 0), 0);
  const totalShipped = logisticsData.reduce((sum, d) => sum + Number(d.is_shipped_flag || 0), 0);
  const topNodesData = aggregateCount(logisticsData, "dc_name").slice(0, 5);
  const mapDataMap: Record<string, { city: string; lat: number; lon: number; packages: number }> = {};
  logisticsData.forEach((d) => { const city = String(d.destination_city || ""); if (!city) return; mapDataMap[city] ??= { city, lat: Number(d.destination_latitude || 0), lon: Number(d.destination_longitude || 0), packages: 0 }; mapDataMap[city].packages += 1; });
  const mapData = Object.values(mapDataMap);
  const timelineMap: Record<string, { date: string; totalPackages: number; shippedPackages: number }> = {};
  logisticsData.forEach((d) => { const date = String(d.order_created_date || "").substring(0, 7); if (!date) return; timelineMap[date] ??= { date, totalPackages: 0, shippedPackages: 0 }; timelineMap[date].totalPackages += 1; timelineMap[date].shippedPackages += Number(d.is_shipped_flag || 0); });
  const timelineData = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

  return <main className="flex min-h-screen flex-col gap-7 rounded-lg border border-border bg-surface p-5 md:p-8"><AutoRefresh intervalMs={60000}/><header className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-success">Business intelligence / operations mart</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Logistics SLA</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">A live operational read on fulfillment timing, shipping throughput, and distribution-node pressure.</p></div><div className="font-mono text-[11px] uppercase tracking-widest text-muted">Network operations · live</div></header>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><KPICard title="Packages in flow" value={(totalPackages / 1000).toFixed(1)+"K"} colorTheme="blue" subtitle="Unique package records"/><KPICard title="Avg processing" value={avgProcessingDays.toFixed(2)} colorTheme="emerald" subtitle="Days per package"/><KPICard title="Late processing" value={(lateProcessing / 1000).toFixed(2)+"K"} colorTheme="rose" subtitle="SLA exceptions"/><KPICard title="Total shipped" value={(totalShipped / 1000).toFixed(1)+"K"} colorTheme="emerald" subtitle="Outbound throughput"/></section>
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]"><div className="dashboard-panel min-h-[450px] border-success/25 p-5"><div className="mb-3 flex items-start justify-between"><div><p className="eyebrow text-success">Primary operational view</p><h2 className="mt-1 text-xl font-semibold text-foreground">Distribution network</h2></div><span className="status-dot">● Nodes online</span></div><DeliveryMapChart data={mapData}/></div><div className="dashboard-panel min-h-[450px] p-5"><p className="eyebrow text-muted">Bottleneck watch</p><h2 className="mt-1 text-xl font-semibold text-foreground">Top distribution nodes</h2><div className="mt-5"><TopNodesChart data={topNodesData}/></div></div></section>
    <section className="dashboard-panel p-5"><div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-muted">Fulfillment cadence</p><h2 className="mt-1 text-xl font-semibold text-foreground">Orders moving through the network</h2></div><p className="text-xs text-muted">Created vs shipped by month</p></div><FulfillmentTimelineChart data={timelineData}/></section>
  </main>;
}
