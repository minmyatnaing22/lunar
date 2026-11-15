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
export type CameraViewMode = 'chase' | 'ground' | 'navcam' | 'orbital';

export interface LunarLanding3DCanvasHandles {
  resetCamera: () => void;
  focusLander: () => void;
  focusSouthPole: () => void;
  viewCislunarContext: () => void;
  setCameraMode: (mode: CameraViewMode) => void;
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
  cameraViewMode?: CameraViewMode;
  onCameraModeChange?: (mode: CameraViewMode) => void;
}

const SUN_DISTANCE = 16.0;
const EARTH_DISTANCE = 12.0;

// Moon surface reference radius in Three.js units (with procedural displacement)
const MOON_SURFACE_RADIUS = 1.036;
// Footpad offset so the 4 landing pads rest exactly on the lunar surface
const LANDER_FOOTPAD_LOCAL_Y = -0.0175;
const LANDER_RESTING_RADIUS = MOON_SURFACE_RADIUS - LANDER_FOOTPAD_LOCAL_Y; // ~1.0535

/**
 * Builds an aerospace-grade, realistic 3D robotic lunar lander.
 * Inspired by modern commercial and exploration landers (Intuitive Machines Nova-C,
 * Astrobotic Peregrine, and Chandrayaan-3).
 *
 * Proportions & Features:
 * - Compact hexagonal avionics and structural bus with multi-layer gold & silver MLI thermal blankets.
 * - 4 spherical titanium propellant tanks with carbon-overwrap retention bands.
 * - High-expansion niobium bell nozzle with regenerator cooling rings and gimbal actuator rods.
 * - 4 articulated cantilevered landing legs with oleo shock-absorber dampers, titanium A-frame folding braces, and honeycomb footpads.
 * - 4 upper-corner reaction control system (RCS) quads with micro-attitude thruster nozzles.
 * - Motorized steerable high-gain parabolic Earth antenna dish with feed horn.
 * - Top-mounted high-efficiency silicon solar panel array deck.
 * - Optical Terrain Relative Navigation (TRN) camera and pulsed LIDAR sensor head.
 * - Star-tracker optical navigation baffled cameras and Laser Retroreflector Array (LRA).
 * - Dual-stage translucent engine plume and dynamic ground illumination light.
 */
