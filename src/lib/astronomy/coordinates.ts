// LunarSight - Coordinate and Geometric Utilities
import { SelenographicCoordinate, HorizonCoordinate, LUNAR_CONSTANTS } from '@/types/astronomy';

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

export function radToDeg(rad: number): number {
  return (rad * 180.0) / Math.PI;
}

export function normalizeAngle360(deg: number): number {
  let angle = deg % 360.0;
  if (angle < 0) angle += 360.0;
  return angle;
}

export function normalizeAngle180(deg: number): number {
  let angle = deg % 360.0;
  if (angle > 180.0) angle -= 360.0;
  if (angle < -180.0) angle += 360.0;
  return angle;
}

/**
 * Calculates Great Circle distance between two points on the Moon in kilometers.
 * Uses the Haversine formula with mean lunar radius (1737.4 km).
 */
export function lunarGreatCircleDistanceKm(
  p1: SelenographicCoordinate,
  p2: SelenographicCoordinate
): number {
  const phi1 = degToRad(p1.lat);
  const phi2 = degToRad(p2.lat);
  const deltaPhi = degToRad(p2.lat - p1.lat);
  const deltaLambda = degToRad(p2.lon - p1.lon);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return LUNAR_CONSTANTS.MEAN_RADIUS_KM * c;
}

/**
 * Calculates initial azimuth bearing (0-360 deg, 0 = North, 90 = East) from point 1 to point 2
 */
export function lunarBearingDeg(
  from: SelenographicCoordinate,
  to: SelenographicCoordinate
): number {
  const phi1 = degToRad(from.lat);
  const phi2 = degToRad(to.lat);
  const deltaLambda = degToRad(to.lon - from.lon);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return normalizeAngle360(radToDeg(theta));
}

/**
 * Converts Lunar South Pole coordinates (Lat <= -60 deg) to Polar Stereographic 2D plane (x, y)
 * Center at South Pole (Lat = -90), radius normalized to [0, 1] at latitude boundary (-75 deg)
 */
export function southPoleToStereographic(
  lat: number,
  lon: number,
  boundingLat: number = -75.0
): { x: number; y: number; r: number } {
  // Co-latitude in degrees: 0 at South Pole (-90), 15 at -75 deg, 30 at -60 deg
  const colat = Math.max(0, 90.0 + lat);
  const maxColat = 90.0 + boundingLat;
  const normalizedR = colat / maxColat; // 0.0 at South Pole, 1.0 at bounding edge

  // Polar angle (standard polar projection orientation: 0 deg lon points up/northwards on map)
  const thetaRad = degToRad(lon - 90);

  return {
    x: normalizedR * Math.cos(thetaRad),
    y: normalizedR * Math.sin(thetaRad),
    r: normalizedR,
  };
}

/**
 * Inverse Polar Stereographic projection: (x, y) back to (lat, lon)
 */
export function stereographicToSouthPole(
  x: number,
  y: number,
  boundingLat: number = -75.0
): { lat: number; lon: number } {
  const r = Math.sqrt(x * x + y * y);
  const maxColat = 90.0 + boundingLat;
  const colat = r * maxColat;
  const lat = Math.max(-90, Math.min(-60, -90 + colat));

  const thetaRad = Math.atan2(y, x);
  let lon = radToDeg(thetaRad) + 90.0;
  lon = normalizeAngle180(lon);

  return { lat, lon };
}
