// LunarSight - High-Fidelity Photorealistic Procedural Earth Texture Engine
// Generates multi-layer planetary maps: Day Albedo, Night Urban Luminescence, Specular Ocean Mask, and Dynamic Cloud Systems.

import * as THREE from 'three';

const WIDTH = 2048;
const HEIGHT = 1024;

/**
 * Coordinate mapping helper: Converts (lon, lat) in degrees to canvas pixel coordinates.
 */
function toCanvas(lon: number, lat: number, w: number = WIDTH, h: number = HEIGHT) {
  return {
    x: ((lon + 180.0) / 360.0) * w,
    y: ((90.0 - lat) / 180.0) * h,
  };
}

let cachedAlbedoTexture: THREE.CanvasTexture | null = null;
let cachedNightLightsTexture: THREE.CanvasTexture | null = null;
let cachedRoughnessTexture: THREE.CanvasTexture | null = null;
let cachedCloudTexture: THREE.CanvasTexture | null = null;

/**
 * High-Resolution Day Albedo Texture (2048x1024)
 * Features continental topography, bathymetric shelf gradients, mountain ranges, biomes, and polar ice.
 */
export function createHighDetailEarthAlbedoTexture(): THREE.CanvasTexture {
  if (cachedAlbedoTexture) return cachedAlbedoTexture;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // 1. Abyssal Ocean Base with realistic marine bathymetry
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  oceanGrad.addColorStop(0.0, '#04162e'); // Polar Arctic waters
  oceanGrad.addColorStop(0.2, '#062044');
  oceanGrad.addColorStop(0.5, '#092a58'); // Tropical deep blue
  oceanGrad.addColorStop(0.8, '#062044');
  oceanGrad.addColorStop(1.0, '#04162e'); // Antarctic ocean
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Continental Shelf Shallows (Azure & Turquoise coastal waters)
  // We draw blurred coastal buffers around continents
  ctx.save();
  ctx.filter = 'blur(14px)';
  ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';

  const drawContinentalOutlines = (targetCtx: CanvasRenderingContext2D) => {
    // North America & Central America
    targetCtx.beginPath();
    const na = [
      [-168, 66], [-160, 71], [-140, 70], [-125, 76], [-100, 74], [-82, 64],
      [-64, 60], [-55, 50], [-60, 44], [-70, 42], [-75, 35], [-80, 26],
      [-81, 24], [-88, 30], [-97, 26], [-97, 20], [-88, 16], [-83, 9],
      [-77, 8], [-80, 14], [-84, 18], [-92, 16], [-100, 20], [-105, 23],
      [-110, 30], [-115, 33], [-122, 37], [-124, 48], [-130, 54], [-140, 59],
      [-152, 59], [-162, 55], [-165, 60]
    ];
    na.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) targetCtx.moveTo(x, y);
      else targetCtx.lineTo(x, y);
    });
    targetCtx.closePath();
    targetCtx.fill();

    // South America
    targetCtx.beginPath();
    const sa = [
      [-76, 12], [-65, 11], [-50, -1], [-35, -5], [-35, -10], [-38, -13],
      [-48, -25], [-53, -33], [-62, -40], [-66, -50], [-72, -55], [-75, -48],
      [-72, -38], [-71, -30], [-76, -14], [-81, -5], [-78, 2], [-76, 8]
    ];
    sa.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) targetCtx.moveTo(x, y);
      else targetCtx.lineTo(x, y);
    });
    targetCtx.closePath();
    targetCtx.fill();

    // Eurasia (Europe + Asia)
    targetCtx.beginPath();
    const eu = [
      [-9, 36], [-9, 43], [0, 44], [-4, 48], [4, 52], [9, 54], [6, 62],
      [15, 68], [28, 71], [40, 68], [60, 70], [80, 74], [105, 78], [140, 74],
      [170, 69], [178, 65], [160, 54], [142, 50], [130, 42], [122, 38],
      [120, 32], [118, 25], [108, 20], [105, 10], [100, 4], [98, 12],
      [90, 22], [82, 16], [78, 8], [72, 20], [68, 24], [60, 25],
      [55, 12], [44, 13], [35, 28], [28, 36], [14, 38], [0, 36]
    ];
    eu.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) targetCtx.moveTo(x, y);
      else targetCtx.lineTo(x, y);
    });
    targetCtx.closePath();
    targetCtx.fill();

    // Africa
    targetCtx.beginPath();
    const af = [
      [-17, 31], [-5, 36], [10, 37], [25, 32], [33, 31], [34, 27],
      [43, 12], [51, 11], [44, -3], [40, -10], [35, -24], [32, -28],
      [28, -33], [18, -34], [15, -28], [12, -18], [9, -5], [3, 5],
      [-5, 5], [-14, 12], [-17, 21]
    ];
    af.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) targetCtx.moveTo(x, y);
      else targetCtx.lineTo(x, y);
    });
    targetCtx.closePath();
    targetCtx.fill();

    // Australia
    targetCtx.beginPath();
    const au = [
      [114, -22], [122, -18], [130, -13], [136, -12], [142, -11], [145, -17],
      [153, -28], [150, -36], [143, -38], [138, -35], [130, -32], [116, -34],
      [113, -26]
    ];
    au.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) targetCtx.moveTo(x, y);
      else targetCtx.lineTo(x, y);
    });
    targetCtx.closePath();
    targetCtx.fill();

    // Great Archipelagos & Islands (UK, Japan, Indonesia, Madagascar, New Zealand)
    const islands = [
      // British Isles
      [[-5, 50], [1, 52], [0, 58], [-5, 58], [-5, 50]],
      // Japan
      [[130, 32], [136, 35], [141, 38], [144, 44], [141, 44], [134, 34]],
      // Madagascar
      [[44, -12], [50, -16], [47, -25], [43, -25]],
      // New Zealand
      [[166, -46], [174, -41], [178, -38], [174, -36]],
      // Sumatra / Java / Borneo
      [[95, 5], [105, -5], [115, -7], [105, -5]],
      [[110, 4], [118, 6], [117, -3], [110, -3]],
    ];
    islands.forEach(isl => {
      targetCtx.beginPath();
      isl.forEach(([lon, lat], i) => {
        const { x, y } = toCanvas(lon, lat);
        if (i === 0) targetCtx.moveTo(x, y);
        else targetCtx.lineTo(x, y);
      });
      targetCtx.closePath();
      targetCtx.fill();
    });
  };

  drawContinentalOutlines(ctx);
  ctx.restore();

  // 3. Continental Landmass Fill with Biome Gradients
  // North America
  ctx.fillStyle = '#22543d'; // Forest green
  drawContinentalOutlines(ctx);

  // Arid & Desert Biomes (Sahara, Arabia, Gobi, Mojave, Outback)
  const deserts = [
    { lon: 18, lat: 24, r: 240, color: '#c29b62' }, // Sahara
    { lon: 45, lat: 23, r: 140, color: '#b89058' }, // Arabian Peninsula
    { lon: 95, lat: 42, r: 160, color: '#a38456' }, // Gobi Desert
    { lon: -115, lat: 34, r: 90, color: '#9c8152' }, // American Southwest
    { lon: 132, lat: -25, r: 160, color: '#b36a43' }, // Australian Outback (Red Ochre)
    { lon: -70, lat: -23, r: 60, color: '#997e55' }, // Atacama
  ];

  deserts.forEach(d => {
    const pt = toCanvas(d.lon, d.lat);
    const radGrad = ctx.createRadialGradient(pt.x, pt.y, 10, pt.x, pt.y, d.r);
    radGrad.addColorStop(0.0, d.color);
    radGrad.addColorStop(0.7, d.color + 'aa');
    radGrad.addColorStop(1.0, 'transparent');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mountain Ranges (Alpine Cordilleras, Rockies, Andes, Himalayas)
  ctx.strokeStyle = 'rgba(235, 240, 245, 0.45)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  const mountainRidges = [
    // Andes (South America)
    [[-75, 8], [-78, -3], [-74, -18], [-70, -32], [-72, -48]],
    // Rockies (North America)
    [[-122, 58], [-115, 48], [-108, 38], [-104, 30]],
    // Himalayas (Asia)
    [[74, 35], [82, 30], [92, 28], [98, 27]],
    // Alps (Europe)
    [[6, 45], [10, 47], [14, 46]],
  ];
  mountainRidges.forEach(ridge => {
    ctx.beginPath();
    ridge.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // 4. Polar Ice Sheets (Antarctica, Greenland, Arctic Sea Ice)
  ctx.fillStyle = '#f1f5f9';
  // Antarctica
  ctx.beginPath();
  const antarctica = [
    [-180, -68], [-120, -72], [-70, -63], [-60, -65], [-30, -72],
    [20, -68], [70, -66], [110, -65], [150, -68], [180, -68],
    [180, -90], [-180, -90]
  ];
  antarctica.forEach(([lon, lat], i) => {
    const { x, y } = toCanvas(lon, lat);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();

  // Greenland Ice Sheet
  ctx.beginPath();
  const greenland = [
    [-52, 60], [-42, 60], [-32, 65], [-20, 75], [-20, 81], [-55, 83], [-58, 76]
  ];
  greenland.forEach(([lon, lat], i) => {
    const { x, y } = toCanvas(lon, lat);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedAlbedoTexture = texture;
  return texture;
}

/**
 * High-Resolution Night Lights Texture (2048x1024)
 * NASA Black Marble inspired urban electric luminescence on the night hemisphere.
 */
export function createEarthNightLightsTexture(): THREE.CanvasTexture {
  if (cachedNightLightsTexture) return cachedNightLightsTexture;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Pure dark black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Urban megalopolises & metropolitan illumination clusters
  const majorCities = [
    // North America
    { lon: -74, lat: 40.7, r: 24, power: 1.0 }, // New York
    { lon: -71, lat: 42.3, r: 16, power: 0.8 }, // Boston
    { lon: -77, lat: 38.9, r: 18, power: 0.9 }, // Washington DC
    { lon: -87.6, lat: 41.8, r: 20, power: 0.9 }, // Chicago
    { lon: -118.2, lat: 34.0, r: 22, power: 0.95 }, // Los Angeles
    { lon: -122.4, lat: 37.7, r: 18, power: 0.9 }, // San Francisco
    { lon: -95.3, lat: 29.7, r: 18, power: 0.85 }, // Houston
    { lon: -84.3, lat: 33.7, r: 16, power: 0.8 }, // Atlanta
    { lon: -79.3, lat: 43.6, r: 16, power: 0.8 }, // Toronto
    { lon: -99.1, lat: 19.4, r: 22, power: 0.9 }, // Mexico City

    // Europe (Dense contiguous illumination network)
    { lon: -0.1, lat: 51.5, r: 22, power: 1.0 }, // London
    { lon: 2.3, lat: 48.8, r: 20, power: 0.95 }, // Paris
    { lon: 4.9, lat: 52.3, r: 18, power: 0.9 }, // Benelux (Amsterdam/Brussels)
    { lon: 7.0, lat: 51.2, r: 24, power: 0.95 }, // Rhine-Ruhr Germany
    { lon: 13.4, lat: 52.5, r: 16, power: 0.85 }, // Berlin
    { lon: 9.1, lat: 45.4, r: 18, power: 0.9 }, // Milan / Po Valley
    { lon: -3.7, lat: 40.4, r: 16, power: 0.8 }, // Madrid
    { lon: 37.6, lat: 55.7, r: 22, power: 0.95 }, // Moscow

    // East Asia & Southeast Asia
    { lon: 139.7, lat: 35.6, r: 28, power: 1.0 }, // Tokyo (World's brightest metropolitan zone)
    { lon: 135.5, lat: 34.6, r: 20, power: 0.9 }, // Osaka/Kyoto
    { lon: 126.9, lat: 37.5, r: 22, power: 0.95 }, // Seoul
    { lon: 116.4, lat: 39.9, r: 24, power: 0.95 }, // Beijing
    { lon: 121.4, lat: 31.2, r: 26, power: 1.0 }, // Shanghai
    { lon: 113.2, lat: 23.1, r: 28, power: 1.0 }, // Pearl River Delta (Guangzhou/Shenzhen/HK)
    { lon: 121.5, lat: 25.0, r: 16, power: 0.85 }, // Taipei
    { lon: 100.5, lat: 13.7, r: 18, power: 0.85 }, // Bangkok
    { lon: 103.8, lat: 1.3, r: 16, power: 0.9 }, // Singapore

    // South Asia (Dense Ganges Valley Corridor)
    { lon: 77.2, lat: 28.6, r: 24, power: 0.95 }, // New Delhi
    { lon: 72.8, lat: 18.9, r: 22, power: 0.95 }, // Mumbai
    { lon: 88.3, lat: 22.5, r: 20, power: 0.9 }, // Kolkata
    { lon: 80.0, lat: 26.0, r: 40, power: 0.7 }, // Indo-Gangetic Plain

    // Middle East & Africa
    { lon: 31.2, lat: 30.0, r: 24, power: 0.95 }, // Cairo & Nile Delta ribbon
    { lon: 55.3, lat: 25.2, r: 20, power: 0.9 }, // Dubai
    { lon: 46.7, lat: 24.7, r: 16, power: 0.8 }, // Riyadh
    { lon: 28.0, lat: -26.2, r: 18, power: 0.85 }, // Johannesburg

    // South America & Oceania
    { lon: -46.6, lat: -23.5, r: 24, power: 0.95 }, // São Paulo
    { lon: -43.1, lat: -22.9, r: 20, power: 0.9 }, // Rio de Janeiro
    { lon: -58.3, lat: -34.6, r: 20, power: 0.9 }, // Buenos Aires
    { lon: 151.2, lat: -33.8, r: 18, power: 0.9 }, // Sydney
    { lon: 144.9, lat: -37.8, r: 18, power: 0.9 }, // Melbourne
  ];

  majorCities.forEach(city => {
    const { x, y } = toCanvas(city.lon, city.lat);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, city.r);
    grad.addColorStop(0.0, `rgba(255, 245, 210, ${city.power})`);
    grad.addColorStop(0.25, `rgba(251, 191, 36, ${city.power * 0.8})`);
    grad.addColorStop(0.65, `rgba(217, 119, 6, ${city.power * 0.3})`);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, city.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Secondary highway transit ribbons & rural town specks
  ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
  for (let i = 0; i < 900; i++) {
    // Clustered mainly in temperate inhabited latitudes
    const lon = (Math.random() - 0.5) * 350;
    const lat = (Math.random() - 0.3) * 110;
    const { x, y } = toCanvas(lon, lat);
    ctx.fillRect(x, y, 1.2, 1.2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedNightLightsTexture = texture;
  return texture;
}

/**
 * Specular Roughness Ocean Mask (2048x1024)
 * Pure mirror smooth on oceans (0.05 roughness), high roughness on land (0.95).
 */
export function createEarthRoughnessTexture(): THREE.CanvasTexture {
  if (cachedRoughnessTexture) return cachedRoughnessTexture;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Water is dark in roughness map = glossy, mirror-like specular reflection
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Land is light in roughness map = diffuse, non-reflective
  ctx.fillStyle = '#e2e8f0';

  // Draw continent silhouettes on roughness canvas
  const drawSilhouettes = () => {
    // North America
    ctx.beginPath();
    const na = [
      [-168, 66], [-140, 70], [-100, 74], [-82, 64], [-55, 50],
      [-70, 42], [-80, 26], [-97, 20], [-83, 9], [-77, 8],
      [-105, 23], [-122, 37], [-140, 59], [-165, 60]
    ];
    na.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // South America
    ctx.beginPath();
    const sa = [
      [-76, 12], [-50, -1], [-35, -5], [-38, -13], [-53, -33],
      [-66, -50], [-75, -48], [-71, -30], [-81, -5], [-76, 12]
    ];
    sa.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Eurasia
    ctx.beginPath();
    const eu = [
      [-9, 36], [0, 44], [9, 54], [28, 71], [60, 70], [105, 78],
      [170, 69], [142, 50], [120, 32], [105, 10], [100, 4], [78, 8],
      [55, 12], [35, 28], [-9, 36]
    ];
    eu.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Africa
    ctx.beginPath();
    const af = [
      [-17, 31], [10, 37], [33, 31], [51, 11], [35, -24],
      [18, -34], [9, -5], [-17, 21]
    ];
    af.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Australia
    ctx.beginPath();
    const au = [
      [114, -22], [136, -12], [153, -28], [143, -38], [116, -34]
    ];
    au.forEach(([lon, lat], i) => {
      const { x, y } = toCanvas(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Antarctica
    ctx.fillRect(0, HEIGHT * 0.85, WIDTH, HEIGHT * 0.15);
  };

  drawSilhouettes();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedRoughnessTexture = texture;
  return texture;
}

/**
 * High-Resolution Cloud System Texture (2048x1024)
 * Atmospheric swirling storm vortices, hurricanes, and trade-wind bands with transparent alpha channels.
 */
export function createHighDetailEarthCloudTexture(): THREE.CanvasTexture {
  if (cachedCloudTexture) return cachedCloudTexture;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // 1. Tropical Intertropical Convergence Zone (ITCZ) equatorial cloud streamers
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let lon = -180; lon < 180; lon += 45) {
    const { x, y } = toCanvas(lon, (Math.random() - 0.5) * 12);
    ctx.beginPath();
    ctx.ellipse(x, y, 160 + Math.random() * 80, 24 + Math.random() * 10, (Math.random() - 0.5) * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Cyclonic Storm Vortices & Tropical Hurricanes
  const cyclonicStorms = [
    { lon: -65, lat: 28, r: 85, eye: 12, rot: 0.4 }, // Atlantic Hurricane
    { lon: 135, lat: 22, r: 110, eye: 16, rot: 0.5 }, // Pacific Super Typhoon
    { lon: 88, lat: 18, r: 80, eye: 10, rot: 0.35 }, // Bay of Bengal Cyclone
    { lon: -145, lat: 48, r: 140, eye: 0, rot: -0.3 }, // Gulf of Alaska Low
    { lon: -35, lat: 54, r: 160, eye: 0, rot: -0.25 }, // North Atlantic Depressions
    { lon: 120, lat: -48, r: 150, eye: 0, rot: 0.3 }, // Roaring Forties Southern Storm
    { lon: -50, lat: -55, r: 160, eye: 0, rot: 0.25 }, // Drake Passage Storm
  ];

  cyclonicStorms.forEach(storm => {
    const { x, y } = toCanvas(storm.lon, storm.lat);
    ctx.save();
    ctx.translate(x, y);

    // Multiple spiral cloud arms
    for (let arm = 0; arm < 3; arm++) {
      const armAngle = (arm / 3) * Math.PI * 2;
      ctx.beginPath();
      for (let theta = 0; theta < Math.PI * 2.2; theta += 0.15) {
        const radius = (theta / (Math.PI * 2.2)) * storm.r;
        const px = Math.cos(theta + armAngle) * radius;
        const py = Math.sin(theta + armAngle) * radius * 0.7;
        if (theta === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Storm Core
    const grad = ctx.createRadialGradient(0, 0, storm.eye, 0, 0, storm.r);
    grad.addColorStop(0.0, storm.eye > 0 ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, storm.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  // 3. High-latitude atmospheric wavy wisps
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 40; i++) {
    const lon = (Math.random() - 0.5) * 360;
    const lat = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 35);
    const { x, y } = toCanvas(lon, lat);
    ctx.beginPath();
    ctx.ellipse(x, y, 70 + Math.random() * 110, 15 + Math.random() * 20, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedCloudTexture = texture;
  return texture;
}

/**
 * Backward compatibility alias for existing code
 */
export function createProceduralEarthTexture(): THREE.CanvasTexture {
  return createHighDetailEarthAlbedoTexture();
}
