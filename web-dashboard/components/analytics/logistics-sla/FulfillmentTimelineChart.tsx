"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FulfillmentTimelineChartProps {
  data: {
    date: string;
    totalPackages: number;
    shippedPackages: number;
  }[];
}

export default function FulfillmentTimelineChart({
  data,
}: FulfillmentTimelineChartProps) {
  return (
    <div className="bg-slate-700/50 p-6 rounded-xl border border-slate-600 shadow-sm w-full h-[300px]">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-6 text-center">
        Marketplace Fulfillment Timeline
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#475569"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              borderColor: "#475569",
              color: "#f8fafc",
              borderRadius: "8px",
            }}
            itemStyle={{ color: "#f8fafc" }}
          />
          <Legend wrapperStyle={{ paddingTop: "10px" }} iconType="circle" />
          <Line
            type="monotone"
            dataKey="totalPackages"
            name="Total Unique Packages"
            stroke="#fbbf24"
            strokeWidth={3}
            dot={{ r: 4, fill: "#fbbf24", strokeWidth: 2, stroke: "#1e293b" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="shippedPackages"
            name="Sum of is_shipped_flag"
            stroke="#f8fafc"
            strokeWidth={3}
            dot={{ r: 4, fill: "#f8fafc", strokeWidth: 2, stroke: "#1e293b" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
