import React from 'react';
import { Link } from 'react-router-dom';
import { Siren, MessageSquareCode, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { KpiCard } from '../components/KpiCard';
import { StatusText } from '../components/StatusText';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { formatNumber, formatTimestamp } from '../utils/formatters';

interface ZoneOverview {
  id: number;
  code: string;
  name: string;
  zone_type: string;
  health_score: number;
  status: string;
  traffic?: { corridor_name: string; congestion_index: number; congestion_level: string; suggested_reroute: string };
  environment?: { aqi: number; pollution_level: string; temperature_c: number; water_quality_index: number };
  water?: { reservoir_pct: number };
  energy?: { renewable_pct: number };
}

export function CitizenDashboardPage() {
  const { user } = useAuth();
  const { data: zones, loading } = useApiData<ZoneOverview[]>('/zones');
  const { data: overview } = useApiData<{
    kpis: {
      overallCityHealthScore: number;
      airQualityIndex: number;
      trafficCongestionPct: number;
      activeEmergencyIncidents: number;
    };
    recentAlerts: { id: number; title: string; message: string; severity: string; zone_code: string; created_at: string }[];
  }>('/dashboard/overview');

  const preferredZone =
    zones?.find((z) => z.code === user?.zonePreference) ?? zones?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">
            Welcome, {user?.fullName}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Citizen Service Overview · Primary Zone {preferredZone?.code ?? user?.zonePreference} · Live Public Telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/emergencies"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-md transition-colors whitespace-nowrap"
          >
            <Siren className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Report Incident</span>
          </Link>
          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#0D1526] hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            <MessageSquareCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ask CityVerse AI</span>
          </Link>
        </div>
      </div>

      {loading && !overview ? (
        <SkeletonGrid count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="City Health Index"
            value={`${formatNumber(overview?.kpis.overallCityHealthScore, 1)} / 100`}
            subtitle="All municipal zones"
            tone={(overview?.kpis.overallCityHealthScore ?? 80) >= 82 ? 'good' : 'warn'}
          />
          <KpiCard
            title={`${preferredZone?.code ?? 'Local'} Air Quality`}
            value={`${preferredZone?.environment?.aqi ?? overview?.kpis.airQualityIndex ?? '—'} AQI`}
            subtitle={preferredZone?.environment?.pollution_level ?? 'Monitored'}
            tone={(preferredZone?.environment?.aqi ?? 50) >= 105 ? 'critical' : 'good'}
          />
          <KpiCard
            title={`${preferredZone?.code ?? 'Local'} Traffic`}
            value={`${preferredZone?.traffic?.congestion_index ?? '—'}%`}
            subtitle={preferredZone?.traffic?.corridor_name ?? 'Corridor status'}
            tone={(preferredZone?.traffic?.congestion_index ?? 40) >= 70 ? 'warn' : 'good'}
          />
          <KpiCard
            title="Active City Advisories"
            value={formatNumber(overview?.kpis.activeEmergencyIncidents)}
            subtitle="Public safety dispatches"
            tone={(overview?.kpis.activeEmergencyIncidents ?? 0) > 2 ? 'warn' : 'default'}
          />
        </div>
      )}

      {preferredZone && (
        <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Your Zone: {preferredZone.name} ({preferredZone.code})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {preferredZone.zone_type} District · Temperature {preferredZone.environment?.temperature_c ?? '—'} °C · Water Quality {preferredZone.environment?.water_quality_index ?? '—'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusText status={preferredZone.status} />
              <Link
                to="/digital-twin"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300"
              >
                <Map className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open Digital Twin</span>
              </Link>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Recommended Mobility Route: </span>
            <span>{preferredZone.traffic?.suggested_reroute ?? 'Nominal street traffic conditions.'}</span>
          </div>
        </div>
      )}

      <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-100">Public Municipal Alerts</h3>
        </div>
        <div className="divide-y divide-slate-800/60">
          {(overview?.recentAlerts ?? []).map((al) => (
            <div key={al.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-100">{al.title}</div>
                <p className="text-xs text-slate-400 mt-0.5">{al.message}</p>
                <div className="text-xs text-slate-500 mt-1">
                  {al.zone_code ?? 'CITY'} · {formatTimestamp(al.created_at)}
                </div>
              </div>
              <StatusText status={al.severity} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
