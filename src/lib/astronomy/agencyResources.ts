// LunarSight - Agency Scientific Resources & Dataset Provenance Registry
// Integrates official metadata, coordinate reference frames, data classifications,
// and external verification links for the four primary agency resources:
// 1. LROC QuickMap (ASU / NASA LRO)
// 2. NASA Moon Trek (NASA Solar System Treks Project / JPL)
// 3. NASA JPL Horizons (NASA SSD)
// 4. Canadian Space Agency - Moon Exploration (CSA / ASC)

export type DataClassification =
  | 'MEASURED'
  | 'CALCULATED'
  | 'SIMULATED'
  | 'REFERENCE_BENCHMARK'
  | 'USER_PROVIDED'
  | 'ANALYTICAL'
  | 'UNAVAILABLE';

export interface DataClassificationMeta {
  type: DataClassification;
  label: string;
  badgeColor: string;
  borderColor: string;
  description: string;
}

export const DATA_CLASSIFICATIONS: Record<DataClassification, DataClassificationMeta> = {
  MEASURED: {
    type: 'MEASURED',
    label: 'Measured Data',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    borderColor: 'border-emerald-600',
    description: 'Empirical observational measurements acquired directly by spacecraft instruments (e.g. LRO LOLA laser altimeter, LROC NAC/WAC cameras).',
  },
  CALCULATED: {
    type: 'CALCULATED',
    label: 'Calculated Results',
    badgeColor: 'bg-sky-950 text-sky-300 border-sky-800',
    borderColor: 'border-sky-600',
    description: 'Deterministic astronomical and topographic calculations based on IAU cartographic conventions, planetary ephemerides, and vector geometry.',
  },
  SIMULATED: {
    type: 'SIMULATED',
    label: 'Simulated Estimates',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    borderColor: 'border-purple-600',
    description: 'Predictive models, multi-criteria decision weights, L2 halo relay coverage projections, and descent engine plume simulations.',
  },
  REFERENCE_BENCHMARK: {
    type: 'REFERENCE_BENCHMARK',
    label: 'Reference Benchmark',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    borderColor: 'border-amber-600',
    description: 'Published literature values and reference benchmarks (NASA/USGS/LROC studies). Not sampled from live DEM raster files.',
  },
  USER_PROVIDED: {
    type: 'USER_PROVIDED',
    label: 'User-Provided',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    borderColor: 'border-blue-600',
    description: 'Values manually entered or customized by the user. Not derived from lunar DEM datasets.',
  },
  ANALYTICAL: {
    type: 'ANALYTICAL',
    label: 'Analytical Ephemeris',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    borderColor: 'border-cyan-600',
    description: 'Analytical series expansion (DE440/DE421 series) computed in memory. Independent of live server queries.',
  },
  UNAVAILABLE: {
    type: 'UNAVAILABLE',
    label: 'Unavailable',
    badgeColor: 'bg-neutral-900 text-neutral-400 border-neutral-700',
    borderColor: 'border-neutral-600',
    description: 'Parameter is not supplied or cannot be derived without high-resolution DEM sampling.',
  },
};

export interface AgencyResource {
  id: string;
  name: string;
  agency: string;
  url: string;
  integrationType: 'Active Dataset' | 'Reference Validation' | 'API Ephemeris Service' | 'Mission Context & Overview' | 'External Reference & Benchmark';
  isActiveDataset: boolean;
  isReferenceOnly: boolean;
  coordinateFrame: string;
  timeSystem: string;
  resolution: string;
  units: string;
  description: string;
  appliedModules: string[];
  limitations: string;
  attribution: string;
}

