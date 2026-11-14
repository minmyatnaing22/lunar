'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Rocket,
  Compass,
  Sun,
  Globe2,
  Radio,
  Mountain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Clock,
  Calendar,
  Layers,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  Activity,
  Zap,
  MapPin,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import {
  LunarLanding3DCanvas,
  LunarLanding3DCanvasHandles,
  LandingPhase,
} from './LunarLanding3DCanvas';
import { evaluateSiteSuitability } from '@/lib/astronomy/suitability';

export const FinalLandingMission: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    simulationDate,
    setSimulationDate,
    stepSimulationHours,
    setActiveSection,
    missionPriorities,
  } = useMission();

  const canvasRef = useRef<LunarLanding3DCanvasHandles | null>(null);

  // Mission Landing Sequence State
  const [landingPhase, setLandingPhase] = useState<LandingPhase>('orbit');
  const [descentProgress, setDescentProgress] = useState(0.0);
  const [liveAltitudeMeters, setLiveAltitudeMeters] = useState(15000);
  const [liveVelocityMs, setLiveVelocityMs] = useState(1680);
  const [fuelPct, setFuelPct] = useState(100);

  // Animation frame ref for descent sequence
  const descentIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-Landing Feasibility Evaluation
  const suitability = useMemo(() => {
    return evaluateSiteSuitability(selectedSite, missionPriorities);
  }, [selectedSite, missionPriorities]);

  // Specific constraint checks
  const isSlopeSafe = selectedSite.terrain.slopeDegrees < 5.0;
  const isSlopeMarginal = selectedSite.terrain.slopeDegrees >= 5.0 && selectedSite.terrain.slopeDegrees < 10.0;
  const isSlopeHazard = selectedSite.terrain.slopeDegrees >= 10.0;

  const isSunlit = selectedSite.sunlight.isIlluminated;
  const isPSR = selectedSite.terrain.isPermanentShadowRegion;

  const hasEarthLOS = selectedSite.earthVisibility.hasDirectLineOfSight;
  const isCommsAvailable = selectedSite.communication.hasDirectEarthLOS || selectedSite.communication.isRelaySupported;

  // Feasibility Readiness Check
  const isReadyForLanding = !isSlopeHazard && !isPSR;

  // Final Mission Verdict calculation (based on physical parameters)
  const finalMissionVerdict = useMemo(() => {
    if (isSlopeHazard) {
      return {
        status: 'FAILED' as const,
        title: 'Mission Failed: Severe Landing Gear Tilt',
        summary: `Local surface slope of ${selectedSite.terrain.slopeDegrees.toFixed(1)}° exceeds the 10.0° critical threshold, causing dynamic tip-over during touchdown.`,
        color: 'rose',
      };
    }
    if (isPSR) {
      return {
        status: 'PARTIALLY SUCCESSFUL' as const,
        title: 'Partially Successful: Cryogenic Battery Survival',
        summary: `Lander touched down stably, but inside a Permanent Shadow Region (40 K). Solar arrays produce 0 W; lander operating on time-limited battery reserves.`,
        color: 'amber',
      };
    }
    if (!isCommsAvailable) {
      return {
        status: 'PARTIALLY SUCCESSFUL' as const,
        title: 'Partially Successful: Communication Blackout',
        summary: `Surface landing successful, but Earth line-of-sight is blocked by the crater rim and orbital relay is out of view. Autonomous science recording active.`,
        color: 'amber',
      };
    }
    if (isSunlit && hasEarthLOS && isSlopeSafe) {
      return {
        status: 'SUCCESSFUL' as const,
        title: 'Mission Complete: Optimal Landing Success',
        summary: `All mission criteria satisfied! Safe terrain slope (${selectedSite.terrain.slopeDegrees.toFixed(1)}°), direct solar illumination (${selectedSite.sunlight.solarFluxWm2} W/m²), and active high-rate DSN communications link.`,
        color: 'emerald',
      };
    }
    return {
      status: 'SUCCESSFUL' as const,
      title: 'Mission Success: Soft Landing Confirmed',
      summary: `Successful touchdown confirmed. Nominal telemetry established with support from relay and secondary tracking channels.`,
      color: 'emerald',
    };
  }, [selectedSite, isSlopeHazard, isSlopeSafe, isPSR, isSunlit, hasEarthLOS, isCommsAvailable]);

  // Handle Starting the Powered Descent Initiation (PDI)
  const handleStartLanding = () => {
    if (landingPhase === 'descending') return;
    setLandingPhase('descending');
    setDescentProgress(0.0);

    let progress = 0.0;
    const durationMs = 8000; // 8-second realistic landing sequence
    const intervalMs = 50;
    const stepIncrement = intervalMs / durationMs;

    if (descentIntervalRef.current) clearInterval(descentIntervalRef.current);

    descentIntervalRef.current = setInterval(() => {
      progress += stepIncrement;
      if (progress >= 1.0) {
        progress = 1.0;
        if (descentIntervalRef.current) clearInterval(descentIntervalRef.current);
        setDescentProgress(1.0);
        setLiveAltitudeMeters(0);
        setLiveVelocityMs(0);
        setFuelPct(68);
        setLandingPhase('landed');

        // Automatically trigger post-landing verification after 1.5s
        setTimeout(() => {
          setLandingPhase('verified');
        }, 1500);
      } else {
        setDescentProgress(progress);
        // Physics curve: altitude decreases from 15,000m to 0m
        const alt = Math.round(15000 * Math.pow(1 - progress, 1.8));
        const vel = Math.round(1680 * (1 - progress) + 1.2);
        const fuel = Math.round(100 - progress * 32);
        setLiveAltitudeMeters(alt);
        setLiveVelocityMs(vel);
        setFuelPct(fuel);
      }
    }, intervalMs);
  };

  // Reset landing sequence to orbit mode
  const handleResetLanding = () => {
    if (descentIntervalRef.current) clearInterval(descentIntervalRef.current);
    setLandingPhase('orbit');
    setDescentProgress(0.0);
    setLiveAltitudeMeters(15000);
    setLiveVelocityMs(1680);
    setFuelPct(100);
    canvasRef.current?.resetCamera();
  };

  useEffect(() => {
    return () => {
      if (descentIntervalRef.current) clearInterval(descentIntervalRef.current);
    };
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-200">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase font-semibold flex items-center gap-1">
              <Rocket className="w-3 h-3" />
              <span>Final Mission Integration (Part 5)</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Terminal Descent & Autonomous Multi-System Verification
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Final Lunar Landing & Mission Verification
          </h1>
        </div>

        {/* Global Simulation Time Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1220] border border-slate-800 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Mission Date: </span>
            <span className="text-white font-semibold">{simulationDate.toISOString().substring(0, 16).replace('T', ' ')} UTC</span>
          </div>
          <button
            onClick={() => stepSimulationHours(6)}
            className="px-2.5 py-1.5 rounded-xl bg-[#0c1220] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition-colors"
            title="Advance mission clock 6 hours"
          >
            +6h
          </button>
        </div>
      </div>

      {/* Candidate Landing Site Selector Strip */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Targeted Landing Site
              </div>
              <div className="text-sm font-bold text-white">
                {selectedSite.name.replace('—', '-')}
              </div>
            </div>
          </div>

          <select
            value={selectedSite.id}
            disabled={landingPhase === 'descending'}
            onChange={e => {
              setSelectedSiteId(e.target.value);
              handleResetLanding();
            }}
            className="bg-[#090d16] border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-emerald-400 disabled:opacity-50"
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
            <span className="text-slate-400">Surface Slope: </span>
            <span className={`font-semibold ${isSlopeSafe ? 'text-emerald-400' : isSlopeMarginal ? 'text-amber-400' : 'text-rose-400'}`}>
              {selectedSite.terrain.slopeDegrees.toFixed(1)}°
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Space Viewport: Landing Simulation & Cislunar Space */}
      <div className="rounded-xl border border-slate-800 bg-[#03050a] relative flex flex-col items-center justify-center overflow-hidden h-[540px] lg:h-[660px] shadow-2xl">
        <div className="w-full h-full absolute inset-0">
          <LunarLanding3DCanvas
            ref={canvasRef}
            simulationDate={simulationDate}
            candidateSites={savedSites}
            selectedSite={selectedSite}
            landingPhase={landingPhase}
            descentProgress={descentProgress}
            onSelectSite={siteId => {
              if (landingPhase !== 'descending') {
                setSelectedSiteId(siteId);
                handleResetLanding();
              }
            }}
          />
        </div>

        {/* Top-Left Telemetry HUD: Powered Descent Flight Computer */}
        <div className="absolute top-4 left-4 bg-[#090d16]/90 border border-slate-800/90 p-3.5 rounded-lg backdrop-blur text-xs font-mono space-y-1.5 shadow-lg min-w-[210px]">
          <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Flight Computer Guidance</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mission Phase:</span>
            <span className="text-white font-bold uppercase text-[11px]">
              {landingPhase === 'orbit' && 'Circular Parking Orbit'}
              {landingPhase === 'descending' && 'Powered Descent (PDI)'}
              {landingPhase === 'landed' && 'Touchdown Confirmed'}
              {landingPhase === 'verified' && 'Surface Verification'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Altitude:</span>
            <span className="text-sky-300 font-bold">{liveAltitudeMeters.toLocaleString()} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Descent Rate:</span>
            <span className="text-white font-bold">{liveVelocityMs} m/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Propellant:</span>
            <span className="text-emerald-400 font-bold">{fuelPct}%</span>
          </div>
          {landingPhase === 'descending' && (
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.round(descentProgress * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Top-Right Camera Controls */}
        <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => canvasRef.current?.resetCamera()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-sm"
          >
            Orbital View
          </button>
          <button
            onClick={() => canvasRef.current?.focusLander()}
            className="px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-800 text-xs font-mono text-sky-300 font-semibold transition-colors backdrop-blur shadow-sm"
          >
            Track Lander
          </button>
          <button
            onClick={() => canvasRef.current?.focusSouthPole()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-sm"
          >
            South Pole
          </button>
          <button
            onClick={() => canvasRef.current?.viewCislunarContext()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-sm"
          >
            Earth & Sun
          </button>
        </div>

        {/* Center-Bottom Action Banner: Initiate Landing or Reset */}
        <div className="absolute bottom-6 flex flex-col items-center gap-2 z-10">
          {landingPhase === 'orbit' && (
            <button
              onClick={handleStartLanding}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold font-mono text-sm tracking-wide transition-all shadow-2xl ${
                isReadyForLanding
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
              }`}
            >
              <Rocket className="w-5 h-5 fill-current" />
              <span>
                {isReadyForLanding
                  ? 'START POWERED DESCENT INITIATION (PDI)'
                  : 'PROCEED WITH HIGH-RISK DESCENT'}
              </span>
            </button>
          )}

          {(landingPhase === 'landed' || landingPhase === 'verified') && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetLanding}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0c1220]/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors backdrop-blur shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Parking Orbit</span>
              </button>
              <button
                onClick={() => setActiveSection('reports')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold transition-colors shadow-lg"
              >
                <span>Export Mission Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pre-Landing Site Feasibility Matrix (4 Environmental Pillars) */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Multi-System Landing Site Pre-Flight Evaluation</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Integrated real-time analysis compiled from Moon, Sun, Earth, and Communication simulations
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded text-xs font-mono font-bold self-start sm:self-auto ${
              isReadyForLanding
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}
          >
            {isReadyForLanding ? 'TOUCHDOWN CERTIFIED' : 'HIGH RISK HAZARD'}
          </span>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* 1. Terrain & Slope */}
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="uppercase text-[10px]">1. Terrain Safety</span>
              <Mountain className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-white">
              Slope: {selectedSite.terrain.slopeDegrees.toFixed(1)}°
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {isSlopeSafe ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Nominal (&lt;5° Safe)
                </span>
              ) : isSlopeMarginal ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Moderate Incline (5-10°)
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Severe Tip-Over Risk (&gt;10°)
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Elevation: {selectedSite.elevationMeters}m. 1m-scale roughness: {selectedSite.terrain.roughnessMeters}m.
            </p>
          </div>

          {/* 2. Sunlight & Power */}
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="uppercase text-[10px]">2. Sunlight & Power</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {isSunlit ? `${selectedSite.sunlight.solarFluxWm2} W/m²` : '0 W/m² (Shadow)'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {isSunlit ? (
                <span className="text-amber-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sunlit ({selectedSite.sunlight.solarElevationDeg > 0 ? `+${selectedSite.sunlight.solarElevationDeg.toFixed(1)}°` : `${selectedSite.sunlight.solarElevationDeg.toFixed(1)}°`})
                </span>
              ) : isPSR ? (
                <span className="text-indigo-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Deep PSR Cold Trap
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Crater Rim Shadow
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Synodic illumination: {selectedSite.sunlight.predictedIlluminationPercent}%. Continuous dark limit: {selectedSite.sunlight.longestContinuousDarkHours}h.
            </p>
          </div>

          {/* 3. Earth Visibility */}
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="uppercase text-[10px]">3. Earth Visibility</span>
              <Globe2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-white">
              Elev: {selectedSite.earthVisibility.earthElevationDeg > 0 ? `+${selectedSite.earthVisibility.earthElevationDeg.toFixed(1)}°` : `${selectedSite.earthVisibility.earthElevationDeg.toFixed(1)}°`}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {hasEarthLOS ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Direct LOS Clear
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Occluded by Rim Topography
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Earth Phase: {selectedSite.earthVisibility.earthPhase}. Libration offset: l={selectedSite.earthVisibility.librationLonDeg}°.
            </p>
          </div>

          {/* 4. Communication Status */}
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="uppercase text-[10px]">4. DSN Communications</span>
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {selectedSite.communication.activeDsnStation || (selectedSite.communication.isRelaySupported ? 'L2 Relay Link' : 'Blackout')}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {selectedSite.communication.hasDirectEarthLOS ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Direct DTE Active
                </span>
              ) : selectedSite.communication.isRelaySupported ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Relay Supported
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Zero RF Coverage
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Latency: {selectedSite.communication.roundTripLatencySeconds}s RTLT. DTE availability: {selectedSite.communication.directCommsAvailabilityPercent}%.
            </p>
          </div>
        </div>
      </div>

      {/* Post-Landing Verification Dashboard (Revealed after touchdown) */}
      {landingPhase === 'verified' && (
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 space-y-5 animate-in fade-in duration-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`p-2 rounded-lg ${
                  finalMissionVerdict.status === 'SUCCESSFUL'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : finalMissionVerdict.status === 'PARTIALLY SUCCESSFUL'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {finalMissionVerdict.status === 'SUCCESSFUL' && <CheckCircle2 className="w-5 h-5" />}
                {finalMissionVerdict.status === 'PARTIALLY SUCCESSFUL' && <AlertTriangle className="w-5 h-5" />}
                {finalMissionVerdict.status === 'FAILED' && <XCircle className="w-5 h-5" />}
              </span>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                  Post-Touchdown Autonomous System Audit
                </div>
                <h3 className="text-base font-bold text-white font-mono">
                  {finalMissionVerdict.title}
                </h3>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                finalMissionVerdict.status === 'SUCCESSFUL'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : finalMissionVerdict.status === 'PARTIALLY SUCCESSFUL'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              FINAL RESULT: {finalMissionVerdict.status}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {finalMissionVerdict.summary}
          </p>

          {/* 4 Telemetry Verification Checkpoint Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {/* 1. Touchdown Coordinates */}
            <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">1. Coordinates Confirmed</div>
              <div className="text-white font-bold">
                {Math.abs(selectedSite.latitude).toFixed(4)}° S, {selectedSite.longitude.toFixed(4)}° E
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Position Lock Verified
              </div>
            </div>

            {/* 2. Solar Array Generation */}
            <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">2. Photovoltaic Array Power</div>
              <div className="text-white font-bold">
                {isSunlit ? `${selectedSite.sunlight.solarFluxWm2} W/m² Generated` : '0 W (Battery Mode)'}
              </div>
              <div className={`text-[11px] flex items-center gap-1 ${isSunlit ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isSunlit ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {isSunlit ? 'Positive Power Margin' : 'Auxiliary Battery Active'}
              </div>
            </div>

            {/* 3. Earth Direct Line-of-Sight */}
            <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">3. Optical Earth Line of Sight</div>
              <div className="text-white font-bold">
                Elev: {selectedSite.earthVisibility.earthElevationDeg.toFixed(2)}°
              </div>
              <div className={`text-[11px] flex items-center gap-1 ${hasEarthLOS ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hasEarthLOS ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {hasEarthLOS ? 'Direct Sightline Established' : 'Crater Topography Occlusion'}
              </div>
            </div>

            {/* 4. DSN Carrier Lock */}
            <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">4. DSN Radio Link Closure</div>
              <div className="text-white font-bold">
                {selectedSite.communication.activeDsnStation || (selectedSite.communication.isRelaySupported ? 'Halo Relay Locked' : 'No Signal')}
              </div>
              <div className={`text-[11px] flex items-center gap-1 ${isCommsAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isCommsAvailable ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {isCommsAvailable ? `Link Margin > 3.0 dB (${selectedSite.communication.roundTripLatencySeconds}s RTT)` : 'Blackout (Link Margin < 0 dB)'}
              </div>
            </div>
          </div>

          {/* Actionable Next Steps / Remediation */}
          {finalMissionVerdict.status !== 'SUCCESSFUL' && (
            <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/60 text-xs font-mono space-y-2">
              <div className="text-amber-300 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Mission Optimization & Recommended Corrections</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                To turn this mission into a 100% full success, you can advance the simulation clock by adjusting the timestamp to align with local lunar sunrise, or switch target to an MCDA-recommended site such as <strong>Shackleton Connecting Ridge</strong> or <strong>Peak of Eternal Light</strong>.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => stepSimulationHours(24)}
                  className="px-3 py-1.5 rounded bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-200 text-xs font-semibold transition-colors"
                >
                  Advance Time +24h (Search for Sunrise)
                </button>
                <button
                  onClick={() => {
                    setSelectedSiteId('shackleton-connecting-ridge');
                    handleResetLanding();
                  }}
                  className="px-3 py-1.5 rounded bg-sky-900/60 hover:bg-sky-800 border border-sky-700 text-sky-200 text-xs font-semibold transition-colors"
                >
                  Switch to Shackleton Connecting Ridge
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
