// LunarSight - NASA Lunar Datasets & Preloaded Artemis Candidate Landing Sites
// Data Sources:
// - NASA Lunar Reconnaissance Orbiter (LRO) LOLA (Lunar Orbiter Laser Altimeter) DEM
// - USGS Astrogeology Science Center Lunar Polar Digital Elevation Models
// - NASA Artemis III Candidate Landing Regions Selection White Papers (2022-2024)

import { CandidateLandingSite, LunarRegion, TerrainProfile } from '@/types/mission';
import { analyzeSiteSunlight } from './illumination';
import { analyzeEarthVisibility } from './earthVisibility';
import { analyzeCommunication } from './communication';
import { getQuickMapCoordinatesUrl, getMoonTrekCoordinatesUrl } from './agencyResources';

export interface RawCandidateSite {
  id: string;
  name: string;
  description: string;
  region: LunarRegion;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  scientificSignificance: string;
  artemisCandidateRank?: number;
  terrain: TerrainProfile;
  isCustom?: boolean;
}

export const INITIAL_CANDIDATE_SITES_RAW: RawCandidateSite[] = [
  {
    id: 'shackleton-connecting-ridge',
    name: 'Shackleton Crater - Connecting Ridge',
    description: 'Prominent elevated ridge connecting Shackleton crater rim to adjacent massif. One of the primary Artemis landing zones.',
    region: 'South Pole' as const,
    latitude: -89.44,
    longitude: 141.00,
    elevationMeters: 1250,
    scientificSignificance: 'High persistent illumination during southern summer; direct access to Shackleton crater interior cold traps with prospective water-ice deposits.',
    artemisCandidateRank: 1,
    terrain: {
      elevationMeters: 1250,
      slopeDegrees: 6.2,
      roughnessMeters: 0.85,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 1.8 },
        { azimuth: 45, horizonElevationDeg: 2.2 },
        { azimuth: 90, horizonElevationDeg: 3.5 },
        { azimuth: 135, horizonElevationDeg: 4.1 },
        { azimuth: 180, horizonElevationDeg: 2.9 },
        { azimuth: 225, horizonElevationDeg: 1.5 },
        { azimuth: 270, horizonElevationDeg: 1.2 },
        { azimuth: 315, horizonElevationDeg: 1.4 },
        { azimuth: 360, horizonElevationDeg: 1.8 },
      ],
    },
  },
  {
    id: 'malapert-mountain',
    name: 'Malapert Mountain (Peak of Eternal Light)',
    description: 'A 5-kilometer high massif overlooking the lunar south pole, noted for some of the highest continuous illumination and Earth visibility.',
    region: 'South Pole' as const,
    latitude: -85.83,
    longitude: 2.72,
    elevationMeters: 5040,
    scientificSignificance: 'Outstanding vantage point for long-term communications base station; Earth remains almost continuously visible above the horizon.',
    artemisCandidateRank: 2,
    terrain: {
      elevationMeters: 5040,
      slopeDegrees: 4.8,
      roughnessMeters: 0.72,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 0.5 },
        { azimuth: 45, horizonElevationDeg: 0.8 },
        { azimuth: 90, horizonElevationDeg: 1.2 },
        { azimuth: 135, horizonElevationDeg: 1.0 },
        { azimuth: 180, horizonElevationDeg: 1.6 },
        { azimuth: 225, horizonElevationDeg: 1.1 },
        { azimuth: 270, horizonElevationDeg: 0.7 },
        { azimuth: 315, horizonElevationDeg: 0.4 },
        { azimuth: 360, horizonElevationDeg: 0.5 },
      ],
    },
  },
  {
    id: 'de-gerlache-rim',
    name: 'de Gerlache Crater Rim',
    description: 'Elevated crater rim bounding the de Gerlache impact structure, offering stable solar illumination and safe landing plateaus.',
    region: 'South Pole' as const,
    latitude: -88.71,
    longitude: -88.35,
    elevationMeters: 1780,
    scientificSignificance: 'Exposed ancient lunar crustal materials and direct rover access to the cryogenic shadowed floor of de Gerlache crater.',
    artemisCandidateRank: 3,
    terrain: {
      elevationMeters: 1780,
      slopeDegrees: 5.5,
      roughnessMeters: 0.95,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 1.9 },
        { azimuth: 45, horizonElevationDeg: 2.5 },
        { azimuth: 90, horizonElevationDeg: 3.1 },
        { azimuth: 135, horizonElevationDeg: 2.8 },
        { azimuth: 180, horizonElevationDeg: 2.0 },
        { azimuth: 225, horizonElevationDeg: 1.7 },
        { azimuth: 270, horizonElevationDeg: 1.4 },
        { azimuth: 315, horizonElevationDeg: 1.6 },
        { azimuth: 360, horizonElevationDeg: 1.9 },
      ],
    },
  },
  {
    id: 'nobile-rim-1',
    name: 'Nobile Crater Rim 1 (VIPER Target)',
    description: 'Broad plateau on the rim of Nobile crater; site designated for NASA VIPER rover volatile mapping investigations.',
    region: 'South Pole' as const,
    latitude: -85.22,
    longitude: 53.56,
    elevationMeters: 3980,
    scientificSignificance: 'Diverse terrain with accessible PSR micro-cold traps, allowing rovers to alternate between sunlit battery recharge and dark sampling runs.',
    artemisCandidateRank: 4,
    terrain: {
      elevationMeters: 3980,
      slopeDegrees: 3.9,
      roughnessMeters: 0.65,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 0.8 },
        { azimuth: 45, horizonElevationDeg: 1.1 },
        { azimuth: 90, horizonElevationDeg: 1.5 },
        { azimuth: 135, horizonElevationDeg: 1.9 },
        { azimuth: 180, horizonElevationDeg: 1.4 },
        { azimuth: 225, horizonElevationDeg: 1.0 },
        { azimuth: 270, horizonElevationDeg: 0.9 },
        { azimuth: 315, horizonElevationDeg: 0.7 },
        { azimuth: 360, horizonElevationDeg: 0.8 },
      ],
    },
  },
  {
    id: 'haworth-crater-psr',
    name: 'Haworth Crater Interior (Deep PSR)',
    description: 'Cryogenic crater interior permanently shielded from direct solar illumination. Prime scientific target for volatile concentration.',
    region: 'South Pole' as const,
    latitude: -87.42,
    longitude: -5.50,
    elevationMeters: -3200,
    scientificSignificance: 'Permanent thermal cold trap with temperatures down to 38 Kelvin (-235°C). Highest theoretical concentration of water ice and volatile species.',
    artemisCandidateRank: 5,
    terrain: {
      elevationMeters: -3200,
      slopeDegrees: 14.5,
      roughnessMeters: 1.80,
      isPermanentShadowRegion: true,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 14.2 },
        { azimuth: 45, horizonElevationDeg: 15.8 },
        { azimuth: 90, horizonElevationDeg: 16.5 },
        { azimuth: 135, horizonElevationDeg: 17.1 },
        { azimuth: 180, horizonElevationDeg: 15.0 },
        { azimuth: 225, horizonElevationDeg: 13.9 },
        { azimuth: 270, horizonElevationDeg: 14.8 },
        { azimuth: 315, horizonElevationDeg: 15.2 },
        { azimuth: 360, horizonElevationDeg: 14.2 },
      ],
    },
  },
  {
    id: 'amundsen-rim',
    name: 'Amundsen Crater Rim',
    description: 'Elevated northern terrace of Amundsen crater. Provides flat landing aprons with interspersed view of the Earth.',
    region: 'South Pole' as const,
    latitude: -84.44,
    longitude: 82.80,
    elevationMeters: 2100,
    scientificSignificance: 'Offers transition between South Pole-Aitken basin impact melt sheets and central peak rebound geology.',
    artemisCandidateRank: 6,
    terrain: {
      elevationMeters: 2100,
      slopeDegrees: 4.1,
      roughnessMeters: 0.75,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 1.2 },
        { azimuth: 45, horizonElevationDeg: 1.8 },
        { azimuth: 90, horizonElevationDeg: 2.4 },
        { azimuth: 135, horizonElevationDeg: 2.1 },
        { azimuth: 180, horizonElevationDeg: 1.7 },
        { azimuth: 225, horizonElevationDeg: 1.3 },
        { azimuth: 270, horizonElevationDeg: 1.0 },
        { azimuth: 315, horizonElevationDeg: 1.1 },
        { azimuth: 360, horizonElevationDeg: 1.2 },
      ],
    },
  },
  {
    id: 'apollo-11-tranquility',
    name: 'Apollo 11 - Tranquility Base (Reference)',
    description: 'Historical equatorial baseline site where Apollo 11 Lunar Module Eagle touched down on July 20, 1969.',
    region: 'Equatorial' as const,
    latitude: 0.674,
    longitude: 23.473,
    elevationMeters: -1450,
    scientificSignificance: 'Benchmark equatorial mare site with standard 14-day lunar day / 14-day lunar night cycle and high Earth elevation (~65° overhead).',
    artemisCandidateRank: undefined,
    terrain: {
      elevationMeters: -1450,
      slopeDegrees: 2.1,
      roughnessMeters: 0.40,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 0.3 },
        { azimuth: 90, horizonElevationDeg: 0.3 },
        { azimuth: 180, horizonElevationDeg: 0.3 },
        { azimuth: 270, horizonElevationDeg: 0.3 },
        { azimuth: 360, horizonElevationDeg: 0.3 },
      ],
    },
  },
  {
    id: 'faustini-rim',
    name: 'Faustini Crater Rim',
    description: 'Elevated highland terrace adjacent to Faustini crater with high solar exposure and direct line of sight to South Pole peaks.',
    region: 'South Pole' as const,
    latitude: -87.10,
    longitude: 77.00,
    elevationMeters: 2300,
    scientificSignificance: 'NASA Artemis candidate region offering access to volatile-rich cold traps while preserving extended solar array illumination.',
    artemisCandidateRank: 7,
    terrain: {
      elevationMeters: 2300,
      slopeDegrees: 5.2,
      roughnessMeters: 0.88,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 1.4 },
        { azimuth: 90, horizonElevationDeg: 2.1 },
        { azimuth: 180, horizonElevationDeg: 1.6 },
        { azimuth: 270, horizonElevationDeg: 1.1 },
        { azimuth: 360, horizonElevationDeg: 1.4 },
      ],
    },
  },
  {
    id: 'connecting-ridge-ext',
    name: 'Connecting Ridge Extension',
    description: 'Southwestern extension of the Shackleton massif system towards de Gerlache crater.',
    region: 'South Pole' as const,
    latitude: -89.58,
    longitude: -156.00,
    elevationMeters: 1400,
    scientificSignificance: 'Continuous solar illumination exceeding 82% over lunar summer; crucial Artemis traverse crossroads.',
    artemisCandidateRank: 8,
    terrain: {
      elevationMeters: 1400,
      slopeDegrees: 6.8,
      roughnessMeters: 0.92,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 1.9 },
        { azimuth: 90, horizonElevationDeg: 2.6 },
        { azimuth: 180, horizonElevationDeg: 2.1 },
        { azimuth: 270, horizonElevationDeg: 1.5 },
        { azimuth: 360, horizonElevationDeg: 1.9 },
      ],
    },
  },
  {
    id: 'apollo-15-hadley',
    name: 'Apollo 15 - Hadley Rille (Reference)',
    description: 'Historic Apollo 15 exploration site at the base of the Apennine Mountains bordering Mare Imbrium.',
    region: 'Near Side' as const,
    latitude: 26.132,
    longitude: 3.634,
    elevationMeters: -1810,
    scientificSignificance: 'Benchmark volcanic sinuous rille and highland massif sampling site with high Earth visibility.',
    artemisCandidateRank: undefined,
    terrain: {
      elevationMeters: -1810,
      slopeDegrees: 3.5,
      roughnessMeters: 0.50,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 2.5 },
        { azimuth: 90, horizonElevationDeg: 6.8 },
        { azimuth: 180, horizonElevationDeg: 3.1 },
        { azimuth: 270, horizonElevationDeg: 0.4 },
        { azimuth: 360, horizonElevationDeg: 2.5 },
      ],
    },
  },
  {
    id: 'apollo-17-taurus',
    name: 'Apollo 17 - Taurus-Littrow (Reference)',
    description: 'Final Apollo landing site in a narrow valley bordered by the North and South massifs.',
    region: 'Near Side' as const,
    latitude: 20.191,
    longitude: 30.772,
    elevationMeters: -2530,
    scientificSignificance: 'Discovery site of orange volcanic pyroclastic glass beads; reference benchmark for valley terrain masks.',
    artemisCandidateRank: undefined,
    terrain: {
      elevationMeters: -2530,
      slopeDegrees: 4.2,
      roughnessMeters: 0.62,
      isPermanentShadowRegion: false,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: 7.2 },
        { azimuth: 90, horizonElevationDeg: 5.4 },
        { azimuth: 180, horizonElevationDeg: 8.6 },
        { azimuth: 270, horizonElevationDeg: 6.1 },
        { azimuth: 360, horizonElevationDeg: 7.2 },
      ],
    },
  },
];

