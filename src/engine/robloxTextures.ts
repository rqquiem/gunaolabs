import * as THREE from 'three';
import { EnvironmentId, LightingMood } from './types';

export interface StudTexturePair {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

export interface RobloxLightingSpec {
  mood: LightingMood;
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  cloudColor: string;
  cloudShadow: string;
  sunColor: string;
  fogColor: number;
  fogDensity: number;
  keyColor: number;
  rimColor: number;
  hemiSky: number;
  hemiGround: number;
  exposure: number;
  isNight: boolean;
}

export function getRobloxLightingSpec(
  mood: LightingMood,
  env: EnvironmentId,
): RobloxLightingSpec {
  const isBedroom = env === 'cozyBedroom';
  const indoorFogScale = isBedroom ? 0.35 : 1;
  switch (mood) {
    case 'sunset':
      return {
        mood,
        skyTop: '#2b4c8c',
        skyHorizon: '#f99b52',
        skyBottom: '#f4c27f',
        cloudColor: '#ffe3c2',
        cloudShadow: '#e28f6e',
        sunColor: '#fff0b3',
        fogColor: isBedroom ? 0x1e2235 : 0xe9a372,
        fogDensity: 0.009 * indoorFogScale,
        keyColor: 0xffb76b,
        rimColor: 0x7dd3fc,
        hemiSky: 0xfdba74,
        hemiGround: 0x475569,
        exposure: 1.08,
        isNight: isBedroom,
      };
    case 'midnight':
      return {
        mood,
        skyTop: '#090f24',
        skyHorizon: '#1d2d57',
        skyBottom: '#131d3b',
        cloudColor: '#3b4f7d',
        cloudShadow: '#233154',
        sunColor: '#e2e8f0',
        fogColor: 0x162244,
        fogDensity: 0.012 * indoorFogScale,
        keyColor: 0x93c5fd,
        rimColor: 0x38bdf8,
        hemiSky: 0x3b82f6,
        hemiGround: 0x0f172a,
        exposure: 1.05,
        isNight: true,
      };
    case 'overcast':
      return {
        mood,
        skyTop: '#7f9bb8',
        skyHorizon: '#c9d6e3',
        skyBottom: '#b0becb',
        cloudColor: '#eef4fa',
        cloudShadow: '#a6b7c9',
        sunColor: '#f8fafc',
        fogColor: isBedroom ? 0x2a3142 : 0xc2d0de,
        fogDensity: 0.011 * indoorFogScale,
        keyColor: 0xf1f5f9,
        rimColor: 0x93c5fd,
        hemiSky: 0xe2e8f0,
        hemiGround: 0x475569,
        exposure: 1.04,
        isNight: false,
      };
    case 'noon':
    default:
      return {
        mood: 'noon',
        skyTop: '#2b7de9',
        skyHorizon: '#9cd6ff',
        skyBottom: '#bce4ff',
        cloudColor: '#ffffff',
        cloudShadow: '#cfe7fa',
        sunColor: '#fffbeb',
        fogColor: isBedroom ? 0x242c3d : 0xa8dcff,
        fogDensity: 0.007 * indoorFogScale,
        keyColor: 0xfff3d6,
        rimColor: 0x7dd3fc,
        hemiSky: 0xbae6fd,
        hemiGround: 0x4d6b3c,
        exposure: 1.06,
        isNight: false,
      };
  }
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createStudTextures(maxAnisotropy: number): StudTexturePair {
  const size = 128;

  // 1. Albedo subtle overlay (near-white so material.color tints cleanly)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const actx = albedoCanvas.getContext('2d')!;

  actx.fillStyle = '#f2f2f2';
  actx.fillRect(0, 0, size, size);

  // Subtle brick seam around tile perimeter
  actx.strokeStyle = 'rgba(0, 0, 0, 0.13)';
  actx.lineWidth = 3;
  actx.strokeRect(1.5, 1.5, size - 3, size - 3);

  // Stud base shadow ring
  const cx = size / 2;
  const cy = size / 2;
  const studR = size * 0.29;
  actx.beginPath();
  actx.arc(cx, cy + 3, studR + 3, 0, Math.PI * 2);
  actx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  actx.fill();

  // Stud raised cap
  const studGrad = actx.createLinearGradient(cx, cy - studR, cx, cy + studR);
  studGrad.addColorStop(0, '#ffffff');
  studGrad.addColorStop(0.65, '#f5f5f5');
  studGrad.addColorStop(1, '#dcdcdc');
  actx.beginPath();
  actx.arc(cx, cy, studR, 0, Math.PI * 2);
  actx.fillStyle = studGrad;
  actx.fill();

  // Crisp stud rim
  actx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  actx.lineWidth = 2.5;
  actx.stroke();

  // Subtle classic inner highlight ring
  actx.beginPath();
  actx.arc(cx, cy - 2, studR * 0.62, Math.PI * 1.05, Math.PI * 1.95);
  actx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  actx.lineWidth = 2;
  actx.stroke();

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = Math.min(8, maxAnisotropy);
  albedo.needsUpdate = true;

  // 2. Bump height map (linear space)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;

  bctx.fillStyle = '#7a7a7a';
  bctx.fillRect(0, 0, size, size);

  bctx.strokeStyle = '#404040';
  bctx.lineWidth = 3;
  bctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  bctx.beginPath();
  bctx.arc(cx, cy, studR + 2, 0, Math.PI * 2);
  bctx.fillStyle = '#555555';
  bctx.fill();

  bctx.beginPath();
  bctx.arc(cx, cy, studR, 0, Math.PI * 2);
  bctx.fillStyle = '#f2f2f2';
  bctx.fill();

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = Math.min(8, maxAnisotropy);
  bump.needsUpdate = true;

  return { albedo, bump };
}

export function createStudBrickMaterial(
  color: string | number,
  baseTextures: StudTexturePair,
  repeatX: number,
  repeatY: number,
  options?: { roughness?: number; metalness?: number; bumpScale?: number },
): THREE.MeshStandardMaterial {
  const map = baseTextures.albedo.clone();
  map.repeat.set(repeatX, repeatY);
  map.needsUpdate = true;

  const bumpMap = baseTextures.bump.clone();
  bumpMap.repeat.set(repeatX, repeatY);
  bumpMap.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    color,
    map,
    bumpMap,
    bumpScale: options?.bumpScale ?? 0.04,
    roughness: options?.roughness ?? 0.38,
    metalness: options?.metalness ?? 0.04,
  });
}

