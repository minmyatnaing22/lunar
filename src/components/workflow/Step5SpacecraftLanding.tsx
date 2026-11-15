'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Rocket,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Camera,
  Eye,
  CheckCircle2,
  TrendingDown,
  Activity,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  LunarLanding3DCanvas,
  LunarLanding3DCanvasHandles,
  LandingPhase,
  CameraViewMode,
} from '@/components/landing/LunarLanding3DCanvas';

// Base descent duration for realistic pace: 75 seconds
const BASE_DESCENT_DURATION_MS = 75000;

export const Step5SpacecraftLanding: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    setWorkflowStep,
  } = useMission();

  const canvasRef = useRef<LunarLanding3DCanvasHandles | null>(null);

  // Landing Simulation State
  const [landingPhase, setLandingPhase] = useState<LandingPhase>('orbit');
  const [descentProgress, setDescentProgress] = useState(0.0);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('chase');

  // Animation frame refs
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Start descent automatically on mount if still in orbit phase
  useEffect(() => {
    const timer = setTimeout(() => {
      setLandingPhase('descending');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Realistic Flight Guidance Telemetry derived from progress t in [0, 1]
  const flightTelemetry = useMemo(() => {
    const t = Math.max(0, Math.min(1, descentProgress));

    // Altitude curve: 15,000m to 0m (smooth quadratic deceleration)
    const altitudeMeters = t >= 1.0 ? 0 : Math.round(15000 * Math.pow(1 - t, 2.2));

    // Velocity: 1,680 m/s to 0.0 m/s
    const velocityMs = t >= 1.0 ? 0.0 : Math.round((1680 * Math.pow(1 - t, 1.6) + 0.4) * 10) / 10;

    // Throttle %
    let throttlePct = 0;
    if (t < 0.65) throttlePct = 100;
    else if (t < 0.92) throttlePct = Math.round(100 - ((t - 0.65) / 0.27) * 45); // throttles down to ~55%
    else if (t < 0.999) throttlePct = Math.round(55 - ((t - 0.92) / 0.079) * 25); // terminal throttling ~30%
    else throttlePct = 0; // Cutoff at touchdown

    // Pitch attitude: 48° braking tilt to 0° vertical
    const pitchDeg = t < 0.5 ? Math.round(48 - (t / 0.5) * 18) : t < 0.88 ? Math.round(30 - ((t - 0.5) / 0.38) * 28) : 0;

    // Flight Stage definition
    let stageNumber = 1;
    let stageName = 'Powered Descent Initiation (PDI)';
    let stageDesc = 'Main descent engine ignited at 15 km altitude. Braking retrograde against orbital velocity.';

    if (t >= 0.999) {
      stageNumber = 6;
      stageName = 'Engine Cutoff & Surface Telemetry Verified';
      stageDesc = 'Main thruster cutoff verified. Landing gear shocks settled. Spacecraft stable on lunar surface.';
    } else if (t >= 0.92) {
      stageNumber = 5;
      stageName = 'Terminal Touchdown & Contact Sensing';
      stageDesc = 'Final vertical descent at 1.2 m/s. Regolith dust wash expanding radially. Footpad contact probes primed.';
    } else if (t >= 0.75) {
      stageNumber = 4;
      stageName = 'Vertical Gate & Attitude Nulling';
      stageDesc = 'Pitch attitude upright (0°). Velocity reduced below 15 m/s. Micro-RCS pulses nulling lateral drift.';
    } else if (t >= 0.50) {
      stageNumber = 3;
      stageName = 'Terminal Approach Guidance';
      stageDesc = 'Pitch-over maneuver aligning TRN optical sensors with designated landing coordinates.';
    } else if (t >= 0.15) {
      stageNumber = 2;
      stageName = 'Main Braking Phase';
      stageDesc = 'Full-thrust retrograde burn decelerating horizontal kinetic velocity by >80%.';
    }

    return {
      altitudeMeters,
      velocityMs,
      throttlePct,
      pitchDeg,
      stageNumber,
      stageName,
      stageDesc,
    };
  }, [descentProgress]);

  // Restart Sequence
  const handleRestart = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    lastTimeRef.current = null;
    setDescentProgress(0.0);
    setLandingPhase('descending');
    setIsPaused(false);
  }, []);

  // Animation Loop for Flight Sequence
  useEffect(() => {
    if (landingPhase !== 'descending' || isPaused) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const deltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const increment = (deltaMs / BASE_DESCENT_DURATION_MS) * playbackSpeed;

      setDescentProgress(prev => {
        const next = prev + increment;
        if (next >= 1.0) {
          setLandingPhase('landed');
          setTimeout(() => setLandingPhase('verified'), 1200);
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

  const isLanded = descentProgress >= 1.0 || landingPhase === 'landed' || landingPhase === 'verified';

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col overflow-hidden bg-[#030508] text-slate-100 font-sans select-none">
      {/* 3D Spacecraft Lander & Moon Descent Scene */}
      <div className="absolute inset-0 z-0">
        <LunarLanding3DCanvas
          ref={canvasRef}
          simulationDate={simulationDate}
          candidateSites={[selectedSite]}
          selectedSite={selectedSite}
          landingPhase={landingPhase}
          descentProgress={descentProgress}
          onSelectSite={() => {}}
          cameraViewMode={cameraViewMode}
          onCameraModeChange={setCameraViewMode}
        />
      </div>

      {/* Top Overlaid Telemetry & Flight Guidance HUD */}
      <div className="relative z-10 p-4 sm:p-6 pointer-events-none flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: Flight Stage Indicator */}
        <div className="bg-[#080d18]/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-2xl max-w-md pointer-events-auto">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-950 border border-sky-800 text-sky-300 font-mono text-[10px] font-bold">
                {flightTelemetry.stageNumber}
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {flightTelemetry.stageName}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              {Math.round(descentProgress * 100)}% Complete
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {flightTelemetry.stageDesc}
          </p>

          <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1.5 border-t border-slate-800/80 pt-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Target: {selectedSite.name} ({selectedSite.latitude.toFixed(2)}°, {selectedSite.longitude.toFixed(2)}°)</span>
          </div>
        </div>

        {/* Right: Camera Angle Toolbar & Controls */}
        <div className="bg-[#080d18]/90 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-2xl flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <span className="text-[10px] font-mono uppercase text-slate-400 px-2 flex items-center gap-1">
            <Camera className="w-3 h-3 text-sky-400" />
            <span>Camera</span>
          </span>

          {(['chase', 'ground', 'navcam', 'orbital'] as CameraViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setCameraViewMode(mode);
                canvasRef.current?.setCameraMode(mode);
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition-all ${
                cameraViewMode === mode
                  ? 'bg-sky-500 text-black font-bold shadow-sm'
                  : 'bg-[#0c1220] hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Real-Time Instrument HUD (Left Side) */}
      <div className="relative z-10 px-4 sm:px-6 pointer-events-none mt-auto mb-20 max-w-sm">
        <div className="bg-[#080d18]/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-2xl space-y-2.5 pointer-events-auto font-mono text-xs">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span>Descent Guidance Telemetry</span>
            <span className="text-sky-400">[SIMULATED PROFILE]</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Altitude (AGL)</span>
              <span className="text-base font-bold text-white">
                {flightTelemetry.altitudeMeters.toLocaleString()} m
              </span>
            </div>
            <div className="p-2 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Velocity</span>
              <span className="text-base font-bold text-sky-300">
                {flightTelemetry.velocityMs.toFixed(1)} m/s
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Descent Throttle</span>
              <span className="text-sm font-bold text-amber-300">
                {flightTelemetry.throttlePct}%
              </span>
            </div>
            <div className="p-2 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Pitch Attitude</span>
              <span className="text-sm font-bold text-slate-200">
                {flightTelemetry.pitchDeg}°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Mission Playback Control Bar */}
      <div className="relative z-20 w-full bg-[#070b14]/95 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Play / Pause / Restart & Speed */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-mono font-bold transition-all shadow-sm"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1220] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors"
              title="Restart landing sequence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            {/* Playback Speed Options */}
            <div className="flex items-center bg-[#0c1220] rounded-lg border border-slate-700 p-0.5 text-xs font-mono">
              {([0.5, 1, 2] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 rounded text-[11px] transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-sky-950 text-sky-400 font-bold border border-sky-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex-1 max-w-md flex items-center gap-2.5">
            <span className="text-[10px] font-mono text-slate-400 w-12 text-right">
              {Math.round(descentProgress * 75)}s
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={descentProgress}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setDescentProgress(val);
                if (val >= 1.0) {
                  setLandingPhase('landed');
                } else {
                  setLandingPhase('descending');
                }
              }}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <span className="text-[10px] font-mono text-slate-400 w-12">
              75s
            </span>
          </div>

          {/* Touchdown / Mission Result Transition Action */}
          <div className="flex items-center gap-2 shrink-0">
            {isLanded ? (
              <button
                onClick={() => setWorkflowStep('result')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold transition-all shadow-lg animate-pulse"
              >
                <span>View Mission Result</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={() => setWorkflowStep('confirm-site')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Abort / Back</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
