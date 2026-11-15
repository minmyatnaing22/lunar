// LunarSight - Solar Elevation & Illumination Simulator Engine
// Complies with NASA LRO LOLA Solar Illumination Maps standards and IAU celestial mechanics.

import { SunlightAnalysis, TerrainProfile } from '@/types/mission';
import { LUNAR_CONSTANTS } from '@/types/astronomy';
import { degToRad, radToDeg, normalizeAngle360 } from './coordinates';
import { calculateLunarEphemeris } from './ephemeris';

/**
 * Computes the solar elevation and azimuth angles at a lunar surface location (lat, lon)
 * for a given sub-solar point (subSolarLat, subSolarLon).
 */
export function calculateSolarPosition(
  lat: number,
  lon: number,
  subSolarLat: number,
  subSolarLon: number
): { elevationDeg: number; azimuthDeg: number } {
  const phi = degToRad(lat);
  const delta = degToRad(subSolarLat);
  const hourAngle = degToRad(lon - subSolarLon);

  // Solar elevation angle above mathematical horizontal plane:
  // sin(h) = sin(phi)*sin(delta) + cos(phi)*cos(delta)*cos(H)
  const sinH = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const elevationDeg = radToDeg(Math.asin(Math.max(-1, Math.min(1, sinH))));

  // Solar azimuth (0 = North, 90 = East, 180 = South, 270 = West):
  const y = Math.sin(hourAngle);
  const x = Math.cos(phi) * Math.tan(delta) - Math.sin(phi) * Math.cos(hourAngle);
  let azimuthDeg = normalizeAngle360(radToDeg(Math.atan2(y, x)));

  // For the South Pole region (phi < 0), invert coordinate system convention to local topocentric horizon:
  // where North faces the equator / Earthward direction.
  if (lat < -85.0) {
    azimuthDeg = normalizeAngle360(lon - subSolarLon + 180.0);
  }

  return { elevationDeg, azimuthDeg };
}

/**
 * Checks whether the Sun is occluded by local crater rim topography at the given azimuth.
 * Interpolates the terrain horizon profile.
 */
export function getCraterRimHorizonElevation(
  azimuthDeg: number,
  rimMask: TerrainProfile['craterRimMask']
): number {
  if (!rimMask || rimMask.length === 0) return 0.0;
  if (rimMask.length === 1) return rimMask[0].horizonElevationDeg;

  // Normalize target azimuth to [0, 360)
  const normAz = normalizeAngle360(azimuthDeg);

  // Exact match check
  for (let i = 0; i < rimMask.length; i++) {
    if (rimMask[i].azimuth === normAz) {
      return rimMask[i].horizonElevationDeg;
    }
  }

  // Find two adjacent points spanning normAz
  let lower = rimMask[0];
  let upper = rimMask[rimMask.length - 1];
  let found = false;

  for (let i = 0; i < rimMask.length - 1; i++) {
    if (rimMask[i].azimuth <= normAz && rimMask[i + 1].azimuth >= normAz) {
      lower = rimMask[i];
      upper = rimMask[i + 1];
      found = true;
      break;
    }
  }

  // Wrap-around case: normAz exceeds the highest sample or precedes the lowest sample
  if (!found) {
    if (normAz > rimMask[rimMask.length - 1].azimuth) {
      lower = rimMask[rimMask.length - 1];
      upper = { azimuth: rimMask[0].azimuth + 360, horizonElevationDeg: rimMask[0].horizonElevationDeg };
    } else if (normAz < rimMask[0].azimuth) {
      lower = { azimuth: rimMask[rimMask.length - 1].azimuth - 360, horizonElevationDeg: rimMask[rimMask.length - 1].horizonElevationDeg };
      upper = rimMask[0];
    }
  }

  if (upper.azimuth === lower.azimuth) {
    return lower.horizonElevationDeg;
  }

  // Linear interpolation
  const fraction = (normAz - lower.azimuth) / (upper.azimuth - lower.azimuth);
  return lower.horizonElevationDeg + fraction * (upper.horizonElevationDeg - lower.horizonElevationDeg);
}

/**
 * Complete instantaneous sunlight analysis for a candidate site at a specific date
 */
