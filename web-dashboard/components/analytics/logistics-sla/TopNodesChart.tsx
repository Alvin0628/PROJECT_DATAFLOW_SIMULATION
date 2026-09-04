// components/analytics/logistics-sla/TopNodesChart.tsx
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

interface TopNodesChartProps {
  data: { name: string; value: number }[];
}

export default function TopNodesChart({ data }: TopNodesChartProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
      <h3 className="text-slate-800 text-sm font-bold tracking-widest uppercase mb-4 text-center">
        Top 5 Distribution Nodes
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 20, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#64748b" 
            fontSize={11} 
            axisLine={false} 
            tickLine={false} 
            width={80}
          />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}
            // @ts-expect-error: Bypassing Recharts internal broken typings
            formatter={(value: number) => [value.toLocaleString(), 'Packages']}
          />
          <Bar dataKey="value" fill="#475569" radius={[0, 4, 4, 0]} barSize={25}>
            <LabelList 
              dataKey="value" 
              position="right" 
              fill="#d97706" 
              fontSize={12}
              fontWeight="bold"
              // @ts-expect-error: Bypassing Recharts internal broken typings
              formatter={(val: number) => `${(val/1000).toFixed(1)}K`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}