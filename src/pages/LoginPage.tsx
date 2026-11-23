import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, UserCheck, ArrowRight, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, bootstrapAdmin } = useAuth();
  const navigate = useNavigate();

  const [adminInitialized, setAdminInitialized] = useState<boolean | null>(null);
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ adminInitialized: boolean; requiresPasscode: boolean }>('/auth/bootstrap-status')
      .then((res) => {
        if (!active) return;
        setAdminInitialized(res.data.adminInitialized);
        setRequiresPasscode(res.data.requiresPasscode);
        if (!res.data.adminInitialized) {
          setMode('bootstrap');
        }
      })
      .catch(() => {
        if (active) setAdminInitialized(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'bootstrap') {
        const user = await bootstrapAdmin({ fullName, email, password, passcode: passcode || undefined });
        navigate(user.role === 'ROLE_ADMIN' ? '/dashboard' : '/citizen');
      } else {
        const user = await login(email, password);
        navigate(user.role === 'ROLE_ADMIN' ? '/dashboard' : '/citizen');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Authentication failed. Check your credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070D19] text-slate-100 grid grid-cols-1 lg:grid-cols-12">
      {/* Architectural City Visual Panel */}
      <div className="relative lg:col-span-7 min-h-[320px] lg:min-h-screen bg-[#0A1326] overflow-hidden flex flex-col justify-between p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <img
          src="/src/assets/images/cityverse_aerial_twin_1795365670488.jpg"
          alt="Aerial twilight view of smart city district infrastructure and transit bridges"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#070D19] via-[#070D19]/70 to-[#070D19]/40"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-2.5 text-slate-100">
          <Building2 className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">CityVerse AI</span>
        </div>

        <div className="relative z-10 max-w-xl space-y-5 mt-12 lg:mt-0">
          <p className="text-xs font-medium text-cyan-400 tracking-wide">
            Multi-Agent Digital Twin Platform
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Predictive Smart City Operations &amp; Autonomous Decision Support
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
            Monitor urban corridors, environmental telemetry, energy and water grids, emergency dispatches, and five coordinated AI agents across a unified spatial digital twin.
          </p>

          <div className="pt-4 border-t border-slate-700/60 grid grid-cols-3 gap-6 max-w-md text-xs">
            <div>
              <div className="font-mono text-lg font-semibold text-slate-100 tabular-nums">6</div>
              <div className="text-slate-400 mt-0.5">City Zones</div>
            </div>
            <div>
              <div className="font-mono text-lg font-semibold text-slate-100 tabular-nums">5</div>
              <div className="text-slate-400 mt-0.5">AI Agents</div>
            </div>
            <div>
              <div className="font-mono text-lg font-semibold text-slate-100 tabular-nums">24h</div>
              <div className="text-slate-400 mt-0.5">Forecast Horizon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Panel */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-50 tracking-tight">
              {mode === 'bootstrap' ? 'Initialize Primary Administrator' : 'Sign in to CityVerse AI'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              {mode === 'bootstrap'
                ? 'No administrator exists yet. Create the primary operations command account to unlock the platform.'
                : 'Access your administrator operations command or citizen portal.'}
            </p>
          </div>

          {adminInitialized === false && (
            <div className="flex items-center gap-1 p-1 bg-[#0D1526] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('bootstrap');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'bootstrap'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Setup Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/70 rounded-md text-xs text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'bootstrap' && (
              <div>
                <label htmlFor="fullName" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Administrator Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full px-3.5 py-2.5 bg-[#0D1526] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@cityverse.gov"
                className="w-full px-3.5 py-2.5 bg-[#0D1526] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 bg-[#0D1526] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {mode === 'bootstrap' && requiresPasscode && (
              <div>
                <label htmlFor="passcode" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Administrator Setup Passcode
                </label>
                <input
                  id="passcode"
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter configured ADMIN_PASSCODE"
                  className="w-full px-3.5 py-2.5 bg-[#0D1526] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold text-sm rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {submitting
                  ? 'Authenticating...'
                  : mode === 'bootstrap'
                    ? 'Create Primary Admin Account'
                    : 'Sign In'}
              </span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>New resident or citizen user?</span>
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Create Citizen Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
