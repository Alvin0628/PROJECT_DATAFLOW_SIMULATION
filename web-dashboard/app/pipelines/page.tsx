import AutoRefresh from "@/components/AutoRefresh";
import { getBaseUrl } from "@/lib/get-base-url";

interface AirflowDag {
  dag_id: string;
  is_active: boolean;
  is_paused: boolean;
  description: string | null;
  owners: string[];
  next_dagrun: string | null;
}

interface AirflowResponse {
  data?: AirflowDag[];
  error?: string;
}

export default async function PipelinesPage() {
  let dags: AirflowDag[] = [];
  let airflowError: string | null = null;

  try {
    const res = await fetch(`${getBaseUrl()}/api/airflow/dags`, {
      cache: "no-store",
    });

    const body: AirflowResponse = await res.json();

    if (!res.ok || body.error) {
      airflowError = body.error ?? "Airflow service is currently unavailable.";
    } else {
      dags = body.data ?? [];
    }
  } catch {
    airflowError =
      "The Airflow service could not be reached. Live orchestration status is currently unavailable.";
  }

  const airflowAvailable = airflowError === null;

  const active = dags.filter((dag) => !dag.is_paused).length;
  const paused = dags.length - active;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <AutoRefresh intervalMs={60000} />

      {/* Header */}
      <header className="border-b border-border pb-7">
        <p className="dashboard-eyebrow">Runtime / orchestration</p>

        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
          Pipeline control room
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Observe workflow health, execution posture, and scheduling context
          across the Airflow runtime.
        </p>
      </header>

      {/* Airflow availability notice */}
      {!airflowAvailable && (
        <section className="dashboard-panel border-warning/30 bg-warning-soft p-5">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-warning/40 bg-warning/10 font-mono text-xs font-bold text-warning">
              !
            </div>

            <div>
              <p className="dashboard-eyebrow text-warning">
                Airflow service unavailable
              </p>

              <h2 className="mt-1 text-base font-semibold">
                Live orchestration data is currently unavailable
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                {airflowError}
              </p>

              <p className="mt-3 text-xs text-muted">
                Pipeline results synced through Supabase remain available
                elsewhere in the dashboard.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Runtime overview */}
      <section className="grid gap-4 md:grid-cols-4">
        <div
          className={`dashboard-panel p-5 ${
            airflowAvailable ? "bg-primary/10" : "bg-surface-muted/50"
          }`}
        >
          <p className="dashboard-eyebrow">Workflow health</p>

          <p
            className={`mt-3 text-3xl font-semibold ${
              airflowAvailable ? "text-success" : "text-warning"
            }`}
          >
            {airflowAvailable ? "Operational" : "Unavailable"}
          </p>

          <p className="mt-1 text-sm text-muted">
            {airflowAvailable
              ? "Airflow runtime connected"
              : "Airflow runtime unreachable"}
          </p>
        </div>

        <div className="dashboard-panel p-5">
          <p className="dashboard-eyebrow">Active DAGs</p>

          <p className="mt-3 text-3xl font-semibold">
            {airflowAvailable ? active : "—"}
          </p>

          <p className="text-sm text-muted">
            {airflowAvailable
              ? `of ${dags.length} registered`
              : "Live status unavailable"}
          </p>
        </div>

        <div className="dashboard-panel p-5">
          <p className="dashboard-eyebrow">Paused</p>

          <p className="mt-3 text-3xl font-semibold">
            {airflowAvailable ? paused : "—"}
          </p>

          <p className="text-sm text-muted">
            {airflowAvailable
              ? "manual intervention"
              : "Live status unavailable"}
          </p>
        </div>

        <div className="dashboard-panel p-5">
          <p className="dashboard-eyebrow">Scheduler</p>

          <p
            className={`mt-3 text-3xl font-semibold ${
              airflowAvailable ? "text-success" : "text-warning"
            }`}
          >
            {airflowAvailable ? "LIVE" : "OFFLINE"}
          </p>

          <p className="text-sm text-muted">Airflow REST API</p>
        </div>
      </section>

      {/* Runtime lanes + scheduler context */}
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Execution topology */}
        <div className="dashboard-panel p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="dashboard-eyebrow">Execution topology</p>

              <h2 className="mt-1 text-xl font-semibold">DAG runtime lanes</h2>
            </div>

            <span
              className={`rounded-full px-3 py-1 font-mono text-[10px] ${
                airflowAvailable
                  ? "bg-success-soft text-success"
                  : "bg-surface-muted text-muted"
              }`}
            >
              {airflowAvailable ? `${active} ACTIVE` : "OFFLINE"}
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {["Ingest", "Transform", "Train", "Infer", "Serve"].map(
              (step, index) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 font-mono text-xs text-primary">
                    0{index + 1}
                  </div>

                  <div className="h-px flex-1 bg-border" />

                  <div className="w-28 font-mono text-xs text-muted">
                    {step}
                  </div>

                  <span
                    className={`size-2 rounded-full ${
                      airflowAvailable ? "bg-success" : "bg-muted"
                    }`}
                  />
                </div>
              ),
            )}
          </div>

          {!airflowAvailable && (
            <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted">
              Runtime lanes represent the pipeline architecture. Live execution
              state requires a reachable Airflow instance.
            </p>
          )}
        </div>

        {/* Scheduler context */}
        <div className="dashboard-panel p-5 md:p-6">
          <p className="dashboard-eyebrow">Scheduler context</p>

          <h2 className="mt-1 text-xl font-semibold">Next runs</h2>

          {airflowAvailable ? (
            <div className="mt-6 flex flex-col gap-4">
              {dags.slice(0, 4).map((dag) => (
                <div
                  key={dag.dag_id}
                  className="border-b border-border pb-4 last:border-0"
                >
                  <p className="truncate font-mono text-xs font-semibold">
                    {dag.dag_id}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {dag.next_dagrun
                      ? new Date(dag.next_dagrun).toLocaleString("id-ID")
                      : "Not scheduled"}
                  </p>
                </div>
              ))}

              {dags.length === 0 && (
                <p className="py-6 text-sm text-muted">
                  No scheduled DAGs found.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-border bg-surface-muted/40 p-4">
              <p className="text-sm font-medium">Scheduler data unavailable</p>

              <p className="mt-1 text-xs leading-5 text-muted">
                Next scheduled runs will appear here when the Airflow runtime
                becomes reachable.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Airflow registry */}
      <section className="dashboard-panel overflow-hidden">
        <div className="border-b border-border px-5 py-4 md:px-6">
          <p className="dashboard-eyebrow">Airflow registry</p>

          <h2 className="mt-1 text-xl font-semibold">Runtime state</h2>
        </div>

        {airflowAvailable ? (
          <div className="overflow-x-auto">
            <table className="dashboard-table w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3">DAG ID</th>
                  <th className="px-5 py-3">State</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Next run</th>
                </tr>
              </thead>

              <tbody>
                {dags.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-muted"
                    >
                      No DAGs found.
                    </td>
                  </tr>
                ) : (
                  dags.map((dag) => (
                    <tr key={dag.dag_id}>
                      <td className="px-5 py-4 font-mono text-xs font-semibold">
                        {dag.dag_id}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            dag.is_paused
                              ? "rounded-full bg-surface-muted px-2 py-1 font-mono text-[10px] text-muted"
                              : "rounded-full bg-success-soft px-2 py-1 font-mono text-[10px] text-success"
                          }
                        >
                          {dag.is_paused ? "PAUSED" : "ACTIVE"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-muted">
                        {dag.owners.join(", ")}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-muted">
                        {dag.next_dagrun
                          ? new Date(dag.next_dagrun).toLocaleString("id-ID")
                          : "Not scheduled"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 md:px-6">
            <div className="mx-auto max-w-xl text-center">
              <p className="dashboard-eyebrow text-warning">
                Runtime state unavailable
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Airflow is not currently reachable
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted">
                The DAG registry requires a live connection to the Airflow REST
                API. Start the local orchestration environment to restore live
                pipeline monitoring.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
