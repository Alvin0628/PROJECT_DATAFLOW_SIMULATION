// components/overview/ArchitectureNarrative.tsx
import React from "react";
import { supabase } from "@/lib/supabase-client";
import ZoomableDiagram from "./ZoomableDiagram";

const stages = [
  {
    n: "01",
    title: "Orchestrator",
    subtitle: "DAG Splitting & DooD",
    accent: "text-primary",
    glow: "bg-primary",
    items: [
      "Analytics vs ML DAGs",
      "DooD container isolation",
      "Decoupled execution",
    ],
  },
  {
    n: "02",
    title: "Data Pipeline",
    subtitle: "Medallion Architecture",
    accent: "text-warning",
    glow: "bg-warning",
    items: [
      "Bronze · Silver · Gold",
      "dbt data materialization",
      "Stateful simulation",
    ],
  },
  {
    n: "03",
    title: "Feature Store",
    subtitle: "Centralized ML Assets",
    accent: "text-success",
    glow: "bg-success",
    items: [
      "Reusable features",
      "Point-in-time correctness",
      "Entity resolution",
    ],
  },
  {
    n: "04",
    title: "Model Evaluator",
    subtitle: "Quality Gating",
    accent: "text-danger",
    glow: "bg-danger",
    items: [
      "Champion vs Challenger",
      "PR-AUC & F1 thresholds",
      "Model registry",
    ],
  },
  {
    n: "05",
    title: "Inference Engine",
    subtitle: "Windowing & Batch",
    accent: "text-primary",
    glow: "bg-primary",
    items: [
      "Time-windowing logic",
      "Existing models reuse",
      "Incremental scoring",
    ],
  },
  {
    n: "06",
    title: "Inference Evaluator",
    subtitle: "Prediction Telemetry",
    accent: "text-warning",
    glow: "bg-warning",
    items: ["Feedback loops", "Prediction monitoring", "Performance drift"],
  },
  {
    n: "07",
    title: "Serving Layer",
    subtitle: "FastAPI Microservices",
    accent: "text-success",
    glow: "bg-success",
    items: [
      "RESTful endpoints",
      "Real-time decision API",
      "Stateless execution",
    ],
  },
  {
    n: "08",
    title: "Presentation",
    subtitle: "Next.js Command Center",
    accent: "text-primary",
    glow: "bg-primary",
    items: [
      "Hybrid Server/Client UI",
      "Server-side aggregation",
      "Interactive BI telemetry",
    ],
  },
];

