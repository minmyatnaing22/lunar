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
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || abortController.signal.aborted) {
      throw new Error(`NASA JPL Horizons request aborted: ${error.message || 'Timeout exceeded.'}`);
    }
    throw new Error(`Network failure connecting to NASA JPL Horizons: ${error.message}`);
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
  let data: any;
  try {
    data = await response.json();
  } catch (err: any) {
    throw new Error(`Failed to parse NASA JPL Horizons response as JSON: ${err.message}`);
  }

  // 6. Check for Horizons application-level error
  if (data.error) {
    throw new Error(`NASA JPL Horizons API Error: ${data.error}`);
  }

  if (!data.result || typeof data.result !== 'string') {
    throw new Error('NASA JPL Horizons returned an empty or invalid "result" field.');
  }

  // 7. Parse and return validated ephemeris points
  return parseLunarTrajectory(data.result);
}