export function analyzeSiteSunlight(
  lat: number,
  lon: number,
  terrain: TerrainProfile,
  date: Date
): SunlightAnalysis {
  const ephemeris = calculateLunarEphemeris(date);
  const { elevationDeg, azimuthDeg } = calculateSolarPosition(
    lat,
    lon,
    ephemeris.subSolarLat,
    ephemeris.subSolarLon
  );

  const isSunAboveGeometricHorizon = elevationDeg > 0.0;
  
  // Permanent Shadow Regions (PSRs) never receive direct sunlight regardless of geometry
  if (terrain.isPermanentShadowRegion) {
    return {
      subSolarLongitude: ephemeris.subSolarLon,
      subSolarLatitude: ephemeris.subSolarLat,
      solarElevationDeg: elevationDeg,
      solarAzimuthDeg: azimuthDeg,
      isSunAboveGeometricHorizon,
      isTerrainOccluded: true,
      isIlluminated: false,
      solarFluxWm2: 0.0,
      predictedIlluminationPercent: 0.0,
      totalSunlitHours: 0,
      longestContinuousDarkHours: 708, // Full lunar synodic month in darkness (~29.5 days)
    };
  }

  // Check terrain horizon occlusion
  const rimElevationDeg = getCraterRimHorizonElevation(azimuthDeg, terrain.craterRimMask);
  const isTerrainOccluded = elevationDeg <= rimElevationDeg;
  const isIlluminated = isSunAboveGeometricHorizon && !isTerrainOccluded;

  // Solar flux calculation (taking grazing angle of incidence into account if illuminated)
  // Solar disk diameter is ~0.53 deg. When grazing the rim, partial penumbra exists.
  let flux = 0.0;
  if (isIlluminated) {
    const effectiveAngle = Math.max(0, elevationDeg - rimElevationDeg);
    // On a vertically oriented solar panel facing the Sun (standard for polar landers):
    const incidenceFactor = Math.min(1.0, Math.cos(degToRad(Math.max(0, effectiveAngle))));
    flux = LUNAR_CONSTANTS.SOLAR_IRRADIANCE_WM2 * Math.max(0.2, incidenceFactor);
  }

  // Default initial estimation metrics (over a 29.5-day synodic cycle)
  const isPolar = lat < -80.0 || lat > 80.0;
  let predictedIllumination = 50.0; // Equatorial sites get ~50%
  if (isPolar) {
    // High ridges (elev > 1000m) at South Pole achieve 70-92% peak illumination
    if (terrain.elevationMeters > 3000) predictedIllumination = 88.0;
    else if (terrain.elevationMeters > 1000) predictedIllumination = 74.0;
    else if (terrain.elevationMeters < -1000) predictedIllumination = 12.0;
    else predictedIllumination = 55.0;
  }

  const totalSunlit = Math.round((predictedIllumination / 100.0) * (29.53 * 24));
  const longestDark = Math.round(((100.0 - predictedIllumination) / 100.0) * (29.53 * 24));

  return {
    subSolarLongitude: ephemeris.subSolarLon,
    subSolarLatitude: ephemeris.subSolarLat,
    solarElevationDeg: Math.round(elevationDeg * 100) / 100,
    solarAzimuthDeg: Math.round(azimuthDeg * 10) / 10,
    isSunAboveGeometricHorizon,
    isTerrainOccluded,
    isIlluminated,
    solarFluxWm2: Math.round(flux),
    predictedIlluminationPercent: predictedIllumination,
    totalSunlitHours: totalSunlit,
    longestContinuousDarkHours: longestDark,
  };
}

export interface IlluminationTimelinePoint {
  timeStr: string;
  timestamp: number;
  solarElevation: number;
  rimElevation: number;
  isIlluminated: boolean;
  solarFlux: number;
}

/**
 * Generates an hourly illumination timeline for charts over a chosen mission duration
 */
export function generateIlluminationTimeline(
  lat: number,
  lon: number,
  terrain: TerrainProfile,
  startDate: Date,
  durationDays: number = 14,
  stepHours: number = 6
): IlluminationTimelinePoint[] {
  const points: IlluminationTimelinePoint[] = [];
  const totalHours = durationDays * 24;

  for (let h = 0; h <= totalHours; h += stepHours) {
    const time = new Date(startDate.getTime() + h * 3600 * 1000);
    const ephemeris = calculateLunarEphemeris(time);
    const { elevationDeg, azimuthDeg } = calculateSolarPosition(
      lat,
      lon,
      ephemeris.subSolarLat,
      ephemeris.subSolarLon
    );

    const rimElevation = terrain.isPermanentShadowRegion
      ? 15.0
      : getCraterRimHorizonElevation(azimuthDeg, terrain.craterRimMask);

    const isIlluminated =
      !terrain.isPermanentShadowRegion &&
      elevationDeg > 0 &&
      elevationDeg > rimElevation;

    const flux = isIlluminated ? LUNAR_CONSTANTS.SOLAR_IRRADIANCE_WM2 : 0;

    // Format human-friendly time string (e.g., "Nov 14 12:00")
    const timeStr = time.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    points.push({
      timeStr,
      timestamp: time.getTime(),
      solarElevation: Math.round(elevationDeg * 100) / 100,
      rimElevation: Math.round(rimElevation * 100) / 100,
      isIlluminated,
      solarFlux: Math.round(flux),
    });
  }

  return points;
}

