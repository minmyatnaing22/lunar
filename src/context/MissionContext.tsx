'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CandidateLandingSite,
  MissionPriorities,
  SimulationState,
  SuitabilityBreakdown,
} from '@/types/mission';
import {
  INITIAL_CANDIDATE_SITES_RAW,
  evaluateCandidateSite,
  createCustomCandidateSite,
} from '@/lib/astronomy/lunarData';
import { evaluateSiteSuitability, rankCandidateSites } from '@/lib/astronomy/suitability';

export type NavigationSection =
  | 'dashboard'
  | 'map'
  | 'sun'
  | 'earth'
  | 'comms'
  | 'comparison'
  | 'reports';

interface MissionContextType {
  activeSection: NavigationSection;
  setActiveSection: (section: NavigationSection) => void;
  selectedSite: CandidateLandingSite;
  savedSites: CandidateLandingSite[];
  simulationDate: Date;
  simulationState: SimulationState;
  missionPriorities: MissionPriorities;
  suitabilityBreakdowns: SuitabilityBreakdown[];
  recommendedSiteId: string;
  recommendationReason: string;
  setSelectedSiteId: (id: string) => void;
  setSimulationDate: (date: Date) => void;
  stepSimulationHours: (hours: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setMissionDurationDays: (days: number) => void;
  toggleRelaySatellite: () => void;
  setMissionPriorities: React.Dispatch<React.SetStateAction<MissionPriorities>>;
  addCustomSite: (
    name: string,
    latitude: number,
    longitude: number,
    elevationMeters: number,
    slopeDegrees: number
  ) => void;
  removeSite: (id: string) => void;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

// Initial Artemis reference date: January 15, 2027 12:00:00 UTC (Artemis III launch window target)
const INITIAL_SIMULATION_DATE = new Date('2027-01-15T12:00:00Z');

export const MissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<NavigationSection>('map');
  const [simulationDate, setSimulationDateState] = useState<Date>(INITIAL_SIMULATION_DATE);
  
  const [simulationState, setSimulationState] = useState<SimulationState>({
    currentDateTime: INITIAL_SIMULATION_DATE.toISOString(),
    timeStepHours: 6,
    isPlaying: false,
    playbackSpeed: 1,
    missionDurationDays: 14,
    relaySatelliteEnabled: true,
    solarArrayEfficiency: 0.28,
  });

  const [missionPriorities, setMissionPriorities] = useState<MissionPriorities>({
    sunlightWeight: 80,
    communicationWeight: 75,
    terrainSafetyWeight: 85,
    waterIcePotentialWeight: 70,
  });

  // Evaluate initial raw candidate sites at starting date
  const [savedSites, setSavedSites] = useState<CandidateLandingSite[]>(() => {
    return INITIAL_CANDIDATE_SITES_RAW.map(raw =>
      evaluateCandidateSite(raw, INITIAL_SIMULATION_DATE, true)
    );
  });

  const [selectedSiteId, setSelectedSiteIdState] = useState<string>('shackleton-connecting-ridge');

  // Helper to re-evaluate all sites when date or relay state changes
  const recomputeSites = useCallback((date: Date, relayEnabled: boolean) => {
    setSavedSites(prevSites =>
      prevSites.map(site => {
        const raw = {
          id: site.id,
          name: site.name,
          description: site.description,
          region: site.region,
          latitude: site.latitude,
          longitude: site.longitude,
          elevationMeters: site.elevationMeters,
          scientificSignificance: site.scientificSignificance,
          artemisCandidateRank: site.artemisCandidateRank,
          terrain: site.terrain,
          isCustom: site.isCustom,
        };
        return evaluateCandidateSite(raw as any, date, relayEnabled);
      })
    );
  }, []);

  const setSimulationDate = useCallback(
    (newDate: Date) => {
      setSimulationDateState(newDate);
      setSimulationState(prev => ({
        ...prev,
        currentDateTime: newDate.toISOString(),
      }));
      recomputeSites(newDate, simulationState.relaySatelliteEnabled);
    },
    [recomputeSites, simulationState.relaySatelliteEnabled]
  );

  const stepSimulationHours = useCallback(
    (hours: number) => {
      const newDate = new Date(simulationDate.getTime() + hours * 3600 * 1000);
      setSimulationDate(newDate);
    },
    [simulationDate, setSimulationDate]
  );

  const togglePlayback = useCallback(() => {
    setSimulationState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setSimulationState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const setMissionDurationDays = useCallback((days: number) => {
    setSimulationState(prev => ({ ...prev, missionDurationDays: days }));
  }, []);

  const toggleRelaySatellite = useCallback(() => {
    setSimulationState(prev => {
      const nextRelay = !prev.relaySatelliteEnabled;
      recomputeSites(simulationDate, nextRelay);
      return { ...prev, relaySatelliteEnabled: nextRelay };
    });
  }, [recomputeSites, simulationDate]);

  // Automated playback timer
  useEffect(() => {
    if (!simulationState.isPlaying) return;

    const intervalMs = Math.max(200, 1000 / simulationState.playbackSpeed);
    const interval = setInterval(() => {
      stepSimulationHours(simulationState.timeStepHours);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    simulationState.isPlaying,
    simulationState.playbackSpeed,
    simulationState.timeStepHours,
    stepSimulationHours,
  ]);

  // Selected site reference
  const selectedSite = useMemo(() => {
    return (
      savedSites.find(s => s.id === selectedSiteId) ||
      savedSites[0] ||
      evaluateCandidateSite(INITIAL_CANDIDATE_SITES_RAW[0], simulationDate, true)
    );
  }, [savedSites, selectedSiteId, simulationDate]);

  // Suitability MCDA rankings
  const { rankedBreakdowns, recommendedSiteId, recommendationReason } = useMemo(() => {
    return rankCandidateSites(savedSites, missionPriorities);
  }, [savedSites, missionPriorities]);

  const addCustomSite = useCallback(
    (
      name: string,
      latitude: number,
      longitude: number,
      elevationMeters: number,
      slopeDegrees: number
    ) => {
      const newSite = createCustomCandidateSite(
        name,
        latitude,
        longitude,
        elevationMeters,
        slopeDegrees,
        simulationDate,
        simulationState.relaySatelliteEnabled
      );

      setSavedSites(prev => [newSite, ...prev]);
      setSelectedSiteIdState(newSite.id);
    },
    [simulationDate, simulationState.relaySatelliteEnabled]
  );

  const removeSite = useCallback((id: string) => {
    setSavedSites(prev => {
      if (prev.length <= 1) return prev; // Keep at least one site
      const filtered = prev.filter(s => s.id !== id);
      return filtered;
    });
    setSelectedSiteIdState(prev => (prev === id ? 'shackleton-connecting-ridge' : prev));
  }, []);

  return (
    <MissionContext.Provider
      value={{
        activeSection,
        setActiveSection,
        selectedSite,
        savedSites,
        simulationDate,
        simulationState,
        missionPriorities,
        suitabilityBreakdowns: rankedBreakdowns,
        recommendedSiteId,
        recommendationReason,
        setSelectedSiteId: setSelectedSiteIdState,
        setSimulationDate,
        stepSimulationHours,
        togglePlayback,
        setPlaybackSpeed,
        setMissionDurationDays,
        toggleRelaySatellite,
        setMissionPriorities,
        addCustomSite,
        removeSite,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
};

export function useMission(): MissionContextType {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
}
