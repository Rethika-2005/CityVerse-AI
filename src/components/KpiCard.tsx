import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn' | 'critical';
}

export function KpiCard({ title, value, subtitle, tone = 'default' }: KpiCardProps) {
  const valueColor =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-400'
        : tone === 'critical'
          ? 'text-rose-400'
          : 'text-slate-50';

  return (
    <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between gap-2">
      <div className="text-xs font-medium text-slate-400 truncate">{title}</div>
      <div className={`text-2xl font-semibold font-mono tabular-nums tracking-tight ${valueColor}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 truncate">{subtitle}</div>
    </div>
  );
}
