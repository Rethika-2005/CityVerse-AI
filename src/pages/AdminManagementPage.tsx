import React, { useState } from 'react';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { StatusText } from '../components/StatusText';
import { SkeletonTable } from '../components/SkeletonLoader';
import { formatTimestamp, formatNumber } from '../utils/formatters';

interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  department: string;
  zone_preference: string;
  status: string;
}

interface InfraRow {
  id: number;
  zone_id: number;
  zone_code: string;
  zone_name: string;
  name: string;
  asset_type: string;
  status: string;
  load_pct: number;
  capacity_pct: number;
}

interface ZoneRow {
  id: number;
  code: string;
  name: string;
  zone_type: string;
  population: number;
  area_sq_km: number;
  health_score: number;
  status: string;
}

interface NotifRow {
  id: number;
  zone_code: string | null;
  title: string;
  message: string;
  severity: string;
  category: string;
  is_read: number;
  created_at: string;
}

export function AdminManagementPage() {
  const [tab, setTab] = useState<'users' | 'zones' | 'infrastructure' | 'alerts'>('users');
  const { data: users, loading: loadingUsers, reload: reloadUsers } = useApiData<AdminUser[]>('/admin/users');
  const { data: zones, reload: reloadZones } = useApiData<ZoneRow[]>('/zones');
  const { data: infra, reload: reloadInfra } = useApiData<InfraRow[]>('/infrastructure');
  const { data: alerts, reload: reloadAlerts } = useApiData<NotifRow[]>('/notifications');

  // Create User form state
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<'ROLE_CITIZEN' | 'ROLE_ADMIN'>('ROLE_CITIZEN');

  // Create Zone form state
  const [zCode, setZCode] = useState('');
  const [zName, setZName] = useState('');
  const [zType, setZType] = useState('MIXED');
  const [zPop, setZPop] = useState('75000');

  // Create Infrastructure form state
  const [iZoneId, setIZoneId] = useState('1');
  const [iName, setIName] = useState('');
  const [iType, setIType] = useState('SUBSTATION');
  const [msg, setMsg] = useState<string | null>(null);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    await api.post('/admin/users', { fullName: uName, email: uEmail, password: uPassword, role: uRole });
    setUName('');
    setUEmail('');
    setUPassword('');
    setMsg('User account created.');
    await reloadUsers();
  }

  async function handleToggleUserStatus(u: AdminUser) {
    const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await api.patch(`/admin/users/${u.id}`, { status: nextStatus });
    await reloadUsers();
  }

  async function handleCreateZone(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    await api.post('/admin/zones', { code: zCode, name: zName, zoneType: zType, population: Number(zPop) });
    setZCode('');
    setZName('');
    setMsg('City zone added.');
    await reloadZones();
  }

  async function handleCreateInfra(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    await api.post('/infrastructure', { zoneId: Number(iZoneId), name: iName, assetType: iType });
    setIName('');
    setMsg('Infrastructure asset registered.');
    await reloadInfra();
  }

  async function handleInfraStatus(id: number, status: string) {
    await api.patch(`/infrastructure/${id}`, { status });
    await reloadInfra();
  }

  async function handleMarkRead(id: number) {
    await api.patch(`/notifications/${id}/read`);
    await reloadAlerts();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">Administration &amp; Asset Console</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage municipal accounts, city sectors, critical infrastructure assets, and alert acknowledgements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0D1526] border border-slate-800 rounded-lg">
          {([
            ['users', 'Users & Roles'],
            ['zones', 'City Zones'],
            ['infrastructure', 'Infrastructure'],
            ['alerts', 'Alerts'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setMsg(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                tab === key ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-700/50 rounded-md text-xs text-cyan-200">{msg}</div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Provision User Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
              <input
                type="email"
                required
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
              <input
                type="password"
                required
                minLength={6}
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
                placeholder="Temporary Password (min 6)"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value as 'ROLE_CITIZEN' | 'ROLE_ADMIN')}
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              >
                <option value="ROLE_CITIZEN">ROLE_CITIZEN</option>
                <option value="ROLE_ADMIN">ROLE_ADMIN</option>
              </select>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-md cursor-pointer"
              >
                Create Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            {loadingUsers && !users ? (
              <SkeletonTable rows={4} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                      <th className="py-3 px-4 font-medium">Name</th>
                      <th className="py-3 px-4 font-medium">Email</th>
                      <th className="py-3 px-4 font-medium">Role</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {(users ?? []).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-100 font-medium">{u.full_name}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono">{u.email}</td>
                        <td className="py-3 px-4 text-cyan-400 font-mono">{u.role}</td>
                        <td className="py-3 px-4">
                          <StatusText status={u.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'zones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Add City Zone</h3>
            <form onSubmit={handleCreateZone} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={zCode}
                onChange={(e) => setZCode(e.target.value)}
                placeholder="Zone Code (e.g., Z-107)"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
              />
              <input
                type="text"
                required
                value={zName}
                onChange={(e) => setZName(e.target.value)}
                placeholder="District Name"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
              <select
                value={zType}
                onChange={(e) => setZType(e.target.value)}
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              >
                <option value="RESIDENTIAL">RESIDENTIAL</option>
                <option value="COMMERCIAL">COMMERCIAL</option>
                <option value="INDUSTRIAL">INDUSTRIAL</option>
                <option value="CIVIC">CIVIC</option>
                <option value="MIXED">MIXED</option>
              </select>
              <input
                type="number"
                required
                value={zPop}
                onChange={(e) => setZPop(e.target.value)}
                placeholder="Population"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
              />
              <button
                type="submit"
                className="w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-md cursor-pointer"
              >
                Register Zone
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Code</th>
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium text-right">Population</th>
                    <th className="py-3 px-4 font-medium text-right">Health</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {(zones ?? []).map((z) => (
                    <tr key={z.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-cyan-400">{z.code}</td>
                      <td className="py-3 px-4 text-slate-100 font-medium">{z.name}</td>
                      <td className="py-3 px-4 text-slate-400">{z.zone_type}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {formatNumber(z.population)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-100">
                        {z.health_score.toFixed(1)}
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
        </div>
      )}

      {tab === 'infrastructure' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Add Infrastructure Asset</h3>
            <form onSubmit={handleCreateInfra} className="space-y-3 text-xs">
              <select
                value={iZoneId}
                onChange={(e) => setIZoneId(e.target.value)}
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              >
                {(zones ?? []).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code} · {z.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={iName}
                onChange={(e) => setIName(e.target.value)}
                placeholder="Asset Name"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
              <select
                value={iType}
                onChange={(e) => setIType(e.target.value)}
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              >
                <option value="ROAD">ROAD</option>
                <option value="HOSPITAL">HOSPITAL</option>
                <option value="SCHOOL">SCHOOL</option>
                <option value="SUBSTATION">SUBSTATION</option>
                <option value="WATER_PLANT">WATER_PLANT</option>
                <option value="TRANSIT_HUB">TRANSIT_HUB</option>
                <option value="BUILDING">BUILDING</option>
              </select>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-md cursor-pointer"
              >
                Add Asset
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Zone</th>
                    <th className="py-3 px-4 font-medium">Asset</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium text-right">Load</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {(infra ?? []).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-cyan-400">{item.zone_code}</td>
                      <td className="py-3 px-4 text-slate-100 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-slate-400">{item.asset_type}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300">
                        {item.load_pct}%
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleInfraStatus(item.id, e.target.value)}
                          className="px-2 py-1 bg-[#070D19] border border-slate-700 rounded text-slate-200 text-xs"
                        >
                          <option value="OPERATIONAL">OPERATIONAL</option>
                          <option value="DEGRADED">DEGRADED</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg divide-y divide-slate-800/60">
          {(alerts ?? []).map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <StatusText status={a.severity} />
                  <span className="text-slate-100 font-semibold">{a.title}</span>
                  <span className="text-slate-500">· {a.zone_code ?? 'CITY'}</span>
                </div>
                <p className="text-slate-400 mt-1">{a.message}</p>
                <div className="text-slate-500 mt-0.5">{formatTimestamp(a.created_at)}</div>
              </div>
              {a.is_read === 0 ? (
                <button
                  type="button"
                  onClick={() => handleMarkRead(a.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer whitespace-nowrap"
                >
                  Mark Read
                </button>
              ) : (
                <span className="text-slate-500">Acknowledged</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
