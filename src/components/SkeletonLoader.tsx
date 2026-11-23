import React from 'react';

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between animate-pulse"
        >
          <div className="h-3 w-24 bg-slate-800 rounded" />
          <div className="h-7 w-28 bg-slate-800 rounded" />
          <div className="h-3 w-36 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg divide-y divide-slate-800/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 px-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="h-3 w-1/3 bg-slate-800 rounded" />
          <div className="h-3 w-1/4 bg-slate-800 rounded" />
          <div className="h-3 w-16 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-10 text-center flex flex-col items-center justify-center gap-3">
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-md transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
