import { supabase } from "@/lib/supabase-client";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ modelName: string; batchNumber: string }>; // Ubah tipe params jadi Promise
}) {
  // 1. Await params (Wajib untuk Next.js 14/15+)
  const { modelName, batchNumber } = await params;

  // 2. Lakukan Query ke Supabase
  const { data: modelDetail, error } = await supabase
    .from("model_metrics")
    .select("*")
    .eq("model_name", modelName)
    .eq("batch_number", parseInt(batchNumber))
    .single();

  // 3. LOGGING UNTUK MENCARI TAHU PENYEBAB ERROR 404
  console.log("Mencari data untuk:", modelName, "Batch:", batchNumber);

  if (error) {
    console.error("❌ Supabase Error:", error.message, error.details);
  }

  if (!modelDetail) {
    console.warn(`⚠️ Data tidak ditemukan di database!`);
  }

  // 4. Jika error atau data kosong, baru lempar ke 404
  if (error || !modelDetail) {
    return notFound();
  }

  // 5. Parse JSONB (Kode frontend kamu sudah aman untuk handle NULL)
  const bestParams = modelDetail.best_params || {};
  const evalImages = modelDetail.evaluation_images || {};

  return (
    <div className="space-y-6">
      {/* ... [SISA KODE UI KAMU TETAP SAMA SEPERTI SEBELUMNYA] ... */}
      <div className="flex items-center space-x-4">
        <Link href="/models" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Models
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {modelName.replace("_", " ")} - Batch {batchNumber}
        </h1>
        {modelDetail.is_champion && (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
            Current Champion 🏆
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Tabel Hyperparameters Optuna */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Optuna Best Params
          </h2>
          {Object.keys(bestParams).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2 rounded-tl-lg">Parameter</th>
                    <th className="px-4 py-2 rounded-tr-lg">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(bestParams).map(([key, value]) => (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {key}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-600">
                        {String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">
              Hyperparameters data not available for this run.
            </p>
          )}
        </div>

        {/* Kolom Kanan: Visualisasi Plot Evaluasi (ROC & CM) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Evaluation Plots
          </h2>
          {evalImages.roc_and_cm ? (
            <div className="relative w-full h-[400px] bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex justify-center items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evalImages.roc_and_cm}
                alt={`${modelName} Evaluation ROC & Confusion Matrix`}
                className="max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
              <p className="text-gray-400">No evaluation images uploaded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
