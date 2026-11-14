'use client';

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { selenographicToCartesian, cartesianToSelenographic } from '@/lib/astronomy/lunar3DCoordinates';
import { createProceduralLunarTextures } from '@/lib/textures/proceduralMoonTexture';
import { CandidateLandingSite } from '@/types/mission';

export interface Lunar3DCanvasHandles {
  resetCamera: () => void;
  focusSouthPole: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Lunar3DCanvasProps {
  candidateSites: CandidateLandingSite[];
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  onRaycastPoint: (lat: number, lon: number) => void;
  inspectedPoint: { lat: number; lon: number } | null;
}

export const Lunar3DCanvas = forwardRef<Lunar3DCanvasHandles, Lunar3DCanvasProps>(
  ({ candidateSites, selectedSiteId, onSelectSite, onRaycastPoint, inspectedPoint }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const moonGroupRef = useRef<THREE.Group | null>(null);
    const moonMeshRef = useRef<THREE.Mesh | null>(null);
    const markersGroupRef = useRef<THREE.Group | null>(null);
    const inspectedMarkerRef = useRef<THREE.Mesh | null>(null);
    const animFrameIdRef = useRef<number | null>(null);

    // Target camera positions for smooth transitions
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

      // 6. Starfield Background
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1200;
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
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      albedoTexture.anisotropy = maxAniso;
      displacementTexture.anisotropy = maxAniso;
      normalTexture.anisotropy = maxAniso;

      // High-resolution sphere mesh (200x200 = 40,000 vertices) supporting true physical 3D displacement
      const moonGeometry = new THREE.SphereGeometry(1.0, 200, 200);
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

      // 8. Animation Loop
      const animate = () => {
        animFrameIdRef.current = requestAnimationFrame(animate);

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

      // 9. Resize Handler
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
