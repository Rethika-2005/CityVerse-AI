import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { KpiCard } from '../components/KpiCard';
import { StatusText } from '../components/StatusText';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import { formatNumber, formatTimestamp } from '../utils/formatters';

interface EnvRow {
  id: number;
  zone_id: number;
  zone_code: string;
  zone_name: string;
  aqi: number;
  pm25: number;
  pm10: number;
  water_quality_index: number;
  noise_db: number;
  co2_level: number;
  temperature_c: number;
  humidity_pct: number;
  pollution_level: string;
  is_simulated: number;
  recorded_at: string;
}

export function EnvironmentPage() {
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useApiData<{
    latest: EnvRow[];
    history: (EnvRow & { timeLabel: string })[];
  }>('/environment');
  const { data: zones } = useApiData<{ id: number; code: string; name: string }[]>('/locations');

  const [zoneId, setZoneId] = useState('1');
  const [pm25, setPm25] = useState('28.5');
  const [pm10, setPm10] = useState('56.0');
  const [aqi, setAqi] = useState('92');
  const [temperatureC, setTemperatureC] = useState('31.2');
  const [humidityPct, setHumidityPct] = useState('68');
  const [noiseDb, setNoiseDb] = useState('66.0');
  const [co2Level, setCo2Level] = useState('430');
  const [waterQualityIndex, setWaterQualityIndex] = useState('88');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const latest = data?.latest ?? [];
  const avgAqi = latest.length ? Math.round(latest.reduce((s, r) => s + r.aqi, 0) / latest.length) : 0;
  const avgWqi = latest.length ? latest.reduce((s, r) => s + r.water_quality_index, 0) / latest.length : 0;
  const maxNoise = latest.length ? Math.max(...latest.map((r) => r.noise_db)) : 0;
  const avgTemp = latest.length ? latest.reduce((s, r) => s + r.temperature_c, 0) / latest.length : 0;

  async function handleLogReading(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.post<{ message: string; agentAnalysis: { issue?: string; recommendation?: string } | string }>(
        '/environment/reading',
        {
          zoneId: Number(zoneId),
          aqi: Number(aqi),
          pm25: Number(pm25),
          pm10: Number(pm10),
          noiseDb: Number(noiseDb),
          co2Level: Number(co2Level),
          temperatureC: Number(temperatureC),
          humidityPct: Number(humidityPct),
          waterQualityIndex: Number(waterQualityIndex),
          recordedAt,
        }
      );
      const analysis =
        typeof res.data.agentAnalysis === 'string'
          ? res.data.agentAnalysis
          : `${res.data.agentAnalysis.issue ?? ''} — ${res.data.agentAnalysis.recommendation ?? ''}`;
      setFeedback(`${res.data.message} Agent Output: ${analysis}`);
      await reload();
    } catch {
      setFeedback('Failed to record environmental reading.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-50 tracking-tight">Environmental Monitoring</h2>
        <p className="text-xs text-slate-400 mt-1">
          Submit PM2.5, PM10, AQI, CO2, noise, temperature, humidity, and water quality readings with Environmental Agent evaluation
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 bg-cyan-950/40 border border-cyan-700/50 rounded-md text-xs text-cyan-200">
          {feedback}
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
            <KpiCard
              title="Mean City AQI"
              value={`${avgAqi} AQI`}
              subtitle="Air quality composite"
              tone={avgAqi >= 105 ? 'critical' : avgAqi >= 60 ? 'warn' : 'good'}
            />
            <KpiCard
              title="Water Quality Index"
              value={`${formatNumber(avgWqi, 1)} / 100`}
              subtitle="Treatment & distribution purity"
              tone={avgWqi >= 88 ? 'good' : 'warn'}
            />
            <KpiCard
              title="Peak Ambient Noise"
              value={`${formatNumber(maxNoise, 1)} dB`}
              subtitle="Industrial & freight corridors"
              tone={maxNoise >= 78 ? 'warn' : 'default'}
            />
            <KpiCard
              title="Mean Ambient Temp"
              value={`${formatNumber(avgTemp, 1)} °C`}
              subtitle="Microclimate sensor average"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className={`${isAdmin ? 'xl:col-span-7' : 'xl:col-span-12'} bg-[#0D1526] border border-slate-800/80 rounded-lg p-5`}>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-100">Pollution &amp; Noise Readings Over Time</h3>
                <p className="text-xs text-slate-500">Latest historical sensor logs across city zones</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...(data?.history ?? [])].reverse().slice(-18)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="timeLabel" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }} />
                    <Line type="monotone" dataKey="aqi" name="AQI" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#06B6D4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pm10" name="PM10" stroke="#38BDF8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {isAdmin && (
              <div className="xl:col-span-5 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Environmental Data Input Form</h3>
                  <p className="text-xs text-slate-500">Stores reading &amp; triggers Environmental Agent analysis</p>
                </div>
                <form onSubmit={handleLogReading} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">City Zone</label>
                    <select
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
                    >
                      {(zones ?? []).map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.code} · {z.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">PM2.5 (µg/m³)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={pm25}
                        onChange={(e) => setPm25(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">PM10 (µg/m³)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={pm10}
                        onChange={(e) => setPm10(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">AQI</label>
                      <input
                        type="number"
                        required
                        value={aqi}
                        onChange={(e) => setAqi(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={temperatureC}
                        onChange={(e) => setTemperatureC(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Humidity (%)</label>
                      <input
                        type="number"
                        required
                        value={humidityPct}
                        onChange={(e) => setHumidityPct(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Noise (dB)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={noiseDb}
                        onChange={(e) => setNoiseDb(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">CO2 (ppm)</label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={co2Level}
                        onChange={(e) => setCo2Level(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Water Quality</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={waterQualityIndex}
                        onChange={(e) => setWaterQualityIndex(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Recorded Date</label>
                      <input
                        type="datetime-local"
                        value={recordedAt}
                        onChange={(e) => setRecordedAt(e.target.value)}
                        className="w-full px-2 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    {saving ? 'Recording & Analyzing...' : 'Submit Environmental Reading'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">Environmental Readings History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Zone</th>
                    <th className="py-3 px-4 font-medium text-right">AQI</th>
                    <th className="py-3 px-4 font-medium text-right">PM2.5 / PM10</th>
                    <th className="py-3 px-4 font-medium text-right">CO2</th>
                    <th className="py-3 px-4 font-medium text-right">Noise</th>
                    <th className="py-3 px-4 font-medium text-right">Water Q</th>
                    <th className="py-3 px-4 font-medium">Classification</th>
                    <th className="py-3 px-4 font-medium">Source / Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {(data?.history ?? latest).slice(0, 20).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <span className="font-mono text-cyan-400 mr-2">{r.zone_code}</span>
                        <span className="text-slate-100 font-medium">{r.zone_name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-100">{r.aqi}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {r.pm25} / {r.pm10 ?? '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {r.co2_level ?? '—'} ppm
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">{r.noise_db} dB</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {formatNumber(r.water_quality_index, 1)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={r.pollution_level} />
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {r.is_simulated ? 'Simulated' : 'Operator'} · {formatTimestamp(r.recorded_at)}
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