/**
 * Initializes and evaluates a candidate site for a specific date and relay state
 */
export function evaluateCandidateSite(
  rawSite: RawCandidateSite,
  date: Date,
  relayEnabled: boolean = true
): CandidateLandingSite {
  const sunlight = analyzeSiteSunlight(rawSite.latitude, rawSite.longitude, rawSite.terrain, date);
  const earthVisibility = analyzeEarthVisibility(rawSite.latitude, rawSite.longitude, rawSite.terrain, date);
  const communication = analyzeCommunication(
    rawSite.latitude,
    rawSite.longitude,
    rawSite.terrain,
    date,
    relayEnabled
  );

  const isCustom = Boolean(rawSite.isCustom);
  const isElevationUnavailable = isCustom && (isNaN(rawSite.elevationMeters) || rawSite.elevationMeters === null || rawSite.elevationMeters === undefined);
  const isSlopeUnavailable = isCustom && (isNaN(rawSite.terrain?.slopeDegrees) || rawSite.terrain?.slopeDegrees === null || rawSite.terrain?.slopeDegrees === undefined);

  return {
    ...rawSite,
    terrain: {
      ...rawSite.terrain,
      dataSource: isCustom
        ? 'User-provided (not live DEM sampled)'
        : 'Reference benchmark (not live DEM sampled; literature: NASA/USGS studies)',
      resolution: isCustom
        ? 'User-entered value'
        : 'Predefined benchmark value (no live raster sampled)',
      isUserProvided: isCustom,
      isSlopeUnavailable,
    },
    sunlight,
    earthVisibility,
    communication,
    dataSource: isCustom
      ? 'User-provided (not live DEM sampled)'
      : 'Reference benchmark (not live DEM sampled; literature: NASA/USGS studies)',
    resolution: isCustom
      ? 'User-entered value'
      : 'Predefined benchmark value (no live raster sampled)',
    coordinateFrame: 'IAU 2015 Mean Earth/Polar Axis (ME)',
    datum: 'Lunar Reference Sphere R = 1,737.4 km',
    elevationStatus: isElevationUnavailable
      ? 'unavailable'
      : isCustom
      ? 'user-provided'
      : 'benchmark',
    quickmapUrl: getQuickMapCoordinatesUrl(rawSite.latitude, rawSite.longitude),
    trekUrl: getMoonTrekCoordinatesUrl(rawSite.latitude, rawSite.longitude),
  };
}

