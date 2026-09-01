// file: app/analytics/sales-revenue/page.tsx
import AutoRefresh from "@/components/AutoRefresh";
import { supabase } from "@/lib/supabase-client";

import KPICard from "@/components/analytics/KPICard";
import SalesChart from "@/components/analytics/sales-revenue/SalesChart";
import DonutChart from "@/components/analytics/DonutChart";
import HorizontalBarChart from "@/components/analytics/HorizontalBarChart";
import VerticalBarChart from "@/components/analytics/VerticalBarChart";

export const dynamic = "force-dynamic";

// PERBAIKAN: Kita definisikan tipe data persis seperti kembalian Database, bukan 'any'
type DatabaseValue = string | number | boolean | null;
type DataRow = Record<string, DatabaseValue>;

// Fungsi Helper untuk melakukan agregasi SUM
function aggregateSum(data: DataRow[], groupByKey: string, sumByKey: string) {
  const result: Record<string, number> = {};
  data.forEach((item) => {
    // Paksa konversi key menjadi string agar bisa dijadikan index object
    const key = String(item[groupByKey] || "");
    if (!key) return;

    result[key] = (result[key] || 0) + (Number(item[sumByKey]) || 0);
  });
  return Object.entries(result)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Fungsi Helper untuk menghitung jumlah unik
function aggregateCountUnique(
  data: DataRow[],
  groupByKey: string,
  distinctKey: string,
) {
  // PERBAIKAN: Gunakan Set<DatabaseValue> alih-alih Set<any>
  const result: Record<string, Set<DatabaseValue>> = {};

  data.forEach((item) => {
    const key = String(item[groupByKey] || "");
    const distinctVal = item[distinctKey];

    if (!key || distinctVal === undefined || distinctVal === null) return;

    if (!result[key]) result[key] = new Set<DatabaseValue>();
    result[key].add(distinctVal);
  });

  return Object.entries(result)
    .map(([name, set]) => ({ name, value: set.size }))
    .sort((a, b) => b.value - a.value);
}

export default async function SalesRevenueDashboard() {
  const { data: rawData, error } = await supabase
    .from("mart_sales_revenue")
    .select("*");

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded-lg">
        Error: {error.message}
      </div>
    );
  }

  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center bg-slate-900 border border-dashed border-slate-700 rounded-xl">
        <p className="text-slate-400">
          Belum ada data sales. Pastikan Airflow sudah mensinkronisasi data ke
          Supabase.
        </p>
      </div>
    );
  }

  // Casting data dari Supabase ke tipe DataRow[] buatan kita
  const salesData = rawData as DataRow[];

  // 2. Kalkulasi KPI Utama
  const totalRevenue = salesData.reduce(
    (sum, item) => sum + (Number(item.realized_revenue) || 0),
    0,
  );
  const grossMargin = salesData.reduce(
    (sum, item) => sum + (Number(item.gross_margin) || 0),
    0,
  );
  const lostRevenue = salesData.reduce(
    (sum, item) => sum + (Number(item.lost_revenue_out_of_stock) || 0),
    0,
  );
  const totalReturned = salesData.reduce(
    (sum, item) => sum + (Number(item.returned_revenue) || 0),
    0,
  );
  const totalOrders = new Set(salesData.map((item) => item.order_id)).size;

  // 3. Agregasi untuk Grafik Utama
  const monthlyDataMap: Record<
    string,
    { month: string; revenue: number; margin: number }
  > = {};
  salesData.forEach((item) => {
    const month = String(item.order_month || "");
    if (!month) return;
    if (!monthlyDataMap[month])
      monthlyDataMap[month] = { month, revenue: 0, margin: 0 };
    monthlyDataMap[month].revenue += Number(item.realized_revenue) || 0;
    monthlyDataMap[month].margin += Number(item.gross_margin) || 0;
  });
  const chartData = Object.values(monthlyDataMap).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  // 4. Agregasi untuk Grafik Kecil
  const topProductsData = aggregateSum(
    salesData,
    "product_name",
    "realized_revenue",
  ).slice(0, 5);
  const orderStatusData = aggregateCountUnique(
    salesData,
    "order_status",
    "order_id",
  );
  const trafficData = aggregateCountUnique(
    salesData,
    "user_traffic_source",
    "user_id",
  );
  const topCitiesData = aggregateSum(
    salesData,
    "user_city",
    "realized_revenue",
  ).slice(0, 5);
  const genderData = aggregateCountUnique(salesData, "user_gender", "user_id");
  const topBrandsData = aggregateSum(
    salesData,
    "product_brand",
    "realized_revenue",
  ).slice(0, 5);

  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-6 rounded-xl border border-slate-800 shadow-xl">
      <AutoRefresh intervalMs={60000} />
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          E-Commerce Sales Summary
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time financial overview and product performance powered by dbt.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Revenue"
          prefix="$"
          value={(totalRevenue / 1000).toFixed(2) + "K"}
          colorTheme="rose"
        />
        <KPICard
          title="Gross Margin"
          prefix="$"
          value={(grossMargin / 1000).toFixed(2) + "K"}
          colorTheme="orange"
        />
        <KPICard
          title="Lost Revenue"
          prefix="$"
          value={(lostRevenue / 1000).toFixed(2) + "K"}
          colorTheme="orange"
        />
        <KPICard
          title="Total Returned"
          prefix="$"
          value={(totalReturned / 1000).toFixed(2) + "K"}
          colorTheme="rose"
        />
        <KPICard
          title="Total Orders"
          value={(totalOrders / 1000).toFixed(2) + "K"}
          colorTheme="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart data={chartData} />
        </div>
        <div className="lg:col-span-1">
          <HorizontalBarChart
            title="Top 5 Products"
            data={topProductsData}
            fillColor="#fbbf24"
            valuePrefix="$"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <DonutChart
          title="Total Order Status"
          data={orderStatusData}
          colors={["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"]}
        />
        <VerticalBarChart
          title="User Traffic Source"
          data={trafficData}
          fillColor="#e11d48"
        />
        <HorizontalBarChart
          title="Top 5 User City"
          data={topCitiesData}
          fillColor="#3b82f6"
          valuePrefix="$"
        />
        <DonutChart
          title="User Gender"
          data={genderData}
          colors={["#ec4899", "#3b82f6"]}
        />
        <HorizontalBarChart
          title="Top 5 Products Brand"
          data={topBrandsData}
          fillColor="#ec4899"
          valuePrefix="$"
        />
      </div>
    </div>
  );
}
