// file: components/analytics/logistics-sla/DeliveryMapChart.tsx
"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis
} from 'recharts';

interface DeliveryMapChartProps {
  data: {
    city: string;
    lat: number;
    lon: number;
    packages: number;
  }[];
}

export default function DeliveryMapChart({ data }: DeliveryMapChartProps) {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col h-[400px] relative overflow-hidden">
      <h3 className="text-white text-sm font-bold tracking-widest uppercase mb-2 text-center z-10">
        Global Distribution Heatmap
      </h3>
      {/* Latar belakang peta bayangan (opsional, untuk memberikan ilusi peta dunia) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
        <span className="text-slate-500 text-xs font-mono tracking-widest">MAP OVERLAY AREA</span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {/* Sumbu X = Longitude (Bujur) */}
          <XAxis type="number" dataKey="lon" domain={[-180, 180]} hide />
          {/* Sumbu Y = Latitude (Lintang) */}
          <YAxis type="number" dataKey="lat" domain={[-90, 90]} hide />
          {/* Sumbu Z = Ukuran Titik (Jumlah Paket) */}
          <ZAxis type="number" dataKey="packages" range={[20, 400]} />
          
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
            // @ts-expect-error: Bypassing Recharts internal broken typings
            formatter={(value: number, name: string) => {
              if (name === 'packages') return [value, 'Total Packages'];
              return [];
            }}
            labelFormatter={() => ''}
          />
          <Scatter name="Deliveries" data={data} fill="#d97706" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}