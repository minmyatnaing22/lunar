'use client';

import React, { useState, useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Globe2,
  Mountain,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Info,
  Compass,
  Radio,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Activity,
  Sliders,
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
import { generateHorizonProfile, calculateEarthPosition } from '@/lib/astronomy/earthVisibility';
import { calculateLunarEphemeris } from '@/lib/astronomy/ephemeris';
import { getCraterRimHorizonElevation } from '@/lib/astronomy/illumination';

export const EarthVisibilitySimulator: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    setSimulationDate,
    stepSimulationHours,
    setActiveSection,
    simulationState,
    setMissionDurationDays,
  } = useMission();

  // Interactive timeline scrub offset (in hours from current simulationDate)
  const [timelineHourOffset, setTimelineHourOffset] = useState<number>(0);
  const [selectedAzimuthFilter, setSelectedAzimuthFilter] = useState<number | null>(null);

  // Active evaluation date based on scrubber
  const activeDate = useMemo(() => {
    return new Date(simulationDate.getTime() + timelineHourOffset * 3600 * 1000);
  }, [simulationDate, timelineHourOffset]);

  // Compute ephemeris and Earth position for the active date
  const activeEphemeris = useMemo(() => {
    return calculateLunarEphemeris(activeDate);
  }, [activeDate]);

  const activeEarthPos = useMemo(() => {
    return calculateEarthPosition(
      selectedSite.latitude,
      selectedSite.longitude,
      activeEphemeris.subEarthLat,
      activeEphemeris.subEarthLon,
      activeEphemeris.earthMoonDistanceKm
    );
  }, [selectedSite.latitude, selectedSite.longitude, activeEphemeris]);

  // Local crater rim elevation in Earth's azimuth direction
  const rimElevationInEarthDir = useMemo(() => {
    return getCraterRimHorizonElevation(
      activeEarthPos.azimuthDeg,
      selectedSite.terrain.craterRimMask
    );
  }, [activeEarthPos.azimuthDeg, selectedSite.terrain.craterRimMask]);

  // Clearance margin: Earth elevation minus rim elevation
  const clearanceDeg = activeEarthPos.elevationDeg - rimElevationInEarthDir;
  const isDirectLOS = activeEarthPos.elevationDeg > 0 && clearanceDeg > 0;
  const isBlockedByRim = activeEarthPos.elevationDeg > 0 && clearanceDeg <= 0;
  const isBelowGeometricHorizon = activeEarthPos.elevationDeg <= 0;

  // Horizon radar profile (360 degrees)
  const horizonProfile = useMemo(() => {
    return generateHorizonProfile(selectedSite.terrain);
  }, [selectedSite.terrain]);

  // Generate 14-day Earth visibility timeline dataset for Recharts
  const timelineDataset = useMemo(() => {
    const points = [];
    const totalHours = simulationState.missionDurationDays * 24;
    const step = 6; // 6-hour intervals

    for (let h = 0; h <= totalHours; h += step) {
      const pointDate = new Date(simulationDate.getTime() + h * 3600 * 1000);
      const pointEph = calculateLunarEphemeris(pointDate);
      const pointPos = calculateEarthPosition(
        selectedSite.latitude,
        selectedSite.longitude,
        pointEph.subEarthLat,
        pointEph.subEarthLon,
        pointEph.earthMoonDistanceKm
      );
      const pointRim = getCraterRimHorizonElevation(
        pointPos.azimuthDeg,
        selectedSite.terrain.craterRimMask
      );

      const hasLOS = pointPos.elevationDeg > 0 && pointPos.elevationDeg > pointRim;

      points.push({
        hourOffset: h,
        timeStr: pointDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        earthElevation: Math.round(pointPos.elevationDeg * 100) / 100,
        rimElevation: Math.round(pointRim * 100) / 100,
        clearance: Math.round((pointPos.elevationDeg - pointRim) * 100) / 100,
        hasLOS,
      });
    }

    return points;
  }, [
    selectedSite.latitude,
    selectedSite.longitude,
    selectedSite.terrain,
    simulationDate,
    simulationState.missionDurationDays,
  ]);

  // Calculate percentage of timeline with direct LOS
  const visibleHoursCount = timelineDataset.filter(p => p.hasLOS).length;
  const losAvailabilityPct = timelineDataset.length > 0
    ? Math.round((visibleHoursCount / timelineDataset.length) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-200">
      {/* Top Header & Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Mission Control Module
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Topocentric Horizon & Lunar Libration Geometry
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Demo Simulation Data
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Earth Visibility Simulator
          </h1>
        </div>

        {/* Quick Switch to Communication Module */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('comms')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0c1220] hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-xs font-mono border border-slate-700 transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Switch to Communication Module</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Selected Location Strip */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Observation Point
          </div>
          <div className="text-sm font-bold text-white">
            {selectedSite.name.replace('—', '-')}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <div>
            <span className="text-slate-400">Coordinates: </span>
            <span>{Math.abs(selectedSite.latitude).toFixed(3)}° S, {selectedSite.longitude.toFixed(3)}° E</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
          <div>
            <span className="text-slate-400">Elevation: </span>
            <span>{selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters}m` : `${selectedSite.elevationMeters}m`}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
          <div>
            <span className="text-slate-400">Local Slope: </span>
            <span>{selectedSite.terrain.slopeDegrees.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Badge Card */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Line of Sight Status
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                isDirectLOS
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : isBlockedByRim
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {isDirectLOS
                ? 'DIRECT LINE OF SIGHT'
                : isBlockedByRim
                ? 'CRATER RIM OCCLUDED'
                : 'BELOW GEOMETRIC HORIZON'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            {isDirectLOS
              ? 'Unobstructed view to Earth above surrounding terrain.'
              : isBlockedByRim
              ? 'Earth is above 0° horizon, but blocked by crater topography.'
              : 'Earth is below local mathematical horizontal plane.'}
          </p>
        </div>

        {/* Earth Apparent Elevation */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Earth Apparent Elevation
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {activeEarthPos.elevationDeg > 0
              ? `+${activeEarthPos.elevationDeg.toFixed(2)}°`
              : `${activeEarthPos.elevationDeg.toFixed(2)}°`}
          </div>
          <div className="text-[11px] text-slate-400">
            Geometric Horizon: <span className="text-slate-300">0.00°</span>
          </div>
        </div>

        {/* Terrain Rim Obstruction & Clearance */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Crater Rim Clearance Margin
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              clearanceDeg > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {clearanceDeg > 0
              ? `+${clearanceDeg.toFixed(2)}°`
              : `${clearanceDeg.toFixed(2)}°`}
          </div>
          <div className="text-[11px] text-slate-400">
            Local Rim Elevation: <span className="text-slate-300">{rimElevationInEarthDir.toFixed(2)}°</span>
          </div>
        </div>

        {/* Libration Drift */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Lunar Libration Angles
          </div>
          <div className="text-sm font-mono text-white pt-1">
            <div>Lon: <span className="text-sky-400 font-bold">{activeEphemeris.subEarthLon > 0 ? `+${activeEphemeris.subEarthLon.toFixed(2)}°` : `${activeEphemeris.subEarthLon.toFixed(2)}°`}</span></div>
            <div>Lat: <span className="text-sky-400 font-bold">{activeEphemeris.subEarthLat > 0 ? `+${activeEphemeris.subEarthLat.toFixed(2)}°` : `${activeEphemeris.subEarthLat.toFixed(2)}°`}</span></div>
          </div>
          <div className="text-[10px] text-slate-400">
            Cycle Period: ~27.3 Days (Draconic/Anomalistic)
          </div>
        </div>
      </div>

      {/* Main Center Area: Observation Horizon Sky Radar & Telemetry Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 360-Degree Topocentric Horizon Visualizer */}
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-[#070a12] p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Lunar Topocentric Horizon Radar</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Azimuth 0° to 360° | Elevation -5° to +20° | Crater Rim Obstruction Mask
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 self-start sm:self-auto">
              Datum: Topocentric Local Tangent Plane
            </span>
          </div>

          {/* SVG Celestial Horizon Sky Plot */}
          <div className="w-full max-w-[420px] aspect-square mx-auto my-2 relative flex items-center justify-center">
            <svg viewBox="-120 -120 240 240" className="w-full h-full select-none">
              {/* Concentric Elevation Circles */}
              <circle cx="0" cy="0" r="100" fill="none" stroke="#1e293b" strokeWidth="1" />
              <circle cx="0" cy="0" r="80" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="0" cy="0" r="60" fill="none" stroke="#1e293b" strokeWidth="1" />
              <circle cx="0" cy="0" r="40" fill="none" stroke="#1e293b" strokeWidth="1" />
              <circle cx="0" cy="0" r="20" fill="none" stroke="#1e293b" strokeWidth="1" />

              {/* Azimuth Axis Lines */}
              <line x1="-105" y1="0" x2="105" y2="0" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="-105" x2="0" y2="105" stroke="#1e293b" strokeWidth="1" />

              {/* Compass Cardinal Points */}
              <text x="0" y="-108" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">N (0°)</text>
              <text x="110" y="3" fill="#94a3b8" fontSize="8" textAnchor="start" fontFamily="monospace">E (90°)</text>
              <text x="0" y="115" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">S (180°)</text>
              <text x="-110" y="3" fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">W (270°)</text>

              {/* Crater Rim Elevation Profile Mask (Polygon) */}
              <polygon
                points={horizonProfile
                  .map(pt => {
                    const rad = (pt.azimuth - 90) * (Math.PI / 180.0);
                    // 80 is 0 deg horizon, 20 is +15 deg
                    const r = 80 - (pt.rimElevationDeg / 15.0) * 60;
                    const x = r * Math.cos(rad);
                    const y = r * Math.sin(rad);
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="rgba(51, 65, 85, 0.25)"
                stroke="#64748b"
                strokeWidth="1.5"
              />

              {/* Earth Position Marker */}
              {(() => {
                const azRad = (activeEarthPos.azimuthDeg - 90) * (Math.PI / 180.0);
                const clampedElev = Math.max(-5, Math.min(20, activeEarthPos.elevationDeg));
                const rEarth = 80 - (clampedElev / 15.0) * 60;
                const ex = rEarth * Math.cos(azRad);
                const ey = rEarth * Math.sin(azRad);

                return (
                  <g>
                    {/* Bearing Ray */}
                    <line x1="0" y1="0" x2={ex} y2={ey} stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1" strokeDasharray="2 2" />

                    {/* Earth Disk Indicator */}
                    <circle
                      cx={ex}
                      cy={ey}
                      r="6.5"
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <circle cx={ex - 1.5} cy={ey - 1.5} r="2" fill="#e0f2fe" />

                    {/* Label */}
                    <text
                      x={ex + 9}
                      y={ey + 3}
                      fill="#38bdf8"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      EARTH ({activeEarthPos.elevationDeg > 0 ? `+${activeEarthPos.elevationDeg.toFixed(1)}°` : `${activeEarthPos.elevationDeg.toFixed(1)}°`})
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Plot Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400 border border-slate-400 border-dashed"></span>
                <span>Geometric Horizon (0°)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-slate-700/40 border border-slate-500"></span>
                <span>Crater Rim Horizon Mask</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500"></span>
                <span>Earth Disk</span>
              </div>
            </div>
            <div className="text-slate-400">
              Azimuth: <span className="text-white font-semibold">{activeEarthPos.azimuthDeg.toFixed(1)}°</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Topocentric Telemetry & Crater Rim Breakdown */}
        <div className="space-y-4">
          {/* Scientific Distinction Callout */}
          <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-2 text-xs">
            <div className="font-bold text-sky-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Geometric vs. Terrain Visibility</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Geometric visibility calculates whether Earth center is above 0°. 
              At high polar latitudes, surrounding topography rises 2° to 6°. 
              Direct line of sight exists only when Earth elevation exceeds the local crater rim mask.
            </p>
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-amber-300 font-mono">
              Notice: Optical line-of-sight does not equate to operational radio communication. Radio link closure requires positive RF link margin (&gt;3 dB) and station elevations &gt;10°.
            </div>
          </div>

          {/* Detailed Angles Panel */}
          <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-2.5 text-xs font-mono">
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
              Calculated Topocentric Angles
            </div>
            <div className="flex justify-between p-2 rounded bg-[#090d16] border border-slate-800">
              <span className="text-slate-400">Apparent Elevation:</span>
              <span className="text-white font-bold">
                {activeEarthPos.elevationDeg > 0 ? `+${activeEarthPos.elevationDeg.toFixed(2)}°` : `${activeEarthPos.elevationDeg.toFixed(2)}°`}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#090d16] border border-slate-800">
              <span className="text-slate-400">Azimuth Bearing:</span>
              <span className="text-white font-bold">{activeEarthPos.azimuthDeg.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#090d16] border border-slate-800">
              <span className="text-slate-400">Rim Elevation Mask:</span>
              <span className="text-slate-300 font-bold">{rimElevationInEarthDir.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#090d16] border border-slate-800">
              <span className="text-slate-400">Earth Apparent Size:</span>
              <span className="text-slate-300 font-bold">~1.90° Angular Dia</span>
            </div>
          </div>

          {/* Earth Phase in Lunar Sky */}
          <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                Earth Phase from Moon
              </span>
              <span className="text-sky-400 font-bold">{selectedSite.earthVisibility.earthPhase}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Illuminated Fraction:</span>
              <span className="text-white font-bold">{Math.round(selectedSite.earthVisibility.phaseFraction * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-sm overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-sm"
                style={{ width: `${Math.round(selectedSite.earthVisibility.phaseFraction * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visibility Timeline & Interactive Timeline Scrubber */}
      <div className="p-5 rounded-lg border border-slate-800 bg-[#0c1220] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Earth Visibility & Terrain Mask Timeline</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Earth Elevation (Cyan) vs Crater Rim Obstruction (Slate) across mission duration
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">Timeframe:</span>
            {[7, 14, 28].map(days => (
              <button
                key={days}
                onClick={() => setMissionDurationDays(days)}
                className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                  simulationState.missionDurationDays === days
                    ? 'bg-sky-950 text-sky-300 border-sky-700'
                    : 'bg-[#090d16] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="earthElevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
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
                domain={[-4, 10]}
                unit="°"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Horizon (0°)', fill: '#94a3b8', fontSize: 10 }} />
              {/* Crater Rim Elevation Profile */}
              <Area
                type="monotone"
                dataKey="rimElevation"
                name="Crater Rim Mask (°)"
                stroke="#64748b"
                strokeDasharray="3 3"
                fill="none"
              />
              {/* Earth Elevation Profile */}
              <Area
                type="monotone"
                dataKey="earthElevation"
                name="Earth Elevation (°)"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#earthElevGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Scrub Control */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Scrub Time (+/-):</span>
            <input
              type="range"
              min="0"
              max={simulationState.missionDurationDays * 24}
              step="6"
              value={timelineHourOffset}
              onChange={e => setTimelineHourOffset(Number(e.target.value))}
              className="w-48 accent-sky-500"
            />
            <span className="text-white font-semibold">+{timelineHourOffset}h</span>
            {timelineHourOffset !== 0 && (
              <button
                onClick={() => {
                  setSimulationDate(activeDate);
                  setTimelineHourOffset(0);
                }}
                className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 hover:bg-sky-900 text-[10px] font-semibold transition-colors"
                title="Apply scrubbed timestamp to global mission simulation clock"
              >
                Apply to Mission Clock
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <div>
              <span>Direct LOS Availability: </span>
              <span className="text-emerald-400 font-bold">{losAvailabilityPct}%</span>
            </div>
            <button
              onClick={() => setTimelineHourOffset(0)}
              className="px-2 py-1 rounded bg-[#090d16] border border-slate-800 hover:text-white text-[11px]"
            >
              Reset Scrubber
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
