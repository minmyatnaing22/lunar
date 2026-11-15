'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Compass,
  MapPin,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info,
  Check,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Globe2,
} from 'lucide-react';
import { Lunar3DCanvas, Lunar3DCanvasHandles } from '@/components/map/Lunar3DCanvas';
import { CandidateLandingSite } from '@/types/mission';
import { getQuickMapCoordinatesUrl, getMoonTrekCoordinatesUrl } from '@/lib/astronomy/agencyResources';

export const Step1LocationSelection: React.FC = () => {
  const {
    savedSites,
    candidateSiteIds,
    addCandidateSiteId,
    removeCandidateSiteId,
    replaceCandidateSiteId,
    candidateSites,
    selectedSite,
    setSelectedSiteId,
    addCustomSite,
    setWorkflowStep,
  } = useMission();

  const canvasRef = useRef<Lunar3DCanvasHandles | null>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Inspected Raycast Surface Point
  const [inspectedPoint, setInspectedPoint] = useState<{
    lat: number;
    lon: number;
    name?: string;
    site?: CandidateLandingSite;
    isPredefined: boolean;
  } | null>(() => {
    return {
      lat: selectedSite.latitude,
      lon: selectedSite.longitude,
      name: selectedSite.name,
      site: selectedSite,
      isPredefined: true,
    };
  });

  // Custom coordinate input modal/drawer
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState(-88.5);
  const [customLon, setCustomLon] = useState(45.0);
  const [customElev, setCustomElev] = useState<number | ''>(1200);
  const [customSlope, setCustomSlope] = useState<number | ''>(5.0);

  // Autocomplete / Search filtering
  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return savedSites.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [searchQuery, savedSites]);

  // Raycast click on 3D Moon Surface
  const handleRaycastPoint = useCallback(
    (lat: number, lon: number) => {
      // Find if clicked near an existing saved site (within 0.8 degrees)
      const matchedSite = savedSites.find(
        s => Math.abs(s.latitude - lat) < 0.8 && Math.abs(s.longitude - lon) < 0.8
      );

      if (matchedSite) {
        setSelectedSiteId(matchedSite.id);
        setInspectedPoint({
          lat: matchedSite.latitude,
          lon: matchedSite.longitude,
          name: matchedSite.name,
          site: matchedSite,
          isPredefined: true,
        });
        canvasRef.current?.focusCoordinates(matchedSite.latitude, matchedSite.longitude);
      } else {
        const generatedName = `Lunar Surface Point (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
        setInspectedPoint({
          lat,
          lon,
          name: generatedName,
          site: undefined,
          isPredefined: false,
        });
        // Prepopulate custom modal in case user wants to save with details
        setCustomName(generatedName);
        setCustomLat(lat);
        setCustomLon(lon);
      }
    },
    [savedSites, setSelectedSiteId]
  );

  // Handle selecting a site from search or preset list
  const handleSelectSite = useCallback(
    (site: CandidateLandingSite) => {
      setSelectedSiteId(site.id);
      setInspectedPoint({
        lat: site.latitude,
        lon: site.longitude,
        name: site.name,
        site,
        isPredefined: true,
      });
      setSearchQuery('');
      setIsSearchFocused(false);
      canvasRef.current?.focusCoordinates(site.latitude, site.longitude);
    },
    [setSelectedSiteId]
  );

  // Add currently inspected point to candidates
  const handleAddInspectedToCandidates = () => {
    if (!inspectedPoint) return;

    if (inspectedPoint.site) {
      addCandidateSiteId(inspectedPoint.site.id);
    } else {
      // Create custom site from clicked coordinates
      const elev = typeof customElev === 'number' ? customElev : 0;
      const slope = typeof customSlope === 'number' ? customSlope : 5;
      const newSite = addCustomSite(
        inspectedPoint.name || `Point (${inspectedPoint.lat.toFixed(2)}°, ${inspectedPoint.lon.toFixed(2)}°)`,
        inspectedPoint.lat,
        inspectedPoint.lon,
        elev,
        slope
      );
      setInspectedPoint({
        lat: newSite.latitude,
        lon: newSite.longitude,
        name: newSite.name,
        site: newSite,
        isPredefined: false,
      });
    }
  };

  const isInspectedAlreadyCandidate = useMemo(() => {
    if (!inspectedPoint?.site) return false;
    return candidateSiteIds.includes(inspectedPoint.site.id);
  }, [inspectedPoint, candidateSiteIds]);

  const canContinue = candidateSiteIds.length >= 1;

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#05070c] text-slate-100 font-sans">
      {/* Left Mission Planning Control Column */}
      <div className="w-full lg:w-[420px] xl:w-[460px] h-auto lg:h-full bg-[#080c16]/95 border-r border-slate-800 flex flex-col justify-between shrink-0 z-20 overflow-y-auto">
        <div className="p-4 sm:p-5 space-y-4">
          {/* Step 1 Introduction */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase">
                Step 1 of 5
              </span>
              <span className="text-xs text-slate-400 font-mono">Lunar Location Selection</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Select Candidate Locations
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Click anywhere directly on the 3D Moon globe or search below to pick up to 3 candidate landing locations for automatic evaluation.
            </p>
          </div>

          {/* Search Bar with Autocomplete */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search lunar locations (e.g. Shackleton, Malapert, Apollo 11)..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0c1220] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-sans"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchFocused && filteredSites.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsSearchFocused(false)}
                />
                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-[#0d1424] border border-slate-700 rounded-lg shadow-2xl z-40 py-1 font-sans">
                  {filteredSites.map(site => (
                    <button
                      key={site.id}
                      onClick={() => handleSelectSite(site)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between border-b border-slate-800/60 last:border-0"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{site.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {site.latitude.toFixed(2)}° Lat, {site.longitude.toFixed(2)}° Lon • {site.region}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Preset Artemis Candidates */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Artemis Exploration Candidates</span>
              <span className="text-[10px] text-slate-500">Quick Select</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {savedSites.slice(0, 4).map(site => {
                const isSelected = selectedSite.id === site.id;
                const isAdded = candidateSiteIds.includes(site.id);
                return (
                  <button
                    key={site.id}
                    onClick={() => handleSelectSite(site)}
                    className={`p-2 rounded-md border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-600 text-white shadow-sm'
                        : 'bg-[#0a0e1a] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate pr-1">
                        {site.name.split('-')[0].trim()}
                      </span>
                      {isAdded && (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {site.latitude.toFixed(1)}°, {site.longitude.toFixed(1)}°
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currently Inspected Location Card */}
          {inspectedPoint && (
            <div className="p-3.5 rounded-lg border border-sky-800/80 bg-[#0c1424] space-y-2.5 shadow-md">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold block">
                    {inspectedPoint.isPredefined ? 'Predefined Benchmark Site' : 'Surface Coordinates'}
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {inspectedPoint.name || 'Inspected Lunar Point'}
                  </h3>
                </div>
                <div className="p-1 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>

              {/* Coordinates & Elevation */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-[#080d1a] border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 uppercase block">Latitude / Longitude</span>
                  <span className="text-slate-200 font-semibold">
                    {inspectedPoint.lat.toFixed(2)}°, {inspectedPoint.lon.toFixed(2)}°
                  </span>
                </div>
                <div className="p-2 rounded bg-[#080d1a] border border-slate-800/80">
                  <span className="text-[9px] text-slate-500 uppercase block">Elevation Data</span>
                  <span className="text-slate-200 font-semibold">
                    {inspectedPoint.site
                      ? `${inspectedPoint.site.elevationMeters.toLocaleString()} m`
                      : 'Unavailable (DEM)'}
                  </span>
                </div>
              </div>

              {/* Scientific Transparency Badge */}
              <div className="text-[11px] font-mono text-slate-400 bg-[#080c18] p-2 rounded border border-slate-800 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  {inspectedPoint.site?.terrain.dataSource ||
                    'Arbitrary clicked coordinates: live DEM raster querying is not loaded in the client.'}
                </span>
              </div>

              {/* Action Button: Add or already added */}
              <div className="flex items-center gap-2 pt-1">
                {isInspectedAlreadyCandidate ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Added to Candidates</span>
                  </div>
                ) : (
                  <button
                    onClick={handleAddInspectedToCandidates}
                    disabled={candidateSiteIds.length >= 3}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-mono font-semibold transition-all shadow-sm ${
                      candidateSiteIds.length >= 3
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-sky-500 hover:bg-sky-400 text-black border border-sky-400'
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {candidateSiteIds.length >= 3
                        ? 'Max 3 Candidates (Remove one first)'
                        : 'Add to Candidate Locations'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Selected Candidates List Tray */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>Selected Candidates</span>
                <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px]">
                  {candidateSites.length} of 3
                </span>
              </span>
              <span className="text-slate-500 text-[11px]">Up to 3 allowed</span>
            </div>

            {candidateSites.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-slate-700/80 bg-[#090d18] text-center text-xs text-slate-400">
                <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-1.5 opacity-80" />
                <p>No candidate locations selected yet.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click on the 3D Moon or select a candidate above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {candidateSites.map((site, index) => (
                  <div
                    key={site.id}
                    className="p-2.5 rounded-lg border border-slate-800 bg-[#0a0f1d] hover:border-slate-700 transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-950 border border-sky-800 text-sky-300 font-mono text-[10px] font-bold shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate text-xs leading-tight">
                          {site.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {site.latitude.toFixed(2)}° Lat, {site.longitude.toFixed(2)}° Lon
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedSiteId(site.id);
                          canvasRef.current?.focusCoordinates(site.latitude, site.longitude);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800"
                        title="Focus on 3D Moon"
                      >
                        <Compass className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeCandidateSiteId(site.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                        title="Remove candidate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 1 Bottom Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#070b14] flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400">
            {canContinue ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="w-3.5 h-3.5" /> Ready for evaluation
              </span>
            ) : (
              <span className="text-amber-400/90">Select at least 1 candidate to proceed</span>
            )}
          </div>

          <button
            onClick={() => setWorkflowStep('evaluate-sites')}
            disabled={!canContinue}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all shadow-md ${
              canContinue
                ? 'bg-sky-500 hover:bg-sky-400 text-black border border-sky-400 ring-2 ring-sky-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <span>Continue to Evaluation</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Center/Right 3D Interactive Moon Workspace */}
      <div className="flex-1 relative h-[450px] lg:h-full bg-[#05070c] overflow-hidden">
        {/* 3D Moon Canvas Component */}
        <Lunar3DCanvas
          ref={canvasRef}
          candidateSites={candidateSites}
          selectedSiteId={selectedSite.id}
          onSelectSite={siteId => {
            const found = savedSites.find(s => s.id === siteId);
            if (found) handleSelectSite(found);
          }}
          onRaycastPoint={handleRaycastPoint}
          inspectedPoint={inspectedPoint}
          showBackgroundEarth={true}
        />

        {/* Floating 3D Toolbar (Top Right of Canvas) */}
        <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center gap-2 bg-[#090d16]/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl">
          <button
            onClick={() => canvasRef.current?.focusSouthPole()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-mono border border-sky-800 font-semibold transition-colors shadow-sm"
            title="Focus camera directly on the Lunar South Pole (-90° Lat)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus South Pole</span>
          </button>

          <button
            onClick={() => canvasRef.current?.resetCamera()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c1220] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono border border-slate-700 transition-colors shadow-sm"
            title="Reset to global orbital perspective"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <div className="flex items-center bg-[#0c1220] rounded border border-slate-700 p-0.5">
            <button
              onClick={() => canvasRef.current?.zoomIn()}
              className="p-1.5 text-slate-400 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => canvasRef.current?.zoomOut()}
              className="p-1.5 text-slate-400 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Floating Hint */}
        <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 z-10 max-w-md bg-[#090d16]/90 backdrop-blur-md p-2.5 rounded-lg border border-slate-800/80 shadow-lg text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Click anywhere on the Moon to inspect exact selenographic coordinates. Rotate with left drag, zoom with scroll wheel.</span>
        </div>
      </div>
    </div>
  );
};
