// file: app/analytics/user-funnel/page.tsx
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

// Fungsi Helper: Agregasi Sum (sama seperti sales)
function aggregateSum(data: DataRow[], groupByKey: string, sumByKey: string) {
  const result: Record<string, number> = {};
  data.forEach((item) => {
    const key = String(item[groupByKey] || "");
    if (!key || key === "null") return;
    result[key] = (result[key] || 0) + (Number(item[sumByKey]) || 0);
  });
  return Object.entries(result)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Fungsi Helper: Menghitung total data unik / Count
function aggregateCount(data: DataRow[], groupByKey: string) {
  const result: Record<string, number> = {};
  data.forEach((item) => {
    const key = String(item[groupByKey] || "");
    if (!key || key === "null") return;
    result[key] = (result[key] || 0) + 1;
  });
  return Object.entries(result)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default async function UserFunnelDashboard() {
  // Asumsi tabel hasil pipeline dbt Anda dinamakan mart_user_funnel
  const { data: rawData, error } = await supabase
    .from("mart_user_funnel")
    .select("*");

  if (error) {
    return (
      <div className="p-4 bg-red-50/10 text-red-500 border border-red-500/20 rounded-lg">
        Error fetching funnel data: {error.message}
      </div>
    );
  }

  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center bg-slate-900 border border-dashed border-slate-700 rounded-xl">
        <p className="text-slate-400">
          Belum ada data user funnel. Pastikan dbt & Airflow sudah running.
        </p>
      </div>
    );
  }

  const funnelData = rawData as DataRow[];

  // --- 1. Kalkulasi KPI Utama ---
  const totalSessions = funnelData.length;
  const totalConversions = funnelData.reduce(
    (sum, item) => sum + (Number(item.is_converted) || 0),
    0,
  );
  const totalBounced = funnelData.reduce(
    (sum, item) => sum + (Number(item.is_bounced) || 0),
    0,
  );
  const totalAddedToCart = funnelData.reduce(
    (sum, item) => sum + (Number(item.added_to_cart) || 0),
    0,
  );
  const totalAbandonedCart = funnelData.reduce(
    (sum, item) => sum + (Number(item.is_abandoned_cart) || 0),
    0,
  );

  const overallConversionRate = (
    (totalConversions / totalSessions) *
    100
  ).toFixed(2);
  const bounceRate = ((totalBounced / totalSessions) * 100).toFixed(2);
  const cartAbandonmentRate =
    totalAddedToCart > 0
      ? ((totalAbandonedCart / totalAddedToCart) * 100).toFixed(2)
      : "0.00";

  // --- 2. Data Untuk Funnel Chart ---
  const stepHome = funnelData.reduce(
    (sum, item) => sum + (Number(item.visited_home) || 0),
    0,
  );
  const stepDept = funnelData.reduce(
    (sum, item) => sum + (Number(item.visited_department) || 0),
    0,
  );
  const stepProduct = funnelData.reduce(
    (sum, item) => sum + (Number(item.viewed_product) || 0),
    0,
  );
  const stepCart = totalAddedToCart;
  const stepPurchase = totalConversions;

  const funnelStepsData = [
    { name: "Visited Home", value: stepHome, fill: "#3b82f6" }, // Blue 500
    { name: "Visited Dept", value: stepDept, fill: "#6366f1" }, // Indigo 500
    { name: "Viewed Product", value: stepProduct, fill: "#8b5cf6" }, // Violet 500
    { name: "Added to Cart", value: stepCart, fill: "#d946ef" }, // Fuchsia 500
    { name: "Purchased", value: stepPurchase, fill: "#ec4899" }, // Pink 500
  ];

  // --- 3. Data Untuk Trend Chart (Bulan/Tanggal) ---
  const monthlyDataMap: Record<
    string,
    { month: string; sessions: number; conversions: number }
  > = {};
  funnelData.forEach((item) => {
    const month = String(item.session_month || "");
    if (!month) return;
    if (!monthlyDataMap[month])
      monthlyDataMap[month] = { month, sessions: 0, conversions: 0 };
    monthlyDataMap[month].sessions += 1;
    monthlyDataMap[month].conversions += Number(item.is_converted) || 0;
  });
  const trendData = Object.values(monthlyDataMap).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  // --- 4. Agregasi Dimensi (Donut & Bar) ---
  const trafficSourceData = aggregateCount(funnelData, "traffic_source");
  const browserData = aggregateCount(funnelData, "browser");
  const cityData = aggregateCount(funnelData, "city").slice(0, 5);

  // Logged-in vs Guest
  const loggedInCount = funnelData.reduce(
    (sum, item) => sum + (Number(item.is_logged_in_user) || 0),
    0,
  );
  const userTypeData = [
    { name: "Logged In", value: loggedInCount },
    { name: "Guest", value: totalSessions - loggedInCount },
  ];

  return (
    <div className="flex min-h-screen flex-col gap-6 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-7">
      <AutoRefresh intervalMs={60000} />
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            User Journey & Funnel Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyzing session drop-offs and conversion behavior.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Sessions"
          value={totalSessions.toLocaleString()}
          colorTheme="blue"
        />
        <KPICard
          title="Conversion Rate"
          value={overallConversionRate}
          prefix=""
          subtitle="% dari Total Sessions"
          colorTheme="emerald"
        />
        <KPICard
          title="Cart Abandonment"
          value={cartAbandonmentRate}
          prefix=""
          subtitle="% dari Add to Cart"
          colorTheme="orange"
        />
        <KPICard
          title="Bounce Rate"
          value={bounceRate}
          prefix=""
          subtitle="% Single Page View"
          colorTheme="rose"
        />
      </div>

      {/* Main Charts: Funnel & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <FunnelChartComponent data={funnelStepsData} />
        </div>
        <div className="lg:col-span-3">
          <SessionsTrendChart data={trendData} />
        </div>
      </div>

      {/* Breakdown Dimensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DonutChart
          title="Traffic Source"
          data={trafficSourceData}
          colors={["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"]}
        />
        <DonutChart
          title="Browser Usage"
          data={browserData}
          colors={["#f59e0b", "#ec4899", "#3b82f6", "#10b981"]}
        />
        <DonutChart
          title="User Type"
          data={userTypeData}
          colors={["#10b981", "#64748b"]}
        />
        <HorizontalBarChart
          title="Top 5 Cities (Sessions)"
          data={cityData}
          fillColor="#8b5cf6"
          valuePrefix=""
        />
      </div>
    </div>
  );
}
