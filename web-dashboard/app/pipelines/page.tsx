import AutoRefresh from "@/components/AutoRefresh";
import { getBaseUrl } from '@/lib/get-base-url';

// Tipe data balikan dari Airflow API
interface AirflowDag {
  dag_id: string;
  is_active: boolean;
  is_paused: boolean;
  description: string | null;
  owners: string[];
  next_dagrun: string | null;
}

export default async function PipelinesPage() {
  // Panggil API Proxy Next.js kita sendiri
  const res = await fetch(`${getBaseUrl()}/api/airflow/dags`, { 
    cache: 'no-store' 
  });
  
  const body = await res.json();

  if (body.error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
        Gagal menghubungi Airflow: {body.error}
      </div>
    );
  }

  const dags: AirflowDag[] = body.data ?? [];

  return (
    <div className="space-y-8">
      <AutoRefresh intervalMs={60000} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pipeline Orchestration</h1>
        <p className="text-slate-500 text-sm mt-1">
          Integrasi langsung dengan Apache Airflow via REST API. Memantau status dan jadwal eksekusi DAG (Directed Acyclic Graph).
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Active DAGs</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="py-3 px-4 font-semibold">DAG ID</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Owner</th>
                <th className="py-3 px-4 font-semibold">Next Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dags.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Tidak ada DAG yang ditemukan atau Airflow sedang mati.
                  </td>
                </tr>
              )}
              {dags.map((dag) => (
                <tr key={dag.dag_id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{dag.dag_id}</td>
                  <td className="py-3 px-4">
                    {/* Logika Status Airflow: Jika is_paused true, berarti mati/off */}
                    {dag.is_paused ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        PAUSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{dag.owners.join(', ')}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                    {dag.next_dagrun ? new Date(dag.next_dagrun).toLocaleString('id-ID') : 'Not Scheduled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}