/**
 * Creates and evaluates a custom user-defined lunar landing location
 */
export function createCustomCandidateSite(
  name: string,
  latitude: number,
  longitude: number,
  elevationMeters: number,
  slopeDegrees: number,
  date: Date,
  relayEnabled: boolean = true
): CandidateLandingSite {
  const isSouthPole = latitude <= -75.0;
  const isPSR = latitude <= -85.0 && elevationMeters < -2000;

  // Generate synthetic crater rim mask based on elevation and region
  const avgRimDeg = isPSR ? 12.0 : isSouthPole ? Math.max(0.8, 3.5 - elevationMeters / 1500) : 0.5;

  const raw = {
    id: `custom-${Date.now()}`,
    name: name.trim() || `Site (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
    description: `User-defined candidate exploration coordinate in the lunar ${isSouthPole ? 'South Polar' : 'Surface'} domain.`,
    region: (isSouthPole ? 'South Pole' : 'Near Side') as any,
    latitude,
    longitude,
    elevationMeters,
    scientificSignificance: 'Custom user exploration waypoint for landing feasibility analysis.',
    terrain: {
      elevationMeters,
      slopeDegrees,
      roughnessMeters: 0.9,
      isPermanentShadowRegion: isPSR,
      craterRimMask: [
        { azimuth: 0, horizonElevationDeg: avgRimDeg },
        { azimuth: 90, horizonElevationDeg: avgRimDeg * 1.1 },
        { azimuth: 180, horizonElevationDeg: avgRimDeg * 0.9 },
        { azimuth: 270, horizonElevationDeg: avgRimDeg },
        { azimuth: 360, horizonElevationDeg: avgRimDeg },
      ],
    },
    isCustom: true,
  };

  return evaluateCandidateSite(raw, date, relayEnabled);
}
