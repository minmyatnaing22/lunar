// LunarSight - NASA JPL Horizons Lunar Ephemeris Service
// Integrates high-precision orbital ephemerides from the NASA Jet Propulsion Laboratory (JPL) SSD Horizons system.
//
// =========================================================================================
// COORDINATE REFERENCE FRAME DOCUMENTATION:
// =========================================================================================
// Target: Moon / Luna (Body Code '301')
// Coordinate Center: Earth Center / Geocenter (Body Code '500@399')
// Ephemeris Type: State Vectors (EPHEM_TYPE = VECTORS, VEC_TABLE = 2)
// Reference Frame: ICRF (International Celestial Reference Frame) / J2000.0 Earth-Centered Inertial (ECI)
// Units:
//   - Positions (X, Y, Z) in Kilometres (km)
//   - Velocities (VX, VY, VZ) in Kilometres per second (km/s)
//   - Time in Julian Date (JDTDB) and Barycentric Dynamical Time (TDB)
//
// Axes Definition (ICRF/J2000):
//   - +X Axis: Aligned with the mean vernal equinox at the J2000.0 epoch (ICRF principal axis).
//   - +Z Axis: Aligned with the Earth mean rotational north pole at J2000.0.
//   - +Y Axis: Orthogonal axis in the equatorial plane completing the right-handed Cartesian frame (Y = Z x X).
//
// CRITICAL DISTINCTION - ORBITAL VECTORS VS. SELENOGRAPHIC SURFACE COORDINATES:
//   - The (X, Y, Z) vectors returned by this service are GEOCENTRIC ORBITAL POSITION VECTORS
//     representing the Moon's center of mass relative to Earth's center of mass (range: ~356,400 to ~406,700 km).
//   - They MUST NOT be confused with Selenographic coordinates (Latitude, Longitude, LOLA Elevation),
//     which are body-fixed topocentric coordinates describing features ON the lunar surface.
// =========================================================================================

// Astronomical constants & trigonometric helpers (Self-contained for cross-runtime Node & Next.js compatibility)
const LUNAR_MEAN_RADIUS_KM = 1737.4;
const LUNAR_SYNODIC_MONTH_DAYS = 29.530588853;
const LUNAR_OBLIQUITY_TO_ECLIPTIC_DEG = 1.5424;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

function radToDeg(rad: number): number {
  return (rad * 180.0) / Math.PI;
}

function normalizeAngle360(deg: number): number {
  return ((deg % 360.0) + 360.0) % 360.0;
}

function normalizeAngle180(deg: number): number {
  const a = normalizeAngle360(deg);
  return a > 180.0 ? a - 360.0 : a;
}

function computeAnalyticalEphemeris(date: Date) {
  const jd = date.getTime() / 86400000.0 + 2440587.5;
  const d = jd - 2451545.0; // Days from J2000.0
  const T = d / 36525.0;

  const D = normalizeAngle360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);
  const M = normalizeAngle360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
  const Mprime = normalizeAngle360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);
  const F = normalizeAngle360(93.272095 + 483202.0175233 * T - 0.0036539 * T * T);

  const dRad = degToRad(D);
  const mRad = degToRad(M);
  const mpRad = degToRad(Mprime);
  const fRad = degToRad(F);

  const librationLon =
    -6.289 * Math.sin(mpRad) +
    1.274 * Math.sin(2 * dRad - mpRad) +
    0.658 * Math.sin(2 * dRad) +
    0.214 * Math.sin(2 * mpRad) -
    0.186 * Math.sin(mRad) -
    0.114 * Math.sin(2 * fRad);

  const librationLat =
    -5.128 * Math.sin(fRad) +
    0.281 * Math.sin(mpRad + fRad) +
    0.278 * Math.sin(mpRad - fRad) +
    0.173 * Math.sin(2 * dRad - fRad);

  const subEarthLon = normalizeAngle180(librationLon);
  const subEarthLat = normalizeAngle180(librationLat);

  const meanSubSolarLon = normalizeAngle180(180.0 - (d * (360.0 / LUNAR_SYNODIC_MONTH_DAYS)) % 360.0);
  const sunLonCorrection = -1.915 * Math.sin(mRad) - 6.289 * Math.sin(mpRad) + 1.274 * Math.sin(2 * dRad - mpRad);
  const subSolarLon = normalizeAngle180(meanSubSolarLon + sunLonCorrection);
  const subSolarLat = LUNAR_OBLIQUITY_TO_ECLIPTIC_DEG * Math.sin(fRad - dRad);

  const earthMoonDistanceKm =
    385000.56 -
    20905.355 * Math.cos(mpRad) -
    3699.111 * Math.cos(2 * dRad - mpRad) -
    2955.968 * Math.cos(2 * dRad) -
    569.925 * Math.cos(2 * mpRad);

  const phaseAngleDeg = normalizeAngle360(180.0 - D);

  return { subSolarLat, subSolarLon, subEarthLat, subEarthLon, earthMoonDistanceKm, phaseAngleDeg };
}

