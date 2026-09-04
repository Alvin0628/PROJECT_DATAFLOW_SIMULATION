import AutoRefresh from "@/components/AutoRefresh";
import { supabase } from "@/lib/supabase-client";
import KPICard from "@/components/analytics/KPICard";
import DonutChart from "@/components/analytics/DonutChart";
import HorizontalBarChart from "@/components/analytics/HorizontalBarChart";
import FunnelChartComponent from "@/components/analytics/user-funnel/FunnelChartComponent";
import SessionsTrendChart from "@/components/analytics/user-funnel/SessionsTrendChart";

export const dynamic = "force-dynamic";

type FunnelTotals = {
  total_sessions: number;
  total_conversions: number;
  total_bounced: number;
  total_added_to_cart: number;
  total_abandoned_cart: number;
  visited_home: number;
  visited_department: number;
  viewed_product: number;
  logged_in_count: number;
};

type TrendRow = {
  month: string;
  sessions: number;
  conversions: number;
};

type ChartRow = {
  name: string;
  value: number;
};

type UserFunnelDashboardData = {
  totals: FunnelTotals;
  monthly_trend: TrendRow[];
  traffic_source: ChartRow[];
  browser: ChartRow[];
  top_cities: ChartRow[];
};

export default async function UserFunnelDashboard() {
  const { data, error } = await supabase.rpc(
    "get_user_funnel_dashboard_data"
  );

  if (error) {
    return (
      <div className="dashboard-panel border-danger/30 p-6 text-danger">
        Error fetching funnel data: {error.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-panel flex min-h-96 items-center justify-center border-dashed p-6 text-muted">
        No funnel data available.
      </div>
    );
  }

  const dashboardData = data as UserFunnelDashboardData;

  const totals = dashboardData.totals;

  const totalSessions = Number(totals.total_sessions ?? 0);
  const totalConversions = Number(totals.total_conversions ?? 0);
  const totalBounced = Number(totals.total_bounced ?? 0);
  const totalAddedToCart = Number(totals.total_added_to_cart ?? 0);
  const totalAbandonedCart = Number(
    totals.total_abandoned_cart ?? 0
  );

  const conversionRate =
    totalSessions > 0
      ? ((totalConversions / totalSessions) * 100).toFixed(2)
      : "0.00";

  const bounceRate =
    totalSessions > 0
      ? ((totalBounced / totalSessions) * 100).toFixed(2)
      : "0.00";

  const abandonmentRate =
    totalAddedToCart > 0
      ? ((totalAbandonedCart / totalAddedToCart) * 100).toFixed(2)
      : "0.00";

  const funnelStepsData = [
    {
      name: "Visited Home",
      value: Number(totals.visited_home ?? 0),
      fill: "#60a5fa",
    },
    {
      name: "Visited Dept",
      value: Number(totals.visited_department ?? 0),
      fill: "#818cf8",
    },
    {
      name: "Viewed Product",
      value: Number(totals.viewed_product ?? 0),
      fill: "#a78bfa",
    },
    {
      name: "Added to Cart",
      value: totalAddedToCart,
      fill: "#c084fc",
    },
    {
      name: "Purchased",
      value: totalConversions,
      fill: "#34d399",
    },
  ];

  const trendData = (dashboardData.monthly_trend ?? []).map(
    (item) => ({
      month: String(item.month),
      sessions: Number(item.sessions ?? 0),
      conversions: Number(item.conversions ?? 0),
    })
  );

  const trafficSourceData = (
    dashboardData.traffic_source ?? []
  ).map((item) => ({
    name: String(item.name),
    value: Number(item.value ?? 0),
  }));

  const browserData = (dashboardData.browser ?? []).map(
    (item) => ({
      name: String(item.name),
      value: Number(item.value ?? 0),
    })
  );

  const cityData = (dashboardData.top_cities ?? []).map(
    (item) => ({
      name: String(item.name),
      value: Number(item.value ?? 0),
    })
  );

  const loggedInCount = Number(totals.logged_in_count ?? 0);

  const userTypeData = [
    {
      name: "Logged In",
      value: loggedInCount,
    },
    {
      name: "Guest",
      value: Math.max(totalSessions - loggedInCount, 0),
    },
  ];

  return (
    <main className="flex min-h-screen flex-col gap-7 rounded-lg border border-border bg-surface p-5 md:p-8">
      <AutoRefresh intervalMs={60000} />

      <header className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            User Funnel
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Track the customer journey from first visit to purchase
          </p>
        </div>

        <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Behavioral signal · live
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
        <div className="dashboard-panel min-h-[440px] border-primary/25 p-5">
          <div className="mb-4">
            <p className="eyebrow text-primary">
              Customer Journey
            </p>

            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Customer Drop-off by Stage
            </h2>
          </div>

          <FunnelChartComponent data={funnelStepsData} />
        </div>

        <div className="grid gap-4">
          <KPICard
            title="Conversion Rate"
            value={conversionRate}
            colorTheme="emerald"
            subtitle="Of total sessions"
          />

          <KPICard
            title="Total Sessions"
            value={totalSessions.toLocaleString()}
            colorTheme="blue"
            subtitle="Observed journeys"
          />

          <KPICard
            title="Bounce Rate"
            value={bounceRate}
            colorTheme="rose"
            subtitle="Single-page sessions"
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]">
        <div className="dashboard-panel min-h-[370px] p-5">
          <div className="mb-4">
            <p className="eyebrow text-muted">
              Time-based behavior
            </p>

            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Sessions and conversion trend
            </h2>
          </div>

          <SessionsTrendChart data={trendData} />
        </div>

        <div className="dashboard-panel p-5">
          <p className="eyebrow text-warning">
            Friction signal
          </p>

          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Cart abandonment
          </h2>

          <p className="mt-8 font-mono text-5xl font-semibold text-warning">
            {abandonmentRate}
            <span className="text-2xl">%</span>
          </p>

          <p className="mt-3 text-sm leading-6 text-muted">
            Sessions that added to cart but did not complete the
            purchase.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <DonutChart
          title="Traffic Source"
          data={trafficSourceData}
          colors={[
            "#60a5fa",
            "#a78bfa",
            "#fb7185",
            "#fbbf24",
            "#34d399",
          ]}
        />

        <DonutChart
          title="Browser Usage"
          data={browserData}
          colors={[
            "#fbbf24",
            "#fb7185",
            "#60a5fa",
            "#34d399",
          ]}
        />

        <DonutChart
          title="User Type"
          data={userTypeData}
          colors={["#34d399", "#64748b"]}
        />

        <HorizontalBarChart
          title="Top 5 Cities"
          data={cityData}
          fillColor="#a78bfa"
          valuePrefix=""
        />
      </section>
    </main>
  );
}