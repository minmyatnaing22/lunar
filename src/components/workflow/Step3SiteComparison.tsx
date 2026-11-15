'use client';

import React, { useMemo, useEffect } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Columns,
  Sun,
  Globe2,
  Radio,
  Mountain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { calculateLunarSurfaceObservation } from '@/lib/astronomy/lunarTrajectoryService';
import { CandidateLandingSite } from '@/types/mission';

function getCleanShortName(name: string): string {
  if (!name) return 'Selected Location';
  // If it's a generated point with coordinates (e.g. "Lunar Surface Point (-88.50°, 45.00°)"), keep the full label
  if (name.startsWith('Lunar Surface Point') || name.startsWith('Point (')) {
    return name;
  }
  // If it has " - " (space hyphen space like "Shackleton Crater - Connecting Ridge"), take the primary name part before it
  if (name.includes(' - ')) {
    return name.split(' - ')[0].trim();
  }
  return name;
}

interface SiteProsCons {
  advantages: string[];
  disadvantages: string[];
}

function getSiteProsCons(site: CandidateLandingSite): SiteProsCons {
  const isPSR = site.terrain.isPermanentShadowRegion;
  const isHighIllumination = site.sunlight.predictedIlluminationPercent >= 80;
  const hasEarthLOS = site.earthVisibility.hasDirectLineOfSight;
  const isSteep = site.terrain.slopeDegrees >= 8.0;

  const advantages: string[] = [];
  const disadvantages: string[] = [];

  if (isHighIllumination) {
    advantages.push(`High estimated solar availability (${site.sunlight.predictedIlluminationPercent}%) supports solar arrays.`);
  } else if (!isPSR && site.sunlight.predictedIlluminationPercent >= 50) {
    advantages.push(`Moderate solar exposure (${site.sunlight.predictedIlluminationPercent}%) during lunar daylight windows.`);
  }

  if (hasEarthLOS) {
    advantages.push(`Direct line-of-sight to Earth above approximate terrain horizon mask.`);
  } else if (site.communication.isRelaySupported) {
    advantages.push(`Relay satellite coverage available when direct Earth line-of-sight is obstructed.`);
  }

  if (site.terrain.slopeDegrees < 5.0 && !site.terrain.isSlopeUnavailable) {
    advantages.push(`Low surface slope gradient (${site.terrain.slopeDegrees.toFixed(1)}°) favorable for landing stability.`);
  }

  if (site.scientificSignificance) {
    advantages.push(site.scientificSignificance.split('.')[0] + '.');
  }

  // Disadvantages / Limitations
  if (isPSR) {
    disadvantages.push(`0% sunlight: cryogenic permanent shadow requires nuclear/RPS power.`);
    disadvantages.push(`Severe terrain horizon obstruction eliminates direct Earth radio line-of-sight.`);
  } else if (site.sunlight.predictedIlluminationPercent < 50) {
    disadvantages.push(`Prolonged shadows limit solar power generation during parts of the mission.`);
  }

  if (!hasEarthLOS) {
    disadvantages.push(`Earth is obstructed by local terrain mask or below geometric horizon.`);
  }

  if (isSteep) {
    disadvantages.push(`Steep local terrain slope (${site.terrain.slopeDegrees.toFixed(1)}°) introduces touchdown tip-over hazard.`);
  }

  if (site.elevationStatus === 'unavailable' || site.isCustom) {
    disadvantages.push(`No live LOLA DEM raster query: elevation and slope are not measured on-site.`);
  }

  return {
    advantages: advantages.slice(0, 3),
    disadvantages: disadvantages.slice(0, 3),
  };
}

