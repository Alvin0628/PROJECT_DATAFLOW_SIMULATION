"use client";

import { useState } from "react";
import { useApiData } from "@/hooks/useApiData";
import { getPredictions } from "@/lib/api-client";

interface PredictionsTableProps {
  modelName: "customer_churn" | "session_conversion";
}

export default function PredictionsTable({ modelName }: PredictionsTableProps) {
  // STATE KUMPULAN FILTER
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchEntity, setSearchEntity] = useState("");
  const [searchBatch, setSearchBatch] = useState("");
  const [filterLabel, setFilterLabel] = useState<string>("all"); // 'all', '1', atau '0'

  const offset = (page - 1) * limit;
  const isChurn = modelName === "customer_churn";

  // API otomatis dipanggil setiap kali salah satu dari dependency array di bawah ini berubah
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

  // EXPORT CSV (Dinamis: Hanya mengekspor apa yang ada di tabel saat ini)
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

  // Fungsi helper: Reset ke halaman 1 tiap kali filter diubah
  const handleFilterChange = <T,>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    value: T,
  ) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col bg-white">
      {/* 1. KONTROL FILTER (Multi-Filter) */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Entity ID */}
          <input
            type="text"
            placeholder="Search Entity ID..."
            className="px-3 py-1.5 border border-slate-200 rounded text-sm w-40 focus:ring-1 focus:ring-blue-500 outline-none"
            value={searchEntity}
            onChange={(e) =>
              handleFilterChange(setSearchEntity, e.target.value)
            }
          />
          {/* Filter Batch */}
          <input
            type="number"
            placeholder="Batch No..."
            className="px-3 py-1.5 border border-slate-200 rounded text-sm w-28 focus:ring-1 focus:ring-blue-500 outline-none"
            value={searchBatch}
            onChange={(e) => handleFilterChange(setSearchBatch, e.target.value)}
          />
          {/* Filter Label */}
          <select
            className="px-3 py-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            value={filterLabel}
            onChange={(e) => handleFilterChange(setFilterLabel, e.target.value)}
          >
            <option value="all">Semua Label</option>
            <option value="1">
              {isChurn ? "Will Churn (1)" : "Will Convert (1)"}
            </option>
            <option value="0">Safe (0)</option>
          </select>
          <div className="flex-1"></div> {/* Spacer */}
          {/* Pengaturan Limit (Bisa sampai 100 baris per scroll) */}
          <select
            className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white"
            value={limit}
            onChange={(e) =>
              handleFilterChange(setLimit, Number(e.target.value))
            }
          >
            <option value={10}>10 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
          {/* Tombol Export */}
          <button
            onClick={handleExportCSV}
            disabled={predictions.length === 0 || loading}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            CSV
          </button>
        </div>
      </div>

      {/* 2. AREA TABEL (INTERNAL SCROLLING) */}
      {/* max-h-[400px] membuat tabel punya scroll bar sendiri jika barisnya banyak (misal limit 100) */}
      <div className="relative max-h-[400px] overflow-y-auto">
        {error && (
          <div className="p-4 text-red-600 text-sm">Error: {error}</div>
        )}

        <table className="w-full text-sm text-left">
          {/* 'sticky top-0' membuat header tabel tidak ikut tergulung saat di-scroll ke bawah */}
          <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="py-2.5 px-4 font-semibold border-b">Entity ID</th>
              <th className="py-2.5 px-4 font-semibold border-b">
                Probability
              </th>
              <th className="py-2.5 px-4 font-semibold border-b">Label</th>
              <th className="py-2.5 px-4 font-semibold border-b">Batch</th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-slate-100 transition-opacity duration-200 ${loading ? "opacity-40" : "opacity-100"}`}
          >
            {!loading && predictions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-slate-400 bg-white"
                >
                  Tidak ada data yang cocok dengan kombinasi filter tersebut.
                </td>
              </tr>
            )}

            {predictions.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 bg-white">
                <td className="py-2.5 px-4 font-medium">{p.entity_id}</td>
                <td className="py-2.5 px-4 font-mono">
                  {(p.probability * 100).toFixed(1)}%
                </td>
                <td className="py-2.5 px-4">
                  {p.predicted_label === 1 ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${isChurn ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}
                    >
                      {isChurn ? "CHURN" : "CONVERT"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                      SAFE
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-slate-500 text-xs">
                  #{p.batch_number}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. KONTROL PAGINATION BAWAH */}
      <div className="p-3 border-t border-slate-200 flex justify-between items-center bg-white text-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="px-3 py-1 font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
        >
          &larr; Prev
        </button>
        <span className="text-slate-500">
          {loading ? "Processing..." : `Page ${page}`}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          // Tombol Next mati jika data yang didapat lebih sedikit dari kapasitas limit (berarti sudah di ujung)
          disabled={predictions.length < limit || loading}
          className="px-3 py-1 font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
