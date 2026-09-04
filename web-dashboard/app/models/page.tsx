import AutoRefresh from "@/components/AutoRefresh";
import { Suspense } from "react";
import ModelHistoryTable from "@/components/models/ModelHistoryTable";
import Link from "next/link";
import { getBaseUrl } from "@/lib/get-base-url";
import type { ApiResponse, ModelMetrics } from "@/types/Database.types";

const models = [
  {
    name: "Session Conversion",
    key: "session_conversion",
    detail: "Predictive signal quality and champion history.",
  },
  {
    name: "Customer Churn",
    key: "customer_churn",
    detail: "Quality-gated challenger evaluation history.",
  },
] as const;

async function fetchModelMetrics(modelName: string) {
  const res = await fetch(
    `${getBaseUrl()}/api/metrics?model_name=${modelName}`,
    {
      cache: "no-store",
    },
  );

  const body: ApiResponse<ModelMetrics[]> = await res.json();

  if (body.error) {
    throw new Error(body.error);
  }

  return body.data ?? [];
}

export default async function ModelsPage() {
  let modelData: Record<string, ModelMetrics[]> = {};

  try {
    const results = await Promise.all(
      models.map(async (model) => {
        const data = await fetchModelMetrics(model.key);

        return {
          key: model.key,
          data,
        };
      }),
    );

    modelData = Object.fromEntries(
      results.map((result) => [result.key, result.data]),
    );
  } catch (error) {
    console.error("Failed to load model metrics:", error);
  }

  const registeredModels = models.filter(
    (model) => (modelData[model.key]?.length ?? 0) > 0,
  );

  /*
   * Cari champion untuk SETIAP model secara independen.
   * Ini penting karena customer_churn dan session_conversion
   * dapat memiliki champion masing-masing.
   */
  const championByModel = Object.fromEntries(
    models.map((model) => {
      const history = modelData[model.key] ?? [];

      const champion = history.find((metric) => metric.is_champion);

      return [model.key, champion];
    }),
  ) as Record<string, ModelMetrics | undefined>;

  const allMetrics = Object.values(modelData).flat();

  /*
   * Review queue:
   * challenger yang quality gate-nya gagal.
   */
  const reviewQueue = allMetrics.filter(
    (metric) => !metric.is_champion && metric.quality_gate_passed === false,
  ).length;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <AutoRefresh intervalMs={60000} />

      <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="dashboard-eyebrow">Registry / lifecycle control</p>

          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
            Model operations
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            A working view of production candidates, champion lineage, and the
            training runs behind every decision.
          </p>
        </div>

        <div className="flex gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          <span className="rounded-full border border-success/30 bg-success-soft px-3 py-2 text-success">
            {registeredModels.length} registered
          </span>

          <span className="rounded-full border border-border bg-surface-muted px-3 py-2">
            Quality gate active
          </span>
        </div>
      </header>

      {/* =========================================================
          CURRENT CHAMPIONS
         ========================================================= */}
      <section>
        <div className="mb-4">
          <p className="dashboard-eyebrow">Production status</p>

          <h2 className="mt-1 text-xl font-semibold">Current champions</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {models.map((model) => {
            const champion = championByModel[model.key];

            const championHealthy = champion?.quality_gate_passed === true;

            return (
              <article
                key={model.key}
                className="dashboard-panel bg-gradient-to-br from-primary/15 to-surface p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="dashboard-eyebrow">Champion</p>

                    <h3 className="mt-3 text-xl font-semibold">{model.name}</h3>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 font-mono text-[10px] font-bold ${
                      champion
                        ? championHealthy
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger"
                        : "bg-surface-muted text-muted"
                    }`}
                  >
                    {!champion
                      ? "NO CHAMPION"
                      : championHealthy
                        ? "HEALTHY"
                        : "CHECK"}
                  </span>
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Current batch
                    </p>

                    <strong className="mt-1 block text-3xl font-semibold">
                      {champion ? `B#${champion.batch_number}` : "—"}
                    </strong>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Trained
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {champion
                        ? new Date(champion.trained_at).toLocaleString("id-ID")
                        : "—"}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          REGISTRY SUMMARY
         ========================================================= */}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="dashboard-panel p-5">
          <p className="dashboard-eyebrow">Registry coverage</p>

          <p className="mt-3 text-3xl font-semibold">
            {registeredModels.length}
          </p>

          <p className="mt-1 text-sm text-muted">Models with tracked history</p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${
                  models.length > 0
                    ? (registeredModels.length / models.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </article>

        <article className="dashboard-panel p-5">
          <p className="dashboard-eyebrow">Review queue</p>

          <p className="mt-3 text-3xl font-semibold">{reviewQueue}</p>

          <p className="mt-1 text-sm text-muted">
            Challengers failing quality gate
          </p>

          <Link
            href="/predictions"
            className="mt-5 inline-flex text-sm font-semibold text-primary"
          >
            Inspect live output →
          </Link>
        </article>
      </section>

      {/* =========================================================
          MODEL REGISTRY
         ========================================================= */}
      <section className="dashboard-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 md:px-6">
          <div>
            <p className="dashboard-eyebrow">Model registry</p>

            <h2 className="mt-1 text-lg font-semibold">
              Lifecycle and training history
            </h2>
          </div>

          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Latest first
          </span>
        </div>

        <div className="flex flex-col gap-8 p-5 md:p-6">
          {models.map((model, index) => {
            const history = modelData[model.key] ?? [];

            const latestRun = history[0];

            const isChampion = history.some((metric) => metric.is_champion);

            return (
              <section
                key={model.key}
                className="grid gap-6 xl:grid-cols-[0.8fr_2fr]"
              >
                <div className="flex flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-primary">
                        0{index + 1}
                      </span>

                      <h3 className="text-xl font-semibold">{model.name}</h3>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      {model.detail}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border bg-surface-muted p-3">
                      <p className="dashboard-eyebrow">State</p>

                      <p className="mt-2 font-semibold">
                        {isChampion ? "Champion" : "Challenger"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-muted p-3">
                      <p className="dashboard-eyebrow">Latest</p>

                      <p className="mt-2 font-semibold font-mono">
                        {latestRun ? `B#${latestRun.batch_number}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <Suspense
                  fallback={
                    <div className="rounded-lg border border-dashed border-border p-8 text-center font-mono text-xs text-muted">
                      LOADING TRAINING HISTORY...
                    </div>
                  }
                >
                  <ModelHistoryTable modelName={model.key} />
                </Suspense>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
