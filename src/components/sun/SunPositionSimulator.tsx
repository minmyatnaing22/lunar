'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Sun,
  Clock,
  Calendar,
  Compass,
  Zap,
  TrendingUp,
  Info,
  ShieldAlert,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MapPin,
  ChevronRight,
  Eye,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  generateIlluminationTimeline,
  calculateSunlightTransitionForecast,
} from '@/lib/astronomy/illumination';
import { calculateLunarEphemeris } from '@/lib/astronomy/ephemeris';
import { LunarSun3DCanvas, LunarSun3DCanvasHandles } from './LunarSun3DCanvas';

export const SunPositionSimulator: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    simulationDate,
    setSimulationDate,
    stepSimulationHours,
    togglePlayback,
    simulationState,
    setMissionDurationDays,
    setActiveSection,
  } = useMission();

  const canvasRef = useRef<LunarSun3DCanvasHandles | null>(null);

  // Ephemeris at current date
  const currentEphemeris = useMemo(() => {
    return calculateLunarEphemeris(simulationDate);
  }, [simulationDate]);

  // Dynamic forward-calculated sunlight transition forecast
  const transitionForecast = useMemo(() => {
    return calculateSunlightTransitionForecast(
      selectedSite.latitude,
      selectedSite.longitude,
      selectedSite.terrain,
      simulationDate
    );
  }, [
    selectedSite.latitude,
    selectedSite.longitude,
    selectedSite.terrain,
    simulationDate,
  ]);

  // Hourly illumination timeline for Recharts
  const timelineData = useMemo(() => {
    return generateIlluminationTimeline(
      selectedSite.latitude,
      selectedSite.longitude,
      selectedSite.terrain,
      simulationDate,
      simulationState.missionDurationDays,
      4 // 4-hour step
    );
  }, [
    selectedSite.latitude,
    selectedSite.longitude,
    selectedSite.terrain,
    simulationDate,
    simulationState.missionDurationDays,
  ]);

  // Date and Time inputs
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const current = new Date(simulationDate);
    const [year, month, day] = val.split('-').map(Number);
    current.setUTCFullYear(year, month - 1, day);
    setSimulationDate(current);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const current = new Date(simulationDate);
    const [hours, minutes] = val.split(':').map(Number);
    current.setUTCHours(hours, minutes, 0, 0);
    setSimulationDate(current);
  };

  const isoDate = simulationDate.toISOString().substring(0, 10);
  const isoTime = simulationDate.toISOString().substring(11, 16);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-200">
      {/* Top Header & Simulation Time Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase font-semibold">
              Mission Planning Module
            </span>
            <span className="text-xs text-slate-400 font-mono">
              IAU/JPL Ephemeris Solar Geometry Engine
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              True 3D Vacuum Sunlight
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Sun Position & Solar Illumination Simulator
          </h1>
        </div>

        {/* Time Scrubbing & Simulation Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Step Buttons */}
          <div className="flex items-center bg-[#0c1220] p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => stepSimulationHours(-6)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Step back 6 hours"
            >
              -6h
            </button>
            <button
              onClick={() => stepSimulationHours(-1)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Step back 1 hour"
            >
              -1h
            </button>
            <button
              onClick={togglePlayback}
              className={`flex items-center gap-1 px-3 py-1 rounded font-bold transition-all ${
                simulationState.isPlaying
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900'
              }`}
              title={simulationState.isPlaying ? 'Pause simulation' : 'Play simulation'}
            >
              {simulationState.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>PLAY</span>
                </>
              )}
            </button>
            <button
              onClick={() => stepSimulationHours(1)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Advance 1 hour"
            >
              +1h
            </button>
            <button
              onClick={() => stepSimulationHours(6)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Advance 6 hours"
            >
              +6h
            </button>
          </div>

          {/* Date & Time Selectors */}
          <div className="flex items-center gap-2 bg-[#0c1220] p-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="date"
                value={isoDate}
                onChange={handleDateChange}
                className="bg-transparent text-white font-mono focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="time"
                value={isoTime}
                onChange={handleTimeChange}
                className="bg-transparent text-white font-mono focus:outline-none"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400 px-1">UTC</span>
          </div>
        </div>
      </div>

      {/* Selected Landing Site Quick Switcher Strip */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Active Landing Site Target
              </div>
              <div className="text-sm font-bold text-white">
                {selectedSite.name.replace('—', '-')}
              </div>
            </div>
          </div>

          {/* Dropdown selector for all candidate sites */}
          <select
            value={selectedSite.id}
            onChange={e => setSelectedSiteId(e.target.value)}
            className="bg-[#090d16] border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-amber-400"
          >
            {savedSites.map(s => (
              <option key={s.id} value={s.id}>
                {s.name.replace('—', '-')} ({Math.abs(s.latitude).toFixed(2)}° S, {s.longitude.toFixed(2)}° E)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <div>
            <span className="text-slate-400">Coordinates: </span>
            <span className="text-white font-semibold">
              {Math.abs(selectedSite.latitude).toFixed(3)}° S, {selectedSite.longitude.toFixed(3)}° E
            </span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
          <div>
            <span className="text-slate-400">LOLA Elevation: </span>
            <span className="text-white font-semibold">
              {selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters}m` : `${selectedSite.elevationMeters}m`}
            </span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
          <div>
            <span className="text-slate-400">Surface Terrain: </span>
            <span className={selectedSite.terrain.isPermanentShadowRegion ? 'text-indigo-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {selectedSite.terrain.isPermanentShadowRegion ? 'Cold Trap (PSR)' : 'Sunlit Ridge'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Space Viewport: Sun & Moon in Space */}
      <div className="rounded-xl border border-slate-800 bg-[#030508] relative flex flex-col items-center justify-center overflow-hidden h-[540px] lg:h-[680px] shadow-2xl">
        {/* Three.js 3D Canvas */}
        <div className="w-full h-full absolute inset-0">
          <LunarSun3DCanvas
            ref={canvasRef}
            simulationDate={simulationDate}
            candidateSites={savedSites}
            selectedSite={selectedSite}
            onSelectSite={setSelectedSiteId}
          />
        </div>

        {/* Top-Left Telemetry HUD: Celestial Ephemeris */}
        <div className="absolute top-4 left-4 bg-[#090d16]/90 border border-slate-800/90 p-3 rounded-lg backdrop-blur text-xs font-mono pointer-events-none space-y-1">
          <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5" />
            <span>Solar Ephemeris State</span>
          </div>
          <div className="text-slate-300">
            Sub-Solar Lat: <span className="text-white font-bold">{currentEphemeris.subSolarLat > 0 ? `+${currentEphemeris.subSolarLat.toFixed(2)}°` : `${currentEphemeris.subSolarLat.toFixed(2)}°`}</span>
          </div>
          <div className="text-slate-300">
            Sub-Solar Lon: <span className="text-white font-bold">{currentEphemeris.subSolarLon.toFixed(2)}°</span>
          </div>
          <div className="text-slate-300">
            Lunar Obliquity: <span className="text-amber-300 font-bold">1.54°</span>
          </div>
        </div>

        {/* Top-Right 3D Camera Controls Toolbar */}
        <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => canvasRef.current?.resetView()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-sm"
            title="Overview of Sun and Moon in space"
          >
            Overview
          </button>
          <button
            onClick={() => canvasRef.current?.focusSouthPole()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-sm"
            title="Focus camera onto Lunar South Pole"
          >
            South Pole
          </button>
          <button
            onClick={() => canvasRef.current?.focusSelectedSite()}
            className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-xs font-mono text-amber-300 font-semibold transition-colors backdrop-blur shadow-sm"
            title="Focus camera directly on selected landing site"
          >
            Focus Site
          </button>
          <button
            onClick={() => canvasRef.current?.viewFromSun()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-sm"
            title="Position camera behind Sun looking towards Moon"
          >
            View from Sun
          </button>
          <div className="flex items-center bg-[#0c1220]/90 border border-slate-700 rounded-lg p-0.5 backdrop-blur">
            <button
              onClick={() => canvasRef.current?.zoomIn()}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => canvasRef.current?.zoomOut()}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Interaction Guide & Legend Strip */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-400 bg-[#090d16]/85 border border-slate-800 px-3 py-2 rounded-lg backdrop-blur pointer-events-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
              <span>Glowing Sun (Light Source)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-amber-300/80"></span>
              <span>Sunlight Rays</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <span>Selected Site Pin</span>
            </span>
          </div>
          <span className="text-slate-400 hidden md:inline">
            Drag to rotate Moon/Sun in 3D • Scroll to zoom • Click markers to switch sites
          </span>
        </div>
      </div>

      {/* Primary KPI Status Cards: Instantaneous Site Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Surface Illumination State */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b] space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Surface Illumination State
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <div
              className={`w-3 h-3 rounded-full ${
                selectedSite.sunlight.isIlluminated ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500'
              }`}
            />
            <span className="text-base font-bold text-white font-mono">
              {selectedSite.sunlight.isIlluminated
                ? 'DIRECT SUNLIGHT'
                : selectedSite.terrain.isPermanentShadowRegion
                ? 'DEEP PSR (TOTAL DARK)'
                : 'TOPOGRAPHIC SHADOW'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            {selectedSite.sunlight.isIlluminated
              ? 'Unobstructed line-of-sight to the solar disk over crater rim.'
              : selectedSite.terrain.isPermanentShadowRegion
              ? 'Permanently shadowed crater interior cold trap.'
              : 'Sun is occluded below surrounding crater rim terrain.'}
          </p>
        </div>

        {/* 2. Solar Elevation & Margin */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b] space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Solar Elevation Angle
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {selectedSite.sunlight.solarElevationDeg > 0
              ? `+${selectedSite.sunlight.solarElevationDeg.toFixed(2)}°`
              : `${selectedSite.sunlight.solarElevationDeg.toFixed(2)}°`}
          </div>
          <p className="text-[11px] text-slate-400">
            Crater Rim Horizon: <span className="text-slate-200 font-semibold">{transitionForecast.rimElevationDeg.toFixed(2)}°</span>
            {' '}({selectedSite.sunlight.solarElevationDeg >= transitionForecast.rimElevationDeg ? 'Clear of rim' : 'Occluded by rim'})
          </p>
        </div>

        {/* 3. Sunlight Duration & Transition Forecast */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b] space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Transition & Duration Forecast
          </div>
          <div>
            {transitionForecast.isPermanentShadow ? (
              <div className="text-base font-bold font-mono text-indigo-400">
                Continuous Cryogenic Darkness
              </div>
            ) : transitionForecast.hoursToNextTransition !== null ? (
              <div className="text-xl font-bold font-mono text-sky-400">
                {transitionForecast.nextTransitionType === 'shadow'
                  ? `~${transitionForecast.hoursToNextTransition}h to Shadow`
                  : `~${transitionForecast.hoursToNextTransition}h to Sunrise`}
              </div>
            ) : (
              <div className="text-base font-bold font-mono text-amber-400">
                Continuous Polar Summer Sunlight
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {transitionForecast.isPermanentShadow
              ? 'Sunlight duration is 0% across entire synodic year.'
              : transitionForecast.nextTransitionType === 'shadow'
              ? `Estimated remaining sunlit window: ~${transitionForecast.estimatedSunlightSpanHours}h.`
              : `Upcoming sunlit duration after sunrise: ~${transitionForecast.estimatedSunlightSpanHours}h.`}
          </p>
        </div>

        {/* 4. Solar Flux & Energy */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b] space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Direct Solar Irradiance
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {selectedSite.sunlight.solarFluxWm2}{' '}
            <span className="text-xs font-normal text-slate-400">W/m²</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Synodic Sunlit Estimate: <span className="text-amber-400 font-semibold">{selectedSite.sunlight.predictedIlluminationPercent}%</span> (~{selectedSite.sunlight.totalSunlitHours}h / 708h).
          </p>
        </div>
      </div>

      {/* Main Illumination Chart (Recharts) */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1b]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Solar Elevation & Horizon Profile Timeline</span>
            </h2>
            <p className="text-xs text-slate-400">
              Solar elevation angle (gold) plotted against local crater rim terrain mask (slate dashed)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Window:</span>
            {[7, 14, 28].map(days => (
              <button
                key={days}
                onClick={() => setMissionDurationDays(days)}
                className={`px-2.5 py-1 rounded-md border transition-all ${
                  simulationState.missionDurationDays === days
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="solarElevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timeStr"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                domain={[-4, 4]}
                unit="°"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c1220',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              {/* Zero Horizon Line */}
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Horizon (0°)', fill: '#94a3b8', fontSize: 10 }} />
              {/* Local Crater Rim Horizon Mask */}
              <Area
                type="monotone"
                dataKey="rimElevation"
                name="Crater Rim Mask (°)"
                stroke="#64748b"
                strokeDasharray="3 3"
                fill="none"
              />
              {/* Solar Elevation */}
              <Area
                type="monotone"
                dataKey="solarElevation"
                name="Solar Elevation (°)"
                stroke="#fbbf24"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#solarElevGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engineering Insights & Assumptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Photovoltaic Array Engineering */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Lunar Polar Solar Array Architecture</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Because the Sun grazes the horizon at elevations under 2° at the lunar south pole, solar panels must be mounted <strong>vertically</strong> on landers or towers (such as NASA Vertical Solar Array Technology - VSAT), rather than flat horizontally.
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Panel Geometry:</span>
              <span className="text-white">Vertical Cylindrical / Sun-Tracking Array</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Triple-Junction GaAs Eff:</span>
              <span className="text-amber-400">28.0% (~381 W/m² peak)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shadow Penetration:</span>
              <span className="text-white">Long shadows stretch tens of kilometers</span>
            </div>
          </div>
        </div>

        {/* Cryogenic Thermal Survivability & Assumptions */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Simulation Assumptions & Thermal Limits</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            In shadow, lunar surface temperatures plunge to 40 Kelvin (-233°C). Any lander operating across shadow transitions requires radioisotope heater units (RHUs) or active battery survival modes.
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Illuminated Surface Temp:</span>
              <span className="text-amber-400">~220 K (-53°C)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shadowed Surface Temp:</span>
              <span className="text-indigo-400">~40 K to 90 K (-233°C to -183°C)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Model Assumptions:</span>
              <span className="text-slate-300">LOLA DEM 360° Rim Mask, IAU DE421 Ephemeris</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
