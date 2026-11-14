// LunarSight - Astronomical Constants and Coordinate Models
// Reference: NASA SP-8000 Series, JPL Planetary and Lunar Ephemerides (DE440/DE421), IAU Working Group on Cartographic Coordinates

export const LUNAR_CONSTANTS = {
  MEAN_RADIUS_KM: 1737.4,
  EQUATORIAL_RADIUS_KM: 1738.1,
  POLAR_RADIUS_KM: 1736.0,
  MASS_KG: 7.342e22,
  SURFACE_GRAVITY_M_S2: 1.62,
  SYNODIC_MONTH_DAYS: 29.530588853, // Lunar day/night cycle relative to Sun
  SIDEREAL_MONTH_DAYS: 27.321661, // Orbit period relative to fixed stars
  ANOMALISTIC_MONTH_DAYS: 27.55455, // Perigee to perigee
  DRACONIC_MONTH_DAYS: 27.21222, // Node to node (libration cycle)
  OBLIQUITY_TO_ECLIPTIC_DEG: 1.5424, // Tilt of Moon equator to ecliptic
  SOLAR_IRRADIANCE_WM2: 1361.0, // Solar constant at 1 AU
  SPEED_OF_LIGHT_KM_S: 299792.458,
  MEAN_EARTH_MOON_DIST_KM: 384400.0,
  EARTH_ANGULAR_RADIUS_DEG: 0.95, // ~1.9 deg diameter from Moon
};

export interface SelenographicCoordinate {
  lat: number; // degrees, -90 to +90 (South negative)
  lon: number; // degrees, -180 to +180 (West negative)
  elevation?: number; // meters from 1737.4 km sphere
}

export interface HorizonCoordinate {
  azimuth: number; // degrees, 0 = North, 90 = East, 180 = South, 270 = West
  elevation: number; // degrees, -90 to +90 (0 = horizon)
}

export interface LunarEphemerisState {
  timestamp: Date;
  subSolarLon: number; // selenographic longitude where Sun is at zenith
  subSolarLat: number; // selenographic latitude of sub-solar point
  subEarthLon: number; // longitude of sub-earth point (optical+physical libration l)
  subEarthLat: number; // latitude of sub-earth point (libration b)
  earthMoonDistanceKm: number;
  sunEarthMoonPhaseAngleDeg: number;
}
