'use client';

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { selenographicToCartesian, cartesianToSelenographic } from '@/lib/astronomy/lunar3DCoordinates';
import { createProceduralLunarTextures } from '@/lib/textures/proceduralMoonTexture';
import { createProceduralEarthTexture } from '@/lib/textures/proceduralEarthTexture';
import { CandidateLandingSite } from '@/types/mission';

export interface Lunar3DCanvasHandles {
  resetCamera: () => void;
  focusSouthPole: () => void;
  focusCoordinates: (lat: number, lon: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Lunar3DCanvasProps {
  candidateSites: CandidateLandingSite[];
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  onRaycastPoint: (lat: number, lon: number) => void;
  inspectedPoint: { lat: number; lon: number } | null;
  /** Scroll progress [0.0 (deep space opening) to 1.0 (interactive close vantage)] */
  scrollProgress?: number;
  /** Whether to render distant background Earth */
  showBackgroundEarth?: boolean;
}

/**
 * Computes smooth camera position along the cislunar approach trajectory based on scroll progress.
 */
function getScrollyCamera(t: number): { pos: THREE.Vector3; lookAt: THREE.Vector3 } {
  const s = Math.max(0, Math.min(1, t));
  if (s < 0.45) {
    const u = s / 0.45;
    const f = 0.5 - 0.5 * Math.cos(u * Math.PI);
    return {
      pos: new THREE.Vector3(
        THREE.MathUtils.lerp(2.2, 0.8, f),
        THREE.MathUtils.lerp(1.3, 0.2, f),
        THREE.MathUtils.lerp(6.5, 3.2, f)
      ),
      lookAt: new THREE.Vector3(0, THREE.MathUtils.lerp(0, -0.15, f), 0),
    };
  } else {
    const u = (s - 0.45) / 0.55;
    const f = 0.5 - 0.5 * Math.cos(u * Math.PI);
    return {
      pos: new THREE.Vector3(
        THREE.MathUtils.lerp(0.8, 0, f),
        THREE.MathUtils.lerp(0.2, -1.25, f),
        THREE.MathUtils.lerp(3.2, 1.55, f)
      ),
      lookAt: new THREE.Vector3(0, 0, 0),
    };
  }
}

export const Lunar3DCanvas = forwardRef<Lunar3DCanvasHandles, Lunar3DCanvasProps>(
  (
    {
      candidateSites,
      selectedSiteId,
      onSelectSite,
      onRaycastPoint,
      inspectedPoint,
      scrollProgress,
      showBackgroundEarth = true,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const moonGroupRef = useRef<THREE.Group | null>(null);
    const moonMeshRef = useRef<THREE.Mesh | null>(null);
    const earthGroupRef = useRef<THREE.Group | null>(null);
    const markersGroupRef = useRef<THREE.Group | null>(null);
    const inspectedMarkerRef = useRef<THREE.Mesh | null>(null);
    const animFrameIdRef = useRef<number | null>(null);

    // Keep active scroll progress ref for zero-latency frame interpolation
    const scrollProgressRef = useRef<number | undefined>(scrollProgress);
    useEffect(() => {
      scrollProgressRef.current = scrollProgress;
    }, [scrollProgress]);

    const [webglSupported, setWebglSupported] = useState(true);

    // Target camera positions for smooth button transitions
    const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
    const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

    // Camera Actions exposed to parent
    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        // Orbital perspective with Moon prominently sized
        targetCamPosRef.current = new THREE.Vector3(0, 0.32, 2.05);
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      focusSouthPole: () => {
        // Direct close-up perspective of the Lunar South Pole (-Y)
        targetCamPosRef.current = new THREE.Vector3(0, -1.82, 0.38);
        targetLookAtRef.current = new THREE.Vector3(0, -0.75, 0);
      },
      focusCoordinates: (lat: number, lon: number) => {
        const cart = selenographicToCartesian(lat, lon, 2.05);
        targetCamPosRef.current = cart;
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      zoomIn: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, 0.3);
        controlsRef.current.update();
      },
      zoomOut: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, -0.3);
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
      scene.background = new THREE.Color('#05070c');

      // 2. Camera - Increased Moon prominence by ~30% with South Pole clearly visible
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, -1.25, 1.55);
      cameraRef.current = camera;

      // 3. Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 1.12; // Close polar and crater terrace inspection
      controls.maxDistance = 4.8; // Global vantage
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // 5. Lighting
      // Natural directional sunlight (intense vacuum solar beam creating stark crater shadows and rim highlights)
      const sunLight = new THREE.DirectionalLight(0xfffaed, 3.6);
      sunLight.position.set(5.0, 0.35, 3.8).normalize();
      scene.add(sunLight);

      // Deep vacuum earthshine (minimal ambient fill to avoid washed-out/flat appearance)
      const earthshine = new THREE.AmbientLight(0x040810, 0.06);
      scene.add(earthshine);

      // Distant limb rim fill (subtle starlight defining the dark limb silhouette)
      const rimLight = new THREE.DirectionalLight(0x1e293b, 0.22);
      rimLight.position.set(-4.5, -0.5, -3.5).normalize();
      scene.add(rimLight);

      // 6. Starfield Background (Optimized particle count)
      const starGeometry = new THREE.BufferGeometry();
      const starCount = isMobile ? 300 : 500;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 25.0 + Math.random() * 15.0;
        starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i + 2] = r * Math.cos(phi);
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: 0x94a3b8,
        size: 0.6,
        sizeAttenuation: true,
      });
      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);

      // 7. Displaced 3D Moon Mesh
      const moonGroup = new THREE.Group();
      scene.add(moonGroup);
      moonGroupRef.current = moonGroup;

      const { albedoTexture, displacementTexture, normalTexture } = createProceduralLunarTextures();

      // Configure hardware anisotropic filtering for razor-sharp glancing angles
      const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), isMobile ? 4 : 8);
      albedoTexture.anisotropy = maxAniso;
      displacementTexture.anisotropy = maxAniso;
      normalTexture.anisotropy = maxAniso;

      // Adaptive geometry resolution for smooth 60fps on mobile & high-end performance on desktop
      const sphereRes = isMobile ? 96 : 144;
      const moonGeometry = new THREE.SphereGeometry(1.0, sphereRes, sphereRes);
      const moonMaterial = new THREE.MeshStandardMaterial({
        map: albedoTexture,
        displacementMap: displacementTexture,
        displacementScale: 0.065,
        displacementBias: -0.0325,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.95,
        metalness: 0.01,
      });

      const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
      moonGroup.add(moonMesh);
      moonMeshRef.current = moonMesh;

      // Group for candidate markers attached as children of the Moon
      const markersGroup = new THREE.Group();
      moonGroup.add(markersGroup);
      markersGroupRef.current = markersGroup;

      // 8. Distant Background Earth (Cislunar Perspective)
      let earthGroup: THREE.Group | null = null;
      let earthGeo: THREE.SphereGeometry | null = null;
      let earthMat: THREE.MeshStandardMaterial | null = null;
      let earthTexture: THREE.CanvasTexture | null = null;
      let atmosGeo: THREE.SphereGeometry | null = null;
      let atmosMat: THREE.MeshBasicMaterial | null = null;

      if (showBackgroundEarth) {
        earthGroup = new THREE.Group();
        earthGroup.position.set(-9.5, 4.8, -12.5);
        scene.add(earthGroup);
        earthGroupRef.current = earthGroup;

        earthTexture = createProceduralEarthTexture();
        earthGeo = new THREE.SphereGeometry(1.35, 48, 48);
        earthMat = new THREE.MeshStandardMaterial({
          map: earthTexture,
          roughness: 0.75,
          metalness: 0.05,
        });
        const earthMesh = new THREE.Mesh(earthGeo, earthMat);
        earthGroup.add(earthMesh);

        // Atmospheric Rim Glow
        atmosGeo = new THREE.SphereGeometry(1.42, 32, 32);
        atmosMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.18,
          side: THREE.BackSide,
        });
        const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
        earthGroup.add(atmosMesh);
      }

      // Inspected Point Marker (Crosshair pin)
      const inspectedGeo = new THREE.RingGeometry(0.015, 0.022, 24);
      const inspectedMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        side: THREE.DoubleSide,
      });
      const inspectedMarker = new THREE.Mesh(inspectedGeo, inspectedMat);
      inspectedMarker.visible = false;
      moonGroup.add(inspectedMarker);
      inspectedMarkerRef.current = inspectedMarker;

      // 9. Animation Loop with Visibility Auto-Pause
      let isRunning = true;
      const animate = () => {
        if (!isRunning) return;
        animFrameIdRef.current = requestAnimationFrame(animate);

        // Slowly rotate background Earth
        if (earthGroupRef.current) {
          earthGroupRef.current.rotation.y += 0.0006;
        }

        const sProg = scrollProgressRef.current;
        const isCinematicScroll = sProg !== undefined && sProg < 0.98;

        if (isCinematicScroll) {
          // Scroll-driven camera approach trajectory
          const { pos, lookAt } = getScrollyCamera(sProg);
          camera.position.lerp(pos, 0.12);
          controls.target.lerp(lookAt, 0.12);
          controls.enabled = false;

          // Hide UI markers during deep space flight; reveal upon orbit arrival
          if (markersGroupRef.current) {
            markersGroupRef.current.visible = sProg > 0.72;
          }
        } else {
          // Full Interactive Mode
          controls.enabled = true;
          if (markersGroupRef.current) {
            markersGroupRef.current.visible = true;
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
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Pause rendering loop when tab or browser is hidden to save battery & GPU
      const handleVisibilityChange = () => {
        if (document.hidden) {
          if (animFrameIdRef.current) {
            cancelAnimationFrame(animFrameIdRef.current);
            animFrameIdRef.current = null;
          }
        } else if (!animFrameIdRef.current && isRunning) {
          animate();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 10. Resize Handler
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
        isRunning = false;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
        moonGeometry.dispose();
        moonMaterial.dispose();
        starGeometry.dispose();
        starMaterial.dispose();
        inspectedGeo.dispose();
        inspectedMat.dispose();
        if (earthGeo) earthGeo.dispose();
        if (earthMat) earthMat.dispose();
        if (atmosGeo) atmosGeo.dispose();
        if (atmosMat) atmosMat.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    // Update 3D Markers when candidateSites or selectedSiteId change
    useEffect(() => {
      const markersGroup = markersGroupRef.current;
      if (!markersGroup) return;

      // Clear existing markers
      while (markersGroup.children.length > 0) {
        const child = markersGroup.children[0] as THREE.Mesh;
        if (child.geometry) child.geometry.dispose();
        markersGroup.remove(child);
      }

      // Add pin mesh for each candidate site
      candidateSites.forEach(site => {
        const isSelected = site.id === selectedSiteId;
        // Radius 1.036 sits cleanly above displaced surface elevation massifs
        const pos = selenographicToCartesian(site.latitude, site.longitude, 1.036);

        // Marker Pin Anchor Sphere
        const pinGeo = new THREE.SphereGeometry(isSelected ? 0.022 : 0.015, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x38bdf8 : site.terrain.isPermanentShadowRegion ? 0x818cf8 : 0xf59e0b,
        });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.copy(pos);
        pinMesh.userData = { siteId: site.id };

        // Selection Pulse Ring
        if (isSelected) {
          const ringGeo = new THREE.RingGeometry(0.028, 0.035, 24);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.position.copy(pos.clone().multiplyScalar(1.003));
          ringMesh.lookAt(pos.clone().multiplyScalar(2.0));
          markersGroup.add(ringMesh);
        }

        markersGroup.add(pinMesh);
      });
    }, [candidateSites, selectedSiteId]);

    // Update Inspected Point Ring Marker
    useEffect(() => {
      const inspectedMarker = inspectedMarkerRef.current;
      if (!inspectedMarker) return;

      if (!inspectedPoint) {
        inspectedMarker.visible = false;
        return;
      }

      const pos = selenographicToCartesian(inspectedPoint.lat, inspectedPoint.lon, 1.038);
      inspectedMarker.position.copy(pos);
      inspectedMarker.lookAt(pos.clone().multiplyScalar(2.0));
      inspectedMarker.visible = true;
    }, [inspectedPoint]);

    // Handle Canvas Click & Raycasting
    const handleCanvasClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        const camera = cameraRef.current;
        const moonMesh = moonMeshRef.current;
        const markersGroup = markersGroupRef.current;
        if (!container || !camera || !moonMesh || !markersGroup) return;

        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

        // 1. Check if user clicked an existing candidate site marker pin
        const markerIntersects = raycaster.intersectObjects(markersGroup.children, false);
        if (markerIntersects.length > 0) {
          const hit = markerIntersects[0].object;
          if (hit.userData?.siteId) {
            onSelectSite(hit.userData.siteId);
            return;
          }
        }

        // 2. Otherwise raycast against the lunar sphere surface mesh
        const moonIntersects = raycaster.intersectObject(moonMesh, false);
        if (moonIntersects.length > 0) {
          const hit = moonIntersects[0];
          // Transform intersection point to local Moon coordinates
          const localPoint = hit.point.clone();
          moonMesh.worldToLocal(localPoint);

          const { lat, lon } = cartesianToSelenographic(localPoint);
          onRaycastPoint(lat, lon);
        }
      },
      [onSelectSite, onRaycastPoint]
    );

    if (!webglSupported) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#05070c] text-slate-300 font-mono text-xs p-6 text-center">
          <div className="max-w-md space-y-2">
            <p className="font-semibold text-sky-400">WebGL Acceleration Required</p>
            <p className="text-[11px] text-slate-400">
              Hardware-accelerated WebGL 3D rendering is unavailable on this browser or device. Please enable hardware acceleration in browser settings to explore the 3D Moon.
            </p>
          </div>
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

Lunar3DCanvas.displayName = 'Lunar3DCanvas';
