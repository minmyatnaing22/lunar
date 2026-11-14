// LunarSight - Ephemeris & Solar/Earth Position Calculation Engine
// Complies with IAU Working Group on Cartographic Coordinates & Rotational Elements (WGCCTR)
// and JPL Planetary Ephemeris (DE440/DE421 simplified analytical series).

import { LunarEphemerisState, LUNAR_CONSTANTS } from '@/types/astronomy';
import { degToRad, radToDeg, normalizeAngle180, normalizeAngle360 } from './coordinates';

/**
 * Converts a standard UTC Date to Julian Date (JD)
 */
export function dateToJulianDate(date: Date): number {
  return date.getTime() / 86400000.0 + 2440587.5;
}

/**
 * Calculates ephemeris time centuries from J2000.0 epoch
 */
export function julianCenturiesSinceJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Computes the complete Ephemeris state of the Moon for any given date/time
 */
export function calculateLunarEphemeris(date: Date): LunarEphemerisState {
  const jd = dateToJulianDate(date);
  const d = jd - 2451545.0; // Days from standard J2000.0 epoch
  const T = d / 36525.0;

  // 1. Mean orbital elements of the Moon & Sun (Meeus Astronomical Algorithms, Ch 47 & 53)
  // Mean elongation of the Moon from the Sun:
  const D = normalizeAngle360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);
  
  // Sun's mean anomaly:
  const M = normalizeAngle360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
  
  // Moon's mean anomaly:
  const Mprime = normalizeAngle360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);
  
  // Moon's argument of latitude (distance from ascending node):
  const F = normalizeAngle360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T);

  // Convert key angles to radians for trigonometric terms
  const dRad = degToRad(D);
  const mRad = degToRad(M);
  const mpRad = degToRad(Mprime);
  const fRad = degToRad(F);

  // 2. Optical & Physical Libration (Earth's sub-lunar point):
  // The Moon exhibits longitudinal libration (due to elliptical orbit) and latitudinal libration (due to 5.14 deg orbital tilt and 1.54 deg rotational tilt).
  // Longitudinal libration l (optical + physical):
  const librationLon = 
    -6.289 * Math.sin(mpRad) +
     1.274 * Math.sin(2 * dRad - mpRad) +
     0.658 * Math.sin(2 * dRad) +
     0.214 * Math.sin(2 * mpRad) -
     0.186 * Math.sin(mRad) -
     0.114 * Math.sin(2 * fRad);

  // Latitudinal libration b:
  const librationLat = 
    -5.128 * Math.sin(fRad) +
     0.281 * Math.sin(mpRad + fRad) +
     0.278 * Math.sin(mpRad - fRad) +
     0.173 * Math.sin(2 * dRad - fRad);

  const subEarthLon = normalizeAngle180(librationLon);
  const subEarthLat = normalizeAngle180(librationLat);

  // 3. Sub-Solar Selenographic Coordinates:
  // The Moon rotates with a synodic period of 29.530588853 days relative to the Sun.
  // Sub-solar longitude decreases uniformly as the lunar day progresses:
  const meanSubSolarLon = normalizeAngle180(180.0 - (d * (360.0 / LUNAR_CONSTANTS.SYNODIC_MONTH_DAYS)) % 360.0);
  
  // Correction for Moon's orbital eccentricity affecting apparent solar motion:
  const sunLonCorrection = -1.915 * Math.sin(mRad) - 6.289 * Math.sin(mpRad) + 1.274 * Math.sin(2 * dRad - mpRad);
  const subSolarLon = normalizeAngle180(meanSubSolarLon + sunLonCorrection);

  // Solar declination on the Moon (sub-solar latitude) is bounded by the lunar obliquity to the ecliptic (1.5424 deg):
  // It cycles with the Moon's draconic/nodal orbital cycle:
  const subSolarLat = LUNAR_CONSTANTS.OBLIQUITY_TO_ECLIPTIC_DEG * Math.sin(fRad - dRad);

  // 4. Earth-Moon Distance (km):
  // Mean distance is 384,400 km, varying between ~356,500 km (perigee) and ~406,700 km (apogee)
  const earthMoonDistanceKm = 
    385000.56 -
    20905.355 * Math.cos(mpRad) -
    3699.111 * Math.cos(2 * dRad - mpRad) -
    2955.968 * Math.cos(2 * dRad) -
    569.925 * Math.cos(2 * mpRad);

  // 5. Phase Angle between Sun, Earth, and Moon:
  // D is the mean elongation; the phase angle is approximately 180 - D
  const phaseAngleDeg = normalizeAngle360(180.0 - D);

  return {
    timestamp: date,
    subSolarLon,
    subSolarLat,
    subEarthLon,
    subEarthLat,
    earthMoonDistanceKm,
    sunEarthMoonPhaseAngleDeg: phaseAngleDeg,
  };
}

/**
 * Classifies the Earth phase seen by a lunar observer
 */
export function getEarthPhaseDescription(phaseAngleDeg: number): {
  phase: 'New Earth' | 'Crescent' | 'Quarter' | 'Gibbous' | 'Full Earth';
  fraction: number;
} {
  // Phase fraction: 1.0 = Full Earth, 0.0 = New Earth
  // Seen from the Moon, Earth phase is opposite to Moon phase seen from Earth
  const k = (1 + Math.cos(degToRad(phaseAngleDeg))) / 2;
  
  let phase: 'New Earth' | 'Crescent' | 'Quarter' | 'Gibbous' | 'Full Earth';
  if (k < 0.05) phase = 'New Earth';
  else if (k < 0.45) phase = 'Crescent';
  else if (k < 0.55) phase = 'Quarter';
  else if (k < 0.95) phase = 'Gibbous';
  else phase = 'Full Earth';

  return { phase, fraction: k };
}
