import React from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  prefix?: string;
  subtitle?: string;
  colorTheme?: "rose" | "emerald" | "blue" | "orange";
}

export default function KPICard({
  title,
  value,
  prefix = "",
  subtitle,
  colorTheme = "blue",
}: KPICardProps) {
  const colorClasses = {
    rose: "text-danger",
    emerald: "text-success",
    blue: "text-primary",
    orange: "text-warning",
  };

  return (
    <div className="dashboard-panel flex min-h-32 flex-col justify-between p-5 transition-shadow hover:shadow-md">
      <p className={`font-mono text-2xl font-bold tracking-tight ${colorClasses[colorTheme]}`}>
        {prefix}
        {value}
      </p>
      <div>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">
          {title}
        </p>
        {subtitle && (
          <p className="mt-1 text-[11px] text-muted">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}