/**
 * Evaluates the line-of-sight visibility classification given Earth apparent elevation
 * and the local terrain horizon mask elevation at Earth's azimuth.
 *
 * Rules:
 * 1. Earth below or at ideal geometric horizon (elevationDeg <= 0) is ALWAYS
 *    'geometrically-below-horizon', regardless of terrain mask.
 * 2. Earth above geometric horizon (elevationDeg > 0) but at or below the terrain mask
 *    (elevationDeg <= rimElevationDeg) is 'terrain-obstructed'.
 * 3. Earth above both geometric horizon and terrain mask
 *    (elevationDeg > 0 && elevationDeg > rimElevationDeg) is 'unobstructed-by-mask'.
 */
export function evaluateVisibilityStatus(
  elevationDeg: number,
  rimElevationDeg: number
): {
  isAboveGeometricHorizon: boolean;
  isBlockedByTerrain: boolean;
  hasDirectLineOfSight: boolean;
  visibilityStatus: 'geometrically-below-horizon' | 'terrain-obstructed' | 'unobstructed-by-mask';
} {
  const isAboveGeometricHorizon = elevationDeg > 0.0;
  const isBlockedByTerrain = isAboveGeometricHorizon && elevationDeg <= rimElevationDeg;
  const hasDirectLineOfSight = isAboveGeometricHorizon && !isBlockedByTerrain;

  const visibilityStatus: 'geometrically-below-horizon' | 'terrain-obstructed' | 'unobstructed-by-mask' =
    !isAboveGeometricHorizon
      ? 'geometrically-below-horizon'
      : isBlockedByTerrain
      ? 'terrain-obstructed'
      : 'unobstructed-by-mask';

  return {
    isAboveGeometricHorizon,
    isBlockedByTerrain,
    hasDirectLineOfSight,
    visibilityStatus,
  };
}

/**
 * Interpolates crater rim horizon mask elevation at a given azimuth, handling wrap-around at 360°.
 */
export function interpolateCraterRimMask(
  azimuthDeg: number,
  rimMask: Array<{ azimuth: number; horizonElevationDeg: number }>
): number {
  if (!rimMask || rimMask.length === 0) return 0.0;
  if (rimMask.length === 1) return rimMask[0].horizonElevationDeg;

  const normAz = normalizeAngle360(azimuthDeg);

  for (let i = 0; i < rimMask.length; i++) {
    if (rimMask[i].azimuth === normAz) {
      return rimMask[i].horizonElevationDeg;
    }
  }

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

  const fraction = (normAz - lower.azimuth) / (upper.azimuth - lower.azimuth);
  return lower.horizonElevationDeg + fraction * (upper.horizonElevationDeg - lower.horizonElevationDeg);
}

// In-memory caching for Horizons ephemeris queries to prevent redundant network calls
const horizonsQueryCache = new Map<string, { data: LunarTrajectoryPoint[]; cachedAt: number }>();

/**
 * Single trajectory state point returned by NASA JPL Horizons.
 */
