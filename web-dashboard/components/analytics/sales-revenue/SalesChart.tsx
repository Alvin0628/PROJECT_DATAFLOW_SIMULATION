// file: components/analytics/SalesChart.tsx
"use client"; // Wajib untuk Recharts karena interaktif (hover, tooltip)

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SalesChartProps {
  data: {
    month: string;
    revenue: number;
    margin: number;
  }[];
}

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm w-full h-[400px]">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-6 text-center">
        Revenue vs Gross Margin
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
          <Tooltip 
            cursor={{ fill: '#1e293b' }}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="revenue" name="Revenue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="margin" name="Gross Margin" fill="#fbbf24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}