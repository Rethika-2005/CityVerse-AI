import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { StatusText } from '../components/StatusText';
import { SkeletonTable } from '../components/SkeletonLoader';
import { formatNumber } from '../utils/formatters';

interface ReportPayload {
  reportType: string;
  generatedAt: string;
  zones: { code: string; name: string; health_score: number; status: string; population: number }[];
  traffic: { zone_code: string; zone_name: string; avg_congestion: number; avg_speed: number; peak_vehicles: number }[];
  environment: { zone_code: string; zone_name: string; avg_aqi: number; avg_pm25: number; avg_noise: number; avg_wqi: number }[];
  energy: { zone_code: string; zone_name: string; total_mwh: number; avg_renewable_pct: number; max_grid_load: number }[];
  water: { zone_code: string; zone_name: string; total_ml: number; avg_reservoir_pct: number; avg_leakage_pct: number }[];
  emergencies: { id: number; zone_code: string; title: string; category: string; priority: string; status: string }[];
  predictions: { zone_code: string; domain: string; current_value: number; predicted_value: number; unit: string; risk_level: string }[];
}

export function ReportsPage() {
  const [reportType, setReportType] = useState('OVERALL');
  const [fromDate, setFromDate] = useState('2025-01-01');
  const [toDate, setToDate] = useState('2027-12-31');

  const { data, loading, error } = useApiData<ReportPayload>(
    `/reports/summary?type=${reportType}&from=${fromDate}&to=${toDate}`,
    [reportType, fromDate, toDate]
  );

  function exportCsv() {
    if (!data) return;
    const rows = [
      ['Zone Code', 'Zone Name', 'Health Score', 'Avg Congestion %', 'Avg AQI', 'Total Energy MWh', 'Total Water ML'],
      ...data.zones.map((z) => {
        const tr = data.traffic.find((t) => t.zone_code === z.code);
        const en = data.environment.find((e) => e.zone_code === z.code);
        const eg = data.energy.find((g) => g.zone_code === z.code);
        const wt = data.water.find((w) => w.zone_code === z.code);
        return [
          z.code,
          `"${z.name}"`,
          String(z.health_score),
          String(tr?.avg_congestion ?? ''),
          String(en?.avg_aqi ?? ''),
          String(eg?.total_mwh ?? ''),
          String(wt?.total_ml ?? ''),
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cityverse-${reportType.toLowerCase()}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">Reports &amp; Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">
            Traffic, environmental, energy, water, emergency, predictive, and overall city performance exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 text-xs bg-[#0D1526] border border-slate-700/80 rounded-md text-slate-100"
          >
            <option value="OVERALL">Overall City Performance</option>
            <option value="TRAFFIC">Traffic Mobility Report</option>
            <option value="ENVIRONMENT">Environmental Report</option>
            <option value="ENERGY">Energy Consumption Report</option>
            <option value="WATER">Water Resource Report</option>
            <option value="EMERGENCY">Emergency Incident Report</option>
            <option value="PREDICTIVE">Predictive Analytics Report</option>
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 text-xs bg-[#0D1526] border border-slate-700/80 rounded-md text-slate-100 font-mono"
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 text-xs bg-[#0D1526] border border-slate-700/80 rounded-md text-slate-100 font-mono"
            aria-label="To date"
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-md cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0D1526] hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-md cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/70 rounded-lg text-sm text-rose-200">{error}</div>
      )}

      {loading && !data ? (
        <SkeletonTable rows={6} />
      ) : data ? (
        <div className="space-y-6">
          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-4">Zone Health Score Comparison</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.zones}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="code" stroke="#64748B" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }} />
                  <Bar dataKey="health_score" name="Health Score" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {(reportType === 'OVERALL' || reportType === 'TRAFFIC') && (
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800/80 text-sm font-semibold text-slate-100">
                Traffic Summary by Zone
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-4">Zone</th>
                      <th className="py-2.5 px-4 text-right">Avg Congestion</th>
                      <th className="py-2.5 px-4 text-right">Avg Speed</th>
                      <th className="py-2.5 px-4 text-right">Peak Vehicles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.traffic.map((t) => (
                      <tr key={t.zone_code}>
                        <td className="py-2.5 px-4 text-slate-100">{t.zone_code} · {t.zone_name}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{t.avg_congestion}%</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{t.avg_speed} km/h</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{formatNumber(t.peak_vehicles)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(reportType === 'OVERALL' || reportType === 'ENVIRONMENT') && (
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800/80 text-sm font-semibold text-slate-100">
                Environmental Summary by Zone
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-4">Zone</th>
                      <th className="py-2.5 px-4 text-right">Avg AQI</th>
                      <th className="py-2.5 px-4 text-right">Avg PM2.5</th>
                      <th className="py-2.5 px-4 text-right">Avg Noise (dB)</th>
                      <th className="py-2.5 px-4 text-right">Water Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.environment.map((e) => (
                      <tr key={e.zone_code}>
                        <td className="py-2.5 px-4 text-slate-100">{e.zone_code} · {e.zone_name}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{e.avg_aqi}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{e.avg_pm25}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{e.avg_noise}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{e.avg_wqi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(reportType === 'OVERALL' || reportType === 'ENERGY' || reportType === 'WATER') && (
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800/80 text-sm font-semibold text-slate-100">
                Energy &amp; Water Resource Summary
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-4">Zone</th>
                      <th className="py-2.5 px-4 text-right">Total Energy (MWh)</th>
                      <th className="py-2.5 px-4 text-right">Renewable Mix</th>
                      <th className="py-2.5 px-4 text-right">Total Water (ML)</th>
                      <th className="py-2.5 px-4 text-right">Avg Reservoir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.energy.map((eg) => {
                      const wt = data.water.find((w) => w.zone_code === eg.zone_code);
                      return (
                        <tr key={eg.zone_code}>
                          <td className="py-2.5 px-4 text-slate-100">{eg.zone_code} · {eg.zone_name}</td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-right">{eg.total_mwh}</td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-right">{eg.avg_renewable_pct}%</td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-right">{wt?.total_ml ?? '—'}</td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-right">{wt?.avg_reservoir_pct ?? '—'}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(reportType === 'OVERALL' || reportType === 'EMERGENCY') && (
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800/80 text-sm font-semibold text-slate-100">
                Emergency Incidents Log
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">Zone</th>
                      <th className="py-2.5 px-4">Title</th>
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.emergencies.map((inc) => (
                      <tr key={inc.id}>
                        <td className="py-2.5 px-4 font-mono text-cyan-400">#{inc.id}</td>
                        <td className="py-2.5 px-4 font-mono">{inc.zone_code}</td>
                        <td className="py-2.5 px-4 text-slate-100">{inc.title}</td>
                        <td className="py-2.5 px-4"><StatusText status={inc.priority} /></td>
                        <td className="py-2.5 px-4 text-slate-300">{inc.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType === 'PREDICTIVE' && (
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800/80 text-sm font-semibold text-slate-100">
                Predictive Analytics Forecast Report (Simulated Baseline)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-4">Zone</th>
                      <th className="py-2.5 px-4">Domain</th>
                      <th className="py-2.5 px-4 text-right">Current</th>
                      <th className="py-2.5 px-4 text-right">+24h Forecast</th>
                      <th className="py-2.5 px-4">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.predictions.map((p, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-4 font-mono text-cyan-400">{p.zone_code}</td>
                        <td className="py-2.5 px-4 text-slate-200">{p.domain}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{p.current_value} {p.unit}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right">{p.predicted_value} {p.unit}</td>
                        <td className="py-2.5 px-4"><StatusText status={p.risk_level} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
