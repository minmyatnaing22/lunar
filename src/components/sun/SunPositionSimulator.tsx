'use client';

import React, { useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Sun,
  BatteryCharging,
  Clock,
  Calendar,
  Compass,
  AlertTriangle,
  Zap,
  TrendingUp,
  Info,
  ShieldAlert,
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
import { generateIlluminationTimeline } from '@/lib/astronomy/illumination';

export const SunPositionSimulator: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    setSimulationDate,
    stepSimulationHours,
    simulationState,
    setMissionDurationDays,
  } = useMission();

  // Generate hourly illumination timeline for Recharts
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase font-semibold">
              Feature 2
            </span>
            <span className="text-xs text-slate-400 font-mono">
              IAU/JPL Ephemeris Solar Geometry Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Sun Position & Solar Illumination Simulator
          </h1>
        </div>

        {/* Date & Time Selectors */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0c1220] p-1.5 rounded-xl border border-slate-800">
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

      {/* Instantaneous Solar Status KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Illumination Status */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Surface Illumination State
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                selectedSite.sunlight.isIlluminated ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500'
              }`}
            />
            <span className="text-lg font-bold text-white font-mono">
              {selectedSite.sunlight.isIlluminated
                ? 'DIRECT SUNLIGHT'
                : selectedSite.terrain.isPermanentShadowRegion
                ? 'DEEP PSR (TOTAL DARK)'
                : 'TERRAIN SHADOW'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {selectedSite.sunlight.isIlluminated
              ? 'Unobstructed line of sight to solar disk.'
              : selectedSite.terrain.isPermanentShadowRegion
              ? 'Permanently shielded crater interior.'
              : 'Sun is below surrounding crater rim.'}
          </p>
        </div>

        {/* Solar Elevation */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Solar Elevation Angle
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mb-1">
            {selectedSite.sunlight.solarElevationDeg > 0
              ? `+${selectedSite.sunlight.solarElevationDeg.toFixed(2)}°`
              : `${selectedSite.sunlight.solarElevationDeg.toFixed(2)}°`}
          </div>
          <p className="text-[11px] text-slate-400">
            Polar limit: ±1.54° obliquity. Geometric horizon: 0.00°.
          </p>
        </div>

        {/* Solar Azimuth */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Solar Azimuth Direction
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mb-1">
            {selectedSite.sunlight.solarAzimuthDeg.toFixed(1)}°
          </div>
          <p className="text-[11px] text-slate-400">
            Bearing from site: 0° N, 90° E, 180° S, 270° W.
          </p>
        </div>

        {/* Solar Flux */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Direct Solar Irradiance
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {selectedSite.sunlight.solarFluxWm2}{' '}
            <span className="text-xs font-normal text-slate-400">W/m²</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Solar constant: 1,361 W/m² (at 1.0 AU vacuum).
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

      {/* Scientific Insights for Mission Planners */}
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

        {/* Cryogenic Thermal Survivability */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Thermal Extreme & Darkness Risks</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            In shadow, lunar surface temperatures plunge to 40 Kelvin (-233°C). Any lander operating across shadow transitions requires radioisotope heater units (RHUs) or active battery survival modes to prevent propellant freezing.
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
              <span className="text-slate-400">Longest Dark Span:</span>
              <span className="text-white">{selectedSite.sunlight.longestContinuousDarkHours} continuous hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
