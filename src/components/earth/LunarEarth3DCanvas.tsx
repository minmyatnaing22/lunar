'use client';

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { selenographicToCartesian, cartesianToSelenographic } from '@/lib/astronomy/lunar3DCoordinates';
import { createProceduralLunarTextures } from '@/lib/textures/proceduralMoonTexture';
import {
  createHighDetailEarthAlbedoTexture,
  createEarthNightLightsTexture,
  createEarthRoughnessTexture,
  createHighDetailEarthCloudTexture,
} from '@/lib/textures/proceduralEarthTexture';
import { calculateLunarEphemeris } from '@/lib/astronomy/ephemeris';
import { calculateEarthPosition } from '@/lib/astronomy/earthVisibility';
import { getCraterRimHorizonElevation } from '@/lib/astronomy/illumination';
import { CandidateLandingSite } from '@/types/mission';

export interface LunarEarth3DCanvasHandles {
  resetEarthView: () => void;
  viewArtemisPerspective: () => void;
  viewCislunarSystem: () => void;
  viewEarthNightSide: () => void;
  focusLandingSite: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface LunarEarth3DCanvasProps {
  simulationDate: Date;
  candidateSites: CandidateLandingSite[];
  selectedSite: CandidateLandingSite;
  onSelectSite: (siteId: string) => void;
}

// Visual astronomical scene parameters
const EARTH_RADIUS = 2.4;
const MOON_RADIUS = 0.65;
const MOON_ORBIT_DISTANCE = 14.5;
const SUN_DISTANCE = 32.0;
const EARTH_AXIAL_TILT_RAD = (23.44 * Math.PI) / 180.0;

export const LunarEarth3DCanvas = forwardRef<LunarEarth3DCanvasHandles, LunarEarth3DCanvasProps>(
  ({ simulationDate, candidateSites, selectedSite, onSelectSite }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animFrameIdRef = useRef<number | null>(null);

    // Earth System References
    const earthTiltGroupRef = useRef<THREE.Group | null>(null);
    const earthMeshRef = useRef<THREE.Mesh | null>(null);
    const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
    const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
    const outerHaloRef = useRef<THREE.Mesh | null>(null);

    // Moon System References
    const moonGroupRef = useRef<THREE.Group | null>(null);
    const moonMeshRef = useRef<THREE.Mesh | null>(null);
    const markersGroupRef = useRef<THREE.Group | null>(null);
    const selectedMarkerRef = useRef<THREE.Mesh | null>(null);

    // Sun & Solar Light References
    const sunGroupRef = useRef<THREE.Group | null>(null);
    const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
    const sunCoronaRef = useRef<THREE.Sprite | null>(null);

    // Cislunar Communications Laser/RF Carrier Beam
    const commsBeamRef = useRef<THREE.Line | null>(null);

    const [webglSupported] = useState(true);

    // Camera animation targets
    const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
    const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

    // Camera presets exposed to parent
    useImperativeHandle(ref, () => ({
      resetEarthView: () => {
        // Grand heroic view of Earth as the primary celestial spectacle
        targetCamPosRef.current = new THREE.Vector3(0.5, 1.8, 5.8);
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      viewEarthNightSide: () => {
        // Sweeps behind the terminator to admire glowing metropolitan clusters & aurora
        if (!sunGroupRef.current) return;
        const sunDir = sunGroupRef.current.position.clone().normalize();
        const nightPos = sunDir.clone().multiplyScalar(-5.4).add(new THREE.Vector3(0, 1.4, 0));
        targetCamPosRef.current = nightPos;
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      viewCislunarSystem: () => {
        // Panoramic deep space vantage displaying Earth, Moon, and Sun together
        targetCamPosRef.current = new THREE.Vector3(8.5, 9.2, 16.5);
        targetLookAtRef.current = new THREE.Vector3(4.0, 0, 0);
      },
      viewArtemisPerspective: () => {
        // Astronaut Lunar Surface View: Position camera directly on lunar landing site looking up at Earth
        if (!selectedSite || !moonGroupRef.current) return;
        const moonPos = moonGroupRef.current.position.clone();
        const siteLocal = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, MOON_RADIUS * 1.04);
        const siteWorld = moonPos.clone().add(siteLocal);
        
        // Direction from site toward Earth (at origin 0,0,0)
        const toEarth = new THREE.Vector3(0, 0, 0).sub(siteWorld).normalize();
        // Camera placed right on the surface ridge looking up at Earth
        const surfaceCamPos = siteWorld.clone().add(siteLocal.clone().normalize().multiplyScalar(0.08)).sub(toEarth.clone().multiplyScalar(0.25));

        targetCamPosRef.current = surfaceCamPos;
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      focusLandingSite: () => {
        // Close-up inspection of the Moon and the selected candidate site
        if (!moonGroupRef.current || !selectedSite) return;
        const moonPos = moonGroupRef.current.position.clone();
        const siteLocal = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, MOON_RADIUS * 1.05);
        const siteWorld = moonPos.clone().add(siteLocal);
        targetCamPosRef.current = siteWorld.clone().add(siteLocal.clone().normalize().multiplyScalar(1.4));
        targetLookAtRef.current = siteWorld;
      },
      zoomIn: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, 0.7);
        controlsRef.current.update();
      },
      zoomOut: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, -0.7);
        controlsRef.current.update();
      },
    }));

    // Three.js Scene Initialization
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      // 1. Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color('#020408');

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 300);
      camera.position.set(0.5, 1.8, 5.8);
      cameraRef.current = camera;

      // 3. Renderer with ACES Tone Mapping
      const renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 0.15; // Low-orbit and surface flyovers
      controls.maxDistance = 50.0;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // 5. Optimized Starfield
      const starGeometry = new THREE.BufferGeometry();
      const starCount = isMobile ? 300 : 500;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 70.0 + Math.random() * 40.0;
        starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i + 2] = r * Math.cos(phi);
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: 0x94a3b8,
        size: 0.75,
        sizeAttenuation: true,
      });
      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);

      // 6. Deep Space Ambient Lighting
      const ambientLight = new THREE.AmbientLight(0x060914, 0.04);
      scene.add(ambientLight);

      // 7. MASSIVE PHOTOREALISTIC EARTH SYSTEM (Origin 0, 0, 0)
      const earthTiltGroup = new THREE.Group();
      earthTiltGroup.rotation.z = -EARTH_AXIAL_TILT_RAD; // 23.44° Obliquity of the Ecliptic
      scene.add(earthTiltGroup);
      earthTiltGroupRef.current = earthTiltGroup;

      // High-resolution multi-layer Earth textures
      const albedoTex = createHighDetailEarthAlbedoTexture();
      const nightTex = createEarthNightLightsTexture();
      const roughnessTex = createEarthRoughnessTexture();
      const cloudTex = createHighDetailEarthCloudTexture();

      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      albedoTex.anisotropy = Math.min(maxAniso, 4);
      nightTex.anisotropy = Math.min(maxAniso, 4);
      roughnessTex.anisotropy = Math.min(maxAniso, 4);
      cloudTex.anisotropy = Math.min(maxAniso, 4);

      // Primary Planetary Sphere (optimized segment density)
      const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, isMobile ? 48 : 80, isMobile ? 48 : 80);
      const earthMat = new THREE.MeshStandardMaterial({
        map: albedoTex,
        roughnessMap: roughnessTex,
        roughness: 0.75,
        metalness: 0.05,
        emissiveMap: nightTex,
        emissive: new THREE.Color(0xffeedd),
        emissiveIntensity: 1.4,
      });
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthTiltGroup.add(earthMesh);
      earthMeshRef.current = earthMesh;

      // Dynamic Cloud Deck
      const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.01, isMobile ? 36 : 64, isMobile ? 36 : 64);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.88,
        blending: THREE.NormalBlending,
        roughness: 0.95,
        metalness: 0.0,
      });
      const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
      earthTiltGroup.add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

      // Rayleigh Atmospheric Blue Scattering Inner Shell (BackSide Inverted Glow)
      const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.026, isMobile ? 32 : 48, isMobile ? 32 : 48);
      const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.28,
        side: THREE.BackSide,
      });
      const atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
      earthTiltGroup.add(atmosphereMesh);
      atmosphereMeshRef.current = atmosphereMesh;

      // Outer Exosphere Halo Shell (Soft electric-blue rim fade)
      const haloGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.065, isMobile ? 24 : 36, isMobile ? 24 : 36);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      });
      const outerHalo = new THREE.Mesh(haloGeo, haloMat);
      earthTiltGroup.add(outerHalo);
      outerHaloRef.current = outerHalo;

      // 8. UNIFIED 3D SUN SYSTEM (Directional Light illuminating Earth & Moon)
      const sunGroup = new THREE.Group();
      scene.add(sunGroup);
      sunGroupRef.current = sunGroup;

      const sunGeo = new THREE.SphereGeometry(1.8, 24, 24);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunGroup.add(sunMesh);

      // Photosphere Corona Flare Sprite
      const sunCoronaCanvas = document.createElement('canvas');
      sunCoronaCanvas.width = 128;
      sunCoronaCanvas.height = 128;
      const sCtx = sunCoronaCanvas.getContext('2d');
      if (sCtx) {
        const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.25, 'rgba(254, 240, 138, 0.9)');
        grad.addColorStop(0.55, 'rgba(245, 158, 11, 0.45)');
        grad.addColorStop(1.0, 'rgba(217, 119, 6, 0)');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 128, 128);
      }
      const coronaTex = new THREE.CanvasTexture(sunCoronaCanvas);
      const coronaSpriteMat = new THREE.SpriteMaterial({
        map: coronaTex,
        color: 0xfffbeb,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      const sunCorona = new THREE.Sprite(coronaSpriteMat);
      sunCorona.scale.set(9.5, 9.5, 1.0);
      sunGroup.add(sunCorona);
      sunCoronaRef.current = sunCorona;

      // Powerful directional vacuum sunlight
      const sunLight = new THREE.DirectionalLight(0xfffaee, 4.8);
      scene.add(sunLight);
      sunLightRef.current = sunLight;

      // 9. UNIFIED 3D MOON SYSTEM (Positioned at orbital distance from Earth)
      const moonGroup = new THREE.Group();
      scene.add(moonGroup);
      moonGroupRef.current = moonGroup;

      const { albedoTexture: moonAlbedo, displacementTexture: moonDisp, normalTexture: moonNorm } = createProceduralLunarTextures();
      moonAlbedo.anisotropy = Math.min(maxAniso, 4);
      moonDisp.anisotropy = Math.min(maxAniso, 4);
      moonNorm.anisotropy = Math.min(maxAniso, 4);

      const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, isMobile ? 64 : 96, isMobile ? 64 : 96);
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonAlbedo,
        displacementMap: moonDisp,
        displacementScale: 0.045,
        displacementBias: -0.0225,
        normalMap: moonNorm,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.96,
        metalness: 0.01,
      });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      moonGroup.add(moonMesh);
      moonMeshRef.current = moonMesh;

      // Candidate landing site markers on the Moon
      const markersGroup = new THREE.Group();
      moonGroup.add(markersGroup);
      markersGroupRef.current = markersGroup;

      // Selected site indicator ring
      const selectedGeo = new THREE.RingGeometry(0.018, 0.026, 24);
      const selectedMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const selectedMarker = new THREE.Mesh(selectedGeo, selectedMat);
      selectedMarker.visible = false;
      moonGroup.add(selectedMarker);
      selectedMarkerRef.current = selectedMarker;

      // 10. CISLUNAR COMMUNICATIONS LINK BEAM (Earth <-> Lunar Landing Site)
      const commsGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);
      const commsMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 0.45,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.8,
      });
      const commsBeam = new THREE.Line(commsGeo, commsMat);
      commsBeam.computeLineDistances();
      scene.add(commsBeam);
      commsBeamRef.current = commsBeam;

      // 11. Animation Loop with Tab Visibility Pause
      let isTabVisible = !document.hidden;
      let clockTime = 0;
      const animate = () => {
        if (!isTabVisible) {
          animFrameIdRef.current = null;
          return;
        }
        animFrameIdRef.current = requestAnimationFrame(animate);
        clockTime += 0.01;

        // Earth Diurnal Rotation
        if (earthMeshRef.current) {
          earthMeshRef.current.rotation.y += 0.001;
        }
        // Differential atmospheric cloud movement (weather systems drift across surface)
        if (cloudsMeshRef.current) {
          cloudsMeshRef.current.rotation.y += 0.0014;
        }

        // Camera smooth transition lerp
        if (targetCamPosRef.current && targetLookAtRef.current && controlsRef.current) {
          camera.position.lerp(targetCamPosRef.current, 0.08);
          controls.target.lerp(targetLookAtRef.current, 0.08);

          if (camera.position.distanceTo(targetCamPosRef.current) < 0.02) {
            targetCamPosRef.current = null;
            targetLookAtRef.current = null;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleVisibilityChange = () => {
        isTabVisible = !document.hidden;
        if (isTabVisible && !animFrameIdRef.current) {
          animate();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 12. Resize Observer
      const handleResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      };
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // Cleanup
      return () => {
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
        earthGeo.dispose();
        earthMat.dispose();
        cloudGeo.dispose();
        cloudMat.dispose();
        atmosGeo.dispose();
        atmosMat.dispose();
        haloGeo.dispose();
        haloMat.dispose();
        moonGeo.dispose();
        moonMat.dispose();
        sunGeo.dispose();
        sunMat.dispose();
        coronaTex.dispose();
        coronaSpriteMat.dispose();
        starGeometry.dispose();
        starMaterial.dispose();
        selectedGeo.dispose();
        selectedMat.dispose();
        commsGeo.dispose();
        commsMat.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    // Update Celestial Positions (Sun, Moon, Comms Beam) when simulationDate changes
    useEffect(() => {
      const sunGroup = sunGroupRef.current;
      const sunLight = sunLightRef.current;
      const moonGroup = moonGroupRef.current;
      const commsBeam = commsBeamRef.current;
      const selectedMarker = selectedMarkerRef.current;
      if (!sunGroup || !sunLight || !moonGroup || !commsBeam || !selectedMarker) return;

      const ephemeris = calculateLunarEphemeris(simulationDate);
      const { subSolarLat, subSolarLon, subEarthLat, subEarthLon } = ephemeris;

      // 1. Sun Position & Lighting: Shines towards origin (Earth at 0, 0, 0)
      const sunPos = selenographicToCartesian(subSolarLat, subSolarLon, SUN_DISTANCE);
      sunGroup.position.copy(sunPos);

      sunLight.position.copy(sunPos);
      sunLight.target.position.set(0, 0, 0);
      sunLight.target.updateMatrixWorld();

      // 2. Moon Position relative to Earth:
      // The Moon sits in space along the libration line-of-sight opposite to the sub-Earth vector
      const moonPos = selenographicToCartesian(-subEarthLat, 180 - subEarthLon, MOON_ORBIT_DISTANCE);
      moonGroup.position.copy(moonPos);

      // 3. Landing Site Selection Ring & Line-of-Sight Communications Beam
      if (selectedSite) {
        const siteLocal = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, MOON_RADIUS * 1.036);
        selectedMarker.position.copy(siteLocal);
        selectedMarker.lookAt(siteLocal.clone().multiplyScalar(2.0));
        selectedMarker.visible = true;

        const siteWorld = moonPos.clone().add(siteLocal);

        // Check topographic LOS
        const earthPosAngles = calculateEarthPosition(
          selectedSite.latitude,
          selectedSite.longitude,
          subEarthLat,
          subEarthLon
        );
        const rimElev = getCraterRimHorizonElevation(
          earthPosAngles.azimuthDeg,
          selectedSite.terrain.craterRimMask
        );
        const hasLOS = earthPosAngles.elevationDeg > 0 && earthPosAngles.elevationDeg > rimElev;

        // Draw active laser/radio carrier beam between Moon landing site and Earth center
        commsBeam.geometry.dispose();
        commsBeam.geometry = new THREE.BufferGeometry().setFromPoints([
          siteWorld,
          new THREE.Vector3(0, 0, 0),
        ]);
        (commsBeam.material as THREE.LineDashedMaterial).color.setHex(hasLOS ? 0x38bdf8 : 0xf43f5e);
        commsBeam.computeLineDistances();
        commsBeam.visible = true;
      }
    }, [simulationDate, selectedSite]);

    // Update Candidate Site Marker Pins on the Moon
    useEffect(() => {
      const markersGroup = markersGroupRef.current;
      if (!markersGroup) return;

      while (markersGroup.children.length > 0) {
        const child = markersGroup.children[0] as THREE.Mesh;
        if (child.geometry) child.geometry.dispose();
        markersGroup.remove(child);
      }

      candidateSites.forEach(site => {
        const isSelected = site.id === selectedSite.id;
        const pos = selenographicToCartesian(site.latitude, site.longitude, MOON_RADIUS * 1.03);

        const pinGeo = new THREE.SphereGeometry(isSelected ? 0.016 : 0.01, 14, 14);
        const pinMat = new THREE.MeshBasicMaterial({
          color: isSelected
            ? 0x38bdf8
            : site.terrain.isPermanentShadowRegion
            ? 0x818cf8
            : 0xf59e0b,
        });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.copy(pos);
        pinMesh.userData = { siteId: site.id };
        markersGroup.add(pinMesh);
      });
    }, [candidateSites, selectedSite]);

    // Handle Raycast on Moon Surface to select candidate site
    const handleCanvasClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        const camera = cameraRef.current;
        const markersGroup = markersGroupRef.current;
        const moonMesh = moonMeshRef.current;
        if (!container || !camera || !markersGroup || !moonMesh) return;

        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

        const markerHits = raycaster.intersectObjects(markersGroup.children, false);
        if (markerHits.length > 0) {
          const hit = markerHits[0].object;
          if (hit.userData?.siteId) {
            onSelectSite(hit.userData.siteId);
            return;
          }
        }

        const moonHits = raycaster.intersectObject(moonMesh, false);
        if (moonHits.length > 0) {
          const hit = moonHits[0];
          const localPoint = hit.point.clone();
          moonMesh.worldToLocal(localPoint);
          const { lat, lon } = cartesianToSelenographic(localPoint);

          const nearest = candidateSites.find(
            s => Math.abs(s.latitude - lat) < 2.0 && Math.abs(s.longitude - lon) < 2.0
          );
          if (nearest) {
            onSelectSite(nearest.id);
          }
        }
      },
      [candidateSites, onSelectSite]
    );

    if (!webglSupported) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#020408] text-slate-300 font-mono text-xs p-6 text-center">
          <p className="font-semibold text-sky-400">WebGL 3D Acceleration Required</p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden"
      />
    );
  }
);

LunarEarth3DCanvas.displayName = 'LunarEarth3DCanvas';
