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
} from 'lucide-react';
import { evaluateSiteSuitability } from '@/lib/astronomy/suitability';
import { CandidateLandingSite } from '@/types/mission';

export const LandingSiteComparison: React.FC = () => {
  const {
    savedSites,
    selectedSite,
    setSelectedSiteId,
    missionPriorities,
    setMissionPriorities,
  } = useMission();

  // Site A and Site B selector state
  const [siteAId, setSiteAId] = useState<string>(
    savedSites[0]?.id || 'shackleton-connecting-ridge'
  );
  const [siteBId, setSiteBId] = useState<string>(
    savedSites[1]?.id || 'malapert-mountain'
  );

  const siteA = useMemo(
    () => savedSites.find(s => s.id === siteAId) || savedSites[0],
    [savedSites, siteAId]
  );
  const siteB = useMemo(
    () => savedSites.find(s => s.id === siteBId) || savedSites[1] || savedSites[0],
    [savedSites, siteBId]
  );

  // Evaluate both sites with active mission priorities
  const breakdownA = useMemo(
    () => (siteA ? evaluateSiteSuitability(siteA, missionPriorities) : null),
    [siteA, missionPriorities]
  );
  const breakdownB = useMemo(
    () => (siteB ? evaluateSiteSuitability(siteB, missionPriorities) : null),
    [siteB, missionPriorities]
  );

  // Check if sufficient data is available for a valid recommendation
  const hasSufficientDataA =
    siteA && siteA.terrain && siteA.sunlight && siteA.earthVisibility && siteA.communication;
  const hasSufficientDataB =
    siteB && siteB.terrain && siteB.sunlight && siteB.earthVisibility && siteB.communication;
  const canRecommend = hasSufficientDataA && hasSufficientDataB && siteA.id !== siteB.id;

  // Generate comparison recommendation
  const recommendation = useMemo(() => {
    if (!canRecommend || !breakdownA || !breakdownB) {
      if (siteA.id === siteB.id) {
        return {
          winner: null,
          text: 'Select two distinct landing locations to generate an explainable recommendation.',
        };
      }
      return {
        winner: null,
        text: 'Recommendation withheld: Insufficient terrain or orbital data available for one or more candidates.',
      };
    }

    if (breakdownA.overallScore > breakdownB.overallScore) {
      const diff = (breakdownA.overallScore - breakdownB.overallScore).toFixed(1);
      const topAdv = breakdownA.keyAdvantages[0] || 'Higher composite score across weighted metrics.';
      return {
        winner: siteA,
        scoreDiff: diff,
        text: `Candidate '${siteA.name.replace('—', '-')}' is recommended over '${siteB.name.replace('—', '-')}' (+${diff} points). Primary driver: ${topAdv}`,
      };
    } else if (breakdownB.overallScore > breakdownA.overallScore) {
      const diff = (breakdownB.overallScore - breakdownA.overallScore).toFixed(1);
      const topAdv = breakdownB.keyAdvantages[0] || 'Higher composite score across weighted metrics.';
      return {
        winner: siteB,
        scoreDiff: diff,
        text: `Candidate '${siteB.name.replace('—', '-')}' is recommended over '${siteA.name.replace('—', '-')}' (+${diff} points). Primary driver: ${topAdv}`,
      };
    } else {
      return {
        winner: null,
        text: `Both candidate locations evaluated to an identical composite score of ${breakdownA.overallScore}/100 under current weights. Review specific terrain slope and blackout tolerances.`,
      };
    }
  }, [canRecommend, breakdownA, breakdownB, siteA, siteB]);

  const handlePriorityChange = (key: keyof typeof missionPriorities, value: number) => {
    setMissionPriorities(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Landing Site Comparison
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Comparative Analysis: Site A vs Site B
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Landing Site Trade Study
          </h1>
        </div>
      </div>

      {/* Safety and Heuristic Disclaimer */}
      <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0c1220] flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-slate-300 leading-relaxed">
          Suitability scores are multi-criteria decision heuristics based on available USGS and LOLA datasets. 
          A numerical score does not guarantee landing safety. Flight certification requires autonomous hazard avoidance confirmation.
        </p>
      </div>

      {/* Site A and Site B Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Site A Selector */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-sky-400 font-bold uppercase tracking-wider">Candidate Site A</span>
            <span>Target 1</span>
          </div>
          <select
            value={siteAId}
            onChange={e => setSiteAId(e.target.value)}
            className="w-full bg-[#090d16] border border-slate-700 text-white text-xs rounded-md p-2 font-mono focus:border-sky-500 focus:outline-none"
          >
            {savedSites.map(s => (
              <option key={s.id} value={s.id}>
                {s.name.replace('—', '-')}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400 font-mono">
            {Math.abs(siteA.latitude).toFixed(2)}° S, {siteA.longitude.toFixed(2)}° E :{' '}
            {siteA.elevationMeters > 0 ? `+${siteA.elevationMeters}m` : `${siteA.elevationMeters}m`}
          </div>
        </div>

        {/* Site B Selector */}
        <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-amber-400 font-bold uppercase tracking-wider">Candidate Site B</span>
            <span>Target 2</span>
          </div>
          <select
            value={siteBId}
            onChange={e => setSiteBId(e.target.value)}
            className="w-full bg-[#090d16] border border-slate-700 text-white text-xs rounded-md p-2 font-mono focus:border-amber-500 focus:outline-none"
          >
            {savedSites.map(s => (
              <option key={s.id} value={s.id}>
                {s.name.replace('—', '-')}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400 font-mono">
            {Math.abs(siteB.latitude).toFixed(2)}° S, {siteB.longitude.toFixed(2)}° E :{' '}
            {siteB.elevationMeters > 0 ? `+${siteB.elevationMeters}m` : `${siteB.elevationMeters}m`}
          </div>
        </div>
      </div>

      {/* Simple Mission Priority Controls */}
      <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span>Mission Priority Controls</span>
          </div>
          <button
            onClick={() =>
              setMissionPriorities({
                sunlightWeight: 80,
                communicationWeight: 75,
                terrainSafetyWeight: 85,
                waterIcePotentialWeight: 70,
              })
            }
            className="text-[11px] font-mono text-slate-400 hover:text-white"
          >
            Reset Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Sunlight */}
          <div className="p-2.5 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Sunlight</span>
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
          </div>

          {/* Communication */}
          <div className="p-2.5 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Direct Comms</span>
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
          </div>

          {/* Terrain Safety */}
          <div className="p-2.5 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Terrain Safety</span>
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
          </div>

          {/* Water Ice Science */}
          <div className="p-2.5 rounded bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Water Ice</span>
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
          </div>
        </div>
      </div>

      {/* Explainable Recommendation Banner */}
      <div className="p-4 rounded-lg border border-slate-800 bg-[#0c1220]">
        <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-white uppercase tracking-wider font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Explainable Recommendation</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {recommendation.text}
        </p>
        {recommendation.winner && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Recommended: <span className="text-white font-semibold">{recommendation.winner.name.replace('—', '-')}</span>
            </span>
            <button
              onClick={() => setSelectedSiteId(recommendation.winner.id)}
              className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors"
            >
              Set as Active Target
            </button>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="rounded-lg border border-slate-800 bg-[#0c1220] overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Side-by-Side Parameter Matrix
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-[#090d16] text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4 w-1/3">Evaluation Metric</th>
                <th className="py-2.5 px-4 w-1/3 text-sky-400 font-bold">
                  Site A: {siteA.name.split('—')[0].trim()}
                </th>
                <th className="py-2.5 px-4 w-1/3 text-amber-400 font-bold">
                  Site B: {siteB.name.split('—')[0].trim()}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {/* Overall Score */}
              <tr className="bg-[#090d16]/50">
                <td className="py-2.5 px-4 font-bold text-white">MCDA Suitability Score</td>
                <td className="py-2.5 px-4 font-bold text-sky-400 text-sm">
                  {breakdownA?.overallScore ?? 'N/A'} / 100
                </td>
                <td className="py-2.5 px-4 font-bold text-amber-400 text-sm">
                  {breakdownB?.overallScore ?? 'N/A'} / 100
                </td>
              </tr>

              {/* Coordinates */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Coordinates</td>
                <td className="py-2.5 px-4">
                  {Math.abs(siteA.latitude).toFixed(3)}° S, {siteA.longitude.toFixed(3)}° E
                </td>
                <td className="py-2.5 px-4">
                  {Math.abs(siteB.latitude).toFixed(3)}° S, {siteB.longitude.toFixed(3)}° E
                </td>
              </tr>

              {/* Elevation */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">LOLA Elevation Datum</td>
                <td className="py-2.5 px-4">
                  {siteA.elevationMeters > 0 ? `+${siteA.elevationMeters}m` : `${siteA.elevationMeters}m`}
                </td>
                <td className="py-2.5 px-4">
                  {siteB.elevationMeters > 0 ? `+${siteB.elevationMeters}m` : `${siteB.elevationMeters}m`}
                </td>
              </tr>

              {/* Slope */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Terrain Slope</td>
                <td className="py-2.5 px-4">
                  {siteA.terrain.slopeDegrees.toFixed(1)}° ({siteA.terrain.slopeDegrees <= 5 ? 'Safe' : 'Moderate'})
                </td>
                <td className="py-2.5 px-4">
                  {siteB.terrain.slopeDegrees.toFixed(1)}° ({siteB.terrain.slopeDegrees <= 5 ? 'Safe' : 'Moderate'})
                </td>
              </tr>

              {/* Surface Roughness */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Surface Roughness (1m scale)</td>
                <td className="py-2.5 px-4">
                  {siteA.terrain.roughnessMeters} m
                </td>
                <td className="py-2.5 px-4">
                  {siteB.terrain.roughnessMeters} m
                </td>
              </tr>

              {/* Sunlight Exposure */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Monthly Sunlight Availability</td>
                <td className="py-2.5 px-4 font-semibold text-white">
                  {siteA.sunlight.predictedIlluminationPercent}%
                </td>
                <td className="py-2.5 px-4 font-semibold text-white">
                  {siteB.sunlight.predictedIlluminationPercent}%
                </td>
              </tr>

              {/* Current Illumination State */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Current Illumination State</td>
                <td className="py-2.5 px-4">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      siteA.sunlight.isIlluminated
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {siteA.sunlight.isIlluminated ? 'DIRECT SUN' : 'SHADOW'}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      siteB.sunlight.isIlluminated
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {siteB.sunlight.isIlluminated ? 'DIRECT SUN' : 'SHADOW'}
                  </span>
                </td>
              </tr>

              {/* Earth Apparent Elevation */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Earth Apparent Elevation</td>
                <td className="py-2.5 px-4">
                  {siteA.earthVisibility.earthElevationDeg > 0 ? `+${siteA.earthVisibility.earthElevationDeg}°` : `${siteA.earthVisibility.earthElevationDeg}°`}
                </td>
                <td className="py-2.5 px-4">
                  {siteB.earthVisibility.earthElevationDeg > 0 ? `+${siteB.earthVisibility.earthElevationDeg}°` : `${siteB.earthVisibility.earthElevationDeg}°`}
                </td>
              </tr>

              {/* Direct Line of Sight */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Direct Earth Line of Sight</td>
                <td className="py-2.5 px-4">
                  {siteA.earthVisibility.hasDirectLineOfSight ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Clear
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Occluded
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  {siteB.earthVisibility.hasDirectLineOfSight ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Clear
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Occluded
                    </span>
                  )}
                </td>
              </tr>

              {/* Direct Comms Availability */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Direct Comms (DTE) Duty Cycle</td>
                <td className="py-2.5 px-4 font-semibold text-white">
                  {siteA.communication.directCommsAvailabilityPercent}%
                </td>
                <td className="py-2.5 px-4 font-semibold text-white">
                  {siteB.communication.directCommsAvailabilityPercent}%
                </td>
              </tr>

              {/* Longest Blackout */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Max Communication Blackout</td>
                <td className="py-2.5 px-4">
                  {siteA.communication.longestBlackoutHours} Hours
                </td>
                <td className="py-2.5 px-4">
                  {siteB.communication.longestBlackoutHours} Hours
                </td>
              </tr>

              {/* Permanent Shadow Region Cold Trap */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">PSR Volatile Trap Context</td>
                <td className="py-2.5 px-4">
                  {siteA.terrain.isPermanentShadowRegion ? 'Interior Cold Trap' : 'Adjacent to PSR'}
                </td>
                <td className="py-2.5 px-4">
                  {siteB.terrain.isPermanentShadowRegion ? 'Interior Cold Trap' : 'Adjacent to PSR'}
                </td>
              </tr>

              {/* Sub-Surface Regolith Stratigraphy (Clearly showing unavailable analysis) */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Sub-Surface Ice Depth</td>
                <td className="py-2.5 px-4 text-slate-400 italic">
                  Not Available (Requires In-situ Core Sampling)
                </td>
                <td className="py-2.5 px-4 text-slate-400 italic">
                  Not Available (Requires In-situ Core Sampling)
                </td>
              </tr>

              {/* Plume-Surface Interaction Risk */}
              <tr>
                <td className="py-2.5 px-4 text-slate-400">Landing Plume Ejecta Risk</td>
                <td className="py-2.5 px-4 text-slate-400 italic">
                  Simulated Estimate (Pending Descent Engine Data)
                </td>
                <td className="py-2.5 px-4 text-slate-400 italic">
                  Simulated Estimate (Pending Descent Engine Data)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
