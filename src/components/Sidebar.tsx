import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Map,
  Car,
  Wind,
  Zap,
  Cpu,
  TrendingUp,
  Siren,
  MessageSquareCode,
  ShieldCheck,
  FileBarChart2,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin, user } = useAuth();

  const navItems = [
    ...(isAdmin
      ? [{ to: '/dashboard', label: 'Command Dashboard', icon: LayoutDashboard }]
      : []),
    { to: '/citizen', label: 'Citizen Overview', icon: Compass },
    { to: '/locations', label: 'Locations & Map', icon: Map },
    { to: '/digital-twin', label: 'Digital Twin', icon: Cpu },
    { to: '/traffic', label: 'Traffic Mobility', icon: Car },
    { to: '/environment', label: 'Environment & Air', icon: Wind },
    { to: '/resources', label: 'Energy & Water', icon: Zap },
    { to: '/agents', label: 'Multi-Agent AI', icon: Cpu },
    { to: '/predictions', label: 'Predictive Analytics', icon: TrendingUp },
    { to: '/emergencies', label: 'Emergency Dispatch', icon: Siren },
    { to: '/assistant', label: 'AI Decision Support', icon: MessageSquareCode },
    ...(isAdmin
      ? [{ to: '/admin', label: 'Admin Management', icon: ShieldCheck }]
      : []),
    { to: '/reports', label: 'Reports & Analytics', icon: FileBarChart2 },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full w-64 bg-[#0A1120] border-r border-slate-800/80 select-none">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
        <span className="text-base font-bold tracking-tight text-slate-50 whitespace-nowrap">
          CityVerse AI
        </span>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 rounded-md cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 shrink-0">
        <div className="font-medium text-slate-200 truncate">{user?.fullName}</div>
        <div className="mt-0.5 text-slate-500 truncate">
          {user?.role === 'ROLE_ADMIN' ? 'Administrator' : 'Citizen'} · Zone {user?.zonePreference ?? 'Z-101'}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
