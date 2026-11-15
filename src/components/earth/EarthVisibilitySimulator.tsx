'use client';

import React, { useState, useMemo, useRef } from 'react';
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
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  MapPin,
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
import { LunarEarth3DCanvas, LunarEarth3DCanvasHandles } from './LunarEarth3DCanvas';

export const EarthVisibilitySimulator: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    simulationDate,
    setSimulationDate,
    stepSimulationHours,
    togglePlayback,
    setActiveSection,
    simulationState,
    setMissionDurationDays,
  } = useMission();

  const canvasRef = useRef<LunarEarth3DCanvasHandles | null>(null);

  // View Mode: 2D Radar Horizon (Default, lightweight) vs 3D Cislunar View (Optional)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Interactive timeline scrub offset (in hours from current simulationDate)
  const [timelineHourOffset, setTimelineHourOffset] = useState<number>(0);

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
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Mission Control Module
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Topocentric Horizon & Lunar Libration Geometry
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              3D Planetary Simulation
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Earth Visibility Simulator
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
                  ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                  : 'bg-sky-950/80 text-sky-300 border border-sky-800 hover:bg-sky-900'
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
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <input
                type="date"
                value={isoDate}
                onChange={handleDateChange}
                className="bg-transparent text-white font-mono focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-xs">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <input
                type="time"
                value={isoTime}
                onChange={handleTimeChange}
                className="bg-transparent text-white font-mono focus:outline-none"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400 px-1">UTC</span>
          </div>

          {/* Quick Switch to Communication Module */}
          <button
            onClick={() => setActiveSection('comms')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1220] hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-xs font-mono border border-slate-700 transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Comms Module</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Selected Location Strip with Dropdown Selector */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Observation Point
              </div>
              <div className="text-sm font-bold text-white">
                {selectedSite.name.replace('—', '-')}
              </div>
            </div>
          </div>

          <select
            value={selectedSite.id}
            onChange={e => setSelectedSiteId(e.target.value)}
            className="bg-[#090d16] border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-sky-400"
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
            <span className="text-slate-400">Elevation: </span>
            <span className="text-white font-semibold">
              {selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters}m` : `${selectedSite.elevationMeters}m`}
            </span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
          <div>
            <span className="text-slate-400">Local Slope: </span>
            <span className="text-white font-semibold">{selectedSite.terrain.slopeDegrees.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* View Mode Switcher: 2D Radar (Fast & Default) vs 3D Cislunar Perspective */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c1220] p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider pl-1.5">View Mode:</span>
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === '2d'
                ? 'bg-sky-950 text-sky-300 font-bold border border-sky-700 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>2D Radar Horizon (Default)</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === '3d'
                ? 'bg-sky-950 text-sky-300 font-bold border border-sky-700 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>3D Cislunar Earth View</span>
          </button>
        </div>
        <span className="text-[10px] text-slate-500 hidden md:inline pr-2">
          {viewMode === '2d' ? 'Lightweight Topocentric Elevation Mask' : 'Interactive Three.js Planetary Canvas'}
        </span>
      </div>

      {/* 3D Cislunar Simulation Viewport: Earth, Moon, Sun & Surface Perspective (Optional) */}
      {viewMode === '3d' && (
        <div className="rounded-xl border border-slate-800 bg-[#030509] relative flex flex-col items-center justify-center overflow-hidden h-[540px] lg:h-[660px] shadow-2xl">
          <div className="w-full h-full absolute inset-0">
            <LunarEarth3DCanvas
              ref={canvasRef}
              simulationDate={simulationDate}
              candidateSites={savedSites}
              selectedSite={selectedSite}
              onSelectSite={setSelectedSiteId}
            />
          </div>

          {/* Top-Left Telemetry HUD: Lunar Libration & Earth Telemetry */}
          <div className="absolute top-4 left-4 bg-[#090d16]/90 border border-slate-800/90 p-3 rounded-lg backdrop-blur text-xs font-mono pointer-events-none space-y-1">
            <div className="text-[10px] text-sky-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Earth & Libration State</span>
            </div>
            <div className="text-slate-300">
              Sub-Earth Lat: <span className="text-white font-bold">{activeEphemeris.subEarthLat > 0 ? `+${activeEphemeris.subEarthLat.toFixed(2)}°` : `${activeEphemeris.subEarthLat.toFixed(2)}°`}</span>
            </div>
            <div className="text-slate-300">
              Sub-Earth Lon: <span className="text-white font-bold">{activeEphemeris.subEarthLon > 0 ? `+${activeEphemeris.subEarthLon.toFixed(2)}°` : `${activeEphemeris.subEarthLon.toFixed(2)}°`}</span>
            </div>
            <div className="text-slate-300">
              Earth Distance: <span className="text-sky-300 font-bold">{Math.round(activeEphemeris.earthMoonDistanceKm).toLocaleString()} km</span>
            </div>
            <div className="text-slate-300">
              Phase in Lunar Sky: <span className="text-amber-300 font-bold">{selectedSite.earthVisibility.earthPhase} ({Math.round(selectedSite.earthVisibility.phaseFraction * 100)}%)</span>
            </div>
          </div>

          {/* Top-Right 3D Camera Controls Toolbar */}
          <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => canvasRef.current?.resetEarthView()}
              className="px-3 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-700 text-xs font-mono text-sky-200 font-semibold transition-colors backdrop-blur shadow-sm"
              title="Commanding high-detail orbital view of planet Earth"
            >
              Earth Orbit
            </button>
            <button
              onClick={() => canvasRef.current?.viewEarthNightSide()}
              className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-amber-300 transition-colors backdrop-blur shadow-sm"
              title="Inspect Earth's night side with glowing city lights and twilight terminator"
            >
              Night Lights
            </button>
            <button
              onClick={() => canvasRef.current?.viewArtemisPerspective()}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700 text-xs font-mono text-emerald-300 font-semibold transition-colors backdrop-blur shadow-sm"
              title="Astronaut's perspective from the selected lunar landing site looking up at Earth in the sky"
            >
              Artemis Sky View
            </button>
            <button
              onClick={() => canvasRef.current?.viewCislunarSystem()}
              className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-sm"
              title="Deep space panorama displaying Earth, Moon, and Sun orbital alignment"
            >
              Cislunar System
            </button>
            <button
              onClick={() => canvasRef.current?.focusLandingSite()}
              className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition-colors backdrop-blur shadow-sm"
              title="Close-up focus on the candidate landing site on the Moon"
            >
              Moon Site
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
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400"></span>
                <span>Photorealistic Earth (23.44° Obliquity • Clouds • Atmosphere)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Night City Lights</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-4 h-0.5 ${isDirectLOS ? 'bg-sky-400' : 'bg-rose-400'}`}></span>
                <span>{isDirectLOS ? 'Unobstructed Line-of-Sight (Approx. Mask)' : 'Terrain-Obstructed Line-of-Sight'}</span>
              </span>
            </div>
            <span className="text-slate-400 hidden md:inline">
              Drag to rotate Earth in 3D • Scroll to zoom in on continents • Click Moon pins to switch sites
            </span>
          </div>
        </div>
      )}

      {/* Primary KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Badge Card */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Overall Visibility Status
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                isBelowGeometricHorizon
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : isBlockedByRim
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {isBelowGeometricHorizon
                ? 'BELOW GEOMETRIC HORIZON'
                : isBlockedByRim
                ? 'TERRAIN-OBSTRUCTED (APPROX. MASK)'
                : 'UNOBSTRUCTED BY APPROX. MASK'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1 leading-normal">
            {isBelowGeometricHorizon
              ? 'Earth center is below the ideal 0.00° spherical horizon plane.'
              : isBlockedByRim
              ? 'Earth is geometrically above 0°, but obstructed by the local approximate rim mask.'
              : 'Geometrically visible above 0° with no obstruction detected by the approximate 8-point mask.'}
          </p>
        </div>

        {/* Geometric Earth Apparent Elevation */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Geometric Earth Elevation
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {activeEarthPos.elevationDeg > 0
              ? `+${activeEarthPos.elevationDeg.toFixed(2)}°`
              : `${activeEarthPos.elevationDeg.toFixed(2)}°`}
          </div>
          <div className="text-[11px] text-slate-400">
            Ideal Spherical Horizon: <span className="text-slate-300">0.00° (Datum: 1,737.4 km)</span>
          </div>
        </div>

        {/* Terrain Rim Obstruction & Clearance */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Approx. Rim Mask Clearance
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
            Mask Elevation in Earth Dir: <span className="text-slate-300">{rimElevationInEarthDir.toFixed(2)}°</span>
          </div>
        </div>

        {/* Libration Drift */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-1">
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

      {/* Center Area: Observation Horizon Sky Radar & Telemetry Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 360-Degree Topocentric Horizon Visualizer */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#070a12] p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Lunar Topocentric Horizon Radar</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Azimuth 0° to 360° | Elevation -5° to +20° | Approximate 8-Point Rim Horizon Mask
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
                <span>Approximate 8-Point Rim Mask</span>
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
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-2 text-xs">
            <div className="font-bold text-sky-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Geometric vs. Terrain Visibility</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <strong>Geometric elevation:</strong> Calculated from the analytical surface-observation model relative to the ideal spherical horizon (0.00°).
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <strong>Terrain obstruction:</strong> Evaluated against an <em>approximate 8-point horizon mask</em> with linear interpolation. Because samples are spaced at 45° intervals, narrow massifs or crater ridges between sample points can be missed.
            </p>
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-amber-300 font-mono leading-normal">
              <strong>Operational Link Disclaimer:</strong> Geometric line of sight above an approximate mask is not proof of an operational radio link. Actual radio link closure requires detailed link-budget validation (using illustrative engineering assumptions such as nominal ~3 dB link margins and typical ~10° terrestrial ground-station elevation masks, which serve as mission rules-of-thumb rather than universal NASA flight constraints), antenna radiation patterns, and diffraction modeling, none of which are implemented here.
            </div>
          </div>

          {/* Detailed Angles Panel */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-2.5 text-xs font-mono">
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
              <span className="text-slate-400">Approx. Rim Mask Elevation:</span>
              <span className="text-slate-300 font-bold">{rimElevationInEarthDir.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#090d16] border border-slate-800">
              <span className="text-slate-400">Earth Apparent Size:</span>
              <span className="text-slate-300 font-bold">~1.90° Angular Dia</span>
            </div>
          </div>

          {/* Earth Phase in Lunar Sky */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220] space-y-2 text-xs font-mono">
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
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0c1220] space-y-4">
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
