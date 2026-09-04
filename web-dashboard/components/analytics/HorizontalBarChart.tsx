// components/analytics/sales-revenue/HorizontalBarChart.tsx
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

interface HorizontalBarChartProps {
  title: string;
  data: { name: string; value: number }[];
  fillColor?: string;
  valuePrefix?: string;
}

export default function HorizontalBarChart({ title, data, fillColor = "#8b5cf6", valuePrefix = "" }: HorizontalBarChartProps) {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col h-[300px]">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-2 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 40, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={11} 
            axisLine={false} 
            tickLine={false} 
            width={100}
          />
          <Tooltip 
            cursor={{ fill: '#1e293b' }}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
            // @ts-expect-error: Bypassing Recharts internal broken typings
            formatter={(value: number) => [`${valuePrefix}${value.toLocaleString()}`, 'Value']}
          />
          <Bar dataKey="value" fill={fillColor} radius={[0, 4, 4, 0]} barSize={20}>
            <LabelList 
              dataKey="value" 
              position="right" 
              fill="#f8fafc" 
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