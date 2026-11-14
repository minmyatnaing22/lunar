'use client';

import React from 'react';
import { useMission } from '@/context/MissionContext';
import {
  SlidersHorizontal,
  Award,
  Sun,
  Globe2,
  Radio,
  Mountain,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const LandingSiteComparison: React.FC = () => {
  const {
    savedSites,
    selectedSite,
    setSelectedSiteId,
    missionPriorities,
    setMissionPriorities,
    suitabilityBreakdowns,
    recommendedSiteId,
    recommendationReason,
    setActiveSection,
  } = useMission();

  const handlePriorityChange = (key: keyof typeof missionPriorities, value: number) => {
    setMissionPriorities(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const topCandidate = savedSites.find(s => s.id === recommendedSiteId) || savedSites[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 uppercase font-semibold">
              Feature 5
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Multi-Criteria Decision Analysis (MCDA) Trade Studies
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Landing Site Trade Study & Comparative Suitability
          </h1>
        </div>

        <button
          onClick={() => setActiveSection('reports')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <span>Generate Full Mission Report</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Safety & Scoring Disclaimer Banner */}
      <div className="p-4 rounded-xl border border-amber-800/60 bg-gradient-to-r from-amber-950/30 to-[#0c1322] flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-amber-300 uppercase font-mono tracking-wider">
            Scientific Disclaimer: Heuristic Scoring vs Flight Safety Certification
          </div>
          <p className="text-slate-300 leading-relaxed">
            The numerical suitability score (0-100) generated below is a <strong>trade-study heuristic</strong> based on multi-attribute utility theory. 
            A high numerical score <strong>does not prove or guarantee that a location is safe for landing</strong>. Operational landing certification requires meter-scale hazard detection and avoidance (HDA) LIDAR scans, plume-surface interaction analysis, and autonomous hazard-divert propellant verification.
          </p>
        </div>
      </div>

      {/* Top Winner Rationale Card */}
      <div className="p-5 rounded-xl border border-emerald-800/60 bg-gradient-to-r from-emerald-950/30 via-[#0c1626] to-[#09101d] shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            MCDA Algorithm Recommended Candidate
          </h2>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold text-emerald-300 mb-1">
              {topCandidate.name}
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {recommendationReason}
            </p>
          </div>
          <button
            onClick={() => setSelectedSiteId(topCandidate.id)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 shadow-lg transition-all"
          >
            Set as Active Target
          </button>
        </div>
      </div>

      {/* Mission Priority Weighting Controls */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1b]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-purple-400" />
              <span>Interactive Mission Priority Weights</span>
            </h2>
            <p className="text-xs text-slate-400">
              Adjust weights to match specific mission goals (e.g. solar-powered base vs volatile sampling)
            </p>
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
            className="text-xs font-mono text-sky-400 hover:text-sky-300"
          >
            Reset Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sunlight Weight */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" /> Sunlight Priority
              </span>
              <span className="text-white font-bold">{missionPriorities.sunlightWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.sunlightWeight}
              onChange={e => handlePriorityChange('sunlightWeight', Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="text-[10px] text-slate-400">Maximizes persistent solar power</div>
          </div>

          {/* Comms Weight */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> Direct Comms Priority
              </span>
              <span className="text-white font-bold">{missionPriorities.communicationWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.communicationWeight}
              onChange={e => handlePriorityChange('communicationWeight', Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <div className="text-[10px] text-slate-400">Favors continuous Earth LOS</div>
          </div>

          {/* Terrain Safety Weight */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5" /> Terrain Safety Priority
              </span>
              <span className="text-white font-bold">{missionPriorities.terrainSafetyWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.terrainSafetyWeight}
              onChange={e => handlePriorityChange('terrainSafetyWeight', Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="text-[10px] text-slate-400">Penalizes steep slopes & roughness</div>
          </div>

          {/* Water Ice Science Weight */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-indigo-400 font-semibold flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" /> Water Ice Potential
              </span>
              <span className="text-white font-bold">{missionPriorities.waterIcePotentialWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={missionPriorities.waterIcePotentialWeight}
              onChange={e => handlePriorityChange('waterIcePotentialWeight', Number(e.target.value))}
              className="w-full accent-indigo-400"
            />
            <div className="text-[10px] text-slate-400">Favors proximity to PSR cold traps</div>
          </div>
        </div>
      </div>

      {/* Multi-Candidate Comparison Matrix Table */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1b]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Candidate Landing Site Matrix Comparison
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {savedSites.length} Candidate Locations Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Site Identifier</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3">Elevation</th>
                <th className="py-2.5 px-3">Slope</th>
                <th className="py-2.5 px-3">Sunlight</th>
                <th className="py-2.5 px-3">Direct Comms</th>
                <th className="py-2.5 px-3">PSR Cold Trap</th>
                <th className="py-2.5 px-3">MCDA Score</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {suitabilityBreakdowns.map((bd, index) => {
                const site = savedSites.find(s => s.id === bd.siteId);
                if (!site) return null;
                const isSelected = site.id === selectedSite.id;
                const isTop = index === 0;

                return (
                  <tr
                    key={site.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-sky-500/10' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          isTop
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 bg-slate-900'
                        }`}
                      >
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[180px]">{site.name}</span>
                        {isTop && <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {Math.abs(site.latitude).toFixed(2)}°S, {site.longitude.toFixed(2)}°E
                    </td>
                    <td className="py-3 px-3 text-amber-400">
                      {site.elevationMeters > 0 ? `+${site.elevationMeters}m` : `${site.elevationMeters}m`}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {site.terrain.slopeDegrees.toFixed(1)}°
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-amber-300 font-semibold">
                        {site.sunlight.predictedIlluminationPercent}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sky-300 font-semibold">
                        {site.communication.directCommsAvailabilityPercent}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {site.terrain.isPermanentShadowRegion ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Interior PSR
                        </span>
                      ) : (
                        <span className="text-slate-400">Adjacent</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-sky-400">
                          {bd.overallScore}
                        </span>
                        <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-400 h-full rounded-full"
                            style={{ width: `${bd.overallScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isSelected ? (
                        <span className="text-[10px] text-sky-400 font-bold px-2 py-1 rounded bg-sky-950 border border-sky-800">
                          Selected
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedSiteId(site.id)}
                          className="text-[10px] text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
