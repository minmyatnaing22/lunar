'use client';

import React from 'react';
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
  Layers,
} from 'lucide-react';
import { DSN_COMPLEXES } from '@/lib/astronomy/communication';

export const CommunicationAnalyzer: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    simulationState,
    toggleRelaySatellite,
  } = useMission();

  const comms = selectedSite.communication;
  const earth = selectedSite.earthVisibility;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-semibold">
              Feature 4
            </span>
            <span className="text-xs text-slate-400 font-mono">
              NASA Deep Space Network (DSN) & Earth Line-of-Sight Analyzer
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Communication Window Analyzer
          </h1>
        </div>

        {/* Relay Satellite Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleRelaySatellite}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              simulationState.relaySatelliteEnabled
                ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Satellite className="w-4 h-4 text-emerald-400" />
            <span>Simulated L2 Relay:</span>
            <span className="font-bold">
              {simulationState.relaySatelliteEnabled ? 'ONLINE' : 'OFFLINE'}
            </span>
          </button>
        </div>
      </div>

      {/* Scientific Link Budget Disclaimer Banner */}
      <div className="p-4 rounded-xl border border-amber-800/60 bg-gradient-to-r from-amber-950/30 to-[#0c1322] flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-amber-300 uppercase font-mono tracking-wider">
            NASA Flight Design Reality Check: Line-of-Sight vs. Working Link
          </div>
          <p className="text-slate-300 leading-relaxed">
            Geometric line-of-sight to Earth or a relay satellite is a <strong>mandatory prerequisite</strong>, but <strong>does not guarantee an operational radio connection</strong>. 
            A closed telecommunication link requires sufficient RF link budget margin (EIRP, antenna gain, system noise temperature, carrier frequency [X-band vs. Ka-band], and DSN 34m/70m aperture scheduling).
          </p>
        </div>
      </div>

      {/* Instantaneous Comms Status KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Direct Link Status */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Direct-to-Earth (DTE)
          </div>
          <div className="flex items-center gap-2 mb-2">
            {comms.hasDirectEarthLOS ? (
              <>
                <Wifi className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-emerald-400 font-mono">AVAILABLE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-rose-400" />
                <span className="text-lg font-bold text-rose-400 font-mono">OCCLUDED</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {comms.hasDirectEarthLOS
              ? 'Unobstructed line of sight above local crater rim.'
              : 'Direct path to Earth blocked by lunar terrain or libration.'}
          </p>
        </div>

        {/* Active DSN Tracking Station */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Primary DSN Station
          </div>
          <div className="text-lg font-bold text-white font-mono mb-1 truncate">
            {comms.hasDirectEarthLOS && comms.activeDsnStation
              ? comms.activeDsnStation
              : comms.isRelaySupported
              ? 'Lunar Relay Link'
              : 'Blackout'}
          </div>
          <p className="text-[11px] text-slate-400">
            {comms.hasDirectEarthLOS
              ? 'Earth station facing lunar hemisphere.'
              : 'Routed through orbital relay.'}
          </p>
        </div>

        {/* Round-Trip Light Time Latency */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Round-Trip Light Time (RTT)
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mb-1">
            {comms.roundTripLatencySeconds}{' '}
            <span className="text-xs font-normal text-slate-400">sec</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Speed of light transit across ~384,400 km baseline.
          </p>
        </div>

        {/* DTE Availability % */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Mission DTE Availability
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {comms.directCommsAvailabilityPercent}%
            <span className="text-xs font-normal text-slate-400 ml-1">of mission window</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Max blackout: {comms.longestBlackoutHours} continuous hours.
          </p>
        </div>
      </div>

      {/* DSN Global Ground Stations Grid */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1b]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>NASA Deep Space Network (DSN) Global Complexes</span>
            </h2>
            <p className="text-xs text-slate-400">
              Three deep-space antenna complexes situated 120° apart maintain continuous 24-hr Earth view
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DSN_COMPLEXES.map(station => {
            const isActive = comms.activeDsnStation?.includes(station.name.split(' ')[0]);
            return (
              <div
                key={station.name}
                className={`p-3.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-white">{station.name}</span>
                  {isActive ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300 font-bold animate-pulse">
                      ACTIVE LINK
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-400">STANDBY</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {station.country} • Lat: {station.latitude}°, Lon: {station.longitude}°
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Communication Windows Timeline Schedule */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1b]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Communication Opportunities & Blackout Schedule</span>
            </h2>
            <p className="text-xs text-slate-400">
              Predicted contact windows across the mission timeframe
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {comms.upcomingWindows.length} Windows Scheduled
          </span>
        </div>

        <div className="space-y-2.5">
          {comms.upcomingWindows.map(win => {
            const isDTE = win.type === 'Direct-to-Earth';
            const isRelay = win.type === 'Relay-Supported';

            return (
              <div
                key={win.id}
                className={`p-3 rounded-lg border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDTE
                    ? 'bg-slate-900/80 border-emerald-900/60 text-slate-200'
                    : isRelay
                    ? 'bg-slate-900/80 border-sky-900/60 text-slate-200'
                    : 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-md ${
                      isDTE
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isRelay
                        ? 'bg-sky-500/20 text-sky-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isDTE ? <Wifi className="w-4 h-4" /> : isRelay ? <Satellite className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span>{win.type}</span>
                      <span className="text-[10px] text-slate-400">({win.primaryStation})</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{win.notes}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <div className="text-slate-400 text-[10px]">Duration</div>
                    <div className="font-bold text-white">{win.durationHours} Hours</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Window Start</div>
                    <div className="text-slate-300">{win.startTime.replace('T', ' ').substring(0, 16)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
