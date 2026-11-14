'use client';

import React from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Sun,
  Globe2,
  Radio,
  Mountain,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Maximize2,
} from 'lucide-react';
import { evaluateSiteSuitability } from '@/lib/astronomy/suitability';

export const MissionDashboard: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    setActiveSection,
    simulationDate,
    missionPriorities,
    suitabilityBreakdowns,
    recommendedSiteId,
    recommendationReason,
  } = useMission();

  // Evaluate current site's suitability breakdown
  const currentBreakdown = evaluateSiteSuitability(selectedSite, missionPriorities);
  const isRecommended = selectedSite.id === recommendedSiteId;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Selected Target Location Overview */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-r from-[#0c1424] via-[#0f172a] to-[#0b101c] p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase tracking-widest font-semibold">
                NASA Lunar Exploration Zone
              </span>
              {selectedSite.artemisCandidateRank && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                  Artemis Candidate #{selectedSite.artemisCandidateRank}
                </span>
              )}
              {isRecommended && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" />
                  MCDA Top Recommendation
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              {selectedSite.name}
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {selectedSite.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection('map')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-950 transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Explore on Lunar Map</span>
            </button>
            <button
              onClick={() => setActiveSection('reports')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <span>Export Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry Coordinates Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[11px]">Latitude</div>
            <div className="text-slate-100 font-semibold text-sm">
              {Math.abs(selectedSite.latitude).toFixed(3)}° S
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Longitude</div>
            <div className="text-slate-100 font-semibold text-sm">
              {selectedSite.longitude.toFixed(3)}° E
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Elevation (LOLA Datum)</div>
            <div className={`font-semibold text-sm ${selectedSite.elevationMeters >= 0 ? 'text-amber-400' : 'text-indigo-400'}`}>
              {selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters} m` : `${selectedSite.elevationMeters} m`}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Local Slope</div>
            <div className="text-slate-100 font-semibold text-sm">
              {selectedSite.terrain.slopeDegrees.toFixed(1)}° ({selectedSite.terrain.slopeDegrees <= 5 ? 'Gentle' : 'Moderate'})
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Scientific Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Sunlight & Solar Energy Card */}
        <div
          onClick={() => setActiveSection('sun')}
          className="group cursor-pointer p-4 rounded-xl border border-slate-800 bg-[#0d1322] hover:border-amber-500/40 hover:bg-[#11192e] transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              1. Sunlight Analysis
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {selectedSite.sunlight.predictedIlluminationPercent}%
            <span className="text-xs text-slate-400 font-normal ml-1">avg illumination</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                selectedSite.sunlight.isIlluminated
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              }`}
            >
              {selectedSite.sunlight.isIlluminated ? 'DIRECT SUNLIGHT' : 'TERRAIN SHADOW'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Elev: {selectedSite.sunlight.solarElevationDeg.toFixed(1)}°
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
            Solar flux: {selectedSite.sunlight.solarFluxWm2} W/m². Sun elevation bounded within ±1.54° polar range.
          </p>
          <div className="mt-3 text-[10px] text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open Solar Simulator</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 2. Earth Visibility Card */}
        <div
          onClick={() => setActiveSection('earth')}
          className="group cursor-pointer p-4 rounded-xl border border-slate-800 bg-[#0d1322] hover:border-sky-500/40 hover:bg-[#11192e] transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              2. Earth Visibility
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
              <Globe2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {selectedSite.earthVisibility.earthElevationDeg > 0 ? `+${selectedSite.earthVisibility.earthElevationDeg}°` : `${selectedSite.earthVisibility.earthElevationDeg}°`}
            <span className="text-xs text-slate-400 font-normal ml-1">apparent elevation</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                selectedSite.earthVisibility.hasDirectLineOfSight
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {selectedSite.earthVisibility.hasDirectLineOfSight
                ? 'DIRECT LINE OF SIGHT'
                : selectedSite.earthVisibility.isBlockedByTerrain
                ? 'TERRAIN OCCLUDED'
                : 'BELOW HORIZON'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
            Phase: {selectedSite.earthVisibility.earthPhase} ({Math.round(selectedSite.earthVisibility.phaseFraction * 100)}%). Libration: l={selectedSite.earthVisibility.librationLonDeg}°.
          </p>
          <div className="mt-3 text-[10px] text-sky-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open Earth Simulator</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 3. Communication & DSN Card */}
        <div
          onClick={() => setActiveSection('comms')}
          className="group cursor-pointer p-4 rounded-xl border border-slate-800 bg-[#0d1322] hover:border-emerald-500/40 hover:bg-[#11192e] transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              3. Direct Comms (DSN)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {selectedSite.communication.directCommsAvailabilityPercent}%
            <span className="text-xs text-slate-400 font-normal ml-1">DTE availability</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {selectedSite.communication.activeDsnStation || 'Relay Linked'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              RTT: {selectedSite.communication.roundTripLatencySeconds}s
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
            Longest blackout: {selectedSite.communication.longestBlackoutHours} hrs. L2 Halo relay provides fallback link.
          </p>
          <div className="mt-3 text-[10px] text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Analyze DSN Windows</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 4. Terrain & Landing Safety Card */}
        <div
          onClick={() => setActiveSection('comparison')}
          className="group cursor-pointer p-4 rounded-xl border border-slate-800 bg-[#0d1322] hover:border-purple-500/40 hover:bg-[#11192e] transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              4. Terrain & Suitability
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Mountain className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {currentBreakdown.overallScore}
            <span className="text-xs text-slate-400 font-normal ml-1">/ 100 MCDA</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                currentBreakdown.overallScore >= 75
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : currentBreakdown.overallScore >= 50
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {currentBreakdown.verdict}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
            Slope: {selectedSite.terrain.slopeDegrees}° • Roughness: {selectedSite.terrain.roughnessMeters}m.
            {selectedSite.terrain.isPermanentShadowRegion ? ' Inside cryogenic cold trap.' : ' Sunlit plateau.'}
          </p>
          <div className="mt-3 text-[10px] text-purple-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>View Trade Studies</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recommendation Rationale & Candidate Quick Switch Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Explainable MCDA Justification */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-800 bg-[#0a0f1b]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Multi-Criteria Decision Analysis (MCDA) Rationale
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Ranked against {savedSites.length} locations
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 mb-4">
            <p className="text-xs leading-relaxed text-slate-300">
              {currentBreakdown.justification}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Key Advantages */}
            <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Primary Operational Advantages</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                {currentBreakdown.keyAdvantages.length > 0 ? (
                  currentBreakdown.keyAdvantages.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>{adv}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No dominant advantages under current weighting.</li>
                )}
              </ul>
            </div>

            {/* Operational Risks */}
            <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/50">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Identified Mission Risks</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                {currentBreakdown.operationalRisks.length > 0 ? (
                  currentBreakdown.operationalRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{risk}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No critical operational risks flagged.</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Candidate Sites Quick Ranking Table */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Candidate Scoreboard
              </h2>
              <button
                onClick={() => setActiveSection('comparison')}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-mono"
              >
                Full Compare →
              </button>
            </div>

            <div className="space-y-2">
              {suitabilityBreakdowns.slice(0, 5).map((bd, index) => {
                const isSelected = bd.siteId === selectedSite.id;
                return (
                  <button
                    key={bd.siteId}
                    onClick={() => setSelectedSiteId(bd.siteId)}
                    className={`w-full p-2.5 rounded-lg text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500/50 text-white'
                        : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                        <span>{bd.siteName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Sun: {bd.sunlightScore} • Comms: {bd.communicationScore} • Slope: {bd.terrainSafetyScore}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-sky-400">
                        {bd.overallScore}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">Score</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>NASA Space Apps 2024</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              LOLA Calibrated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
