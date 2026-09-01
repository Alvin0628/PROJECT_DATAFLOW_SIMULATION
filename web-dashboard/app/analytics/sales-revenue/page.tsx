import AutoRefresh from "@/components/AutoRefresh";
import { supabase } from "@/lib/supabase-client";
import KPICard from "@/components/analytics/KPICard";
import SalesChart from "@/components/analytics/sales-revenue/SalesChart";
import DonutChart from "@/components/analytics/DonutChart";
import HorizontalBarChart from "@/components/analytics/HorizontalBarChart";
import VerticalBarChart from "@/components/analytics/VerticalBarChart";

export const dynamic = "force-dynamic";
type DatabaseValue = string | number | boolean | null;
type DataRow = Record<string, DatabaseValue>;

function aggregateSum(data: DataRow[], groupByKey: string, sumByKey: string) {
  const result: Record<string, number> = {};
  data.forEach((item) => {
    const key = String(item[groupByKey] || "");
    if (!key) return;
    result[key] = (result[key] || 0) + (Number(item[sumByKey]) || 0);
  });
  return Object.entries(result).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
function aggregateCountUnique(data: DataRow[], groupByKey: string, distinctKey: string) {
  const result: Record<string, Set<DatabaseValue>> = {};
  data.forEach((item) => {
    const key = String(item[groupByKey] || "");
    const value = item[distinctKey];
    if (!key || value === undefined || value === null) return;
    if (!result[key]) result[key] = new Set<DatabaseValue>();
    result[key].add(value);
  });
  return Object.entries(result).map(([name, set]) => ({ name, value: set.size })).sort((a, b) => b.value - a.value);
}

export default async function SalesRevenueDashboard() {
  const { data: rawData, error } = await supabase.from("mart_sales_revenue").select("*");
  if (error) return <div className="dashboard-panel border-danger/30 p-6 text-danger">Error: {error.message}</div>;
  if (!rawData || rawData.length === 0) return <div className="dashboard-panel flex min-h-96 items-center justify-center border-dashed p-6 text-muted">No sales data available.</div>;
  const salesData = rawData as DataRow[];
  const totalRevenue = salesData.reduce((sum, item) => sum + (Number(item.realized_revenue) || 0), 0);
  const grossMargin = salesData.reduce((sum, item) => sum + (Number(item.gross_margin) || 0), 0);
  const lostRevenue = salesData.reduce((sum, item) => sum + (Number(item.lost_revenue_out_of_stock) || 0), 0);
  const totalReturned = salesData.reduce((sum, item) => sum + (Number(item.returned_revenue) || 0), 0);
  const totalOrders = new Set(salesData.map((item) => item.order_id)).size;
  const monthlyDataMap: Record<string, { month: string; revenue: number; margin: number }> = {};
  salesData.forEach((item) => {
    const month = String(item.order_month || "");
    if (!month) return;
    monthlyDataMap[month] ??= { month, revenue: 0, margin: 0 };
    monthlyDataMap[month].revenue += Number(item.realized_revenue) || 0;
    monthlyDataMap[month].margin += Number(item.gross_margin) || 0;
  });
  const chartData = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));
  const topProductsData = aggregateSum(salesData, "product_name", "realized_revenue").slice(0, 5);
  const orderStatusData = aggregateCountUnique(salesData, "order_status", "order_id");
  const trafficData = aggregateCountUnique(salesData, "user_traffic_source", "user_id");
  const topCitiesData = aggregateSum(salesData, "user_city", "realized_revenue").slice(0, 5);
  const genderData = aggregateCountUnique(salesData, "user_gender", "user_id");
  const topBrandsData = aggregateSum(salesData, "product_brand", "realized_revenue").slice(0, 5);

  return <main className="flex min-h-screen flex-col gap-7 rounded-lg border border-border bg-surface p-5 md:p-8">
    <AutoRefresh intervalMs={60000} />
    <header className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-danger">Business intelligence / commercial mart</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Sales & Revenue</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Executive view of realized revenue, margin quality, demand leakage, and customer mix.</p></div><div className="font-mono text-[11px] uppercase tracking-widest text-muted">Live financial signal · dbt mart</div></header>
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,.8fr)]"><div className="dashboard-panel flex min-h-[410px] flex-col justify-between border-danger/25 p-6"><div className="flex items-start justify-between"><div><p className="eyebrow text-danger">Primary commercial signal</p><h2 className="mt-2 text-xl font-semibold text-foreground">Revenue performance</h2></div><span className="status-dot">● Tracking</span></div><div className="mt-6 flex-1"><SalesChart data={chartData} /></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><KPICard title="Total Revenue" prefix="$" value={(totalRevenue / 1000).toFixed(2) + "K"} colorTheme="rose" subtitle="Realized sales"/><KPICard title="Gross Margin" prefix="$" value={(grossMargin / 1000).toFixed(2) + "K"} colorTheme="orange" subtitle="Contribution signal"/></div></section>
    <section className="grid gap-5 md:grid-cols-3"><KPICard title="Lost Revenue" prefix="$" value={(lostRevenue / 1000).toFixed(2) + "K"} colorTheme="orange" subtitle="Out-of-stock exposure"/><KPICard title="Total Returned" prefix="$" value={(totalReturned / 1000).toFixed(2) + "K"} colorTheme="rose" subtitle="Returned revenue"/><KPICard title="Total Orders" value={(totalOrders / 1000).toFixed(2) + "K"} colorTheme="blue" subtitle="Unique order volume"/></section>
    <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="dashboard-panel min-h-[350px] p-5"><div className="mb-4"><p className="eyebrow text-muted">Commercial mix</p><h2 className="mt-1 text-lg font-semibold text-foreground">What is driving sales?</h2></div><HorizontalBarChart title="Top 5 Products" data={topProductsData} fillColor="#fb7185" valuePrefix="$"/></div><div className="dashboard-panel min-h-[350px] p-5"><div className="mb-4"><p className="eyebrow text-muted">Customer signal</p><h2 className="mt-1 text-lg font-semibold text-foreground">Order health</h2></div><DonutChart title="Total Order Status" data={orderStatusData} colors={["#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#a78bfa"]}/></div></section>
    <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"><VerticalBarChart title="User Traffic Source" data={trafficData} fillColor="#60a5fa"/><HorizontalBarChart title="Top 5 User City" data={topCitiesData} fillColor="#34d399" valuePrefix="$"/><DonutChart title="User Gender" data={genderData} colors={["#fb7185", "#60a5fa"]}/><HorizontalBarChart title="Top 5 Product Brands" data={topBrandsData} fillColor="#fbbf24" valuePrefix="$"/></section>
  </main>;
}
