'use client';

import React from 'react';
import {
  X,
  Database,
  ExternalLink,
  ShieldCheck,
  Compass,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import { AGENCY_RESOURCES, DATA_CLASSIFICATIONS } from '@/lib/astronomy/agencyResources';

interface ScientificResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScientificResourcesModal: React.FC<ScientificResourcesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#090d16] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200 font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0c1220]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>NASA & International Agency Scientific Resources</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
                  Official Provenance
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Authoritative datasets, coordinate systems, and analytical frameworks utilized in LunarSight
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Data Integrity Summary Banner */}
          <div className="p-4 rounded-lg bg-[#0c1322] border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-sky-300 font-semibold font-mono text-[11px] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Scientific Data Integrity Policy</span>
            </div>
            <p className="text-slate-300 text-[12px] leading-relaxed">
              LunarSight strictly distinguishes between <strong>empirical spacecraft measurements</strong>, 
              <strong>analytical physical models</strong>, and <strong>published reference benchmarks</strong>. 
              Predefined landing locations utilize published peer-reviewed topographical benchmarks from NASA Artemis and USGS LOLA studies. 
              Arbitrary user-clicked surface coordinates are computed via exact selenographic vector transformations, but are transparently disclosed as having no live DEM raster query in the browser client.
            </p>
          </div>

          {/* Classification Legend */}
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Data Classification System
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {Object.values(DATA_CLASSIFICATIONS).map(meta => (
                <div
                  key={meta.type}
                  className="p-2.5 rounded border border-slate-800 bg-[#070b14] flex flex-col justify-between"
                >
                  <span
                    className={`inline-block w-fit text-[10px] font-mono font-bold px-2 py-0.5 rounded border mb-1.5 ${meta.badgeColor}`}
                  >
                    {meta.label}
                  </span>
                  <p className="text-[11px] text-slate-400 leading-snug">{meta.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agency Resources List */}
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
              Authoritative Agency Datasets & Systems
            </h3>
            <div className="space-y-3">
              {AGENCY_RESOURCES.map(res => (
                <div
                  key={res.id}
                  className="p-4 rounded-lg border border-slate-800 bg-[#070b14] hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{res.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {res.agency}
                        </span>
                      </div>
                      <span className="text-xs text-sky-400 font-mono mt-0.5 block">
                        {res.integrationType}
                      </span>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs font-mono font-semibold transition-colors w-fit"
                    >
                      <span>Visit Agency Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{res.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-[#0b101c] border border-slate-800/80">
                      <span className="text-slate-500 block uppercase text-[9px]">Coord Frame</span>
                      <span className="text-slate-200">{res.coordinateFrame}</span>
                    </div>
                    <div className="p-2 rounded bg-[#0b101c] border border-slate-800/80">
                      <span className="text-slate-500 block uppercase text-[9px]">Time System</span>
                      <span className="text-slate-200">{res.timeSystem}</span>
                    </div>
                    <div className="p-2 rounded bg-[#0b101c] border border-slate-800/80">
                      <span className="text-slate-500 block uppercase text-[9px]">Resolution</span>
                      <span className="text-slate-200">{res.resolution}</span>
                    </div>
                    <div className="p-2 rounded bg-[#0b101c] border border-slate-800/80">
                      <span className="text-slate-500 block uppercase text-[9px]">Units</span>
                      <span className="text-slate-200">{res.units}</span>
                    </div>
                  </div>

                  {res.limitations && (
                    <div className="text-[11px] text-amber-300/90 bg-amber-950/20 border border-amber-900/40 p-2 rounded leading-relaxed">
                      <strong>Methodology Note:</strong> {res.limitations}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#0c1220] flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            Artemis III Exploration Target • IAU 2015 Mean Earth Frame
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