export function createPlasticBrickMaterial(
  color: string | number,
  options?: { roughness?: number; metalness?: number },
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options?.roughness ?? 0.34,
    metalness: options?.metalness ?? 0.05,
  });
}

export function createSpawnLocationTexture(
  primaryColor: string,
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  const cx = size / 2;
  const cy = size / 2;

  // Classic Roblox SpawnLocation emblem (ring + starburst)
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, 86, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = accentColor;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(-11, -34);
    ctx.lineTo(0, -72);
    ctx.lineTo(11, -34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createRobloxFaceTexture(
  faceId: string,
  inkColor = '#111827',
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const ink = inkColor;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (faceId) {
    case 'epic': {
      // Classic wide eyes + big :D grin
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(86, 98, 13, 21, 0, 0, Math.PI * 2);
      ctx.ellipse(170, 98, 13, 21, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(82, 91, 5, 0, Math.PI * 2);
      ctx.arc(166, 91, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(76, 146);
      ctx.lineTo(180, 146);
      ctx.quadraticCurveTo(180, 204, 128, 204);
      ctx.quadraticCurveTo(76, 204, 76, 146);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(86, 150, 84, 14);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(128, 186, 26, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'smirk': {
      // Cool slanted brows + angled smirk
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(64, 76);
      ctx.lineTo(104, 84);
      ctx.moveTo(152, 82);
      ctx.lineTo(192, 72);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(86, 108, 11, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(170, 108, 11, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(92, 168);
      ctx.quadraticCurveTo(142, 178, 174, 152);
      ctx.stroke();
      break;
    }
    case 'determined': {
      // Hero brows + confident grin
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(64, 72);
      ctx.lineTo(106, 86);
      ctx.moveTo(192, 72);
      ctx.lineTo(150, 86);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(86, 108, 11, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(170, 108, 11, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(82, 102, 4, 0, Math.PI * 2);
      ctx.arc(166, 102, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 10;
      ctx.strokeStyle = ink;
      ctx.beginPath();
      ctx.moveTo(86, 160);
      ctx.quadraticCurveTo(128, 186, 172, 158);
      ctx.stroke();
      break;
    }
    case 'visorEyes': {
      // Glowing cyber eyes + stoic mouth
      ctx.fillStyle = ink;
      ctx.shadowColor = ink;
      ctx.shadowBlur = 12;
      ctx.fillRect(62, 92, 50, 18);
      ctx.fillRect(144, 92, 50, 18);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(94, 164);
      ctx.lineTo(162, 164);
      ctx.stroke();
      break;
    }
    case 'shocked': {
      // O_O face
      ctx.lineWidth = 8;
      ctx.strokeStyle = ink;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(86, 100, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(170, 100, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(86, 100, 9, 0, Math.PI * 2);
      ctx.arc(170, 100, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(128, 168, 22, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'smile':
    default: {
      // Iconic Classic Roblox Smile
      ctx.beginPath();
      ctx.ellipse(86, 98, 11, 19, 0, 0, Math.PI * 2);
      ctx.ellipse(170, 98, 11, 19, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(128, 134, 48, 0.22 * Math.PI, 0.78 * Math.PI);
      ctx.stroke();
      break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createClassicSkyboxCubeTexture(
  mood: LightingMood,
  env: EnvironmentId,
): THREE.CubeTexture {
  const spec = getRobloxLightingSpec(mood, env);
  const size = 256;
  const faces: HTMLCanvasElement[] = [];

  // Face order: [+X, -X, +Y (top), -Y (bottom), +Z, -Z]
  for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    if (faceIdx === 2) {
      // +Y Sky zenith
      ctx.fillStyle = spec.skyTop;
      ctx.fillRect(0, 0, size, size);
      drawStylizedClouds(ctx, size, spec.cloudColor, spec.cloudShadow, 4, faceIdx);
      if (spec.isNight) {
        drawStars(ctx, size, 32, faceIdx);
      }
    } else if (faceIdx === 3) {
      // -Y Bottom below horizon
      ctx.fillStyle = spec.skyBottom;
      ctx.fillRect(0, 0, size, size);
    } else {
      // Side horizon faces
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, spec.skyTop);
      grad.addColorStop(0.54, spec.skyHorizon);
      grad.addColorStop(1, spec.skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      if (spec.isNight) {
        drawStars(ctx, size, 24, faceIdx);
      }

      // Draw Roblox square/disc sun on +X/+Z corner (+Z face)
      if (faceIdx === 4) {
        const sunX = size * 0.72;
        const sunY = size * 0.28;
        ctx.fillStyle = spec.sunColor;
        ctx.globalAlpha = 0.24;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      drawStylizedClouds(ctx, size, spec.cloudColor, spec.cloudShadow, 5, faceIdx);
    }

    faces.push(canvas);
  }

  const cube = new THREE.CubeTexture(faces);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.needsUpdate = true;
  return cube;
}

function drawStylizedClouds(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  shadow: string,
  count: number,
  seed: number,
) {
  for (let i = 0; i < count; i++) {
    const h = Math.sin((seed + 1) * 19.3 + i * 7.7) * 0.5 + 0.5;
    const x = ((i + 0.35) / count) * size * 0.88;
    const y = seed === 2 ? h * size * 0.7 + 20 : size * (0.2 + h * 0.24);
    const w = 44 + (i % 3) * 20;
    const ht = 16 + (i % 2) * 8;

    ctx.fillStyle = shadow;
    ctx.fillRect(x, y + ht * 0.55, w, ht * 0.55);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, ht);
    ctx.fillRect(x + w * 0.18, y - ht * 0.45, w * 0.55, ht * 0.55);
  }
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  seed: number,
) {
  ctx.fillStyle = '#e2e8f0';
  for (let i = 0; i < count; i++) {
    const rx = Math.abs(Math.sin((seed + 3) * 13.7 + i * 5.3));
    const ry = Math.abs(Math.cos((seed + 5) * 9.1 + i * 11.7));
    const x = rx * size;
    const y = ry * (size * 0.58);
    const s = i % 4 === 0 ? 3 : 2;
    ctx.fillRect(x, y, s, s);
  }
}

function finalizeSrgbCanvasTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createBedroomMainMonitorTexture(
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Wallpaper gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.55, '#1e1b4b');
  bg.addColorStop(1, '#312e81');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Stylized glowing sun + perspective grid horizon inside center viewport
  ctx.fillStyle = '#090d1a';
  ctx.fillRect(14, 14, w - 28, h - 46);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, w - 28, h - 46);

  // Viewport header bar
  ctx.fillStyle = '#141a2b';
  ctx.fillRect(14, 14, w - 28, 22);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(24, 21, 56, 8);
  ctx.fillStyle = accentColor;
  ctx.fillRect(88, 21, 40, 8);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(w - 72, 20, 44, 10);

  // Left scene outliner panel
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(18, 40, 96, 174);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i === 2 ? '#00a2ff' : '#475569';
    ctx.fillRect(26, 50 + i * 21, i === 2 ? 78 : 54 + ((i * 11) % 24), 10);
  }

  // Center 3D game world preview
  const vpX = 120;
  const vpY = 40;
  const vpW = 266;
  const vpH = 140;
  const sky = ctx.createLinearGradient(vpX, vpY, vpX, vpY + vpH);
  sky.addColorStop(0, '#1e1b4b');
  sky.addColorStop(0.65, '#7c3aed');
  sky.addColorStop(1, '#f97316');
  ctx.fillStyle = sky;
  ctx.fillRect(vpX, vpY, vpW, vpH);

  // Synth sun & blocky mountains
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(vpX + vpW * 0.5, vpY + vpH * 0.56, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(vpX, vpY + vpH * 0.68, vpW, vpH * 0.32);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  for (let gx = 0; gx <= 6; gx++) {
    ctx.beginPath();
    ctx.moveTo(vpX + (gx / 6) * vpW, vpY + vpH * 0.68);
    ctx.lineTo(vpX + (gx / 6 - 0.5) * vpW * 1.6 + vpW * 0.5, vpY + vpH);
    ctx.stroke();
  }

  // Blocky hero silhouette on viewport floor
  ctx.fillStyle = '#f5cd30';
  ctx.fillRect(vpX + 124, vpY + 84, 18, 18);
  ctx.fillStyle = '#0d69ac';
  ctx.fillRect(vpX + 120, vpY + 102, 26, 20);

  // Bottom mini timeline strip
  ctx.fillStyle = '#111827';
  ctx.fillRect(120, 184, 266, 30);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(128, 192, 6, 14);
  ctx.fillStyle = '#f59e0b';
  for (let k = 0; k < 5; k++) {
    ctx.fillRect(156 + k * 42, 195, 8, 8);
  }

  // Right inspector panel
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(392, 40, 102, 174);
  for (let r = 0; r < 6; r++) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(400, 50 + r * 24, 86, 14);
    ctx.fillStyle = r % 2 === 0 ? accentColor : '#38bdf8';
    ctx.fillRect(402, 52 + r * 24, 34 + ((r * 17) % 44), 10);
  }

  // Desktop taskbar
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, h - 26, w, 26);
  const dockColors = ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'];
  dockColors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(w * 0.5 - 56 + i * 24, h - 20, 16, 14);
  });

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createBedroomSideMonitorTexture(
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // Header bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(12, 12, w - 24, 32);
  ctx.fillStyle = accentColor;
  ctx.fillRect(22, 22, 12, 12);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(42, 24, 112, 8);

  // Chat messages stack
  const chatColors = ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ec4899'];
  for (let i = 0; i < 6; i++) {
    const cy = 58 + i * 34;
    ctx.fillStyle = '#172033';
    ctx.fillRect(14, cy, w - 28, 26);
    ctx.fillStyle = chatColors[i % chatColors.length];
    ctx.fillRect(22, cy + 7, 12, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(42, cy + 9, 108 + ((i * 23) % 70), 8);
  }

  // Audio Spectrum / EQ Bars panel
  ctx.fillStyle = '#111827';
  ctx.fillRect(14, 272, w - 28, 96);
  const bars = 12;
  for (let b = 0; b < bars; b++) {
    const bh = 18 + Math.round(Math.abs(Math.sin(b * 0.85)) * 56);
    ctx.fillStyle = b % 2 === 0 ? '#38bdf8' : accentColor;
    ctx.fillRect(24 + b * 18, 356 - bh, 12, bh);
  }

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createBedroomConsoleTvTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.6, '#1e3a8a');
  grad.addColorStop(1, '#312e81');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Pixel stars
  ctx.fillStyle = '#e2e8f0';
  for (let i = 0; i < 28; i++) {
    const sx = ((i * 73) % 480) + 16;
    const sy = ((i * 41) % 140) + 12;
    ctx.fillRect(sx, sy, 3, 3);
  }

  // Title banner
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(88, 34, 336, 44);
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BRICK QUEST CO-OP', w / 2, 64);

  // Two blocky co-op avatars
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(154, 114, 44, 52);
  ctx.fillStyle = '#f5cd30';
  ctx.fillRect(162, 88, 28, 26);

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(314, 114, 44, 52);
  ctx.fillStyle = '#eab892';
  ctx.fillRect(322, 88, 28, 26);

  // Press Start pill bar
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(176, 194, 160, 28);
  ctx.fillStyle = '#052e16';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('PLAYER 1 + 2 READY', w / 2, 213);

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createBedroomPosterTexture(
  variant: 0 | 1 | 2,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 256;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (variant === 0) {
    // Brick Battle Championship poster
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0284c7');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(w / 2, 138, 68, 0, Math.PI * 2);
    ctx.fill();

    // Sword silhouette
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(120, 62, 16, 128);
    ctx.fillRect(96, 162, 64, 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CROSSROADS', w / 2, 254);
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('CHAMPIONSHIP', w / 2, 280);
  } else if (variant === 1) {
    // Synthwave Neon Sunset poster
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3b0764');
    bg.addColorStop(0.55, '#db2777');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(w / 2, 148, 64, 0, Math.PI * 2);
    ctx.fill();

    // Horizon scanlines
    ctx.fillStyle = '#db2777';
    for (let y = 148; y < 210; y += 14) {
      ctx.fillRect(54, y, 148, 5);
    }

    ctx.fillStyle = '#090d1a';
    ctx.fillRect(0, 210, w, 110);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 6) * w, 210);
      ctx.lineTo((i / 6 - 0.5) * w * 1.8 + w * 0.5, h);
      ctx.stroke();
    }
  } else {
    // Retro Pixel Cartridge / Arcade poster
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(28, 28, w - 56, 180);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(54, 62, w - 108, 96);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(76, 84, 34, 34);
    ctx.fillRect(146, 84, 34, 34);
    ctx.fillRect(96, 128, 64, 16);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BLOX ARCADE', w / 2, 256);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('EDITION 64', w / 2, 282);
  }

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createBedroomSkylineTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#070b1e');
  sky.addColorStop(0.55, '#172554');
  sky.addColorStop(1, '#312e81');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Twinkling starfield
  for (let i = 0; i < 42; i++) {
    const sx = ((i * 97 + 19) % (w - 20)) + 10;
    const sy = ((i * 53 + 11) % (h * 0.56)) + 10;
    ctx.fillStyle = i % 5 === 0 ? '#bae6fd' : '#f8fafc';
    const sz = i % 6 === 0 ? 3 : 2;
    ctx.fillRect(sx, sy, sz, sz);
  }

  // Crescent Moon
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(388, 86, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0e183b';
  ctx.beginPath();
  ctx.arc(400, 78, 28, 0, Math.PI * 2);
  ctx.fill();

  // Distant purple city towers
  const backTowers = [
    [16, 150, 62],
    [82, 185, 56],
    [142, 130, 70],
    [218, 175, 64],
    [288, 140, 68],
    [362, 165, 58],
    [426, 128, 72],
  ];
  backTowers.forEach(([bx, by, bw]) => {
    ctx.fillStyle = '#111834';
    ctx.fillRect(bx, by, bw, h - by);
  });

  // Foreground dark buildings with warm amber & cyan lit windows
  const frontTowers = [
    [0, 210, 86],
    [94, 176, 78],
    [184, 224, 92],
    [286, 188, 82],
    [382, 206, 130],
  ];
  frontTowers.forEach(([fx, fy, fw], idx) => {
    ctx.fillStyle = '#090e21';
    ctx.fillRect(fx, fy, fw, h - fy);
    for (let wy = fy + 14; wy < h - 20; wy += 22) {
      for (let wx = fx + 12; wx < fx + fw - 16; wx += 18) {
        if (((wx + wy + idx * 7) % 5) === 0) continue;
        ctx.fillStyle = ((wx + wy) % 3 === 0) ? '#38bdf8' : '#fde68a';
        ctx.fillRect(wx, wy, 9, 11);
      }
    }
  });

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

// =========================================================================
// Idiom Town ("Welcome to Verbatim") Procedural Scene Textures
// =========================================================================

export function createVerbatimSignTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7c4a26';
  ctx.fillRect(0, 0, w, h);

  // Wood plank grain lines
  ctx.strokeStyle = '#5a3216';
  ctx.lineWidth = 4;
  for (let y = 32; y < h; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Painted cream border
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WELCOME TO', w / 2, 82);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('VERBATIM.', w / 2, 148);

  ctx.fillStyle = '#fcd34d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('WHERE EVERY IDIOM IS 100% LITERAL', w / 2, 204);

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createCafeMenuTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1b2420';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERBATIM ROASTERY', w / 2, 54);

  ctx.textAlign = 'left';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('OAT LATTE ..................... $4.50', 48, 110);
  ctx.fillText('ESPRESSO SHOT .............. $3.00', 48, 146);
  ctx.fillStyle = '#fca5a5';
  ctx.fillText('GOSSIP ZONE (PINTO) ...... FREE', 48, 182);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 16px sans-serif';
  ctx.fillText('* Shovel cleanup fee may apply', 48, 220);

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createBoardroomLaptopTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 256;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 10, w - 20, 22);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('Q4 SYNERGY METRICS (DO NOT LOOK UP)', 18, 25);

  const bars = [48, 72, 38, 94, 64, 88];
  bars.forEach((bh, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#22c55e';
    ctx.fillRect(24 + i * 36, 136 - bh, 22, bh);
  });

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createStainedGlassTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, w, h);

  const colors = ['#fef08a', '#bae6fd', '#fbcfe8', '#fde68a', '#a5f3fc'];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = colors[(row + col) % colors.length];
      ctx.fillRect(14 + col * 58, 16 + row * 60, 50, 52);
    }
  }
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(w / 2, 110, 44, 0, Math.PI * 2);
  ctx.fill();

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createTheaterPlaybillTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#450a0a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 26px serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERBATIM', w / 2, 72);
  ctx.fillText('PLAYHOUSE', w / 2, 106);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('TONIGHT: HAMLET', w / 2, 174);

  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('DO NOT WISH LUCK', w / 2, 246);
  ctx.fillText('14 LAWSUITS & COUNTING', w / 2, 276);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('AMBULANCE ON STANDBY', w / 2, 326);

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createDinerNeonSignTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERBATIM DINER', w / 2, 86);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PLAIN FACTS ONLY  ·  OPEN 24 HRS', w / 2, 140);

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}

export function createTourBusBannerTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 88, w, 40);

  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERBATIM SIGHTSEEING', w / 2, 54);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('WATCH YOUR PHRASING · NO REFUNDS', w / 2, 114);

  return finalizeSrgbCanvasTexture(canvas, maxAnisotropy);
}


