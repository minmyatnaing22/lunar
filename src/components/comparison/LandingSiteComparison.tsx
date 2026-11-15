'use client';

import React, { useState, useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  SlidersHorizontal,
  Sun,
  Globe2,
  Radio,
  Mountain,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Check,
  X,
  Minus,
  Layers,
  Award,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { evaluateSiteSuitability } from '@/lib/astronomy/suitability';
import { CandidateLandingSite, SuitabilityBreakdown } from '@/types/mission';

export const LandingSiteComparison: React.FC = () => {
  const {
    savedSites,
    selectedSite,
    setSelectedSiteId,
    missionPriorities,
    setMissionPriorities,
  } = useMission();

  // Multi-site selection state (allow selecting two or more candidate sites)
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([
    'shackleton-connecting-ridge',
    'malapert-mountain',
    'de-gerlache-rim',
  ]);

  // Toggle selection for a site
  const handleToggleSite = (siteId: string) => {
    setSelectedSiteIds(prev => {
      if (prev.includes(siteId)) {
        // Enforce minimum of 2 sites selected for comparison
        if (prev.length <= 2) return prev;
        return prev.filter(id => id !== siteId);
      } else {
        return [...prev, siteId];
      }
    });
  };

  // Quick preset selectors
  const handleSelectTop3 = () => {
    const top3 = savedSites.slice(0, 3).map(s => s.id);
    setSelectedSiteIds(top3);
  };

  const handleSelectAll = () => {
    setSelectedSiteIds(savedSites.map(s => s.id));
  };

  const handleResetPair = () => {
    setSelectedSiteIds(['shackleton-connecting-ridge', 'malapert-mountain']);
  };

  // Filter selected sites
  const comparedSites = useMemo(() => {
    return savedSites.filter(site => selectedSiteIds.includes(site.id));
  }, [savedSites, selectedSiteIds]);

  // Evaluate suitability breakdowns for all selected sites
  const evaluatedSites = useMemo(() => {
    return comparedSites.map(site => ({
      site,
      breakdown: evaluateSiteSuitability(site, missionPriorities),
    }));
  }, [comparedSites, missionPriorities]);

  // Sort by overall score descending
  const rankedEvaluations = useMemo(() => {
    return [...evaluatedSites].sort(
      (a, b) => b.breakdown.overallScore - a.breakdown.overallScore
    );
  }, [evaluatedSites]);

  const winner = rankedEvaluations[0];
  const runnerUp = rankedEvaluations[1];

  // Weights normalization for transparent formula display
  const totalWeight =
    (missionPriorities.sunlightWeight || 1) +
    (missionPriorities.communicationWeight || 1) +
    (missionPriorities.terrainSafetyWeight || 1) +
    (missionPriorities.waterIcePotentialWeight || 1);

  const normSun = Math.round((missionPriorities.sunlightWeight / totalWeight) * 100);
  const normComms = Math.round((missionPriorities.communicationWeight / totalWeight) * 100);
  const normTerrain = Math.round((missionPriorities.terrainSafetyWeight / totalWeight) * 100);
  const normIce = Math.round((missionPriorities.waterIcePotentialWeight / totalWeight) * 100);

  // Generate explainable recommendation
  const recommendationText = useMemo(() => {
    if (!winner || !runnerUp) {
      return 'Select at least two candidate sites to perform comparative trade evaluation.';
    }

    const margin = (winner.breakdown.overallScore - runnerUp.breakdown.overallScore).toFixed(1);
    const topAdv = winner.breakdown.keyAdvantages[0] || 'Higher composite score across weighted metrics.';

    if (Number(margin) === 0) {
      return `Both '${winner.site.name.replace('—', '-')}' and '${runnerUp.site.name.replace('—', '-')}' achieve an identical score of ${winner.breakdown.overallScore}/100. Review terrain slope and blackout tolerances to decide.`;
    }

    return `Candidate '${winner.site.name.replace('—', '-')}' is ranked #1 with ${winner.breakdown.overallScore}/100, outperforming runner-up '${runnerUp.site.name.replace('—', '-')}' by +${margin} points. Key driver: ${topAdv}`;
  }, [winner, runnerUp]);

  const handlePriorityChange = (key: keyof typeof missionPriorities, value: number) => {
    setMissionPriorities(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Mission Control Module
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Multi-Candidate Trade Studies & MCDA Scoring
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Landing Site Comparison
          </h1>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 mr-1">Presets:</span>
          <button
            onClick={handleResetPair}
            className="px-2.5 py-1 rounded bg-[#0c1220] border border-slate-700 hover:text-white transition-colors"
          >
            Site A vs Site B
          </button>
          <button
            onClick={handleSelectTop3}
            className="px-2.5 py-1 rounded bg-[#0c1220] border border-slate-700 hover:text-white transition-colors"
          >
            Top 3 Artemis
          </button>
          <button
            onClick={handleSelectAll}
            className="px-2.5 py-1 rounded bg-[#0c1220] border border-slate-700 hover:text-white transition-colors"
          >
            All Candidates ({savedSites.length})
          </button>
        </div>
      </div>

      {/* Safety & Scientific Reality Check Disclaimer */}
      <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0c1220] flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Suitability scores are multi-criteria decision heuristics based on available USGS and LOLA datasets. 
          A numerical score does not prove or certify landing safety. Flight certification requires autonomous hazard avoidance verification.
          Demonstration and simulated values are explicitly labeled.
        </p>
      </div>

      {/* Candidate Selection Selector Bar */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Select Candidate Landing Locations to Compare ({selectedSiteIds.length} of {savedSites.length} selected)
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Minimum 2 candidate sites required
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {savedSites.map(site => {
            const isChecked = selectedSiteIds.includes(site.id);
            return (
              <button
                key={site.id}
                onClick={() => handleToggleSite(site.id)}
                className={`p-2.5 rounded border text-left text-xs font-mono flex items-start justify-between gap-2 transition-colors ${
                  isChecked
                    ? 'bg-sky-950/70 border-sky-600 text-white'
                    : 'bg-[#090d16] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-xs truncate">
                    {site.name.replace('—', '-')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {Math.abs(site.latitude).toFixed(2)}° S, {site.longitude.toFixed(2)}° E
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded shrink-0 flex items-center justify-center mt-0.5 border ${
                    isChecked
                      ? 'bg-sky-500 border-sky-400 text-black'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mission Priority Weight Controls */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span>Adjustable Mission-Priority Weights</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              Normalized: Sun {normSun}% | Comms {normComms}% | Terrain {normTerrain}% | Science {normIce}%
            </span>
            <button
              onClick={() =>
                setMissionPriorities({
                  sunlightWeight: 80,
                  communicationWeight: 75,
                  terrainSafetyWeight: 85,
                  waterIcePotentialWeight: 70,
                })
              }
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Sunlight */}
          <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Sunlight</span>
              </span>
              <span className="text-white font-bold">{missionPriorities.sunlightWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.sunlightWeight}
              onChange={e => handlePriorityChange('sunlightWeight', Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="text-[10px] text-slate-400 font-mono">Solar power generation & thermal survivability</div>
          </div>

          {/* Communication */}
          <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Communication</span>
              </span>
              <span className="text-white font-bold">{missionPriorities.communicationWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.communicationWeight}
              onChange={e => handlePriorityChange('communicationWeight', Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="text-[10px] text-slate-400 font-mono">Direct Earth line of sight & low blackout latency</div>
          </div>

          {/* Terrain Safety */}
          <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                <span>Terrain Safety</span>
              </span>
              <span className="text-white font-bold">{missionPriorities.terrainSafetyWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.terrainSafetyWeight}
              onChange={e => handlePriorityChange('terrainSafetyWeight', Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="text-[10px] text-slate-400 font-mono">Landing slope flatness (&lt;5°) and surface roughness</div>
          </div>

          {/* Science / Water Ice */}
          <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>Science</span>
              </span>
              <span className="text-white font-bold">{missionPriorities.waterIcePotentialWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.waterIcePotentialWeight}
              onChange={e => handlePriorityChange('waterIcePotentialWeight', Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="text-[10px] text-slate-400 font-mono">Proximity to PSR cold traps for volatile sampling</div>
          </div>
        </div>
      </div>

      {/* Transparent Weighted Scoring Breakdown & Explainable Recommendation */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Transparent Scoring Breakdown & Recommendation</span>
        </div>

        <div className="p-3 rounded bg-[#090d16] border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
          <div className="text-[11px] text-slate-400">
            MCDA Weighted Formula:
          </div>
          <div className="text-sky-300 font-semibold text-[11px]">
            Overall Score = ({normSun}% x Sunlight) + ({normComms}% x Comms) + ({normTerrain}% x Terrain) + ({normIce}% x Science)
          </div>
          <div className="pt-1 text-slate-300 text-xs leading-relaxed font-sans">
            {recommendationText}
          </div>
        </div>

        {winner && (
          <div className="space-y-3 pt-1 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-400">Top Recommended Candidate: </span>
                <span className="text-white font-bold text-sm">
                  {winner.site.name.replace('—', '-')}
                </span>
                <span className="text-sky-400 ml-2 font-bold">
                  ({winner.breakdown.overallScore}/100 pts)
                </span>
              </div>

              <button
                onClick={() => setSelectedSiteId(winner.site.id)}
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors self-start sm:self-auto"
              >
                Set as Active Mission Target
              </button>
            </div>

            {/* Engineering Trade-Off Dossier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              {/* Key Advantages */}
              <div className="p-3 rounded bg-[#090d16] border border-emerald-950/80 space-y-2">
                <div className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Why This Candidate Scores Best (Key Advantages)</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px] font-sans">
                  {winner.breakdown.keyAdvantages.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Identified Limitations & Operational Risks */}
              <div className="p-3 rounded bg-[#090d16] border border-amber-950/80 space-y-2">
                <div className="text-amber-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Identified Limitations & Engineering Risks</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px] font-sans">
                  {winner.breakdown.operationalRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Flight Safety Reality Check */}
            <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-sans flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong>Safety Caveat:</strong> Remote multi-criteria optimization does not prove or guarantee landing safety. Flight qualification requires onboard Autonomous Terrain Relative Navigation (TRN) and Hazard Detection and Avoidance (HDA) during terminal powered descent.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Multi-Site Comparative Table */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Multi-Candidate Comparative Parameter Matrix ({comparedSites.length} Sites)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Side-by-side terrain, elevation, slope, sunlight, Earth visibility, and communication data
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#090d16] border border-slate-800 text-slate-400">
            Scroll horizontally if needed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-[#090d16] text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-[#090d16] z-10 border-r border-slate-800">
                  Evaluation Parameter
                </th>
                {rankedEvaluations.map(({ site, breakdown }, idx) => (
                  <th key={site.id} className="py-3 px-4 min-w-[210px] text-slate-200">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-white truncate">{site.name.split('—')[0].split('-')[0].trim()}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        idx === 0
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Score: <span className="text-sky-400 font-bold">{breakdown.overallScore}</span>/100
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300">
              {/* Category Breakdown Scores */}
              <tr className="bg-[#090d16]/70">
                <td className="py-2.5 px-4 font-bold text-white sticky left-0 bg-[#090d16] z-10 border-r border-slate-800">
                  Weighted Score Breakdown
                </td>
                {rankedEvaluations.map(({ site, breakdown }) => (
                  <td key={site.id} className="py-2.5 px-4 text-[11px]">
                    <div>Sun: <span className="text-white font-bold">{breakdown.sunlightScore}</span></div>
                    <div>Comms: <span className="text-white font-bold">{breakdown.communicationScore}</span></div>
                    <div>Slope: <span className="text-white font-bold">{breakdown.terrainSafetyScore}</span></div>
                    <div>Science: <span className="text-white font-bold">{breakdown.waterIceScore}</span></div>
                  </td>
                ))}
              </tr>

              {/* Coordinates */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Selenographic Coordinates
                  <div className="text-[9px] text-emerald-400 font-normal">IAU 2015 ME FRAME</div>
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4 font-mono">
                    {Math.abs(site.latitude).toFixed(3)}° S, {site.longitude.toFixed(3)}° E
                  </td>
                ))}
              </tr>

              {/* Agency Validation Links */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Agency Verification Links
                  <div className="text-[9px] text-sky-400 font-normal">LROC & MOON TREK</div>
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    <div className="flex flex-col gap-1.5 text-[11px] font-mono">
                      {site.quickmapUrl && (
                        <a
                          href={site.quickmapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                        >
                          <span>LROC QuickMap</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {site.trekUrl && (
                        <a
                          href={site.trekUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                        >
                          <span>NASA Moon Trek</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* LOLA Datum Elevation */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Elevation (Reference Benchmark, Datum: 1,737.4 km)
                  <div className="text-[9px] text-amber-400 font-normal">REFERENCE BENCHMARK (not live DEM sampled)</div>
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4 font-semibold text-white">
                    {site.elevationStatus === 'unavailable' || isNaN(site.elevationMeters)
                      ? 'Unavailable'
                      : site.elevationMeters > 0
                      ? `+${site.elevationMeters}m`
                      : `${site.elevationMeters}m`}
                  </td>
                ))}
              </tr>

              {/* Terrain Slope */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Local Terrain Slope (degrees)
                  <div className="text-[9px] text-amber-400 font-normal">
                    REFERENCE BENCHMARK
                  </div>
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    {site.terrain.isSlopeUnavailable || isNaN(site.terrain.slopeDegrees) ? (
                      <span className="text-slate-400 text-xs font-mono">Unavailable</span>
                    ) : (
                      <>
                        <span className="font-semibold text-white">{site.terrain.slopeDegrees.toFixed(1)}°</span>
                        <span className="text-slate-400 text-[10px] ml-1">
                          ({site.terrain.slopeDegrees <= 5 ? 'Gentle' : 'Moderate'})
                        </span>
                      </>
                    )}
                  </td>
                ))}
              </tr>

              {/* Surface Roughness */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Surface Roughness (1m scale)
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    {site.terrain.roughnessMeters} m
                  </td>
                ))}
              </tr>

              {/* Sunlight Availability */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Monthly Sunlight Availability
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4 font-bold text-amber-300">
                    {site.sunlight.predictedIlluminationPercent}%
                  </td>
                ))}
              </tr>

              {/* Real-time Illumination */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Current Illumination State
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        site.sunlight.isIlluminated
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {site.sunlight.isIlluminated ? 'DIRECT SUN' : 'SHADOW'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Earth Apparent Elevation */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Earth Apparent Elevation
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    {site.earthVisibility.earthElevationDeg > 0
                      ? `+${site.earthVisibility.earthElevationDeg}°`
                      : `${site.earthVisibility.earthElevationDeg}°`}
                  </td>
                ))}
              </tr>

              {/* Direct Line of Sight */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Line of Sight (Approx. Mask)
                  <div className="text-[9px] text-slate-400 font-normal">8-PT MASK INTERPOLATION</div>
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    {site.earthVisibility.visibilityStatus === 'geometrically-below-horizon' ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                        <X className="w-3.5 h-3.5" /> Below 0°
                      </span>
                    ) : site.earthVisibility.visibilityStatus === 'terrain-obstructed' ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                        <X className="w-3.5 h-3.5" /> Rim Occluded
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5" /> Unobstructed
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Direct Comms Duty Cycle */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Direct Comms (DTE) Availability
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4 font-bold text-sky-300">
                    {site.communication.directCommsAvailabilityPercent}%
                  </td>
                ))}
              </tr>

              {/* Max Blackout Duration */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Max Continuous Blackout
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    {site.communication.longestBlackoutHours} Hours
                  </td>
                ))}
              </tr>

              {/* Permanent Shadow Region Cold Trap */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  PSR Cold Trap Context
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4">
                    {site.terrain.isPermanentShadowRegion ? 'Interior Cold Trap' : 'Adjacent to PSR'}
                  </td>
                ))}
              </tr>

              {/* Sub-Surface Regolith Stratigraphy (Clearly labeled mock/simulated data) */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Sub-Surface Ice Depth
                  <div className="text-[9px] text-amber-400 font-normal">SIMULATED / DEMO ESTIMATE</div>
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4 text-slate-400 italic text-[11px]">
                    {site.terrain.isPermanentShadowRegion
                      ? 'Demo Model: ~0.1 - 0.4m depth'
                      : 'Demo Model: &gt; 1.5m depth'}
                  </td>
                ))}
              </tr>

              {/* Plume-Surface Interaction Risk (Clearly labeled mock/simulated data) */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                  Descent Plume Ejecta Risk
                  <div className="text-[9px] text-amber-400 font-normal">SIMULATED / DEMO ESTIMATE</div>
                </td>
                {rankedEvaluations.map(({ site }) => (
                  <td key={site.id} className="py-2.5 px-4 text-slate-400 italic text-[11px]">
                    {site.terrain.slopeDegrees <= 5.0
                      ? 'Demo Model: Low risk (&lt; 5° slope)'
                      : 'Demo Model: Moderate risk (&gt; 5° slope)'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
