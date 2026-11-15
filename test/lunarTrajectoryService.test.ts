// Unit tests for NASA JPL Horizons Lunar Trajectory Service
// Tests offline parsing, scientific notation, malformed rows, and error handling.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLunarTrajectory,
  fetchLunarTrajectory,
  calculateLunarSurfaceObservation,
  evaluateVisibilityStatus,
  interpolateCraterRimMask,
} from '../src/lib/astronomy/lunarTrajectoryService.ts';
import type { LunarTrajectoryPoint } from '../src/lib/astronomy/lunarTrajectoryService.ts';

// Sample realistic mocked NASA JPL Horizons response
const MOCK_HORIZONS_VALID_OUTPUT = `
*******************************************************************************
JPL/HORIZONS              Moon (301)                    2026-Nov-14 14:00:00
Target body name: Moon (301)                      {source: DE441}
Center body name: Earth (500)                     {source: DE441}
Center-site name: Geocentric
*******************************************************************************
Ephemeris / VECTORS
*******************************************************************************
            JDTDB,            Calendar Date (TDB),                      X,                      Y,                      Z,                     VX,                     VY,                     VZ,
**************************************************************************************************************************************************************************************************
$$SOE
2461358.500000000, A.D. 2026-Nov-14 00:00:00.0000,  9.237571683133267E+04, -3.522798425145108E+05, -1.785059081163798E+05,  9.396089047896418E-01,  1.763499252207867E-01,  1.453901748729857E-01,
2461358.541666667, A.D. 2026-Nov-14 01:00:00.0000,  9.575449541990670E+04, -3.516312329039085E+05, -1.779755284553070E+05,  9.374780621547805E-01,  1.839866189432711E-01,  1.492633676979348E-01,
2461358.583333333, A.D. 2026-Nov-14 02:00:00.0000,  9.912547076468526E+04, -3.509551544776837E+05, -1.774312251571896E+05,  9.352737911365427E-01,  1.916102963879344E-01,  1.531254870125109E-01,
$$EOE
*******************************************************************************
`;

