// LunarSight - NASA JPL Horizons Live API Verification Script
// Queries live NASA Horizons API for a short date range and verifies genuine lunar state vectors.
// NOTE: This live script requires an active internet connection. Offline unit tests are in test/lunarTrajectoryService.test.ts.

import { fetchLunarTrajectory } from '../src/lib/astronomy/lunarTrajectoryService.ts';

async function verifyLiveHorizonsApi() {
  console.log('================================================================');
  console.log('NASA JPL Horizons Live Ephemeris Verification');
  console.log('Target: Moon (301) | Center: Earth Geocenter (500@399) | Frame: ICRF');
  console.log('================================================================');

  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16);
  const stopTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16);

  console.log(`Querying time window: ${startTime} -> ${stopTime} (Step: 1h)...`);

  const t0 = performance.now();
  let points;
  try {
    points = await fetchLunarTrajectory({
      startTime,
      stopTime,
      stepSize: '1h',
      timeoutMs: 20000,
    });
  } catch (error: any) {
    console.error('LIVE API VERIFICATION FAILED:');
    console.error(error.message);
    process.exit(1);
  }

  const durationMs = performance.now() - t0;
  console.log(`Received ${points.length} ephemeris state points in ${durationMs.toFixed(1)}ms.\n`);

  if (points.length === 0) {
    console.error('ERROR: No trajectory points were returned.');
    process.exit(1);
  }

  console.log('--------------------------------------------------------------------------------------------------------------------');
  console.log('| Time (TDB)                    | X (km)       | Y (km)       | Z (km)       | Range (km)   | Vel (km/s)           |');
  console.log('--------------------------------------------------------------------------------------------------------------------');

  for (const pt of points) {
    const range = pt.rangeKm ?? Math.hypot(pt.x, pt.y, pt.z);
    const speed = pt.vx !== undefined && pt.vy !== undefined && pt.vz !== undefined
      ? Math.hypot(pt.vx, pt.vy, pt.vz).toFixed(4)
      : 'N/A';

    console.log(
      `| ${pt.time.padEnd(29)} | ` +
      `${pt.x.toFixed(1).padStart(12)} | ` +
      `${pt.y.toFixed(1).padStart(12)} | ` +
      `${pt.z.toFixed(1).padStart(12)} | ` +
      `${range.toFixed(1).padStart(12)} | ` +
      `${speed.padStart(20)} |`
    );

    // Astronomical Sanity Checks:
    // Earth-Moon distance ranges between ~356,400 km (perigee) and ~406,700 km (apogee).
    if (range < 350000 || range > 420000) {
      console.error(`VALIDATION FAILURE: Distance ${range} km is outside realistic Earth-Moon bounds!`);
      process.exit(1);
    }
  }

  console.log('--------------------------------------------------------------------------------------------------------------------');
  console.log('SUCCESS: All points parsed with valid ICRF coordinates and physically consistent Earth-Moon distances.');
}

verifyLiveHorizonsApi().catch(err => {
  console.error('Unexpected error during verification:', err);
  process.exit(1);
});
