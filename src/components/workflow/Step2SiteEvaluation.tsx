'use client';

import React, { useState, useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Sun,
  Globe2,
  Radio,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import { calculateLunarSurfaceObservation } from '@/lib/astronomy/lunarTrajectoryService';
import { CandidateLandingSite } from '@/types/mission';

type SunlightRating = 'Good' | 'Limited' | 'Poor';
type EarthVisibilityRating = 'Visible' | 'Partially obstructed' | 'Not visible';
type CommPotentialRating = 'Favorable' | 'Limited' | 'Unavailable';

export const Step2SiteEvaluation: React.FC = () => {
  const {
    candidateSites,
    selectedSite,
    setSelectedSiteId,
    simulationDate,
    setWorkflowStep,
  } = useMission();

  // Active tab if multiple candidate sites were selected in Step 1
  const [activeSiteId, setActiveSiteId] = useState<string>(() => {
    return candidateSites[0]?.id || selectedSite.id;
  });

  // Collapsible Scientific Details toggle (collapsed by default)
  const [isScientificDetailsOpen, setIsScientificDetailsOpen] = useState(false);

  // Evaluate candidate sites with existing calculations
  const evaluations = useMemo(() => {
    return candidateSites.map(site => {
      const obs = calculateLunarSurfaceObservation(
        site.latitude,
        site.longitude,
        simulationDate,
        site.elevationMeters
      );

      const isPSR = site.terrain.isPermanentShadowRegion;
      const sunPct = site.sunlight.predictedIlluminationPercent;

      // 1. Simplified Sunlight Availability Rating
      let sunlightRating: SunlightRating = 'Limited';
      let sunlightExplanation = 'This location experiences periodic sunlight alternating with extended local shadows.';

      if (isPSR) {
        sunlightRating = 'Poor';
        sunlightExplanation = 'This location lies inside a permanently shadowed crater and receives no direct sunlight.';
      } else if (sunPct >= 70) {
        sunlightRating = 'Good';
        sunlightExplanation = 'This location receives sunlight for most of the selected mission period.';
      } else if (sunPct < 35) {
        sunlightRating = 'Poor';
        sunlightExplanation = 'This location remains shadowed for most of the period with only brief sunlight windows.';
      }

      // 2. Simplified Earth Visibility & Communication Rating
      const rawStatus = site.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon');
      const hasDirectLOS = site.communication.hasDirectEarthLOS;
      const isRelaySupported = site.communication.isRelaySupported;

      let earthVisibilityRating: EarthVisibilityRating = 'Visible';
      let commPotentialRating: CommPotentialRating = 'Favorable';
      let earthExplanation = 'Direct line of sight to Earth is clear above the local terrain horizon.';

      if (rawStatus === 'geometrically-below-horizon') {
        earthVisibilityRating = 'Not visible';
        commPotentialRating = isRelaySupported ? 'Limited' : 'Unavailable';
        earthExplanation = 'Earth is below the geometric horizon; direct communication is not possible without an orbital relay satellite.';
      } else if (rawStatus === 'terrain-obstructed') {
        earthVisibilityRating = 'Partially obstructed';
        commPotentialRating = 'Limited';
        earthExplanation = 'Earth is above the horizon but partially blocked by nearby crater rims or elevated topography.';
      } else {
        earthVisibilityRating = 'Visible';
        commPotentialRating = 'Favorable';
        earthExplanation = 'Direct line of sight to Earth is clear above the local terrain horizon.';
      }

      const oneWayLatency = obs.earth.lightTimeSeconds;
      const roundTripLatency = obs.earth.lightTimeSeconds * 2;

      return {
        site,
        obs,
        sunlightRating,
        sunlightExplanation,
        sunPct,
        earthVisibilityRating,
        commPotentialRating,
        earthExplanation,
        oneWayLatency,
        roundTripLatency,
      };
    });
  }, [candidateSites, simulationDate]);

  // Current active candidate evaluation
  const activeEval = evaluations.find(e => e.site.id === activeSiteId) || evaluations[0];

  const dateStr = simulationDate.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

  if (!activeEval) return null;

  return (
    <div className="w-full min-h-full bg-[#05070c] text-slate-100 font-sans py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header: Candidate Tabs (if > 1) */}
      {candidateSites.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Candidate Sites:
          </span>
          {evaluations.map((ev, index) => {
            const isActive = ev.site.id === activeEval.site.id;
            return (
              <button
                key={ev.site.id}
                onClick={() => {
                  setActiveSiteId(ev.site.id);
                  setSelectedSiteId(ev.site.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-sky-500 text-black shadow-md'
                    : 'bg-[#090d18] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                Site {index + 1}: {ev.site.name.split('-')[0].trim()}
              </button>
            );
          })}
        </div>
      )}

      {/* Simplified Top Summary Banner */}
      <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-[#090e1a] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold block">
              Site Evaluation
            </span>
            <h1 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {activeEval.site.name}
            </h1>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              Coordinates: {activeEval.site.latitude.toFixed(2)}°, {activeEval.site.longitude.toFixed(2)}°
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#060a14] px-3.5 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Two Clear Evaluation Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* ========================================================= */}
        {/* SECTION A: SUNLIGHT */}
        {/* ========================================================= */}
        <section className="p-5 sm:p-6 rounded-xl border border-slate-800 bg-[#080d18] flex flex-col justify-between space-y-4 shadow-md">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-400">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    A. Sunlight
                  </h2>
                  <p className="text-[11px] text-slate-400">Solar illumination & surface light</p>
                </div>
              </div>

              {/* Sunlight Availability Status: Good / Limited / Poor */}
              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                  activeEval.sunlightRating === 'Good'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : activeEval.sunlightRating === 'Limited'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                    : 'bg-rose-950/80 text-rose-300 border-rose-800'
                }`}
              >
                {activeEval.sunlightRating}
              </span>
            </div>

            {/* Estimated Sunlight Percentage & Simple Visual Bar */}
            <div className="p-4 rounded-lg bg-[#0b1222] border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">
                  Estimated Sunlight Availability
                </span>
                <span className="text-base font-bold font-mono text-amber-300">
                  {activeEval.sunPct}%
                </span>
              </div>

              {/* Simple visual sunlight availability bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeEval.sunlightRating === 'Good'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                      : activeEval.sunlightRating === 'Limited'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.max(2, activeEval.sunPct)}%` }}
                />
              </div>

              <div className="text-[10px] text-slate-500 font-mono text-right">
                Over 14-day mission period
              </div>
            </div>

            {/* One short explanation */}
            <p className="text-xs text-slate-300 leading-relaxed bg-[#060a14] p-3.5 rounded-lg border border-slate-800/70">
              {activeEval.sunlightExplanation}
            </p>
          </div>

          <div className="text-[10px] font-mono text-slate-500 pt-1">
            Calculated via NASA/JPL planetary ephemeris
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION B: EARTH COMMUNICATION */}
        {/* ========================================================= */}
        <section className="p-5 sm:p-6 rounded-xl border border-slate-800 bg-[#080d18] flex flex-col justify-between space-y-4 shadow-md">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800 text-sky-400">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    B. Earth Communication
                  </h2>
                  <p className="text-[11px] text-slate-400">Line-of-sight & signal transmission</p>
                </div>
              </div>

              {/* Communication Potential: Favorable / Limited / Unavailable */}
              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                  activeEval.commPotentialRating === 'Favorable'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : activeEval.commPotentialRating === 'Limited'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                    : 'bg-rose-950/80 text-rose-300 border-rose-800'
                }`}
              >
                {activeEval.commPotentialRating}
              </span>
            </div>

            {/* Earth Visibility & Signal Travel Time */}
            <div className="grid grid-cols-2 gap-3">
              {/* Earth Visibility */}
              <div className="p-3.5 rounded-lg bg-[#0b1222] border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Earth Visibility</span>
                <span
                  className={`text-sm font-bold font-mono mt-1 ${
                    activeEval.earthVisibilityRating === 'Visible'
                      ? 'text-emerald-400'
                      : activeEval.earthVisibilityRating === 'Partially obstructed'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {activeEval.earthVisibilityRating}
                </span>
              </div>

              {/* Signal Travel Time */}
              <div className="p-3.5 rounded-lg bg-[#0b1222] border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Signal Travel Time</span>
                <div className="mt-1 font-mono">
                  <div className="text-xs font-bold text-sky-300">
                    {activeEval.oneWayLatency.toFixed(2)} s <span className="text-[10px] font-normal text-slate-400">(one-way)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {activeEval.roundTripLatency.toFixed(2)} s <span className="text-[9px]">(round-trip)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* One short explanation */}
            <div className="text-xs text-slate-300 leading-relaxed bg-[#060a14] p-3.5 rounded-lg border border-slate-800/70 space-y-1.5">
              <p>{activeEval.earthExplanation}</p>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-300">Note:</strong> Earth line of sight indicates visibility, not a guaranteed radio communication link.
              </p>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 pt-1">
            Instantaneous speed-of-light vacuum propagation
          </div>
        </section>
      </div>

      {/* Collapsible Scientific Details & Methodology Section */}
      <div className="rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden">
        <button
          onClick={() => setIsScientificDetailsOpen(!isScientificDetailsOpen)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Scientific Details & Methodology (NASA JPL Horizons)
            </span>
          </div>
          {isScientificDetailsOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isScientificDetailsOpen && (
          <div className="p-5 border-t border-slate-800/80 bg-[#060a12] space-y-4 text-xs font-mono text-slate-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div className="p-2.5 rounded bg-[#090e1a] border border-slate-800">
                <span className="text-slate-500 text-[9px] uppercase block">Coordinate Frame</span>
                <span className="text-slate-200">IAU 2015 Mean Earth (ME)</span>
              </div>
              <div className="p-2.5 rounded bg-[#090e1a] border border-slate-800">
                <span className="text-slate-500 text-[9px] uppercase block">Sun Elevation</span>
                <span className="text-amber-300">
                  {activeEval.obs.sun.elevationDeg > 0 ? '+' : ''}
                  {activeEval.obs.sun.elevationDeg.toFixed(2)}° ({activeEval.obs.sun.azimuthDeg.toFixed(1)}° az)
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#090e1a] border border-slate-800">
                <span className="text-slate-500 text-[9px] uppercase block">Earth Elevation</span>
                <span className="text-sky-300">
                  {activeEval.obs.earth.elevationDeg.toFixed(2)}° ({activeEval.obs.earth.azimuthDeg.toFixed(1)}° az)
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#090e1a] border border-slate-800">
                <span className="text-slate-500 text-[9px] uppercase block">Terrain Profile</span>
                <span className="text-slate-200">8-point horizon mask</span>
              </div>
            </div>

            <div className="text-[11px] font-sans text-slate-400 leading-relaxed space-y-1.5 p-3 rounded bg-[#080d18] border border-slate-800/70">
              <p>
                <strong>Elevation Data Source:</strong> {activeEval.site.terrain.dataSource || 'Predefined literature benchmark (NASA/USGS studies). Arbitrary coordinates have no live DEM raster sampled.'}
              </p>
              <p>
                <strong>Signal Latency Disclosure:</strong> Calculated latency ({activeEval.oneWayLatency.toFixed(3)}s one-way, {activeEval.roundTripLatency.toFixed(3)}s round-trip) represents pure speed-of-light vacuum propagation ($t = d/c$) for the instantaneous Earth-Moon distance. Terrestrial packetization and network routing are not included.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls Footer */}
      <div className="pt-4 pb-8 border-t border-slate-800 flex items-center justify-between gap-4">
        <button
          onClick={() => setWorkflowStep('select-locations')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0c1220] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Location Selection</span>
        </button>

        <button
          onClick={() => setWorkflowStep('compare-sites')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-mono font-bold transition-all shadow-md ring-2 ring-sky-500/20"
        >
          <span>Continue to Candidate Comparison</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
