import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Command Dashboard',
  '/citizen': 'Citizen Overview',
  '/locations': 'City & Location Management',
  '/digital-twin': 'Digital Twin',
  '/traffic': 'Traffic Mobility',
  '/environment': 'Environmental Monitoring',
  '/resources': 'Energy & Water Resources',
  '/agents': 'Multi-Agent AI Coordination',
  '/predictions': 'Predictive Analytics',
  '/emergencies': 'Emergency Dispatch',
  '/assistant': 'AI Decision Support',
  '/admin': 'Admin Management',
  '/reports': 'Reports & Analytics',
  '/settings': 'Profile & Settings',
};

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const pageTitle = ROUTE_TITLES[pathname] ?? 'Operations Console';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#0A1120] border-b border-slate-800/80 flex items-center justify-between gap-6 shrink-0 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="lg:hidden p-2 text-slate-300 hover:text-white rounded-md border border-slate-800 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-500 hidden sm:inline whitespace-nowrap">CityVerse AI</span>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">/</span>
          <h1 className="font-semibold text-slate-100 truncate">{pageTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
          {user?.email} · {user?.role === 'ROLE_ADMIN' ? 'Admin' : 'Citizen'}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
