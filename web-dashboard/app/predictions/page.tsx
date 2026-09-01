import AutoRefresh from "@/components/AutoRefresh";
import { Suspense } from "react";
import PredictionsTable from "@/components/predictions/PredictionsTable";
import QualityGateWarning from "@/components/predictions/Qualitygatewarning";

export default function PredictionsPage() {
  return (
    <div className="space-y-8">
      <AutoRefresh intervalMs={60000} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Actionable Predictions
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Daftar entitas dengan probabilitas tertinggi yang membutuhkan aksi
          segera dari tim bisnis. Dilengkapi dengan fitur pencarian dan ekspor
          CSV.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KARTU 1: CUSTOMER CHURN */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-800">Customer Churn</h2>
          </div>

          {/* QualityGateWarning tetap dibungkus Suspense karena ia Server Component */}
          <Suspense fallback={null}>
            <QualityGateWarning modelName="customer_churn" />
          </Suspense>

          {/* PredictionsTable sekarang mandiri (Client Component), tidak butuh Suspense */}
          <PredictionsTable modelName="customer_churn" />
        </div>

        {/* KARTU 2: SESSION CONVERSION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-800">Session Conversion</h2>
          </div>

          <Suspense fallback={null}>
            <QualityGateWarning modelName="session_conversion" />
          </Suspense>

          <PredictionsTable modelName="session_conversion" />
        </div>
      </div>
    </div>
  );
}
