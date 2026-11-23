import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { RefreshCw, Play } from 'lucide-react';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { KpiCard } from '../components/KpiCard';
import { StatusText } from '../components/StatusText';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import { formatNumber, formatTimestamp } from '../utils/formatters';

interface OverviewResponse {
  kpis: {
    totalPopulation: number;
    totalRegisteredUsers: number;
    trafficCongestionPct: number;
    airQualityIndex: number;
    waterAvailabilityPct: number;
    electricityConsumptionMwh: number;
    activeEmergencyIncidents: number;
    overallCityHealthScore: number;
  };
  charts: {
    trafficTrend: { timeLabel: string; avgCongestion: number; avgSpeed: number }[];
    envTrend: { timeLabel: string; avgAqi: number; avgPm25: number; avgNoise: number }[];
    resourceByZone: {
      zone: string;
      zoneName: string;
      energyMwh: number;
      renewablePct: number;
      waterMl: number;
      reservoirPct: number;
    }[];
  };
  recentAlerts: {
    id: number;
    zone_code: string | null;
    title: string;
    message: string;
    severity: string;
    category: string;
    created_at: string;
  }[];
  recentIncidents: {
    id: number;
    zone_code: string;
    zone_name: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
  }[];
  zones: {
    id: number;
    code: string;
    name: string;
    zone_type: string;
    population: number;
    health_score: number;
    status: string;
  }[];
}