export interface LunarTrajectoryPoint {
  /** Formatted calendar date and time in Barycentric Dynamical Time (TDB) */
  time: string;
  /** Julian Date (Barycentric Dynamical Time) */
  jdtdb?: number;
  /** Geocentric Cartesian X position in kilometres (ICRF/J2000) */
  x: number;
  /** Geocentric Cartesian Y position in kilometres (ICRF/J2000) */
  y: number;
  /** Geocentric Cartesian Z position in kilometres (ICRF/J2000) */
  z: number;
  /** Geocentric Cartesian X velocity in kilometres/second (ICRF/J2000) */
  vx?: number;
  /** Geocentric Cartesian Y velocity in kilometres/second (ICRF/J2000) */
  vy?: number;
  /** Geocentric Cartesian Z velocity in kilometres/second (ICRF/J2000) */
  vz?: number;
  /** True Earth-Moon geocentric distance in kilometres */
  rangeKm?: number;
}

/**
 * Parameters for requesting lunar ephemerides from NASA JPL Horizons.
 */
export interface LunarTrajectoryOptions {
  /**
   * Ephemeris start time.
   * Formats: 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM', or 'YYYY-Mon-DD HH:MM'
   * e.g., '2026-11-14 00:00'
   */
  startTime: string;
  /**
   * Ephemeris stop time. Must be chronologically after startTime.
   * e.g., '2026-11-15 00:00'
   */
  stopTime: string;
  /**
   * Output time step size. Defaults to '1h'.
   * Formats: '1h', '30m', '1d', '10m', etc.
   */
  stepSize?: string;
  /**
   * Optional AbortSignal for request cancellation.
   */
  signal?: AbortSignal;
  /**
   * Request timeout in milliseconds. Defaults to 15,000 ms (15 seconds).
   */
  timeoutMs?: number;
}

/**
 * Standard NASA JPL Horizons API Endpoint
 */
export const JPL_HORIZONS_API_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/**
 * Parses raw NASA JPL Horizons response text and extracts valid trajectory points.
 * 
 * Extracts data between the $$SOE (Start of Ephemeris) and $$EOE (End of Ephemeris) markers,
 * validating CSV columns and converting scientific notation numbers into floating point kilometres.
 * 
 * @param responseText - Raw text or JSON result string from NASA Horizons
 * @returns Array of parsed LunarTrajectoryPoint objects
 * @throws Error if markers are missing, rows are malformed, or data is invalid
 */
