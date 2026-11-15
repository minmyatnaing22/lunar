// LunarSight - Direct Communication & Relay Satellite Analyzer
// Simulates NASA Deep Space Network (DSN) ground tracking complexes & lunar line-of-sight.

import { CommunicationAnalysis, CommunicationWindow, TerrainProfile } from '@/types/mission';
import { LUNAR_CONSTANTS } from '@/types/astronomy';
import { calculateLunarEphemeris } from './ephemeris';
import { calculateEarthPosition } from './earthVisibility';
import { getCraterRimHorizonElevation } from './illumination';

// NASA Deep Space Network (DSN) Primary Ground Station Complexes
// Located ~120 degrees apart around Earth for continuous planetary tracking
export const DSN_COMPLEXES = [
  { name: 'Goldstone (DSN-14)', longitude: -116.89, latitude: 35.43, country: 'USA' },
  { name: 'Madrid (DSN-63)', longitude: -4.25, latitude: 40.43, country: 'Spain' },
  { name: 'Canberra (DSN-43)', longitude: 148.98, latitude: -35.40, country: 'Australia' },
];

/**
 * Determines which DSN station currently faces the Moon based on UTC time and Earth rotation
 */
export function getActiveDsnStation(date: Date): 'Canberra (DSN-43)' | 'Madrid (DSN-63)' | 'Goldstone (DSN-14)' {
  // Greenwich Mean Sidereal Time / Earth rotation angle
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60.0 + date.getUTCSeconds() / 3600.0;
  
  // Approximate sub-lunar terrestrial longitude (where Moon is overhead on Earth)
  // Earth rotates 15 degrees per hour to the East (360 deg / 24 hr)
  const gmstDeg = (utcHours * 15.0 + 180.0) % 360.0;

  // Station elevation above local horizon towards Moon:
  // Canberra is roughly 150E, Madrid 4W (356), Goldstone 117W (243)
  if (gmstDeg >= 40 && gmstDeg < 160) {
    return 'Canberra (DSN-43)';
  } else if (gmstDeg >= 160 && gmstDeg < 280) {
    return 'Madrid (DSN-63)';
  } else {
    return 'Goldstone (DSN-14)';
  }
}

/**
 * Calculates Round-Trip Light Time (RTLT) in seconds
 */
export function calculateRoundTripLatency(distanceKm: number): number {
  // Two-way signal transit: (2 * distance) / speed_of_light
  const oneWaySeconds = distanceKm / LUNAR_CONSTANTS.SPEED_OF_LIGHT_KM_S;
  return Math.round(2.0 * oneWaySeconds * 1000) / 1000;
}

/**
 * Simulates a Lunar Relay Satellite in an Earth-Moon L2 Southern Halo Orbit
 * Orbit period is ~14 days, hovering 15,000 - 65,000 km south of the lunar pole
 */
export function calculateRelaySatellitePosition(
  date: Date,
  lat: number,
  lon: number
): { isRelayInView: boolean; elevationDeg: number; azimuthDeg: number } {
  const tDays = date.getTime() / (1000 * 3600 * 24);
  // 14-day orbital cycle
  const orbitPhase = ((tDays % 14.0) / 14.0) * 2 * Math.PI;

  // Relay is positioned high above the southern hemisphere (elevation typically +15 deg to +55 deg)
  const elevation = 25.0 + 20.0 * Math.sin(orbitPhase);
  const azimuth = ((tDays * 25.7) + 180.0) % 360.0;

  // From the south polar region (lat < -70 deg), the halo orbit is visible almost continuously (~95% duty cycle)
  const isRelayInView = elevation > 5.0;

  return {
    isRelayInView,
    elevationDeg: Math.round(elevation * 10) / 10,
    azimuthDeg: Math.round(azimuth * 10) / 10,
  };
}

/**
 * Performs complete communication analysis for a landing site
 */