function createRealisticRoboticLander(): THREE.Group {
  const lander = new THREE.Group();
  lander.name = 'roboticLander';

  // 1. Physically Based Rendering (PBR) Materials
  const goldMliMat = new THREE.MeshStandardMaterial({
    color: 0xdf9a28,
    metalness: 0.86,
    roughness: 0.24,
  });

  const silverMliMat = new THREE.MeshStandardMaterial({
    color: 0xdde4ec,
    metalness: 0.92,
    roughness: 0.22,
  });

  const carbonCompositeMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    metalness: 0.35,
    roughness: 0.65,
  });

  const titaniumAlloyMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.82,
    roughness: 0.32,
  });

  const chromePistonMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.98,
    roughness: 0.08,
  });

  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x2b2e35,
    metalness: 0.88,
    roughness: 0.38,
    side: THREE.DoubleSide,
  });

  const solarCellMat = new THREE.MeshStandardMaterial({
    color: 0x0f2347,
    metalness: 0.82,
    roughness: 0.16,
  });

  const opticsLensMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.92,
    roughness: 0.04,
  });

  // --- A. CENTRAL STRUCTURE & AVIONICS BUS ---
  const busGroup = new THREE.Group();
  busGroup.name = 'busCore';

  // Lower structural equipment deck (hexagonal carbon plate)
  const lowerDeckGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.002, 6);
  const lowerDeck = new THREE.Mesh(lowerDeckGeo, carbonCompositeMat);
  lowerDeck.position.y = 0.006;
  busGroup.add(lowerDeck);

  // Central core body wrapped in Gold MLI Kapton thermal blanket
  const coreGeo = new THREE.CylinderGeometry(0.014, 0.015, 0.018, 6);
  const coreBody = new THREE.Mesh(coreGeo, goldMliMat);
  coreBody.position.y = 0.016;
  busGroup.add(coreBody);

  // Silver MLI accent panels on opposing facets
  const silverPanelGeo = new THREE.BoxGeometry(0.0135, 0.016, 0.001);
  const silverPanel1 = new THREE.Mesh(silverPanelGeo, silverMliMat);
  silverPanel1.position.set(0, 0.016, 0.0125);
  busGroup.add(silverPanel1);

  const silverPanel2 = new THREE.Mesh(silverPanelGeo, silverMliMat);
  silverPanel2.position.set(0, 0.016, -0.0125);
  busGroup.add(silverPanel2);

  // Upper avionics & science deck plate
  const upperDeckGeo = new THREE.CylinderGeometry(0.015, 0.014, 0.002, 6);
  const upperDeck = new THREE.Mesh(upperDeckGeo, carbonCompositeMat);
  upperDeck.position.y = 0.026;
  busGroup.add(upperDeck);

  // Flight computer & power distribution boxes on upper deck
  const avionicsBoxGeo = new THREE.BoxGeometry(0.007, 0.004, 0.005);
  const avionicsBox = new THREE.Mesh(avionicsBoxGeo, silverMliMat);
  avionicsBox.position.set(-0.004, 0.029, 0.002);
  busGroup.add(avionicsBox);

  // Star tracker optical navigation cameras (dual baffled tubes)
  const starTrackerGeo = new THREE.CylinderGeometry(0.0012, 0.0015, 0.004, 8);
  const starTrackerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const tracker1 = new THREE.Mesh(starTrackerGeo, starTrackerMat);
  tracker1.rotation.z = 0.35;
  tracker1.rotation.y = 0.4;
  tracker1.position.set(0.006, 0.029, -0.004);
  busGroup.add(tracker1);

  // Laser Retroreflector Array (LRA) dome
  const lraGeo = new THREE.SphereGeometry(0.0028, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const lra = new THREE.Mesh(lraGeo, titaniumAlloyMat);
  lra.position.set(0.005, 0.027, 0.005);
  busGroup.add(lra);

  lander.add(busGroup);

  // --- B. PROPELLANT TANKS & PLUMBING ---
  const tanksGroup = new THREE.Group();
  tanksGroup.name = 'propellantTanks';

  const tankGeo = new THREE.SphereGeometry(0.0055, 14, 14);
  const strapGeo = new THREE.TorusGeometry(0.0056, 0.0003, 6, 18);
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

  const tankOffsets = [
    { x: 0.0135, z: 0 },
    { x: -0.0135, z: 0 },
    { x: 0, z: 0.0135 },
    { x: 0, z: -0.0135 },
  ];

  tankOffsets.forEach((pos, idx) => {
    const tankMat = idx % 2 === 0 ? titaniumAlloyMat : goldMliMat;
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(pos.x, 0.015, pos.z);

    const strap = new THREE.Mesh(strapGeo, strapMat);
    strap.rotation.x = Math.PI / 2;
    tank.add(strap);

    tanksGroup.add(tank);
  });

  // High-pressure Helium pressurant sphere on upper shelf
  const heliumTankGeo = new THREE.SphereGeometry(0.0032, 10, 10);
  const heliumTank = new THREE.Mesh(heliumTankGeo, silverMliMat);
  heliumTank.position.set(0, 0.028, 0.006);
  tanksGroup.add(heliumTank);

  lander.add(tanksGroup);

  // --- C. PROPULSION: MAIN ENGINE & GIMBAL ---
  const propulsionGroup = new THREE.Group();
  propulsionGroup.name = 'propulsion';

  // Injector dome & combustion chamber
  const chamberGeo = new THREE.CylinderGeometry(0.0035, 0.0045, 0.005, 12);
  const chamber = new THREE.Mesh(chamberGeo, titaniumAlloyMat);
  chamber.position.y = 0.003;
  propulsionGroup.add(chamber);

  // High-expansion bell nozzle (flared contour)
  const nozzleGeo = new THREE.CylinderGeometry(0.0035, 0.0085, 0.012, 16, 1, true);
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.position.y = -0.0055;
  propulsionGroup.add(nozzle);

  // Nozzle reinforcing stiffener ring
  const ringGeo = new THREE.TorusGeometry(0.0086, 0.0004, 6, 20);
  const nozzleRing = new THREE.Mesh(ringGeo, titaniumAlloyMat);
  nozzleRing.position.y = -0.0115;
  nozzleRing.rotation.x = Math.PI / 2;
  propulsionGroup.add(nozzleRing);

  // Gimbal actuator struts (2 angled hydraulic pushrods)
  const actuatorGeo = new THREE.CylinderGeometry(0.0006, 0.0006, 0.007, 6);
  const act1 = new THREE.Mesh(actuatorGeo, chromePistonMat);
  act1.position.set(0.004, 0.0, 0.002);
  act1.rotation.z = -0.25;
  propulsionGroup.add(act1);

  const act2 = new THREE.Mesh(actuatorGeo, chromePistonMat);
  act2.position.set(-0.004, 0.0, -0.002);
  act2.rotation.z = 0.25;
  propulsionGroup.add(act2);

  // Engine exhaust plume (multi-layered realistic rocket exhaust)
  const plumeGroup = new THREE.Group();
  plumeGroup.name = 'engineFlame';
  plumeGroup.visible = false;

  // Inner hot core (intense Mach jet)
  const innerPlumeGeo = new THREE.ConeGeometry(0.0045, 0.024, 16);
  const innerPlumeMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.95,
  });
  const innerPlume = new THREE.Mesh(innerPlumeGeo, innerPlumeMat);
  innerPlume.position.y = -0.0235;
  innerPlume.rotation.x = Math.PI;
  plumeGroup.add(innerPlume);

  // Outer expanding gas envelope (translucent violet/amber glow)
  const outerPlumeGeo = new THREE.ConeGeometry(0.008, 0.042, 16);
  const outerPlumeMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  const outerPlume = new THREE.Mesh(outerPlumeGeo, outerPlumeMat);
  outerPlume.position.y = -0.0325;
  outerPlume.rotation.x = Math.PI;
  plumeGroup.add(outerPlume);

  // Dynamic ground illumination light beneath thruster
  const plumeLight = new THREE.PointLight(0x7dd3fc, 0, 0.35);
  plumeLight.name = 'plumeLight';
  plumeLight.position.y = -0.025;
  plumeGroup.add(plumeLight);

  propulsionGroup.add(plumeGroup);
  lander.add(propulsionGroup);

  // --- D. 4 CORNER RCS ATTITUDE CONTROL QUADS ---
  const rcsGroup = new THREE.Group();
  rcsGroup.name = 'rcsClusters';

  const rcsAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  const rcsPodGeo = new THREE.BoxGeometry(0.003, 0.003, 0.003);
  const nozzleMicroGeo = new THREE.ConeGeometry(0.0008, 0.002, 6);
  nozzleMicroGeo.rotateX(Math.PI / 2);

  rcsAngles.forEach((ang) => {
    const pod = new THREE.Group();
    const r = 0.0165;
    pod.position.set(r * Math.cos(ang), 0.024, r * Math.sin(ang));

    const podBody = new THREE.Mesh(rcsPodGeo, goldMliMat);
    pod.add(podBody);

    const n1 = new THREE.Mesh(nozzleMicroGeo, titaniumAlloyMat);
    n1.position.set(0.0018 * Math.cos(ang), 0, 0.0018 * Math.sin(ang));
    n1.lookAt(pod.position.clone().multiplyScalar(2));
    pod.add(n1);

    const n2 = new THREE.Mesh(nozzleMicroGeo, titaniumAlloyMat);
    n2.position.set(0, 0.0018, 0);
    n2.rotation.x = -Math.PI / 2;
    pod.add(n2);

    rcsGroup.add(pod);
  });
  lander.add(rcsGroup);

  // --- E. 4 CANTILEVERED AEROSPACE LANDING LEGS & FOOTPADS ---
  const gearGroup = new THREE.Group();
  gearGroup.name = 'landingGear';

  const legAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

  legAngles.forEach((angle) => {
    const legAssembly = new THREE.Group();
    legAssembly.rotation.y = angle;

    // 1. Main outer oleo shock-absorber cylinder (titanium housing)
    const oleoHousingGeo = new THREE.CylinderGeometry(0.0014, 0.0014, 0.018, 8);
    const oleoHousing = new THREE.Mesh(oleoHousingGeo, titaniumAlloyMat);
    oleoHousing.position.set(0.018, 0.001, 0);
    oleoHousing.rotation.z = -0.78;
    legAssembly.add(oleoHousing);

    // 2. Telescoping inner chrome piston rod
    const pistonGeo = new THREE.CylinderGeometry(0.00095, 0.00095, 0.014, 8);
    const piston = new THREE.Mesh(pistonGeo, chromePistonMat);
    piston.position.set(0.024, -0.006, 0);
    piston.rotation.z = -0.78;
    legAssembly.add(piston);

    // 3. Dual folding A-frame tubular braces (titanium truss struts)
    const braceGeo = new THREE.CylinderGeometry(0.0007, 0.0007, 0.022, 6);
    const brace1 = new THREE.Mesh(braceGeo, titaniumAlloyMat);
    brace1.position.set(0.017, 0.003, 0.0035);
    brace1.rotation.set(-0.15, 0.1, -0.55);
    legAssembly.add(brace1);

    const brace2 = new THREE.Mesh(braceGeo, titaniumAlloyMat);
    brace2.position.set(0.017, 0.003, -0.0035);
    brace2.rotation.set(0.15, -0.1, -0.55);
    legAssembly.add(brace2);

    // 4. Footpad articulated knuckle gimbal
    const knuckleGeo = new THREE.SphereGeometry(0.0018, 8, 8);
    const knuckle = new THREE.Mesh(knuckleGeo, titaniumAlloyMat);
    knuckle.position.set(0.0285, -0.016, 0);
    legAssembly.add(knuckle);

    // 5. Dish-shaped landing footpad (sits flat horizontally at y = -0.0175)
    const padGeo = new THREE.CylinderGeometry(0.0055, 0.0065, 0.0016, 12);
    const pad = new THREE.Mesh(padGeo, titaniumAlloyMat);
    pad.position.set(0.0285, LANDER_FOOTPAD_LOCAL_Y, 0);
    legAssembly.add(pad);

    // 6. Surface lunar contact sensing probe pin
    const probeGeo = new THREE.CylinderGeometry(0.00025, 0.00025, 0.005, 4);
    const probe = new THREE.Mesh(probeGeo, chromePistonMat);
    probe.position.set(0.0285, LANDER_FOOTPAD_LOCAL_Y - 0.0025, 0);
    legAssembly.add(probe);

    gearGroup.add(legAssembly);
  });

  lander.add(gearGroup);

  // --- F. COMMUNICATIONS & SENSORS ---
  // Steerable high-gain parabolic Earth antenna dish
  const commsGroup = new THREE.Group();
  commsGroup.name = 'commsDish';
  commsGroup.position.set(0.011, 0.027, 0);

  const bracketGeo = new THREE.CylinderGeometry(0.001, 0.001, 0.005, 6);
  const bracket = new THREE.Mesh(bracketGeo, titaniumAlloyMat);
  bracket.position.y = 0.0025;
  commsGroup.add(bracket);

  const dishGeo = new THREE.SphereGeometry(0.0085, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.3);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.5,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = -Math.PI / 2.8;
  dish.position.y = 0.006;
  commsGroup.add(dish);

  const feedGeo = new THREE.CylinderGeometry(0.0004, 0.0006, 0.004, 6);
  const feed = new THREE.Mesh(feedGeo, goldMliMat);
  feed.position.set(0, 0.009, 0.003);
  commsGroup.add(feed);

  lander.add(commsGroup);

  // Omnidirectional Low-Gain helical whip antennas
  const whipGeo = new THREE.CylinderGeometry(0.0003, 0.0003, 0.016, 4);
  const whip1 = new THREE.Mesh(whipGeo, titaniumAlloyMat);
  whip1.position.set(-0.012, 0.034, 0.005);
  lander.add(whip1);

  const whip2 = new THREE.Mesh(whipGeo, titaniumAlloyMat);
  whip2.position.set(-0.012, 0.034, -0.005);
  lander.add(whip2);

  // Top deck High-Efficiency Solar Panel Array
  const solarPanelGeo = new THREE.CylinderGeometry(0.0145, 0.0145, 0.0008, 6);
  const solarPanel = new THREE.Mesh(solarPanelGeo, solarCellMat);
  solarPanel.name = 'solarArray';
  solarPanel.position.set(0, 0.0274, 0);
  lander.add(solarPanel);

  // Optical Terrain Relative Navigation (TRN) camera on bottom equipment shelf
  const trnGeo = new THREE.BoxGeometry(0.004, 0.003, 0.004);
  const trnBox = new THREE.Mesh(trnGeo, titaniumAlloyMat);
  trnBox.position.set(0.006, 0.004, 0.004);

  const trnLensGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 0.0015, 8);
  const trnLens = new THREE.Mesh(trnLensGeo, opticsLensMat);
  trnLens.position.y = -0.002;
  trnBox.add(trnLens);
  lander.add(trnBox);

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
      cameraViewMode = 'chase',
      onCameraModeChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animFrameIdRef = useRef<number | null>(null);

    // Active Camera Mode
    const currentCameraModeRef = useRef<CameraViewMode>(cameraViewMode);
    useEffect(() => {
      currentCameraModeRef.current = cameraViewMode;
    }, [cameraViewMode]);

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
        targetCamPosRef.current = new THREE.Vector3(0, -1.2, 1.85);
        targetLookAtRef.current = new THREE.Vector3(0, -0.4, 0);
        currentCameraModeRef.current = 'orbital';
        onCameraModeChange?.('orbital');
      },
      focusLander: () => {
        if (!landerGroupRef.current) return;
        const lPos = landerGroupRef.current.position.clone();
        targetCamPosRef.current = lPos.clone().add(new THREE.Vector3(0.08, 0.05, 0.09));
        targetLookAtRef.current = lPos;
        currentCameraModeRef.current = 'chase';
        onCameraModeChange?.('chase');
      },
      focusSouthPole: () => {
        targetCamPosRef.current = new THREE.Vector3(0, -1.95, 0.6);
        targetLookAtRef.current = new THREE.Vector3(0, -0.85, 0);
      },
      viewCislunarContext: () => {
        targetCamPosRef.current = new THREE.Vector3(3.2, 2.5, 4.8);
        targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
        currentCameraModeRef.current = 'orbital';
        onCameraModeChange?.('orbital');
      },
      setCameraMode: (mode: CameraViewMode) => {
        currentCameraModeRef.current = mode;
        onCameraModeChange?.(mode);
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

    // Three.js Scene Setup
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      // 1. Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color('#03050a');

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(36, width / height, 0.02, 200);
      camera.position.set(0, -1.2, 1.85);
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
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 0.05;
      controls.maxDistance = 35.0;
      controls.target.set(0, -0.4, 0);
      controlsRef.current = controls;

      // 5. Starfield Skybox
      const starsGeo = new THREE.BufferGeometry();
      const starCount = isMobile ? 700 : 1400;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = 90.0 + Math.random() * 20.0;
        starPos[i] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i + 2] = r * Math.cos(phi);
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starsMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.8,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.85,
      });
      const stars = new THREE.Points(starsGeo, starsMat);
      scene.add(stars);

      // 6. 3D Moon Surface
      const moonGroup = new THREE.Group();
      scene.add(moonGroup);
      moonGroupRef.current = moonGroup;

      const { albedoTexture, normalTexture, displacementTexture } = createProceduralLunarTextures();
      const moonGeo = new THREE.SphereGeometry(1.0, isMobile ? 72 : 120, isMobile ? 72 : 120);
      const moonMat = new THREE.MeshStandardMaterial({
        map: albedoTexture,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(1.2, 1.2),
        bumpMap: displacementTexture,
        bumpScale: 0.035,
        roughness: 0.92,
        metalness: 0.04,
      });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      moonGroup.add(moonMesh);
      moonMeshRef.current = moonMesh;

      // Candidate landing target ring indicator
      const ringGeo = new THREE.RingGeometry(0.018, 0.024, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const selectedRing = new THREE.Mesh(ringGeo, ringMat);
      selectedRing.visible = false;
      scene.add(selectedRing);
      selectedRingRef.current = selectedRing;

      // Candidate sites group
      const markersGroup = new THREE.Group();
      scene.add(markersGroup);
      markersGroupRef.current = markersGroup;

      // 7. Realistic 3D Spacecraft Lander
      const lander = createRealisticRoboticLander();
      scene.add(lander);
      landerGroupRef.current = lander;

      // 8. Lunar Surface Dust Ejection (radial regolith particle dispersion)
      const dustCount = isMobile ? 80 : 160;
      const dustGeo = new THREE.BufferGeometry();
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 0.005 + Math.random() * 0.035;
        dustPositions[i * 3] = Math.cos(ang) * rad;
        dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.004;
        dustPositions[i * 3 + 2] = Math.sin(ang) * rad;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = new THREE.PointsMaterial({
        color: 0xe2e8f0,
        size: 0.0035,
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

      // 12. Animation Render Loop
      let clockTime = 0;
      const animate = () => {
        animFrameIdRef.current = requestAnimationFrame(animate);
        clockTime += 0.016;

        // Realistic thruster plume flicker
        const flameGroup = lander.getObjectByName('engineFlame') as THREE.Group;
        if (flameGroup && flameGroup.visible) {
          const flicker = 0.92 + Math.sin(clockTime * 32.0) * 0.08;
          flameGroup.scale.set(flicker, flicker * 1.08, flicker);
        }

        // Camera smooth transition lerp
        if (targetCamPosRef.current && targetLookAtRef.current && controlsRef.current) {
          camera.position.lerp(targetCamPosRef.current, 0.06);
          controls.target.lerp(targetLookAtRef.current, 0.06);

          if (camera.position.distanceTo(targetCamPosRef.current) < 0.008) {
            targetCamPosRef.current = null;
            targetLookAtRef.current = null;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleVisibilityChange = () => {
        const isTabVisible = !document.hidden;
        if (isTabVisible && !animFrameIdRef.current) {
          animate();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

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
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
        albedoTexture.dispose();
        normalTexture.dispose();
        displacementTexture.dispose();
        moonGeo.dispose();
        moonMat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        sunGeo.dispose();
        sunMat.dispose();
        coronaTex.dispose();
        coronaSpriteMat.dispose();
        earthGeo.dispose();
        earthMat.dispose();
        commsGeo.dispose();
        commsMat.dispose();
        dustGeo.dispose();
        dustMat.dispose();
        starsGeo.dispose();
        starsMat.dispose();
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

    // Update Lander Position and Cinematic Animation based on Landing Phase and Descent Progress
    useEffect(() => {
      const lander = landerGroupRef.current;
      const commsBeam = commsBeamRef.current;
      const dust = dustParticlesRef.current;
      const earthGroup = earthGroupRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!lander || !commsBeam || !selectedSite) return;

      // Target touchdown position on lunar surface
      const targetSurfacePos = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, MOON_SURFACE_RADIUS);
      const targetLandedPos = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, LANDER_RESTING_RADIUS);
      const surfaceNormal = targetSurfacePos.clone().normalize();

      // Tangent direction for horizontal orbital approach arc
      const northPole = new THREE.Vector3(0, 1, 0);
      let tangentEast = new THREE.Vector3().crossVectors(surfaceNormal, northPole).normalize();
      if (tangentEast.lengthSq() < 0.01) {
        tangentEast = new THREE.Vector3(1, 0, 0);
      }

      const flameGroup = lander.getObjectByName('engineFlame') as THREE.Group;
      const plumeLight = lander.getObjectByName('plumeLight') as THREE.PointLight;
      const dish = lander.getObjectByName('commsDish') as THREE.Group;

      if (landingPhase === 'orbit') {
        // High parking orbit at 15,000m (radius 1.36)
        const orbitRadius = 1.36;
        const orbitPos = surfaceNormal.clone().multiplyScalar(orbitRadius).add(tangentEast.clone().multiplyScalar(0.18));
        lander.position.copy(orbitPos);

        // Retrograde orientation in orbit
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(tangentEast, THREE.MathUtils.degToRad(75));
        lander.quaternion.copy(alignQuat).multiply(pitchQuat);

        if (flameGroup) flameGroup.visible = false;
        if (plumeLight) plumeLight.intensity = 0;
        if (dust) dust.visible = false;
        commsBeam.visible = false;

        if (currentCameraModeRef.current === 'chase' && camera && controls) {
          const camOffset = orbitPos.clone().add(surfaceNormal.clone().multiplyScalar(0.14)).add(tangentEast.clone().multiplyScalar(-0.16));
          targetCamPosRef.current = camOffset;
          targetLookAtRef.current = orbitPos.clone();
        }
      } else if (landingPhase === 'descending') {
        const t = Math.max(0, Math.min(1, descentProgress));

        // Physics-inspired altitude decay: altitude = 15000 * (1 - t)^2.2
        const altFactor = Math.pow(1 - t, 2.2);
        const currentRadius = LANDER_RESTING_RADIUS + 0.31 * altFactor;

        // Horizontal trajectory approach: nulls out completely by vertical gate (t = 0.82)
        const horizFactor = Math.pow(Math.max(0, 1 - t / 0.82), 1.8);
        const currentPos = surfaceNormal
          .clone()
          .multiplyScalar(currentRadius)
          .add(tangentEast.clone().multiplyScalar(0.16 * horizFactor));

        lander.position.copy(currentPos);

        // Attitude pitch-over: 48° retrograde tilt in braking, leveling to 0° upright vertical
        const baseAlignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);
        const pitchAngleDeg = t < 0.75 ? 48.0 * Math.pow(1 - t / 0.75, 1.8) : 0.0;

        // Subtle micro-attitude gyro stability oscillations (±0.25 deg) simulating active RCS
        const gyroOscillation = t < 0.94 ? Math.sin(t * 70.0) * 0.004 : 0.0;

        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
          tangentEast,
          THREE.MathUtils.degToRad(pitchAngleDeg) + gyroOscillation
        );
        lander.quaternion.copy(baseAlignQuat).multiply(pitchQuat);

        // Engine plume & dynamic throttle
        if (flameGroup) {
          flameGroup.visible = true;
          // Throttle profile: 100% braking -> 65% terminal -> 35% cushion
          const throttle = t < 0.5 ? 1.0 : t < 0.88 ? 0.65 : THREE.MathUtils.lerp(0.5, 0.25, (t - 0.88) / 0.12);
          flameGroup.scale.set(throttle, throttle, throttle);
        }

        // Ground illumination from engine thruster
        if (plumeLight) {
          // Intense glow close to surface
          const groundProximity = Math.max(0, 1 - (currentRadius - LANDER_RESTING_RADIUS) / 0.1);
          plumeLight.intensity = (0.2 + groundProximity * 2.2) * (t < 0.99 ? 1.0 : 0.0);
        }

        // Terminal regolith dust ejection in hard vacuum
        if (dust) {
          if (t > 0.91 && t < 0.999) {
            dust.position.copy(targetSurfacePos);
            dust.visible = true;
            const dustIntensity = Math.sin(((t - 0.91) / 0.09) * Math.PI);
            (dust.material as THREE.PointsMaterial).opacity = dustIntensity * 0.75;
            dust.rotation.y += 0.02;
          } else {
            dust.visible = false;
          }
        }

        commsBeam.visible = false;

        // Cinematic dynamic camera tracking during descent
        if (camera && controls) {
          const mode = currentCameraModeRef.current;
          if (mode === 'chase') {
            const chaseOffset = currentPos
              .clone()
              .add(surfaceNormal.clone().multiplyScalar(0.09))
              .add(tangentEast.clone().multiplyScalar(-0.13));
            camera.position.lerp(chaseOffset, 0.08);
            controls.target.lerp(currentPos, 0.08);
          } else if (mode === 'ground') {
            // Surface spotter camera: looking up from lunar ground at approaching lander
            const groundCamPos = targetSurfacePos
              .clone()
              .add(surfaceNormal.clone().multiplyScalar(0.015))
              .add(tangentEast.clone().multiplyScalar(0.045));
            camera.position.lerp(groundCamPos, 0.08);
            controls.target.lerp(currentPos, 0.08);
          } else if (mode === 'navcam') {
            // Downward descent camera: looking straight down from belly
            const navCamPos = currentPos.clone().add(surfaceNormal.clone().multiplyScalar(0.005));
            camera.position.lerp(navCamPos, 0.1);
            controls.target.lerp(targetSurfacePos, 0.1);
          }
        }
      } else {
        // 'landed' or 'verified': Resting firmly on the selected lunar coordinates
        lander.position.copy(targetLandedPos);
        const surfaceQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);
        lander.quaternion.copy(surfaceQuat);

        // Engine cutoff
        if (flameGroup) flameGroup.visible = false;
        if (plumeLight) plumeLight.intensity = 0;
        if (dust) dust.visible = false;

        // Steer parabolic Earth dish toward Earth
        if (dish && earthGroup) {
          dish.lookAt(earthGroup.position);
        }

        // Active RF line-of-sight laser/beam
        if (earthGroup) {
          commsBeam.geometry.dispose();
          commsBeam.geometry = new THREE.BufferGeometry().setFromPoints([
            targetLandedPos,
            earthGroup.position,
          ]);
          commsBeam.computeLineDistances();
          (commsBeam.material as THREE.LineDashedMaterial).color.setHex(
            selectedSite.communication.hasDirectEarthLOS ? 0x38bdf8 : 0xf43f5e
          );
          commsBeam.visible = true;
        }

        if (currentCameraModeRef.current === 'chase' && camera && controls) {
          const landedCamPos = targetLandedPos
            .clone()
            .add(surfaceNormal.clone().multiplyScalar(0.045))
            .add(tangentEast.clone().multiplyScalar(-0.065));
          camera.position.lerp(landedCamPos, 0.06);
          controls.target.lerp(targetLandedPos, 0.06);
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

      candidateSites.forEach((site) => {
        const isSelected = site.id === selectedSite.id;
        const pos = selenographicToCartesian(site.latitude, site.longitude, MOON_SURFACE_RADIUS);

        const isSafe = site.terrain.slopeDegrees < 5.0 && !site.terrain.isPermanentShadowRegion && site.communication.hasDirectEarthLOS;
        const isHazard = site.terrain.slopeDegrees >= 10.0 || site.terrain.isPermanentShadowRegion;
        const pinColor = isSelected ? 0x38bdf8 : isSafe ? 0x10b981 : isHazard ? 0xf43f5e : 0xf59e0b;

        const pinGeo = new THREE.SphereGeometry(isSelected ? 0.016 : 0.011, 14, 14);
        const pinMat = new THREE.MeshBasicMaterial({ color: pinColor });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.copy(pos);
        pinMesh.userData = { siteId: site.id };
        markersGroup.add(pinMesh);
      });

      // Target selection ring
      if (selectedSite) {
        const selPos = selenographicToCartesian(selectedSite.latitude, selectedSite.longitude, MOON_SURFACE_RADIUS + 0.001);
        selectedRing.position.copy(selPos);
        selectedRing.lookAt(selPos.clone().multiplyScalar(2.0));
        selectedRing.visible = true;
      }
    }, [candidateSites, selectedSite]);

    // Handle Canvas Click to select site
    const handleCanvasClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (landingPhase === 'descending') return;

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
            (s) => Math.abs(s.latitude - lat) < 1.2 && Math.abs(s.longitude - lon) < 1.2
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
