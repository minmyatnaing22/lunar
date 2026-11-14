'use client';

import React from 'react';
import { useMission, NavigationSection } from '@/context/MissionContext';
import {
  LayoutDashboard,
  Compass,
  Sun,
  Globe2,
  Radio,
  SlidersHorizontal,
  FileText,
  Orbit,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  id: NavigationSection;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Mission Dashboard',
    sublabel: 'Telemetry Overview & Critical Stats',
    icon: LayoutDashboard,
  },
  {
    id: 'map',
    label: 'Moon Map Explorer',
    sublabel: 'LOLA Topography & Candidate Sites',
    icon: Compass,
    badge: 'LRO',
  },
  {
    id: 'sun',
    label: 'Sun Position Simulator',
    sublabel: 'Illumination & Solar Elevation',
    icon: Sun,
  },
  {
    id: 'earth',
    label: 'Earth Visibility Simulator',
    sublabel: 'Libration & Crater Horizon Mask',
    icon: Globe2,
  },
  {
    id: 'comms',
    label: 'Communication Analyzer',
    sublabel: 'DSN Windows & Relay Telemetry',
    icon: Radio,
    badge: 'DSN',
  },
  {
    id: 'comparison',
    label: 'Landing Site Comparison',
    sublabel: 'MCDA Suitability & Trade Studies',
    icon: SlidersHorizontal,
  },
  {
    id: 'reports',
    label: 'Mission Reports',
    sublabel: 'Executive Dossier & Export Specs',
    icon: FileText,
  },
];

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, selectedSite } = useMission();

  return (
    <aside className="w-72 bg-[#0a0e17] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-20">
      {/* Top Header Logo */}
      <div>
        <div className="p-4 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-[1.5px] flex items-center justify-center shadow-lg shadow-sky-950/50">
              <div className="w-full h-full bg-[#07090e] rounded-[7px] flex items-center justify-center">
                <Orbit className="w-5 h-5 text-sky-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-wider text-white">LUNARSIGHT</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono font-medium">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight">
                NASA Space Apps Challenge
              </p>
            </div>
          </div>

          {/* Active Target Banner */}
          <div className="mt-4 p-2.5 rounded-md bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 mb-1">
              <span>Target Site</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Active
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-100 truncate" title={selectedSite.name}>
              {selectedSite.name}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-mono">
              <span>{Math.abs(selectedSite.latitude).toFixed(2)}°S</span>
              <span>{selectedSite.longitude.toFixed(2)}°E</span>
              <span className="text-amber-400">
                {selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters}m` : `${selectedSite.elevationMeters}m`}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Mission Workspaces
          </div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-md shadow-sky-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-md transition-colors ${
                      isActive ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">
                      {item.sublabel}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isActive ? 'text-sky-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Scientific Attributions */}
      <div className="p-3 border-t border-slate-800/80 bg-[#07090e]">
        <div className="p-2.5 rounded-md bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>NASA Data Integration</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400">
            Calibrated against LRO LOLA DEMs, IAU cartographic standards, and JPL DE440 ephemerides.
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Datum: 1,737.4 km</span>
            <span className="text-sky-400">J2000.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
