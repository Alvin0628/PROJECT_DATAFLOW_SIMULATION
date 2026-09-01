// file: app/analytics/logistics-sla/page.tsx
import AutoRefresh from "@/components/AutoRefresh";
import { supabase } from "@/lib/supabase-client";

// 1. Menggunakan ulang KPICard dari root analytics
import KPICard from "@/components/analytics/KPICard";

// 2. Import 3 komponen baru khusus logistik
import FulfillmentTimelineChart from "@/components/analytics/logistics-sla/FulfillmentTimelineChart";
import DeliveryMapChart from "@/components/analytics/logistics-sla/DeliveryMapChart";
import TopNodesChart from "@/components/analytics/logistics-sla/TopNodesChart";

export const dynamic = "force-dynamic";

// Tipe data ketat agar ESLint senang
type DatabaseValue = string | number | boolean | null;
type DataRow = Record<string, DatabaseValue>;

// Fungsi helper untuk menghitung kemunculan (seperti COUNT... GROUP BY)
function aggregateCount(data: DataRow[], groupByKey: string) {
  const result: Record<string, number> = {};
  data.forEach((item) => {
    const key = String(item[groupByKey] || "Unknown Node");
    if (key === "Unknown Node") return;
    result[key] = (result[key] || 0) + 1;
  });
  return Object.entries(result)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default async function LogisticsSLADashboard() {
  // 1. Tarik Data Utama dari Supabase (Tabel mart_logistic_sla)
  const { data: rawData, error } = await supabase
    .from("mart_logistics_sla")
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
      <div className="flex h-96 items-center justify-center bg-slate-100 border border-dashed border-slate-300 rounded-xl">
        <p className="text-slate-500">
          Belum ada data logistik. Pastikan Airflow telah berjalan.
        </p>
      </div>
    );
  }

  const logisticsData = rawData as DataRow[];

  // 2. Kalkulasi KPI Utama (Baris Atas)
  // Karena kolom package_id unik, jumlah baris = jumlah paket
  const totalPackages = logisticsData.length;

  // Rata-rata processing time (hanya hitung yang angkanya valid > 0)
  const validProcessingTimes = logisticsData.filter(
    (d) => Number(d.processing_time_days) > 0,
  );
  const avgProcessingDays =
    validProcessingTimes.length > 0
      ? validProcessingTimes.reduce(
          (sum, d) => sum + Number(d.processing_time_days),
          0,
        ) / validProcessingTimes.length
      : 0;

  const lateProcessing = logisticsData.reduce(
    (sum, d) => sum + Number(d.is_late_processing || 0),
    0,
  );
  const totalShipped = logisticsData.reduce(
    (sum, d) => sum + Number(d.is_shipped_flag || 0),
    0,
  );

  // 3. Agregasi untuk Grafik Top Nodes
  const topNodesData = aggregateCount(logisticsData, "dc_name").slice(0, 5);

  // 4. Agregasi untuk Peta Distribusi (Group by City, Lat, Lon)
  const mapDataMap: Record<
    string,
    { city: string; lat: number; lon: number; packages: number }
  > = {};
  logisticsData.forEach((d) => {
    const city = String(d.destination_city || "");
    if (!city) return;

    if (!mapDataMap[city]) {
      mapDataMap[city] = {
        city,
        lat: Number(d.destination_latitude || 0),
        lon: Number(d.destination_longitude || 0),
        packages: 0,
      };
    }
    mapDataMap[city].packages += 1;
  });
  const mapData = Object.values(mapDataMap);

  // 5. Agregasi untuk Grafik Timeline (Group by Bulan/Tahun agar grafik mulus)
  const timelineMap: Record<
    string,
    { date: string; totalPackages: number; shippedPackages: number }
  > = {};
  logisticsData.forEach((d) => {
    const dateRaw = String(d.order_created_date || ""); // Format YYYY-MM-DD
    if (!dateRaw) return;

    // Potong jadi YYYY-MM agar jadi per bulan
    const dateMonth = dateRaw.substring(0, 7);

    if (!timelineMap[dateMonth]) {
      timelineMap[dateMonth] = {
        date: dateMonth,
        totalPackages: 0,
        shippedPackages: 0,
      };
    }
    timelineMap[dateMonth].totalPackages += 1;
    timelineMap[dateMonth].shippedPackages += Number(d.is_shipped_flag || 0);
  });
  const timelineData = Object.values(timelineMap).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="flex min-h-screen flex-col gap-6 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-7">
      <AutoRefresh intervalMs={60000} />
      {/* HEADER TITTLE */}
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">
            Logistics Summary Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global distribution centers, fulfillment SLA, and shipping metrics.
          </p>
        </div>
      </div>

      {/* ROW 1: KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Unique Packages"
          value={(totalPackages / 1000).toFixed(1) + "K"}
          colorTheme="emerald"
        />
        <KPICard
          title="Avg Processing (Days)"
          value={avgProcessingDays.toFixed(2)}
          colorTheme="blue"
        />
        <KPICard
          title="Late Processing"
          value={(lateProcessing / 1000).toFixed(2) + "K"}
          colorTheme="rose"
        />
        <KPICard
          title="Total Shipped"
          value={(totalShipped / 1000).toFixed(1) + "K"}
          colorTheme="emerald"
        />
      </div>

      {/* ROW 2: MAP & TOP NODES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DeliveryMapChart data={mapData} />
        </div>
        <div className="lg:col-span-1">
          <TopNodesChart data={topNodesData} />
        </div>
      </div>

      {/* ROW 3: FULFILLMENT TIMELINE */}
      <div className="w-full">
        <FulfillmentTimelineChart data={timelineData} />
      </div>
    </div>
  );
}
