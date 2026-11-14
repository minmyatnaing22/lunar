'use client';

import React, { useMemo } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Globe2,
  Mountain,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
  Compass,
  Radio,
} from 'lucide-react';
import { generateHorizonProfile } from '@/lib/astronomy/earthVisibility';

export const EarthVisibilitySimulator: React.FC = () => {
  const { selectedSite, simulationDate } = useMission();

  // Generate 360-degree terrain horizon rim mask for radar sky plot
  const horizonProfile = useMemo(() => {
    return generateHorizonProfile(selectedSite.terrain);
  }, [selectedSite.terrain]);

  const earth = selectedSite.earthVisibility;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Feature 3
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Topocentric Horizon & Lunar Libration Geometry
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Earth Visibility Simulator : Horizon Line-of-Sight
          </h1>
        </div>

        {/* Visibility Status Badge */}
        <div
          className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 ${
            earth.hasDirectLineOfSight
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
              : earth.isBlockedByTerrain
              ? 'bg-amber-950/60 border-amber-700/80 text-amber-300'
              : 'bg-rose-950/60 border-rose-700/80 text-rose-300'
          }`}
        >
          {earth.hasDirectLineOfSight ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>DIRECT LINE-OF-SIGHT AVAILABLE</span>
            </>
          ) : earth.isBlockedByTerrain ? (
            <>
              <Mountain className="w-4 h-4 text-amber-400" />
              <span>BLOCKED BY SURROUNDING CRATER RIM</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-rose-400" />
              <span>BELOW GEOMETRIC HORIZON (FAR-SIDE/DIP)</span>
            </>
          )}
        </div>
      </div>

      {/* Critical Scientific Distinction Callout Banner */}
      <div className="p-4 rounded-xl border border-sky-800/60 bg-gradient-to-r from-sky-950/30 to-[#0c1322] flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-sky-300 uppercase font-mono tracking-wider">
            Crucial Scientific Distinction: Geometric vs. Terrain Horizon
          </div>
          <p className="text-slate-300 leading-relaxed">
            <strong>Geometric Visibility</strong> calculates whether Earth is mathematically above the horizontal plane tangent to the lunar sphere (0°).
            However, at the lunar south pole, surrounding crater rims can rise <strong>2° to 8°</strong> above the horizon. 
            If Earth sits at +1.5° geometric elevation while a crater rim rises to +3.2° in that direction, direct line of sight is <strong>physically blocked by rock and regolith</strong>!
          </p>
        </div>
      </div>

      {/* Two Column Grid: 360° Celestial Horizon Plot & Telemetry KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Celestial Horizon Radar / Sky Plot */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-800 bg-[#070a12] flex flex-col items-center justify-center min-h-[440px] relative overflow-hidden shadow-2xl">
          <div className="absolute top-4 left-4 text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Topocentric Horizon Polar Radar (Azimuth: 0°-360°, Elev: -5° to +20°)</span>
          </div>

          {/* SVG Radar Visualizer */}
          <div className="w-full max-w-[420px] aspect-square relative flex items-center justify-center mt-6">
            <svg viewBox="-120 -120 240 240" className="w-full h-full">
              {/* Radial Elevation Rings: +15°, +10°, +5°, 0° (Horizon), -5° */}
              <circle cx="0" cy="0" r="100" fill="none" stroke="#1e293b" strokeWidth="1" />
              <circle cx="0" cy="0" r="80" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="0" cy="0" r="60" fill="none" stroke="#1e293b" strokeWidth="1" />
              <circle cx="0" cy="0" r="40" fill="none" stroke="#1e293b" strokeWidth="1" />
              <circle cx="0" cy="0" r="20" fill="none" stroke="#1e293b" strokeWidth="1" />

              {/* Azimuth Axis Lines */}
              <line x1="-105" y1="0" x2="105" y2="0" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="-105" x2="0" y2="105" stroke="#1e293b" strokeWidth="1" />

              {/* Compass Labels */}
              <text x="0" y="-108" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">N (0°)</text>
              <text x="110" y="3" fill="#94a3b8" fontSize="8" textAnchor="start" fontFamily="monospace">E (90°)</text>
              <text x="0" y="115" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">S (180°)</text>
              <text x="-110" y="3" fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">W (270°)</text>

              {/* Crater Rim Topography Ring Profile (Polygon) */}
              <polygon
                points={horizonProfile
                  .map(pt => {
                    // Radius corresponds to elevation: 80 is 0 deg horizon, 20 is +15 deg
                    // r = 80 - (elev / 15) * 60
                    const rad = (pt.azimuth - 90) * (Math.PI / 180.0);
                    const r = 80 - (pt.rimElevationDeg / 15.0) * 60;
                    const x = r * Math.cos(rad);
                    const y = r * Math.sin(rad);
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="rgba(100, 116, 139, 0.15)"
                stroke="#64748b"
                strokeWidth="1.5"
              />

              {/* Earth Position Marker */}
              {(() => {
                const azRad = (earth.earthAzimuthDeg - 90) * (Math.PI / 180.0);
                // Clamp visual elevation between -5° and +20°
                const clampedElev = Math.max(-5, Math.min(20, earth.earthElevationDeg));
                const rEarth = 80 - (clampedElev / 15.0) * 60;
                const ex = rEarth * Math.cos(azRad);
                const ey = rEarth * Math.sin(azRad);

                return (
                  <g>
                    {/* Direction Vector line */}
                    <line x1="0" y1="0" x2={ex} y2={ey} stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1" strokeDasharray="2 2" />
                    
                    {/* Earth Disk with Blue Marble Glow */}
                    <circle
                      cx={ex}
                      cy={ey}
                      r="7"
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <circle cx={ex - 2} cy={ey - 2} r="2.5" fill="#38bdf8" />
                    
                    {/* Earth Label */}
                    <text
                      x={ex + 10}
                      y={ey + 3}
                      fill="#38bdf8"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      EARTH ({earth.earthElevationDeg > 0 ? `+${earth.earthElevationDeg}°` : `${earth.earthElevationDeg}°`})
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Plot Legend */}
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 mt-4 border-t border-slate-800/80 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-slate-400 border border-slate-400 border-dashed"></span>
              <span>Geometric Horizon (0°)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 bg-slate-600/30 border border-slate-500"></span>
              <span>Crater Rim Mask</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span>Earth Disk</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Telemetry KPI Cards */}
        <div className="space-y-4">
          {/* Earth Topocentric Coordinates */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3">
              Topocentric Earth Angles
            </div>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Elevation Angle:</span>
                <span className={`font-semibold ${earth.earthElevationDeg > 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                  {earth.earthElevationDeg > 0 ? `+${earth.earthElevationDeg.toFixed(2)}°` : `${earth.earthElevationDeg.toFixed(2)}°`}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Azimuth Bearing:</span>
                <span className="font-semibold text-white">{earth.earthAzimuthDeg.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Apparent Angular Size:</span>
                <span className="font-semibold text-white">{earth.apparentEarthAngularDiameterDeg.toFixed(2)}°</span>
              </div>
            </div>
          </div>

          {/* Lunar Libration Telemetry */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3">
              Lunar Libration Dynamics
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Because of the Moon&apos;s elliptical orbit and axial inclination, Earth bobbles up and down by up to ±6.7° latitudinally and ±8° longitudinally over a 27.3-day draconic month.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Lon Libration (l)</div>
                <div className="font-semibold text-amber-400">
                  {earth.librationLonDeg > 0 ? `+${earth.librationLonDeg}°` : `${earth.librationLonDeg}°`}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Lat Libration (b)</div>
                <div className="font-semibold text-amber-400">
                  {earth.librationLatDeg > 0 ? `+${earth.librationLatDeg}°` : `${earth.librationLatDeg}°`}
                </div>
              </div>
            </div>
          </div>

          {/* Earth Phase in Lunar Sky */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
              Earth Phase Seen from Moon
            </div>
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Phase Name:</span>
              <span className="text-white font-semibold">{earth.earthPhase}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400">Illuminated Fraction:</span>
              <span className="text-sky-400 font-semibold">{Math.round(earth.phaseFraction * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round(earth.phaseFraction * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
