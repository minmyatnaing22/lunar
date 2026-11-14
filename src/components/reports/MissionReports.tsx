'use client';

import React, { useState } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Compass,
  Sun,
  Globe2,
  Radio,
  Mountain,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { evaluateSiteSuitability } from '@/lib/astronomy/suitability';

export const MissionReports: React.FC = () => {
  const {
    selectedSite,
    simulationDate,
    missionPriorities,
    simulationState,
    savedSites,
  } = useMission();

  const [copied, setCopied] = useState(false);
  const currentBreakdown = evaluateSiteSuitability(selectedSite, missionPriorities);

  // Export JSON dossier
  const handleExportJSON = () => {
    const reportData = {
      missionTitle: 'LunarSight Lunar Mission Planning Dossier',
      generatedAtUTC: new Date().toISOString(),
      simulationTimestampUTC: simulationDate.toISOString(),
      targetSite: {
        id: selectedSite.id,
        name: selectedSite.name,
        region: selectedSite.region,
        latitudeDeg: selectedSite.latitude,
        longitudeDeg: selectedSite.longitude,
        elevationMeters: selectedSite.elevationMeters,
        terrain: selectedSite.terrain,
      },
      analysisResults: {
        sunlight: selectedSite.sunlight,
        earthVisibility: selectedSite.earthVisibility,
        communication: selectedSite.communication,
        suitability: currentBreakdown,
      },
      missionPriorities,
      assumptionsAndDataSources: {
        ephemerisModel: 'JPL DE440/DE421 analytical planetary series',
        topographyModel: 'NASA LRO LOLA DEM (1,737.4 km lunar datum)',
        cartographicStandards: 'IAU WGCCTR Working Group',
        dsnGroundNetwork: 'Goldstone (USA), Madrid (Spain), Canberra (Australia)',
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LunarSight_${selectedSite.id}_${simulationDate.toISOString().substring(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy plain text summary to clipboard
  const handleCopyText = () => {
    const text = `LUNARSIGHT MISSION DOSSIER
=========================================
Target Landing Site: ${selectedSite.name}
Coordinates: ${Math.abs(selectedSite.latitude).toFixed(3)}°S, ${selectedSite.longitude.toFixed(3)}°E
Elevation: ${selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters}m` : `${selectedSite.elevationMeters}m`} (Datum: 1737.4 km)
Terrain Slope: ${selectedSite.terrain.slopeDegrees.toFixed(1)}°
Simulation Date: ${simulationDate.toISOString().replace('T', ' ').substring(0, 19)} UTC

1. SUNLIGHT ANALYSIS:
- Illumination State: ${selectedSite.sunlight.isIlluminated ? 'DIRECT SUNLIGHT' : 'TERRAIN SHADOW'}
- Solar Elevation: ${selectedSite.sunlight.solarElevationDeg}°
- Solar Azimuth: ${selectedSite.sunlight.solarAzimuthDeg}°
- Predicted Monthly Illumination: ${selectedSite.sunlight.predictedIlluminationPercent}%
- Solar Irradiance: ${selectedSite.sunlight.solarFluxWm2} W/m²

2. EARTH VISIBILITY:
- Line of Sight: ${selectedSite.earthVisibility.hasDirectLineOfSight ? 'AVAILABLE' : 'OCCLUDED/BELOW HORIZON'}
- Earth Apparent Elevation: ${selectedSite.earthVisibility.earthElevationDeg}°
- Lunar Libration: l=${selectedSite.earthVisibility.librationLonDeg}°, b=${selectedSite.earthVisibility.librationLatDeg}°
- Earth Phase: ${selectedSite.earthVisibility.earthPhase} (${Math.round(selectedSite.earthVisibility.phaseFraction * 100)}%)

3. COMMUNICATION (DSN):
- DTE Availability: ${selectedSite.communication.directCommsAvailabilityPercent}%
- Round-Trip Latency: ${selectedSite.communication.roundTripLatencySeconds} s
- Active Tracking Station: ${selectedSite.communication.activeDsnStation || 'Relay Supported'}
- Longest Blackout: ${selectedSite.communication.longestBlackoutHours} hrs

4. MCDA SUITABILITY SCORE: ${currentBreakdown.overallScore} / 100
Verdict: ${currentBreakdown.verdict}
Justification: ${currentBreakdown.justification}
=========================================
Data Source: NASA LRO LOLA / JPL DE440
LunarSight - NASA Space Apps Challenge`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header & Print/Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Feature 6
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Mission Synthesis Dossier
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Scientific Mission Planning Report
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Dossier'}</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="p-8 rounded-xl border border-slate-800 bg-[#090d16] space-y-6 shadow-2xl text-slate-200 print:bg-white print:text-black print:p-0 print:border-none">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-semibold mb-1">
              NASA Space Apps Challenge — Flight Planning Document
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white print:text-black">
              LUNARSIGHT EXPLORATION BRIEFING
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Ref: LS-ARTEMIS-{selectedSite.id.toUpperCase()} • Generated: {new Date().toUTCString()}
            </p>
          </div>
          <div className="text-right font-mono text-xs text-slate-400">
            <div>Epoch: J2000.0 / UTC</div>
            <div>Datum: Lunar Sphere 1,737.4 km</div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
            1. Executive Target Summary
          </h3>
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 print:bg-slate-100 print:border-slate-300">
            <div className="text-base font-bold text-white print:text-black mb-1">
              {selectedSite.name} ({selectedSite.region})
            </div>
            <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed">
              {selectedSite.description} {selectedSite.scientificSignificance}
            </p>
          </div>
        </div>

        {/* Section 2: Coordinates & Topography Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
            2. Selenographic Coordinates & Terrain Profile
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <div className="text-slate-400 text-[10px]">Latitude</div>
              <div className="font-semibold text-white print:text-black">{Math.abs(selectedSite.latitude).toFixed(4)}° S</div>
            </div>
            <div className="p-3 rounded bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <div className="text-slate-400 text-[10px]">Longitude</div>
              <div className="font-semibold text-white print:text-black">{selectedSite.longitude.toFixed(4)}° E</div>
            </div>
            <div className="p-3 rounded bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <div className="text-slate-400 text-[10px]">LOLA Elevation</div>
              <div className="font-semibold text-amber-400">
                {selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters} m` : `${selectedSite.elevationMeters} m`}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <div className="text-slate-400 text-[10px]">Surface Slope</div>
              <div className="font-semibold text-white print:text-black">{selectedSite.terrain.slopeDegrees.toFixed(1)}°</div>
            </div>
          </div>
        </div>

        {/* Section 3: Environmental Analysis */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
            3. Environmental & Telecommunications Matrix
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            {/* Sunlight */}
            <div className="p-3.5 rounded bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300 space-y-1.5">
              <div className="text-amber-400 font-bold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" /> Sunlight Parameters
              </div>
              <div>State: <span className="text-white print:text-black font-semibold">{selectedSite.sunlight.isIlluminated ? 'Illuminated' : 'Shadow'}</span></div>
              <div>Elevation: {selectedSite.sunlight.solarElevationDeg}°</div>
              <div>Predicted Monthly Illum: {selectedSite.sunlight.predictedIlluminationPercent}%</div>
              <div>Max Dark Span: {selectedSite.sunlight.longestContinuousDarkHours} hrs</div>
            </div>

            {/* Earth */}
            <div className="p-3.5 rounded bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300 space-y-1.5">
              <div className="text-sky-400 font-bold flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" /> Earth Visibility
              </div>
              <div>Direct LOS: <span className="text-white print:text-black font-semibold">{selectedSite.earthVisibility.hasDirectLineOfSight ? 'Clear' : 'Occluded'}</span></div>
              <div>Apparent Elevation: {selectedSite.earthVisibility.earthElevationDeg}°</div>
              <div>Phase: {selectedSite.earthVisibility.earthPhase} ({Math.round(selectedSite.earthVisibility.phaseFraction * 100)}%)</div>
              <div>Libration: l={selectedSite.earthVisibility.librationLonDeg}°, b={selectedSite.earthVisibility.librationLatDeg}°</div>
            </div>

            {/* Comms */}
            <div className="p-3.5 rounded bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300 space-y-1.5">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> DSN Communications
              </div>
              <div>DTE Window Duty: {selectedSite.communication.directCommsAvailabilityPercent}%</div>
              <div>Active Station: {selectedSite.communication.activeDsnStation || 'None'}</div>
              <div>Light Transit RTT: {selectedSite.communication.roundTripLatencySeconds} s</div>
              <div>L2 Relay Link: {selectedSite.communication.isRelaySupported ? 'Connected' : 'Unavailable'}</div>
            </div>
          </div>
        </div>

        {/* Section 4: Suitability Scoring & Explainability */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
            4. Multi-Criteria Suitability Breakdown
          </h3>
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 print:bg-slate-100 print:border-slate-300 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xs font-mono">Overall Suitability Score: </span>
                <span className="text-xl font-bold font-mono text-sky-400">{currentBreakdown.overallScore} / 100</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                {currentBreakdown.verdict}
              </span>
            </div>
            <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed font-sans">
              {currentBreakdown.justification}
            </p>
          </div>
        </div>

        {/* Section 5: Assumptions, Constraints & Citations */}
        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono print:text-slate-600">
          <div className="font-bold text-slate-300 print:text-slate-800">Assumptions & Limitations:</div>
          <div>• Solar and Earth positions calculated using simplified analytical expansions of the JPL DE440 ephemeris.</div>
          <div>• Topographic obstruction is computed against 8-point local crater rim elevation masks derived from USGS/LRO LOLA DEMs.</div>
          <div>• Geometric line-of-sight is necessary but does not account for local multipath interference or dynamic DSN ground scheduling constraints.</div>
          <div>• Relay satellite calculations represent a simulated halo orbit around the Earth-Moon L2 Lagrangian point.</div>
        </div>
      </div>
    </div>
  );
};
