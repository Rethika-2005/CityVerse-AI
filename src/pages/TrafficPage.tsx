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
import { RefreshCw, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { KpiCard } from '../components/KpiCard';
import { StatusText } from '../components/StatusText';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import { formatNumber, formatTimestamp } from '../utils/formatters';

interface TrafficRow {
  id: number;
  zone_id: number;
  zone_code: string;
  zone_name: string;
  corridor_name: string;
  vehicle_count: number;
  avg_speed_kmh: number;
  congestion_index: number;
  congestion_level: string;
  traffic_density: string;
  road_capacity: number;
  accident_count: number;
  weather_condition: string;
  suggested_reroute: string;
  is_simulated: number;
  recorded_at: string;
}

export function TrafficPage() {
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useApiData<{ latest: TrafficRow[]; records: TrafficRow[] }>('/traffic');
  const { data: cities } = useApiData<{ id: number; name: string }[]>('/cities');
  const { data: zones } = useApiData<{ id: number; code: string; name: string }[]>('/locations');

  const [cityId, setCityId] = useState('1');
  const [zoneId, setZoneId] = useState('1');
  const [roadName, setRoadName] = useState('');
  const [vehicleCount, setVehicleCount] = useState('4200');
  const [trafficDensity, setTrafficDensity] = useState('HIGH');
  const [avgSpeed, setAvgSpeed] = useState('28.5');
  const [roadCapacity, setRoadCapacity] = useState('5200');
  const [accidentCount, setAccidentCount] = useState('0');
  const [weatherCondition, setWeatherCondition] = useState('Clear');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));

  const [simulating, setSimulating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<string | null>(null);

  async function handleSimulate() {
    setSimulating(true);
    try {
      await api.post('/traffic/simulate');
      await reload();
    } finally {
      setSimulating(false);
    }
  }

  async function handleSubmitTraffic(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setAgentFeedback(null);
    try {
      const res = await api.post<{ message: string; agentAnalysis: { issue?: string; recommendation?: string } | string }>(
        '/traffic',
        {
          cityId: Number(cityId),
          zoneId: Number(zoneId),
          roadName,
          vehicleCount: Number(vehicleCount),
          trafficDensity,
          avgSpeed: Number(avgSpeed),
          roadCapacity: Number(roadCapacity),
          accidentCount: Number(accidentCount),
          weatherCondition,
          recordedAt,
        }
      );
      const analysis =
        typeof res.data.agentAnalysis === 'string'
          ? res.data.agentAnalysis
          : `${res.data.agentAnalysis.issue ?? ''} — ${res.data.agentAnalysis.recommendation ?? ''}`;
      setAgentFeedback(`${res.data.message} Agent Output: ${analysis}`);
      setRoadName('');
      await reload();
    } catch (err: unknown) {
      setAgentFeedback(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to submit traffic record.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const latest = data?.latest ?? [];
  const totalVehicles = latest.reduce((s, r) => s + r.vehicle_count, 0);
  const avgCitySpeed = latest.length ? latest.reduce((s, r) => s + r.avg_speed_kmh, 0) / latest.length : 0;
  const maxCongestion = latest.length ? Math.max(...latest.map((r) => r.congestion_index)) : 0;
  const congestedCount = latest.filter((r) => r.congestion_index >= 65).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">
            Intelligent Traffic Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit road traffic telemetry, update corridor statistics, and trigger Traffic Management Agent analysis
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{simulating ? 'Updating Traffic...' : 'Simulate Traffic Pulse'}</span>
          </button>
        )}
      </div>

      {agentFeedback && (
        <div className="p-3.5 bg-cyan-950/40 border border-cyan-700/50 rounded-md text-xs text-cyan-200">
          {agentFeedback}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/70 rounded-lg text-sm text-rose-200">{error}</div>
      )}

      {loading && !data ? (
        <div className="space-y-6">
          <SkeletonGrid count={4} />
          <SkeletonTable rows={6} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Active Vehicles Tracked" value={formatNumber(totalVehicles)} subtitle="Across monitored corridors" />
            <KpiCard title="Mean Corridor Speed" value={`${formatNumber(avgCitySpeed, 1)} km/h`} subtitle="City-wide mobility flow" />
            <KpiCard
              title="Peak Congestion Index"
              value={`${formatNumber(maxCongestion)}%`}
              subtitle="Highest corridor load"
              tone={maxCongestion >= 80 ? 'critical' : maxCongestion >= 65 ? 'warn' : 'good'}
            />
            <KpiCard
              title="Congested Corridors"
              value={`${congestedCount} / ${latest.length}`}
              subtitle="Index >= 65% threshold"
              tone={congestedCount > 1 ? 'warn' : 'good'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className={`${isAdmin ? 'xl:col-span-7' : 'xl:col-span-12'} bg-[#0D1526] border border-slate-800/80 rounded-lg p-5`}>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-100">Corridor Congestion vs. Speed</h3>
                <p className="text-xs text-slate-500">Current congestion percentage and average velocity by zone</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latest}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="zone_name" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }} />
                    <Bar dataKey="congestion_index" name="Congestion (%)" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="avg_speed_kmh" name="Avg Speed (km/h)" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {isAdmin && (
              <div className="xl:col-span-5 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Traffic Data Input Form</h3>
                  <p className="text-xs text-slate-500">Stores reading &amp; triggers Traffic Management Agent</p>
                </div>
                <form onSubmit={handleSubmitTraffic} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">City</label>
                      <select
                        value={cityId}
                        onChange={(e) => setCityId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                      >
                        {(cities ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">City Zone</label>
                      <select
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                      >
                        {(zones ?? []).map((z) => (
                          <option key={z.id} value={z.id}>{z.code} · {z.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Road Name</label>
                    <input
                      type="text"
                      required
                      value={roadName}
                      onChange={(e) => setRoadName(e.target.value)}
                      placeholder="e.g., 2nd Avenue / Usman Road"
                      className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Vehicle Count</label>
                      <input
                        type="number"
                        required
                        value={vehicleCount}
                        onChange={(e) => setVehicleCount(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Avg Speed (km/h)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={avgSpeed}
                        onChange={(e) => setAvgSpeed(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Road Capacity</label>
                      <input
                        type="number"
                        required
                        value={roadCapacity}
                        onChange={(e) => setRoadCapacity(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Traffic Density</label>
                      <select
                        value={trafficDensity}
                        onChange={(e) => setTrafficDensity(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MODERATE">MODERATE</option>
                        <option value="HIGH">HIGH</option>
                        <option value="SEVERE">SEVERE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Accidents</label>
                      <input
                        type="number"
                        min={0}
                        value={accidentCount}
                        onChange={(e) => setAccidentCount(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Weather</label>
                      <select
                        value={weatherCondition}
                        onChange={(e) => setWeatherCondition(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                      >
                        <option value="Clear">Clear</option>
                        <option value="Light Rain">Light Rain</option>
                        <option value="Heavy Rain">Heavy Rain</option>
                        <option value="Humid Haze">Humid Haze</option>
                        <option value="Coastal Fog">Coastal Fog</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Recorded Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={recordedAt}
                      onChange={(e) => setRecordedAt(e.target.value)}
                      className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{submitting ? 'Submitting & Analyzing...' : 'Submit Traffic Reading'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">Traffic Monitoring Records &amp; Agent Advisories</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Zone</th>
                    <th className="py-3 px-4 font-medium">Road / Corridor</th>
                    <th className="py-3 px-4 font-medium text-right">Vehicles / Cap</th>
                    <th className="py-3 px-4 font-medium text-right">Speed</th>
                    <th className="py-3 px-4 font-medium text-right">Accidents</th>
                    <th className="py-3 px-4 font-medium">Weather</th>
                    <th className="py-3 px-4 font-medium">Density</th>
                    <th className="py-3 px-4 font-medium">Source / Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {(data?.records ?? latest).slice(0, 20).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <span className="font-mono text-cyan-400 mr-1.5">{row.zone_code}</span>
                        <span className="text-slate-200">{row.zone_name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-100 font-medium">{row.corridor_name}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {formatNumber(row.vehicle_count)} / {formatNumber(row.road_capacity)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {formatNumber(row.avg_speed_kmh, 1)} km/h
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-200">
                        {row.accident_count ?? 0}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{row.weather_condition || 'Clear'}</td>
                      <td className="py-3 px-4">
                        <StatusText status={row.congestion_level} />
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {row.is_simulated ? 'Simulated' : 'Operator'} · {formatTimestamp(row.recorded_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
