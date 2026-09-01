// file: components/analytics/user-funnel/FunnelChartComponent.tsx
"use client";

import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FunnelData {
  name: string;
  value: number;
  fill: string;
}

interface FunnelChartProps {
  data: FunnelData[];
}

export default function FunnelChartComponent({ data }: FunnelChartProps) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm w-full h-[400px] flex flex-col">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-6 text-center">
        Conversion Funnel
      </h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                color: "#f8fafc",
                borderRadius: "8px",
              }}
              // @ts-expect-error: Bypassing Recharts internal broken typings
              formatter={(value: number) => [value.toLocaleString(), "Users"]}
            />
            <Funnel dataKey="value" data={data} isAnimationActive>
              <LabelList
                position="right"
                fill="#f8fafc"
                stroke="none"
                dataKey="name"
                fontSize={12}
              />
              <LabelList
                position="center"
                fill="#ffffff"
                stroke="none"
                dataKey="value"
                fontSize={14}
                fontWeight="bold"
                // @ts-expect-error: Bypassing Recharts internal broken typings
                formatter={(val: number) => val.toLocaleString()}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}