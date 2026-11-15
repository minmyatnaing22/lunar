'use client';

import React from 'react';
import { WorkflowStep, useMission } from '@/context/MissionContext';
import {
  MapPin,
  Cpu,
  Columns,
  CheckCircle,
  Rocket,
  Award,
  ChevronRight,
  Check,
} from 'lucide-react';

interface StepMeta {
  key: WorkflowStep;
  stepNumber: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepMeta[] = [
  {
    key: 'select-locations',
    stepNumber: 1,
    label: 'Select Locations',
    shortLabel: 'Locations',
    icon: MapPin,
  },
  {
    key: 'evaluate-sites',
    stepNumber: 2,
    label: 'Site Evaluation',
    shortLabel: 'Evaluation',
    icon: Cpu,
  },
  {
    key: 'compare-sites',
    stepNumber: 3,
    label: 'Compare Candidates',
    shortLabel: 'Comparison',
    icon: Columns,
  },
  {
    key: 'confirm-site',
    stepNumber: 4,
    label: 'Confirm Site',
    shortLabel: 'Confirm',
    icon: CheckCircle,
  },
  {
    key: 'landing',
    stepNumber: 5,
    label: 'Spacecraft Landing',
    shortLabel: 'Landing',
    icon: Rocket,
  },
  {
    key: 'result',
    stepNumber: 6,
    label: 'Mission Result',
    shortLabel: 'Result',
    icon: Award,
  },
];

export const WorkflowStepIndicator: React.FC = () => {
  const { workflowStep, setWorkflowStep, candidateSiteIds } = useMission();

  const currentStepIndex = STEPS.findIndex(s => s.key === workflowStep);

  return (
    <nav
      aria-label="Mission Workflow Progress"
      className="flex items-center justify-between w-full max-w-4xl mx-auto py-2 px-3 select-none"
    >
      <ol className="flex items-center w-full justify-between">
        {STEPS.map((step, idx) => {
          const isCurrent = step.key === workflowStep;
          const isCompleted = idx < currentStepIndex;
          const isFuture = idx > currentStepIndex;

          // Can click backward or on current
          const isClickable = idx <= currentStepIndex || (idx === 1 && candidateSiteIds.length > 0);

          const Icon = step.icon;

          return (
            <li key={step.key} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (isClickable) {
                    setWorkflowStep(step.key);
                  }
                }}
                disabled={!isClickable}
                className={`group flex items-center gap-2 focus:outline-none transition-all ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                }`}
                title={`Step ${step.stepNumber}: ${step.label}`}
              >
                {/* Step Circle Badge */}
                <div
                  className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border text-xs font-mono font-bold transition-all shadow-sm ${
                    isCurrent
                      ? 'bg-sky-500 text-black border-sky-300 ring-2 ring-sky-500/30'
                      : isCompleted
                      ? 'bg-sky-950 text-sky-300 border-sky-600/80 group-hover:border-sky-400 group-hover:bg-sky-900'
                      : 'bg-slate-900 text-slate-500 border-slate-700/60'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <span>{step.stepNumber}</span>
                  )}
                </div>

                {/* Step Label (Hidden on small mobile, visible on tablet+) */}
                <div className="hidden md:flex flex-col text-left">
                  <span
                    className={`text-[9px] uppercase font-mono font-medium tracking-wider leading-none ${
                      isCurrent
                        ? 'text-sky-400'
                        : isCompleted
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    Step {step.stepNumber}
                  </span>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap leading-tight mt-0.5 ${
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                        ? 'text-slate-300 group-hover:text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </button>

              {/* Connecting Line between steps */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 mx-2 sm:mx-3 h-[2px] rounded transition-colors ${
                    idx < currentStepIndex
                      ? 'bg-sky-500/60'
                      : 'bg-slate-800'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