export function parseLunarTrajectory(responseText: string): LunarTrajectoryPoint[] {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('Invalid input: responseText must be a non-empty string.');
  }

  // Check for NASA Horizons API error messages embedded in output
  if (responseText.includes('DXREAD: requested IOBJ') || responseText.includes('Cannot interpret command')) {
    throw new Error(`NASA Horizons API error: ${responseText.split('\n')[0].trim()}`);
  }

  // Extract ephemeris block between $$SOE and $$EOE markers
  const soeMarker = '$$SOE';
  const eoeMarker = '$$EOE';

  const startIndex = responseText.indexOf(soeMarker);
  const endIndex = responseText.indexOf(eoeMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      `Missing ephemeris markers (${soeMarker} / ${eoeMarker}) in NASA JPL Horizons response.`
    );
  }

  if (endIndex <= startIndex) {
    throw new Error('Malformed ephemeris block: End marker $$EOE precedes start marker $$SOE.');
  }

  const ephemerisContent = responseText.substring(startIndex + soeMarker.length, endIndex);
  const lines = ephemerisContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length === 0) {
    throw new Error('Empty ephemeris block: No trajectory records found between $$SOE and $$EOE markers.');
  }

  const points: LunarTrajectoryPoint[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const columns = rawLine.split(',').map(c => c.trim());

    // Expected VEC_TABLE=2 format:
    // col 0: JDTDB (Julian Date)
    // col 1: Calendar Date (TDB)
    // col 2: X (km)
    // col 3: Y (km)
    // col 4: Z (km)
    // col 5: VX (km/s, optional)
    // col 6: VY (km/s, optional)
    // col 7: VZ (km/s, optional)
    if (columns.length < 5) {
      throw new Error(
        `Malformed CSV row at index ${lineIndex}: Expected at least 5 columns (JDTDB, Time, X, Y, Z), received ${columns.length}. Raw line: "${rawLine}"`
      );
    }

    const jdtdb = parseFloat(columns[0]);
    const rawTime = columns[1];
    const x = parseFloat(columns[2]);
    const y = parseFloat(columns[3]);
    const z = parseFloat(columns[4]);

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      throw new Error(
        `Invalid numeric coordinates at row ${lineIndex}: X="${columns[2]}", Y="${columns[3]}", Z="${columns[4]}". Numeric conversion failed.`
      );
    }

    // Clean up calendar time string (strip prefix "A.D. " if present)
    const cleanTime = rawTime.replace(/^A\.D\.\s*/i, '').trim();

    // Parse velocities if present
    const vx = columns.length > 5 && columns[5] !== '' ? parseFloat(columns[5]) : undefined;
    const vy = columns.length > 6 && columns[6] !== '' ? parseFloat(columns[6]) : undefined;
    const vz = columns.length > 7 && columns[7] !== '' ? parseFloat(columns[7]) : undefined;

    // True geocentric radius from Earth center to Moon center
    const rangeKm = Math.sqrt(x * x + y * y + z * z);

    points.push({
      time: cleanTime,
      jdtdb: !isNaN(jdtdb) ? jdtdb : undefined,
      x,
      y,
      z,
      vx: vx !== undefined && !isNaN(vx) ? vx : undefined,
      vy: vy !== undefined && !isNaN(vy) ? vy : undefined,
      vz: vz !== undefined && !isNaN(vz) ? vz : undefined,
      rangeKm,
    });
  }

  if (points.length === 0) {
    throw new Error('No valid trajectory points could be parsed from Horizons output.');
  }

  return points;
}

/**
 * Validates request dates to ensure chronologically sound query parameters.
 */
function validateDateRange(startTime: string, stopTime: string): void {
  if (!startTime || !startTime.trim()) {
    throw new Error('Validation error: startTime must be specified.');
  }
  if (!stopTime || !stopTime.trim()) {
    throw new Error('Validation error: stopTime must be specified.');
  }

  const startDate = new Date(startTime);
  const stopDate = new Date(stopTime);

  // If both formats are parseable standard dates, verify chronology
  if (!isNaN(startDate.getTime()) && !isNaN(stopDate.getTime())) {
    if (startDate.getTime() >= stopDate.getTime()) {
      throw new Error(
        `Invalid date range: startTime (${startTime}) must be chronologically earlier than stopTime (${stopTime}).`
      );
    }
  }
}

/**
 * Fetches high-precision lunar geocentric state vectors from NASA JPL Horizons API.
 * 
 * Queries the Horizons REST service for Moon (301) relative to Earth Center (500@399)
 * in the ICRF/J2000 reference frame with configurable step size and time bounds.
 * 
 * @param options - Configuration options for ephemeris time window and execution
 * @returns Promise resolving to an array of parsed LunarTrajectoryPoint items
 * @throws Error on network failure, HTTP error, API error, or parsing failure
 */
