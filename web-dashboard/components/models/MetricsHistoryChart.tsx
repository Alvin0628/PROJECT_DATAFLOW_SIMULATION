'use client';

import type { ModelMetrics } from '@/types/Database.types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function MetricsHistoryChart({ data }: { data: ModelMetrics[] }) {
  if (!data || data.length === 0) return null;

  // Recharts butuh urutan waktu dari kiri ke kanan (terlama ke terbaru)
  // Data dari API biasanya terbaru di atas, jadi kita reverse()
  const chartData = [...data].reverse().map((d) => ({
    batch: `B-${d.batch_number}`,
    f1_macro: d.f1_macro,
    pr_auc: d.pr_auc,
  }));

  return (
    <div className="h-72 w-full p-4 bg-white border-b border-slate-200">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="batch" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 1]} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line type="monotone" dataKey="f1_macro" name="F1 Macro" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="pr_auc" name="PR-AUC" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}