export interface SunlightTransitionForecast {
  isCurrentlyIlluminated: boolean;
  isPermanentShadow: boolean;
  currentElevationDeg: number;
  rimElevationDeg: number;
  hoursToNextTransition: number | null;
  nextTransitionDate: Date | null;
  nextTransitionType: 'shadow' | 'sunlight' | 'none';
  estimatedSunlightSpanHours: number;
  assumptions: string[];
}

/**
 * Computes forward-projected sunlight transitions (time until shadow / sunlight)
 * by evaluating astronomical ephemeris and terrain mask over the lunar diurnal cycle.
 */
export function calculateSunlightTransitionForecast(
  lat: number,
  lon: number,
  terrain: TerrainProfile,
  currentDate: Date
): SunlightTransitionForecast {
  const assumptions = [
    'Lunar synodic rotation period: 29.53059 Earth days (~708.7 hours).',
    'Terrain horizon occlusion estimated using an approximate 8-point interpolated horizon mask (reference benchmark).',
    'Atmospheric refraction is zero in hard lunar vacuum.',
  ];

  if (terrain.isPermanentShadowRegion) {
    return {
      isCurrentlyIlluminated: false,
      isPermanentShadow: true,
      currentElevationDeg: -90,
      rimElevationDeg: 15.0,
      hoursToNextTransition: null,
      nextTransitionDate: null,
      nextTransitionType: 'none',
      estimatedSunlightSpanHours: 0,
      assumptions: [
        ...assumptions,
        'Site is located inside a crater interior permanently shielded from solar rays.',
      ],
    };
  }

  const currentAnalysis = analyzeSiteSunlight(lat, lon, terrain, currentDate);
  const isCurrentlyIlluminated = currentAnalysis.isIlluminated;
  const currentRim = getCraterRimHorizonElevation(currentAnalysis.solarAzimuthDeg, terrain.craterRimMask);

  // Search forward up to 720 hours (~30 days) with 0.5h resolution
  const maxSearchHours = 720;
  const step = 0.5;
  let hoursToTransition: number | null = null;
  let nextTransDate: Date | null = null;
  let sunlightSpanHours = 0;

  let transitioned = false;
  let transitionTime: number | null = null;

  for (let h = step; h <= maxSearchHours; h += step) {
    const t = new Date(currentDate.getTime() + h * 3600 * 1000);
    const eph = calculateLunarEphemeris(t);
    const { elevationDeg, azimuthDeg } = calculateSolarPosition(
      lat,
      lon,
      eph.subSolarLat,
      eph.subSolarLon
    );
    const rim = getCraterRimHorizonElevation(azimuthDeg, terrain.craterRimMask);
    const illum = elevationDeg > 0 && elevationDeg > rim;

    if (!transitioned && illum !== isCurrentlyIlluminated) {
      transitioned = true;
      hoursToTransition = h;
      nextTransDate = t;
      transitionTime = h;
      if (isCurrentlyIlluminated) {
        // If we were illuminated, we just found the end of the current sunlit period
        sunlightSpanHours = h;
        break;
      }
    } else if (transitioned && isCurrentlyIlluminated === false && transitionTime !== null) {
      // If we were in shadow, transitionTime was sunrise; now find when this sunrise ends (sunset)
      if (!illum) {
        sunlightSpanHours = h - transitionTime;
        break;
      }
    }
  }

  // Fallback estimation for polar peak ridges if continuous sunlight during high summer
  if (hoursToTransition === null) {
    if (isCurrentlyIlluminated) {
      sunlightSpanHours = 708;
      assumptions.push('Continuous polar summer illumination (>30 days uninterrupted sunlight).');
    } else {
      sunlightSpanHours = 0;
      assumptions.push('Extended polar winter darkness (>30 days continuous shadow).');
    }
  }

  return {
    isCurrentlyIlluminated,
    isPermanentShadow: false,
    currentElevationDeg: currentAnalysis.solarElevationDeg,
    rimElevationDeg: Math.round(currentRim * 100) / 100,
    hoursToNextTransition: hoursToTransition ? Math.round(hoursToTransition * 10) / 10 : null,
    nextTransitionDate: nextTransDate,
    nextTransitionType: transitioned ? (isCurrentlyIlluminated ? 'shadow' : 'sunlight') : 'none',
    estimatedSunlightSpanHours: Math.round(sunlightSpanHours * 10) / 10,
    assumptions,
  };
}
