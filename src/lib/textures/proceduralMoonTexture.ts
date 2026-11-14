// LunarSight - Procedural Demonstration Lunar Surface Texture Generator
// Creates realistic albedo and bump maps calibrated to major lunar cartographic features.
// Data notice: Procedural demonstration texture for scientific visualization.

import * as THREE from 'three';

export interface LunarTextureSet {
  albedoTexture: THREE.CanvasTexture;
  bumpTexture: THREE.CanvasTexture;
}

/**
 * Generates procedural demonstration albedo and bump textures for the 3D Moon sphere.
 * Resolution: 2048 x 1024 (2:1 equirectangular projection)
 */
export function createProceduralLunarTextures(): LunarTextureSet {
  const width = 2048;
  const height = 1024;

  // 1. Create Albedo Canvas
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const ctx = albedoCanvas.getContext('2d')!;

  // 2. Create Bump Canvas
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  // Base Lunar Highland Regolith Color (medium-light lunar grey)
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(0, 0, width, height);

  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, width, height);

  // Helper to convert Lon [-180, 180] and Lat [-90, 90] to Canvas (x, y)
  // Lon -180 is x = 0, Lon 0 is x = width/2, Lon +180 is x = width
  // Lat +90 is y = 0, Lat 0 is y = height/2, Lat -90 is y = height
  const toCanvasCoords = (lon: number, lat: number) => {
    const x = ((lon + 180.0) / 360.0) * width;
    const y = ((90.0 - lat) / 180.0) * height;
    return { x, y };
  };

  // 1. Draw Major Basaltic Lunar Maria (Dark Lowlands on Near Side: Lon -90 to +90)
  const maria = [
    { name: 'Oceanus Procellarum', lon: -50, lat: 20, rx: 240, ry: 200, dark: 0.38 },
    { name: 'Mare Imbrium', lon: -16, lat: 33, rx: 140, ry: 130, dark: 0.35 },
    { name: 'Mare Serenitatis', lon: 18, lat: 28, rx: 110, ry: 100, dark: 0.36 },
    { name: 'Mare Tranquillitatis', lon: 31, lat: 8, rx: 120, ry: 95, dark: 0.33 },
    { name: 'Mare Crisium', lon: 59, lat: 17, rx: 75, ry: 65, dark: 0.32 },
    { name: 'Mare Fecunditatis', lon: 51, lat: -8, rx: 90, ry: 80, dark: 0.37 },
    { name: 'Mare Nectaris', lon: 36, lat: -15, rx: 65, ry: 60, dark: 0.38 },
    { name: 'Mare Nubium', lon: -17, lat: -21, rx: 95, ry: 85, dark: 0.36 },
    { name: 'Mare Humorum', lon: -39, lat: -24, rx: 65, ry: 60, dark: 0.35 },
    { name: 'South Pole - Aitken Basin', lon: 170, lat: -53, rx: 220, ry: 170, dark: 0.42 },
  ];

  maria.forEach(m => {
    const { x, y } = toCanvasCoords(m.lon, m.lat);
    const radGrad = ctx.createRadialGradient(x, y, 10, x, y, m.rx);
    radGrad.addColorStop(0, `rgba(45, 48, 55, ${m.dark})`);
    radGrad.addColorStop(0.7, `rgba(60, 64, 72, ${m.dark * 0.8})`);
    radGrad.addColorStop(1, 'rgba(158, 158, 158, 0)');

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, m.ry / m.rx);
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(0, 0, m.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bump depression for maria basins
    const bumpGrad = bumpCtx.createRadialGradient(x, y, 10, x, y, m.rx);
    bumpGrad.addColorStop(0, 'rgba(90, 90, 90, 0.4)');
    bumpGrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
    bumpCtx.save();
    bumpCtx.translate(x, y);
    bumpCtx.scale(1, m.ry / m.rx);
    bumpCtx.fillStyle = bumpGrad;
    bumpCtx.beginPath();
    bumpCtx.arc(0, 0, m.rx, 0, Math.PI * 2);
    bumpCtx.fill();
    bumpCtx.restore();
  });

  // 2. Draw Major Prominent Lunar Craters (with Rims, Central Peaks & Bright Ejecta Rays)
  const craters = [
    // South Polar Craters
    { name: 'Shackleton', lon: 0.0, lat: -89.9, r: 8, isPolarPSR: true },
    { name: 'Malapert Massif', lon: 2.7, lat: -85.8, r: 16, isPeak: true },
    { name: 'de Gerlache', lon: -88.3, lat: -88.7, r: 12, isPolarPSR: true },
    { name: 'Haworth', lon: -5.5, lat: -87.4, r: 15, isPolarPSR: true },
    { name: 'Shoemaker', lon: 45.3, lat: -88.1, r: 14, isPolarPSR: true },
    { name: 'Faustini', lon: 77.0, lat: -87.2, r: 13, isPolarPSR: true },
    { name: 'Nobile', lon: 53.6, lat: -85.2, r: 18, isPolarPSR: false },
    { name: 'Amundsen', lon: 82.8, lat: -84.4, r: 22, isPolarPSR: false },
    // Prominent Equatorial / Mid-Latitude Landmarks
    { name: 'Tycho', lon: -11.2, lat: -43.3, r: 26, hasRays: true },
    { name: 'Copernicus', lon: -20.1, lat: 9.6, r: 24, hasRays: true },
    { name: 'Kepler', lon: -38.0, lat: 8.1, r: 14, hasRays: true },
    { name: 'Aristarchus', lon: -47.5, lat: 23.7, r: 16, isBright: true },
    { name: 'Plato', lon: -9.3, lat: 51.6, r: 25, isDarkFloor: true },
  ];

  craters.forEach(crater => {
    const { x, y } = toCanvasCoords(crater.lon, crater.lat);

    // Ejecta Rays for rayed craters (Tycho, Copernicus)
    if (crater.hasRays) {
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 235, 240, 0.22)';
      ctx.lineWidth = 1.5;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        const rayLen = crater.r * 6 + (Math.sin(angle * 7) * crater.r * 2);
        ctx.lineTo(x + Math.cos(angle) * rayLen, y + Math.sin(angle) * rayLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Crater Rim (Bright circular ridge)
    ctx.beginPath();
    ctx.arc(x, y, crater.r, 0, Math.PI * 2);
    ctx.strokeStyle = crater.isBright ? '#f1f5f9' : '#d1d5db';
    ctx.lineWidth = Math.max(1.5, crater.r * 0.2);
    ctx.stroke();

    // Crater Interior Fill
    ctx.beginPath();
    ctx.arc(x, y, crater.r * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = crater.isDarkFloor
      ? '#374151'
      : crater.isPolarPSR
      ? '#262c38' // Deep shadowed cold trap interior
      : '#6b7280';
    ctx.fill();

    // Central Peak for large craters
    if (crater.r > 15 && !crater.isDarkFloor) {
      ctx.beginPath();
      ctx.arc(x, y, crater.r * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
    }

    // Bump Map Drawing (Elevated Rim & Deep Bowl)
    // Rim Ridge (White highlight)
    bumpCtx.beginPath();
    bumpCtx.arc(x, y, crater.r, 0, Math.PI * 2);
    bumpCtx.strokeStyle = crater.isPeak ? '#ffffff' : '#e0e0e0';
    bumpCtx.lineWidth = Math.max(2, crater.r * 0.25);
    bumpCtx.stroke();

    // Bowl Depression (Dark)
    bumpCtx.beginPath();
    bumpCtx.arc(x, y, crater.r * 0.75, 0, Math.PI * 2);
    bumpCtx.fillStyle = crater.isPolarPSR ? '#303030' : '#505050';
    bumpCtx.fill();

    // Central Peak Bump
    if (crater.r > 15 && !crater.isDarkFloor) {
      bumpCtx.beginPath();
      bumpCtx.arc(x, y, crater.r * 0.18, 0, Math.PI * 2);
      bumpCtx.fillStyle = '#ffffff';
      bumpCtx.fill();
    }
  });

  // 3. Add High-Frequency Regolith Noise
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const bumpData = bumpCtx.getImageData(0, 0, width, height);
  const bData = bumpData.data;

  // Add subtle pseudo-random speckle noise
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));

    bData[i] = Math.min(255, Math.max(0, bData[i] + noise * 1.5));
    bData[i + 1] = bData[i];
    bData[i + 2] = bData[i];
  }
  ctx.putImageData(imgData, 0, 0);
  bumpCtx.putImageData(bumpData, 0, 0);

  // 4. Create Three.js Textures
  const albedoTexture = new THREE.CanvasTexture(albedoCanvas);
  albedoTexture.wrapS = THREE.RepeatWrapping;
  albedoTexture.wrapT = THREE.ClampToEdgeWrapping;
  albedoTexture.colorSpace = THREE.SRGBColorSpace;

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { albedoTexture, bumpTexture };
}
