'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Compass,
  MapPin,
  Sun,
  Globe2,
  Radio,
  Mountain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Rocket,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Lunar3DCanvas, Lunar3DCanvasHandles } from '@/components/map/Lunar3DCanvas';
import { calculateLunarSurfaceObservation } from '@/lib/astronomy/lunarTrajectoryService';

export const Step4SiteConfirmation: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    setWorkflowStep,
  } = useMission();

  const canvasRef = useRef<Lunar3DCanvasHandles | null>(null);

  // Automatically focus on the selected site coordinates when mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      canvasRef.current?.focusCoordinates(selectedSite.latitude, selectedSite.longitude);
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedSite.latitude, selectedSite.longitude]);

  // High-precision observation
  const obs = useMemo(() => {
    return calculateLunarSurfaceObservation(
      selectedSite.latitude,
      selectedSite.longitude,
      simulationDate,
      selectedSite.elevationMeters
    );
  }, [selectedSite, simulationDate]);

  const dateStr = simulationDate.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#05070c] text-slate-100 font-sans">
      {/* Left Confirmation Card Column */}
      <div className="w-full lg:w-[460px] xl:w-[500px] h-auto lg:h-full bg-[#080c16]/95 border-r border-slate-800 flex flex-col justify-between shrink-0 z-20 overflow-y-auto">
        <div className="p-5 sm:p-6 space-y-5">
          {/* Step Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase">
                Step 4 of 5
              </span>
              <span className="text-xs text-slate-400 font-mono">Final Pre-Flight Review</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Confirm Landing Site
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Review target coordinates and operational conditions before committing the spacecraft to powered descent initiation.
            </p>
          </div>

          {/* Target Location Card */}
          <div className="p-4 rounded-xl border border-sky-600/80 bg-[#0c1424] space-y-3 shadow-lg">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold block">
                  Designated Touchdown Target
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {selectedSite.name}
                </h2>
              </div>
              <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-800">
                <MapPin className="w-5 h-5" />
              </div>
            </div>

            {/* Coordinates & Region */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#070b16] border border-slate-800">
                <span className="text-[9px] uppercase text-slate-500 block">Target Coordinates</span>
                <span className="text-slate-200 font-bold text-sm">
                  {selectedSite.latitude.toFixed(2)}° Lat, {selectedSite.longitude.toFixed(2)}° Lon
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#070b16] border border-slate-800">
                <span className="text-[9px] uppercase text-slate-500 block">Lunar Region</span>
                <span className="text-slate-200 font-bold text-sm">
                  {selectedSite.region}
                </span>
              </div>
            </div>

            {/* Elevation & Slope Status */}
            <div className="p-2.5 rounded bg-[#070b16] border border-slate-800 text-xs font-mono flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Elevation</span>
                <span className="text-slate-200 font-semibold">
                  {selectedSite.elevationMeters ? `${selectedSite.elevationMeters.toLocaleString()} m` : 'Unavailable'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase text-slate-500 block">Local Slope</span>
                <span className="text-slate-200 font-semibold">
                  {selectedSite.terrain.slopeDegrees.toFixed(1)}°
                </span>
              </div>
            </div>
          </div>

          {/* Concise Conditions Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Operational Conditions Summary
            </h3>

            {/* Sunlight Summary */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0a0f1d] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Sunlight Conditions</span>
                </span>
                <span className="text-amber-400 font-bold">
                  {selectedSite.sunlight.predictedIlluminationPercent}% Availability
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div>Sun Elevation: <strong className="text-slate-200">{obs.sun.elevationDeg > 0 ? '+' : ''}{obs.sun.elevationDeg.toFixed(1)}°</strong></div>
                <div>Status: <strong className="text-slate-200">{selectedSite.sunlight.isIlluminated ? 'Sunlit' : 'Shadowed'}</strong></div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">
                Solar arrays will receive direct grazing illumination for electrical power during descent and initial surface deployment.
              </p>
            </div>

            {/* Earth & Comms Summary */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0a0f1d] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-sky-400" />
                  <span>Earth Visibility & Communication</span>
                </span>
                <span className="text-sky-400 font-bold">
                  {selectedSite.communication.directCommsAvailabilityPercent}% Window
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div>Earth Elevation: <strong className="text-slate-200">{obs.earth.elevationDeg.toFixed(1)}°</strong></div>
                <div>Round-Trip Delay: <strong className="text-slate-200">{(obs.earth.lightTimeSeconds * 2).toFixed(2)} s</strong></div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  {(selectedSite.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'unobstructed-by-mask'
                    ? 'Direct line-of-sight confirmed clear of 8-point terrain mask.'
                    : 'Relay support active for terrain-obstructed windows.'}
                </span>
              </div>
            </div>

            {/* Scientific Caveat / Transparency */}
            <div className="p-3 rounded-lg border border-slate-800/80 bg-[#070a14] text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[10px] uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Mission Planning Disclosure</span>
              </div>
              <p className="leading-relaxed">
                {selectedSite.terrain.dataSource || 'Reference literature benchmark values from NASA/USGS Artemis studies.'} 
                Calculated vacuum speed-of-light propagation is {obs.earth.lightTimeSeconds.toFixed(3)}s one-way.
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 Action Footer */}
        <div className="p-5 border-t border-slate-800 bg-[#070b14] space-y-2.5">
          <button
            onClick={() => setWorkflowStep('landing')}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs sm:text-sm font-mono font-bold transition-all shadow-lg ring-2 ring-sky-500/30"
          >
            <Rocket className="w-4 h-4 stroke-[2.5]" />
            <span>Confirm Site & Begin Spacecraft Landing</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={() => setWorkflowStep('compare-sites')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white text-xs font-mono transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Candidate Comparison (Change Site)</span>
          </button>
        </div>
      </div>

      {/* Center/Right 3D Moon Canvas focused at target location */}
      <div className="flex-1 relative h-[450px] lg:h-full bg-[#05070c] overflow-hidden">
        <Lunar3DCanvas
          ref={canvasRef}
          candidateSites={[selectedSite]}
          selectedSiteId={selectedSite.id}
          onSelectSite={() => {}}
          onRaycastPoint={() => {}}
          inspectedPoint={{
            lat: selectedSite.latitude,
            lon: selectedSite.longitude,
          }}
          showBackgroundEarth={true}
        />

        {/* Top Right Floating Toolbar */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-[#090d16]/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl">
          <button
            onClick={() => canvasRef.current?.focusCoordinates(selectedSite.latitude, selectedSite.longitude)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-mono border border-sky-800 font-semibold transition-colors"
            title="Focus camera directly on confirmed target"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Target View</span>
          </button>

          <div className="flex items-center bg-[#0c1220] rounded border border-slate-700 p-0.5">
            <button
              onClick={() => canvasRef.current?.zoomIn()}
              className="p-1.5 text-slate-400 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => canvasRef.current?.zoomOut()}
              className="p-1.5 text-slate-400 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Floating Coordinates Target Reticle */}
        <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 z-10 max-w-sm bg-[#090d16]/90 backdrop-blur-md p-3 rounded-lg border border-sky-700/80 shadow-lg font-mono text-xs text-slate-300 flex items-center gap-3">
          <div className="p-2 rounded bg-sky-950 border border-sky-800 text-sky-400 shrink-0">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="text-[10px] text-sky-400 uppercase tracking-wider font-bold">
              Camera Locked to Target
            </div>
            <div className="font-semibold text-white">
              {selectedSite.latitude.toFixed(2)}° Lat, {selectedSite.longitude.toFixed(2)}° Lon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