export async function fetchLunarTrajectory(
  options: LunarTrajectoryOptions
): Promise<LunarTrajectoryPoint[]> {
  const {
    startTime,
    stopTime,
    stepSize = '1h',
    signal,
    timeoutMs = 15000,
  } = options;

  // 1. Validate date range
  validateDateRange(startTime, stopTime);

  // Check in-memory cache
  const cacheKey = `${startTime}__${stopTime}__${stepSize}`;
  const cached = horizonsQueryCache.get(cacheKey);
  if (cached) {
    return cached.data;
  }

  // 2. Build NASA Horizons REST query URL
  // Parameters complying with official NASA JPL SSD API Specification
  const queryParams = new URLSearchParams({
    format: 'json',
    COMMAND: "'301'",           // Target: Moon
    CENTER: "'500@399'",        // Coordinate Center: Earth geocenter
    EPHEM_TYPE: 'VECTORS',      // State vectors table
    START_TIME: startTime,      // Start epoch
    STOP_TIME: stopTime,        // End epoch
    STEP_SIZE: stepSize,        // Time interval
    VEC_TABLE: '2',             // Position + Velocity components [X, Y, Z, VX, VY, VZ]
    CSV_FORMAT: 'YES',          // Comma-separated output values
    OUT_UNITS: 'KM-S',          // Kilometres and kilometres/second
    REF_PLANE: 'FRAME',         // ICRF reference plane
  });

  const requestUrl = `${JPL_HORIZONS_API_BASE}?${queryParams.toString()}`;

  // 3. Setup timeout & cancellation
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new Error(`NASA JPL Horizons request timed out after ${timeoutMs}ms.`));
  }, timeoutMs);

  // Link caller signal if provided
  if (signal) {
    if (signal.aborted) {
      abortController.abort(signal.reason);
    } else {
      signal.addEventListener('abort', () => abortController.abort(signal.reason), { once: true });
    }
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: abortController.signal,
    });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const err = error as { name?: string; message?: string };
    if (err?.name === 'AbortError' || abortController.signal.aborted) {
      throw new Error(`NASA JPL Horizons request aborted: ${err?.message || 'Timeout exceeded.'}`);
    }
    throw new Error(`Network failure connecting to NASA JPL Horizons: ${err?.message || 'Unknown network error'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Validate HTTP status
  if (!response.ok) {
    throw new Error(
      `NASA JPL Horizons HTTP Error: Received status ${response.status} (${response.statusText}).`
    );
  }

  // 5. Parse JSON payload
  let data: { error?: string; result?: string };
  try {
    data = (await response.json()) as { error?: string; result?: string };
  } catch (err: unknown) {
    const parseErr = err as { message?: string };
    throw new Error(`Failed to parse NASA JPL Horizons response as JSON: ${parseErr?.message || 'Invalid JSON'}`);
  }

  // 6. Check for Horizons application-level error
  if (data.error) {
    throw new Error(`NASA JPL Horizons API Error: ${data.error}`);
  }

  if (!data.result || typeof data.result !== 'string') {
    throw new Error('NASA JPL Horizons returned an empty or invalid "result" field.');
  }

  // 7. Parse and return validated ephemeris points
  const points = parseLunarTrajectory(data.result);
  horizonsQueryCache.set(cacheKey, { data: points, cachedAt: Date.now() });
  return points;
}

/**
 * Topocentric celestial observation result for a specific lunar surface location.
 * Computes apparent positions of the Sun and Earth in the local horizon frame
 * (North-East-Zenith), properly transforming between IAU Mean Earth/Polar Axis (ME)
 * body-fixed selenographic coordinates and local topocentric azimuth/elevation.
 */
export interface LunarSurfaceObservation {
  observerLatitude: number;
  observerLongitude: number;
  observerElevationMeters: number;
  timeUTC: string;
  coordinateFrame: 'IAU 2015 Mean Earth/Polar Axis (ME) Topocentric';
  timeSystem: 'UTC / TDB (approximate; ΔT omitted)';
  sun: {
    azimuthDeg: number;       // Compass bearing from North (0°=N, 90°=E, 180°=S, 270°=W)
    elevationDeg: number;     // Apparent geometric elevation above local horizontal tangent plane
    distanceAU: number;       // ~0.98 - 1.02 AU
    distanceKm: number;
    isAboveHorizon: boolean;
    subSolarLat: number;      // Sub-solar point latitude (solar declination)
    subSolarLon: number;      // Sub-solar point longitude
    calculationSource: 'In-Memory Analytical Ephemeris (DE440/DE421 Series)';
  };
  earth: {
    azimuthDeg: number;       // Compass bearing towards Earth
    elevationDeg: number;     // Apparent elevation angle above local horizon
    distanceKm: number;       // True Earth-Moon geocentric distance
    lightTimeSeconds: number; // One-way RF signal transit latency
    isAboveHorizon: boolean;
    librationLonDeg: number;  // Moon longitudinal libration (l)
    librationLatDeg: number;  // Moon latitudinal libration (b)
    phase: 'New Earth' | 'Crescent' | 'Quarter' | 'Gibbous' | 'Full Earth';
    phaseFraction: number;    // 0.0 to 1.0
    calculationSource: 'In-Memory Analytical Ephemeris (DE440/DE421 Series)';
  };
}

/**
 * Calculates topocentric Sun and Earth positions for any selected lunar
 * surface coordinates (latitude, longitude, elevation) and mission time.
 * 
 * IMPORTANT SCIENTIFIC ASSUMPTIONS & ARCHITECTURAL NOTE:
 * - This function is an IN-MEMORY ANALYTICAL EPHEMERIS (DE440/DE421 series expansion),
 *   NOT a live query to the NASA JPL Horizons REST API.
 * - Time system approximation disclosure: UTC is used directly as an analytical approximation
 *   of Barycentric Dynamical Time (TDB). Relativistic offsets (TT - TDB) and leap seconds
 *   (ΔT ~69.184s) are omitted for client performance. This is an explicit computational
 *   approximation, NOT a precision-grade astronomical time-scale conversion.
 * - Precision disclosure: Topocentric results are analytical approximations designed for
 *   interactive mission visualization and do NOT claim sub-arcsecond or independently
 *   validated trajectory accuracy.
 * - Lunar body shape: Assumes spherical reference datum (R_moon = 1,737.4 km) + site elevation.
 * - Physical libration: Computed via truncated trigonometric expansions.
 * 
 * Frame transformation:
 * 1. Evaluates body-fixed ME unit vectors for observer, Sub-Solar, and Sub-Earth points.
 * 2. Establishes the local topocentric horizon triad (East, North, Zenith).
 * 3. Corrects Earth direction for topocentric parallax across the lunar radius.
 * 4. Resolves azimuth (0-360° from North) and elevation (-90° to +90°).
 */
export function calculateLunarSurfaceObservation(
  latitude: number,
  longitude: number,
  date: Date,
  elevationMeters: number = 0
): LunarSurfaceObservation {
  const eph = computeAnalyticalEphemeris(date);

  const latRad = degToRad(latitude);
  const lonRad = degToRad(longitude);

  // 1. Observer's unit normal vector in the IAU Moon ME body-fixed frame (Zenith)
  const zX = Math.cos(latRad) * Math.cos(lonRad);
  const zY = Math.cos(latRad) * Math.sin(lonRad);
  const zZ = Math.sin(latRad);

  // 2. Local East and North tangent unit vectors on the lunar sphere
  // East = [-sin(lon), cos(lon), 0]
  const eX = -Math.sin(lonRad);
  const eY = Math.cos(lonRad);
  const eZ = 0;

  // North = Zenith x East = [-sin(lat)*cos(lon), -sin(lat)*sin(lon), cos(lat)]
  const nX = -Math.sin(latRad) * Math.cos(lonRad);
  const nY = -Math.sin(latRad) * Math.sin(lonRad);
  const nZ = Math.cos(latRad);

  // --- SUN POSITION ---
  const sunLatRad = degToRad(eph.subSolarLat);
  const sunLonRad = degToRad(eph.subSolarLon);
  const sX = Math.cos(sunLatRad) * Math.cos(sunLonRad);
  const sY = Math.cos(sunLatRad) * Math.sin(sunLonRad);
  const sZ = Math.sin(sunLatRad);

  // Projection into local topocentric horizon frame (East, North, Zenith)
  const sunEast = sX * eX + sY * eY + sZ * eZ;
  const sunNorth = sX * nX + sY * nY + sZ * nZ;
  const sunZenith = sX * zX + sY * zY + sZ * zZ;

  const sunElevationRad = Math.asin(Math.max(-1, Math.min(1, sunZenith)));
  const sunElevationDeg = parseFloat(radToDeg(sunElevationRad).toFixed(2));
  const sunAzimuthDeg = parseFloat(
    normalizeAngle360(radToDeg(Math.atan2(sunEast, sunNorth))).toFixed(2)
  );

  // --- EARTH POSITION WITH TOPOCENTRIC PARALLAX ---
  const earthLatRad = degToRad(eph.subEarthLat);
  const earthLonRad = degToRad(eph.subEarthLon);
  const eDirX = Math.cos(earthLatRad) * Math.cos(earthLonRad);
  const eDirY = Math.cos(earthLatRad) * Math.sin(earthLonRad);
  const eDirZ = Math.sin(earthLatRad);

  // Lunar radius at site = mean radius (1,737.4 km) + elevation
  const rMoonKm = LUNAR_MEAN_RADIUS_KM + elevationMeters / 1000.0;
  const dEarthKm = eph.earthMoonDistanceKm;

  // Topocentric vector from site to Earth center:
  const tX = dEarthKm * eDirX - rMoonKm * zX;
  const tY = dEarthKm * eDirY - rMoonKm * zY;
  const tZ = dEarthKm * eDirZ - rMoonKm * zZ;
  const tLen = Math.sqrt(tX * tX + tY * tY + tZ * tZ);

  const uTX = tX / tLen;
  const uTY = tY / tLen;
  const uTZ = tZ / tLen;

  const earthEast = uTX * eX + uTY * eY + uTZ * eZ;
  const earthNorth = uTX * nX + uTY * nY + uTZ * nZ;
  const earthZenith = uTX * zX + uTY * zY + uTZ * zZ;

  const earthElevationRad = Math.asin(Math.max(-1, Math.min(1, earthZenith)));
  const earthElevationDeg = parseFloat(radToDeg(earthElevationRad).toFixed(2));
  const earthAzimuthDeg = parseFloat(
    normalizeAngle360(radToDeg(Math.atan2(earthEast, earthNorth))).toFixed(2)
  );

  // RF Light time latency
  const lightTimeSeconds = parseFloat((tLen / 299792.458).toFixed(3));

  // Earth phase
  const phaseFraction = (1.0 + Math.cos(degToRad(eph.phaseAngleDeg))) / 2.0;
  let phaseName: 'New Earth' | 'Crescent' | 'Quarter' | 'Gibbous' | 'Full Earth' = 'Quarter';
  if (phaseFraction < 0.15) phaseName = 'New Earth';
  else if (phaseFraction < 0.4) phaseName = 'Crescent';
  else if (phaseFraction < 0.6) phaseName = 'Quarter';
  else if (phaseFraction < 0.85) phaseName = 'Gibbous';
  else phaseName = 'Full Earth';

  return {
    observerLatitude: latitude,
    observerLongitude: longitude,
    observerElevationMeters: elevationMeters,
    timeUTC: date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
    coordinateFrame: 'IAU 2015 Mean Earth/Polar Axis (ME) Topocentric',
    timeSystem: 'UTC / TDB (approximate; ΔT omitted)',
    sun: {
      azimuthDeg: sunAzimuthDeg,
      elevationDeg: sunElevationDeg,
      distanceAU: 1.0,
      distanceKm: 149597870.7,
      isAboveHorizon: sunElevationDeg > 0,
      subSolarLat: parseFloat(eph.subSolarLat.toFixed(3)),
      subSolarLon: parseFloat(eph.subSolarLon.toFixed(3)),
      calculationSource: 'In-Memory Analytical Ephemeris (DE440/DE421 Series)',
    },
    earth: {
      azimuthDeg: earthAzimuthDeg,
      elevationDeg: earthElevationDeg,
      distanceKm: parseFloat(tLen.toFixed(1)),
      lightTimeSeconds,
      isAboveHorizon: earthElevationDeg > 0,
      librationLonDeg: parseFloat(eph.subEarthLon.toFixed(3)),
      librationLatDeg: parseFloat(eph.subEarthLat.toFixed(3)),
      phase: phaseName,
      phaseFraction: parseFloat(phaseFraction.toFixed(3)),
      calculationSource: 'In-Memory Analytical Ephemeris (DE440/DE421 Series)',
    },
  };
}
