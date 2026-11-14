// LunarSight - Procedural Demonstration Earth Texture Generator
// Creates realistic global albedo and cloud map for distant background Earth in the cislunar space scene.

import * as THREE from 'three';

/**
 * Generates a procedural demonstration Earth texture (1024x512)
 * Features oceanic gradients, continental landmasses, arid zones, polar ice caps, and atmospheric cloud bands.
 */
export function createProceduralEarthTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Ocean Base with Azure Coastal Shelf Waters
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0a2244');
  oceanGrad.addColorStop(0.3, '#0e2d58');
  oceanGrad.addColorStop(0.5, '#12396d');
  oceanGrad.addColorStop(0.7, '#0e2d58');
  oceanGrad.addColorStop(1, '#0a2244');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper: Equirectangular projection mapping
  const toCanvas = (lon: number, lat: number) => ({
    x: ((lon + 180.0) / 360.0) * width,
    y: ((90.0 - lat) / 180.0) * height,
  });

  // 2. Continental Landmasses
  const continents = [
    // North America
    {
      color: '#264c38',
      path: [
        [-165, 68], [-140, 70], [-100, 72], [-80, 60], [-65, 45],
        [-75, 35], [-82, 25], [-95, 20], [-105, 22], [-120, 35],
        [-125, 48], [-140, 58], [-160, 60]
      ]
    },
    // South America
    {
      color: '#244e36',
      path: [
        [-78, 10], [-55, 5], [-35, -5], [-38, -15], [-50, -30],
        [-65, -50], [-72, -54], [-75, -45], [-72, -30], [-80, -5], [-80, 8]
      ]
    },
    // Europe & Asia (Eurasia)
    {
      color: '#2d5438',
      path: [
        [-8, 38], [15, 38], [28, 42], [40, 45], [60, 48],
        [90, 50], [120, 50], [140, 55], [170, 65], [180, 70],
        [160, 72], [100, 75], [50, 72], [15, 70], [5, 60], [-5, 50]
      ]
    },
    // Africa
    {
      color: '#444634', // Arid Sahara transition to savannah
      path: [
        [-15, 30], [10, 35], [30, 32], [50, 12], [45, 0],
        [40, -15], [32, -32], [20, -34], [12, -15], [10, 5],
        [-15, 12], [-16, 25]
      ]
    },
    // Australia
    {
      color: '#554a36', // Arid red/ochre outback
      path: [
        [115, -22], [130, -15], [145, -18], [152, -28], [148, -38],
        [135, -36], [120, -34], [114, -28]
      ]
    },
    // Antarctica (Ice Cap)
    {
      color: '#e2e8f0',
      path: [
        [-180, -72], [-120, -75], [-60, -70], [0, -72],
        [60, -74], [120, -72], [180, -72], [180, -90], [-180, -90]
      ]
    },
    // Greenland (Ice Cap)
    {
      color: '#edf2f7',
      path: [
        [-50, 62], [-40, 65], [-25, 72], [-20, 80], [-55, 82], [-60, 75]
      ]
    }
  ];

  continents.forEach(continent => {
    ctx.fillStyle = continent.color;
    ctx.beginPath();
    continent.path.forEach((pt, i) => {
      const { x, y } = toCanvas(pt[0], pt[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });

  // 3. Sahara and Middle Eastern Desert Shading
  const desert = toCanvas(20, 24);
  const desertGrad = ctx.createRadialGradient(desert.x, desert.y, 10, desert.x, desert.y, 120);
  desertGrad.addColorStop(0, 'rgba(164, 138, 92, 0.7)');
  desertGrad.addColorStop(0.6, 'rgba(124, 110, 78, 0.4)');
  desertGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = desertGrad;
  ctx.beginPath();
  ctx.arc(desert.x, desert.y, 120, 0, Math.PI * 2);
  ctx.fill();

  // 4. Atmospheric Swirling Clouds (White Wisps & Cyclonic Storms)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  const cloudBands = [
    { lon: -110, lat: 45, rx: 110, ry: 25, rot: 0.15 },
    { lon: -30, lat: 55, rx: 140, ry: 30, rot: -0.2 },
    { lon: 70, lat: 60, rx: 180, ry: 35, rot: 0.1 },
    { lon: -60, lat: 5, rx: 160, ry: 20, rot: -0.05 }, // ITCZ equatorial
    { lon: 110, lat: 10, rx: 200, ry: 22, rot: 0.08 },
    { lon: -130, lat: -45, rx: 160, ry: 28, rot: -0.15 },
    { lon: 20, lat: -50, rx: 170, ry: 30, rot: 0.2 },
    { lon: 130, lat: -52, rx: 150, ry: 26, rot: -0.1 },
  ];

  cloudBands.forEach(b => {
    const { x, y } = toCanvas(b.lon, b.lat);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(b.rot);
    ctx.scale(1.0, b.ry / b.rx);

    const cGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, b.rx);
    cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    cGrad.addColorStop(0.5, 'rgba(240, 245, 255, 0.55)');
    cGrad.addColorStop(0.85, 'rgba(230, 240, 255, 0.2)');
    cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(0, 0, b.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}
