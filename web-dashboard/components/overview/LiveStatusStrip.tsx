import { getBaseUrl } from '@/lib/get-base-url';
import type { PipelineHealth, ModelMetrics, ApiResponse } from '@/types/Database.types';

export default async function LiveStatusStrip() {
  // Panggil 2 API secara paralel untuk performa maksimal
  const [healthRes, championRes] = await Promise.all([
    fetch(`${getBaseUrl()}/api/health`, { cache: 'no-store' }),
    fetch(`${getBaseUrl()}/api/metrics?champion_only=true`, { cache: 'no-store' })
  ]);

  const healthBody: ApiResponse<PipelineHealth[]> = await healthRes.json();
  const championBody: ApiResponse<ModelMetrics[]> = await championRes.json();

  if (healthBody.error || championBody.error) {
        return (
        <div className="p-4 bg-red-950/30 border border-red-900 rounded-xl text-red-400 text-sm font-mono">
            {'>'} ERROR: CONNECTION_FAILED
        </div>
        );
  }

  const health = healthBody.data?.[0];
  const champions = championBody.data ?? [];
  
  const churnChampion = champions.find(c => c.model_name === 'customer_churn');
  const conversionChampion = champions.find(c => c.model_name === 'session_conversion');

  return (
    <div className="mt-8 bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800">
      
      {/* Terminal Header */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health?.last_run_status === 'success' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${health?.last_run_status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </span>
        <span className="text-[10px] font-mono text-slate-400 tracking-wider">SYSTEM.ONLINE</span>
      </div>

      {/* Terminal Body */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-sm">
        
        {/* Kolom 1: Pipeline */}
        <div>
          <p className="text-slate-500 text-xs mb-1">LAST PIPELINE RUN</p>
          {health ? (
            <>
              {/* Ubah last_run_time menjadi last_run_at */}
              <p className="text-slate-200">
                {health.last_run_at ? new Date(health.last_run_at as string).toLocaleString('id-ID') : 'UNKNOWN TIME'}
              </p>
              
              <p className={`mt-1 font-bold ${health.last_run_status === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                Status: {String(health.last_run_status || 'UNKNOWN').toUpperCase()}
              </p>
            </>
          ) : (
            <p className="text-slate-400">NO DATA</p>
          )}
        </div>

        {/* Kolom 2: Churn */}
        <div className="md:border-l md:border-slate-800 md:pl-6">
          <p className="text-slate-500 text-xs mb-1">CHAMPION: CHURN</p>
          {churnChampion ? (
            <>
              {/* Tambahkan tanda tanya (?) sebelum toFixed dan fallback ke '-' */}
              <p className="text-blue-400 font-bold">
                F1: {churnChampion.f1_macro?.toFixed(4) ?? '-'} <span className="text-slate-500 font-normal">(B#{churnChampion.batch_number})</span>
              </p>
              <p className="text-slate-300 mt-1 text-xs">Quality Gate: PASSED</p>
            </>
          ) : (
            <p className="text-slate-600 italic">No Champion Passed</p>
          )}
        </div>

        {/* Kolom 3: Conversion */}
        <div className="md:border-l md:border-slate-800 md:pl-6">
          <p className="text-slate-500 text-xs mb-1">CHAMPION: CONVERSION</p>
          {conversionChampion ? (
            <>
              <p className="text-blue-400 font-bold">
                F1: {conversionChampion.f1_macro?.toFixed(4) ?? '-'} <span className="text-slate-500 font-normal">(B#{conversionChampion.batch_number})</span>
              </p>
              <p className="text-slate-300 mt-1 text-xs">Quality Gate: PASSED</p>
            </>
          ) : (
            <p className="text-slate-600 italic">No Champion Passed</p>
          )}
        </div>

      </div>
    </div>
  );
}