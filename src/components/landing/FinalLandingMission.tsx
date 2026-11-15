'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Pause,
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
  Camera,
  Eye,
} from 'lucide-react';
import {
  LunarLanding3DCanvas,
  LunarLanding3DCanvasHandles,
  LandingPhase,
  CameraViewMode,
} from './LunarLanding3DCanvas';
import { evaluateSiteSuitability } from '@/lib/astronomy/suitability';

// Base descent duration for realistic cinematic pace: 75 seconds (between 60–90 seconds)
const BASE_DESCENT_DURATION_MS = 75000;

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

  // View mode: 2D telemetry by default, 3D descent simulation on-demand
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Mission Landing Sequence State
  const [landingPhase, setLandingPhase] = useState<LandingPhase>('orbit');
  const [descentProgress, setDescentProgress] = useState(0.0);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('chase');

  // Animation frame references
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

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

  // Flight Guidance Telemetry derived from descent progress t in [0, 1]
  const flightTelemetry = useMemo(() => {
    const t = Math.max(0, Math.min(1, descentProgress));

    // Altitude curve: 15,000m to 0m (smooth deceleration, not linear)
    const altitudeMeters = t >= 1.0 ? 0 : Math.round(15000 * Math.pow(1 - t, 2.2));

    // Descent rate: 1,680 m/s to 0.0 m/s
    const velocityMs = t >= 1.0 ? 0.0 : Math.round((1680 * Math.pow(1 - t, 1.6) + 0.4) * 10) / 10;

    // Propellant consumption: 32.5% consumed during nominal powered descent
    const fuelRemainingPct = Math.round(100 - t * 32.5);

    // Flight stages & attitude profile
    let stageNumber = 1;
    let stageName = 'Stage 1: Powered Descent Initiation (PDI)';
    let stageDescription = 'Retrograde braking burn initiated. Main engine 100% thrust. Attitude tilted 48° retrograde.';
    let throttlePct = 100;
    let pitchDeg = Math.round(48 * (1 - t / 0.75));

    if (t < 0.18) {
      stageNumber = 1;
      stageName = 'Stage 1: Powered Descent Initiation (PDI)';
      stageDescription = 'Retrograde braking burn initiated. Main engine 100% thrust. Spacecraft tilted 48° retrograde.';
      throttlePct = 100;
      pitchDeg = Math.round(48 * (1 - t / 0.75));
    } else if (t < 0.52) {
      stageNumber = 2;
      stageName = 'Stage 2: Main Braking Phase';
      stageDescription = 'Continuous retrograde deceleration. Gravity-turn pitch-over maneuver in progress.';
      throttlePct = 85;
      pitchDeg = Math.round(48 * Math.pow(1 - t / 0.75, 1.8));
    } else if (t < 0.80) {
      stageNumber = 3;
      stageName = 'Stage 3: Terminal Approach Guidance';
      stageDescription = 'Pitch-over to near vertical. Optical Terrain Relative Navigation (TRN) scanning landing site.';
      throttlePct = 65;
      pitchDeg = Math.round(15 * Math.max(0, 1 - (t - 0.52) / 0.28));
    } else if (t < 0.94) {
      stageNumber = 4;
      stageName = 'Stage 4: Vertical Gate & Attitude Nulling';
      stageDescription = 'Spacecraft aligned strictly with lunar vertical. Descent velocity decelerating toward soft-contact rate.';
      throttlePct = 45;
      pitchDeg = 0;
    } else if (t < 1.0) {
      stageNumber = 5;
      stageName = 'Stage 5: Terminal Touchdown & Contact Sensing';
      stageDescription = 'Footpads approaching regolith. Gentle cushioning thrust. Surface contact probes active.';
      throttlePct = 30;
      pitchDeg = 0;
    } else {
      stageNumber = 6;
      stageName = 'Stage 6: Engine Cutoff & Surface Telemetry Verified';
      stageDescription = 'Touchdown confirmed at selected coordinates. Main engine shutdown. High-gain dish aligned with Earth.';
      throttlePct = 0;
      pitchDeg = 0;
    }

    return {
      altitudeMeters,
      velocityMs,
      throttlePct,
      pitchDeg,
      fuelRemainingPct,
      stageNumber,
      stageName,
      stageDescription,
    };
  }, [descentProgress]);

  // Handle Starting the Powered Descent Initiation (PDI)
  const handleStartLanding = () => {
    if (landingPhase === 'descending') return;
    setLandingPhase('descending');
    setDescentProgress(0.0);
    setIsPaused(false);
    lastTimeRef.current = null;
  };

  // Toggle Pause/Resume
  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
    lastTimeRef.current = null;
  };

  // Reset landing sequence to orbit mode
  const handleResetLanding = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setLandingPhase('orbit');
    setDescentProgress(0.0);
    setIsPaused(false);
    lastTimeRef.current = null;
    canvasRef.current?.resetCamera();
  }, []);

  // Cinematic Animation Loop
  useEffect(() => {
    if (landingPhase !== 'descending' || isPaused) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const increment = (dt / BASE_DESCENT_DURATION_MS) * playbackSpeed;

      setDescentProgress(prev => {
        const next = prev + increment;
        if (next >= 1.0) {
          setLandingPhase('landed');
          setTimeout(() => {
            setLandingPhase('verified');
          }, 2000);
          return 1.0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [landingPhase, isPaused, playbackSpeed]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Camera preset handler
  const handleSelectCameraMode = (mode: CameraViewMode) => {
    setCameraViewMode(mode);
    canvasRef.current?.setCameraMode(mode);
  };

  // Final Mission Verdict calculation
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
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-semibold">
              Mission Landing Module
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Powered Descent Initiation (PDI) & Terminal Guidance Simulation
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Robotic Spacecraft Simulator
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Lunar Landing Simulation & Mission Integration
          </h1>
        </div>

        {/* Time Step & Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => stepSimulationHours(1)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Step forward 1 hour"
            >
              +1h
            </button>
            <button
              onClick={() => stepSimulationHours(6)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Step forward 6 hours"
            >
              +6h
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#0c1220] p-1 rounded-xl border border-slate-800">
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
        </div>
      </div>

      {/* Selected Location Strip with Dropdown Selector */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Touchdown Target Site
              </div>
              <div className="text-sm font-bold text-white">
                {selectedSite.name.replace('—', '-')}
              </div>
            </div>
          </div>

          <select
            value={selectedSite.id}
            onChange={e => {
              setSelectedSiteId(e.target.value);
              handleResetLanding();
            }}
            disabled={landingPhase === 'descending'}
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

      {/* Main Space Viewport: 2D Telemetry Radar (Default) or 3D Landing Simulation (On-Demand) */}
      <div className="rounded-xl border border-slate-800 bg-[#03050a] relative flex flex-col items-center justify-center overflow-hidden h-[540px] lg:h-[680px] shadow-2xl">
        {viewMode === '3d' ? (
          <div className="w-full h-full absolute inset-0">
            <LunarLanding3DCanvas
              ref={canvasRef}
              simulationDate={simulationDate}
              candidateSites={savedSites}
              selectedSite={selectedSite}
              landingPhase={landingPhase}
              descentProgress={descentProgress}
              cameraViewMode={cameraViewMode}
              onCameraModeChange={setCameraViewMode}
              onSelectSite={siteId => {
                if (landingPhase !== 'descending') {
                  setSelectedSiteId(siteId);
                  handleResetLanding();
                }
              }}
            />
          </div>
        ) : (
          /* 2D High-Speed Flight Guidance & Descent Radar */
          <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-6 bg-radial-gradient from-slate-900/40 to-[#03050a]">
            <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-6">
              {/* Descent Trajectory Elevation Profile SVG */}
              <div className="w-full bg-[#090d16]/80 border border-slate-800/80 rounded-xl p-4 backdrop-blur">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold uppercase">
                    <TrendingDown className="w-4 h-4" />
                    Powered Descent Profile (PDI)
                  </span>
                  <span>Target: {selectedSite.name}</span>
                </div>

                <div className="relative h-32 w-full">
                  <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                    {/* Gridlines */}
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#334155" strokeWidth="1.5" />

                    {/* Nominal Descent Curve: Orbit (15km) to Touchdown (0km) */}
                    <path
                      d="M 20 20 C 140 20, 260 50, 480 100"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                    />

                    {/* Target Touchdown Ellipse */}
                    <ellipse cx="480" cy="100" rx="14" ry="4" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

                    {/* Current Position Marker along curve */}
                    {(() => {
                      const t = descentProgress;
                      const px = 20 * Math.pow(1 - t, 3) + 3 * 140 * Math.pow(1 - t, 2) * t + 3 * 260 * (1 - t) * Math.pow(t, 2) + 480 * Math.pow(t, 3);
                      const py = 20 * Math.pow(1 - t, 3) + 3 * 20 * Math.pow(1 - t, 2) * t + 3 * 50 * (1 - t) * Math.pow(t, 2) + 100 * Math.pow(t, 3);
                      return (
                        <g>
                          <circle cx={px} cy={py} r="6" fill="#38bdf8" />
                          <circle cx={px} cy={py} r="12" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6">
                            <animate attributeName="r" values="8;18;8" dur="1.8s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite" />
                          </circle>
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 px-1">
                  <span>Parking Orbit (15,000m)</span>
                  <span>Braking Burn (10,000m)</span>
                  <span>Terminal Approach (450m)</span>
                  <span className="text-emerald-400 font-semibold">Touchdown (0m)</span>
                </div>
              </div>

              {/* Launch 3D Simulation CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setViewMode('3d')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-950/70 hover:bg-sky-900 border border-sky-700/80 text-sky-200 text-xs font-mono font-bold tracking-wide transition-all shadow-lg hover:shadow-sky-500/20"
                >
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>LAUNCH 3D DESCENT VIEW</span>
                </button>
                <span className="text-xs text-slate-500 font-mono">
                  (On-demand WebGL: saves GPU memory when idle)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top-Left Telemetry HUD: Powered Descent Guidance Computer */}
        <div className="absolute top-4 left-4 bg-[#090d16]/92 border border-slate-800/90 p-3.5 rounded-xl backdrop-blur text-xs font-mono space-y-2 shadow-2xl min-w-[240px] max-w-[310px] z-10 pointer-events-none sm:pointer-events-auto">
          <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Guidance Computer</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              {flightTelemetry.stageNumber}/6
            </span>
          </div>

          <div className="text-[11px] font-bold text-white leading-tight">
            {flightTelemetry.stageName}
          </div>
          <p className="text-[10px] text-slate-400 leading-normal font-sans">
            {flightTelemetry.stageDescription}
          </p>

          <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Altitude:</span>
              <span className="text-sky-300 font-bold">{flightTelemetry.altitudeMeters.toLocaleString()} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Velocity:</span>
              <span className="text-white font-bold">{flightTelemetry.velocityMs.toFixed(1)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Main Engine Throttle:</span>
              <span className={`font-bold ${flightTelemetry.throttlePct > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {flightTelemetry.throttlePct > 0 ? `${flightTelemetry.throttlePct}%` : '0% (CUTOFF)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pitch Attitude:</span>
              <span className="text-slate-300 font-bold">
                {flightTelemetry.pitchDeg > 0 ? `${flightTelemetry.pitchDeg}° Retrograde` : '0° Upright Vertical'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Propellant:</span>
              <span className="text-emerald-400 font-bold">{flightTelemetry.fuelRemainingPct}%</span>
            </div>
          </div>

          {landingPhase === 'descending' && (
            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Descent Progress:</span>
                <span className="text-white font-bold">{Math.round(descentProgress * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.round(descentProgress * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="text-[9px] text-slate-500 border-t border-slate-800/80 pt-1">
            [FLIGHT DYNAMICS SIMULATION APPROXIMATION]
          </div>
        </div>

        {/* Top-Right Toolbar: 2D/3D Mode & Camera Presets */}
        <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2 z-10">
          {/* Mode switcher */}
          <div className="flex items-center rounded-lg bg-[#090d16]/90 border border-slate-800 p-0.5 backdrop-blur text-xs font-mono shadow-lg">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                viewMode === '2d'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2D Radar
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                viewMode === '3d'
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D Descent
            </button>
          </div>

          {viewMode === '3d' && (
            <div className="flex items-center gap-1 rounded-lg bg-[#090d16]/90 border border-slate-800 p-1 backdrop-blur text-xs font-mono shadow-lg">
              <button
                onClick={() => handleSelectCameraMode('chase')}
                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                  cameraViewMode === 'chase'
                    ? 'bg-sky-950 text-sky-300 font-bold border border-sky-700'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Cinematic tracking camera following the spacecraft"
              >
                <Camera className="w-3 h-3" />
                <span>Chase</span>
              </button>
              <button
                onClick={() => handleSelectCameraMode('ground')}
                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                  cameraViewMode === 'ground'
                    ? 'bg-sky-950 text-sky-300 font-bold border border-sky-700'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Surface Artemis spotter view looking up from the crater floor"
              >
                <Eye className="w-3 h-3" />
                <span>Surface</span>
              </button>
              <button
                onClick={() => handleSelectCameraMode('navcam')}
                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                  cameraViewMode === 'navcam'
                    ? 'bg-sky-950 text-sky-300 font-bold border border-sky-700'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Downward-pointing Terrain Relative Navigation camera"
              >
                <TrendingDown className="w-3 h-3" />
                <span>NavCam</span>
              </button>
              <button
                onClick={() => handleSelectCameraMode('orbital')}
                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                  cameraViewMode === 'orbital'
                    ? 'bg-sky-950 text-sky-300 font-bold border border-sky-700'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Broad cislunar perspective"
              >
                <Globe2 className="w-3 h-3" />
                <span>Orbital</span>
              </button>
            </div>
          )}
        </div>

        {/* Center-Bottom Controls: Start Landing, Pause/Resume, Speed Pills, Scrub Bar */}
        <div className="absolute bottom-5 left-4 right-4 flex flex-col items-center gap-2 z-10 pointer-events-auto">
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

          {landingPhase === 'descending' && (
            <div className="w-full max-w-2xl bg-[#090d16]/92 border border-slate-800 rounded-xl p-3 backdrop-blur space-y-2 shadow-2xl">
              {/* Transport Toolbar: Play/Pause, Speeds, Reset */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-sm"
                    title={isPaused ? 'Resume descent' : 'Pause descent'}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
                    <span className="text-[10px] text-slate-400 px-1.5">Speed:</span>
                    {([0.5, 1, 2] as const).map(speed => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          playbackSpeed === speed
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">
                    Alt: <strong className="text-sky-300">{flightTelemetry.altitudeMeters}m</strong> | Vel: <strong className="text-white">{flightTelemetry.velocityMs}m/s</strong>
                  </span>
                  <button
                    onClick={handleResetLanding}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                    title="Abort descent and return to parking orbit"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Interactive Timeline Scrub Bar */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={descentProgress}
                    onChange={e => {
                      setDescentProgress(Number(e.target.value));
                      lastTimeRef.current = null;
                    }}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>PDI (15km)</span>
                  <span>Braking (10km)</span>
                  <span>Approach (2.5km)</span>
                  <span>Vertical Gate (450m)</span>
                  <span className="text-emerald-400 font-semibold">Touchdown (0m)</span>
                </div>
              </div>
            </div>
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
              Landing gear static tip-over threshold: 10.0°. Low roughness allows safe pad settlement.
            </p>
          </div>

          {/* 2. Solar Illumination */}
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="uppercase text-[10px]">2. Solar Illumination</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {selectedSite.sunlight.isIlluminated ? 'Direct Sunlight' : 'Terrain Shadow'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {isSunlit ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Generation ({selectedSite.sunlight.solarFluxWm2} W/m²)
                </span>
              ) : isPSR ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Permanent Shadow Region (0 W)
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Diurnal Shadow Phase
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Predicted monthly illumination: {selectedSite.sunlight.predictedIlluminationPercent}%. Solar arrays power science instruments.
            </p>
          </div>

          {/* 3. Direct Earth Visibility */}
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="uppercase text-[10px]">3. Earth Line-of-Sight</span>
              <Globe2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {selectedSite.earthVisibility.visibilityStatus === 'geometrically-below-horizon'
                ? 'Below Horizon'
                : selectedSite.earthVisibility.visibilityStatus === 'terrain-obstructed'
                ? 'Rim Occluded'
                : 'Direct LOS'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {selectedSite.earthVisibility.visibilityStatus === 'unobstructed-by-mask' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Elev: +{selectedSite.earthVisibility.earthElevationDeg.toFixed(1)}°
                </span>
              ) : selectedSite.earthVisibility.visibilityStatus === 'terrain-obstructed' ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Blocked by Crater Rim Mask
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Geometrically Below Horizon
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Earth angular size: ~1.90°. Libration offset: {selectedSite.earthVisibility.librationLonDeg.toFixed(1)}° Lon.
            </p>
          </div>

          {/* 4. Telecommunications Link */}
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="uppercase text-[10px]">4. DSN Communications</span>
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {selectedSite.communication.directCommsAvailabilityPercent}% DTE
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {selectedSite.communication.hasDirectEarthLOS ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {selectedSite.communication.activeDsnStation || 'Ground Linked'}
                </span>
              ) : selectedSite.communication.isRelaySupported ? (
                <span className="text-sky-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Relay Connected
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> RF Blackout
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Round-trip light time: {selectedSite.communication.roundTripLatencySeconds}s. Longest blackout: {selectedSite.communication.longestBlackoutHours}h.
            </p>
          </div>
        </div>
      </div>

      {/* Post-Landing Mission Verdict (Displayed after Touchdown) */}
      {(landingPhase === 'landed' || landingPhase === 'verified') && (
        <div className={`p-5 rounded-xl border ${
          finalMissionVerdict.color === 'emerald'
            ? 'bg-emerald-950/40 border-emerald-800'
            : finalMissionVerdict.color === 'amber'
            ? 'bg-amber-950/40 border-amber-800'
            : 'bg-rose-950/40 border-rose-800'
        } space-y-3 shadow-2xl`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${
                finalMissionVerdict.color === 'emerald'
                  ? 'bg-emerald-900 text-emerald-300'
                  : finalMissionVerdict.color === 'amber'
                  ? 'bg-amber-900 text-amber-300'
                  : 'bg-rose-900 text-rose-300'
              }`}>
                {finalMissionVerdict.color === 'emerald' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Landing Sequence Execution Complete
                </span>
                <h3 className="text-base font-bold text-white font-mono">
                  {finalMissionVerdict.title}
                </h3>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
              finalMissionVerdict.color === 'emerald'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : finalMissionVerdict.color === 'amber'
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-rose-950 text-rose-300 border-rose-700'
            }`}>
              {finalMissionVerdict.status}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {finalMissionVerdict.summary}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 border-t border-slate-800/60">
            <div>
              <span>Touchdown Coordinates: </span>
              <strong className="text-white">
                {Math.abs(selectedSite.latitude).toFixed(3)}° S, {selectedSite.longitude.toFixed(3)}° E
              </strong>
            </div>
            <div>
              <span>Touchdown Velocity: </span>
              <strong className="text-emerald-400">&lt; 0.8 m/s (Nominal Soft Landing)</strong>
            </div>
            <div>
              <span>Residual Propellant: </span>
              <strong className="text-sky-300">{flightTelemetry.fuelRemainingPct}% (Reserve Margins Nominal)</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
