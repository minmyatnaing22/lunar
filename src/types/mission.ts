// LunarSight - Core Mission Data Models & Types
// Based on NASA Lunar Reconnaissance Orbiter (LRO) and JPL Ephemeris specifications

export type LunarRegion = 
  | 'South Pole'
  | 'Equatorial'
  | 'Far Side'
  | 'Near Side'
  | 'North Pole';

export interface TerrainProfile {
  elevationMeters: number; // relative to lunar datum (1737.4 km radius)
  slopeDegrees: number; // local terrain slope
  roughnessMeters: number; // 1m-scale surface roughness
  isPermanentShadowRegion: boolean; // PSR in deep crater interiors
  craterRimMask: {
    azimuth: number; // 0-360 deg (0 = North, 90 = East)
    horizonElevationDeg: number; // elevation angle of surrounding crater rim
  }[];
  dataSource?: string; // e.g. "Reference benchmark (not live DEM sampled)"
  resolution?: string; // spatial/vertical resolution description
  isUserProvided?: boolean;
  isSlopeUnavailable?: boolean;
}

export interface SunlightAnalysis {
  subSolarLongitude: number; // deg
  subSolarLatitude: number; // deg (lunar solar declination, ~-1.54 to +1.54)
  solarElevationDeg: number; // apparent elevation above local mathematical horizon
  solarAzimuthDeg: number; // compass bearing to Sun
  isSunAboveGeometricHorizon: boolean;
  isTerrainOccluded: boolean;
  isIlluminated: boolean; // true if above horizon AND above rim mask
  solarFluxWm2: number; // approximate solar irradiance (~1361 W/m^2 when illuminated)
  predictedIlluminationPercent: number; // estimated over selected mission window
  totalSunlitHours: number;
  longestContinuousDarkHours: number;
}

export interface EarthVisibilityAnalysis {
  earthAzimuthDeg: number; // Azimuth towards Earth (0-360)
  earthElevationDeg: number; // Geometric elevation angle above local horizon
  librationLonDeg: number; // Moon optical+physical libration in longitude
  librationLatDeg: number; // Moon libration in latitude
  isAboveGeometricHorizon: boolean; // Earth center elevation > 0 deg
  isBlockedByTerrain: boolean; // Earth elevation <= local crater rim in that azimuth
  hasDirectLineOfSight: boolean; // Above horizon AND unblocked by approximate mask
  apparentEarthAngularDiameterDeg: number; // ~1.9 deg as seen from Moon
  earthPhase: 'New Earth' | 'Crescent' | 'Quarter' | 'Gibbous' | 'Full Earth';
  phaseFraction: number; // 0.0 to 1.0
  visibilityStatus?: 'geometrically-below-horizon' | 'terrain-obstructed' | 'unobstructed-by-mask';
  horizonObstructionAngleDeg?: number;
}

export interface CommunicationWindow {
  id: string;
  startTime: string; // ISO UTC
  endTime: string; // ISO UTC
  durationHours: number;
  type: 'Direct-to-Earth' | 'Relay-Supported' | 'Blackout';
  primaryStation: 'Goldstone (DSN-14)' | 'Madrid (DSN-63)' | 'Canberra (DSN-43)' | 'Lunar Relay Satellite' | 'None';
  status: 'optimal' | 'marginal' | 'blocked';
  notes: string;
}

export interface CommunicationAnalysis {
  hasDirectEarthLOS: boolean;
  activeDsnStation: string | null;
  roundTripLatencySeconds: number; // ~2.4 - 2.7 sec light-time
  isRelaySupported: boolean;
  relayElevationDeg?: number;
  relayAzimuthDeg?: number;
  directCommsAvailabilityPercent: number; // % of time direct comms possible over mission period
  longestBlackoutHours: number;
  upcomingWindows: CommunicationWindow[];
}

export interface CandidateLandingSite {
  id: string;
  name: string;
  description: string;
  region: LunarRegion;
  latitude: number; // deg (-90 to +90, negative = South)
  longitude: number; // deg (-180 to +180, negative = West)
  elevationMeters: number; // meters from 1737.4 km radius datum
  terrain: TerrainProfile;
  scientificSignificance: string;
  artemisCandidateRank?: number; // NASA Artemis III candidate evaluation ranking
  sunlight: SunlightAnalysis;
  earthVisibility: EarthVisibilityAnalysis;
  communication: CommunicationAnalysis;
  suitabilityScore?: number; // 0 - 100 based on active mission priorities
  isCustom?: boolean; // user-added custom coordinate
  dataSource?: string; // e.g. "Reference benchmark (not live DEM sampled)"
  resolution?: string; // spatial and vertical resolution
  coordinateFrame?: string; // e.g. "IAU 2015 Mean Earth/Polar Axis (ME)"
  datum?: string; // Reference lunar sphere radius
  quickmapUrl?: string; // Direct LROC QuickMap deep link
  trekUrl?: string; // Direct NASA Moon Trek validation link
  elevationStatus?: 'benchmark' | 'user-provided' | 'unavailable';
}

export interface MissionPriorities {
  sunlightWeight: number; // 0 - 100
  communicationWeight: number; // 0 - 100
  terrainSafetyWeight: number; // 0 - 100 (preference for low slope & low roughness)
  waterIcePotentialWeight: number; // 0 - 100 (proximity to PSRs)
}

export interface SuitabilityBreakdown {
  siteId: string;
  siteName: string;
  overallScore: number; // 0 - 100
  sunlightScore: number;
  communicationScore: number;
  terrainSafetyScore: number;
  waterIceScore: number;
  verdict: 'Highly Recommended' | 'Feasible with Constraints' | 'High Risk / Severe Constraints';
  keyAdvantages: string[];
  operationalRisks: string[];
  justification: string;
}

export interface SimulationState {
  currentDateTime: string; // ISO String UTC
  timeStepHours: number;
  isPlaying: boolean;
  playbackSpeed: number; // 1x, 10x, 100x
  missionDurationDays: number; // 7, 14, 28, 60 days
  relaySatelliteEnabled: boolean;
  solarArrayEfficiency: number; // default 0.28 (28% triple-junction GaAs space solar cells)
}
