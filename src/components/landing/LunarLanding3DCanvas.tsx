'use client';

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { selenographicToCartesian, cartesianToSelenographic } from '@/lib/astronomy/lunar3DCoordinates';
import { createProceduralLunarTextures } from '@/lib/textures/proceduralMoonTexture';
import { createProceduralEarthTexture } from '@/lib/textures/proceduralEarthTexture';
import { calculateLunarEphemeris } from '@/lib/astronomy/ephemeris';
import { CandidateLandingSite } from '@/types/mission';

export type LandingPhase = 'orbit' | 'descending' | 'landed' | 'verified';

export interface LunarLanding3DCanvasHandles {
  resetCamera: () => void;
  focusLander: () => void;
  focusSouthPole: () => void;
  viewCislunarContext: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface LunarLanding3DCanvasProps {
  simulationDate: Date;
  candidateSites: CandidateLandingSite[];
  selectedSite: CandidateLandingSite;
  landingPhase: LandingPhase;
  descentProgress: number; // 0.0 to 1.0
  onSelectSite: (siteId: string) => void;
}

const SUN_DISTANCE = 16.0;
const EARTH_DISTANCE = 12.0;

/**
 * Builds an authentic 3D Lunar Lander model using optimized procedural geometries.
 */
function create3DLunarLander(): THREE.Group {
  const lander = new THREE.Group();

  // 1. Octagonal Gold Foil Descent Stage
  const descentGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.035, 8);
  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.25,
  });
  const descentStage = new THREE.Mesh(descentGeo, goldFoilMat);
  descentStage.position.y = 0.025;
  lander.add(descentStage);

  // 2. White Thermal Blanket Crew Cabin / Avionics
  const cabinGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.045, 12);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.15,
    roughness: 0.8,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = 0.065;
  lander.add(cabin);

  // 3. Main Descent Engine Bell
  const engineGeo = new THREE.ConeGeometry(0.016, 0.025, 12, 1, true);
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.rotation.x = Math.PI;
  engine.position.y = 0.005;
  lander.add(engine);

  // 4. Engine Exhaust Flame (Visible during descent)
  const flameGeo = new THREE.ConeGeometry(0.014, 0.075, 12);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = -0.035;
  flame.name = 'engineFlame';
  flame.visible = false;
  lander.add(flame);

  // 5. 4 Outrigger Landing Legs with Footpads
  const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const legGroup = new THREE.Group();

    // Strut
    const strutGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.055, 6);
    const strut = new THREE.Mesh(strutGeo, legMat);
    strut.rotation.z = 0.6;
    strut.position.set(0.025, 0.005, 0);
    legGroup.add(strut);

    // Footpad
    const padGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.003, 8);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0.048, -0.015, 0);
    legGroup.add(pad);

    legGroup.rotation.y = angle;
    lander.add(legGroup);
  }

  // 6. Steerable High-Gain Earth Communication Dish
  const dishGeo = new THREE.SphereGeometry(0.018, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2.5);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.4,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.name = 'commsDish';
  dish.position.set(0.028, 0.09, 0);
  dish.rotation.x = -Math.PI / 3;
  lander.add(dish);

  // 7. Dual Vertical Solar Array Wings (VSAT)
  const solarGeo = new THREE.BoxGeometry(0.003, 0.08, 0.022);
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    metalness: 0.6,
    roughness: 0.2,
  });
  const solarLeft = new THREE.Mesh(solarGeo, solarMat);
  solarLeft.name = 'solarLeft';
  solarLeft.position.set(-0.04, 0.075, 0);
  lander.add(solarLeft);

  const solarRight = new THREE.Mesh(solarGeo, solarMat);
  solarRight.name = 'solarRight';
  solarRight.position.set(0.04, 0.075, 0);
  lander.add(solarRight);

  return lander;
}