export const AGENCY_RESOURCES: AgencyResource[] = [
  {
    id: 'lroc-quickmap',
    name: 'LROC QuickMap',
    agency: 'Arizona State University (ASU) / NASA LRO',
    url: 'https://quickmap.lroc.asu.edu/',
    integrationType: 'External Reference & Benchmark',
    isActiveDataset: false,
    isReferenceOnly: true,
    coordinateFrame: 'IAU 2015 Mean Earth/Polar Axis (ME) Selenographic (Lat/Lon)',
    timeSystem: 'UTC / Mission Elapsed Time',
    resolution: 'External web GIS reference (20 m/pixel LOLA polar DEM; 0.5–2 m/pixel NAC mosaics)',
    units: 'Meters (elevation relative to 1,737.4 km reference datum), Degrees (slope, azimuth)',
    description:
      'Provides empirical lunar laser altimetry (LOLA) and high-resolution camera imagery. LunarSight links directly to QuickMap coordinates for external visual verification. Predefined site parameters in LunarSight represent published reference benchmarks rather than live DEM queries.',
    appliedModules: ['3D Moon Map Links', 'Landing Site Comparison', 'Scientific Data Sources', 'Mission Reports'],
    limitations:
      'Reference only. LunarSight does not download, query, or sample live LOLA/USGS DEM raster grids in real time.',
    attribution: 'NASA / GSFC / Arizona State University Lunar Reconnaissance Orbiter Camera (LROC) Science Operations Center.',
  },
  {
    id: 'nasa-moon-trek',
    name: 'NASA Moon Trek',
    agency: 'NASA Solar System Treks Project / JPL',
    url: 'https://trek.nasa.gov/moon/',
    integrationType: 'Reference Validation',
    isActiveDataset: false,
    isReferenceOnly: true,
    coordinateFrame: 'IAU/IAG Lunar Coordinate Reference System (EPSG:104903 South Pole)',
    timeSystem: 'Static GIS reference basemaps & temporal illumination layers',
    resolution: 'Global 100 m/pixel basemap; regional South Pole merged LOLA-Kaguya up to 10 m/pixel',
    units: 'Orthometric elevation (meters), reflectance, slope gradient (degrees)',
    description:
      'Interactive GIS and 3D terrain exploration portal. Used strictly as a reference baseline to validate lunar massifs, crater morphology, and 3D elevation fidelity. Not mounted as a redundant 3D viewer to preserve lightweight browser performance.',
    appliedModules: ['3D Moon Map Validation', 'Site Comparison Feature Verification', 'Scientific Data Sources'],
    limitations:
      'Reference-only validation. Not embedded as an iframe or secondary WebGL context to prevent GPU thrashing and memory exhaustion.',
    attribution: 'NASA Solar System Treks Project, Jet Propulsion Laboratory, California Institute of Technology.',
  },
  {
    id: 'nasa-jpl-horizons',
    name: 'NASA JPL Horizons',
    agency: 'NASA Jet Propulsion Laboratory (JPL) SSD',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
    integrationType: 'API Ephemeris Service',
    isActiveDataset: true,
    isReferenceOnly: false,
    coordinateFrame: 'ICRF / J2000.0 (Inertial) & IAU Moon ME (Body-Fixed Topocentric)',
    timeSystem: 'Barycentric Dynamical Time (TDB) / Julian Date (JDTDB) / UTC',
    resolution: 'Analytical series expansion (DE440/DE421 series) & geocentric REST vector service',
    units: 'Kilometers (distance), km/s (velocity), Degrees (azimuth/elevation), Seconds (light-time)',
    description:
      'NASA Solar System Dynamics system providing planetary and lunar ephemerides (DE440/DE441). LunarSight utilizes an in-memory truncated analytical series expansion for zero-latency client-side surface observation, with live REST API integration for geocentric state vectors.',
    appliedModules: ['Sun Position Simulator', 'Earth Visibility Simulator', 'Communication Analyzer', 'Mission Reports'],
    limitations:
      'Topocentric calculations assume a spherical Moon (R=1,737.4 km), approximate physical libration, and UTC ≈ TDB. Client-side topocentric angles are analytical approximations, not direct sub-arcsecond Horizons vector integration outputs.',
    attribution: 'NASA / JPL Solar System Dynamics Group, California Institute of Technology.',
  },
  {
    id: 'csa-moon-exploration',
    name: 'CSA Moon Exploration',
    agency: 'Canadian Space Agency (CSA / ASC)',
    url: 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/',
    integrationType: 'Mission Context & Overview',
    isActiveDataset: false,
    isReferenceOnly: true,
    coordinateFrame: 'Lunar South Pole & Cislunar Space (NRHO / Gateway Orbit)',
    timeSystem: 'Artemis Program Timeline (2024–2030+)',
    resolution: 'Mission architecture & payload engineering specifications',
    units: 'N/A (Exploration & programmatic context)',
    description:
      'Highlights Canadian contributions to international lunar exploration: Canadian astronaut Jeremy Hansen on Artemis II, Canadarm3 autonomous robotics for Lunar Gateway, the Canadian Lunar Rover polar volatile mission, and LEAP science payloads.',
    appliedModules: ['Mission Overview & Dashboard', 'Mission Reports & Dossier', 'Scientific Data Sources'],
    limitations:
      'Programmatic and operational background context; does not provide direct continuous telemetry feeds.',
    attribution: 'Canadian Space Agency (CSA) / Government of Canada.',
  },
];

/**
 * Builds a direct LROC QuickMap deep link centered on specific lunar coordinates.
 */
export function getQuickMapCoordinatesUrl(latitude: number, longitude: number, zoomLevel: number = 6): string {
  // LROC QuickMap orthographic polar projection proj=10 for South Pole, proj=1 for equatorial
  const proj = latitude <= -60 ? 10 : latitude >= 60 ? 20 : 1;
  const dLat = 1.5;
  const dLon = 3.0;
  const extent = `${(longitude - dLon).toFixed(2)},${(latitude - dLat).toFixed(2)},${(longitude + dLon).toFixed(2)},${(latitude + dLat).toFixed(2)}`;
  return `https://quickmap.lroc.asu.edu/?extent=${extent}&proj=${proj}`;
}

/**
 * Builds a direct NASA Moon Trek deep link centered on specific lunar coordinates.
 */
export function getMoonTrekCoordinatesUrl(latitude: number, longitude: number): string {
  // NASA Moon Trek polar CRS EPSG:104903 for polar sites, global 2D for others
  const isPolar = latitude <= -60;
  if (isPolar) {
    return `https://trek.nasa.gov/moon/#v=0.1&x=${longitude.toFixed(3)}&y=${latitude.toFixed(3)}&z=6&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104903`;
  }
  return `https://trek.nasa.gov/moon/#v=0.1&x=${longitude.toFixed(3)}&y=${latitude.toFixed(3)}&z=5`;
}
