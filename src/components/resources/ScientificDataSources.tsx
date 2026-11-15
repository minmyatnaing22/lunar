'use client';

import React from 'react';
import { useMission } from '@/context/MissionContext';
import {
  ExternalLink,
  ShieldCheck,
  Database,
  Layers,
  Compass,
  Satellite,
  Info,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  AGENCY_RESOURCES,
  DATA_CLASSIFICATIONS,
  DataClassification,
} from '@/lib/astronomy/agencyResources';

export const ScientificDataSources: React.FC = () => {
  const { selectedSite, simulationDate } = useMission();

  return (
    <div className="space-y-6 text-slate-200 font-sans">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase tracking-wider font-semibold">
                Official Agency Heritage
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                NASA • ASU • JPL • CSA
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              <span>Scientific Data Sources & Verification Registry</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-3xl leading-relaxed">
              Transparent attribution, coordinate reference frames, and data lineage for planetary cartography, orbital ephemerides, and lunar exploration frameworks.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400 p-2.5 rounded-lg bg-[#090d16] border border-slate-800 shrink-0 self-start sm:self-auto">
            <div className="text-[10px] uppercase text-slate-400">Simulation Epoch (UTC)</div>
            <div className="text-sky-300 font-bold">{simulationDate.toISOString().replace('T', ' ').substring(0, 19)}</div>
          </div>
        </div>

        {/* Data Classification Guide */}
        <div className="mt-4 pt-1">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2.5 font-bold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Scientific Data Classification Standards</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(DATA_CLASSIFICATIONS) as DataClassification[]).map(key => {
              const meta = DATA_CLASSIFICATIONS[key];
              return (
                <div key={key} className="p-3 rounded-lg bg-[#090d16] border border-slate-800/80 space-y-1.5">
                  <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${meta.badgeColor}`}>
                    [{meta.label.toUpperCase()}]
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {meta.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary 4 Agency Resources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {AGENCY_RESOURCES.map(res => {
          return (
            <div
              key={res.id}
              className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="space-y-3">
                {/* Card Title & Agency */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      {res.agency}
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{res.name}</span>
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${
                      res.isActiveDataset
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {res.integrationType}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {res.description}
                </p>

                {/* Technical Metadata Matrix */}
                <div className="bg-[#090d16] border border-slate-800/80 rounded-lg p-3 text-xs font-mono space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Coordinate Frame</span>
                      <span className="text-slate-200 text-[11px] font-semibold">{res.coordinateFrame}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Time System</span>
                      <span className="text-slate-200 text-[11px] font-semibold">{res.timeSystem}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Spatial Resolution</span>
                      <span className="text-slate-200 text-[11px] font-semibold">{res.resolution}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Measurement Units</span>
                      <span className="text-slate-200 text-[11px] font-semibold">{res.units}</span>
                    </div>
                  </div>

                  {/* Modules Applied */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 text-[10px]">Applied in:</span>
                    {res.appliedModules.map((mod, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700/60"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>

                  {/* Scientific Limitations */}
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-amber-300/80">
                    <span className="font-semibold text-amber-400">Limitation: </span>
                    <span>{res.limitations}</span>
                  </div>
                </div>
              </div>

              {/* Attribution & External Action Button */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="text-[10px] text-slate-400 font-mono italic">
                  {res.attribution}
                </div>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs font-mono font-semibold transition-colors shrink-0 self-start sm:self-auto"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Site Verification Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Target Site Empirical Cross-Validation</span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono mt-0.5">
              {selectedSite.name} ({Math.abs(selectedSite.latitude).toFixed(3)}° S, {selectedSite.longitude.toFixed(3)}° E)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedSite.quickmapUrl && (
              <a
                href={selectedSite.quickmapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090d16] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors"
                title="Cross-validate coordinates in LROC QuickMap"
              >
                <span>Verify in LROC QuickMap</span>
                <ExternalLink className="w-3 h-3 text-sky-400" />
              </a>
            )}
            {selectedSite.trekUrl && (
              <a
                href={selectedSite.trekUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090d16] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors"
                title="Cross-validate 3D morphology in NASA Moon Trek"
              >
                <span>Validate in NASA Moon Trek</span>
                <ExternalLink className="w-3 h-3 text-emerald-400" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-[#090d16] border border-slate-800">
            <div className="text-slate-400 text-[10px]">Elevation Data Source</div>
            <div className="text-white font-semibold text-[11px] truncate" title={selectedSite.dataSource || 'Reference Benchmark'}>
              {selectedSite.dataSource || 'Reference Benchmark (Literature)'}
            </div>
            <div className="text-[10px] text-amber-400 mt-1">
              {selectedSite.elevationStatus === 'unavailable'
                ? '[UNAVAILABLE]'
                : selectedSite.isCustom
                ? '[USER-PROVIDED]'
                : '[REFERENCE BENCHMARK]'}
            </div>
          </div>
          <div className="p-3 rounded bg-[#090d16] border border-slate-800">
            <div className="text-slate-400 text-[10px]">Spatial Resolution / Mode</div>
            <div className="text-white font-semibold text-[11px]">
              {selectedSite.resolution || 'Reference Literature Datum'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Not live DEM sampled</div>
          </div>
          <div className="p-3 rounded bg-[#090d16] border border-slate-800">
            <div className="text-slate-400 text-[10px]">Ephemeris Engine</div>
            <div className="text-white font-semibold text-[11px]">
              Analytical DE440 Series
            </div>
            <div className="text-[10px] text-cyan-400 mt-1">[ANALYTICAL EPHEMERIS]</div>
          </div>
          <div className="p-3 rounded bg-[#090d16] border border-slate-800">
            <div className="text-slate-400 text-[10px]">Suitability Ranking</div>
            <div className="text-white font-semibold text-[11px]">
              Weighted MCDA
            </div>
            <div className="text-[10px] text-purple-400 mt-1">[SIMULATED ESTIMATES]</div>
          </div>
        </div>
      </div>

      {/* CSA Moon Exploration Highlight Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Canadian Space Agency (CSA) • Lunar Exploration & Artemis Architecture
          </h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Canada is a cornerstone partner in humanity’s return to deep space. Under the NASA-led Artemis Accords, CSA is providing critical infrastructure, robotic intelligence, astronaut participation, and polar surface prospecting:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-1">
          <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1">
            <div className="text-rose-400 font-bold text-xs">Artemis II Astronaut</div>
            <div className="text-slate-200 text-[11px] font-sans">
              Canadian astronaut <strong>Jeremy Hansen</strong> will fly as Mission Specialist on Artemis II, the first crewed lunar mission in over 50 years.
            </div>
          </div>
          <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1">
            <div className="text-rose-400 font-bold text-xs">Canadarm3 Robotics</div>
            <div className="text-slate-200 text-[11px] font-sans">
              Next-generation autonomous AI-driven robotic arm providing maintenance, cargo inspection, and module berthing for the cislunar <strong>Lunar Gateway</strong>.
            </div>
          </div>
          <div className="p-3 rounded bg-[#090d16] border border-slate-800 space-y-1">
            <div className="text-rose-400 font-bold text-xs">Canadian Lunar Rover</div>
            <div className="text-slate-200 text-[11px] font-sans">
              Canadian micro-rover (Canadensys Aerospace) landing at the <strong>Lunar South Pole</strong> to prospect for subsurface water ice and survive the extreme lunar night.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
