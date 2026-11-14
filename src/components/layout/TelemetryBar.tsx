'use client';

import React, { useState } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Calendar,
  Clock,
  Orbit,
  Layers,
  Sparkles,
  ChevronDown,
  Satellite,
  Compass,
  AlertTriangle,
} from 'lucide-react';

export const TelemetryBar: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    simulationDate,
    setSimulationDate,
    simulationState,
    stepSimulationHours,
    togglePlayback,
    setPlaybackSpeed,
    toggleRelaySatellite,
  } = useMission();

  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);

  // Format UTC date display
  const utcDateStr = simulationDate.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  return (
    <header className="h-14 bg-[#0a0e17] border-b border-slate-800 px-4 flex items-center justify-between gap-4 z-10 shrink-0">
      {/* Left: Candidate Site Switcher */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-700/80 text-left transition-colors"
          >
            <Compass className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider leading-none">
                Landing Site
              </span>
              <span className="text-xs font-semibold text-slate-100 max-w-[200px] truncate leading-tight">
                {selectedSite.name}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {isSiteDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsSiteDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-80 bg-[#0d1322] border border-slate-700 rounded-lg shadow-2xl py-1.5 z-40 max-h-96 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 flex justify-between items-center">
                  <span>Candidate Locations ({savedSites.length})</span>
                  <span className="text-sky-400 font-semibold">NASA Artemis</span>
                </div>
                {savedSites.map(site => (
                  <button
                    key={site.id}
                    onClick={() => {
                      setSelectedSiteId(site.id);
                      setIsSiteDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-start justify-between gap-2 transition-colors ${
                      site.id === selectedSite.id
                        ? 'bg-sky-500/20 text-sky-300 border-l-2 border-sky-400'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate flex items-center gap-1.5">
                        <span>{site.name}</span>
                        {site.terrain.isPermanentShadowRegion && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            PSR
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {Math.abs(site.latitude).toFixed(2)}°S, {site.longitude.toFixed(2)}°E •{' '}
                        {site.elevationMeters > 0 ? `+${site.elevationMeters}m` : `${site.elevationMeters}m`}
                      </div>
                    </div>
                    {site.artemisCandidateRank && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 shrink-0 font-medium">
                        #{site.artemisCandidateRank}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Real-time Subsolar / Libration Telemetry Tag */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
          <div>
            <span className="text-slate-400">Sub-Solar: </span>
            <span className="text-amber-400">{selectedSite.sunlight.subSolarLongitude.toFixed(1)}° Lon</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800"></div>
          <div>
            <span className="text-slate-400">Libration: </span>
            <span className="text-sky-400">
              l={selectedSite.earthVisibility.librationLonDeg > 0 ? `+${selectedSite.earthVisibility.librationLonDeg}°` : `${selectedSite.earthVisibility.librationLonDeg}°`}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Mission Time Control & Time Travel */}
      <div className="flex items-center gap-2">
        {/* Time Step Buttons */}
        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
          <button
            onClick={() => stepSimulationHours(-24)}
            title="Step -24 Hours"
            className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
          >
            -24h
          </button>
          <button
            onClick={() => stepSimulationHours(-6)}
            title="Step -6 Hours"
            className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
          >
            -6h
          </button>
          <button
            onClick={togglePlayback}
            className={`px-3 py-1 flex items-center gap-1.5 rounded text-xs font-semibold transition-all ${
              simulationState.isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
            }`}
          >
            {simulationState.isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate</span>
              </>
            )}
          </button>
          <button
            onClick={() => stepSimulationHours(6)}
            title="Step +6 Hours"
            className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
          >
            +6h
          </button>
          <button
            onClick={() => stepSimulationHours(24)}
            title="Step +24 Hours"
            className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
          >
            +24h
          </button>
        </div>

        {/* Speed Selector */}
        <select
          value={simulationState.playbackSpeed}
          onChange={e => setPlaybackSpeed(Number(e.target.value))}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-sky-500"
          title="Simulation Playback Speed"
        >
          <option value={1}>1x (Realtime Sim)</option>
          <option value={4}>4x Fast</option>
          <option value={12}>12x Orbit</option>
        </select>
      </div>

      {/* Right: UTC Time readout & Relay Satellite Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-800 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-sky-400 animate-spin-slow" />
          <span className="text-slate-200 tracking-wide">{utcDateStr}</span>
        </div>

        {/* Relay Satellite Toggle */}
        <button
          onClick={toggleRelaySatellite}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            simulationState.relaySatelliteEnabled
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Lunar L2 Halo Relay Satellite link simulation"
        >
          <Satellite className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Relay Sat:</span>
          <span className="font-semibold">
            {simulationState.relaySatelliteEnabled ? 'ONLINE' : 'OFFLINE'}
          </span>
        </button>
      </div>
    </header>
  );
};
