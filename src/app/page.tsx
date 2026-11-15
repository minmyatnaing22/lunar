'use client';

import React from 'react';
import { MissionProvider } from '@/context/MissionContext';
import { GuidedMissionWorkflow } from '@/components/workflow/GuidedMissionWorkflow';

export default function Home() {
  return (
    <MissionProvider>
      <GuidedMissionWorkflow />
    </MissionProvider>
  );
}
