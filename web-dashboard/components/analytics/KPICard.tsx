// file: components/analytics/KPICard.tsx
import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  prefix?: string;
  subtitle?: string;
  colorTheme?: 'rose' | 'emerald' | 'blue' | 'orange';
}

export default function KPICard({ title, value, prefix = '', subtitle, colorTheme = 'rose' }: KPICardProps) {
  const colorClasses = {
    rose: 'text-rose-500',
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    orange: 'text-orange-500',
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md">
      <p className={`text-3xl font-bold ${colorClasses[colorTheme]}`}>
        {prefix}{value}
      </p>
      <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wide">
        {title}
      </p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}