export default function ArchitectureNarrative() {
  const { data: storageData } = supabase.storage
    .from("workflow_diagram")
    .getPublicUrl("dataflow_diagram.png");

  const diagramImageUrl = storageData.publicUrl;

  return (
    <div className="flex flex-col gap-8">
      {/* 1. HEADER SECTION */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-7 md:px-10 md:py-9">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_center,rgb(120_169_255_/_0.14),transparent_68%)]" />
        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="dashboard-eyebrow">MLOPS COMMAND CENTER</p>
              <span className="rounded-full border border-success/30 bg-success-soft px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-success">
                Production / live
              </span>
            </div>
            <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.06em] md:text-6xl">
              End-to-End Dataflow <br />
              <span className="text-muted">& MLOps Engine.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-muted">
              A unified operating view across decoupled orchestration, medallion
              data movement, model lifecycle, windowed inference, and the
              business signals those systems produce.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-l border-border pl-5 font-mono text-[10px] text-muted md:grid-cols-4 xl:w-[430px] xl:grid-cols-2">
            <Metric label="Environment" value="PRODUCTION" />
            <Metric label="Refresh cadence" value="AUTO" />
            <Metric
              label="Data plane"
              value="OBSERVED"
              valueClass="text-success"
            />
            <Metric label="Runtime mode" value="CONTINUOUS" />
          </div>
        </div>
      </header>

      {/* 2. SYSTEM LIMITATIONS & ROADMAP */}
      <div className="dashboard-panel relative overflow-hidden p-6 md:p-8 border-l-4 border-l-warning/70">
        <div className="absolute right-0 top-0 w-64 h-64 bg-warning/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="max-w-3xl">
            <p className="dashboard-eyebrow text-warning">
              Architectural Constraints & Roadmap
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Bridging the Gap to Enterprise Production
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              While this architecture structurally mirrors an industry-grade
              MLOps workflow, it operates within a controlled development scope.
              Achieving true 100% real-time production readiness requires
              addressing two primary constraints:
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="size-2 rounded-full bg-warning shadow-[0_0_8px_currentColor]" />
                Local Infrastructure Dependency
              </div>
              <p className="text-xs leading-5 text-muted">
                The entire Dockerized topology currently runs on local hardware.
                To achieve true 24/7 execution, continuous telemetry, and high
                availability, the stack is designed to be lifted and deployed to
                a remote cloud server (e.g., AWS EC2, Kubernetes).
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="size-2 rounded-full bg-warning shadow-[0_0_8px_currentColor]" />
                Synthetic Data Limitation
              </div>
              <p className="text-xs leading-5 text-muted">
                The simulation engine relies on synthetic datasets. While
                functionally perfect for testing pipeline orchestration and
                scaling, it lacks the chaotic noise, complex correlations, and
                unpredictable feature drift found in real-world human behavior.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RUNTIME TOPOLOGY SECTION */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="dashboard-panel command-grid overflow-hidden p-5 md:p-7">
          <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="dashboard-eyebrow">Runtime topology</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                From raw signal to business decision
              </h2>
            </div>
            <p className="max-w-xs text-right text-xs leading-5 text-muted">
              Continuous path through governed data, training, and serving
              layers.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stages.map((stage, index) => (
              <div key={stage.n} className="relative">
                <div className="h-full rounded-xl border border-border bg-background/75 p-4 transition-colors hover:border-border-strong">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] font-bold ${stage.accent}`}
                    >
                      {stage.n}
                    </span>
                    <span
                      className={`size-2 rounded-full ${stage.glow} shadow-[0_0_12px_currentColor]`}
                    />
                  </div>
                  <h3 className="mt-7 text-sm font-semibold">{stage.title}</h3>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {stage.subtitle}
                  </p>
                  <ul className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted">
                    {stage.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className={`size-1 rounded-full ${stage.glow}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {(index + 1) % 4 !== 0 && index !== stages.length - 1 && (
                  <span className="absolute -right-3 top-1/2 z-10 hidden h-px w-3 bg-primary/70 xl:block" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            <span className="text-success">● healthy path</span>
            <span>·</span>
            <span>8 runtime layers</span>
            <span>·</span>
            <span>quality gates enforced</span>
          </div>
        </div>

        <aside className="dashboard-panel flex flex-col justify-between p-5 md:p-6">
          <div>
            <p className="dashboard-eyebrow text-success">Executive readout</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Platform signal
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              The command center keeps operational health and model intelligence
              in the same field of view.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-5">
            <Signal
              label="Pipeline runtime"
              value="NOMINAL"
              tone="text-success"
            />
            <Signal
              label="Model registry"
              value="2 ONLINE"
              tone="text-primary"
            />
            <Signal
              label="Decision latency"
              value="REAL-TIME"
              tone="text-warning"
            />
          </div>
        </aside>
      </section>

      {/* 4. VISUAL TOPOLOGY FLOWCHART (KOTAK TERSENDIRI) */}
      <div className="dashboard-panel overflow-hidden p-5 md:p-7">
        <div className="border-b border-border pb-4 mb-6">
          <p className="dashboard-eyebrow text-primary">System Architecture</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            End-to-End Visual Flowchart
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted">
            Interactive diagram mapping the entire journey from Airflow
            orchestration to Next.js presentation.
          </p>
        </div>

        {/* Render komponen client untuk gambar Supabase */}
        <ZoomableDiagram
          src={diagramImageUrl}
          alt="MLOps Architecture Flowchart"
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.14em]">{label}</p>
      <p className={`mt-1 text-xs font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
function Signal({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-mono text-[10px] font-bold ${tone}`}>{value}</span>
    </div>
  );
}
