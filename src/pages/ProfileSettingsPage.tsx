import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function ProfileSettingsPage() {
  const { user, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [zonePreference, setZonePreference] = useState(user?.zonePreference ?? 'Z-101');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await api.put('/auth/profile', {
        fullName,
        department,
        zonePreference,
        newPassword: newPassword || undefined,
      });
      await refreshProfile();
      setNewPassword('');
      setStatusMsg('Profile settings saved.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Unable to update profile.';
      setStatusMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-50 tracking-tight">Profile &amp; Account Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your CityVerse AI profile, preferred monitoring district, and account credentials
        </p>
      </div>

      <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-6 space-y-5">
        <div className="pb-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <div className="text-slate-400">Registered Email</div>
            <div className="font-mono text-sm text-slate-100 mt-0.5">{user?.email}</div>
          </div>
          <div>
            <div className="text-slate-400">Assigned Role</div>
            <div className="font-mono text-sm text-cyan-400 mt-0.5">{user?.role}</div>
          </div>
        </div>

        {statusMsg && <div className="text-xs text-cyan-300">{statusMsg}</div>}

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Department / Unit</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Preferred City Zone</label>
            <select
              value={zonePreference}
              onChange={(e) => setZonePreference(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
            >
              <option value="Z-101">Z-101 · Downtown Civic Core</option>
              <option value="Z-102">Z-102 · Harbor Tech District</option>
              <option value="Z-103">Z-103 · Northside Gardens</option>
              <option value="Z-104">Z-104 · Eastport Logistics Hub</option>
              <option value="Z-105">Z-105 · Riverbend University Quarter</option>
              <option value="Z-106">Z-106 · Westlake Eco Suburb</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Update Password (leave blank to keep current)
            </label>
            <input
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold text-xs rounded-md transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