export const LunarLanding3DCanvas = forwardRef<LunarLanding3DCanvasHandles, LunarLanding3DCanvasProps>(
  (
    {
      simulationDate,
      candidateSites,
      selectedSite,
      landingPhase,
      descentProgress,
      onSelectSite,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animFrameIdRef = useRef<number | null>(null);

    // Objects
    const moonGroupRef = useRef<THREE.Group | null>(null);
    const moonMeshRef = useRef<THREE.Mesh | null>(null);
    const markersGroupRef = useRef<THREE.Group | null>(null);
    const selectedRingRef = useRef<THREE.Mesh | null>(null);

    // 3D Lander & Thruster
    const landerGroupRef = useRef<THREE.Group | null>(null);
    const dustParticlesRef = useRef<THREE.Points | null>(null);

    // Cislunar Celestial Bodies
    const sunGroupRef = useRef<THREE.Group | null>(null);
    const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
    const earthGroupRef = useRef<THREE.Group | null>(null);
    const commsBeamRef = useRef<THREE.Line | null>(null);

    const [webglSupported] = useState(true);

    // Smooth camera transitions
    const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
    const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        // High lunar orbit view
        targetCamPosRef.current = new THREE.Vector3(0, -1.2, 1.85);
        targetLookAtRef.current = new THREE.Vector3(0, -0.4, 0);
      },
      focusLander: () => {
        if (!landerGroupRef.current) return;
        const lPos = landerGroupRef.current.position.clone();
        // Camera positioned close to lander
        targetCamPosRef.current = lPos.clone().add(new THREE.Vector3(0.2, 0.15, 0.3));
        targetLookAtRef.current = lPos;
      },
      focusSouthPole: () => {
        targetCamPosRef.current = new THREE.Vector3(0, -1.95, 0.6);
        targetLookAtRef.current = new THREE.Vector3(0, -0.85, 0);
      },
      viewCislunarContext: () => {
        // Broad space perspective showing Moon landing and distant Earth & Sun
        targetCamPosRef.current = new THREE.Vector3(3.2, 2.5, 4.8);
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      },
      zoomIn: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, 0.4);
        controlsRef.current.update();
      },
      zoomOut: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        cameraRef.current.position.addScaledVector(dir, -0.4);
        controlsRef.current.update();
      },
    }));

    // Three.js Scene Setup
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      // 1. Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color('#03050a');

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 150);
      camera.position.set(0, -1.2, 1.85);
      cameraRef.current = camera;

      // 3. Renderer with ACES Tone Mapping
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
      controls.minDistance = 0.08; // Touchdown inspection
      controls.maxDistance = 15.0;
      controls.target.set(0, -0.4, 0);
      controlsRef.current = controls;

      // 5. Starfield Background
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 2000;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 45.0 + Math.random() * 25.0;
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

      // 6. Deep Space Ambient Lighting
      const ambientLight = new THREE.AmbientLight(0x050814, 0.05);
      scene.add(ambientLight);

      // 7. Reused High-Resolution Displaced 3D Moon
      const moonGroup = new THREE.Group();
      scene.add(moonGroup);
      moonGroupRef.current = moonGroup;

      const { albedoTexture, displacementTexture, normalTexture } = createProceduralLunarTextures();
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      albedoTexture.anisotropy = maxAniso;
      displacementTexture.anisotropy = maxAniso;
      normalTexture.anisotropy = maxAniso;

      const moonGeo = new THREE.SphereGeometry(1.0, 180, 180);
      const moonMat = new THREE.MeshStandardMaterial({
        map: albedoTexture,
        displacementMap: displacementTexture,
        displacementScale: 0.065,
        displacementBias: -0.0325,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.96,
        metalness: 0.01,
      });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      moonGroup.add(moonMesh);
      moonMeshRef.current = moonMesh;

      // Candidate landing site markers group
      const markersGroup = new THREE.Group();
      moonGroup.add(markersGroup);
      markersGroupRef.current = markersGroup;

      // Target Reticle / Selection Ring
      const ringGeo = new THREE.RingGeometry(0.026, 0.038, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const selectedRing = new THREE.Mesh(ringGeo, ringMat);
      selectedRing.visible = false;
      moonGroup.add(selectedRing);
      selectedRingRef.current = selectedRing;

      // 8. 3D Lunar Lander Vehicle
      const lander = create3DLunarLander();
      scene.add(lander);
      landerGroupRef.current = lander;

      // Touchdown regolith dust particles
      const dustGeo = new THREE.BufferGeometry();
      const dustCount = 120;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount * 3; i += 3) {
        dustPositions[i] = (Math.random() - 0.5) * 0.08;
        dustPositions[i + 1] = Math.random() * 0.03;
        dustPositions[i + 2] = (Math.random() - 0.5) * 0.08;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = new THREE.PointsMaterial({
        color: 0xd1d5db,
        size: 0.008,
        transparent: true,
        opacity: 0.0,
      });
      const dust = new THREE.Points(dustGeo, dustMat);
      dust.visible = false;
      scene.add(dust);
      dustParticlesRef.current = dust;

      // 9. Cislunar Sun & Sunlight
      const sunGroup = new THREE.Group();
      scene.add(sunGroup);
      sunGroupRef.current = sunGroup;

      const sunGeo = new THREE.SphereGeometry(1.2, 28, 28);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunGroup.add(sunMesh);

      // Corona Sprite
      const sunCanvas = document.createElement('canvas');
      sunCanvas.width = 128;
      sunCanvas.height = 128;
      const sCtx = sunCanvas.getContext('2d');
      if (sCtx) {
        const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.3, 'rgba(253, 224, 71, 0.85)');
        grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.4)');
        grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 128, 128);
      }
      const coronaTex = new THREE.CanvasTexture(sunCanvas);
      const coronaSpriteMat = new THREE.SpriteMaterial({
        map: coronaTex,
        color: 0xfffbeb,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      const corona = new THREE.Sprite(coronaSpriteMat);
      corona.scale.set(6.8, 6.8, 1.0);
      sunGroup.add(corona);

      const sunLight = new THREE.DirectionalLight(0xfffaed, 4.4);
      scene.add(sunLight);
      sunLightRef.current = sunLight;

      // 10. Distant Cislunar Earth
      const earthGroup = new THREE.Group();
      earthGroup.position.set(-8.5, 4.2, -10.5);
      scene.add(earthGroup);
      earthGroupRef.current = earthGroup;

      const earthTex = createProceduralEarthTexture();
      const earthGeo = new THREE.SphereGeometry(1.25, 48, 48);
      const earthMat = new THREE.MeshStandardMaterial({
        map: earthTex,
        roughness: 0.7,
        metalness: 0.05,
      });
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthGroup.add(earthMesh);

      // 11. Communication Laser/RF Beam
      const commsGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const commsMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 0.4,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.75,
      });
      const commsBeam = new THREE.Line(commsGeo, commsMat);
      commsBeam.computeLineDistances();
      scene.add(commsBeam);
      commsBeamRef.current = commsBeam;

      // 12. Animation Loop
      let clockTime = 0;
      const animate = () => {
        animFrameIdRef.current = requestAnimationFrame(animate);
        clockTime += 0.015;

        // Engine flame flicker during descent
        const flame = lander.getObjectByName('engineFlame') as THREE.Mesh;
        if (flame && flame.visible) {
          const flicker = 0.85 + Math.sin(clockTime * 25.0) * 0.15;
          flame.scale.set(flicker, flicker * 1.2, flicker);
        }

        // Camera smooth transition lerp
        if (targetCamPosRef.current && targetLookAtRef.current && controlsRef.current) {
          camera.position.lerp(targetCamPosRef.current, 0.08);
          controls.target.lerp(targetLookAtRef.current, 0.08);

          if (camera.position.distanceTo(targetCamPosRef.current) < 0.015) {
            targetCamPosRef.current = null;
            targetLookAtRef.current = null;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // 13. Resize Observer
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
        moonGeo.dispose();
        moonMat.dispose();
        albedoTexture.dispose();
        displacementTexture.dispose();
        normalTexture.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        sunGeo.dispose();
        sunMat.dispose();
        coronaTex.dispose();
        coronaSpriteMat.dispose();
        earthGeo.dispose();
        earthMat.dispose();
        earthTex.dispose();
        commsGeo.dispose();
        commsMat.dispose();
        dustGeo.dispose();
        dustMat.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    // Update Celestial Ephemeris (Sun & Earth position)
    useEffect(() => {
      const sunGroup = sunGroupRef.current;
      const sunLight = sunLightRef.current;
      const earthGroup = earthGroupRef.current;
      if (!sunGroup || !sunLight || !earthGroup) return;

      const eph = calculateLunarEphemeris(simulationDate);
      const sunPos = selenographicToCartesian(eph.subSolarLat, eph.subSolarLon, SUN_DISTANCE);
      sunGroup.position.copy(sunPos);
      sunLight.position.copy(sunPos);
      sunLight.target.position.set(0, 0, 0);
      sunLight.target.updateMatrixWorld();

      const earthPos = selenographicToCartesian(eph.subEarthLat, eph.subEarthLon, EARTH_DISTANCE);
      earthGroup.position.copy(earthPos);
    }, [simulationDate]);

    // Update Lander Position and Animation based on Landing Phase and Descent Progress
    useEffect(() => {
      const lander = landerGroupRef.current;
      const commsBeam = commsBeamRef.current;
      const dust = dustParticlesRef.current;
      const earthGroup = earthGroupRef.current;
      if (!lander || !commsBeam || !selectedSite) return;

      const targetPos = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, 1.036);
      const surfaceNormal = targetPos.clone().normalize();

      const flame = lander.getObjectByName('engineFlame') as THREE.Mesh;
      const dish = lander.getObjectByName('commsDish') as THREE.Mesh;
      const solarLeft = lander.getObjectByName('solarLeft') as THREE.Mesh;
      const solarRight = lander.getObjectByName('solarRight') as THREE.Mesh;

      if (landingPhase === 'orbit') {
        // Orbiting at ~15,000 m (radius 1.35)
        const orbitPos = targetPos.clone().multiplyScalar(1.35).add(new THREE.Vector3(0.15, 0.1, 0));
        lander.position.copy(orbitPos);
        lander.lookAt(targetPos);
        lander.rotateX(Math.PI / 2);

        if (flame) flame.visible = false;
        if (dust) dust.visible = false;
        commsBeam.visible = false;

        // Stowed configuration
        if (solarLeft) solarLeft.scale.set(0.2, 0.2, 0.2);
        if (solarRight) solarRight.scale.set(0.2, 0.2, 0.2);
      } else if (landingPhase === 'descending') {
        // Interpolate along powered descent trajectory
        const t = Math.max(0, Math.min(1, descentProgress));
        // Altitude curve: rapid initial descent then gentle terminal flare
        const currentAltitude = THREE.MathUtils.lerp(1.35, 1.036, Math.pow(t, 0.85));
        const currentPos = targetPos.clone().normalize().multiplyScalar(currentAltitude);

        lander.position.copy(currentPos);
        lander.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);

        // Active engine thruster firing
        if (flame) flame.visible = true;

        // Terminal touchdown dust kick
        if (dust) {
          if (t > 0.85) {
            dust.position.copy(targetPos);
            dust.visible = true;
            (dust.material as THREE.PointsMaterial).opacity = (t - 0.85) * 5.0;
          } else {
            dust.visible = false;
          }
        }
        commsBeam.visible = false;
      } else {
        // 'landed' or 'verified': Resting firmly on lunar surface
        lander.position.copy(targetPos);
        lander.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);

        // Engine cutoff
        if (flame) flame.visible = false;

        // Settled dust
        if (dust) dust.visible = false;

        // Deployed solar arrays & aligned dish
        if (solarLeft) solarLeft.scale.set(1.0, 1.0, 1.0);
        if (solarRight) solarRight.scale.set(1.0, 1.0, 1.0);

        // Point high-gain dish toward Earth
        if (dish && earthGroup) {
          dish.lookAt(earthGroup.position);
        }

        // Active communications beam to Earth
        if (earthGroup) {
          commsBeam.geometry.dispose();
          commsBeam.geometry = new THREE.BufferGeometry().setFromPoints([
            targetPos,
            earthGroup.position,
          ]);
          commsBeam.computeLineDistances();
          (commsBeam.material as THREE.LineDashedMaterial).color.setHex(
            selectedSite.communication.hasDirectEarthLOS ? 0x38bdf8 : 0xf43f5e
          );
          commsBeam.visible = true;
        }
      }
    }, [landingPhase, descentProgress, selectedSite]);

    // Update Candidate Site Marker Pins
    useEffect(() => {
      const markersGroup = markersGroupRef.current;
      const selectedRing = selectedRingRef.current;
      if (!markersGroup || !selectedRing) return;

      while (markersGroup.children.length > 0) {
        const child = markersGroup.children[0] as THREE.Mesh;
        if (child.geometry) child.geometry.dispose();
        markersGroup.remove(child);
      }

      candidateSites.forEach(site => {
        const isSelected = site.id === selectedSite.id;
        const pos = selenographicToCartesian(site.latitude, site.longitude, 1.036);

        // Color code markers by real suitability score / risk
        // Safe: slope < 5 and illuminated and hasDirectEarthLOS
        const isSafe = site.terrain.slopeDegrees < 5.0 && !site.terrain.isPermanentShadowRegion && site.communication.hasDirectEarthLOS;
        const isHazard = site.terrain.slopeDegrees >= 10.0 || site.terrain.isPermanentShadowRegion;

        const pinColor = isSelected ? 0x38bdf8 : isSafe ? 0x10b981 : isHazard ? 0xf43f5e : 0xf59e0b;

        const pinGeo = new THREE.SphereGeometry(isSelected ? 0.022 : 0.015, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({ color: pinColor });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.copy(pos);
        pinMesh.userData = { siteId: site.id };
        markersGroup.add(pinMesh);
      });

      // Target selection ring
      if (selectedSite) {
        const selPos = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, 1.037);
        selectedRing.position.copy(selPos);
        selectedRing.lookAt(selPos.clone().multiplyScalar(2.0));
        selectedRing.visible = true;
      }
    }, [candidateSites, selectedSite]);

    // Handle Canvas Click to select site
    const handleCanvasClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (landingPhase === 'descending') return; // Lock during active powered descent

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
            s => Math.abs(s.latitude - lat) < 1.2 && Math.abs(s.longitude - lon) < 1.2
          );
          if (nearest) {
            onSelectSite(nearest.id);
          }
        }
      },
      [candidateSites, onSelectSite, landingPhase]
    );

    if (!webglSupported) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#03050a] text-slate-300 font-mono text-xs p-6 text-center">
          <p className="font-semibold text-sky-400">WebGL Acceleration Required</p>
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

LunarLanding3DCanvas.displayName = 'LunarLanding3DCanvas';