export const Step3SiteComparison: React.FC = () => {
  const {
    candidateSites,
    selectedSite,
    setSelectedSiteId,
    setConfirmedSiteId,
    simulationDate,
    setWorkflowStep,
  } = useMission();

  // If selectedSite is not in candidateSites, default to the first candidate
  useEffect(() => {
    if (candidateSites.length > 0) {
      const isCurrentInCandidates = candidateSites.some(s => s.id === selectedSite.id);
      if (!isCurrentInCandidates) {
        setSelectedSiteId(candidateSites[0].id);
        setConfirmedSiteId(candidateSites[0].id);
      }
    }
  }, [candidateSites, selectedSite.id, setSelectedSiteId, setConfirmedSiteId]);

  // Evaluate all candidates
  const evaluatedSites = useMemo(() => {
    return candidateSites.map(site => {
      const obs = calculateLunarSurfaceObservation(
        site.latitude,
        site.longitude,
        simulationDate,
        site.elevationMeters
      );
      const prosCons = getSiteProsCons(site);

      return {
        site,
        obs,
        prosCons,
      };
    });
  }, [candidateSites, simulationDate]);

  const handleSelectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setConfirmedSiteId(siteId);
  };

  const handleContinue = () => {
    if (selectedSite) {
      setSelectedSiteId(selectedSite.id);
      setConfirmedSiteId(selectedSite.id);
    }
    setWorkflowStep('confirm-site');
  };

  return (
    <div className="w-full min-h-full bg-[#05070c] text-slate-100 font-sans py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Step Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase">
              Step 3 of 5
            </span>
            <span className="text-xs text-slate-400 font-mono">Multi-Site Trade-Off Analysis</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Compare Candidate Locations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Side-by-side trade-off comparison of sunlight availability, Earth visibility, communication potential, and terrain-data availability. Select your preferred landing site to proceed.
          </p>
        </div>

        {candidateSites.length < 3 && (
          <button
            type="button"
            onClick={() => setWorkflowStep('select-locations')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1220] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Candidate (Max 3)</span>
          </button>
        )}
      </div>

      {/* Data Objectivity Notice */}
      <div className="p-3 rounded-lg border border-slate-800 bg-[#090d18] flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
          <span>
            <strong>Scientific Transparency:</strong> LunarSight presents objective analytical calculations and literature benchmarks without invented safety guarantees or arbitrary score weights.
          </span>
        </div>
        <span className="text-[11px] text-slate-500 hidden md:inline shrink-0">
          Comparing {candidateSites.length} Location{candidateSites.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Side-by-Side Comparison Cards Grid */}
      <div
        className={`grid gap-5 sm:gap-6 ${
          candidateSites.length === 1
            ? 'grid-cols-1 max-w-xl mx-auto'
            : candidateSites.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {evaluatedSites.map(({ site, obs, prosCons }) => {
          const isSelected = site.id === selectedSite.id;

          return (
            <div
              key={site.id}
              onClick={() => handleSelectSite(site.id)}
              className={`rounded-xl border flex flex-col justify-between transition-all shadow-xl overflow-hidden cursor-pointer ${
                isSelected
                  ? 'border-sky-500 bg-[#0a1020] ring-2 ring-sky-500/30'
                  : 'border-slate-800 bg-[#080c18] hover:border-slate-700 hover:bg-[#090e1c]'
              }`}
            >
              <div>
                {/* Card Header & Selected Badge */}
                <div className="p-4 border-b border-slate-800/80 bg-[#070b14]/70">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {site.region}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-0.5 leading-tight">
                        {site.name}
                      </h3>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500 text-black shrink-0 shadow-sm">
                        Preferred Landing Site
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{site.latitude.toFixed(2)}° Lat, {site.longitude.toFixed(2)}° Lon</span>
                    <span>•</span>
                    <span>{site.elevationMeters ? `${site.elevationMeters.toLocaleString()} m` : 'Unavailable'}</span>
                  </div>
                </div>

                {/* 4 Comparison Categories */}
                <div className="p-4 space-y-4 text-xs font-sans">
                  {/* 1. Sunlight Availability */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>1. Sunlight Availability</span>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {site.sunlight.predictedIlluminationPercent}%
                      </span>
                    </div>

                    {/* Bar Gauge */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${Math.max(2, site.sunlight.predictedIlluminationPercent)}%` }}
                      />
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>Sun Elevation: {obs.sun.elevationDeg > 0 ? '+' : ''}{obs.sun.elevationDeg.toFixed(1)}°</span>
                      <span>{site.sunlight.isIlluminated ? 'Sunlit' : 'Shadowed'}</span>
                    </div>
                  </div>

                  {/* 2. Earth Visibility */}
                  <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>2. Earth Visibility</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${
                          (site.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'unobstructed-by-mask'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : (site.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'terrain-obstructed'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {(site.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'unobstructed-by-mask'
                          ? 'Unobstructed'
                          : (site.earthVisibility.visibilityStatus || (obs.earth.isAboveHorizon ? 'unobstructed-by-mask' : 'geometrically-below-horizon')) === 'terrain-obstructed'
                          ? 'Obstructed'
                          : 'Below Horizon'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>Earth Elevation: {obs.earth.elevationDeg.toFixed(1)}°</span>
                      <span>Bearing: {obs.earth.azimuthDeg.toFixed(0)}°</span>
                    </div>
                  </div>

                  {/* 3. Communication Potential */}
                  <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-purple-400" />
                        <span>3. Communication Potential</span>
                      </span>
                      <span className="text-slate-200 font-bold">
                        {site.communication.directCommsAvailabilityPercent}% Window
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>Light Travel Delay:</span>
                      <span className="text-slate-300">
                        {(obs.earth.lightTimeSeconds * 2).toFixed(2)} s round-trip
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Vacuum propagation only (excludes network packet overhead)
                    </div>
                  </div>

                  {/* 4. Terrain-Data Availability */}
                  <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Mountain className="w-3.5 h-3.5 text-slate-400" />
                        <span>4. Terrain Data</span>
                      </span>
                      <span className="text-[10px] text-sky-400 font-mono">
                        {site.terrain.slopeDegrees.toFixed(1)}° slope
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 leading-snug">
                      {site.terrain.dataSource || 'Benchmark literature (NASA/USGS studies)'}
                    </div>
                  </div>

                  {/* Advantages & Disadvantages */}
                  <div className="border-t border-slate-800/80 pt-3 space-y-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                        Advantages
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-300">
                        {prosCons.advantages.map((adv, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold shrink-0 mt-0.5">+</span>
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold block mb-1">
                        Disadvantages & Risks
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-400">
                        {prosCons.disadvantages.map((dis, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold shrink-0 mt-0.5">−</span>
                            <span>{dis}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selection Action Button */}
              <div className="p-4 border-t border-slate-800/80 bg-[#070b14]/50">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSelectSite(site.id);
                  }}
                  className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-black border border-sky-400 shadow-md ring-2 ring-sky-500/20'
                      : 'bg-[#0c1220] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Preferred Landing Site</span>
                    </>
                  ) : (
                    <span>Select as Landing Site</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls Footer */}
      <div className="pt-4 pb-12 border-t border-slate-800 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setWorkflowStep('evaluate-sites')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0c1220] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Site Evaluation</span>
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-mono font-bold transition-all shadow-md ring-2 ring-sky-500/20 cursor-pointer"
        >
          <span>Continue to Confirmation ({getCleanShortName(selectedSite?.name)})</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
