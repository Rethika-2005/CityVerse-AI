import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { getStatusTone } from '../utils/formatters';

interface StatusTextProps {
  status: string;
  label?: string;
}

export function StatusText({ status, label }: StatusTextProps) {
  const tone = getStatusTone(status);
  const display = label ?? status.replaceAll('_', ' ');

  if (tone === 'good') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{display}</span>
      </span>
    );
  }
  if (tone === 'warn') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{display}</span>
      </span>
    );
  }
  if (tone === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap">
        <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{display}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 whitespace-nowrap">
      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{display}</span>
    </span>
  );
}
