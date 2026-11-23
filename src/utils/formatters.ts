export function formatNumber(n: number | undefined | null, decimals = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTimestamp(ts: string | undefined | null): string {
  if (!ts) return '—';
  const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusTone(status: string): 'good' | 'warn' | 'critical' | 'neutral' {
  const s = status.toUpperCase();
  if (
    ['OPTIMAL', 'OPERATIONAL', 'GOOD', 'LOW', 'ACTIVE', 'RESOLVED', 'APPLIED', 'NORMAL'].includes(s)
  ) {
    return 'good';
  }
  if (
    ['ADVISORY', 'MODERATE', 'MEDIUM', 'WARNING', 'DEGRADED', 'MONITORING', 'DISPATCHED', 'IN_PROGRESS', 'ACKNOWLEDGED', 'MAINTENANCE'].includes(s)
  ) {
    return 'warn';
  }
  if (['CRITICAL', 'SEVERE', 'HIGH', 'HAZARDOUS', 'UNHEALTHY', 'ALERTING', 'OPEN', 'SUSPENDED'].includes(s)) {
    return 'critical';
  }
  return 'neutral';
}
