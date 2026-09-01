// file: components/analytics/DonutChart.tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DonutChartProps {
  title: string;
  data: { name: string; value: number }[];
  colors: string[];
}

export default function DonutChart({ title, data, colors }: DonutChartProps) {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col h-[300px]">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-4 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              color: "#f8fafc",
              borderRadius: "8px",
            }}
            itemStyle={{ color: "#f8fafc" }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
