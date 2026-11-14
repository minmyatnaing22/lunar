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

  // Normalize target azimuth to 0-360
  const normAz = normalizeAngle360(azimuthDeg);

  // Find the two nearest azimuth points in the mask
  let lower = rimMask[0];
  let upper = rimMask[rimMask.length - 1];

  for (let i = 0; i < rimMask.length; i++) {
    if (rimMask[i].azimuth <= normAz) {
      lower = rimMask[i];
    }
    if (rimMask[i].azimuth >= normAz) {
      upper = rimMask[i];
      break;
    }
  }

  if (lower.azimuth === upper.azimuth) {
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
