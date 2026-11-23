import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ZONES = [
  { code: 'Z-101', label: 'Z-101 · Downtown Civic Core' },
  { code: 'Z-102', label: 'Z-102 · Harbor Tech District' },
  { code: 'Z-103', label: 'Z-103 · Northside Gardens' },
  { code: 'Z-104', label: 'Z-104 · Eastport Logistics Hub' },
  { code: 'Z-105', label: 'Z-105 · Riverbend University Quarter' },
  { code: 'Z-106', label: 'Z-106 · Westlake Eco Suburb' },
];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [zonePreference, setZonePreference] = useState('Z-101');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ fullName, email, password, zonePreference });
      navigate('/citizen');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Unable to create account.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070D19] text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-[#0D1526] border border-slate-800/80 rounded-lg p-8 space-y-6">
        <div className="flex items-center gap-2.5 text-slate-100">
          <Building2 className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          <span className="text-base font-bold tracking-tight">CityVerse AI</span>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-slate-50">Citizen Portal Registration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Access live neighborhood air quality, traffic advisories, resource status, and emergency reporting.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/50 border border-rose-800/70 rounded-md text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="regName" className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="regName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Marcus Chen"
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label htmlFor="regEmail" className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              id="regEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="citizen@example.com"
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label htmlFor="regZone" className="block text-xs font-medium text-slate-300 mb-1.5">
              Primary City Zone
            </label>
            <select
              id="regZone"
              value={zonePreference}
              onChange={(e) => setZonePreference(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              {ZONES.map((z) => (
                <option key={z.code} value={z.code}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="regPassword" className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <input
              id="regPassword"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold text-sm rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{submitting ? 'Creating Account...' : 'Create Citizen Account'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Already registered?</span>
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
