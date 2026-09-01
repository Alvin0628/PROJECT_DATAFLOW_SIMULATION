import AutoRefresh from "@/components/AutoRefresh";
import { Suspense } from 'react';
import ModelHistoryTable from '@/components/models/ModelHistoryTable';

export default function ModelsPage() {
  return (
    <div className="space-y-8">
      <AutoRefresh intervalMs={60000} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Model Performance</h1>
        <p className="text-slate-500 text-sm mt-1">
          Riwayat lengkap setiap siklus training -- termasuk Challenger yang
          gagal lolos quality gate. Ini seluruh jejak keputusan
          Champion/Challenger dari waktu ke waktu, bukan cuma model yang
          sedang aktif.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Session Conversion</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Model dengan sinyal prediktif kuat -- lolos quality gate secara konsisten.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
              Memuat riwayat...
            </div>
          }
        >
          <ModelHistoryTable modelName="session_conversion" />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Customer Churn</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis Mutual Information menunjukkan tidak ada fitur yang
            berkorelasi signifikan dengan target -- data sintetis untuk use
            case ini tidak memiliki struktur kausal yang bisa dipelajari.
            Quality gate secara konsisten menolak promosi model ini, sesuai
            desain.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
              Memuat riwayat...
            </div>
          }
        >
          <ModelHistoryTable modelName="customer_churn" />
        </Suspense>
      </div>
    </div>
  );
}