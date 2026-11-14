// LunarSight - Earth Visibility & Local Horizon Engine
// Calculates apparent Earth position, libration dynamics, and terrain occultation.

import { EarthVisibilityAnalysis, TerrainProfile } from '@/types/mission';
import { LUNAR_CONSTANTS } from '@/types/astronomy';
import { degToRad, radToDeg, normalizeAngle360 } from './coordinates';
import { calculateLunarEphemeris, getEarthPhaseDescription } from './ephemeris';
import { getCraterRimHorizonElevation } from './illumination';

/**
 * Calculates topocentric Earth elevation and azimuth for a given lunar location (lat, lon)
 * taking libration (subEarthLat, subEarthLon) into account.
 */
export function calculateEarthPosition(
  lat: number,
  lon: number,
  subEarthLat: number,
  subEarthLon: number,
  distanceKm: number = LUNAR_CONSTANTS.MEAN_EARTH_MOON_DIST_KM
): { elevationDeg: number; azimuthDeg: number } {
  const phi = degToRad(lat);
  const beta = degToRad(subEarthLat);
  const deltaLambda = degToRad(subEarthLon - lon);

  // Angular distance theta from the landing site to the sub-Earth point on lunar sphere
  const cosTheta = Math.sin(phi) * Math.sin(beta) + Math.cos(phi) * Math.cos(beta) * Math.cos(deltaLambda);
  const thetaRad = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  const thetaDeg = radToDeg(thetaRad);

  // Geocentric apparent elevation: 90 - theta
  // Topocentric parallax correction due to lunar finite radius (R_moon / D_earth_moon ~ 1737.4 / 384400 ~ 0.0045 rad ~ 0.26 deg)
  const parallax = radToDeg(Math.asin((LUNAR_CONSTANTS.MEAN_RADIUS_KM / distanceKm) * Math.sin(thetaRad)));
  const elevationDeg = 90.0 - thetaDeg - parallax;

  // Bearing / Azimuth towards Earth from local landing site
  const y = Math.sin(deltaLambda) * Math.cos(beta);
  const x = Math.cos(phi) * Math.sin(beta) - Math.sin(phi) * Math.cos(beta) * Math.cos(deltaLambda);
  let azimuthDeg = normalizeAngle360(radToDeg(Math.atan2(y, x)));

  // For high southern latitudes (South Pole):
  // The sub-Earth point is near (0, 0). From Lat -85 to -90, Earth azimuth points roughly towards 0 deg (lunar north)
  if (lat < -85.0) {
    azimuthDeg = normalizeAngle360(360.0 - lon + subEarthLon);
  }

  return { elevationDeg, azimuthDeg };
}

/**
 * Complete instantaneous Earth visibility analysis
 */
export function analyzeEarthVisibility(
  lat: number,
  lon: number,
  terrain: TerrainProfile,
  date: Date
): EarthVisibilityAnalysis {
  const ephemeris = calculateLunarEphemeris(date);
  const { elevationDeg, azimuthDeg } = calculateEarthPosition(
    lat,
    lon,
    ephemeris.subEarthLat,
    ephemeris.subEarthLon,
    ephemeris.earthMoonDistanceKm
  );

  const isAboveGeometricHorizon = elevationDeg > 0.0;
  
  // Permanent Shadow Regions or crater interiors may have high crater rims
  const rimElevationDeg = getCraterRimHorizonElevation(azimuthDeg, terrain.craterRimMask);
  
  // Earth is blocked by terrain if it is below the rim mask in that direction
  const isBlockedByTerrain = isAboveGeometricHorizon && elevationDeg <= rimElevationDeg;
  const hasDirectLineOfSight = isAboveGeometricHorizon && !isBlockedByTerrain;

  const { phase, fraction } = getEarthPhaseDescription(ephemeris.sunEarthMoonPhaseAngleDeg);

  // Apparent angular diameter of Earth as seen from Moon:
  // 2 * asin(R_earth / Distance) ~ 2 * asin(6378 / 384400) ~ 1.90 degrees (nearly 4x wider than Moon appears from Earth!)
  const apparentEarthDiameter = 
    radToDeg(2.0 * Math.asin(6378.137 / ephemeris.earthMoonDistanceKm));

  return {
    earthAzimuthDeg: Math.round(azimuthDeg * 10) / 10,
    earthElevationDeg: Math.round(elevationDeg * 100) / 100,
    librationLonDeg: Math.round(ephemeris.subEarthLon * 100) / 100,
    librationLatDeg: Math.round(ephemeris.subEarthLat * 100) / 100,
    isAboveGeometricHorizon,
    isBlockedByTerrain,
    hasDirectLineOfSight,
    apparentEarthAngularDiameterDeg: Math.round(apparentEarthDiameter * 100) / 100,
    earthPhase: phase,
    phaseFraction: Math.round(fraction * 100) / 100,
  };
}

export interface HorizonProfilePoint {
  azimuth: number; // 0 to 360 deg
  rimElevationDeg: number;
  label?: string;
}

/**
 * Generates a full 360-degree terrain horizon mask for radar sky plot visualization
 */
export function generateHorizonProfile(terrain: TerrainProfile): HorizonProfilePoint[] {
  const profile: HorizonProfilePoint[] = [];
  for (let az = 0; az < 360; az += 5) {
    const elev = getCraterRimHorizonElevation(az, terrain.craterRimMask);
    profile.push({
      azimuth: az,
      rimElevationDeg: Math.round(elev * 10) / 10,
    });
  }
  return profile;
}
