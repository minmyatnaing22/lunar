'use client';

import React, { useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sun,
  Globe2,
  Radio,
  Mountain,
  RotateCcw,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { calculateLunarSurfaceObservation } from '@/lib/astronomy/lunarTrajectoryService';

export const Step6MissionResult: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    setWorkflowStep,
    resetWorkflow,
  } = useMission();

  // High-precision observation at mission touchdown time
  const obs = useMemo(() => {
    return calculateLunarSurfaceObservation(
      selectedSite.latitude,
      selectedSite.longitude,
      simulationDate,
      selectedSite.elevationMeters
    );
  }, [selectedSite, simulationDate]);

  const dateStr = simulationDate.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

  const isPSR = selectedSite.terrain.isPermanentShadowRegion;
  const isSlopeHazard = selectedSite.terrain.slopeDegrees >= 10.0;
  const isSlopeMarginal = selectedSite.terrain.slopeDegrees >= 5.0 && selectedSite.terrain.slopeDegrees < 10.0;
  const hasEarthLOS = selectedSite.earthVisibility.hasDirectLineOfSight;

  return (
    <div className="w-full min-h-full bg-[#05070c] text-slate-100 font-sans py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-4xl mx-auto flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Mission Completion Banner */}
        <div className="p-6 rounded-2xl border border-emerald-500/80 bg-gradient-to-b from-[#09181c] to-[#070e17] shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg">
                <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase tracking-wider">
                    Mission Accomplished
                  </span>
                  <span className="text-xs font-mono text-slate-400">Step 6 of 6</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
                  Touchdown Confirmed
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Spacecraft has safely completed powered descent and settled on the lunar surface.
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-slate-400 bg-[#060a12]/80 p-3 rounded-lg border border-slate-800/80 shrink-0">
              <span className="text-[10px] uppercase text-slate-500 block">Touchdown Epoch</span>
              <span className="text-white font-semibold">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Selected Landing Location & Coordinates Card */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#080d18] shadow-md space-y-3">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                Landing Site
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{selectedSite.name}</span>
              </h2>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#0c1220] text-slate-300 border border-slate-700">
              {selectedSite.region}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Latitude</span>
              <span className="text-sm font-bold text-slate-200">{selectedSite.latitude.toFixed(2)}°</span>
            </div>
            <div className="p-2.5 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Longitude</span>
              <span className="text-sm font-bold text-slate-200">{selectedSite.longitude.toFixed(2)}°</span>
            </div>
            <div className="p-2.5 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Elevation</span>
              <span className="text-sm font-bold text-slate-200">
                {selectedSite.elevationMeters ? `${selectedSite.elevationMeters.toLocaleString()} m` : 'Unavailable'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-[#0b1222] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block">Surface Slope</span>
              <span className="text-sm font-bold text-slate-200">
                {selectedSite.terrain.slopeDegrees.toFixed(1)}°
              </span>
            </div>
          </div>
        </div>

        {/* Sunlight & Earth Visibility Post-Landing Assessment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sunlight Assessment */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#080d18] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Sunlight Assessment</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isPSR
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : selectedSite.sunlight.isIlluminated
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {isPSR ? 'Permanent Shadow' : selectedSite.sunlight.isIlluminated ? 'Sunlit' : 'Shadowed'}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Sun Elevation:</span>
                <span className="font-bold text-amber-300">{obs.sun.elevationDeg > 0 ? '+' : ''}{obs.sun.elevationDeg.toFixed(2)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Solar Bearing:</span>
                <span>{obs.sun.azimuthDeg.toFixed(1)}° from North</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">14-Day Sunlight Availability:</span>
                <span className="font-bold text-amber-400">{selectedSite.sunlight.predictedIlluminationPercent}%</span>
              </div>
            </div>

            <p className="text-[11px] font-sans text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
              {isPSR
                ? 'Solar arrays receive no direct illumination. Spacecraft must rely on internal battery reserves or external power infrastructure.'
                : 'Direct grazing solar illumination is available for top-deck solar arrays to sustain battery charging and surface payload operations.'}
            </p>
          </div>

          {/* Earth Visibility & Communication Assessment */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#080d18] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-sky-400" />
                <span>Earth Visibility & Comms</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  (selectedSite.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'unobstructed-by-mask'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : (selectedSite.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'terrain-obstructed'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}
              >
                {(selectedSite.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'unobstructed-by-mask'
                  ? 'Unobstructed Line-of-Sight'
                  : (selectedSite.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'terrain-obstructed'
                  ? 'Terrain-Obstructed'
                  : 'Below Horizon'}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Earth Geometric Elevation:</span>
                <span className="font-bold text-sky-300">{obs.earth.elevationDeg.toFixed(2)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Speed-of-Light Travel:</span>
                <span>{obs.earth.lightTimeSeconds.toFixed(3)} s one-way ({(obs.earth.lightTimeSeconds * 2).toFixed(3)} s RTT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Direct Comms Window:</span>
                <span className="font-bold text-sky-400">{selectedSite.communication.directCommsAvailabilityPercent}%</span>
              </div>
            </div>

            <p className="text-[11px] font-sans text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
              {hasEarthLOS
                ? 'High-gain steerable dish antenna has verified direct line-of-sight to NASA Deep Space Network (DSN) ground antennas.'
                : 'Direct line-of-sight is obstructed by local topography. Scheduled telemetry passes must utilize cis-lunar relay satellites.'}
            </p>
          </div>
        </div>

        {/* Important Limitations & Methodological Disclosures */}
        <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-[#070b14] space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-300">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Important Scientific Limitations & Operational Disclosures</span>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-400 font-sans leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-slate-500 font-mono">•</span>
              <span>
                <strong>Terrain Reference Data:</strong> Predefined landing site elevation and slope values represent published literature benchmarks from NASA Artemis and USGS LOLA studies; client does not sample live LOLA DEM raster grids.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500 font-mono">•</span>
              <span>
                <strong>Approximate Terrain Mask:</strong> Horizon obstruction was evaluated against an 8-point azimuthal horizon profile. Fine-scale sub-kilometer rocks, craterlets, and boulder shadows are unmodeled.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500 font-mono">•</span>
              <span>
                <strong>Light-Time vs Network Delay:</strong> Calculated signal delays represent pure vacuum speed-of-light propagation ($d/c$). Real-world communication includes RF framing, baseband modulation, and terrestrial ground routing overhead.
              </span>
            </li>
            {isSlopeHazard && (
              <li className="flex items-start gap-2 text-rose-300">
                <span className="font-mono font-bold">!</span>
                <span>
                  <strong>High Slope Warning:</strong> This location features a slope gradient of {selectedSite.terrain.slopeDegrees}°, exceeding the standard 10° lander stability threshold.
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#080d18] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => setWorkflowStep('landing')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0c1220] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay 3D Descent Sequence</span>
          </button>

          <button
            onClick={() => {
              resetWorkflow();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-mono font-bold transition-all shadow-md ring-2 ring-sky-500/20"
          >
            <span>Plan Another Landing Mission</span>
            <ArrowLeft className="w-4 h-4 stroke-[2.5] rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
