'use client';

import React from 'react';
import { MissionProvider, useMission } from '@/context/MissionContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TelemetryBar } from '@/components/layout/TelemetryBar';
import { MissionDashboard } from '@/components/dashboard/MissionDashboard';
import { ImmersiveScrollytellingExperience } from '@/components/home/ImmersiveScrollytellingExperience';
import { SunPositionSimulator } from '@/components/sun/SunPositionSimulator';
import { EarthVisibilitySimulator } from '@/components/earth/EarthVisibilitySimulator';
import { CommunicationAnalyzer } from '@/components/comms/CommunicationAnalyzer';
import { LandingSiteComparison } from '@/components/comparison/LandingSiteComparison';
import { MissionReports } from '@/components/reports/MissionReports';
import { FinalLandingMission } from '@/components/landing/FinalLandingMission';

function AppContent() {
  const { activeSection } = useMission();

  // If on Moon Map / Journey, render the full-screen cinematic scrollytelling experience!
  if (activeSection === 'map') {
    return <ImmersiveScrollytellingExperience />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans">
      {/* Left Mission Control Navigation Sidebar */}
      <Sidebar />

      {/* Main Mission Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Telemetry & Timeline Control Bar */}
        <TelemetryBar />

        {/* Dynamic Section Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-grid-pattern relative">
          {activeSection === 'dashboard' && <MissionDashboard />}
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

export default function Home() {
  return (
    <MissionProvider>
      <AppContent />
    </MissionProvider>
  );
}