describe('NASA JPL Horizons Lunar Trajectory Service', () => {
  describe('parseLunarTrajectory() - Valid Inputs', () => {
    it('correctly parses multiple trajectory points', () => {
      const points = parseLunarTrajectory(MOCK_HORIZONS_VALID_OUTPUT);

      assert.equal(points.length, 3, 'Should parse exactly 3 trajectory points');

      // Point 0 verification
      const p0 = points[0];
      assert.equal(p0.time, '2026-Nov-14 00:00:00.0000');
      assert.equal(p0.jdtdb, 2461358.5);
      assert.ok(Math.abs(p0.x - 92375.71683) < 0.01, 'X coordinate should match');
      assert.ok(Math.abs(p0.y - -352279.84251) < 0.01, 'Y coordinate should match');
      assert.ok(Math.abs(p0.z - -178505.90811) < 0.01, 'Z coordinate should match');
      assert.ok(p0.vx !== undefined && Math.abs(p0.vx - 0.9396) < 0.001);
      assert.ok(p0.vy !== undefined && Math.abs(p0.vy - 0.1763) < 0.001);
      assert.ok(p0.vz !== undefined && Math.abs(p0.vz - 0.1453) < 0.001);

      // Verify geocentric distance calculation
      assert.ok(p0.rangeKm !== undefined);
      const expectedRange = Math.sqrt(p0.x ** 2 + p0.y ** 2 + p0.z ** 2);
      assert.ok(Math.abs(p0.rangeKm - expectedRange) < 1e-4);
      // Realistic Earth-Moon geocentric distance is ~360,000 to ~405,000 km
      assert.ok(p0.rangeKm > 350000 && p0.rangeKm < 410000);
    });

    it('correctly handles scientific notation in coordinates and velocities', () => {
      const customPayload = `
$$SOE
2460000.5, 2026-Jan-01 00:00:00, 3.84400e+05, -1.23456E+04, 5.67890E+03, 1.050e-01, -2.500E-02, 3.000e-03,
$$EOE`;

      const points = parseLunarTrajectory(customPayload);
      assert.equal(points.length, 1);
      const p = points[0];

      assert.equal(p.x, 384400);
      assert.equal(p.y, -12345.6);
      assert.equal(p.z, 5678.9);
      assert.equal(p.vx, 0.105);
      assert.equal(p.vy, -0.025);
      assert.equal(p.vz, 0.003);
    });
  });

  describe('parseLunarTrajectory() - Error Handling & Edge Cases', () => {
    it('throws when $$SOE marker is missing', () => {
      const missingSoe = `
Calendar Date, X, Y, Z
2461358.5, 2026-Nov-14, 92375.7, -352279.8, -178505.9
$$EOE`;

      assert.throws(() => {
        parseLunarTrajectory(missingSoe);
      }, /Missing ephemeris markers/);
    });

    it('throws when $$EOE marker is missing', () => {
      const missingEoe = `
$$SOE
2461358.5, 2026-Nov-14, 92375.7, -352279.8, -178505.9`;

      assert.throws(() => {
        parseLunarTrajectory(missingEoe);
      }, /Missing ephemeris markers/);
    });

    it('throws when markers are in reversed order ($$EOE before $$SOE)', () => {
      const reversed = `
$$EOE
2461358.5, 2026-Nov-14, 92375.7, -352279.8, -178505.9
$$SOE`;

      assert.throws(() => {
        parseLunarTrajectory(reversed);
      }, /Malformed ephemeris block/);
    });

    it('throws on empty ephemeris block (no rows between markers)', () => {
      const emptyBlock = `
$$SOE

$$EOE`;

      assert.throws(() => {
        parseLunarTrajectory(emptyBlock);
      }, /Empty ephemeris block/);
    });

    it('throws on invalid non-numeric values in coordinate columns', () => {
      const corrupted = `
$$SOE
2461358.5, 2026-Nov-14, NOT_A_NUMBER, -352279.8, -178505.9, 0.939, 0.176, 0.145
$$EOE`;

      assert.throws(() => {
        parseLunarTrajectory(corrupted);
      }, /Invalid numeric coordinates/);
    });

    it('throws on malformed CSV rows with insufficient columns', () => {
      const malformed = `
$$SOE
2461358.5, 2026-Nov-14, 92375.7
$$EOE`;

      assert.throws(() => {
        parseLunarTrajectory(malformed);
      }, /Malformed CSV row/);
    });

    it('detects embedded NASA Horizons API error text', () => {
      const apiErrorText = `
DXREAD: requested IOBJ=   999999 is out of bounds, no action taken.
Record boundaries:
 IAU numbered asteroids:        1-  895910
`;

      assert.throws(() => {
        parseLunarTrajectory(apiErrorText);
      }, /NASA Horizons API error/);
    });
  });

  describe('fetchLunarTrajectory() - Input Validation & Cancellation', () => {
    it('rejects invalid date range when startTime is after stopTime without making network call', async () => {
      await assert.rejects(
        async () => {
          await fetchLunarTrajectory({
            startTime: '2026-11-15 00:00',
            stopTime: '2026-11-14 00:00',
          });
        },
        /Invalid date range: startTime/
      );
    });

    it('rejects empty startTime', async () => {
      await assert.rejects(
        async () => {
          await fetchLunarTrajectory({
            startTime: '',
            stopTime: '2026-11-14 00:00',
          });
        },
        /startTime must be specified/
      );
    });

    it('supports immediate request cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      controller.abort();

      await assert.rejects(
        async () => {
          await fetchLunarTrajectory({
            startTime: '2026-11-14 00:00',
            stopTime: '2026-11-14 06:00',
            signal: controller.signal,
          });
        },
        /request aborted/
      );
    });
  });

  describe('calculateLunarSurfaceObservation() - Topocentric Sun & Earth Positions', () => {
    it('computes realistic topocentric coordinates for Lunar South Pole (Shackleton)', () => {
      const testDate = new Date('2026-11-15T12:00:00Z');
      const obs = calculateLunarSurfaceObservation(-89.44, 141.0, testDate, 1250);

      // Verify coordinate metadata and frames
      assert.equal(obs.coordinateFrame, 'IAU 2015 Mean Earth/Polar Axis (ME) Topocentric');
      assert.equal(obs.timeSystem, 'UTC / TDB (approximate; ΔT omitted)');
      assert.equal(obs.observerLatitude, -89.44);
      assert.equal(obs.observerLongitude, 141.0);
      assert.equal(obs.observerElevationMeters, 1250);

      // Verify Sun parameters: At the south pole (-89.44°), apparent solar elevation is grazing (around ±1.54°)
      assert.ok(typeof obs.sun.elevationDeg === 'number');
      assert.ok(obs.sun.elevationDeg >= -2.0 && obs.sun.elevationDeg <= 2.5, `Sun elevation ${obs.sun.elevationDeg}° should be grazing at South Pole`);
      assert.ok(obs.sun.azimuthDeg >= 0 && obs.sun.azimuthDeg <= 360, 'Sun azimuth should be within 0-360 deg');
      assert.equal(obs.sun.calculationSource, 'In-Memory Analytical Ephemeris (DE440/DE421 Series)');

      // Verify Earth parameters: Earth distance should be realistic (~356,000 to 410,000 km)
      assert.ok(obs.earth.distanceKm > 350000 && obs.earth.distanceKm < 420000, `Earth distance ${obs.earth.distanceKm} km should be realistic`);
      assert.ok(obs.earth.lightTimeSeconds > 1.1 && obs.earth.lightTimeSeconds < 1.4, 'Light transit time should be ~1.2-1.4 seconds');
      assert.ok(obs.earth.azimuthDeg >= 0 && obs.earth.azimuthDeg <= 360, 'Earth azimuth should be within 0-360 deg');
      assert.ok(typeof obs.earth.elevationDeg === 'number');
      assert.ok(obs.earth.phaseFraction >= 0 && obs.earth.phaseFraction <= 1, 'Phase fraction should be between 0 and 1');
      assert.ok(['New Earth', 'Crescent', 'Quarter', 'Gibbous', 'Full Earth'].includes(obs.earth.phase));
      assert.equal(obs.earth.calculationSource, 'In-Memory Analytical Ephemeris (DE440/DE421 Series)');
    });

    it('computes realistic topocentric coordinates for Equatorial site (Apollo 11)', () => {
      const testDate = new Date('2026-07-20T20:17:00Z');
      const obs = calculateLunarSurfaceObservation(0.674, 23.473, testDate, -1450);

      // At near-side central equatorial longitude (~23°E), Earth should be high in the sky (> 50°)
      assert.ok(obs.earth.elevationDeg > 45, `Earth elevation ${obs.earth.elevationDeg}° should be high above equatorial near-side`);
      assert.equal(obs.earth.isAboveHorizon, true);
    });
  });

  describe('evaluateVisibilityStatus() - Earth Visibility Tri-State Boundary Logic', () => {
    it('categorizes Earth at exactly 0.0° elevation as geometrically below horizon', () => {
      const res = evaluateVisibilityStatus(0.0, 3.5);
      assert.equal(res.isAboveGeometricHorizon, false);
      assert.equal(res.isBlockedByTerrain, false);
      assert.equal(res.hasDirectLineOfSight, false);
      assert.equal(res.visibilityStatus, 'geometrically-below-horizon');
    });

    it('categorizes negative Earth elevation as geometrically below horizon regardless of rim mask', () => {
      // Even if rim elevation is negative (e.g. crater depression), Earth below 0° must remain below horizon
      const res1 = evaluateVisibilityStatus(-1.5, 2.0);
      assert.equal(res1.visibilityStatus, 'geometrically-below-horizon');
      assert.equal(res1.hasDirectLineOfSight, false);

      const res2 = evaluateVisibilityStatus(-0.5, -2.0);
      assert.equal(res2.visibilityStatus, 'geometrically-below-horizon');
      assert.equal(res2.hasDirectLineOfSight, false);
    });

    it('categorizes Earth above 0° but below or equal to terrain rim mask as terrain-obstructed', () => {
      // Elevation lower than rim mask
      const res1 = evaluateVisibilityStatus(1.5, 3.0);
      assert.equal(res1.isAboveGeometricHorizon, true);
      assert.equal(res1.isBlockedByTerrain, true);
      assert.equal(res1.hasDirectLineOfSight, false);
      assert.equal(res1.visibilityStatus, 'terrain-obstructed');

      // Exact boundary: elevation equal to rim mask
      const res2 = evaluateVisibilityStatus(2.5, 2.5);
      assert.equal(res2.isAboveGeometricHorizon, true);
      assert.equal(res2.isBlockedByTerrain, true);
      assert.equal(res2.hasDirectLineOfSight, false);
      assert.equal(res2.visibilityStatus, 'terrain-obstructed');
    });

    it('categorizes Earth strictly above both 0° and terrain rim mask as unobstructed-by-mask', () => {
      // Just above rim mask
      const res1 = evaluateVisibilityStatus(2.51, 2.5);
      assert.equal(res1.isAboveGeometricHorizon, true);
      assert.equal(res1.isBlockedByTerrain, false);
      assert.equal(res1.hasDirectLineOfSight, true);
      assert.equal(res1.visibilityStatus, 'unobstructed-by-mask');

      // High in the sky above flat horizon
      const res2 = evaluateVisibilityStatus(45.0, 0.0);
      assert.equal(res2.isAboveGeometricHorizon, true);
      assert.equal(res2.isBlockedByTerrain, false);
      assert.equal(res2.hasDirectLineOfSight, true);
      assert.equal(res2.visibilityStatus, 'unobstructed-by-mask');
    });
  });

  describe('interpolateCraterRimMask() - Azimuth Interpolation & Boundary Conditions', () => {
    const testMask = [
      { azimuth: 0, horizonElevationDeg: 2.0 },
      { azimuth: 90, horizonElevationDeg: 4.0 },
      { azimuth: 180, horizonElevationDeg: 1.0 },
      { azimuth: 270, horizonElevationDeg: 3.0 },
      { azimuth: 360, horizonElevationDeg: 2.0 },
    ];

    it('returns exact elevation for sample points', () => {
      assert.equal(interpolateCraterRimMask(0, testMask), 2.0);
      assert.equal(interpolateCraterRimMask(90, testMask), 4.0);
      assert.equal(interpolateCraterRimMask(180, testMask), 1.0);
      assert.equal(interpolateCraterRimMask(270, testMask), 3.0);
      assert.equal(interpolateCraterRimMask(360, testMask), 2.0);
    });

    it('linearly interpolates between sample azimuths', () => {
      // Midpoint between 0° (2.0) and 90° (4.0) is 45° -> 3.0°
      const mid1 = interpolateCraterRimMask(45, testMask);
      assert.equal(Math.round(mid1 * 100) / 100, 3.0);

      // 1/3 between 90° (4.0) and 180° (1.0) is 120° -> 4.0 - 1.0 = 3.0°
      const mid2 = interpolateCraterRimMask(120, testMask);
      assert.equal(Math.round(mid2 * 100) / 100, 3.0);
    });

    it('correctly normalizes negative azimuths and angles >= 360°', () => {
      // -90° is normalized to 270° -> 3.0°
      assert.equal(interpolateCraterRimMask(-90, testMask), 3.0);

      // 450° is normalized to 90° -> 4.0°
      assert.equal(interpolateCraterRimMask(450, testMask), 4.0);
    });

    it('handles masks without explicit 360° point via wrap-around to 0°', () => {
      const openMask = [
        { azimuth: 0, horizonElevationDeg: 2.0 },
        { azimuth: 90, horizonElevationDeg: 4.0 },
        { azimuth: 180, horizonElevationDeg: 1.0 },
        { azimuth: 270, horizonElevationDeg: 3.0 }, // No 360° entry
      ];

      // Azimuth 315° is halfway between 270° (3.0) and 360°/0° (2.0) -> 2.5°
      const wrapMid = interpolateCraterRimMask(315, openMask);
      assert.equal(Math.round(wrapMid * 100) / 100, 2.5);
    });

    it('returns 0.0 for empty mask', () => {
      assert.equal(interpolateCraterRimMask(45, []), 0.0);
    });
  });
});
