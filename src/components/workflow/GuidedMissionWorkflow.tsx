'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMission } from '@/context/MissionContext';
import { WorkflowHeader } from './WorkflowHeader';
import { Step1LocationSelection } from './Step1LocationSelection';
import { Step2SiteEvaluation } from './Step2SiteEvaluation';
import { Step3SiteComparison } from './Step3SiteComparison';
import { Step4SiteConfirmation } from './Step4SiteConfirmation';
import { Step5SpacecraftLanding } from './Step5SpacecraftLanding';
import { Step6MissionResult } from './Step6MissionResult';
import { Sidebar } from '@/components/layout/Sidebar';
import { TelemetryBar } from '@/components/layout/TelemetryBar';

function LoadingModuleFallback({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center p-8 text-center bg-[#05070c]">
      <div className="relative mb-3 h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Loading Phase</div>
      <div className="mt-1 font-mono text-xs font-semibold text-slate-200">{title}</div>
    </div>
  );
}

// Lazy-load advanced modules if user toggles "All Tools"
const MissionDashboard = dynamic(
  () => import('@/components/dashboard/MissionDashboard').then(m => m.MissionDashboard),
  { ssr: false, loading: () => <LoadingModuleFallback title="Mission Dashboard" /> }
);
const SunPositionSimulator = dynamic(
  () => import('@/components/sun/SunPositionSimulator').then(m => m.SunPositionSimulator),
  { ssr: false, loading: () => <LoadingModuleFallback title="Sun Position Simulator" /> }
);
const EarthVisibilitySimulator = dynamic(
  () => import('@/components/earth/EarthVisibilitySimulator').then(m => m.EarthVisibilitySimulator),
  { ssr: false, loading: () => <LoadingModuleFallback title="Earth Visibility Simulator" /> }
);
const CommunicationAnalyzer = dynamic(
  () => import('@/components/comms/CommunicationAnalyzer').then(m => m.CommunicationAnalyzer),
  { ssr: false, loading: () => <LoadingModuleFallback title="Communication Analyzer" /> }
);
const LandingSiteComparison = dynamic(
  () => import('@/components/comparison/LandingSiteComparison').then(m => m.LandingSiteComparison),
  { ssr: false, loading: () => <LoadingModuleFallback title="Landing Site Comparison" /> }
);
const MissionReports = dynamic(
  () => import('@/components/reports/MissionReports').then(m => m.MissionReports),
  { ssr: false, loading: () => <LoadingModuleFallback title="Mission Reports" /> }
);
const FinalLandingMission = dynamic(
  () => import('@/components/landing/FinalLandingMission').then(m => m.FinalLandingMission),
  { ssr: false, loading: () => <LoadingModuleFallback title="Landing Mission Simulation" /> }
);

export const GuidedMissionWorkflow: React.FC = () => {
  const { workflowStep, activeSection } = useMission();
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // If user toggles to the advanced modular multi-tool view
  if (isAdvancedMode) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TelemetryBar />
          {/* Top Banner to switch back to Guided Workflow */}
          <div className="h-9 bg-sky-950/70 border-b border-sky-800 px-4 flex items-center justify-between text-xs font-mono">
            <span className="text-sky-300">
              Advanced Tool View Active • Independent Simulator Workspace
            </span>
            <button
              onClick={() => setIsAdvancedMode(false)}
              className="px-2.5 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-black font-bold text-[11px] transition-all"
            >
              Return to Guided Workflow →
            </button>
          </div>
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-grid-pattern relative">
            {activeSection === 'dashboard' && <MissionDashboard />}
            {activeSection === 'map' && <Step1LocationSelection />}
            {activeSection === 'sun' && <SunPositionSimulator />}
            {activeSection === 'earth' && <EarthVisibilitySimulator />}
            {activeSection === 'comms' && <CommunicationAnalyzer />}
            {activeSection === 'landing' && <FinalLandingMission />}
            {activeSection === 'comparison' && <LandingSiteComparison />}
            {activeSection === 'reports' && <MissionReports />}
          </main>
        </div>
      </div>
    );
  }

  // Primary Guided Mission Workflow
  return (
    <div className="flex flex-col h-full w-full bg-[#05070c] text-slate-100 font-sans overflow-hidden">
      {/* Top Header with Sequential Stepper */}
      <WorkflowHeader
        onToggleAdvancedTools={() => setIsAdvancedMode(!isAdvancedMode)}
        isAdvancedMode={isAdvancedMode}
      />

      {/* Main Sequential Step Viewport */}
      <main className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden">
        {workflowStep === 'select-locations' && <Step1LocationSelection />}
        {workflowStep === 'evaluate-sites' && <Step2SiteEvaluation />}
        {workflowStep === 'compare-sites' && <Step3SiteComparison />}
        {workflowStep === 'confirm-site' && <Step4SiteConfirmation />}
        {workflowStep === 'landing' && <Step5SpacecraftLanding />}
        {workflowStep === 'result' && <Step6MissionResult />}
      </main>
    </div>
  );
};
