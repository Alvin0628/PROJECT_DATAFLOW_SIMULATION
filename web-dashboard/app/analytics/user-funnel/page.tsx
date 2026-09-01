import AutoRefresh from "@/components/AutoRefresh";
import { supabase } from "@/lib/supabase-client";
import KPICard from "@/components/analytics/KPICard";
import DonutChart from "@/components/analytics/DonutChart";
import HorizontalBarChart from "@/components/analytics/HorizontalBarChart";
import FunnelChartComponent from "@/components/analytics/user-funnel/FunnelChartComponent";
import SessionsTrendChart from "@/components/analytics/user-funnel/SessionsTrendChart";

export const dynamic = "force-dynamic";
type DatabaseValue = string | number | boolean | null;
type DataRow = Record<string, DatabaseValue>;
function aggregateCount(data: DataRow[], key: string) { const result: Record<string, number> = {}; data.forEach((item) => { const name = String(item[key] || ""); if (name && name !== "null") result[name] = (result[name] || 0) + 1; }); return Object.entries(result).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }

export default async function UserFunnelDashboard() {
  const { data: rawData, error } = await supabase.from("mart_user_funnel").select("*");
  if (error) return <div className="dashboard-panel border-danger/30 p-6 text-danger">Error fetching funnel data: {error.message}</div>;
  if (!rawData || rawData.length === 0) return <div className="dashboard-panel flex min-h-96 items-center justify-center border-dashed p-6 text-muted">No funnel data available.</div>;
  const funnelData = rawData as DataRow[];
  const totalSessions = funnelData.length;
  const totalConversions = funnelData.reduce((sum, item) => sum + (Number(item.is_converted) || 0), 0);
  const totalBounced = funnelData.reduce((sum, item) => sum + (Number(item.is_bounced) || 0), 0);
  const totalAddedToCart = funnelData.reduce((sum, item) => sum + (Number(item.added_to_cart) || 0), 0);
  const totalAbandonedCart = funnelData.reduce((sum, item) => sum + (Number(item.is_abandoned_cart) || 0), 0);
  const conversionRate = ((totalConversions / totalSessions) * 100).toFixed(2);
  const bounceRate = ((totalBounced / totalSessions) * 100).toFixed(2);
  const abandonmentRate = totalAddedToCart ? ((totalAbandonedCart / totalAddedToCart) * 100).toFixed(2) : "0.00";
  const sum = (key: string) => funnelData.reduce((total, item) => total + (Number(item[key]) || 0), 0);
  const funnelStepsData = [{ name: "Visited Home", value: sum("visited_home"), fill: "#60a5fa" }, { name: "Visited Dept", value: sum("visited_department"), fill: "#818cf8" }, { name: "Viewed Product", value: sum("viewed_product"), fill: "#a78bfa" }, { name: "Added to Cart", value: totalAddedToCart, fill: "#c084fc" }, { name: "Purchased", value: totalConversions, fill: "#34d399" }];
  const monthlyDataMap: Record<string, { month: string; sessions: number; conversions: number }> = {};
  funnelData.forEach((item) => { const month = String(item.session_month || ""); if (!month) return; monthlyDataMap[month] ??= { month, sessions: 0, conversions: 0 }; monthlyDataMap[month].sessions += 1; monthlyDataMap[month].conversions += Number(item.is_converted) || 0; });
  const trendData = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));
  const trafficSourceData = aggregateCount(funnelData, "traffic_source");
  const browserData = aggregateCount(funnelData, "browser");
  const cityData = aggregateCount(funnelData, "city").slice(0, 5);
  const loggedInCount = sum("is_logged_in_user");
  const userTypeData = [{ name: "Logged In", value: loggedInCount }, { name: "Guest", value: totalSessions - loggedInCount }];

  return <main className="flex min-h-screen flex-col gap-7 rounded-lg border border-border bg-surface p-5 md:p-8"><AutoRefresh intervalMs={60000}/><header className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-primary">Business intelligence / growth mart</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">User Funnel</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Follow the journey from first visit to purchase, isolate drop-off, and understand conversion quality.</p></div><div className="font-mono text-[11px] uppercase tracking-widest text-muted">Behavioral signal · live</div></header>
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]"><div className="dashboard-panel min-h-[440px] border-primary/25 p-5"><div className="mb-4"><p className="eyebrow text-primary">Primary conversion signal</p><h2 className="mt-1 text-xl font-semibold text-foreground">Where momentum is lost</h2></div><FunnelChartComponent data={funnelStepsData}/></div><div className="grid gap-4"><KPICard title="Conversion Rate" value={conversionRate} colorTheme="emerald" subtitle="Of total sessions"/><KPICard title="Total Sessions" value={totalSessions.toLocaleString()} colorTheme="blue" subtitle="Observed journeys"/><KPICard title="Bounce Rate" value={bounceRate} colorTheme="rose" subtitle="Single-page sessions"/></div></section>
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]"><div className="dashboard-panel min-h-[370px] p-5"><div className="mb-4"><p className="eyebrow text-muted">Time-based behavior</p><h2 className="mt-1 text-xl font-semibold text-foreground">Sessions and conversion trend</h2></div><SessionsTrendChart data={trendData}/></div><div className="dashboard-panel p-5"><p className="eyebrow text-warning">Friction signal</p><h2 className="mt-1 text-xl font-semibold text-foreground">Cart abandonment</h2><p className="mt-8 font-mono text-5xl font-semibold text-warning">{abandonmentRate}<span className="text-2xl">%</span></p><p className="mt-3 text-sm leading-6 text-muted">Sessions that added to cart but did not complete the purchase.</p></div></section>
    <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"><DonutChart title="Traffic Source" data={trafficSourceData} colors={["#60a5fa", "#a78bfa", "#fb7185", "#fbbf24", "#34d399"]}/><DonutChart title="Browser Usage" data={browserData} colors={["#fbbf24", "#fb7185", "#60a5fa", "#34d399"]}/><DonutChart title="User Type" data={userTypeData} colors={["#34d399", "#64748b"]}/><HorizontalBarChart title="Top 5 Cities" data={cityData} fillColor="#a78bfa" valuePrefix=""/></section>
  </main>;
}
