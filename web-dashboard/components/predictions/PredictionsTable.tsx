"use client";

import { useState } from "react";
import { useApiData } from "@/hooks/useApiData";
import { getPredictions } from "@/lib/api-client";

interface PredictionsTableProps {
  modelName: "customer_churn" | "session_conversion";
}

export default function PredictionsTable({ modelName }: PredictionsTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchEntity, setSearchEntity] = useState("");
  const [searchBatch, setSearchBatch] = useState("");
  const [filterLabel, setFilterLabel] = useState<string>("all");

  const offset = (page - 1) * limit;
  const isChurn = modelName === "customer_churn";

  // Refetch when any dependency changes
  const { data, loading, error } = useApiData(
    () =>
      getPredictions({
        modelName,
        limit,
        offset,
        entityId: searchEntity || undefined,
        batchNumber: searchBatch ? parseInt(searchBatch) : undefined,
        predictedLabel:
          filterLabel !== "all" ? parseInt(filterLabel) : undefined,
      }),
    [modelName, page, limit, searchEntity, searchBatch, filterLabel],
  );

  const predictions = data ?? [];

  const handleExportCSV = () => {
    if (predictions.length === 0) return;
    const headers = ["Entity ID", "Probability", "Predicted Label", "Batch"];
    const rows = predictions.map((p) => [
      p.entity_id,
      p.probability,
      p.predicted_label === 1
        ? isChurn
          ? "WILL CHURN"
          : "WILL CONVERT"
        : "SAFE",
      p.batch_number,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Filtered_${modelName}_predictions.csv`;
    link.click();
  };

  // Reset to page 1 when filters change
  const handleFilterChange = <T,>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    value: T,
  ) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col bg-surface text-foreground">
      <div className="p-4 bg-surface-muted/50 border-b border-border flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search Entity ID..."
            className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground w-40 focus:border-primary outline-none"
            value={searchEntity}
            onChange={(e) =>
              handleFilterChange(setSearchEntity, e.target.value)
            }
          />
          <input
            type="number"
            placeholder="Batch No..."
            className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground w-28 focus:border-primary outline-none"
            value={searchBatch}
            onChange={(e) => handleFilterChange(setSearchBatch, e.target.value)}
          />
          <select
            className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground focus:border-primary outline-none"
            value={filterLabel}
            onChange={(e) => handleFilterChange(setFilterLabel, e.target.value)}
          >
            <option value="all" className="bg-surface text-foreground">All Label</option>
            <option value="1" className="bg-surface text-foreground">
              {isChurn ? "Will Churn (1)" : "Will Convert (1)"}
            </option>
            <option value="0" className="bg-surface text-foreground">Safe (0)</option>
          </select>
          <div className="flex-1"></div>
          <select
            className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground focus:border-primary outline-none"
            value={limit}
            onChange={(e) =>
              handleFilterChange(setLimit, Number(e.target.value))
            }
          >
            <option value={10} className="bg-surface text-foreground">10 Rows</option>
            <option value={50} className="bg-surface text-foreground">50 Rows</option>
            <option value={100} className="bg-surface text-foreground">100 Rows</option>
          </select>
          <button
            onClick={handleExportCSV}
            disabled={predictions.length === 0 || loading}
            className="px-4 py-1.5 bg-primary text-background font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="relative max-h-[400px] overflow-y-auto">
        {error && (
          <div className="p-4 text-danger text-sm">Error: {error}</div>
        )}

        <table className="dashboard-table w-full text-sm text-left">
          <thead className="bg-surface-muted text-muted sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="py-2.5 px-4 font-semibold border-b border-border">Entity ID</th>
              <th className="py-2.5 px-4 font-semibold border-b border-border">
                Probability
              </th>
              <th className="py-2.5 px-4 font-semibold border-b border-border">Label</th>
              <th className="py-2.5 px-4 font-semibold border-b border-border">Batch</th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-border transition-opacity duration-200 ${loading ? "opacity-40" : "opacity-100"}`}
          >
            {!loading && predictions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-muted bg-surface"
                >
                  No data matches that combination of filters.
                </td>
              </tr>
            )}

            {predictions.map((p) => (
              <tr key={p.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="py-2.5 px-4 font-medium text-foreground">{p.entity_id}</td>
                <td className="py-2.5 px-4 font-mono text-foreground">
                  {(p.probability * 100).toFixed(1)}%
                </td>
                <td className="py-2.5 px-4">
                  {p.predicted_label === 1 ? (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${isChurn ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}
                    >
                      {isChurn ? "CHURN" : "CONVERT"}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-surface-muted text-muted">
                      SAFE
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-muted text-xs font-mono">
                  #{p.batch_number}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-border flex justify-between items-center bg-surface-muted/50 text-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="px-3 py-1 font-medium text-foreground border border-border rounded-lg hover:bg-surface-muted disabled:opacity-50 transition-colors"
        >
          &larr; Prev
        </button>
        <span className="text-muted font-mono text-xs">
          {loading ? "Processing..." : `Page ${page}`}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={predictions.length < limit || loading}
          className="px-3 py-1 font-medium text-foreground border border-border rounded-lg hover:bg-surface-muted disabled:opacity-50 transition-colors"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}