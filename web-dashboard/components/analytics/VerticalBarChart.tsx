// components/analytics/sales-revenue/VerticalBarChart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';

interface VerticalBarChartProps {
  title: string;
  data: { name: string; value: number }[];
  fillColor?: string;
  valuePrefix?: string;
}

export default function VerticalBarChart({ title, data, fillColor = "#e11d48", valuePrefix = "" }: VerticalBarChartProps) {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col h-[300px]">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-4 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={11} 
            axisLine={false} 
            tickLine={false} 
            interval={0}
            angle={-35}
            textAnchor="end"
          />
          <YAxis type="number" hide />
          <Tooltip 
            cursor={{ fill: '#1e293b' }}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
            // @ts-expect-error: Bypassing Recharts internal broken typings
            formatter={(value: number) => [`${valuePrefix}${value.toLocaleString()}`, 'Value']}
          />
          <Bar dataKey="value" fill={fillColor} radius={[4, 4, 0, 0]} barSize={35}>
            <LabelList 
              dataKey="value" 
              position="top" 
              fill="#fbbf24" 
              fontSize={11}
              // @ts-expect-error: Bypassing Recharts internal broken typings
              formatter={(val: number) => `${valuePrefix}${(val/1000).toFixed(1)}K`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}