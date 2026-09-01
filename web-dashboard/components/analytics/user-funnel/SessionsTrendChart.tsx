// file: components/analytics/user-funnel/SessionsTrendChart.tsx
"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendData {
  month: string;
  sessions: number;
  conversions: number;
}

interface SessionsTrendChartProps {
  data: TrendData[];
}

export default function SessionsTrendChart({ data }: SessionsTrendChartProps) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm w-full h-[400px] flex flex-col">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-6 text-center">
        Sessions vs Conversions Trend
      </h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#1e293b" }}
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                color: "#f8fafc",
                borderRadius: "8px",
              }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Bar dataKey="sessions" name="Total Sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            <Line
              type="monotone"
              dataKey="conversions"
              name="Conversions"
              stroke="#ec4899"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ec4899", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}