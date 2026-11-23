import React, { useState } from 'react';
import { Play, Cpu, Check } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { StatusText } from '../components/StatusText';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import { formatTimestamp } from '../utils/formatters';

interface AgentRow {
  id: number;
  agent_key: string;
  name: string;
  domain: string;
  status: string;
  last_run_at: string;
  findings_count: number;
  confidence_score: number;
}

interface ActivityRow {
  id: number;
  agent_name: string;
  zone_code: string | null;
  severity: string;
  detected_issue: string;
  analysis_summary: string;
  recommendation: string;
  coordinated_batch_id: string;
  created_at: string;
}

interface RecommendationRow {
  id: number;
  batch_id: string;
  summary: string;
  priorityActions: string[];
  contributingAgents: string[];
  status: string;
  created_at: string;
}

export function MultiAgentPage() {
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useApiData<{
    agents: AgentRow[];
    activities: ActivityRow[];
    recommendations: RecommendationRow[];
  }>('/agents');

  const [running, setRunning] = useState(false);

  async function handleRunCycle(withTick: boolean) {
    setRunning(true);
    try {
      await api.post(withTick ? '/agents/simulate-tick' : '/agents/coordinate');
      await reload();
    } finally {
      setRunning(false);
    }
  }

  async function handleUpdateRec(id: number, status: 'ACKNOWLEDGED' | 'APPLIED') {
    await api.patch(`/agents/recommendations/${id}`, { status });
    await reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">
            Multi-Agent AI Coordination Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Five autonomous domain agents reporting anomalies to the Central Coordination Service
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleRunCycle(false)}
              disabled={running}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#0D1526] hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Run Coordination Cycle</span>
            </button>
            <button
              type="button"
              onClick={() => handleRunCycle(true)}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{running ? 'Running Agents...' : 'Simulate Tick & Coordinate'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/70 rounded-lg text-sm text-rose-200">{error}</div>
      )}

      {loading && !data ? (
        <div className="space-y-6">
          <SkeletonGrid count={5} />
          <SkeletonTable rows={6} />
        </div>
      ) : data ? (
        <>
          {/* 5 Autonomous Agent Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {data.agents.map((ag) => (
              <div key={ag.id} className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusText status={ag.status} />
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {(ag.confidence_score * 100).toFixed(0)}% conf
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{ag.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{ag.domain}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>{ag.findings_count} findings</span>
                  <span>{formatTimestamp(ag.last_run_at)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Central Coordination History */}
          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">Central AI Coordination History</h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {data.recommendations.map((rec) => (
                <div key={rec.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-cyan-400">{rec.batch_id}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{formatTimestamp(rec.created_at)}</span>
                      <span className="text-slate-500">·</span>
                      <StatusText status={rec.status} />
                    </div>
                    {isAdmin && rec.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateRec(rec.id, 'ACKNOWLEDGED')}
                          className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRec(rec.id, 'APPLIED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded cursor-pointer"
                        >
                          <Check className="w-3 h-3" aria-hidden="true" />
                          <span>Apply Plan</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-100">{rec.summary}</p>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {rec.priorityActions.map((act, idx) => (
                      <li key={idx} className="pl-3 border-l border-slate-700">
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Activities Log */}
          <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-100">Agent Activity &amp; Anomaly Feed</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Agent</th>
                    <th className="py-3 px-4 font-medium">Zone</th>
                    <th className="py-3 px-4 font-medium">Severity</th>
                    <th className="py-3 px-4 font-medium">Detected Condition</th>
                    <th className="py-3 px-4 font-medium">Recommendation</th>
                    <th className="py-3 px-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {data.activities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-100 font-medium whitespace-nowrap">{act.agent_name}</td>
                      <td className="py-3 px-4 font-mono text-cyan-400">{act.zone_code ?? 'CITY'}</td>
                      <td className="py-3 px-4">
                        <StatusText status={act.severity} />
                      </td>
                      <td className="py-3 px-4 text-slate-200 max-w-xs">{act.detected_issue}</td>
                      <td className="py-3 px-4 text-slate-400 max-w-sm">{act.recommendation}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatTimestamp(act.created_at)}
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
