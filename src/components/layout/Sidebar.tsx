'use client';

import React from 'react';
import Link from 'next/link';
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
  ChevronRight,
  ShieldCheck,
  Shield,
  Rocket,
} from 'lucide-react';

interface NavItem {
  id: NavigationSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'map',
    label: 'Moon Map',
    icon: Compass,
  },
  {
    id: 'sun',
    label: 'Sun Analysis',
    icon: Sun,
  },
  {
    id: 'earth',
    label: 'Earth Visibility',
    icon: Globe2,
  },
  {
    id: 'comms',
    label: 'Communication',
    icon: Radio,
  },
  {
    id: 'landing',
    label: 'Mission Landing',
    icon: Rocket,
  },
  {
    id: 'comparison',
    label: 'Site Comparison',
    icon: SlidersHorizontal,
  },
  {
    id: 'reports',
    label: 'Mission Reports',
    icon: FileText,
  },
];

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, selectedSite } = useMission();

  return (
    <aside className="w-64 bg-[#090d16] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-20">
      <div>
        {/* App Title Header */}
        <div className="p-4 border-b border-slate-800 bg-[#070a12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Orbit className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider text-white font-mono">
                LUNARSIGHT
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Mission Planning Tool
              </div>
            </div>
          </div>

          {/* Active Target Quick Box */}
          <div className="mt-3 p-2 rounded-md bg-[#0c1220] border border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 mb-0.5">
              <span>Selected Site</span>
              <span className="text-sky-400 font-semibold font-mono">Active</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate">
              {selectedSite.name.replace('—', '-')}
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
              <span>{Math.abs(selectedSite.latitude).toFixed(2)}° S</span>
              <span>{selectedSite.longitude.toFixed(2)}° E</span>
              <span className="text-slate-300">
                {selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters}m` : `${selectedSite.elevationMeters}m`}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Navigation
          </div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-950/70 text-sky-300 border border-sky-800/70'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-sky-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-sm bg-sky-400"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Navigation & Legal Links */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070a12] space-y-2 text-[11px] font-mono">
        <div className="p-2 rounded-md bg-[#0c1220] border border-slate-800 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>NASA Data Calibration</span>
          </div>
          <p className="leading-tight text-slate-400">
            LRO LOLA elevation datum (1,737.4 km) and JPL ephemeris models.
          </p>
        </div>

        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
          <Link
            href="/privacy"
            className="hover:text-slate-200 transition-colors"
          >
            Privacy Policy
          </Link>
          <span>•</span>
          <Link
            href="/terms"
            className="hover:text-slate-200 transition-colors"
          >
            Terms and Conditions
          </Link>
        </div>
      </div>
    </aside>
  );
};
