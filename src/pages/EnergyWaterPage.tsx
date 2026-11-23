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
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { KpiCard } from '../components/KpiCard';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import { formatNumber } from '../utils/formatters';

interface ResourceResponse {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  latestEnergy: {
    zone_code: string;
    zone_name: string;
    consumption_mwh: number;
    renewable_pct: number;
    peak_demand_mw: number;
    grid_load_pct: number;
    power_outages: number;
  }[];
  latestWater: {
    zone_code: string;
    zone_name: string;
    total_supply_ml: number;
    consumption_ml: number;
    reservoir_pct: number;
    leakage_pct: number;
    leakage_status: string;
  }[];
  recommendations: string[];
}

export function EnergyWaterPage() {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const { data, loading, error, reload } = useApiData<ResourceResponse>(`/resources?period=${period}`, [period]);
  const { data: zones } = useApiData<{ id: number; code: string; name: string }[]>('/locations');

  // Energy Form State
  const [eZoneId, setEZoneId] = useState('1');
  const [totalEnergy, setTotalEnergy] = useState('165');
  const [renewableEnergy, setRenewableEnergy] = useState('72');
  const [nonRenewableEnergy, setNonRenewableEnergy] = useState('93');
  const [streetLightCount, setStreetLightCount] = useState('2200');
  const [activeStreetLights, setActiveStreetLights] = useState('2150');
  const [powerOutages, setPowerOutages] = useState('0');
  const [peakDemandMw, setPeakDemandMw] = useState('29.5');
  const [energyDate, setEnergyDate] = useState(() => new Date().toISOString().slice(0, 16));

  // Water Form State
  const [wZoneId, setWZoneId] = useState('1');
  const [totalWaterSupply, setTotalWaterSupply] = useState('52');
  const [waterConsumption, setWaterConsumption] = useState('41');
  const [waterTankLevel, setWaterTankLevel] = useState('74');
  const [waterQuality, setWaterQuality] = useState('91');
  const [leakageStatus, setLeakageStatus] = useState('NORMAL');
  const [waterPressure, setWaterPressure] = useState('4.4');
  const [rainfall, setRainfall] = useState('2.5');
  const [waterDate, setWaterDate] = useState(() => new Date().toISOString().slice(0, 16));

  const [savingEnergy, setSavingEnergy] = useState(false);
  const [savingWater, setSavingWater] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleEnergySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEnergy(true);
    setFeedback(null);
    try {
      const res = await api.post<{ message: string; agentAnalysis: { issue?: string; recommendation?: string } | string }>(
        '/energy',
        {
          zoneId: Number(eZoneId),
          totalEnergyConsumption: Number(totalEnergy),
          renewableEnergy: Number(renewableEnergy),
          nonRenewableEnergy: Number(nonRenewableEnergy),
          streetLightCount: Number(streetLightCount),
          activeStreetLights: Number(activeStreetLights),
          powerOutages: Number(powerOutages),
          peakDemandMw: Number(peakDemandMw),
          recordedAt: energyDate,
        }
      );
      const analysis =
        typeof res.data.agentAnalysis === 'string'
          ? res.data.agentAnalysis
          : `${res.data.agentAnalysis.issue ?? ''} — ${res.data.agentAnalysis.recommendation ?? ''}`;
      setFeedback(`${res.data.message} Agent Output: ${analysis}`);
      await reload();
    } catch {
      setFeedback('Failed to store energy consumption reading.');
    } finally {
      setSavingEnergy(false);
    }
  }

  async function handleWaterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingWater(true);
    setFeedback(null);
    try {
      const res = await api.post<{ message: string; agentAnalysis: { issue?: string; recommendation?: string } | string }>(
        '/water',
        {
          zoneId: Number(wZoneId),
          totalWaterSupply: Number(totalWaterSupply),
          waterConsumption: Number(waterConsumption),
          waterTankLevel: Number(waterTankLevel),
          waterQuality: Number(waterQuality),
          leakageStatus,
          waterPressure: Number(waterPressure),
          rainfall: Number(rainfall),
          recordedAt: waterDate,
        }
      );
      const analysis =
        typeof res.data.agentAnalysis === 'string'
          ? res.data.agentAnalysis
          : `${res.data.agentAnalysis.issue ?? ''} — ${res.data.agentAnalysis.recommendation ?? ''}`;
      setFeedback(`${res.data.message} Agent Output: ${analysis}`);
      await reload();
    } catch {
      setFeedback('Failed to store water resource reading.');
    } finally {
      setSavingWater(false);
    }
  }

  const totalMwh = (data?.latestEnergy ?? []).reduce((s, r) => s + r.consumption_mwh, 0);
  const avgRenewable = data?.latestEnergy.length
    ? data.latestEnergy.reduce((s, r) => s + r.renewable_pct, 0) / data.latestEnergy.length
    : 0;
  const totalWaterMl = (data?.latestWater ?? []).reduce((s, r) => s + r.consumption_ml, 0);
  const avgReservoir = data?.latestWater.length
    ? data.latestWater.reduce((s, r) => s + r.reservoir_pct, 0) / data.latestWater.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">
            Smart Energy &amp; Water Resource Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Input energy &amp; water telemetry, analyze consumption patterns, and trigger Energy &amp; Water AI Agents
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0D1526] border border-slate-800 rounded-lg shrink-0">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                period === p ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
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
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title={`${period.charAt(0) + period.slice(1).toLowerCase()} Electricity Draw`}
              value={`${formatNumber(totalMwh, 1)} MWh`}
              subtitle="Total grid demand"
            />
            <KpiCard
              title="Mean Renewable Mix"
              value={`${formatNumber(avgRenewable, 1)}%`}
              subtitle="Solar & wind share"
              tone={avgRenewable >= 50 ? 'good' : 'warn'}
            />
            <KpiCard
              title={`${period.charAt(0) + period.slice(1).toLowerCase()} Water Consumption`}
              value={`${formatNumber(totalWaterMl, 1)} ML`}
              subtitle="Municipal distribution total"
            />
            <KpiCard
              title="Mean Tank / Reservoir Level"
              value={`${formatNumber(avgReservoir, 1)}%`}
              subtitle="Storage capacity across zones"
              tone={avgReservoir <= 50 ? 'critical' : avgReservoir <= 68 ? 'warn' : 'good'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-1">
                Electricity Consumption ({period.toLowerCase()})
              </h3>
              <p className="text-xs text-slate-500 mb-4">MWh consumption vs. grid load % by zone</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.latestEnergy}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="zone_name" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }} />
                    <Bar dataKey="consumption_mwh" name="Consumption (MWh)" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="grid_load_pct" name="Grid Load (%)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-1">
                Water Supply &amp; Tank Reserves ({period.toLowerCase()})
              </h3>
              <p className="text-xs text-slate-500 mb-4">Tank level % vs. distribution leakage %</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.latestWater}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="zone_name" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A1120', borderColor: '#334155', fontSize: 12 }} />
                    <Bar dataKey="reservoir_pct" name="Tank Level (%)" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="leakage_pct" name="Leakage (%)" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Energy Data Input Form */}
              <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Energy Data Input Form</h3>
                  <p className="text-xs text-slate-500">Updates grid analytics &amp; triggers Energy Management Agent</p>
                </div>
                <form onSubmit={handleEnergySubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">City Zone</label>
                      <select
                        value={eZoneId}
                        onChange={(e) => setEZoneId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                      >
                        {(zones ?? []).map((z) => (
                          <option key={z.id} value={z.id}>{z.code} · {z.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Recorded Date</label>
                      <input
                        type="datetime-local"
                        value={energyDate}
                        onChange={(e) => setEnergyDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Total Energy (MWh)</label>
                      <input type="number" step="0.1" required value={totalEnergy} onChange={(e) => setTotalEnergy(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Renewable (MWh)</label>
                      <input type="number" step="0.1" required value={renewableEnergy} onChange={(e) => setRenewableEnergy(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Non-Ren (MWh)</label>
                      <input type="number" step="0.1" required value={nonRenewableEnergy} onChange={(e) => setNonRenewableEnergy(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Street Lights</label>
                      <input type="number" required value={streetLightCount} onChange={(e) => setStreetLightCount(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Active Lights</label>
                      <input type="number" required value={activeStreetLights} onChange={(e) => setActiveStreetLights(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Power Outages</label>
                      <input type="number" min={0} required value={powerOutages} onChange={(e) => setPowerOutages(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Peak Demand (MW)</label>
                    <input type="number" step="0.1" required value={peakDemandMw} onChange={(e) => setPeakDemandMw(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                  </div>
                  <button
                    type="submit"
                    disabled={savingEnergy}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold rounded-md cursor-pointer"
                  >
                    {savingEnergy ? 'Submitting Energy Data...' : 'Submit Energy Reading'}
                  </button>
                </form>
              </div>

              {/* Water Resource Input Form */}
              <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Water Resource Input Form</h3>
                  <p className="text-xs text-slate-500">Updates reservoir analytics &amp; triggers Water Management Agent</p>
                </div>
                <form onSubmit={handleWaterSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">City Zone</label>
                      <select
                        value={wZoneId}
                        onChange={(e) => setWZoneId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                      >
                        {(zones ?? []).map((z) => (
                          <option key={z.id} value={z.id}>{z.code} · {z.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Recorded Date</label>
                      <input
                        type="datetime-local"
                        value={waterDate}
                        onChange={(e) => setWaterDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Supply (ML)</label>
                      <input type="number" step="0.1" required value={totalWaterSupply} onChange={(e) => setTotalWaterSupply(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Consumption (ML)</label>
                      <input type="number" step="0.1" required value={waterConsumption} onChange={(e) => setWaterConsumption(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Tank Level (%)</label>
                      <input type="number" step="0.1" required value={waterTankLevel} onChange={(e) => setWaterTankLevel(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Water Quality</label>
                      <input type="number" step="0.1" required value={waterQuality} onChange={(e) => setWaterQuality(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Pressure (bar)</label>
                      <input type="number" step="0.1" required value={waterPressure} onChange={(e) => setWaterPressure(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Rainfall (mm)</label>
                      <input type="number" step="0.1" required value={rainfall} onChange={(e) => setRainfall(e.target.value)} className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Leakage Status</label>
                    <select
                      value={leakageStatus}
                      onChange={(e) => setLeakageStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="MINOR_LEAK">MINOR LEAK</option>
                      <option value="INSPECTION_REQUIRED">INSPECTION REQUIRED</option>
                      <option value="CRITICAL_LEAK">CRITICAL LEAK</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={savingWater}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold rounded-md cursor-pointer"
                  >
                    {savingWater ? 'Submitting Water Data...' : 'Submit Water Reading'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Resource Optimization Recommendations</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="p-3 bg-[#070D19] border border-slate-800/70 rounded-md">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