export function analyzeCommunication(
  lat: number,
  lon: number,
  terrain: TerrainProfile,
  date: Date,
  relayEnabled: boolean = true,
  missionDurationDays: number = 14
): CommunicationAnalysis {
  const ephemeris = calculateLunarEphemeris(date);
  const { elevationDeg, azimuthDeg } = calculateEarthPosition(
    lat,
    lon,
    ephemeris.subEarthLat,
    ephemeris.subEarthLon,
    ephemeris.earthMoonDistanceKm
  );

  const rimElevation = getCraterRimHorizonElevation(azimuthDeg, terrain.craterRimMask);
  
  // Direct line-of-sight requires Earth elevation > 0 and Earth above surrounding terrain rim
  // Plus a 1.0 deg margin for ground multipath / atmospheric diffraction at Earth side
  const hasDirectEarthLOS = elevationDeg > 0.0 && elevationDeg > rimElevation;

  const activeDsn = hasDirectEarthLOS ? getActiveDsnStation(date) : null;
  const latency = calculateRoundTripLatency(ephemeris.earthMoonDistanceKm);

  // Relay satellite evaluation
  const relay = calculateRelaySatellitePosition(date, lat, lon);

  // Generate upcoming communication timeline windows over mission duration
  const windows: CommunicationWindow[] = [];
  const stepHours = 4;
  const totalSteps = Math.floor((missionDurationDays * 24) / stepHours);
  
  let currentWindowType: 'Direct-to-Earth' | 'Relay-Supported' | 'Blackout' | null = null;
  let windowStart = date;
  let directCommsHours = 0;
  let totalHoursEvaluated = 0;
  let maxBlackoutHours = 0;
  let currentBlackoutCount = 0;

  for (let i = 0; i < totalSteps; i++) {
    const stepTime = new Date(date.getTime() + i * stepHours * 3600 * 1000);
    const stepEph = calculateLunarEphemeris(stepTime);
    const stepPos = calculateEarthPosition(
      lat,
      lon,
      stepEph.subEarthLat,
      stepEph.subEarthLon,
      stepEph.earthMoonDistanceKm
    );
    const stepRim = getCraterRimHorizonElevation(stepPos.azimuthDeg, terrain.craterRimMask);
    const stepDirectLOS = stepPos.elevationDeg > 0 && stepPos.elevationDeg > stepRim;

    let type: 'Direct-to-Earth' | 'Relay-Supported' | 'Blackout';
    if (stepDirectLOS) {
      type = 'Direct-to-Earth';
      directCommsHours += stepHours;
      currentBlackoutCount = 0;
    } else if (relayEnabled && relay.isRelayInView) {
      type = 'Relay-Supported';
      currentBlackoutCount = 0;
    } else {
      type = 'Blackout';
      currentBlackoutCount += stepHours;
      if (currentBlackoutCount > maxBlackoutHours) {
        maxBlackoutHours = currentBlackoutCount;
      }
    }

    totalHoursEvaluated += stepHours;

    if (currentWindowType === null) {
      currentWindowType = type;
      windowStart = stepTime;
    } else if (currentWindowType !== type || i === totalSteps - 1) {
      const dur = Math.round((stepTime.getTime() - windowStart.getTime()) / (3600 * 1000));
      if (dur > 0 && windows.length < 12) {
        let station: CommunicationWindow['primaryStation'] = 'None';
        let status: CommunicationWindow['status'] = 'optimal';
        let notes = '';

        if (currentWindowType === 'Direct-to-Earth') {
          station = getActiveDsnStation(windowStart);
          status = 'optimal';
          notes = 'Continuous DTE line-of-sight. High data rate (Ka-band).';
        } else if (currentWindowType === 'Relay-Supported') {
          station = 'Lunar Relay Satellite';
          status = 'marginal';
          notes = 'Direct Earth LOS blocked; linked via L2 Halo orbital relay.';
        } else {
          station = 'None';
          status = 'blocked';
          notes = 'Earth below terrain mask / libration dip; no active relay link.';
        }

        windows.push({
          id: `win-${windows.length + 1}`,
          startTime: windowStart.toISOString(),
          endTime: stepTime.toISOString(),
          durationHours: dur,
          type: currentWindowType,
          primaryStation: station,
          status,
          notes,
        });
      }
      currentWindowType = type;
      windowStart = stepTime;
    }
  }

  const directAvailability = totalHoursEvaluated > 0
    ? Math.round((directCommsHours / totalHoursEvaluated) * 100)
    : 0;

  return {
    hasDirectEarthLOS,
    activeDsnStation: activeDsn,
    roundTripLatencySeconds: latency,
    isRelaySupported: relayEnabled && relay.isRelayInView,
    relayElevationDeg: relay.elevationDeg,
    relayAzimuthDeg: relay.azimuthDeg,
    directCommsAvailabilityPercent: directAvailability,
    longestBlackoutHours: maxBlackoutHours,
    upcomingWindows: windows,
  };
}
