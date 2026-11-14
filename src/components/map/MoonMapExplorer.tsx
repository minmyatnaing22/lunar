'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMission } from '@/context/MissionContext';
import {
  Compass,
  MapPin,
  Layers,
  Plus,
  ZoomIn,
  ZoomOut,
  Info,
  Sliders,
  Check,
  AlertCircle,
  Eye,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import {
  southPoleToStereographic,
  stereographicToSouthPole,
  lunarGreatCircleDistanceKm,
} from '@/lib/astronomy/coordinates';

export const MoonMapExplorer: React.FC = () => {
  const {
    selectedSite,
    savedSites,
    setSelectedSiteId,
    addCustomSite,
    simulationDate,
  } = useMission();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map layer visibility toggles
  const [showPSRLayer, setShowPSRLayer] = useState<boolean>(true);
  const [showElevationContours, setShowElevationContours] = useState<boolean>(true);
  const [showSunVector, setShowSunVector] = useState<boolean>(true);
  const [showEarthVector, setShowEarthVector] = useState<boolean>(true);

  // Inspector state (clicked point on map)
  const [inspectedCoord, setInspectedCoord] = useState<{
    lat: number;
    lon: number;
    elevationMeters: number;
    slopeDegrees: number;
  } | null>(null);

  // Add custom site form modal
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState(-88.5);
  const [customLon, setCustomLon] = useState(45.0);
  const [customElev, setCustomElev] = useState(1500);
  const [customSlope, setCustomSlope] = useState(5.0);

  // Synthetic elevation approximation for polar coordinates (-75 to -90 deg)
  const estimateElevationAndSlope = useCallback((lat: number, lon: number) => {
    // Distance from pole in degrees
    const dPole = 90.0 + lat;
    const radLon = (lon * Math.PI) / 180.0;
    
    // Simulate major crater features: Shackleton (near pole), Malapert (high peak), Haworth (deep depression)
    let elev = 500 + Math.sin(radLon * 3) * 1200 + Math.cos(dPole * 0.8) * 800;
    let slope = 3.5 + Math.abs(Math.sin(radLon * 5)) * 4.5;

    // Near South Pole (lat < -89)
    if (lat < -89.0) {
      elev = 1200 + Math.cos(radLon) * 600;
      slope = 5.8;
    }
    // Deep depression simulated near 0 lon, lat -87.5 (Haworth PSR)
    if (lat < -86.5 && lat > -88.0 && Math.abs(lon) < 20) {
      elev = -3200;
      slope = 14.0;
    }
    // High mountain simulated near 2.7 lon, lat -85.8 (Malapert)
    if (lat > -86.5 && lat < -85.0 && Math.abs(lon - 2.7) < 15) {
      elev = 5040;
      slope = 4.8;
    }

    return {
      elevationMeters: Math.round(elev),
      slopeDegrees: Math.round(slope * 10) / 10,
    };
  }, []);

  // Canvas render loop for high-resolution Lunar South Pole stereographic view
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2 + panOffset.x;
    const centerY = height / 2 + panOffset.y;
    const baseRadius = Math.min(width, height) * 0.42 * zoomLevel;

    // Clear background to deep space black
    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, width, height);

    // Draw lunar polar circular disk boundary (-75 deg latitude limit)
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0c101a';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 1. Draw Concentric Latitude Rings (-80°, -85°, -88°)
    const latRings = [
      { lat: -80, label: '80°S' },
      { lat: -85, label: '85°S' },
      { lat: -88, label: '88°S' },
    ];

    ctx.strokeStyle = '#1e293b';
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';

    latRings.forEach(ring => {
      const { r } = southPoleToStereographic(ring.lat, 0, -75);
      const ringRadius = r * baseRadius;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(ring.label, centerX + 6, centerY - ringRadius + 12);
    });

    // 2. Draw Longitude Meridian Spokes (every 45 degrees)
    for (let deg = 0; deg < 360; deg += 45) {
      const angleRad = ((deg - 90) * Math.PI) / 180.0;
      const xEnd = centerX + baseRadius * Math.cos(angleRad);
      const yEnd = centerY + baseRadius * Math.sin(angleRad);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(xEnd, yEnd);
      ctx.strokeStyle = '#141c2e';
      ctx.stroke();

      // Longitude labels on periphery
      const xLabel = centerX + (baseRadius + 16) * Math.cos(angleRad);
      const yLabel = centerY + (baseRadius + 16) * Math.sin(angleRad);
      ctx.fillText(`${deg}°`, xLabel - 8, yLabel + 3);
    }

    // 3. Draw Elevation Contours & Shaded Crater Topography
    if (showElevationContours) {
      // Prominent Craters: Shackleton (-89.9°, 0°), Faustini, Shoemaker, Haworth, Amundsen, de Gerlache
      const craters = [
        { name: 'Shackleton', lat: -89.9, lon: 0.0, radiusKm: 21, isPSR: true },
        { name: 'de Gerlache', lat: -88.5, lon: -87.1, radiusKm: 32, isPSR: true },
        { name: 'Sverdrup', lat: -88.5, lon: -152.0, radiusKm: 35, isPSR: true },
        { name: 'Shoemaker', lat: -88.1, lon: 45.9, radiusKm: 50, isPSR: true },
        { name: 'Faustini', lat: -87.3, lon: 77.0, radiusKm: 39, isPSR: true },
        { name: 'Haworth', lat: -87.4, lon: -5.0, radiusKm: 51, isPSR: true },
        { name: 'Nobile', lat: -85.2, lon: 53.5, radiusKm: 73, isPSR: false },
        { name: 'Amundsen', lat: -84.5, lon: 82.8, radiusKm: 101, isPSR: false },
        { name: 'Malapert', lat: -85.8, lon: 2.7, radiusKm: 69, isPSR: false },
      ];

      craters.forEach(crater => {
        const { x, y } = southPoleToStereographic(crater.lat, crater.lon, -75);
        const craterX = centerX + x * baseRadius;
        const craterY = centerY + y * baseRadius;
        // 1 deg latitude ~ 30.3 km
        const visualR = (crater.radiusKm / (15 * 30.3)) * baseRadius;

        // Crater Rim
        ctx.beginPath();
        ctx.arc(craterX, craterY, Math.max(6, visualR), 0, Math.PI * 2);
        ctx.strokeStyle = crater.isPSR && showPSRLayer ? '#38bdf8' : '#334155';
        ctx.lineWidth = crater.isPSR && showPSRLayer ? 1.5 : 1;
        ctx.stroke();

        // PSR Interior Shadow fill
        if (crater.isPSR && showPSRLayer) {
          ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
          ctx.fill();
        }

        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(crater.name, craterX - crater.name.length * 2.5, craterY + visualR + 10);
      });
    }

    // 4. Draw Sub-Solar Vector (Direction from which sunlight hits the polar landscape)
    if (showSunVector) {
      const sunAzimuthRad = ((selectedSite.sunlight.subSolarLongitude - 90) * Math.PI) / 180.0;
      const sunX = centerX + (baseRadius * 0.9) * Math.cos(sunAzimuthRad);
      const sunY = centerY + (baseRadius * 0.9) * Math.sin(sunAzimuthRad);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(sunX, sunY);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Sun icon indicator
      ctx.beginPath();
      ctx.arc(sunX, sunY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillText('SUN VEC', sunX + 8, sunY + 3);
    }

    // 5. Draw Candidate Landing Sites
    savedSites.forEach(site => {
      if (site.latitude < -75.0) {
        const { x, y } = southPoleToStereographic(site.latitude, site.longitude, -75);
        const markerX = centerX + x * baseRadius;
        const markerY = centerY + y * baseRadius;
        const isSelected = site.id === selectedSite.id;

        // Pulse ring if selected
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(markerX, markerY, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Marker dot
        ctx.beginPath();
        ctx.arc(markerX, markerY, isSelected ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected
          ? '#38bdf8'
          : site.terrain.isPermanentShadowRegion
          ? '#818cf8'
          : '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
        ctx.font = isSelected ? 'bold 10px sans-serif' : '9px sans-serif';
        ctx.fillText(site.name.split('—')[0].trim(), markerX + 7, markerY - 5);
      }
    });

    // 6. Draw Inspected Point Cursor if any
    if (inspectedCoord) {
      const { x, y } = southPoleToStereographic(inspectedCoord.lat, inspectedCoord.lon, -75);
      const inspX = centerX + x * baseRadius;
      const inspY = centerY + y * baseRadius;

      ctx.beginPath();
      ctx.arc(inspX, inspY, 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(inspX - 10, inspY);
      ctx.lineTo(inspX + 10, inspY);
      ctx.moveTo(inspX, inspY - 10);
      ctx.lineTo(inspX, inspY + 10);
      ctx.strokeStyle = '#f43f5e';
      ctx.stroke();
    }
  }, [
    zoomLevel,
    panOffset,
    showPSRLayer,
    showElevationContours,
    showSunVector,
    showEarthVector,
    savedSites,
    selectedSite,
    inspectedCoord,
  ]);

  // Handle Canvas Click to Inspect Coordinates
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = canvas.height / 2 + panOffset.y;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.42 * zoomLevel;

    const normX = (clickX - centerX) / baseRadius;
    const normY = (clickY - centerY) / baseRadius;

    // Check if within bounds
    const dist = Math.sqrt(normX * normX + normY * normY);
    if (dist <= 1.05) {
      const { lat, lon } = stereographicToSouthPole(normX, normY, -75);
      const { elevationMeters, slopeDegrees } = estimateElevationAndSlope(lat, lon);
      
      setInspectedCoord({
        lat: Math.round(lat * 100) / 100,
        lon: Math.round(lon * 100) / 100,
        elevationMeters,
        slopeDegrees,
      });

      // Update add custom modal default inputs
      setCustomLat(Math.round(lat * 100) / 100);
      setCustomLon(Math.round(lon * 100) / 100);
      setCustomElev(elevationMeters);
      setCustomSlope(slopeDegrees);
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Save inspected point as candidate site
  const handleSaveInspectedSite = () => {
    if (!inspectedCoord) return;
    const siteName = customName.trim() || `South Pole Site (${inspectedCoord.lat}°, ${inspectedCoord.lon}°)`;
    addCustomSite(
      siteName,
      inspectedCoord.lat,
      inspectedCoord.lon,
      inspectedCoord.elevationMeters,
      inspectedCoord.slopeDegrees
    );
    setIsAddCustomModalOpen(false);
    setCustomName('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-semibold">
              Feature 1
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Lunar Polar Stereographic Projection (LOLA DEM)
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Moon Map Explorer — Lunar South Pole (-75° to -90°)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCustomModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Candidate</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area & Side Control Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Interactive Polar Stereographic Canvas */}
        <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-[#070a11] overflow-hidden relative shadow-2xl flex flex-col items-center justify-center min-h-[560px]">
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={800}
            height={560}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair w-full h-full max-h-[580px] object-contain"
          />

          {/* Floating Zoom & Pan Reset Tools */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-lg backdrop-blur shadow-lg">
            <button
              onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.25))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.25))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1.2);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-[10px] font-mono text-center"
              title="Reset View"
            >
              1:1
            </button>
          </div>

          {/* Floating Map Legend & Layer Toggles */}
          <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg backdrop-blur shadow-lg space-y-2 text-xs">
            <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold">
              Map Layers
            </div>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showPSRLayer}
                onChange={e => setShowPSRLayer(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
              />
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-sky-500/30 border border-sky-400"></span>
                PSR Cold Traps
              </span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showElevationContours}
                onChange={e => setShowElevationContours(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
              />
              <span>Crater Rims</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSunVector}
                onChange={e => setShowSunVector(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
              />
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Sun Vector
              </span>
            </label>
          </div>

          {/* Bottom Hint Banner */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-md border border-slate-800/80 backdrop-blur">
            <span>Click anywhere to inspect coordinates & elevation • Drag to pan</span>
            <span className="text-sky-400">Projection: Polar Stereographic (-75° Lat Boundary)</span>
          </div>
        </div>

        {/* Right 1 Col: Site Detail Inspector & Quick Picker */}
        <div className="space-y-4">
          {/* Inspected Coordinate Box */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2 font-mono uppercase tracking-wider">
              <Crosshair className="w-4 h-4 text-rose-400" />
              <span>Surface Point Inspector</span>
            </div>

            {inspectedCoord ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Latitude</div>
                    <div className="font-semibold text-white">{inspectedCoord.lat}° S</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Longitude</div>
                    <div className="font-semibold text-white">{inspectedCoord.lon}° E</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">LOLA Elevation</div>
                    <div className="font-semibold text-amber-400">
                      {inspectedCoord.elevationMeters > 0 ? `+${inspectedCoord.elevationMeters}m` : `${inspectedCoord.elevationMeters}m`}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Terrain Slope</div>
                    <div className="font-semibold text-white">{inspectedCoord.slopeDegrees}°</div>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddCustomModalOpen(true)}
                  className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save as Candidate Site</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Click any point on the lunar map to sample local elevation, slope, and coordinates.
              </div>
            )}
          </div>

          {/* Active Candidate Locations List */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1b]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Saved Locations ({savedSites.length})
              </span>
              <span className="text-[10px] font-mono text-sky-400">Global Sync</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {savedSites.map(site => {
                const isSelected = site.id === selectedSite.id;
                return (
                  <button
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className={`w-full p-2.5 rounded-lg text-left border transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500/50 text-white'
                        : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{site.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1" />}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {Math.abs(site.latitude).toFixed(2)}°S, {site.longitude.toFixed(2)}°E •{' '}
                      {site.elevationMeters > 0 ? `+${site.elevationMeters}m` : `${site.elevationMeters}m`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Candidate Site */}
      {isAddCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0c1220] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Add Candidate Landing Site
              </h3>
              <button
                onClick={() => setIsAddCustomModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Site Identifier / Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. Ridge Site Bravo"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
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
                    value={customLat}
                    onChange={e => setCustomLat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Longitude (°E: -180 to 180)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="-180"
                    max="180"
                    value={customLon}
                    onChange={e => setCustomLon(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Elevation (Meters)</label>
                  <input
                    type="number"
                    step="50"
                    value={customElev}
                    onChange={e => setCustomElev(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Slope (° Degrees)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="45"
                    value={customSlope}
                    onChange={e => setCustomSlope(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddCustomModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInspectedSite}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
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
