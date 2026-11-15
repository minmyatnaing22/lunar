'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useMission } from '@/context/MissionContext';
import {
  Compass,
  MapPin,
  ChevronDown,
  ArrowDown,
  Layers,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info,
  Radio,
  Globe2,
  Sun,
  SlidersHorizontal,
  FileText,
  Orbit,
  ArrowRight,
  ShieldCheck,
  Crosshair,
  Plus,
  Trash2,
} from 'lucide-react';
import { Lunar3DCanvas, Lunar3DCanvasHandles } from '@/components/map/Lunar3DCanvas';
import { verifyCoordinateConversions } from '@/lib/astronomy/lunar3DCoordinates';

export const ImmersiveScrollytellingExperience: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    selectedSite,
    savedSites,
    setSelectedSiteId,
    addCustomSite,
    removeSite,
  } = useMission();

  const canvas3DRef = useRef<Lunar3DCanvasHandles | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll Progress [0.0 (deep space opening) to 1.0 (interactive close vantage)]
  const [scrollProgress, setScrollProgress] = useState(0.0);
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);

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

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Track scroll progress along the scrollytelling track
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    const progress = Math.min(1.0, Math.max(0.0, scrollTop / maxScroll));
    setScrollProgress(progress);
    setIsInteractiveMode(progress >= 0.94);
  }, []);

  // Jump smoothly to the interactive landing map
  const jumpToInteractive = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  // Jump back to the opening solar system scene
  const jumpToSpace = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  // Raycast click on 3D Moon Surface
  const handleRaycastPoint = useCallback(
    (lat: number, lon: number) => {
      // Check if clicked near an existing saved site (within 0.6 degrees)
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
        setNewSiteLat(lat);
        setNewSiteLon(lon);
      }
    },
    [savedSites, setSelectedSiteId]
  );

  const handleSaveInspectedSite = () => {
    if (!inspectedPoint) return;
    const siteName =
      newSiteName.trim() ||
      `South Pole Site (${inspectedPoint.lat}°, ${inspectedPoint.lon}°)`;
    addCustomSite(siteName, inspectedPoint.lat, inspectedPoint.lon, newSiteElev, newSiteSlope);
    setIsAddModalOpen(false);
    setNewSiteName('');
  };

  // Opacity calculations for chapter overlays
  const heroOpacity = Math.max(0, 1.0 - scrollProgress * 3.5);
  const transitOpacity =
    scrollProgress > 0.25 && scrollProgress < 0.65
      ? Math.sin(((scrollProgress - 0.25) / 0.4) * Math.PI)
      : 0;
  const approachOpacity =
    scrollProgress > 0.65 && scrollProgress < 0.94
      ? Math.sin(((scrollProgress - 0.65) / 0.29) * Math.PI)
      : 0;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden bg-[#030508] text-slate-100 scroll-smooth"
    >
      {/* 
        300vh Scroll-Track Container:
        Drives the camera approach smoothly from deep cislunar space into the lunar south pole.
      */}
      <div className="relative w-full h-[280vh]">
        {/* Sticky 3D Canvas Viewport: Remains in view as camera approaches the Moon */}
        <div className="sticky top-0 w-full h-screen overflow-hidden bg-[#030508]">
          <Lunar3DCanvas
            ref={canvas3DRef}
            candidateSites={savedSites}
            selectedSiteId={selectedSite.id}
            onSelectSite={setSelectedSiteId}
            onRaycastPoint={handleRaycastPoint}
            inspectedPoint={inspectedPoint}
            scrollProgress={scrollProgress}
            showBackgroundEarth={true}
          />

          {/* ========================================================================= */}
          {/* STAGE 1 OVERLAY (0% to ~28% scroll): Opening Solar System Space Vista     */}
          {/* ========================================================================= */}
          <div
            style={{ opacity: heroOpacity }}
            className={`absolute inset-0 pointer-events-none transition-opacity duration-300 flex flex-col justify-between p-6 sm:p-12 z-20 ${
              heroOpacity <= 0 ? 'hidden' : ''
            }`}
          >
            {/* Top Bar: Clean Brand Title */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-950/80 border border-sky-800/80 flex items-center justify-center backdrop-blur">
                  <Orbit className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-widest uppercase font-mono">
                      LunarSight
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
                      NASA Space Apps
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Autonomous Lunar Mission Control
                  </p>
                </div>
              </div>

              {/* Direct Jump to Interactive Map */}
              <button
                onClick={jumpToInteractive}
                className="px-3.5 py-1.5 rounded bg-[#090d16]/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white backdrop-blur transition-colors flex items-center gap-2 pointer-events-auto shadow-sm"
              >
                <span>Direct to Mission Control</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </div>

            {/* Center Hero: Minimal Cinematic Introduction */}
            <div className="max-w-xl space-y-4 pointer-events-auto mt-auto mb-16">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700/80 text-sky-300 text-xs font-mono backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Cislunar Flight Path • J2000 Ephemeris Active</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Explore the Moon.
                <br />
                <span className="text-slate-300">Plan the Landing.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-lg">
                An interactive lunar mission-planning experience. Observe the Earth and Moon from space, 
                descend into low lunar orbit, and evaluate candidate landing sites for the Artemis program.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={jumpToInteractive}
                  className="px-5 py-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-sky-900/30"
                >
                  <Compass className="w-4 h-4" />
                  <span>Begin Lunar Approach</span>
                </button>
              </div>
            </div>

            {/* Bottom Scroll Indicator */}
            <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Earth in background • Directional Solar Illumination</span>
              </div>
              <div className="flex items-center gap-2 animate-bounce">
                <span>Scroll to approach the Moon</span>
                <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STAGE 2 OVERLAY (30% to 65% scroll): Cislunar Transit Narrative          */}
          {/* ========================================================================= */}
          <div
            style={{ opacity: transitOpacity }}
            className={`absolute inset-0 pointer-events-none transition-opacity duration-300 flex items-center justify-start p-8 sm:p-16 z-20 ${
              transitOpacity <= 0 ? 'hidden' : ''
            }`}
          >
            <div className="max-w-md bg-[#090d16]/85 border border-slate-800 p-6 rounded-lg backdrop-blur space-y-2.5 shadow-2xl">
              <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold inline-block">
                Cislunar Transit • Phase II
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Approaching Lunar Orbit
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Traveling 384,400 kilometres from Earth. As distance decreases, basaltic maria basins 
                (Imbrium, Serenitatis, Procellarum) and rayed impact structures resolve across the near side.
              </p>
              <div className="pt-2 flex items-center gap-4 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                <span>Altitude: ~42,000 km</span>
                <span className="text-sky-400">Velocity: 1.08 km/s</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STAGE 3 OVERLAY (65% to 92% scroll): Low Lunar Orbit & Topography         */}
          {/* ========================================================================= */}
          <div
            style={{ opacity: approachOpacity }}
            className={`absolute inset-0 pointer-events-none transition-opacity duration-300 flex items-center justify-end p-8 sm:p-16 z-20 ${
              approachOpacity <= 0 ? 'hidden' : ''
            }`}
          >
            <div className="max-w-md bg-[#090d16]/85 border border-slate-800 p-6 rounded-lg backdrop-blur space-y-2.5 shadow-2xl text-right">
              <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 uppercase font-semibold inline-block">
                Low Polar Orbit • LOLA Topography
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Targeting the South Pole
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                3D surface displacement mapping active. Steep terraced crater rims, central mountain massifs, 
                and Permanently Shadowed Regions (PSRs) at Shackleton, Haworth, and Malapert Massif come into focus.
              </p>
              <div className="pt-2 flex items-center justify-end gap-4 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                <span>Inclination: 90° Polar</span>
                <span className="text-emerald-400">Mission Control Ready</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STAGE 4 (100% scroll): Fully Revealed Interactive Mission Control Workspace */}
          {/* ========================================================================= */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 z-30 flex flex-col justify-between pointer-events-none ${
              isInteractiveMode ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Top Mission Control Progressive Navigation Bar */}
            <div className="p-4 bg-[#070a12]/95 border-b border-slate-800/90 backdrop-blur pointer-events-auto flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-sky-950 border border-sky-800 flex items-center justify-center">
                    <Orbit className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-white font-mono">
                    LunarSight
                  </span>
                </div>

                <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

                {/* Return to Space View Button */}
                <button
                  onClick={jumpToSpace}
                  className="text-[11px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#0c1220] hover:bg-slate-800 border border-slate-700/80 transition-colors flex items-center gap-1.5"
                  title="Zoom camera back out to deep cislunar space"
                >
                  <Globe2 className="w-3 h-3 text-sky-400" />
                  <span>Cislunar Space View</span>
                </button>
              </div>

              {/* Progressive 5-Module Navigation Tabs */}
              <div className="flex items-center flex-wrap gap-1.5 text-xs font-mono">
                <button
                  onClick={() => setActiveSection('map')}
                  className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                    activeSection === 'map'
                      ? 'bg-sky-950 border-sky-600 text-sky-300 font-semibold'
                      : 'bg-[#0c1220] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span>1. Moon Map</span>
                </button>

                <button
                  onClick={() => setActiveSection('sun')}
                  className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                    activeSection === 'sun'
                      ? 'bg-sky-950 border-sky-600 text-sky-300 font-semibold'
                      : 'bg-[#0c1220] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Sun Position</span>
                </button>

                <button
                  onClick={() => setActiveSection('earth')}
                  className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                    activeSection === 'earth'
                      ? 'bg-sky-950 border-sky-600 text-sky-300 font-semibold'
                      : 'bg-[#0c1220] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Globe2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>3. Earth Visibility</span>
                </button>

                <button
                  onClick={() => setActiveSection('comms')}
                  className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                    activeSection === 'comms'
                      ? 'bg-sky-950 border-sky-600 text-sky-300 font-semibold'
                      : 'bg-[#0c1220] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. Communication</span>
                </button>

                <button
                  onClick={() => setActiveSection('comparison')}
                  className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                    activeSection === 'comparison'
                      ? 'bg-sky-950 border-sky-600 text-sky-300 font-semibold'
                      : 'bg-[#0c1220] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <span>5. Site Comparison</span>
                </button>
              </div>

              {/* 3D Camera Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => canvas3DRef.current?.focusSouthPole()}
                  className="px-2.5 py-1 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs font-mono font-semibold"
                  title="Focus camera directly on the South Pole (-90°)"
                >
                  Focus South Pole
                </button>
                <button
                  onClick={() => canvas3DRef.current?.resetCamera()}
                  className="p-1 rounded bg-[#0c1220] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Middle Active Control Panels Overlay */}
            <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 pointer-events-none items-end">
              {/* Left Column: Candidate Locations Selector */}
              <div className="lg:col-span-3 rounded-lg border border-slate-800/90 bg-[#090d16]/95 backdrop-blur p-3.5 space-y-3 pointer-events-auto max-h-[480px] flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>Artemis Sites ({savedSites.length})</span>
                    </span>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="p-1 rounded bg-sky-950 text-sky-400 hover:bg-sky-900 border border-sky-800"
                      title="Add Custom Coordinates"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                    {savedSites.map(site => {
                      const isSelected = site.id === selectedSite.id;
                      return (
                        <div
                          key={site.id}
                          className={`p-2 rounded border text-left transition-colors relative group ${
                            isSelected
                              ? 'bg-sky-950/70 border-sky-600 text-white'
                              : 'bg-[#0c1220]/80 border-slate-800 text-slate-300 hover:border-slate-700'
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
                  className="w-full py-1.5 rounded bg-[#0c1220] hover:bg-slate-800 text-sky-400 text-xs font-mono font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Coordinates</span>
                </button>
              </div>

              {/* Center Spacer: Keeps the Moon visible and interactive */}
              <div className="lg:col-span-6 pointer-events-none" />

              {/* Right Column: Location Telemetry Panel */}
              <div className="lg:col-span-3 rounded-lg border border-slate-800/90 bg-[#090d16]/95 backdrop-blur p-4 space-y-3 pointer-events-auto shadow-2xl">
                <div className="border-b border-slate-800 pb-2">
                  <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                    Selected Location
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {selectedSite.name.replace('—', '-')}
                  </div>
                  {selectedSite.artemisCandidateRank && (
                    <div className="text-[10px] text-sky-400 font-mono font-semibold">
                      NASA Artemis Candidate #{selectedSite.artemisCandidateRank}
                    </div>
                  )}
                </div>

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
                    <div className="text-slate-400 text-[10px]">Permanent Shadow Region (PSR)</div>
                    <div className={`font-semibold ${selectedSite.terrain.isPermanentShadowRegion ? 'text-indigo-400' : 'text-slate-300'}`}>
                      {selectedSite.terrain.isPermanentShadowRegion ? 'Interior Cold Trap' : 'Polar Sunlit Plateau'}
                    </div>
                  </div>
                </div>

                {inspectedPoint && !inspectedPoint.isPrecalibrated && (
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900 text-xs font-mono space-y-1">
                    <div className="text-amber-300 font-bold flex items-center gap-1.5 text-[11px]">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Raycast Point Sampled</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      {Math.abs(inspectedPoint.lat).toFixed(3)}° S, {inspectedPoint.lon.toFixed(3)}° E
                    </div>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition-colors mt-1"
                    >
                      Save as Candidate
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom HUD: Interaction Hint & Legal Links */}
            <div className="p-3 bg-[#070a12]/90 border-t border-slate-800 backdrop-blur pointer-events-auto flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-sky-400">● 3D Simulation Active:</span>
                <span>Click surface to sample coordinates • Drag to rotate Moon • Scroll to zoom</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <Link href="/privacy" className="hover:text-slate-300 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-slate-300 transition-colors">
                  Terms & Conditions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Candidate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
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
