import AutoRefresh from "@/components/AutoRefresh";
import { supabase } from "@/lib/supabase-client";
import KPICard from "@/components/analytics/KPICard";
import SalesChart from "@/components/analytics/sales-revenue/SalesChart";
import DonutChart from "@/components/analytics/DonutChart";
import HorizontalBarChart from "@/components/analytics/HorizontalBarChart";
import VerticalBarChart from "@/components/analytics/VerticalBarChart";

export const dynamic = "force-dynamic";

type SalesTotals = {
  total_revenue: number;
  gross_margin: number;
  lost_revenue: number;
  total_returned: number;
  total_orders: number;
};

type MonthlyTrendRow = {
  month: string;
  revenue: number;
  margin: number;
};

type ChartRow = {
  name: string;
  value: number;
};

type SalesRevenueDashboardData = {
  totals: SalesTotals;
  monthly_trend: MonthlyTrendRow[];
  top_products: ChartRow[];
  order_status: ChartRow[];
  traffic_source: ChartRow[];
  top_cities: ChartRow[];
  gender: ChartRow[];
  top_brands: ChartRow[];
};

export default async function SalesRevenueDashboard() {
  const { data, error } = await supabase.rpc(
    "get_sales_revenue_dashboard_data",
  );

  if (error) {
    return (
      <div className="dashboard-panel border-danger/30 p-6 text-danger">
        Error: {error.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-panel flex min-h-96 items-center justify-center border-dashed p-6 text-muted">
        No sales data available.
      </div>
    );
  }

  const dashboardData = data as SalesRevenueDashboardData;

  const totals = dashboardData.totals;

  const totalRevenue = Number(totals.total_revenue ?? 0);
  const grossMargin = Number(totals.gross_margin ?? 0);
  const lostRevenue = Number(totals.lost_revenue ?? 0);
  const totalReturned = Number(totals.total_returned ?? 0);
  const totalOrders = Number(totals.total_orders ?? 0);

  const chartData = (dashboardData.monthly_trend ?? []).map((item) => ({
    month: String(item.month),
    revenue: Number(item.revenue ?? 0),
    margin: Number(item.margin ?? 0),
  }));

  const topProductsData = (dashboardData.top_products ?? []).map((item) => ({
    name: String(item.name),
    value: Number(item.value ?? 0),
  }));

  const orderStatusData = (dashboardData.order_status ?? []).map((item) => ({
    name: String(item.name),
    value: Number(item.value ?? 0),
  }));

  const trafficData = (dashboardData.traffic_source ?? []).map((item) => ({
    name: String(item.name),
    value: Number(item.value ?? 0),
  }));

  const topCitiesData = (dashboardData.top_cities ?? []).map((item) => ({
    name: String(item.name),
    value: Number(item.value ?? 0),
  }));

  const genderData = (dashboardData.gender ?? []).map((item) => ({
    name: String(item.name),
    value: Number(item.value ?? 0),
  }));

  const topBrandsData = (dashboardData.top_brands ?? []).map((item) => ({
    name: String(item.name),
    value: Number(item.value ?? 0),
  }));

  return (
    <main className="flex min-h-screen flex-col gap-7 rounded-lg border border-border bg-surface p-5 md:p-8">
      <AutoRefresh intervalMs={60000} />

      <header className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Sales & Revenue
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Track revenue, margins, demand loss, and customer mix at a glance.
          </p>
        </div>

        <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Live financial signal · dbt mart
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,.8fr)]">
        <div className="dashboard-panel flex min-h-[410px] flex-col justify-between border-danger/25 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow text-danger">Primary commercial signal</p>

              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Revenue performance
              </h2>
            </div>

            <span className="status-dot">● Tracking</span>
          </div>

          <div className="mt-6 flex-1">
            <SalesChart data={chartData} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <KPICard
            title="Total Revenue"
            prefix="$"
            value={(totalRevenue / 1000).toFixed(2) + "K"}
            colorTheme="rose"
            subtitle="Realized sales"
          />

          <KPICard
            title="Gross Margin"
            prefix="$"
            value={(grossMargin / 1000).toFixed(2) + "K"}
            colorTheme="orange"
            subtitle="Contribution signal"
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <KPICard
          title="Lost Revenue"
          prefix="$"
          value={(lostRevenue / 1000).toFixed(2) + "K"}
          colorTheme="orange"
          subtitle="Out-of-stock exposure"
        />

        <KPICard
          title="Total Returned"
          prefix="$"
          value={(totalReturned / 1000).toFixed(2) + "K"}
          colorTheme="rose"
          subtitle="Returned revenue"
        />

        <KPICard
          title="Total Orders"
          value={(totalOrders / 1000).toFixed(2) + "K"}
          colorTheme="blue"
          subtitle="Unique order volume"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="dashboard-panel min-h-[350px] p-5">
          <div className="mb-4">
            <p className="eyebrow text-muted">Sales Breakdown</p>

            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Revenue by Products
            </h2>
          </div>

          <HorizontalBarChart
            title="Top 5 Products"
            data={topProductsData}
            fillColor="#fb7185"
            valuePrefix="$"
          />
        </div>

        <div className="dashboard-panel min-h-[350px] p-5">
          <div className="mb-4">
            <p className="eyebrow text-muted">Customer Peformance</p>

            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Order Trends
            </h2>
          </div>

          <DonutChart
            title="Total Order Status"
            data={orderStatusData}
            colors={["#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#a78bfa"]}
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <VerticalBarChart
          title="User Traffic Source"
          data={trafficData}
          fillColor="#60a5fa"
        />

        <HorizontalBarChart
          title="Top 5 User City"
          data={topCitiesData}
          fillColor="#34d399"
          valuePrefix="$"
        />

        <DonutChart
          title="User Gender"
          data={genderData}
          colors={["#fb7185", "#60a5fa"]}
        />

        <HorizontalBarChart
          title="Top 5 Product Brands"
          data={topBrandsData}
          fillColor="#fbbf24"
          valuePrefix="$"
        />
      </section>
    </main>
  );
}
