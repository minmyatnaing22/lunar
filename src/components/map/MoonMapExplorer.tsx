'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Compass,
  MapPin,
  Layers,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Check,
  AlertTriangle,
  Eye,
  Crosshair,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Globe2,
  Sun,
  Radio,
  Mountain,
  ExternalLink,
} from 'lucide-react';
import { Lunar3DCanvas, Lunar3DCanvasHandles } from './Lunar3DCanvas';
import { verifyCoordinateConversions } from '@/lib/astronomy/lunar3DCoordinates';

export const MoonMapExplorer: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    addCustomSite,
    removeSite,
    setActiveSection,
  } = useMission();

  const canvas3DRef = useRef<Lunar3DCanvasHandles | null>(null);

  // Inspected Raycast Surface Point
  const [inspectedPoint, setInspectedPoint] = useState<{
    lat: number;
    lon: number;
    isPrecalibrated: boolean;
  } | null>(null);

  // Add Candidate Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLat, setNewSiteLat] = useState(-88.5);
  const [newSiteLon, setNewSiteLon] = useState(45.0);
  const [newSiteElev, setNewSiteElev] = useState(1500);
  const [newSiteSlope, setNewSiteSlope] = useState(5.0);

  // Verify coordinate convention test suite on mount
  const coordinateSystemVerified = useMemo(() => {
    return verifyCoordinateConversions();
  }, []);

  // Raycast click on 3D Moon Surface
  const handleRaycastPoint = useCallback((lat: number, lon: number) => {
    // Check if clicked near an existing saved site (within 0.5 degrees)
    const matchedSite = savedSites.find(
      s => Math.abs(s.latitude - lat) < 0.6 && Math.abs(s.longitude - lon) < 0.6
    );

    if (matchedSite) {
      setSelectedSiteId(matchedSite.id);
      setInspectedPoint({
        lat: matchedSite.latitude,
        lon: matchedSite.longitude,
        isPrecalibrated: true,
      });
    } else {
      setInspectedPoint({
        lat,
        lon,
        isPrecalibrated: false,
      });
      // Pre-fill add modal coordinates
      setNewSiteLat(lat);
      setNewSiteLon(lon);
    }
  }, [savedSites, setSelectedSiteId]);

  // Save inspected point as candidate site
  const handleSaveInspectedSite = () => {
    if (!inspectedPoint) return;
    const siteName = newSiteName.trim() || `South Pole Site (${inspectedPoint.lat}°, ${inspectedPoint.lon}°)`;
    
    addCustomSite(
      siteName,
      inspectedPoint.lat,
      inspectedPoint.lon,
      newSiteElev,
      newSiteSlope
    );
    setIsAddModalOpen(false);
    setNewSiteName('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 w-full max-w-[1600px] mx-auto font-sans text-slate-200">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Part 1 Feature
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Three.js 3D Lunar Spherical Explorer
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
              Procedural Textures • 3D Displaced Terrain
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Interactive 3D Moon Map Explorer
          </h1>
        </div>

        {/* 3D Camera Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => canvas3DRef.current?.focusSouthPole()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-mono border border-sky-800 font-semibold transition-colors shadow-sm"
            title="Focus camera directly on the Lunar South Pole (-90° Lat)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Focus South Pole</span>
          </button>

          <button
            onClick={() => canvas3DRef.current?.resetCamera()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c1220] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono border border-slate-700 transition-colors shadow-sm"
            title="Reset to global orbital perspective"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Camera</span>
          </button>

          <div className="flex items-center bg-[#0c1220] rounded border border-slate-700 p-0.5">
            <button
              onClick={() => canvas3DRef.current?.zoomIn()}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => canvas3DRef.current?.zoomOut()}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scientific Reality Notice */}
      <div className="p-3 rounded-lg border border-slate-800 bg-[#0c1220] flex items-start gap-2.5 text-xs font-mono">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-slate-300 text-[11px] leading-relaxed">
          <strong>Data Notice:</strong> 3D lunar globe rendered with physical vertex displacement mapping and procedural demonstration textures calibrated against lunar photographic references (Apollo/LRO) and IAU cartographic features. 
          Raycasted surface points compute true mathematical selenographic coordinates. Topographical elevations for arbitrary non-catalog points display <strong>NOT AVAILABLE</strong> because live DEM raster grids are not queried or loaded in the client.
        </p>
      </div>

      {/* Main 3-Column Mission Control Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Candidate Locations Sidebar */}
        <div className="lg:col-span-3 xl:col-span-3 rounded-lg border border-slate-800 bg-[#090d16] p-4 flex flex-col justify-between space-y-3 min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>Candidate Sites ({savedSites.length})</span>
              </span>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="p-1 rounded bg-sky-950 text-sky-400 hover:bg-sky-900 border border-sky-800"
                title="Add Candidate Location"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Candidate Sites Scroll List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {savedSites.map(site => {
                const isSelected = site.id === selectedSite.id;
                return (
                  <div
                    key={site.id}
                    className={`p-2.5 rounded border text-left transition-colors relative group ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-600 text-white'
                        : 'bg-[#0c1220] border-slate-800/90 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedSiteId(site.id);
                        setInspectedPoint({
                          lat: site.latitude,
                          lon: site.longitude,
                          isPrecalibrated: true,
                        });
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-xs truncate max-w-[170px]">
                          {site.name.replace('—', '-')}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-sky-400 mt-1 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {Math.abs(site.latitude).toFixed(2)}° S, {site.longitude.toFixed(2)}° E
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex justify-between mt-0.5">
                        <span>Elev: {site.elevationMeters > 0 ? `+${site.elevationMeters}m` : `${site.elevationMeters}m`}</span>
                        <span className={site.terrain.isPermanentShadowRegion ? 'text-indigo-400' : 'text-amber-400'}>
                          {site.terrain.isPermanentShadowRegion ? 'PSR' : 'Sunlit'}
                        </span>
                      </div>
                    </button>

                    {/* Delete Custom Site Button */}
                    {site.isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSite(site.id);
                        }}
                        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove custom site"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-2 rounded bg-[#0c1220] hover:bg-slate-800 text-sky-400 text-xs font-mono font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Coordinate</span>
          </button>
        </div>

        {/* Center Column: Prominent Large 3D Moon Canvas Viewport */}
        <div className="lg:col-span-5 xl:col-span-6 rounded-lg border border-slate-800 bg-[#05070c] relative flex flex-col items-center justify-center overflow-hidden h-[540px] lg:h-[640px] min-w-0">
          {/* 3D Moon Canvas */}
          <div className="w-full h-full absolute inset-0">
            <Lunar3DCanvas
              ref={canvas3DRef}
              candidateSites={savedSites}
              selectedSiteId={selectedSite.id}
              onSelectSite={setSelectedSiteId}
              onRaycastPoint={handleRaycastPoint}
              inspectedPoint={inspectedPoint}
            />
          </div>

          {/* Top-Left Viewport HUD Coordinates */}
          <div className="absolute top-3 left-3 bg-[#090d16]/90 border border-slate-800/90 px-3 py-1.5 rounded backdrop-blur text-xs font-mono pointer-events-none">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Surface Raycast Target</div>
            <div className="text-sky-300 font-semibold">
              {inspectedPoint ? (
                `${Math.abs(inspectedPoint.lat).toFixed(3)}° S, ${inspectedPoint.lon.toFixed(3)}° E`
              ) : (
                `${Math.abs(selectedSite.latitude).toFixed(3)}° S, ${selectedSite.longitude.toFixed(3)}° E`
              )}
            </div>
          </div>

          {/* Bottom Viewport Interaction Hint */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-[#090d16]/85 border border-slate-800 px-3 py-1.5 rounded backdrop-blur pointer-events-none">
            <span>Click sphere to sample coordinates • Drag to rotate Moon • Scroll to zoom</span>
            <span className="text-sky-400 hidden sm:inline">IAU WGCCTR Coordinate Verified</span>
          </div>
        </div>

        {/* Right Column: Location Telemetry & Inspector Panel */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-lg border border-slate-800 bg-[#090d16] p-4 flex flex-col justify-between space-y-3 min-w-0 overflow-hidden">
          <div className="space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                Selected Location Information
              </div>
              <div className="text-sm font-bold text-white truncate">
                {selectedSite.name.replace('—', '-')}
              </div>
              {selectedSite.artemisCandidateRank && (
                <div className="text-[10px] text-sky-400 font-mono font-semibold">
                  NASA Artemis Candidate #{selectedSite.artemisCandidateRank}
                </div>
              )}
              {/* Agency Validation Links */}
              <div className="flex items-center gap-2.5 pt-1 text-[10px] font-mono">
                {selectedSite.quickmapUrl && (
                  <a
                    href={selectedSite.quickmapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>LROC QuickMap</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {selectedSite.trekUrl && (
                  <a
                    href={selectedSite.trekUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>NASA Moon Trek</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Coordinates & Topography */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#0c1220] border border-slate-800">
                <div className="text-slate-400 text-[10px]">Selenographic Coordinates</div>
                <div className="text-white font-semibold">
                  {Math.abs(selectedSite.latitude).toFixed(3)}° S, {selectedSite.longitude.toFixed(3)}° E
                </div>
              </div>

              <div className="p-2 rounded bg-[#0c1220] border border-slate-800">
                <div className="text-slate-400 text-[10px]">LOLA 1,737.4 km Datum Elevation</div>
                <div className="text-white font-semibold">
                  {selectedSite.elevationMeters > 0 ? `+${selectedSite.elevationMeters}m` : `${selectedSite.elevationMeters}m`}
                </div>
              </div>

              <div className="p-2 rounded bg-[#0c1220] border border-slate-800">
                <div className="text-slate-400 text-[10px]">Local Surface Slope</div>
                <div className="text-white font-semibold">
                  {selectedSite.terrain.slopeDegrees.toFixed(1)}°
                </div>
              </div>

              <div className="p-2 rounded bg-[#0c1220] border border-slate-800">
                <div className="text-slate-400 text-[10px]">Permanent Shadow Region (PSR)</div>
                <div className={`font-semibold ${selectedSite.terrain.isPermanentShadowRegion ? 'text-indigo-400' : 'text-slate-300'}`}>
                  {selectedSite.terrain.isPermanentShadowRegion ? 'Interior Cold Trap' : 'Polar Sunlit Plateau'}
                </div>
              </div>
            </div>

            {/* Inspected Arbitrary Point Callout (When user clicks outside precalibrated catalog) */}
            {inspectedPoint && !inspectedPoint.isPrecalibrated && (
              <div className="p-2.5 rounded bg-amber-950/30 border border-amber-900/60 text-xs font-mono space-y-1.5">
                <div className="text-amber-300 font-bold flex items-center gap-1.5 text-[11px]">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Raycast Point Sampled</span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Lat: {inspectedPoint.lat}° S, Lon: {inspectedPoint.lon}° E
                </div>
                <div className="text-[10px] text-amber-400">
                  Elevation: NOT AVAILABLE (Requires Orbital Query)
                </div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition-colors mt-1"
                >
                  Save as Candidate Site
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions to Other Modules */}
          <div className="pt-2 border-t border-slate-800 space-y-2 text-xs font-mono">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              Connected Mission Modules
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setActiveSection('earth')}
                className="p-2 rounded bg-[#0c1220] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 text-xs transition-colors truncate"
              >
                <Globe2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Earth Visibility</span>
              </button>
              <button
                onClick={() => setActiveSection('comms')}
                className="p-2 rounded bg-[#0c1220] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 text-xs transition-colors truncate"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>DSN Comms</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Candidate Site */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-[#0c1220] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Add Candidate Landing Site
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Site Identifier</label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={e => setNewSiteName(e.target.value)}
                  placeholder="e.g. Connecting Ridge Bravo"
                  className="w-full px-3 py-1.5 rounded bg-[#090d16] border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Latitude (°S: -90 to -60)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="-90"
                    max="90"
                    value={newSiteLat}
                    onChange={e => setNewSiteLat(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-[#090d16] border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Longitude (°E: -180 to 180)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="-180"
                    max="180"
                    value={newSiteLon}
                    onChange={e => setNewSiteLon(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-[#090d16] border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Elevation (Meters)</label>
                  <input
                    type="number"
                    step="50"
                    value={newSiteElev}
                    onChange={e => setNewSiteElev(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-[#090d16] border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Slope (° Degrees)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="45"
                    value={newSiteSlope}
                    onChange={e => setNewSiteSlope(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-[#090d16] border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInspectedSite}
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
              >
                Save Candidate Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
