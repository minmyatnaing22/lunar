'use client';

import React, { useState, useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Radio,
  Satellite,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Info,
  Server,
  ArrowRight,
  Sliders,
  Activity,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { DSN_COMPLEXES } from '@/lib/astronomy/communication';

// Mock detailed DSN complex telemetry
interface DsnComplexDetails {
  name: string;
  code: string;
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  antennas: {
    id: string;
    sizeMeters: number;
    band: 'X-band (8.4 GHz)' | 'Ka-band (32 GHz)' | 'S-band (2.1 GHz)';
    status: 'Tracking' | 'Standby' | 'Scheduled Maintenance';
  }[];
}

const DSN_DETAILED_DATA: DsnComplexDetails[] = [
  {
    name: 'Goldstone Deep Space Communications Complex',
    code: 'GDSCC',
    location: 'Mojave Desert, California',
    country: 'United States',
    latitude: 35.43,
    longitude: -116.89,
    antennas: [
      { id: 'DSS-14', sizeMeters: 70, band: 'X-band (8.4 GHz)', status: 'Tracking' },
      { id: 'DSS-24', sizeMeters: 34, band: 'Ka-band (32 GHz)', status: 'Standby' },
      { id: 'DSS-26', sizeMeters: 34, band: 'Ka-band (32 GHz)', status: 'Standby' },
    ],
  },
  {
    name: 'Madrid Deep Space Communications Complex',
    code: 'MDSCC',
    location: 'Robledo de Chavela',
    country: 'Spain',
    latitude: 40.43,
    longitude: -4.25,
    antennas: [
      { id: 'DSS-63', sizeMeters: 70, band: 'X-band (8.4 GHz)', status: 'Standby' },
      { id: 'DSS-65', sizeMeters: 34, band: 'Ka-band (32 GHz)', status: 'Tracking' },
      { id: 'DSS-54', sizeMeters: 34, band: 'X-band (8.4 GHz)', status: 'Standby' },
    ],
  },
  {
    name: 'Canberra Deep Space Communication Complex',
    code: 'CDSCC',
    location: 'Tidbinbilla, ACT',
    country: 'Australia',
    latitude: -35.40,
    longitude: 148.98,
    antennas: [
      { id: 'DSS-43', sizeMeters: 70, band: 'X-band (8.4 GHz)', status: 'Standby' },
      { id: 'DSS-34', sizeMeters: 34, band: 'Ka-band (32 GHz)', status: 'Tracking' },
      { id: 'DSS-36', sizeMeters: 34, band: 'Ka-band (32 GHz)', status: 'Standby' },
    ],
  },
];

export const CommunicationAnalyzer: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    simulationState,
    toggleRelaySatellite,
    setActiveSection,
  } = useMission();

  const [activeWindowFilter, setActiveWindowFilter] = useState<'all' | 'DTE' | 'Relay' | 'Blackout'>('all');
  const [selectedStationTab, setSelectedStationTab] = useState<string>('GDSCC');

  const comms = selectedSite.communication;
  const earth = selectedSite.earthVisibility;

  // Filtered upcoming communication windows
  const filteredWindows = useMemo(() => {
    if (activeWindowFilter === 'all') return comms.upcomingWindows;
    if (activeWindowFilter === 'DTE') {
      return comms.upcomingWindows.filter(w => w.type === 'Direct-to-Earth');
    }
    if (activeWindowFilter === 'Relay') {
      return comms.upcomingWindows.filter(w => w.type === 'Relay-Supported');
    }
    return comms.upcomingWindows.filter(w => w.type === 'Blackout');
  }, [comms.upcomingWindows, activeWindowFilter]);

  // Selected DSN station details
  const activeStation = useMemo(() => {
    return DSN_DETAILED_DATA.find(s => s.code === selectedStationTab) || DSN_DETAILED_DATA[0];
  }, [selectedStationTab]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-200">
      {/* Header and Module Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Mission Control Module
            </span>
            <span className="text-xs text-slate-400 font-mono">
              NASA Deep Space Network (DSN) & Direct-to-Earth Link
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Demo Simulation Data
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Communication Window Analyzer
          </h1>
        </div>

        {/* Action Controls & Navigation Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('earth')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0c1220] hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-xs font-mono border border-slate-700 transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Switch to Earth Visibility</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {/* Relay Satellite Toggle */}
          <button
            onClick={toggleRelaySatellite}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono transition-colors ${
              simulationState.relaySatelliteEnabled
                ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                : 'bg-[#0c1220] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Satellite className="w-4 h-4 text-emerald-400" />
            <span>L2 Halo Relay:</span>
            <span className="font-bold">
              {simulationState.relaySatelliteEnabled ? 'ONLINE' : 'OFFLINE'}
            </span>
          </button>
        </div>
      </div>

      {/* Critical Scientific Advisory Banner */}
      <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-amber-300 uppercase font-mono tracking-wider">
            Scientific Distinction: Line-of-Sight vs. Operational Radio Connection
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Geometric line-of-sight between a lunar lander and Earth is a <strong>necessary prerequisite</strong>, but <strong>does not guarantee an operational communications link</strong>. 
            Actual radio link closure depends on transmitter EIRP, ground station antenna gain (34m vs 70m apertures), carrier frequency band (X-band or Ka-band), elevation angles above terrestrial atmospheric horizons (&gt;10°), and DSN scheduling allocations.
          </p>
        </div>
      </div>

      {/* Primary KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Direct Link Status */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Direct Line-of-Sight (DTE)
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                comms.hasDirectEarthLOS
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : comms.isRelaySupported
                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {comms.hasDirectEarthLOS
                ? 'DIRECT LOS AVAILABLE'
                : comms.isRelaySupported
                ? 'RELAY SATELLITE LINK'
                : 'COMMUNICATION BLACKOUT'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            {comms.hasDirectEarthLOS
              ? 'Unobstructed signal path above surrounding crater rim.'
              : comms.isRelaySupported
              ? 'Direct path occluded; linked via orbital L2 halo relay.'
              : 'Direct path occluded and no orbital relay in view.'}
          </p>
        </div>

        {/* Primary DSN Tracking Station */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Active DSN Tracking Complex
          </div>
          <div className="text-sm font-bold font-mono text-white truncate pt-1">
            {comms.hasDirectEarthLOS && comms.activeDsnStation
              ? comms.activeDsnStation
              : comms.isRelaySupported
              ? 'L2 Orbital Halo Relay'
              : 'None (Blackout)'}
          </div>
          <div className="text-[11px] text-slate-400">
            Carrier: <span className="text-sky-400 font-mono">Ka-band (32 GHz) / X-band (8.4 GHz)</span>
          </div>
        </div>

        {/* Round-Trip Light Time (RTT) */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Round-Trip Light Transit Time
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {comms.roundTripLatencySeconds}{' '}
            <span className="text-xs font-normal text-slate-400">sec</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Baseline Distance: <span className="text-slate-300">~384,400 km</span>
          </div>
        </div>

        {/* Longest Blackout Duration */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Max Continuous Blackout
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {comms.longestBlackoutHours}{' '}
            <span className="text-xs font-normal text-slate-400">hours</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Mission DTE Availability: <span className="text-white font-bold">{comms.directCommsAvailabilityPercent}%</span>
          </div>
        </div>
      </div>

      {/* Direct-to-Earth Schematic Visualization Panel */}
      <div className="rounded-lg border border-slate-800 bg-[#070a12] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" />
              <span>Direct-to-Earth Link Geometry Diagram</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Topocentric line-of-sight vector from Lunar South Pole lander to Earth DSN aperture
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Simulated Demonstration Schema
          </span>
        </div>

        {/* Schematic SVG Diagram */}
        <div className="w-full max-w-4xl mx-auto py-2">
          <svg viewBox="0 0 800 220" className="w-full h-auto select-none">
            {/* Background Grid */}
            <defs>
              <pattern id="diagGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="800" height="220" fill="url(#diagGrid)" />

            {/* Earth (Left side) */}
            <circle cx="120" cy="110" r="48" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="110" cy="98" r="14" fill="#38bdf8" opacity="0.6" />
            <circle cx="135" cy="125" r="18" fill="#0284c7" />
            <text x="120" y="176" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              EARTH (DSN)
            </text>
            <text x="120" y="190" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
              Radius: 6,378 km
            </text>

            {/* Lunar Surface & Lander (Right side) */}
            {/* Moon Curved Horizon */}
            <path d="M 620 20 C 660 80 660 140 620 200 L 780 200 L 780 20 Z" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            
            {/* Crater Rim Profile Lip */}
            <path d="M 640 70 Q 648 100 636 130" stroke="#94a3b8" strokeWidth="3" fill="none" />
            <text x="690" y="95" fill="#94a3b8" fontSize="8" fontFamily="monospace">Crater Rim (+3.5°)</text>

            {/* Lander Marker */}
            <rect x="630" y="102" width="16" height="16" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="638" y1="102" x2="638" y2="88" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="638" cy="88" r="3" fill="#38bdf8" />
            <text x="705" y="114" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
              LUNAR LANDER
            </text>
            <text x="705" y="128" fill="#94a3b8" fontSize="8" fontFamily="monospace">
              {Math.abs(selectedSite.latitude).toFixed(2)}° S, {selectedSite.longitude.toFixed(2)}° E
            </text>

            {/* Signal Path (LOS Vector) */}
            {comms.hasDirectEarthLOS ? (
              <g>
                <line x1="168" y1="110" x2="630" y2="106" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" />
                <rect x="340" y="96" width="130" height="22" rx="4" fill="#090d16" stroke="#38bdf8" strokeWidth="1" />
                <text x="405" y="111" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  DTE LINK (Ka-Band / 32 GHz)
                </text>
              </g>
            ) : (
              <g>
                <line x1="168" y1="110" x2="636" y2="108" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
                <circle cx="636" cy="108" r="6" fill="#f43f5e" />
                <text x="636" y="125" fill="#f43f5e" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  BLOCKED BY RIM
                </text>
                <rect x="340" y="96" width="140" height="22" rx="4" fill="#090d16" stroke="#f43f5e" strokeWidth="1" />
                <text x="410" y="111" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  DIRECT PATH OCCLUDED
                </text>
              </g>
            )}

            {/* Relay Satellite in L2 Halo (Top center) */}
            {simulationState.relaySatelliteEnabled && (
              <g>
                <circle cx="410" cy="40" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                <line x1="400" y1="40" x2="420" y2="40" stroke="#10b981" strokeWidth="2" />
                <text x="410" y="24" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  L2 HALO RELAY SATELLITE
                </text>
                {/* Relay link lines */}
                {!comms.hasDirectEarthLOS && (
                  <g>
                    <line x1="160" y1="90" x2="405" y2="42" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
                    <line x1="415" y1="42" x2="630" y2="104" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
                  </g>
                )}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* DSN Station Information Panel */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span>NASA Deep Space Network (DSN) Station Telemetry</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Continuous 24-hr tracking coverage provided by three ground complexes separated by 120° longitude
            </p>
          </div>

          {/* Station Selection Tabs */}
          <div className="flex items-center gap-1.5 bg-[#090d16] p-1 rounded-md border border-slate-800 text-xs font-mono">
            {DSN_DETAILED_DATA.map(st => (
              <button
                key={st.code}
                onClick={() => setSelectedStationTab(st.code)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedStationTab === st.code
                    ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.code}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Station Detail Box */}
        <div className="p-4 rounded-md bg-[#090d16] border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Complex Name</div>
            <div className="text-white font-bold text-sm">{activeStation.name}</div>
            <div className="text-slate-400 text-[11px]">
              {activeStation.location}, {activeStation.country}
            </div>
            <div className="text-slate-400 text-[10px] pt-1">
              Lat: {activeStation.latitude}° N, Lon: {activeStation.longitude}° E
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-[10px] text-slate-400 uppercase">Antenna Apertures & Assigned Carriers</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {activeStation.antennas.map(ant => (
                <div key={ant.id} className="p-2.5 rounded bg-[#0c1220] border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ant.id}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        ant.status === 'Tracking'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ant.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[10px]">Aperture: {ant.sizeMeters}m Diameter</div>
                  <div className="text-sky-400 text-[10px] font-bold">{ant.band}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Communication Availability Timeline & Windows */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Communication Opportunities & Blackout Schedule</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Estimated contact passes and blackout spans over the active mission window
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {(['all', 'DTE', 'Relay', 'Blackout'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveWindowFilter(f)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  activeWindowFilter === f
                    ? 'bg-sky-950 text-sky-300 border border-sky-800 font-semibold'
                    : 'text-slate-400 hover:text-white bg-[#090d16] border border-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Windows List */}
        <div className="space-y-2">
          {filteredWindows.length > 0 ? (
            filteredWindows.map(win => {
              const isDTE = win.type === 'Direct-to-Earth';
              const isRelay = win.type === 'Relay-Supported';

              return (
                <div
                  key={win.id}
                  className={`p-3 rounded-md border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDTE
                      ? 'bg-[#090d16] border-slate-800 text-slate-200'
                      : isRelay
                      ? 'bg-[#090d16] border-sky-900/60 text-slate-200'
                      : 'bg-[#120a0d] border-rose-900/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded ${
                        isDTE
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : isRelay
                          ? 'bg-sky-950 text-sky-400 border border-sky-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {isDTE ? <Wifi className="w-4 h-4" /> : isRelay ? <Satellite className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{win.type}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({win.primaryStation})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 pt-0.5">{win.notes}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right shrink-0">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Duration</div>
                      <div className="font-bold text-white text-sm">{win.durationHours}h 00m</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Window Start (UTC)</div>
                      <div className="text-slate-300">
                        {win.startTime.replace('T', ' ').substring(0, 16)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs font-mono text-slate-400 bg-[#090d16] rounded border border-slate-800">
              No communication windows match the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
