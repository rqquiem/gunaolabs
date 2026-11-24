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
