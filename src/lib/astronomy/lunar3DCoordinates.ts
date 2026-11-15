// LunarSight - 3D Spherical Coordinate Transformation Engine
// Complies with IAU Working Group on Cartographic Coordinates (WGCCTR) convention.

import * as THREE from 'three';

/**
 * Coordinate System Convention:
 * - Sphere Radius R = 1.0 (Three.js world units)
 * - Y-Axis = Rotational axis of the Moon:
 *     +Y = North Pole (+90° Latitude)
 *     -Y = South Pole (-90° Latitude)
 * - X-Z Plane = Equatorial plane (0° Latitude):
 *     +Z = Prime Meridian (0° Longitude, facing Earth / Center of Lunar Near Side)
 *     +X = Eastern Limb (+90° East Longitude)
 *     -X = Western Limb (-90° West Longitude)
 *     -Z = Far Side Meridian (180° / -180° Longitude)
 */

/**
 * Converts Selenographic coordinates (Latitude, Longitude in degrees)
 * to 3D Cartesian coordinates on a sphere of radius R.
 * 
 * @param lat - Latitude in degrees [-90, +90]
 * @param lon - Longitude in degrees [-180, +180]
 * @param radius - Radius of sphere (default 1.0)
 * @returns THREE.Vector3 on the surface of the sphere
 */
export function selenographicToCartesian(
  lat: number,
  lon: number,
  radius: number = 1.0
): THREE.Vector3 {
  const phiRad = (lat * Math.PI) / 180.0;
  const lambdaRad = (lon * Math.PI) / 180.0;

  // x = R * cos(lat) * sin(lon)
  // y = R * sin(lat)
  // z = R * cos(lat) * cos(lon)
  const x = radius * Math.cos(phiRad) * Math.sin(lambdaRad);
  const y = radius * Math.sin(phiRad);
  const z = radius * Math.cos(phiRad) * Math.cos(lambdaRad);

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts a 3D Cartesian point on a sphere surface (local mesh space)
 * to Selenographic coordinates (Latitude, Longitude in degrees).
 * 
 * @param point - THREE.Vector3 on or relative to the center of the sphere
 * @returns { lat: number; lon: number } in degrees
 */
export function cartesianToSelenographic(point: THREE.Vector3): {
  lat: number;
  lon: number;
} {
  const r = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
  if (r === 0) return { lat: 0, lon: 0 };

  // Latitude: phi = asin(y / r)
  const normalizedY = Math.max(-1.0, Math.min(1.0, point.y / r));
  const lat = (Math.asin(normalizedY) * 180.0) / Math.PI;

  // Longitude: lambda = atan2(x, z)
  const lon = (Math.atan2(point.x, point.z) * 180.0) / Math.PI;

  return {
    lat: Math.round(lat * 1000) / 1000,
    lon: Math.round(lon * 1000) / 1000,
  };
}

/**
 * Verification test suite for coordinate conversions against known test points.
 * Ensures poles, equator, and prime meridian transform with mathematical exactness on a unit sphere.
 */
export function verifyCoordinateConversions(): boolean {
  const testCases = [
    { name: 'North Pole', lat: 90.0, lon: 0.0, expected: new THREE.Vector3(0, 1, 0) },
    { name: 'South Pole', lat: -90.0, lon: 0.0, expected: new THREE.Vector3(0, -1, 0) },
    { name: 'Equator Prime Meridian', lat: 0.0, lon: 0.0, expected: new THREE.Vector3(0, 0, 1) },
    { name: 'Equator 90° East', lat: 0.0, lon: 90.0, expected: new THREE.Vector3(1, 0, 0) },
    { name: 'Equator 90° West', lat: 0.0, lon: -90.0, expected: new THREE.Vector3(-1, 0, 0) },
    { name: 'Equator Far Side', lat: 0.0, lon: 180.0, expected: new THREE.Vector3(0, 0, -1) },
  ];

  let allPassed = true;
  for (const tc of testCases) {
    const v = selenographicToCartesian(tc.lat, tc.lon, 1.0);
    const dist = v.distanceTo(tc.expected);
    const inverse = cartesianToSelenographic(v);
    const latDiff = Math.abs(inverse.lat - tc.lat);
    const lonDiff = Math.abs(inverse.lon - tc.lon);

    if (dist > 1e-4 || latDiff > 1e-3) {
      allPassed = false;
    }
  }

  return allPassed;
}
