// LunarSight - Multi-Criteria Decision Analysis (MCDA) Landing Site Suitability Engine
// Transparent scoring and explainable recommendation based on mission priorities.

import { CandidateLandingSite, MissionPriorities, SuitabilityBreakdown } from '@/types/mission';

/**
 * Calculates normalized suitability score (0 - 100) and produces an explainable engineering dossier
 */
export function evaluateSiteSuitability(
  site: CandidateLandingSite,
  priorities: MissionPriorities
): SuitabilityBreakdown {
  // Normalize priorities to sum to 1.0 (to avoid arbitrary scaling)
  const totalWeight =
    (priorities.sunlightWeight || 1) +
    (priorities.communicationWeight || 1) +
    (priorities.terrainSafetyWeight || 1) +
    (priorities.waterIcePotentialWeight || 1);

  const wSun = priorities.sunlightWeight / totalWeight;
  const wComms = priorities.communicationWeight / totalWeight;
  const wTerrain = priorities.terrainSafetyWeight / totalWeight;
  const wIce = priorities.waterIcePotentialWeight / totalWeight;

  // 1. Sunlight Score (0 - 100)
  // Evaluates % predicted illumination and penalty for prolonged continuous darkness
  let sunlightScore = site.sunlight.predictedIlluminationPercent;
  if (site.terrain.isPermanentShadowRegion) {
    sunlightScore = 0;
  } else if (site.sunlight.isIlluminated) {
    sunlightScore = Math.min(100, sunlightScore + 10);
  }

  // 2. Communication Score (0 - 100)
  // Direct Earth visibility is primary; relay support provides a secondary baseline
  let commsScore = site.communication.directCommsAvailabilityPercent;
  if (site.communication.hasDirectEarthLOS) {
    commsScore = Math.min(100, commsScore + 15);
  }
  if (site.communication.isRelaySupported) {
    commsScore = Math.max(commsScore, 65); // Relay ensures at least 65 score
  }

  // 3. Terrain Safety Score (0 - 100)
  // NASA landing criteria: slope < 5 deg is ideal (100 pts), 5-10 deg acceptable (70 pts), > 15 deg hazardous (< 30 pts)
  const slope = site.terrain.slopeDegrees;
  let terrainSafetyScore = 100;
  if (slope <= 4.0) {
    terrainSafetyScore = 95 - slope * 2;
  } else if (slope <= 10.0) {
    terrainSafetyScore = 80 - (slope - 4) * 6;
  } else if (slope <= 15.0) {
    terrainSafetyScore = 45 - (slope - 10) * 5;
  } else {
    terrainSafetyScore = Math.max(10, 20 - (slope - 15) * 2);
  }

  // Surface roughness penalty
  if (site.terrain.roughnessMeters > 1.5) {
    terrainSafetyScore = Math.max(10, terrainSafetyScore - 15);
  }

  // 4. Water Ice / Resource Exploration Score (0 - 100)
  // Evaluates proximity to cold traps / Permanently Shadowed Regions (PSRs)
  let waterIceScore = 20;
  if (site.terrain.isPermanentShadowRegion) {
    waterIceScore = 100; // Directly inside a cold trap
  } else if (Math.abs(site.latitude) > 87.0) {
    waterIceScore = 85; // Adjacent to deep polar craters (Shackleton, Haworth, Shoemaker)
  } else if (Math.abs(site.latitude) > 84.0) {
    waterIceScore = 65; // High polar latitude with nearby micro-cold traps
  } else {
    waterIceScore = 15; // Equatorial or low-latitude site with negligible surface volatile potential
  }

  // Overall Weighted Score:
  const rawOverall =
    sunlightScore * wSun +
    commsScore * wComms +
    terrainSafetyScore * wTerrain +
    waterIceScore * wIce;

  const overallScore = Math.round(Math.max(0, Math.min(100, rawOverall)) * 10) / 10;

  // Determine Mission Verdict
  let verdict: SuitabilityBreakdown['verdict'] = 'Feasible with Constraints';
  if (overallScore >= 75) {
    verdict = 'Highly Recommended';
  } else if (overallScore < 50 || terrainSafetyScore < 35) {
    verdict = 'High Risk / Severe Constraints';
  }

  // Qualitative engineering rationale and risk breakdown
  const keyAdvantages: string[] = [];
  const operationalRisks: string[] = [];

  if (sunlightScore >= 70) {
    keyAdvantages.push(`High persistent illumination (${Math.round(site.sunlight.predictedIlluminationPercent)}%), maximizing solar power generation.`);
  } else if (sunlightScore <= 30) {
    operationalRisks.push(`Severe cryogenic dark periods. Requires active Radioisotope Heater Units (RHUs) or large secondary battery reserves.`);
  } else {
    operationalRisks.push(`Moderate illumination (${Math.round(site.sunlight.predictedIlluminationPercent)}%). Power generation varies cyclically with terrain shadows.`);
  }

  // Low grazing sun limitation for all polar sites
  if (Math.abs(site.latitude) >= 80.0 && !site.terrain.isPermanentShadowRegion) {
    operationalRisks.push(`Low solar grazing angle (elevation < 2.0°) casts elongated shadows; solar arrays must be mounted vertically on elevated masts.`);
  }

  if (commsScore >= 75) {
    keyAdvantages.push(`Continuous or near-continuous Direct-to-Earth (DTE) radio contact with DSN tracking complexes.`);
  } else if (!site.communication.hasDirectEarthLOS) {
    operationalRisks.push(`Direct Earth optical LOS occluded by crater topography. Communication requires an operational L2 halo relay satellite.`);
  } else {
    operationalRisks.push(`Direct-to-Earth radio link subject to periodic occlusion during lunar libration cycle troughs.`);
  }

  if (terrainSafetyScore >= 75) {
    keyAdvantages.push(`Favorable landing slope (${site.terrain.slopeDegrees.toFixed(1)}°) provides generous margin against static tip-over (< 10° limit).`);
  } else {
    operationalRisks.push(`Elevated terrain slope (${site.terrain.slopeDegrees.toFixed(1)}°) increases landing gear shear loads and hazard avoidance propellant consumption.`);
  }

  if (waterIceScore >= 80) {
    keyAdvantages.push(`Immediate proximity to Permanently Shadowed Region (PSR) cryogenic cold traps for volatile and water-ice prospecting.`);
  } else {
    operationalRisks.push(`Distance to cryogenic cold traps requires extended rover traverses across rugged polar terrain for volatile sampling.`);
  }

  // Construct transparent justification narrative
  const justification = `Candidate site '${site.name}' scores ${overallScore}/100 under current mission weighting. ` +
    (site.terrain.isPermanentShadowRegion
      ? `Being inside a Permanent Shadow Region provides maximum volatile science (Score: ${waterIceScore}), but incurs total solar blackout (Score: 0). `
      : `High polar elevation (+${site.terrain.elevationMeters}m) provides ${Math.round(site.sunlight.predictedIlluminationPercent)}% solar exposure and ${site.communication.directCommsAvailabilityPercent}% DTE visibility. `) +
    `Terrain slope is ${site.terrain.slopeDegrees.toFixed(1)}° (${terrainSafetyScore >= 70 ? 'acceptable for automated hazard-tolerant landing gears' : 'requires active hazard avoidance'}).`;

  return {
    siteId: site.id,
    siteName: site.name,
    overallScore,
    sunlightScore: Math.round(sunlightScore * 10) / 10,
    communicationScore: Math.round(commsScore * 10) / 10,
    terrainSafetyScore: Math.round(terrainSafetyScore * 10) / 10,
    waterIceScore: Math.round(waterIceScore * 10) / 10,
    verdict,
    keyAdvantages,
    operationalRisks,
    justification,
  };
}

/**
 * Ranks all candidate sites and highlights the recommended winner with comparative reason
 */
export function rankCandidateSites(
  sites: CandidateLandingSite[],
  priorities: MissionPriorities
): {
  rankedBreakdowns: SuitabilityBreakdown[];
  recommendedSiteId: string;
  recommendationReason: string;
} {
  const breakdowns = sites.map(site => evaluateSiteSuitability(site, priorities));

  // Sort descending by overallScore
  breakdowns.sort((a, b) => b.overallScore - a.overallScore);

  const winner = breakdowns[0];
  const runnerUp = breakdowns[1];

  let reason = '';
  if (winner) {
    if (runnerUp) {
      const scoreDiff = (winner.overallScore - runnerUp.overallScore).toFixed(1);
      reason = `${winner.siteName} is ranked #1 (Score: ${winner.overallScore}), outperforming ${runnerUp.siteName} by +${scoreDiff} points. ${winner.keyAdvantages[0] || ''}`;
    } else {
      reason = `${winner.siteName} is the sole evaluated candidate with an overall score of ${winner.overallScore}/100.`;
    }
  }

  return {
    rankedBreakdowns: breakdowns,
    recommendedSiteId: winner ? winner.siteId : '',
    recommendationReason: reason,
  };
}
