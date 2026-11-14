'use client';

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { selenographicToCartesian, cartesianToSelenographic } from '@/lib/astronomy/lunar3DCoordinates';
import { createProceduralLunarTextures } from '@/lib/textures/proceduralMoonTexture';
import { calculateLunarEphemeris } from '@/lib/astronomy/ephemeris';
import { CandidateLandingSite } from '@/types/mission';

export interface LunarSun3DCanvasHandles {
  resetView: () => void;
  focusSouthPole: () => void;
  focusSelectedSite: () => void;
  viewFromSun: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface LunarSun3DCanvasProps {
  simulationDate: Date;
  candidateSites: CandidateLandingSite[];
  selectedSite: CandidateLandingSite;
  onSelectSite: (siteId: string) => void;
}

const SUN_DISTANCE = 13.5; // Distance in Three.js scene units

/**
 * Creates an emissive procedural Sun texture with turbulent solar plasma granulation.
 */
function createProceduralSunTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = size / 2;
  const cy = size / 2;

  // Radial photosphere gradient
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.35, '#fffbeb');
  grad.addColorStop(0.7, '#fef08a');
  grad.addColorStop(0.88, '#f59e0b');
  grad.addColorStop(1.0, '#d97706');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Solar plasma granules and flares
  ctx.fillStyle = 'rgba(255, 247, 237, 0.12)';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coronal filament streaks
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r1 = size * 0.35 + Math.random() * 20;
    const r2 = size * 0.48 + Math.random() * 25;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle + 0.1) * r2, cy + Math.sin(angle + 0.1) * r2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates radial glow corona billboard sprite texture.
 */
function createSunCoronaTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(254, 240, 138, 0.85)');
  grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
  grad.addColorStop(0.75, 'rgba(217, 119, 6, 0.15)');
  grad.addColorStop(1.0, 'rgba(180, 83, 9, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

export const LunarSun3DCanvas = forwardRef<LunarSun3DCanvasHandles, LunarSun3DCanvasProps>(
  ({ simulationDate, candidateSites, selectedSite, onSelectSite }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animFrameIdRef = useRef<number | null>(null);

    // Dynamic 3D Object references
    const moonGroupRef = useRef<THREE.Group | null>(null);
    const moonMeshRef = useRef<THREE.Mesh | null>(null);
    const markersGroupRef = useRef<THREE.Group | null>(null);
    const selectedRingRef = useRef<THREE.Mesh | null>(null);
    const selectedLineRef = useRef<THREE.Line | null>(null);

    // Sun & Sunlight references
    const sunGroupRef = useRef<THREE.Group | null>(null);
    const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
    const sunPointLightRef = useRef<THREE.PointLight | null>(null);
    const sunCoronaRef = useRef<THREE.Sprite | null>(null);
    const sunRaysGroupRef = useRef<THREE.Group | null>(null);
    const sunBeamsMeshRef = useRef<THREE.Mesh | null>(null);

    const [webglSupported] = useState(true);

    // Target camera positions for smooth button transitions
    const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
    const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

    // Expose camera presets
    useImperativeHandle(ref, () => ({
      resetView: () => {
        // Broad space perspective showing both the glowing Sun and illuminated Moon
        targetCamPosRef.current = new THREE.Vector3(2.5, 3.8, 5.8);
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      focusSouthPole: () => {
        // Direct close-up perspective of the Lunar South Pole (-Y)
        targetCamPosRef.current = new THREE.Vector3(0, -2.1, 0.85);
        targetLookAtRef.current = new THREE.Vector3(0, -0.6, 0);
      },
      focusSelectedSite: () => {
        if (!selectedSite) return;
        const sitePos = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, 1.0);
        const camPos = sitePos.clone().multiplyScalar(2.2);
        targetCamPosRef.current = camPos;
        targetLookAtRef.current = sitePos.clone().multiplyScalar(0.7);
      },
      viewFromSun: () => {
        if (!sunGroupRef.current) return;
        const sunPos = sunGroupRef.current.position.clone();
        // Place camera slightly behind and above the Sun looking straight at the Moon
        targetCamPosRef.current = sunPos.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, 0.5, 0));
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      zoomIn: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, 0.5);
        controlsRef.current.update();
      },
      zoomOut: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, -0.5);
        controlsRef.current.update();
      },
    }));

    // Three.js Scene Initialization
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      // 1. Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color('#030508');

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
      camera.position.set(2.8, 3.2, 5.5);
      cameraRef.current = camera;

      // 3. Renderer with ACES tone mapping
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 1.15; // Close lunar crater inspection
      controls.maxDistance = 25.0; // Wide astronomical view of Sun and Moon in space
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // 5. Starfield Background
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1800;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 40.0 + Math.random() * 25.0;
        starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i + 2] = r * Math.cos(phi);
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: 0x94a3b8,
        size: 0.65,
        sizeAttenuation: true,
      });
      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);

      // 6. Deep Space Ambient & Earthshine (stark shadows in vacuum)
      const ambientLight = new THREE.AmbientLight(0x050812, 0.04);
      scene.add(ambientLight);

      // 7. Dynamic Sun Group & Solar Light Source
      const sunGroup = new THREE.Group();
      scene.add(sunGroup);
      sunGroupRef.current = sunGroup;

      // Photosphere mesh
      const sunTexture = createProceduralSunTexture();
      const sunGeo = new THREE.SphereGeometry(1.2, 36, 36);
      const sunMat = new THREE.MeshBasicMaterial({
        map: sunTexture,
        color: 0xffffff,
      });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunGroup.add(sunMesh);

      // Inner Corona Glow Layer (Inverted normal glowing sphere)
      const innerCoronaGeo = new THREE.SphereGeometry(1.32, 28, 28);
      const innerCoronaMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.45,
        side: THREE.BackSide,
      });
      const innerCoronaMesh = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
      sunGroup.add(innerCoronaMesh);

      // Billboard Corona Flare Sprite
      const coronaTexture = createSunCoronaTexture();
      const coronaMaterial = new THREE.SpriteMaterial({
        map: coronaTexture,
        color: 0xfffbeb,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sunCorona = new THREE.Sprite(coronaMaterial);
      sunCorona.scale.set(6.2, 6.2, 1.0);
      sunGroup.add(sunCorona);
      sunCoronaRef.current = sunCorona;

      // True Sun Directional Light illuminating the Moon
      const sunLight = new THREE.DirectionalLight(0xfffaed, 4.4);
      sunLight.castShadow = false; // Simple high-performance clean lighting
      scene.add(sunLight);
      sunLightRef.current = sunLight;

      // Auxiliary point light for local glow
      const sunPointLight = new THREE.PointLight(0xffedd5, 1.8, 30, 0.4);
      sunGroup.add(sunPointLight);
      sunPointLightRef.current = sunPointLight;

      // 8. Sunlight Rays Streaming Toward the Moon
      const sunRaysGroup = new THREE.Group();
      scene.add(sunRaysGroup);
      sunRaysGroupRef.current = sunRaysGroup;

      // Volumetric translucent cylinder representing the solar beam path
      const beamGeo = new THREE.CylinderGeometry(0.8, 1.3, SUN_DISTANCE, 24, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const sunBeamsMesh = new THREE.Mesh(beamGeo, beamMat);
      sunRaysGroup.add(sunBeamsMesh);
      sunBeamsMeshRef.current = sunBeamsMesh;

      // Collimated golden ray lines connecting the Sun to the Moon
      const rayLinesGeo = new THREE.BufferGeometry();
      const rayLineCount = 18;
      const rayPositions = new Float32Array(rayLineCount * 2 * 3);
      for (let i = 0; i < rayLineCount; i++) {
        const offsetAngle = (i / rayLineCount) * Math.PI * 2;
        const radiusSun = 0.95;
        const radiusMoon = 0.85;
        const sx = Math.cos(offsetAngle) * radiusSun;
        const sy = Math.sin(offsetAngle) * radiusSun;
        const mx = Math.cos(offsetAngle) * radiusMoon;
        const my = Math.sin(offsetAngle) * radiusMoon;

        const idx = i * 6;
        // Start near Sun
        rayPositions[idx] = sx;
        rayPositions[idx + 1] = sy;
        rayPositions[idx + 2] = SUN_DISTANCE * 0.45;
        // End near Moon
        rayPositions[idx + 3] = mx;
        rayPositions[idx + 4] = my;
        rayPositions[idx + 5] = -SUN_DISTANCE * 0.45;
      }
      rayLinesGeo.setAttribute('position', new THREE.BufferAttribute(rayPositions, 3));
      const rayLinesMat = new THREE.LineBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
      });
      const rayLines = new THREE.LineSegments(rayLinesGeo, rayLinesMat);
      sunRaysGroup.add(rayLines);

      // 9. High-Resolution Displaced 3D Moon (Reused from Moon simulation)
      const moonGroup = new THREE.Group();
      scene.add(moonGroup);
      moonGroupRef.current = moonGroup;

      const { albedoTexture, displacementTexture, normalTexture } = createProceduralLunarTextures();
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      albedoTexture.anisotropy = maxAniso;
      displacementTexture.anisotropy = maxAniso;
      normalTexture.anisotropy = maxAniso;

      const moonGeometry = new THREE.SphereGeometry(1.0, 180, 180);
      const moonMaterial = new THREE.MeshStandardMaterial({
        map: albedoTexture,
        displacementMap: displacementTexture,
        displacementScale: 0.065,
        displacementBias: -0.0325,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.96,
        metalness: 0.01,
      });

      const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
      moonGroup.add(moonMesh);
      moonMeshRef.current = moonMesh;

      // Group for candidate markers
      const markersGroup = new THREE.Group();
      moonGroup.add(markersGroup);
      markersGroupRef.current = markersGroup;

      // Selected Site Indicator Ring & Sun elevation ray line
      const selectedRingGeo = new THREE.RingGeometry(0.026, 0.036, 24);
      const selectedRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const selectedRing = new THREE.Mesh(selectedRingGeo, selectedRingMat);
      selectedRing.visible = false;
      moonGroup.add(selectedRing);
      selectedRingRef.current = selectedRing;

      // Solar horizon ray pointing toward the Sun from the selected landing site
      const sunPointerLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.4, 0),
      ]);
      const sunPointerLineMat = new THREE.LineBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        linewidth: 2,
      });
      const selectedLine = new THREE.Line(sunPointerLineGeo, sunPointerLineMat);
      selectedLine.visible = false;
      moonGroup.add(selectedLine);
      selectedLineRef.current = selectedLine;

      // 10. Animation Loop
      let clockTime = 0;
      const animate = () => {
        animFrameIdRef.current = requestAnimationFrame(animate);
        clockTime += 0.015;

        // Subtle solar corona pulsation & plasma rotation
        if (sunCoronaRef.current) {
          const pulse = 1.0 + Math.sin(clockTime * 2.0) * 0.03;
          sunCoronaRef.current.scale.set(6.2 * pulse, 6.2 * pulse, 1.0);
        }
        if (sunBeamsMeshRef.current) {
          // Slow pulsation in beam intensity
          (sunBeamsMeshRef.current.material as THREE.MeshBasicMaterial).opacity =
            0.045 + Math.sin(clockTime * 1.5) * 0.015;
        }

        // Smooth camera transitions if target is set
        if (targetCamPosRef.current && targetLookAtRef.current && controlsRef.current) {
          camera.position.lerp(targetCamPosRef.current, 0.08);
          controls.target.lerp(targetLookAtRef.current, 0.08);

          if (camera.position.distanceTo(targetCamPosRef.current) < 0.01) {
            targetCamPosRef.current = null;
            targetLookAtRef.current = null;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // 11. Resize Observer
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
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
        moonGeometry.dispose();
        moonMaterial.dispose();
        albedoTexture.dispose();
        displacementTexture.dispose();
        normalTexture.dispose();
        sunGeo.dispose();
        sunMat.dispose();
        sunTexture.dispose();
        innerCoronaGeo.dispose();
        innerCoronaMat.dispose();
        coronaTexture.dispose();
        coronaMaterial.dispose();
        beamGeo.dispose();
        beamMat.dispose();
        rayLinesGeo.dispose();
        rayLinesMat.dispose();
        starGeometry.dispose();
        starMaterial.dispose();
        selectedRingGeo.dispose();
        selectedRingMat.dispose();
        sunPointerLineGeo.dispose();
        sunPointerLineMat.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    // Update Sun Position when simulationDate changes
    useEffect(() => {
      const sunGroup = sunGroupRef.current;
      const sunLight = sunLightRef.current;
      const sunRaysGroup = sunRaysGroupRef.current;
      if (!sunGroup || !sunLight || !sunRaysGroup) return;

      // Compute precise Ephemeris for date
      const ephemeris = calculateLunarEphemeris(simulationDate);
      const { subSolarLat, subSolarLon } = ephemeris;

      // Convert sub-solar coordinates to 3D Cartesian position vector
      const sunPos = selenographicToCartesian(subSolarLat, subSolarLon, SUN_DISTANCE);
      sunGroup.position.copy(sunPos);

      // Directional light shines from the Sun towards Moon center (0, 0, 0)
      sunLight.position.copy(sunPos);
      sunLight.target.position.set(0, 0, 0);
      sunLight.target.updateMatrixWorld();

      // Orient sunlight rays cylinder along the line between Sun and Moon
      const midpoint = sunPos.clone().multiplyScalar(0.5);
      sunRaysGroup.position.copy(midpoint);
      sunRaysGroup.lookAt(sunPos);
      // Rotate 90 degrees around X because cylinder geometry default orientation is along Y
      sunRaysGroup.rotateX(Math.PI / 2);
    }, [simulationDate]);

    // Update Candidate Site Markers & Selected Site Ring
    useEffect(() => {
      const markersGroup = markersGroupRef.current;
      const selectedRing = selectedRingRef.current;
      const selectedLine = selectedLineRef.current;
      if (!markersGroup || !selectedRing || !selectedLine) return;

      // Clear previous candidate marker pins
      while (markersGroup.children.length > 0) {
        const child = markersGroup.children[0] as THREE.Mesh;
        if (child.geometry) child.geometry.dispose();
        markersGroup.remove(child);
      }

      candidateSites.forEach(site => {
        const isSelected = site.id === selectedSite.id;
        const pos = selenographicToCartesian(site.latitude, site.longitude, 1.036);

        // Marker Sphere Pin
        const pinGeo = new THREE.SphereGeometry(isSelected ? 0.024 : 0.016, 16, 16);
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

      // Update Selected Site Ring
      if (selectedSite) {
        const selPos = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, 1.038);
        selectedRing.position.copy(selPos);
        selectedRing.lookAt(selPos.clone().multiplyScalar(2.0));
        selectedRing.visible = true;

        // Position pointer beam pointing outward from the landing site
        const eph = calculateLunarEphemeris(simulationDate);
        const sunWorldPos = selenographicToCartesian(eph.subSolarLat, eph.subSolarLon, 1.0);
        // Local sun direction from landing site
        const sunDir = sunWorldPos.clone().sub(selPos.clone().normalize()).normalize().multiplyScalar(0.25);
        const lineEnd = selPos.clone().add(sunDir);

        selectedLine.geometry.dispose();
        selectedLine.geometry = new THREE.BufferGeometry().setFromPoints([selPos, lineEnd]);
        selectedLine.visible = true;
      }
    }, [candidateSites, selectedSite, simulationDate]);

    // Handle Raycast Selection on Moon Mesh
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

        // Check if user clicked a marker pin
        const markerHits = raycaster.intersectObjects(markersGroup.children, false);
        if (markerHits.length > 0) {
          const hit = markerHits[0].object;
          if (hit.userData?.siteId) {
            onSelectSite(hit.userData.siteId);
            return;
          }
        }

        // Raycast against the lunar surface
        const moonHits = raycaster.intersectObject(moonMesh, false);
        if (moonHits.length > 0) {
          const hit = moonHits[0];
          const localPoint = hit.point.clone();
          moonMesh.worldToLocal(localPoint);
          const { lat, lon } = cartesianToSelenographic(localPoint);

          // Find nearest candidate site within 1.0 degree
          const nearest = candidateSites.find(
            s => Math.abs(s.latitude - lat) < 1.0 && Math.abs(s.longitude - lon) < 1.0
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
        <div className="w-full h-full flex items-center justify-center bg-[#05070c] text-slate-300 font-mono text-xs p-6 text-center">
          <p className="font-semibold text-amber-400">WebGL Acceleration Required for 3D Sun Simulation</p>
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

LunarSun3DCanvas.displayName = 'LunarSun3DCanvas';
