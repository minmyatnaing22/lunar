'use client';

import React from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Sun,
  Globe2,
  Radio,
  Mountain,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Rocket,
  ExternalLink,
  Database,
} from 'lucide-react';
import { evaluateSiteSuitability } from '@/lib/astronomy/suitability';
import { ScientificDataSources } from '@/components/resources/ScientificDataSources';

export const MissionDashboard: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    setActiveSection,
    missionPriorities,
    suitabilityBreakdowns,
    recommendedSiteId,
  } = useMission();

  const currentBreakdown = evaluateSiteSuitability(selectedSite, missionPriorities);
  const isRecommended = selectedSite.id === recommendedSiteId;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Selected Location and Analysis Status Header */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase tracking-wider font-semibold">
                Selected Landing Location
              </span>
              {selectedSite.artemisCandidateRank && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                  Artemis Candidate #{selectedSite.artemisCandidateRank}
                </span>
              )}
              {isRecommended && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  MCDA Recommended
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mb-1">
              {selectedSite.name.replace('—', '-')}
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {selectedSite.description.replace('—', '-')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSection('landing')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-950/40"
              title="Launch Final Lunar Landing & Mission Integration"
            >
              <Rocket className="w-4 h-4" />
              <span>Initiate Landing</span>
            </button>
            <button
              onClick={() => setActiveSection('map')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Open Moon Map</span>
            </button>
            <button
              onClick={() => setActiveSection('comparison')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span>Compare Sites</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Coordinates Strip with Scientific Lineage & Verification Links */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#090d16] border border-slate-800/80">
              <div className="text-slate-400 text-[10px] flex items-center justify-between">
                <span>Latitude</span>
                <span className="text-[9px] text-amber-400">
                  {selectedSite.isCustom ? '[USER-PROVIDED]' : '[BENCHMARK]'}
                </span>
              </div>
              <div className="text-white font-semibold text-sm">
                {Math.abs(selectedSite.latitude).toFixed(3)}° S
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#090d16] border border-slate-800/80">
              <div className="text-slate-400 text-[10px] flex items-center justify-between">
                <span>Longitude</span>
                <span className="text-[9px] text-amber-400">
                  {selectedSite.isCustom ? '[USER-PROVIDED]' : '[BENCHMARK]'}
                </span>
              </div>
              <div className="text-white font-semibold text-sm">
                {selectedSite.longitude.toFixed(3)}° E
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#090d16] border border-slate-800/80">
              <div className="text-slate-400 text-[10px] flex items-center justify-between">
                <span>Elevation (Datum R=1,737.4 km)</span>
                <span className="text-[9px] text-amber-400">
                  {selectedSite.elevationStatus === 'unavailable'
                    ? '[UNAVAILABLE]'
                    : selectedSite.isCustom
                    ? '[USER-PROVIDED]'
                    : '[REFERENCE BENCHMARK]'}
                </span>
              </div>
              <div className="text-amber-400 font-semibold text-sm">
                {selectedSite.elevationStatus === 'unavailable' || isNaN(selectedSite.elevationMeters)
                  ? 'Unavailable'
                  : selectedSite.elevationMeters > 0
                  ? `+${selectedSite.elevationMeters} m`
                  : `${selectedSite.elevationMeters} m`}
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#090d16] border border-slate-800/80">
              <div className="text-slate-400 text-[10px] flex items-center justify-between">
                <span>Terrain Slope</span>
                <span className="text-[9px] text-amber-400">
                  {selectedSite.terrain.isSlopeUnavailable
                    ? '[UNAVAILABLE]'
                    : selectedSite.isCustom
                    ? '[USER-PROVIDED]'
                    : '[REFERENCE BENCHMARK]'}
                </span>
              </div>
              <div className="text-white font-semibold text-sm">
                {selectedSite.terrain.isSlopeUnavailable || isNaN(selectedSite.terrain.slopeDegrees)
                  ? 'Unavailable'
                  : `${selectedSite.terrain.slopeDegrees.toFixed(1)}°`}
              </div>
            </div>
          </div>

          {/* Quick External Verification Buttons */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="text-slate-400 flex items-center gap-2">
              <span>Coordinate Frame: <strong className="text-slate-200">IAU 2015 ME (Datum R = 1,737.4 km)</strong></span>
            </div>
            <div className="flex items-center gap-3">
              {selectedSite.quickmapUrl && (
                <a
                  href={selectedSite.quickmapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  <span>Verify in LROC QuickMap</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {selectedSite.trekUrl && (
                <a
                  href={selectedSite.trekUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <span>Validate in NASA Moon Trek</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simple Cards for Sunlight, Earth Visibility, and Communication */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Sunlight Card */}
        <div
          onClick={() => setActiveSection('sun')}
          className="cursor-pointer p-4 rounded-lg border border-slate-800 bg-[#0c1220] hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Sunlight Analysis
            </span>
            <div className="p-1.5 rounded bg-slate-800 text-amber-400">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {selectedSite.sunlight.predictedIlluminationPercent}%
            <span className="text-xs text-slate-400 font-normal ml-1">illumination</span>
          </div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                selectedSite.sunlight.isIlluminated
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {selectedSite.sunlight.isIlluminated ? 'DIRECT SUNLIGHT' : 'TERRAIN SHADOW'}
            </span>
            <span className="text-slate-400">
              Elev: {selectedSite.sunlight.solarElevationDeg.toFixed(1)}°
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Calculated solar flux: {selectedSite.sunlight.solarFluxWm2} W/m². Sun elevation range at South Pole bounded within ±1.54°.
          </p>
          <div className="mt-3 text-[10px] text-sky-400 font-mono font-semibold flex items-center gap-1">
            <span>View Solar Details</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 2. Earth Visibility Card */}
        <div
          onClick={() => setActiveSection('earth')}
          className="cursor-pointer p-4 rounded-lg border border-slate-800 bg-[#0c1220] hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Earth Visibility
            </span>
            <div className="p-1.5 rounded bg-slate-800 text-sky-400">
              <Globe2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {selectedSite.earthVisibility.earthElevationDeg > 0 ? `+${selectedSite.earthVisibility.earthElevationDeg}°` : `${selectedSite.earthVisibility.earthElevationDeg}°`}
            <span className="text-xs text-slate-400 font-normal ml-1">apparent elevation</span>
          </div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                selectedSite.earthVisibility.visibilityStatus === 'geometrically-below-horizon'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : selectedSite.earthVisibility.visibilityStatus === 'terrain-obstructed'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {selectedSite.earthVisibility.visibilityStatus === 'geometrically-below-horizon'
                ? 'BELOW GEOMETRIC HORIZON'
                : selectedSite.earthVisibility.visibilityStatus === 'terrain-obstructed'
                ? 'TERRAIN-OBSTRUCTED (APPROX. MASK)'
                : 'UNOBSTRUCTED BY APPROX. MASK'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Phase: {selectedSite.earthVisibility.earthPhase} ({Math.round(selectedSite.earthVisibility.phaseFraction * 100)}%). Libration offset: l={selectedSite.earthVisibility.librationLonDeg}°.
          </p>
          <div className="mt-3 text-[10px] text-sky-400 font-mono font-semibold flex items-center gap-1">
            <span>View Horizon Plot</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 3. Communication Card */}
        <div
          onClick={() => setActiveSection('comms')}
          className="cursor-pointer p-4 rounded-lg border border-slate-800 bg-[#0c1220] hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Direct Communication (DSN)
            </span>
            <div className="p-1.5 rounded bg-slate-800 text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {selectedSite.communication.directCommsAvailabilityPercent}%
            <span className="text-xs text-slate-400 font-normal ml-1">DTE availability</span>
          </div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {selectedSite.communication.activeDsnStation || 'Relay Linked'}
            </span>
            <span className="text-slate-400">
              RTT: {selectedSite.communication.roundTripLatencySeconds}s
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Max blackout: {selectedSite.communication.longestBlackoutHours} continuous hours across simulated mission window.
          </p>
          <div className="mt-3 text-[10px] text-sky-400 font-mono font-semibold flex items-center gap-1">
            <span>View DSN Windows</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Recommendation and Trade-Off Summary */}
      {(() => {
        const recommendedSite = savedSites.find(s => s.id === recommendedSiteId) || savedSites[0];
        const recBreakdown = evaluateSiteSuitability(recommendedSite, missionPriorities);
        const isRecSelected = selectedSite.id === recommendedSite.id;

        return (
          <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    MCDA Mission Recommendation Engine
                  </div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Optimal Candidate: {recommendedSite.name.replace('—', '-')}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 uppercase block">Composite Score</span>
                  <span className="text-emerald-400 font-bold text-lg leading-none">
                    {recBreakdown.overallScore}
                    <span className="text-xs text-slate-400 font-normal"> / 100</span>
                  </span>
                </div>

                {!isRecSelected ? (
                  <button
                    onClick={() => setSelectedSiteId(recommendedSite.id)}
                    className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold font-mono transition-colors"
                  >
                    Set as Active
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-sky-300 border border-slate-700 text-xs font-mono font-semibold">
                    Target Active
                  </span>
                )}
              </div>
            </div>

            {/* Justification Narrative */}
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {recBreakdown.justification}
            </p>

            {/* Advantages and Limitations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-[#090d16] border border-emerald-950/70 space-y-2">
                <div className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Why This Site Scores Best (Primary Advantages)</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px] font-sans">
                  {recBreakdown.keyAdvantages.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded bg-[#090d16] border border-amber-950/70 space-y-2">
                <div className="text-amber-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Identified Limitations & Engineering Constraints</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px] font-sans">
                  {recBreakdown.operationalRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Prominent Reality & Safety Disclaimer */}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-sans flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong>Operational Safety Disclaimer:</strong> Multi-criteria rankings synthesize orbital illumination and topographic models. No landing site can be certified as &ldquo;guaranteed safe&rdquo; remotely. Final landing safety requires terminal hazard detection and avoidance (HDA) maneuvers.
              </span>
            </div>
          </div>
        );
      })()}

      {/* Candidate Landing Site Overview */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Candidate Landing-Site Overview
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pre-calibrated candidate sites evaluated using NASA LRO LOLA and IAU coordinates
            </p>
          </div>
          <button
            onClick={() => setActiveSection('comparison')}
            className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <span>Full Comparison</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {savedSites.map((site, idx) => {
            const isSelected = site.id === selectedSite.id;
            return (
              <div
                key={site.id}
                onClick={() => setSelectedSiteId(site.id)}
                className={`cursor-pointer p-3.5 rounded-md border text-left transition-colors ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-600 text-white'
                    : 'bg-[#090d16] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold text-xs text-white truncate">
                    {site.name.replace('—', '-')}
                  </div>
                  {site.artemisCandidateRank && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 shrink-0 font-medium">
                      #{site.artemisCandidateRank}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span className="text-slate-300">
                      {Math.abs(site.latitude).toFixed(2)}° S, {site.longitude.toFixed(2)}° E
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Elevation:</span>
                    <span className="text-slate-300">
                      {site.elevationMeters > 0 ? `+${site.elevationMeters}m` : `${site.elevationMeters}m`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slope:</span>
                    <span className="text-slate-300">{site.terrain.slopeDegrees.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunlight / Comms:</span>
                    <span className="text-slate-300">
                      {site.sunlight.predictedIlluminationPercent}% / {site.communication.directCommsAvailabilityPercent}%
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">
                    {site.terrain.isPermanentShadowRegion ? 'PSR Cold Trap' : 'Polar Plateau'}
                  </span>
                  <span className={isSelected ? 'text-sky-400 font-bold' : 'text-slate-400'}>
                    {isSelected ? 'ACTIVE TARGET' : 'SELECT SITE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scientific Data Sources, Official Agency Heritage & CSA Exploration */}
      <div className="pt-2">
        <ScientificDataSources />
      </div>
    </div>
  );
};
