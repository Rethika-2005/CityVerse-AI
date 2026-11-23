import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { RefreshCw, Play } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { StatusText } from '../components/StatusText';
import { SkeletonTable } from '../components/SkeletonLoader';

interface PredictionRow {
  id: number;
  zone_code: string;
  zone_name: string;
  domain: 'TRAFFIC' | 'AIR_POLLUTION' | 'ENERGY' | 'WATER_DEMAND';
  model_type: string;
  horizon_hours: number;
  current_value: number;
  predicted_value: number;
  unit: string;
  risk_level: string;
  confidence_pct: number;
  is_simulated: number;
  forecastSeries: { label: string; actual: number | null; forecast: number | null }[];
}

interface CustomForecastResult {
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  domain: 'TRAFFIC' | 'AIR_POLLUTION' | 'ENERGY' | 'WATER_DEMAND';
  horizonHours: number;
  currentValue: number;
  predictedValue: number;
  unit: string;
  riskLevel: string;
  confidencePct: number;
  isSimulated: boolean;
  modelType: string;
  recommendation: string;
  forecastSeries: { label: string; actual: number | null; forecast: number | null }[];
}

export function PredictiveAnalyticsPage() {
  const { isAdmin } = useAuth();
  const [domain, setDomain] = useState<'ALL' | 'TRAFFIC' | 'AIR_POLLUTION' | 'ENERGY' | 'WATER_DEMAND'>('ALL');
  const { data, loading, error, reload } = useApiData<{
    methodologyNote: string;
    predictions: PredictionRow[];
  }>(`/predictions?domain=${domain}`, [domain]);

  const { data: cities } = useApiData<{ id: number; name: string }[]>('/cities');
  const [selectedCityId, setSelectedCityId] = useState<string>('1');
  const { data: locations } = useApiData<{ id: number; code: string; name: string }[]>(
    `/locations?cityId=${selectedCityId}`,
    [selectedCityId]
  );

  // Interactive Forecast Builder
  const [builderZoneId, setBuilderZoneId] = useState<string>('1');
  const [builderCategory, setBuilderCategory] = useState<'TRAFFIC' | 'AIR_POLLUTION' | 'ENERGY' | 'WATER_DEMAND'>('TRAFFIC');
  const [historyLimit, setHistoryLimit] = useState<string>('10');
  const [durationHours, setDurationHours] = useState<string>('24');
  const [forecastRunning, setForecastRunning] = useState(false);
  const [customForecast, setCustomForecast] = useState<CustomForecastResult | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    if (locations && locations.length > 0 && !locations.some((l) => String(l.id) === builderZoneId)) {
      setBuilderZoneId(String(locations[0].id));
    }
  }, [locations, builderZoneId]);

  const predictions = data?.predictions ?? [];
  const activePred = predictions.find((p) => p.id === selectedId) ?? predictions[0];

  async function handleRunCustomForecast(e: React.FormEvent) {
    e.preventDefault();
    setForecastRunning(true);
    setForecastError(null);
    try {
      const res = await api.post<CustomForecastResult>('/predictions/forecast', {
        zoneId: Number(builderZoneId),
        category: builderCategory,
        historyLimit: Number(historyLimit),
        durationHours: Number(durationHours),
      });
      setCustomForecast(res.data);
    } catch (err: unknown) {
      setForecastError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Unable to generate zone forecast.'
      );
    } finally {
      setForecastRunning(false);
    }
  }

  async function handleRecompute() {
    setRecomputing(true);
    try {
      await api.post('/predictions/recompute');
      await reload();
    } finally {
      setRecomputing(false);
    }
  }

  const chartModel = customForecast
    ? {
        title: `${customForecast.zoneCode} · ${customForecast.zoneName} — ${customForecast.domain.replaceAll('_', ' ')} (+${customForecast.horizonHours}h Custom Forecast)`,
        subtitle: `Model: ${customForecast.modelType} · Confidence ${customForecast.confidencePct}% · Current ${customForecast.currentValue} ${customForecast.unit} -> Predicted ${customForecast.predictedValue} ${customForecast.unit} · Simulated Forecast`,
        riskLevel: customForecast.riskLevel,
        unit: customForecast.unit,
        horizonLabel: `+${customForecast.horizonHours}h Simulated Forecast`,
        recommendation: customForecast.recommendation,
        series: customForecast.forecastSeries,
      }
    : activePred
      ? {
          title: `${activePred.zone_code} · ${activePred.zone_name} — ${activePred.domain.replaceAll('_', ' ')} (+${activePred.horizon_hours}h)`,
          subtitle: `Model: ${activePred.model_type} · Confidence ${activePred.confidence_pct}% · Current ${activePred.current_value} ${activePred.unit} -> Predicted ${activePred.predicted_value} ${activePred.unit} · Simulated Forecast`,
          riskLevel: activePred.risk_level,
          unit: activePred.unit,
          horizonLabel: `+${activePred.horizon_hours}h Simulated Forecast`,
          recommendation: null as string | null,
          series: activePred.forecastSeries,
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">Predictive Analytics &amp; Forecasting</h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate zone-level forecasts from historical database readings · Clearly labeled simulated trend model
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#0D1526] border border-slate-800 rounded-lg">
            {(['ALL', 'TRAFFIC', 'AIR_POLLUTION', 'ENERGY', 'WATER_DEMAND'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDomain(d);
                  setCustomForecast(null);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  domain === d ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {d === 'ALL' ? 'All Domains' : d.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleRecompute}
              disabled={recomputing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{recomputing ? 'Computing...' : 'Recompute Matrix'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Forecast Selector Form */}
      <form
        onSubmit={handleRunCustomForecast}
        className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs"
      >
        <div>
          <label className="block text-slate-400 mb-1">City</label>
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
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
            value={builderZoneId}
            onChange={(e) => setBuilderZoneId(e.target.value)}
            className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
          >
            {(locations ?? []).map((z) => (
              <option key={z.id} value={z.id}>{z.code} · {z.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Prediction Category</label>
          <select
            value={builderCategory}
            onChange={(e) =>
              setBuilderCategory(e.target.value as 'TRAFFIC' | 'AIR_POLLUTION' | 'ENERGY' | 'WATER_DEMAND')
            }
            className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
          >
            <option value="TRAFFIC">Traffic Congestion</option>
            <option value="AIR_POLLUTION">Air Quality (AQI)</option>
            <option value="ENERGY">Energy Consumption</option>
            <option value="WATER_DEMAND">Water Demand</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Historical Data Period</label>
          <select
            value={historyLimit}
            onChange={(e) => setHistoryLimit(e.target.value)}
            className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
          >
            <option value="7">Last 7 Readings</option>
            <option value="14">Last 14 Readings</option>
            <option value="30">Last 30 Readings</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Prediction Duration</label>
          <select
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
          >
            <option value="24">Next 24 Hours</option>
            <option value="48">Next 48 Hours</option>
            <option value="72">Next 72 Hours</option>
            <option value="168">Next 7 Days (168h)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={forecastRunning}
          className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold rounded transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{forecastRunning ? 'Forecasting...' : 'Run Forecast'}</span>
        </button>
      </form>

      {forecastError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/70 rounded text-xs text-rose-200">{forecastError}</div>
      )}

      {data?.methodologyNote && (
        <div className="p-3.5 bg-[#0D1526] border border-slate-800/80 rounded-lg text-xs text-slate-300">
          <span className="font-semibold text-cyan-400 mr-2">Simulated Forecast Provenance:</span>
          <span>{data.methodologyNote}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/70 rounded-lg text-sm text-rose-200">{error}</div>
      )}

      {loading && !data ? (
        <SkeletonTable rows={8} />
      ) : (
        <>
          {chartModel && (
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{chartModel.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{chartModel.subtitle}</p>
                </div>
                <StatusText status={chartModel.riskLevel} label={`Risk: ${chartModel.riskLevel}`} />
              </div>

              {chartModel.recommendation && (
                <div className="p-3 bg-[#070D19] border border-slate-800/70 rounded text-xs text-slate-300">
                  <span className="font-semibold text-cyan-400 mr-1.5">Recommended Action:</span>
                  {chartModel.recommendation}
                </div>
              )}

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartModel.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name={`Historical (${chartModel.unit})`}
                      stroke="#38BDF8"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name={`${chartModel.horizonLabel} (${chartModel.unit})`}
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">Zone Forecast &amp; Risk Matrix (Click Row to Plot)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Zone</th>
                    <th className="py-3 px-4 font-medium">Domain</th>
                    <th className="py-3 px-4 font-medium text-right">Current</th>
                    <th className="py-3 px-4 font-medium text-right">+24h Forecast</th>
                    <th className="py-3 px-4 font-medium text-right">Confidence</th>
                    <th className="py-3 px-4 font-medium">Risk Class</th>
                    <th className="py-3 px-4 font-medium">Forecast Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {predictions.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setCustomForecast(null);
                        setSelectedId(p.id);
                      }}
                      className={`cursor-pointer transition-colors ${
                        !customForecast && activePred?.id === p.id ? 'bg-cyan-500/10' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-cyan-400 mr-2">{p.zone_code}</span>
                        <span className="text-slate-100 font-medium">{p.zone_name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{p.domain.replaceAll('_', ' ')}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {p.current_value} {p.unit}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-100 font-semibold">
                        {p.predicted_value} {p.unit}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-400">
                        {p.confidence_pct}%
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={p.risk_level} />
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {p.is_simulated ? 'Simulated Trend' : 'Verified ML'}
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