export function AdminDashboardPage() {
  const { data, loading, error, reload } = useApiData<OverviewResponse>('/dashboard/overview');
  const [simulating, setSimulating] = useState(false);

  async function handleSimulateTick() {
    setSimulating(true);
    try {
      await api.post('/agents/simulate-tick');
      await reload();
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">Smart City Command Overview</h2>
          <p className="text-xs text-slate-400 mt-1">
            Live database metrics · Sensor baselines labeled simulated · Multi-agent health synthesis
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#0D1526] hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleSimulateTick}
            disabled={simulating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{simulating ? 'Updating Sensors...' : 'Simulate Telemetry Tick'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/70 rounded-lg text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-6">
          <SkeletonGrid count={8} />
          <SkeletonTable rows={5} />
        </div>
      ) : data ? (
        <>
          {/* 8 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Population"
              value={formatNumber(data.kpis.totalPopulation)}
              subtitle="Across 6 monitored zones"
            />
            <KpiCard
              title="Registered Users"
              value={formatNumber(data.kpis.totalRegisteredUsers)}
              subtitle="Admin & citizen portal accounts"
            />
            <KpiCard
              title="Traffic Congestion"
              value={`${formatNumber(data.kpis.trafficCongestionPct, 1)}%`}
              subtitle="Simulated arterial corridor avg"
              tone={data.kpis.trafficCongestionPct >= 70 ? 'critical' : data.kpis.trafficCongestionPct >= 50 ? 'warn' : 'good'}
            />
            <KpiCard
              title="Air Quality Index"
              value={`${data.kpis.airQualityIndex} AQI`}
              subtitle="Simulated city-wide sensor avg"
              tone={data.kpis.airQualityIndex >= 110 ? 'critical' : data.kpis.airQualityIndex >= 65 ? 'warn' : 'good'}
            />
            <KpiCard
              title="Water Availability"
              value={`${formatNumber(data.kpis.waterAvailabilityPct, 1)}%`}
              subtitle="Mean reservoir storage reserve"
              tone={data.kpis.waterAvailabilityPct <= 50 ? 'critical' : data.kpis.waterAvailabilityPct <= 68 ? 'warn' : 'good'}
            />
            <KpiCard
              title="Electricity Consumption"
              value={`${formatNumber(data.kpis.electricityConsumptionMwh, 1)} MWh`}
              subtitle="24h simulated grid draw"
            />
            <KpiCard
              title="Active Emergencies"
              value={formatNumber(data.kpis.activeEmergencyIncidents)}
              subtitle="Open, dispatched, or in-progress"
              tone={data.kpis.activeEmergencyIncidents >= 4 ? 'critical' : data.kpis.activeEmergencyIncidents > 0 ? 'warn' : 'good'}
            />
            <KpiCard
              title="City Health Score"
              value={`${formatNumber(data.kpis.overallCityHealthScore, 1)} / 100`}
              subtitle="Weighted multi-agent index"
              tone={data.kpis.overallCityHealthScore >= 85 ? 'good' : data.kpis.overallCityHealthScore >= 72 ? 'warn' : 'critical'}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Traffic Congestion &amp; Flow Speed</h3>
                  <p className="text-xs text-slate-500">City-wide corridor average (simulated)</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.trafficTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="timeLabel" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgCongestion"
                      name="Congestion (%)"
                      stroke="#06B6D4"
                      fill="#06B6D4"
                      fillOpacity={0.18}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgSpeed"
                      name="Avg Speed (km/h)"
                      stroke="#38BDF8"
                      fill="#38BDF8"
                      fillOpacity={0.08}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-100">Environmental Telemetry</h3>
                <p className="text-xs text-slate-500">AQI, PM2.5 (µg/m³), and ambient noise (dB)</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.envTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="timeLabel" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="avgAqi" name="AQI" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avgNoise" name="Noise (dB)" stroke="#06B6D4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avgPm25" name="PM2.5" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-100">Energy Demand by Zone</h3>
                <p className="text-xs text-slate-500">Daily electricity consumption (MWh) &amp; renewable mix (%)</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.resourceByZone}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="zone" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }}
                    />
                    <Bar dataKey="energyMwh" name="Energy (MWh)" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="renewablePct" name="Renewable (%)" fill="#16A34A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-100">Water Demand &amp; Reservoir Reserves</h3>
                <p className="text-xs text-slate-500">Daily draw (ML) vs. reserve capacity (%)</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.resourceByZone}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="zone" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }}
                    />
                    <Bar dataKey="waterMl" name="Usage (ML)" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="reservoirPct" name="Reservoir (%)" fill="#0EA5E9" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Alerts, Incidents & Zone Performance Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80">
                <h3 className="text-sm font-semibold text-slate-100">Recent City Alerts</h3>
              </div>
              <div className="divide-y divide-slate-800/60">
                {data.recentAlerts.map((al) => (
                  <div key={al.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate">{al.title}</div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{al.message}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        {al.zone_code ?? 'CITY'} · {al.category} · {formatTimestamp(al.created_at)}
                      </div>
                    </div>
                    <StatusText status={al.severity} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80">
                <h3 className="text-sm font-semibold text-slate-100">Recent Emergency Incidents</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                      <th className="py-2.5 px-4 font-medium">Incident</th>
                      <th className="py-2.5 px-4 font-medium">Zone</th>
                      <th className="py-2.5 px-4 font-medium">Priority</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {data.recentIncidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-200 font-medium max-w-[200px] truncate">
                          {inc.title}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{inc.zone_code}</td>
                        <td className="py-3 px-4">
                          <StatusText status={inc.priority} />
                        </td>
                        <td className="py-3 px-4 text-slate-300">{inc.status.replaceAll('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Zone Performance Summary */}
          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">Zone Performance Statistics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Code</th>
                    <th className="py-3 px-4 font-medium">Zone Name</th>
                    <th className="py-3 px-4 font-medium">Classification</th>
                    <th className="py-3 px-4 font-medium text-right">Population</th>
                    <th className="py-3 px-4 font-medium text-right">Health Score</th>
                    <th className="py-3 px-4 font-medium">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {data.zones.map((z) => (
                    <tr key={z.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-cyan-400">{z.code}</td>
                      <td className="py-3 px-4 text-slate-100 font-medium">{z.name}</td>
                      <td className="py-3 px-4 text-slate-400">{z.zone_type}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {formatNumber(z.population)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-100">
                        {formatNumber(z.health_score, 1)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={z.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
