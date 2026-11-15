'use client';

import React, { useState } from 'react';
import { useMission } from '@/context/MissionContext';
import { WorkflowStepIndicator } from './WorkflowStepIndicator';
import { ScientificResourcesModal } from './ScientificResourcesModal';
import {
  Rocket,
  Compass,
  Calendar,
  Database,
  Sliders,
  RotateCcw,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface WorkflowHeaderProps {
  onToggleAdvancedTools?: () => void;
  isAdvancedMode?: boolean;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  onToggleAdvancedTools,
  isAdvancedMode = false,
}) => {
  const { simulationDate, resetWorkflow } = useMission();
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  // Format UTC date
  const dateStr = simulationDate.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

  return (
    <header className="w-full bg-[#070a12]/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 select-none">
      {/* Top Main Navigation Bar */}
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand & Mission Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-wider text-white font-mono uppercase">
                LunarSight
              </span>
              <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
                Artemis Planner
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5">
              Guided Landing-Site Selection & Descent
            </p>
          </div>
        </div>

        {/* Center: Step Indicator */}
        <div className="hidden lg:flex flex-1 justify-center max-w-2xl">
          <WorkflowStepIndicator />
        </div>

        {/* Right Tools & Simulation Metadata */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Target Time Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1220] border border-slate-800 text-[11px] font-mono text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>{dateStr}</span>
          </div>

          {/* Scientific Resources Button */}
          <button
            onClick={() => setIsResourcesOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1220] hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white transition-colors"
            title="Inspect NASA LOLA, Horizons & CSA Datasets"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">NASA Data</span>
          </button>

          {/* Reset Workflow */}
          <button
            onClick={() => {
              if (window.confirm('Reset landing mission workflow to Step 1?')) {
                resetWorkflow();
              }
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Reset Workflow to Step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Optional Advanced Mode Toggle */}
          {onToggleAdvancedTools && (
            <button
              onClick={onToggleAdvancedTools}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
                isAdvancedMode
                  ? 'bg-sky-500 text-black border-sky-400 font-bold'
                  : 'bg-[#0c1220] text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Toggle Advanced Mission Control Tools"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isAdvancedMode ? 'Guided Workflow' : 'All Tools'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Step Indicator Row (Visible only on < lg) */}
      <div className="lg:hidden border-t border-slate-800/80 px-2 py-1 bg-[#050810]">
        <WorkflowStepIndicator />
      </div>

      {/* Scientific Resources Modal */}
      <ScientificResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
      />
    </header>
  );
};
