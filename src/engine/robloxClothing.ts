import * as THREE from 'three';
import {
  BeltStyleId,
  ClothingConfig,
  ClothingPatternId,
  FabricMaterialId,
  FootwearId,
  OuterwearStyleId,
  PantsStyleId,
  R6BodyColors,
  SecondaryMotionState,
  ShirtStyleId,
  SleeveMode,
} from './types';
import {
  FOOTWEAR_CATALOG,
  normalizeClothingConfig,
  OUTERWEAR_CATALOG,
  PANT_CATALOG,
  SHIRT_CATALOG,
} from './robloxCatalog';

export const CLOTHING_STUD = 0.55;
const S = CLOTHING_STUD;

type ResolvedFabric = Exclude<FabricMaterialId, 'auto'>;

export interface RobloxClothingRig {
  applySecondaryMotion: (
    sec: SecondaryMotionState,
    leftLegPitchRad?: number,
    rightLegPitchRad?: number,
  ) => void;
}

// =========================================================================
// 1. Color & Safe Disposal Utilities
// =========================================================================

function shadeHex(hex: string, delta: number): string {
  const c = new THREE.Color(hex);
  if (delta >= 0) {
    c.lerp(new THREE.Color('#ffffff'), Math.min(1, delta));
  } else {
    c.lerp(new THREE.Color('#000000'), Math.min(1, -delta));
  }
  return `#${c.getHexString()}`;
}

export function disposeClothingGroupChildren(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          const std = m as THREE.MeshStandardMaterial;
          if (std.map && !std.map.userData?.shared) std.map.dispose();
          if (std.bumpMap && !std.bumpMap.userData?.shared) std.bumpMap.dispose();
          if (std.roughnessMap && !std.roughnessMap.userData?.shared) std.roughnessMap.dispose();
          m.dispose();
        });
      }
    });
  }
}

export function disposeClothingMaterials(mats: THREE.Material | THREE.Material[]) {
  const list = Array.isArray(mats) ? mats : [mats];
  list.forEach((m) => {
    const std = m as THREE.MeshStandardMaterial;
    if (std.map && !std.map.userData?.shared) std.map.dispose();
    if (std.bumpMap && !std.bumpMap.userData?.shared) std.bumpMap.dispose();
    if (std.roughnessMap && !std.roughnessMap.userData?.shared) std.roughnessMap.dispose();
    m.dispose();
  });
}

// =========================================================================
// 2. Globally Cached Procedural Fabric Bump Maps (Zero External 404s)
// =========================================================================

const SHARED_FABRIC_BUMPS = new Map<ResolvedFabric, THREE.CanvasTexture>();

function getSharedFabricBumpMap(fabric: ResolvedFabric): THREE.CanvasTexture {
  const cached = SHARED_FABRIC_BUMPS.get(fabric);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  switch (fabric) {
    case 'cotton': {
      // Crisp micro-weave warp & weft
      for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#949494' : '#707070';
        ctx.fillRect(0, y, size, 2);
      }
      for (let x = 0; x < size; x += 4) {
        ctx.fillStyle = x % 8 === 0 ? 'rgba(210,210,210,0.35)' : 'rgba(60,60,60,0.35)';
        ctx.fillRect(x, 0, 2, size);
      }
      break;
    }

    case 'denim': {
      // 45-degree diagonal denim twill ribs
      ctx.strokeStyle = '#a8a8a8';
      ctx.lineWidth = 2.2;
      for (let i = -size; i < size * 2; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
      }
      ctx.strokeStyle = '#5c5c5c';
      ctx.lineWidth = 1.4;
      for (let i = -size + 3; i < size * 2; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
      }
      break;
    }

    case 'knit': {
      // Chunky ribbed V-stitch knitwear columns
      const colW = 16;
      for (let x = 0; x < size; x += colW) {
        const g = ctx.createLinearGradient(x, 0, x + colW, 0);
        g.addColorStop(0, '#505050');
        g.addColorStop(0.32, '#b8b8b8');
        g.addColorStop(0.5, '#686868');
        g.addColorStop(0.68, '#b8b8b8');
        g.addColorStop(1, '#505050');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, colW, size);

        // V-shaped yarn loops
        ctx.strokeStyle = '#3f3f3f';
        ctx.lineWidth = 1.5;
        for (let y = 0; y < size; y += 10) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y);
          ctx.lineTo(x + colW * 0.5, y + 7);
          ctx.lineTo(x + colW - 2, y);
          ctx.stroke();
        }
      }
      break;
    }

    case 'leather': {
      // Organic pebbled leather grain
      for (let i = 0; i < 420; i++) {
        const rx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
        const ry = ((Math.sin(i * 78.233) * 24634.6345) % 1 + 1) % 1;
        const r = 2 + (i % 4) * 1.1;
        const lum = 110 + (i % 5) * 14;
        ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
        ctx.beginPath();
        ctx.arc(rx * size, ry * size, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'quilted': {
      // Soft pillowed diamond quilt chambers
      const step = 32;
      for (let y = -step; y <= size + step; y += step) {
        for (let x = -step; x <= size + step; x += step) {
          const grad = ctx.createRadialGradient(x, y, 2, x, y, step * 0.65);
          grad.addColorStop(0, '#e6e6e6');
          grad.addColorStop(0.75, '#a0a0a0');
          grad.addColorStop(1, '#444444');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(x, y - step * 0.5);
          ctx.lineTo(x + step * 0.5, y);
          ctx.lineTo(x, y + step * 0.5);
          ctx.lineTo(x - step * 0.5, y);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.strokeStyle = '#383838';
      ctx.lineWidth = 2;
      for (let i = -size; i < size * 2; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.moveTo(i + size, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
      }
      break;
    }

    case 'satin': {
      // Subtle ultra-fine vertical silk sheen lines
      for (let x = 0; x < size; x += 2) {
        const lum = 122 + Math.round(Math.sin(x * 0.7) * 12);
        ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
        ctx.fillRect(x, 0, 2, size);
      }
      break;
    }

    case 'armor': {
      // Brushed horizontal metal micro-grain with panel seam
      for (let y = 0; y < size; y += 2) {
        const lum = 124 + Math.round(Math.sin(y * 1.3) * 10);
        ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
        ctx.fillRect(0, y, size, 2);
      }
      ctx.strokeStyle = '#484848';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, size - 8, size - 8);
      break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.userData = { shared: true };
  tex.needsUpdate = true;
  SHARED_FABRIC_BUMPS.set(fabric, tex);
  return tex;
}

interface FabricPbrSpec {
  roughness: number;
  metalness: number;
  sheen: number;
  sheenRoughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  bumpScale: number;
}

function getFabricPbrSpec(fabric: ResolvedFabric): FabricPbrSpec {
  switch (fabric) {
    case 'denim':
      return { roughness: 0.84, metalness: 0.02, sheen: 0.25, sheenRoughness: 0.8, clearcoat: 0, clearcoatRoughness: 0.5, bumpScale: 0.024 };
    case 'knit':
      return { roughness: 0.92, metalness: 0.0, sheen: 0.65, sheenRoughness: 0.78, clearcoat: 0, clearcoatRoughness: 0.6, bumpScale: 0.036 };
    case 'leather':
      return { roughness: 0.36, metalness: 0.08, sheen: 0.12, sheenRoughness: 0.5, clearcoat: 0.42, clearcoatRoughness: 0.28, bumpScale: 0.018 };
    case 'quilted':
      return { roughness: 0.46, metalness: 0.06, sheen: 0.28, sheenRoughness: 0.45, clearcoat: 0.24, clearcoatRoughness: 0.36, bumpScale: 0.034 };
    case 'satin':
      return { roughness: 0.34, metalness: 0.12, sheen: 0.75, sheenRoughness: 0.3, clearcoat: 0.18, clearcoatRoughness: 0.25, bumpScale: 0.008 };
    case 'armor':
      return { roughness: 0.26, metalness: 0.68, sheen: 0.0, sheenRoughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.18, bumpScale: 0.016 };
    case 'cotton':
    default:
      return { roughness: 0.78, metalness: 0.02, sheen: 0.42, sheenRoughness: 0.72, clearcoat: 0, clearcoatRoughness: 0.5, bumpScale: 0.015 };
  }
}

function resolveTopFabric(c: ClothingConfig): ResolvedFabric {
  if (c.topFabric && c.topFabric !== 'auto') return c.topFabric;
  const entry = SHIRT_CATALOG.find((s) => s.id === c.shirtId);
  return entry?.defaultFabric ?? 'cotton';
}

function resolveOuterwearFabric(c: ClothingConfig): ResolvedFabric {
  if (c.outerwearFabric && c.outerwearFabric !== 'auto') return c.outerwearFabric;
  const entry = OUTERWEAR_CATALOG.find((o) => o.id === (c.outerwearId ?? 'none'));
  return entry?.defaultFabric ?? 'cotton';
}

function resolveBottomFabric(c: ClothingConfig): ResolvedFabric {
  if (c.bottomFabric && c.bottomFabric !== 'auto') return c.bottomFabric;
  const entry = PANT_CATALOG.find((p) => p.id === c.pantsId);
  return entry?.defaultFabric ?? 'cotton';
}

function resolveEffectiveSleeves(
  shirtId: ShirtStyleId,
  sleeveMode: SleeveMode,
): Exclude<SleeveMode, 'auto'> {
  if (sleeveMode !== 'auto') return sleeveMode;
  if (shirtId === 'none') return 'sleeveless';
  const entry = SHIRT_CATALOG.find((s) => s.id === shirtId);
  return entry?.defaultSleeves ?? 'long';
}

function resolveEffectiveBelt(c: ClothingConfig): Exclude<BeltStyleId, 'auto'> {
  if (c.beltStyle && c.beltStyle !== 'auto') return c.beltStyle;
  if (c.shirtId === 'knightTunic') return 'leather';
  if (c.shirtId === 'wizardRobe') return 'sash';
  if (c.outerwearId === 'trenchCoat') return 'sash';
  if (c.pantsId === 'jeans' || c.pantsId === 'slacks' || c.pantsId === 'pleatedSkirt') {
    return 'leather';
  }
  return 'none';
}

function makeFabricMaterial(
  color: string,
  fabric: ResolvedFabric,
  map?: THREE.CanvasTexture | null,
  extra?: Partial<THREE.MeshPhysicalMaterialParameters>,
): THREE.MeshPhysicalMaterial {
  const spec = getFabricPbrSpec(fabric);
  const bump = getSharedFabricBumpMap(fabric);
  return new THREE.MeshPhysicalMaterial({
    color: map ? '#ffffff' : color,
    map: map ?? null,
    bumpMap: bump,
    bumpScale: spec.bumpScale,
    roughness: spec.roughness,
    metalness: spec.metalness,
    sheen: spec.sheen,
    sheenRoughness: spec.sheenRoughness,
    sheenColor: new THREE.Color(shadeHex(color, 0.35)),
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.clearcoatRoughness,
    ...extra,
  });
}

function makeHardwareMetalMat(
  color: string,
  roughness = 0.22,
  metalness = 0.88,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.3,
    clearcoatRoughness: 0.16,
  });
}

// =========================================================================
// 3. Procedural 2D Pattern & Garment Surface Synthesizer
// =========================================================================

function canvasToSrgbTexture(canvas: HTMLCanvasElement, anisotropy = 4): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

function paintFabricPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  accent: string,
  pattern: ClothingPatternId,
  fabric: ResolvedFabric,
) {
  const darkBase = shadeHex(base, -0.2);
  const lightBase = shadeHex(base, 0.15);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  switch (pattern) {
    case 'stripes': {
      const band = Math.max(12, Math.round(h / 11));
      ctx.fillStyle = accent;
      for (let y = Math.round(band * 0.5); y < h; y += band * 2) {
        ctx.fillRect(0, y, w, Math.round(band * 0.55));
      }
      break;
    }

    case 'plaid': {
      const cell = Math.max(28, Math.round(w / 6));
      ctx.fillStyle = shadeHex(darkBase, -0.15);
      ctx.globalAlpha = 0.55;
      for (let x = 0; x < w; x += cell) {
        ctx.fillRect(x, 0, Math.round(cell * 0.38), h);
      }
      for (let y = 0; y < h; y += cell) {
        ctx.fillRect(0, y, w, Math.round(cell * 0.38));
      }
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = accent;
      for (let x = Math.round(cell * 0.16); x < w; x += cell) {
        ctx.fillRect(x, 0, 4, h);
      }
      for (let y = Math.round(cell * 0.16); y < h; y += cell) {
        ctx.fillRect(0, y, w, 4);
      }
      ctx.fillStyle = lightBase;
      ctx.globalAlpha = 0.45;
      for (let x = Math.round(cell * 0.65); x < w; x += cell) {
        ctx.fillRect(x, 0, 2, h);
      }
      for (let y = Math.round(cell * 0.65); y < h; y += cell) {
        ctx.fillRect(0, y, w, 2);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'colorblock': {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, Math.round(h * 0.34));
      ctx.fillStyle = darkBase;
      ctx.fillRect(0, Math.round(h * 0.34), w, 6);
      ctx.fillStyle = shadeHex(accent, -0.25);
      ctx.fillRect(0, Math.round(h * 0.78), w, Math.round(h * 0.22));
      break;
    }

    case 'checker': {
      const tile = Math.max(18, Math.round(w / 8));
      ctx.fillStyle = accent;
      for (let y = 0; y < h; y += tile) {
        for (let x = 0; x < w; x += tile) {
          if (((Math.floor(x / tile) + Math.floor(y / tile)) & 1) === 0) {
            ctx.fillRect(x, y, tile, tile);
          }
        }
      }
      break;
    }

    case 'camo': {
      const blotches = [
        { col: darkBase, scale: 1.0 },
        { col: accent, scale: 0.78 },
        { col: shadeHex(base, 0.22), scale: 0.55 },
      ];
      blotches.forEach((b, bi) => {
        ctx.fillStyle = b.col;
        for (let i = 0; i < 14; i++) {
          const seed = bi * 31 + i * 17.3;
          const cx = (((Math.sin(seed * 1.9) * 43758.5) % 1) + 1) % 1 * w;
          const cy = (((Math.cos(seed * 2.7) * 23421.3) % 1) + 1) % 1 * h;
          const rx = (20 + (i % 4) * 10) * b.scale;
          const ry = (12 + ((i + 1) % 3) * 9) * b.scale;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, (i * 0.6) % Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      break;
    }

    case 'argyle': {
      const dw = Math.max(32, Math.round(w / 5));
      const dh = Math.round(dw * 1.35);
      for (let row = -1; row <= Math.ceil(h / dh) + 1; row++) {
        for (let col = -1; col <= Math.ceil(w / dw) + 1; col++) {
          const cx = col * dw + (row % 2 === 0 ? 0 : dw * 0.5);
          const cy = row * dh;
          ctx.fillStyle = (row + col) % 2 === 0 ? darkBase : accent;
          ctx.globalAlpha = (row + col) % 2 === 0 ? 0.5 : 0.72;
          ctx.beginPath();
          ctx.moveTo(cx, cy - dh * 0.5);
          ctx.lineTo(cx + dw * 0.5, cy);
          ctx.lineTo(cx, cy + dh * 0.5);
          ctx.lineTo(cx - dw * 0.5, cy);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = lightBase;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      for (let i = -w; i < w * 2; i += dw) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h * (dw / dh), h);
        ctx.moveTo(i + h * (dw / dh), 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      break;
    }

    case 'solid':
    default:
      break;
  }

  // Subtle fabric micro-grain overlay matching fabric class
  if (fabric === 'knit') {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = 0; x < w; x += 10) {
      ctx.fillRect(x, 0, 3, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let x = 5; x < w; x += 10) {
      ctx.fillRect(x, 0, 2, h);
    }
  } else if (fabric === 'denim') {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1.5;
    for (let i = -h; i < w + h; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }
  } else if (fabric === 'quilted') {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    for (let y = 32; y < h; y += 44) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let x = 0; x < w; x += 8) ctx.fillRect(x, 0, 1, h);
  }
}

function createPatternedShellTexture(
  base: string,
  accent: string,
  pattern: ClothingPatternId,
  fabric: ResolvedFabric,
  anisotropy = 4,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  paintFabricPattern(ctx, size, size, base, accent, pattern, fabric);
  const tex = canvasToSrgbTexture(canvas, anisotropy);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function drawTorsoFaceCanvas(
  face: 'front' | 'back' | 'side' | 'top' | 'bottom',
  rawClothing: ClothingConfig,
  torsoSkinHex: string,
): HTMLCanvasElement {
  const clothing = normalizeClothingConfig(rawClothing);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const base = clothing.shirtColor;
  const accent = clothing.shirtAccent;
  const darkBase = shadeHex(base, -0.24);
  const lightBase = shadeHex(base, 0.16);
  const fabric = resolveTopFabric(clothing);
  const pattern = clothing.topPattern ?? 'solid';

  if (clothing.shirtId === 'none') {
    ctx.fillStyle = torsoSkinHex;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  // Base cloth + pattern fill
  paintFabricPattern(ctx, size, size, base, accent, pattern, fabric);

  // Soft ambient occlusion edge shading
  const edgeGrad = ctx.createLinearGradient(0, 0, size, 0);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0.16)');
  edgeGrad.addColorStop(0.11, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(0.89, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, size, size);

  if (face === 'top') {
    ctx.fillStyle = clothing.shirtId === 'turtleneck' ? base : torsoSkinHex;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = clothing.shirtId === 'tshirt' || clothing.shirtId === 'polo' ? accent : darkBase;
    ctx.lineWidth = 10;
    ctx.stroke();
    return canvas;
  }

  if (face === 'bottom') {
    ctx.fillStyle = clothing.shirtId === 'cropTop' ? torsoSkinHex : darkBase;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  if (face === 'side') {
    if (clothing.shirtId === 'cropTop') {
      ctx.fillStyle = torsoSkinHex;
      ctx.fillRect(0, Math.round(size * 0.7), size, Math.round(size * 0.3));
      ctx.fillStyle = darkBase;
      ctx.fillRect(0, Math.round(size * 0.65), size, 14);
    } else {
      ctx.fillStyle = darkBase;
      ctx.fillRect(size * 0.47, 0, 6, size);
      ctx.fillRect(0, size - 22, size, 22);
    }
    if (clothing.shirtId === 'tracksuit' || clothing.shirtId === 'cyberSuit') {
      ctx.fillStyle = accent;
      ctx.fillRect(size * 0.43, 0, 16, size);
    }
    return canvas;
  }

  // Front or Back neckline cutout (skip for turtleneck)
  if (clothing.shirtId !== 'turtleneck') {
    ctx.fillStyle = torsoSkinHex;
    ctx.beginPath();
    const drop = clothing.shirtId === 'cropTop' ? 38 : face === 'front' ? 28 : 14;
    ctx.ellipse(size / 2, 0, 48, drop, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = darkBase;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  // Bottom hem ribbing (or midriff exposure for cropTop)
  if (clothing.shirtId === 'cropTop') {
    const cutY = Math.round(size * 0.7);
    ctx.fillStyle = torsoSkinHex;
    ctx.fillRect(0, cutY, size, size - cutY);
    ctx.fillStyle = accent;
    ctx.fillRect(0, cutY - 12, size, 12);
    ctx.fillStyle = darkBase;
    ctx.fillRect(0, cutY - 15, size, 3);
  } else {
    ctx.fillStyle = darkBase;
    ctx.fillRect(0, size - 22, size, 22);
  }

  switch (clothing.shirtId) {
    case 'tshirt': {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(size / 2, 0, 50, face === 'front' ? 30 : 16, 0, 0, Math.PI);
      ctx.stroke();
      if (face === 'front' && pattern === 'solid') {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 86, size, 24);
        ctx.fillStyle = lightBase;
        ctx.fillRect(0, 82, size, 4);
        ctx.beginPath();
        ctx.arc(size / 2, 98, 22, 0, Math.PI * 2);
        ctx.fillStyle = base;
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      break;
    }

    case 'hoodie': {
      ctx.fillStyle = accent;
      ctx.fillRect(0, size - 24, size, 24);
      if (face === 'front') {
        ctx.fillStyle = darkBase;
        ctx.beginPath();
        ctx.moveTo(56, 158);
        ctx.lineTo(200, 158);
        ctx.lineTo(214, 224);
        ctx.lineTo(42, 224);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = lightBase;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (pattern === 'solid') {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(128, 72);
        ctx.lineTo(164, 114);
        ctx.lineTo(128, 156);
        ctx.lineTo(92, 114);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'sweater': {
      // Chunky ribbed bottom cuff + subtle knit chest band
      ctx.fillStyle = darkBase;
      ctx.fillRect(0, size - 28, size, 28);
      for (let x = 4; x < size; x += 12) {
        ctx.fillStyle = lightBase;
        ctx.fillRect(x, size - 26, 4, 24);
      }
      if (pattern === 'solid') {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 62, size, 16);
        ctx.fillStyle = lightBase;
        ctx.fillRect(0, 82, size, 6);
      }
      break;
    }

    case 'turtleneck': {
      // Ribbed vertical knit shading + hem
      for (let x = 0; x < size; x += 16) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(x, 0, 4, size);
      }
      ctx.fillStyle = darkBase;
      ctx.fillRect(0, size - 20, size, 20);
      break;
    }

    case 'buttonUp': {
      if (face === 'front') {
        // Center placket + contrast buttons + chest pocket
        ctx.fillStyle = lightBase;
        ctx.fillRect(114, 18, 28, size - 36);
        ctx.strokeStyle = darkBase;
        ctx.lineWidth = 2;
        ctx.strokeRect(114, 18, 28, size - 36);
        for (let py = 46; py < 224; py += 38) {
          ctx.beginPath();
          ctx.arc(128, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = accent;
          ctx.fill();
        }
        // Left chest pocket
        ctx.fillStyle = darkBase;
        ctx.fillRect(160, 72, 54, 56);
        ctx.fillStyle = base;
        ctx.fillRect(163, 75, 48, 50);
        ctx.fillStyle = accent;
        ctx.fillRect(163, 75, 48, 8);
      } else {
        // Shoulder yoke seam + back box pleat
        ctx.fillStyle = darkBase;
        ctx.fillRect(0, 44, size, 4);
        ctx.fillRect(126, 44, 4, size - 66);
      }
      break;
    }

    case 'polo': {
      if (face === 'front') {
        ctx.fillStyle = accent;
        ctx.fillRect(116, 18, 24, 72);
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc(128, 42, 4, 0, Math.PI * 2);
        ctx.arc(128, 68, 4, 0, Math.PI * 2);
        ctx.fill();
        // Chest crest
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(182, 84, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'cropTop': {
      if (face === 'front' && pattern === 'solid') {
        ctx.fillStyle = accent;
        ctx.fillRect(58, 76, 140, 14);
      }
      break;
    }

    case 'jacket': {
      if (face === 'front') {
        ctx.fillStyle = accent;
        ctx.fillRect(88, 18, 80, size - 40);
        ctx.fillStyle = darkBase;
        ctx.fillRect(80, 0, 12, size - 20);
        ctx.fillRect(164, 0, 12, size - 20);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(84, 24, 5, size - 48);
        ctx.fillRect(167, 24, 5, size - 48);
        ctx.fillRect(24, 72, 42, 8);
        ctx.fillRect(190, 168, 42, 8);
      } else {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 68);
        ctx.lineTo(128, 86);
        ctx.lineTo(256, 68);
        ctx.stroke();
      }
      break;
    }

    case 'varsity': {
      ctx.fillStyle = accent;
      ctx.fillRect(0, size - 22, size, 22);
      ctx.fillStyle = base;
      ctx.fillRect(0, size - 14, size, 6);
      if (face === 'front') {
        ctx.fillStyle = accent;
        ctx.fillRect(123, 24, 10, size - 46);
        for (let py = 44; py < 210; py += 34) {
          ctx.beginPath();
          ctx.arc(128, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
        }
        ctx.fillStyle = accent;
        ctx.fillRect(156, 64, 54, 58);
        ctx.fillStyle = base;
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('R', 183, 95);
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(48, 72, 160, 18);
      }
      break;
    }

    case 'vest': {
      if (face === 'front') {
        ctx.fillStyle = accent;
        ctx.fillRect(72, 0, 112, size);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 82, size);
        ctx.fillRect(174, 0, 82, size);
        ctx.fillStyle = darkBase;
        ctx.fillRect(14, 136, 54, 62);
        ctx.fillRect(188, 136, 54, 62);
        ctx.fillStyle = '#f5cd30';
        ctx.fillRect(34, 132, 14, 10);
        ctx.fillRect(208, 132, 14, 10);
      } else {
        ctx.fillStyle = darkBase;
        ctx.fillRect(0, 74, size, 12);
      }
      break;
    }

    case 'knightTunic': {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, size, 48);
      ctx.fillStyle = accent;
      ctx.fillRect(114, 24, 28, size - 24);
      ctx.fillRect(0, 108, size, 22);
      ctx.fillStyle = '#4b2e1e';
      ctx.fillRect(0, size - 36, size, 24);
      ctx.fillStyle = accent;
      ctx.fillRect(108, size - 40, 40, 32);
      if (face === 'front') {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(96, 58);
        ctx.lineTo(160, 58);
        ctx.lineTo(160, 100);
        ctx.lineTo(128, 124);
        ctx.lineTo(96, 100);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'tracksuit': {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 74, size, 20);
      ctx.fillRect(0, 102, size, 8);
      if (face === 'front') {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(125, 22, 6, size - 44);
      }
      break;
    }

    case 'suitCoat': {
      if (face === 'front') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(76, 0);
        ctx.lineTo(180, 0);
        ctx.lineTo(128, 122);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(118, 18);
        ctx.lineTo(138, 18);
        ctx.lineTo(142, 112);
        ctx.lineTo(128, 134);
        ctx.lineTo(114, 112);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(128, 152, 7, 0, Math.PI * 2);
        ctx.arc(128, 192, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(172, 68, 34, 10);
      } else {
        ctx.fillStyle = darkBase;
        ctx.fillRect(126, 40, 4, size - 60);
      }
      break;
    }

    case 'wizardRobe': {
      ctx.fillStyle = accent;
      ctx.fillRect(108, 16, 40, size - 16);
      ctx.fillStyle = base;
      ctx.fillRect(116, 16, 24, size - 16);
      ctx.fillStyle = accent;
      ctx.fillRect(0, size - 44, size, 22);
      if (face === 'front') {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(128, 92, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'cyberSuit': {
      ctx.fillStyle = darkBase;
      ctx.fillRect(28, 44, 200, 96);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(32, 48, 192, 88);
      if (face === 'front') {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(128, 92, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(128, 92, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = accent;
      ctx.fillRect(122, 144, 12, size - 164);
      break;
    }
  }

  return canvas;
}

function drawArmCanvas(
  rawClothing: ClothingConfig,
  armSkinHex: string,
): HTMLCanvasElement {
  const clothing = normalizeClothingConfig(rawClothing);
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const sleeves = resolveEffectiveSleeves(clothing.shirtId, clothing.sleeveMode);
  const fabric = resolveTopFabric(clothing);
  const pattern = clothing.topPattern ?? 'solid';

  const sleeveColor =
    clothing.shirtId === 'varsity' || clothing.shirtId === 'vest'
      ? clothing.shirtAccent
      : clothing.shirtColor;
  const cuffColor =
    clothing.shirtId === 'varsity' ? clothing.shirtColor : clothing.shirtAccent;
  const darkSleeve = shadeHex(sleeveColor, -0.2);

  // Bare skin first
  ctx.fillStyle = armSkinHex;
  ctx.fillRect(0, 0, w, h);

  if (clothing.shirtId === 'none' || sleeves === 'sleeveless') {
    return canvas;
  }

  const coverageRatio = sleeves === 'short' ? 0.44 : 0.82;
  const sleeveH = Math.round(h * coverageRatio);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, sleeveH);
  ctx.clip();
  paintFabricPattern(ctx, w, h, sleeveColor, cuffColor, pattern, fabric);
  ctx.restore();

  if (clothing.shirtId === 'tracksuit' || clothing.shirtId === 'cyberSuit') {
    ctx.fillStyle = cuffColor;
    ctx.fillRect(w * 0.42, 0, 18, sleeveH);
  }

  // Cuff trim band
  ctx.fillStyle = darkSleeve;
  ctx.fillRect(0, sleeveH - 18, w, 18);
  ctx.fillStyle = cuffColor;
  ctx.fillRect(0, sleeveH - 12, w, 6);

  // Glove cuff for knight / cyber
  if (clothing.shirtId === 'knightTunic' || clothing.shirtId === 'cyberSuit') {
    ctx.fillStyle = shadeHex(cuffColor, -0.15);
    ctx.fillRect(0, h - 46, w, 46);
  }

  return canvas;
}

function drawLegCanvas(
  face: 'front' | 'back' | 'side',
  rawClothing: ClothingConfig,
  legSkinHex: string,
): HTMLCanvasElement {
  const clothing = normalizeClothingConfig(rawClothing);
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Start with bare leg skin
  ctx.fillStyle = legSkinHex;
  ctx.fillRect(0, 0, w, h);

  const pants: PantsStyleId = clothing.pantsId;
  const pCol = clothing.pantsColor;
  const pAcc = clothing.pantsAccent;
  const pDark = shadeHex(pCol, -0.24);
  const fabric = resolveBottomFabric(clothing);
  const pattern = clothing.bottomPattern ?? 'solid';

  const isSkirt = pants === 'pleatedSkirt' || pants === 'midiSkirt';

  if (pants !== 'none') {
    if (isSkirt) {
      // Subtle safety shorts under skirt + stylish knee-high socks for pleatedSkirt
      ctx.fillStyle = pDark;
      ctx.fillRect(0, 0, w, Math.round(h * 0.28));
      if (pants === 'pleatedSkirt' && clothing.footwearId !== 'none' && clothing.footwearId !== 'sandals') {
        const sockTop = Math.round(h * 0.56);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, sockTop, w, h - sockTop);
        ctx.fillStyle = pAcc;
        ctx.fillRect(0, sockTop + 8, w, 7);
        ctx.fillRect(0, sockTop + 20, w, 4);
      }
    } else {
      const pantLen =
        pants === 'shorts'
          ? Math.round(h * 0.48)
          : pants === 'joggers'
            ? Math.round(h * 0.88)
            : h;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, pantLen);
      ctx.clip();
      paintFabricPattern(ctx, w, h, pCol, pAcc, pattern, fabric);
      ctx.restore();

      // Waistband
      ctx.fillStyle = pDark;
      ctx.fillRect(0, 0, w, 20);

      if (pants === 'jeans' || pants === 'flaredJeans') {
        ctx.strokeStyle = pAcc;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(8, 22, w - 16, pantLen - 34);
        ctx.setLineDash([]);
        if (face === 'front') {
          ctx.fillStyle = pDark;
          ctx.fillRect(10, 26, 36, 32);
          ctx.fillRect(82, 26, 36, 32);
          // Subtle denim thigh highlight fade
          const fade = ctx.createRadialGradient(w * 0.5, h * 0.46, 6, w * 0.5, h * 0.46, 48);
          fade.addColorStop(0, 'rgba(255,255,255,0.12)');
          fade.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = fade;
          ctx.fillRect(0, 60, w, 120);
        } else if (face === 'back') {
          ctx.fillStyle = pDark;
          ctx.fillRect(24, 30, 80, 48);
          ctx.strokeStyle = pAcc;
          ctx.strokeRect(26, 32, 76, 44);
        }
      } else if (pants === 'cargo' || pants === 'baggyCargo') {
        if (face === 'side') {
          ctx.fillStyle = pAcc;
          ctx.fillRect(20, 88, 88, 66);
          ctx.fillStyle = pDark;
          ctx.fillRect(20, 88, 88, 18);
        }
      } else if (pants === 'trackPants' || pants === 'cyberLeggings') {
        if (face === 'side') {
          ctx.fillStyle = pAcc;
          ctx.fillRect(w * 0.36, 0, 14, pantLen);
          ctx.fillRect(w * 0.56, 0, 8, pantLen);
        }
      } else if (pants === 'knightGreaves') {
        ctx.fillStyle = pAcc;
        ctx.fillRect(12, 86, w - 24, 48);
        ctx.fillStyle = pDark;
        ctx.fillRect(0, 126, w, 10);
      } else if (pants === 'shorts') {
        ctx.fillStyle = pAcc;
        ctx.fillRect(0, pantLen - 14, w, 14);
      } else if (pants === 'joggers') {
        ctx.fillStyle = pDark;
        ctx.fillRect(0, pantLen - 18, w, 18);
        ctx.fillStyle = pAcc;
        ctx.fillRect(0, pantLen - 11, w, 4);
      }
    }
  }

  // Paint shoe upper backing on lower leg so seams between 3D shoe & leg never flash bare skin
  if (clothing.footwearId !== 'none' && clothing.footwearId !== 'sandals') {
    const fw: FootwearId = clothing.footwearId;
    const bootTop =
      fw === 'boots' || fw === 'armoredBoots' || fw === 'chelseaBoots'
        ? Math.round(h * 0.68)
        : fw === 'highTops'
          ? Math.round(h * 0.72)
          : Math.round(h * 0.8);
    const shoeColor = clothing.shoeColor ?? '#1e293b';
    const shoeAccent = clothing.shoeAccent ?? '#f8fafc';
    const soleColor =
      fw === 'sneakers' || fw === 'highTops'
        ? shoeAccent
        : fw === 'armoredBoots'
          ? '#475569'
          : '#18181b';

    ctx.fillStyle = shoeColor;
    ctx.fillRect(0, bootTop, w, h - bootTop);
    ctx.fillStyle = shoeAccent;
    ctx.fillRect(0, bootTop, w, 7);
    ctx.fillStyle = soleColor;
    ctx.fillRect(0, h - 22, w, 22);
  }

  return canvas;
}

export function createTorsoClothingMaterials(
  rawClothing: ClothingConfig,
  bodyColors: R6BodyColors,
  anisotropy: number,
): THREE.MeshPhysicalMaterial[] {
  const clothing = normalizeClothingConfig(rawClothing);
  const fabric = resolveTopFabric(clothing);

  const frontTex = canvasToSrgbTexture(drawTorsoFaceCanvas('front', clothing, bodyColors.torso), anisotropy);
  const backTex = canvasToSrgbTexture(drawTorsoFaceCanvas('back', clothing, bodyColors.torso), anisotropy);
  const sideTex = canvasToSrgbTexture(drawTorsoFaceCanvas('side', clothing, bodyColors.torso), anisotropy);
  const topTex = canvasToSrgbTexture(drawTorsoFaceCanvas('top', clothing, bodyColors.torso), anisotropy);
  const botTex = canvasToSrgbTexture(drawTorsoFaceCanvas('bottom', clothing, bodyColors.torso), anisotropy);

  const make = (map: THREE.CanvasTexture) =>
    makeFabricMaterial(clothing.shirtColor, fabric, map);

  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  return [
    make(sideTex),
    make(sideTex.clone()),
    make(topTex),
    make(botTex),
    make(frontTex),
    make(backTex),
  ];
}

export function createArmClothingMaterial(
  rawClothing: ClothingConfig,
  armSkinHex: string,
  anisotropy: number,
): THREE.MeshPhysicalMaterial {
  const clothing = normalizeClothingConfig(rawClothing);
  const tex = canvasToSrgbTexture(drawArmCanvas(clothing, armSkinHex), anisotropy);
  const sleeves = resolveEffectiveSleeves(clothing.shirtId, clothing.sleeveMode);
  const isBare = clothing.shirtId === 'none' || sleeves === 'sleeveless';
  if (isBare) {
    return new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: tex,
      roughness: 0.36,
      metalness: 0.04,
    });
  }
  const fabric = resolveTopFabric(clothing);
  return makeFabricMaterial(clothing.shirtColor, fabric, tex);
}

export function createLegClothingMaterials(
  rawClothing: ClothingConfig,
  legSkinHex: string,
  anisotropy: number,
): THREE.MeshPhysicalMaterial[] {
  const clothing = normalizeClothingConfig(rawClothing);
  const frontTex = canvasToSrgbTexture(drawLegCanvas('front', clothing, legSkinHex), anisotropy);
  const backTex = canvasToSrgbTexture(drawLegCanvas('back', clothing, legSkinHex), anisotropy);
  const sideTex = canvasToSrgbTexture(drawLegCanvas('side', clothing, legSkinHex), anisotropy);

  const isBare =
    (clothing.pantsId === 'none' ||
      clothing.pantsId === 'pleatedSkirt' ||
      clothing.pantsId === 'midiSkirt') &&
    clothing.footwearId === 'none';

  const fabric = resolveBottomFabric(clothing);
  const make = (map: THREE.CanvasTexture) =>
    isBare
      ? new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          map,
          roughness: 0.38,
          metalness: 0.04,
        })
      : makeFabricMaterial(clothing.pantsColor, fabric, map);

  const topBot = make(sideTex.clone());
  return [
    make(sideTex),
    make(sideTex.clone()),
    topBot,
    topBot.clone(),
    make(frontTex),
    make(backTex),
  ];
}

// =========================================================================
// 4. Sculpted Procedural Geometry Primitives for Layered Roblox Clothing
// =========================================================================

function createRoundedBoxGeo(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevelSegments = 2,
): THREE.BufferGeometry {
  const r = Math.min(radius, width * 0.42, height * 0.42, depth * 0.42);
  const innerW = Math.max(0.002, width - r * 2);
  const innerH = Math.max(0.002, height - r * 2);
  const innerD = Math.max(0.002, depth - r * 2);

  const hw = innerW * 0.5;
  const hh = innerH * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments,
    curveSegments: 4,
    steps: 1,
  });
  geo.center();
  return geo;
}

function createRoundedWrapBandGeo(
  outerW: number,
  outerD: number,
  height: number,
  bevel = 0.035 * S,
): THREE.BufferGeometry {
  const r = Math.min(bevel, outerW * 0.25, outerD * 0.25);
  const hw = outerW * 0.5;
  const hd = outerD * 0.5;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, height - r * 0.6),
    bevelEnabled: true,
    bevelThickness: r * 0.45,
    bevelSize: r * 0.35,
    bevelSegments: 2,
    steps: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.center();
  return geo;
}

function createTrapezoidPanelGeo(
  topW: number,
  botW: number,
  height: number,
  thickness: number,
  bevel = 0.02 * S,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-topW * 0.5, 0);
  shape.lineTo(topW * 0.5, 0);
  shape.lineTo(botW * 0.5, -height);
  shape.lineTo(-botW * 0.5, -height);
  shape.closePath();

  const b = Math.min(bevel, thickness * 0.45, topW * 0.2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.005, thickness - b * 2),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    steps: 1,
  });
  // Keep top edge at y = 0 for clean waist/hem hinging; center X & Z
  geo.translate(0, 0, -(Math.max(0.005, thickness - b * 2)) * 0.5);
  return geo;
}

function addShadowMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos?: [number, number, number],
  rot?: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// =========================================================================
// 5. Layer Builders: Base Top, Outerwear Shell, Bottoms/Skirts/Belt, Footwear
// =========================================================================

interface SwayHandles {
  backCoatTail: THREE.Group | null;
  frontLeftTail: THREE.Group | null;
  frontRightTail: THREE.Group | null;
  skirtFront: THREE.Group | null;
  skirtBack: THREE.Group | null;
  skirtLeft: THREE.Group | null;
  skirtRight: THREE.Group | null;
  hoodDrape: THREE.Group | null;
  drawstringLeft: THREE.Group | null;
  drawstringRight: THREE.Group | null;
}

function buildBaseTop3DDetails(
  clothing: ClothingConfig,
  torsoGroup: THREE.Group,
  leftArmGroup: THREE.Group,
  rightArmGroup: THREE.Group,
  sway: SwayHandles,
) {
  if (clothing.shirtId === 'none') return;

  const fabric = resolveTopFabric(clothing);
  const mainMat = makeFabricMaterial(clothing.shirtColor, fabric);
  const darkMat = makeFabricMaterial(shadeHex(clothing.shirtColor, -0.2), fabric);
  const accentMat = makeFabricMaterial(clothing.shirtAccent, fabric === 'armor' ? 'armor' : 'cotton');
  const metalMat = makeHardwareMetalMat(clothing.shirtAccent, 0.22, 0.85);
  const silverMat = makeHardwareMetalMat('#cbd5e1', 0.2, 0.88);
  const hasOuterwear = (clothing.outerwearId ?? 'none') !== 'none';
  const outerMeta = OUTERWEAR_CATALOG.find((o) => o.id === (clothing.outerwearId ?? 'none'));
  const outerCoversSleeves = Boolean(hasOuterwear && outerMeta?.hasSleeves);

  switch (clothing.shirtId) {
    case 'tshirt': {
      // Ribbed crew neck collar ring
      const collar = addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.49 * S, 0.055 * S, 8, 22),
        accentMat,
        [0, 1.0 * S, 0],
        [Math.PI / 2, 0, 0],
      );
      collar.scale.set(1.06, 0.94, 1);
      break;
    }

    case 'hoodie': {
      // Plush collar ring + sculpted draped hood + swaying drawstrings + 3D kangaroo pocket + ribbed hem
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.55 * S, 0.115 * S, 10, 22),
        mainMat,
        [0, 1.0 * S, 0],
        [Math.PI / 2, 0, 0],
      );

      const hoodPivot = new THREE.Group();
      hoodPivot.position.set(0, 1.0 * S, -0.34 * S);
      torsoGroup.add(hoodPivot);
      addShadowMesh(
        hoodPivot,
        createRoundedBoxGeo(1.22 * S, 0.42 * S, 0.56 * S, 0.14 * S),
        mainMat,
        [0, -0.1 * S, -0.18 * S],
        [0.24, 0, 0],
      );
      addShadowMesh(
        hoodPivot,
        createRoundedBoxGeo(1.04 * S, 0.18 * S, 0.24 * S, 0.06 * S),
        accentMat,
        [0, 0.08 * S, -0.36 * S],
        [0.32, 0, 0],
      );
      sway.hoodDrape = hoodPivot;

      // Hanging drawstrings with metallic aglets
      for (const side of [-1, 1]) {
        const strPivot = new THREE.Group();
        strPivot.position.set(side * 0.2 * S, 0.92 * S, 0.54 * S);
        torsoGroup.add(strPivot);
        addShadowMesh(
          strPivot,
          new THREE.CylinderGeometry(0.024 * S, 0.024 * S, 0.48 * S, 8),
          makeFabricMaterial('#f8fafc', 'cotton'),
          [0, -0.24 * S, 0],
        );
        addShadowMesh(
          strPivot,
          new THREE.CylinderGeometry(0.032 * S, 0.03 * S, 0.09 * S, 8),
          metalMat,
          [0, -0.5 * S, 0],
        );
        if (side < 0) sway.drawstringRight = strPivot;
        else sway.drawstringLeft = strPivot;
      }

      if (!hasOuterwear) {
        // 3D beveled kangaroo pouch + ribbed waist hem
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(1.26 * S, 0.5 * S, 0.1 * S, 0.04 * S),
          darkMat,
          [0, -0.48 * S, 0.51 * S],
        );
        addShadowMesh(
          torsoGroup,
          createRoundedWrapBandGeo(2.07 * S, 1.07 * S, 0.2 * S, 0.04 * S),
          accentMat,
          [0, -0.9 * S, 0],
        );
      }
      break;
    }

    case 'sweater': {
      // Chunky ribbed knit collar + cozy bottom rib cuff
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.52 * S, 0.095 * S, 10, 22),
        darkMat,
        [0, 1.01 * S, 0],
        [Math.PI / 2, 0, 0],
      );
      if (!hasOuterwear) {
        addShadowMesh(
          torsoGroup,
          createRoundedWrapBandGeo(2.08 * S, 1.08 * S, 0.22 * S, 0.05 * S),
          darkMat,
          [0, -0.89 * S, 0],
        );
      }
      break;
    }

    case 'turtleneck': {
      // Sculpted folded rib turtleneck cylinder around neck
      addShadowMesh(
        torsoGroup,
        new THREE.CylinderGeometry(0.49 * S, 0.54 * S, 0.28 * S, 20),
        mainMat,
        [0, 1.09 * S, 0],
      );
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.49 * S, 0.065 * S, 8, 22),
        darkMat,
        [0, 1.2 * S, 0],
        [Math.PI / 2, 0, 0],
      );
      break;
    }

    case 'buttonUp':
    case 'polo': {
      // Crisp folded shirt collar (stand + angled wing points)
      addShadowMesh(
        torsoGroup,
        new THREE.CylinderGeometry(0.51 * S, 0.55 * S, 0.14 * S, 18, 1, false),
        mainMat,
        [0, 1.03 * S, -0.02 * S],
      );
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.36 * S, 0.16 * S, 0.18 * S, 0.03 * S),
          clothing.shirtId === 'polo' ? accentMat : mainMat,
          [side * 0.24 * S, 0.99 * S, 0.44 * S],
          [0.22, side * -0.25, side * -0.22],
        );
      }
      // Subtle sculpted buttons down front
      const btnCount = clothing.shirtId === 'polo' ? 2 : 4;
      for (let i = 0; i < btnCount; i++) {
        addShadowMesh(
          torsoGroup,
          new THREE.CylinderGeometry(0.036 * S, 0.036 * S, 0.03 * S, 10),
          accentMat,
          [0, (0.64 - i * 0.34) * S, 0.515 * S],
          [Math.PI / 2, 0, 0],
        );
      }
      break;
    }

    case 'cropTop': {
      // Clean scoop neck rim + raised cropped hem band at midriff
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.5 * S, 0.045 * S, 8, 20),
        accentMat,
        [0, 0.99 * S, 0.03 * S],
        [Math.PI / 2, 0, 0],
      );
      addShadowMesh(
        torsoGroup,
        createRoundedWrapBandGeo(2.06 * S, 1.06 * S, 0.12 * S, 0.03 * S),
        accentMat,
        [0, -0.38 * S, 0],
      );
      break;
    }

    case 'jacket':
    case 'suitCoat':
    case 'varsity': {
      // Sculpted beveled open lapels + structured collar + pocket flaps + ribbed hem
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.34 * S, 0.96 * S, 0.11 * S, 0.035 * S),
          clothing.shirtId === 'varsity' ? accentMat : mainMat,
          [side * 0.48 * S, 0.44 * S, 0.52 * S],
          [0, side * 0.08, side * -0.16],
        );
        if (clothing.shirtId === 'jacket') {
          // Metallic moto zip edge
          addShadowMesh(
            torsoGroup,
            createRoundedBoxGeo(0.05 * S, 1.72 * S, 0.06 * S, 0.015 * S),
            silverMat,
            [side * 0.33 * S, -0.04 * S, 0.52 * S],
          );
        }
      }
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.32 * S, 0.22 * S, 0.3 * S, 0.06 * S),
        mainMat,
        [0, 1.04 * S, -0.34 * S],
      );
      if (!hasOuterwear) {
        addShadowMesh(
          torsoGroup,
          createRoundedWrapBandGeo(2.08 * S, 1.08 * S, 0.18 * S, 0.04 * S),
          clothing.shirtId === 'varsity' ? accentMat : darkMat,
          [0, -0.91 * S, 0],
        );
      }
      break;
    }

    case 'vest': {
      // Utility vest sculpted chest pouches + shoulder straps
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.5 * S, 0.52 * S, 0.12 * S, 0.035 * S),
          darkMat,
          [side * 0.62 * S, -0.34 * S, 0.52 * S],
        );
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.16 * S, 0.1 * S, 0.08 * S, 0.02 * S),
          makeHardwareMetalMat('#f5cd30', 0.22, 0.85),
          [side * 0.62 * S, -0.14 * S, 0.57 * S],
        );
      }
      break;
    }

    case 'knightTunic': {
      // Sculpted steel gorget collar + beveled breastplate trim + swaying tabard tail
      addShadowMesh(
        torsoGroup,
        new THREE.CylinderGeometry(0.62 * S, 0.72 * S, 0.18 * S, 20),
        metalMat,
        [0, 1.02 * S, 0],
      );
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.94 * S, 0.58 * S, 0.14 * S, 0.05 * S),
        makeHardwareMetalMat('#94a3b8', 0.24, 0.84),
        [0, 0.56 * S, 0.51 * S],
      );
      // Tabard hanging front/back flaps
      const backTail = new THREE.Group();
      backTail.position.set(0, -0.94 * S, -0.53 * S);
      torsoGroup.add(backTail);
      addShadowMesh(
        backTail,
        createTrapezoidPanelGeo(0.95 * S, 1.08 * S, 0.92 * S, 0.08 * S),
        mainMat,
        [0, 0, 0],
        [0.06, 0, 0],
      );
      sway.backCoatTail = backTail;
      break;
    }

    case 'tracksuit': {
      // High zip funnel collar
      addShadowMesh(
        torsoGroup,
        new THREE.CylinderGeometry(0.56 * S, 0.59 * S, 0.22 * S, 18),
        mainMat,
        [0, 1.04 * S, 0],
      );
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(0.06 * S, 1.85 * S, 0.06 * S, 0.02 * S),
        silverMat,
        [0, 0.02 * S, 0.51 * S],
      );
      break;
    }

    case 'wizardRobe': {
      // High mystic flared mantle collar + swaying arcane robe tails
      addShadowMesh(
        torsoGroup,
        new THREE.CylinderGeometry(0.8 * S, 0.6 * S, 0.32 * S, 18, 1, true, Math.PI * 0.42, Math.PI * 1.16),
        makeFabricMaterial(clothing.shirtAccent, 'satin', null, { side: THREE.DoubleSide }),
        [0, 1.08 * S, -0.05 * S],
      );
      const backTail = new THREE.Group();
      backTail.position.set(0, -0.94 * S, -0.52 * S);
      torsoGroup.add(backTail);
      addShadowMesh(
        backTail,
        createTrapezoidPanelGeo(1.96 * S, 2.28 * S, 1.38 * S, 0.1 * S),
        mainMat,
        [0, 0, 0],
        [0.08, 0, 0],
      );
      addShadowMesh(
        backTail,
        createRoundedBoxGeo(2.26 * S, 0.12 * S, 0.12 * S, 0.03 * S),
        accentMat,
        [0, -1.32 * S, -0.04 * S],
      );
      sway.backCoatTail = backTail;
      break;
    }

    case 'cyberSuit': {
      // Beveled armored chestplate + glowing arc core + shoulder collar ring
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.74 * S, 0.92 * S, 0.15 * S, 0.05 * S),
        makeHardwareMetalMat(clothing.shirtColor, 0.26, 0.72),
        [0, 0.44 * S, 0.52 * S],
      );
      const glowMat = new THREE.MeshStandardMaterial({
        color: clothing.shirtAccent,
        emissive: clothing.shirtAccent,
        emissiveIntensity: 0.95,
        roughness: 0.15,
      });
      addShadowMesh(
        torsoGroup,
        new THREE.CylinderGeometry(0.19 * S, 0.19 * S, 0.16 * S, 14),
        glowMat,
        [0, 0.44 * S, 0.55 * S],
        [Math.PI / 2, 0, 0],
      );
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.56 * S, 0.07 * S, 8, 20),
        makeHardwareMetalMat(clothing.shirtColor, 0.24, 0.78),
        [0, 1.0 * S, 0],
        [Math.PI / 2, 0, 0],
      );
      break;
    }
  }

  // Sculpted sleeve cuffs on base top (skip when long outerwear sleeves cover the arms)
  const sleeves = resolveEffectiveSleeves(clothing.shirtId, clothing.sleeveMode);
  if (sleeves !== 'sleeveless' && !outerCoversSleeves) {
    const cuffY = sleeves === 'short' ? 0.12 * S : -0.62 * S;
    const cuffMat =
      clothing.shirtId === 'sweater' || clothing.shirtId === 'turtleneck' ? darkMat : accentMat;
    for (const armGroup of [leftArmGroup, rightArmGroup]) {
      addShadowMesh(
        armGroup,
        createRoundedWrapBandGeo(1.07 * S, 1.07 * S, 0.16 * S, 0.04 * S),
        cuffMat,
        [0, cuffY, 0],
      );
    }
  }
}

function buildOuterwear3DShell(
  clothing: ClothingConfig,
  torsoGroup: THREE.Group,
  leftArmGroup: THREE.Group,
  rightArmGroup: THREE.Group,
  sway: SwayHandles,
) {
  const outerId: OuterwearStyleId = clothing.outerwearId ?? 'none';
  if (outerId === 'none') return;

  const color = clothing.outerwearColor ?? '#1e293b';
  const accent = clothing.outerwearAccent ?? '#f8fafc';
  const darkCol = shadeHex(color, -0.22);
  const fabric = resolveOuterwearFabric(clothing);
  const isOpen = clothing.outerwearOpen ?? true;

  const mainMat = makeFabricMaterial(color, fabric);
  const darkMat = makeFabricMaterial(darkCol, fabric);
  const accentMat = makeFabricMaterial(accent, fabric === 'quilted' ? 'cotton' : fabric);
  const metalMat = makeHardwareMetalMat('#e2e8f0', 0.2, 0.88);
  const brassMat = makeHardwareMetalMat('#eab308', 0.24, 0.86);

  // Reusable sculpted open-or-closed jacket torso envelope (+0.085S clearance over base torso)
  const addJacketTorsoEnvelope = (opts: {
    height: number;
    yCenter: number;
    thickness: number;
    extraW?: number;
    extraD?: number;
    frontGap?: number;
    mat?: THREE.Material;
    bevel?: number;
  }) => {
    const m = opts.mat ?? mainMat;
    const t = opts.thickness;
    const w = (2.0 + (opts.extraW ?? 0.16)) * S;
    const d = (1.0 + (opts.extraD ?? 0.16)) * S;
    const b = opts.bevel ?? 0.045 * S;

    // Back shell panel
    addShadowMesh(
      torsoGroup,
      createRoundedBoxGeo(w, opts.height, t, b),
      m,
      [0, opts.yCenter, -(d * 0.5 - t * 0.35)],
    );
    // Left & Right side wrap panels
    for (const side of [-1, 1]) {
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(t, opts.height, d, b),
        m,
        [side * (w * 0.5 - t * 0.38), opts.yCenter, 0],
      );
      // Shoulder caps connecting front & back smoothly
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(0.68 * S, t * 0.85, d, b * 0.8),
        m,
        [side * 0.68 * S, opts.yCenter + opts.height * 0.5 - t * 0.15, 0],
      );
    }

    if (isOpen) {
      const gap = opts.frontGap ?? 0.56 * S;
      const panelW = Math.max(0.45 * S, (w - gap) * 0.5);
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(panelW, opts.height, t, b),
          m,
          [side * (gap * 0.5 + panelW * 0.5), opts.yCenter, d * 0.5 - t * 0.35],
        );
      }
    } else {
      // Closed full front shell
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(w, opts.height, t, b),
        m,
        [0, opts.yCenter, d * 0.5 - t * 0.35],
      );
    }
  };

  // Reusable sculpted outerwear sleeve shell (slight outward X offset so torso/arm never fight)
  const addOuterSleeves = (opts: {
    sleeveLen: number;
    inflate: number;
    cuffMat: THREE.Material;
    baffleRings?: number;
  }) => {
    const topY = 1.0 * S;
    const centerY = topY - opts.sleeveLen * 0.5;
    const w = (1.0 + opts.inflate) * S;
    const d = (1.0 + opts.inflate) * S;

    const arms: Array<{ group: THREE.Group; side: number }> = [
      { group: leftArmGroup, side: 1 },
      { group: rightArmGroup, side: -1 },
    ];

    for (const { group, side } of arms) {
      const xBias = side * 0.03 * S;
      if (opts.baffleRings && opts.baffleRings > 1) {
        // Segmented puffy horizontal baffles for Puffer Jacket
        const segH = opts.sleeveLen / opts.baffleRings;
        for (let i = 0; i < opts.baffleRings; i++) {
          const sy = topY - (i + 0.5) * segH;
          addShadowMesh(
            group,
            createRoundedBoxGeo(w + 0.04 * S, segH * 0.96, d + 0.04 * S, 0.12 * S, 3),
            mainMat,
            [xBias, sy, 0],
          );
        }
      } else {
        addShadowMesh(
          group,
          createRoundedBoxGeo(w, opts.sleeveLen, d, 0.07 * S),
          mainMat,
          [xBias, centerY, 0],
        );
      }
      // Sculpted wrist cuff
      addShadowMesh(
        group,
        createRoundedWrapBandGeo(w + 0.03 * S, d + 0.03 * S, 0.16 * S, 0.045 * S),
        opts.cuffMat,
        [xBias, topY - opts.sleeveLen + 0.04 * S, 0],
      );
    }
  };

  switch (outerId) {
    case 'pufferVest':
    case 'pufferJacket': {
      // Multi-baffle quilted puff rings wrapping torso
      const baffles = 4;
      const totalH = 1.98 * S;
      const segH = totalH / baffles;
      for (let i = 0; i < baffles; i++) {
        const y = 0.96 * S - (i + 0.5) * segH;
        const puffScale = i === 1 || i === 2 ? 0.24 : 0.2;
        addJacketTorsoEnvelope({
          height: segH * 0.94,
          yCenter: y,
          thickness: 0.17 * S,
          extraW: puffScale,
          extraD: puffScale + 0.06,
          frontGap: 0.52 * S,
          bevel: 0.08 * S,
        });
      }
      // High insulated stand puffer collar
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.6 * S, 0.13 * S, 10, 22),
        mainMat,
        [0, 1.03 * S, -0.02 * S],
        [Math.PI / 2, 0, 0],
      );
      // Contrast zipper trim & slanted pocket welts
      if (isOpen) {
        for (const side of [-1, 1]) {
          addShadowMesh(
            torsoGroup,
            createRoundedBoxGeo(0.06 * S, 1.88 * S, 0.08 * S, 0.02 * S),
            accentMat,
            [side * 0.28 * S, -0.02 * S, 0.62 * S],
          );
        }
      } else {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.08 * S, 1.92 * S, 0.09 * S, 0.02 * S),
          metalMat,
          [0, -0.02 * S, 0.64 * S],
        );
      }
      if (outerId === 'pufferJacket') {
        addOuterSleeves({
          sleeveLen: 1.66 * S,
          inflate: 0.2,
          cuffMat: darkMat,
          baffleRings: 4,
        });
      }
      break;
    }

    case 'cardigan': {
      addJacketTorsoEnvelope({
        height: 2.04 * S,
        yCenter: -0.04 * S,
        thickness: 0.12 * S,
        extraW: 0.15,
        extraD: 0.16,
        frontGap: 0.6 * S,
        bevel: 0.05 * S,
      });
      // Cozy shawl knit trim down open placket + collar
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.14 * S, 1.98 * S, 0.14 * S, 0.04 * S),
          darkMat,
          [side * (isOpen ? 0.32 : 0.08) * S, -0.03 * S, 0.58 * S],
        );
        // Knit patch pocket
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.42 * S, 0.44 * S, 0.08 * S, 0.03 * S),
          darkMat,
          [side * 0.68 * S, -0.58 * S, 0.6 * S],
        );
      }
      // Wooden cardigan buttons
      for (let i = 0; i < 3; i++) {
        addShadowMesh(
          torsoGroup,
          new THREE.CylinderGeometry(0.055 * S, 0.055 * S, 0.05 * S, 12),
          accentMat,
          [isOpen ? -0.34 * S : 0, (0.28 - i * 0.42) * S, 0.64 * S],
          [Math.PI / 2, 0, 0],
        );
      }
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.56 * S, 0.1 * S, 8, 20, Math.PI * 1.25),
        darkMat,
        [0, 1.02 * S, -0.04 * S],
        [Math.PI / 2, 0, -Math.PI * 0.12],
      );
      addOuterSleeves({ sleeveLen: 1.66 * S, inflate: 0.14, cuffMat: darkMat });
      break;
    }

    case 'denimJacket': {
      addJacketTorsoEnvelope({
        height: 1.96 * S,
        yCenter: 0.0 * S,
        thickness: 0.11 * S,
        extraW: 0.15,
        extraD: 0.15,
        frontGap: 0.56 * S,
        bevel: 0.035 * S,
      });
      // Structured denim point collar + brass buttons + twin chest flap pockets
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.3 * S, 0.22 * S, 0.3 * S, 0.05 * S),
        mainMat,
        [0, 1.04 * S, -0.34 * S],
      );
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.32 * S, 0.2 * S, 0.16 * S, 0.03 * S),
          mainMat,
          [side * 0.36 * S, 0.96 * S, 0.52 * S],
          [0.18, side * -0.15, side * -0.16],
        );
        // Chest pocket + brass rivet
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.42 * S, 0.42 * S, 0.08 * S, 0.025 * S),
          darkMat,
          [side * 0.68 * S, 0.38 * S, 0.6 * S],
        );
        addShadowMesh(
          torsoGroup,
          new THREE.CylinderGeometry(0.038 * S, 0.038 * S, 0.04 * S, 10),
          brassMat,
          [side * 0.68 * S, 0.48 * S, 0.64 * S],
          [Math.PI / 2, 0, 0],
        );
      }
      // Denim waist tab hem
      addShadowMesh(
        torsoGroup,
        createRoundedWrapBandGeo(2.18 * S, 1.18 * S, 0.16 * S, 0.035 * S),
        darkMat,
        [0, -0.92 * S, 0],
      );
      addOuterSleeves({ sleeveLen: 1.66 * S, inflate: 0.14, cuffMat: darkMat });
      break;
    }

    case 'trenchCoat': {
      addJacketTorsoEnvelope({
        height: 2.02 * S,
        yCenter: -0.01 * S,
        thickness: 0.12 * S,
        extraW: 0.16,
        extraD: 0.16,
        frontGap: 0.52 * S,
        bevel: 0.04 * S,
      });
      // Wide storm lapels + shoulder epaulets + waist tie sash
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.38 * S, 0.88 * S, 0.09 * S, 0.03 * S),
          mainMat,
          [side * 0.52 * S, 0.5 * S, 0.61 * S],
          [0, side * 0.12, side * -0.22],
        );
        // Shoulder epaulet strap
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.54 * S, 0.07 * S, 0.22 * S, 0.02 * S),
          darkMat,
          [side * 0.72 * S, 1.05 * S, 0],
        );
        // Double-breasted buttons
        for (let b = 0; b < 2; b++) {
          addShadowMesh(
            torsoGroup,
            new THREE.CylinderGeometry(0.045 * S, 0.045 * S, 0.04 * S, 10),
            accentMat,
            [side * 0.36 * S, (-0.12 - b * 0.38) * S, 0.63 * S],
            [Math.PI / 2, 0, 0],
          );
        }
      }
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.36 * S, 0.24 * S, 0.34 * S, 0.05 * S),
        mainMat,
        [0, 1.06 * S, -0.34 * S],
      );
      // Articulated swaying trench coat tails (Back + Front Left + Front Right)
      const backTail = new THREE.Group();
      backTail.position.set(0, -0.94 * S, -0.56 * S);
      torsoGroup.add(backTail);
      addShadowMesh(
        backTail,
        createTrapezoidPanelGeo(2.14 * S, 2.38 * S, 1.32 * S, 0.1 * S),
        mainMat,
        [0, 0, 0],
        [0.08, 0, 0],
      );
      sway.backCoatTail = backTail;

      const leftTail = new THREE.Group();
      leftTail.position.set(0.68 * S, -0.94 * S, 0.54 * S);
      torsoGroup.add(leftTail);
      addShadowMesh(
        leftTail,
        createTrapezoidPanelGeo(0.84 * S, 0.98 * S, 1.28 * S, 0.09 * S),
        mainMat,
        [0, 0, 0],
        [-0.08, 0.14, 0],
      );
      sway.frontLeftTail = leftTail;

      const rightTail = new THREE.Group();
      rightTail.position.set(-0.68 * S, -0.94 * S, 0.54 * S);
      torsoGroup.add(rightTail);
      addShadowMesh(
        rightTail,
        createTrapezoidPanelGeo(0.84 * S, 0.98 * S, 1.28 * S, 0.09 * S),
        mainMat,
        [0, 0, 0],
        [-0.08, -0.14, 0],
      );
      sway.frontRightTail = rightTail;

      addOuterSleeves({ sleeveLen: 1.66 * S, inflate: 0.15, cuffMat: accentMat });
      break;
    }

    case 'bomberJacket': {
      addJacketTorsoEnvelope({
        height: 1.88 * S,
        yCenter: 0.04 * S,
        thickness: 0.15 * S,
        extraW: 0.2,
        extraD: 0.22,
        frontGap: 0.52 * S,
        bevel: 0.08 * S,
      });
      // Ribbed striped bomber collar & waist band
      addShadowMesh(
        torsoGroup,
        new THREE.TorusGeometry(0.56 * S, 0.09 * S, 8, 22),
        accentMat,
        [0, 1.02 * S, 0],
        [Math.PI / 2, 0, 0],
      );
      addShadowMesh(
        torsoGroup,
        createRoundedWrapBandGeo(2.2 * S, 1.2 * S, 0.2 * S, 0.05 * S),
        accentMat,
        [0, -0.9 * S, 0],
      );
      // Utility flight sleeve patch pocket on left arm
      addShadowMesh(
        leftArmGroup,
        createRoundedBoxGeo(0.1 * S, 0.36 * S, 0.3 * S, 0.025 * S),
        accentMat,
        [0.62 * S, 0.42 * S, 0],
      );
      addOuterSleeves({ sleeveLen: 1.64 * S, inflate: 0.18, cuffMat: accentMat });
      break;
    }

    case 'blazer': {
      addJacketTorsoEnvelope({
        height: 2.06 * S,
        yCenter: -0.04 * S,
        thickness: 0.11 * S,
        extraW: 0.14,
        extraD: 0.14,
        frontGap: 0.56 * S,
        bevel: 0.03 * S,
      });
      // Notched lapels + pocket square + structured collar
      for (const side of [-1, 1]) {
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.32 * S, 0.94 * S, 0.08 * S, 0.025 * S),
          mainMat,
          [side * 0.46 * S, 0.48 * S, 0.59 * S],
          [0, side * 0.08, side * -0.18],
        );
      }
      // Pocket square on left chest
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(0.26 * S, 0.09 * S, 0.05 * S, 0.015 * S),
        accentMat,
        [0.66 * S, 0.44 * S, 0.61 * S],
      );
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.28 * S, 0.18 * S, 0.28 * S, 0.04 * S),
        mainMat,
        [0, 1.04 * S, -0.34 * S],
      );
      addOuterSleeves({ sleeveLen: 1.66 * S, inflate: 0.12, cuffMat: darkMat });
      break;
    }

    case 'hoodedParka': {
      addJacketTorsoEnvelope({
        height: 2.04 * S,
        yCenter: -0.02 * S,
        thickness: 0.14 * S,
        extraW: 0.18,
        extraD: 0.2,
        frontGap: 0.52 * S,
        bevel: 0.06 * S,
      });
      // Faux-fur trimmed draped hood
      const hoodPivot = new THREE.Group();
      hoodPivot.position.set(0, 1.02 * S, -0.38 * S);
      torsoGroup.add(hoodPivot);
      addShadowMesh(
        hoodPivot,
        createRoundedBoxGeo(1.34 * S, 0.46 * S, 0.62 * S, 0.14 * S),
        mainMat,
        [0, -0.08 * S, -0.2 * S],
        [0.24, 0, 0],
      );
      // Plush fur trim halo around hood rim
      const furMat = makeFabricMaterial(accent, 'knit');
      addShadowMesh(
        hoodPivot,
        new THREE.TorusGeometry(0.64 * S, 0.12 * S, 10, 22),
        furMat,
        [0, 0.06 * S, 0.32 * S],
        [Math.PI / 2, 0, 0],
      );
      sway.hoodDrape = hoodPivot;

      // Swaying fishtail parka hem
      const backTail = new THREE.Group();
      backTail.position.set(0, -0.96 * S, -0.58 * S);
      torsoGroup.add(backTail);
      addShadowMesh(
        backTail,
        createTrapezoidPanelGeo(2.16 * S, 2.28 * S, 0.86 * S, 0.11 * S),
        mainMat,
        [0, 0, 0],
        [0.08, 0, 0],
      );
      sway.backCoatTail = backTail;

      addOuterSleeves({ sleeveLen: 1.68 * S, inflate: 0.18, cuffMat: darkMat });
      break;
    }

    case 'overalls': {
      // Sculpted denim overall bib + center bib pocket + crossover shoulder straps + brass clasps
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.32 * S, 1.18 * S, 0.12 * S, 0.04 * S),
        mainMat,
        [0, -0.14 * S, 0.54 * S],
      );
      // Chest bib pocket
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(0.58 * S, 0.4 * S, 0.07 * S, 0.025 * S),
        darkMat,
        [0, 0.04 * S, 0.61 * S],
      );
      // Waistband wrap
      addShadowMesh(
        torsoGroup,
        createRoundedWrapBandGeo(2.14 * S, 1.14 * S, 0.36 * S, 0.045 * S),
        mainMat,
        [0, -0.84 * S, 0],
      );
      // Back bib panel
      addShadowMesh(
        torsoGroup,
        createRoundedBoxGeo(1.24 * S, 0.86 * S, 0.1 * S, 0.04 * S),
        mainMat,
        [0, -0.32 * S, -0.54 * S],
      );
      // Shoulder straps & brass buckle clasps
      for (const side of [-1, 1]) {
        // Front strap
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.22 * S, 0.66 * S, 0.08 * S, 0.025 * S),
          mainMat,
          [side * 0.52 * S, 0.72 * S, 0.54 * S],
        );
        // Top shoulder bridge
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.22 * S, 0.08 * S, 1.14 * S, 0.025 * S),
          mainMat,
          [side * 0.52 * S, 1.03 * S, 0],
        );
        // Back strap
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.22 * S, 0.96 * S, 0.08 * S, 0.025 * S),
          mainMat,
          [side * 0.48 * S, 0.56 * S, -0.54 * S],
        );
        // Brass clasp + hip button
        addShadowMesh(
          torsoGroup,
          createRoundedBoxGeo(0.24 * S, 0.14 * S, 0.08 * S, 0.02 * S),
          brassMat,
          [side * 0.52 * S, 0.44 * S, 0.59 * S],
        );
        addShadowMesh(
          torsoGroup,
          new THREE.CylinderGeometry(0.055 * S, 0.055 * S, 0.06 * S, 10),
          brassMat,
          [side * 1.09 * S, -0.78 * S, 0.12 * S],
          [0, 0, Math.PI / 2],
        );
      }
      break;
    }
  }
}

function buildBottomsAndBelt3D(
  clothing: ClothingConfig,
  hipGroup: THREE.Group,
  leftLegGroup: THREE.Group,
  rightLegGroup: THREE.Group,
  sway: SwayHandles,
  anisotropy: number,
) {
  const pants: PantsStyleId = clothing.pantsId;
  const fabric = resolveBottomFabric(clothing);
  const pattern = clothing.bottomPattern ?? 'solid';

  // Patterned texture for sculpted 3D skirts & baggy cuffs so Plaid/Stripes/Camo wrap seamlessly
  const patternedTex =
    pattern !== 'solid'
      ? createPatternedShellTexture(clothing.pantsColor, clothing.pantsAccent, pattern, fabric, anisotropy)
      : null;
  const mainMat = makeFabricMaterial(clothing.pantsColor, fabric, patternedTex);
  const darkMat = makeFabricMaterial(shadeHex(clothing.pantsColor, -0.22), fabric);
  const accentMat = makeFabricMaterial(clothing.pantsAccent, fabric === 'armor' ? 'armor' : 'cotton');
  const metalMat = makeHardwareMetalMat('#e2e8f0', 0.22, 0.86);
  const goldMat = makeHardwareMetalMat('#eab308', 0.22, 0.86);

  // 1. Hip-Anchored Sculpted Belt (at y = -0.96S in hipPivot space)
  const belt = resolveEffectiveBelt(clothing);
  if (belt !== 'none' && (pants !== 'none' || clothing.shirtId !== 'none')) {
    const beltY = -0.96 * S;
    if (belt === 'leather') {
      const leatherMat = makeFabricMaterial('#3b2416', 'leather');
      addShadowMesh(
        hipGroup,
        createRoundedWrapBandGeo(2.14 * S, 1.15 * S, 0.16 * S, 0.035 * S),
        leatherMat,
        [0, beltY, 0],
      );
      addShadowMesh(
        hipGroup,
        createRoundedBoxGeo(0.32 * S, 0.22 * S, 0.09 * S, 0.025 * S),
        goldMat,
        [0, beltY, 0.58 * S],
      );
      addShadowMesh(
        hipGroup,
        createRoundedBoxGeo(0.18 * S, 0.12 * S, 0.1 * S, 0.015 * S),
        leatherMat,
        [0, beltY, 0.59 * S],
      );
    } else if (belt === 'chain') {
      addShadowMesh(
        hipGroup,
        createRoundedWrapBandGeo(2.13 * S, 1.14 * S, 0.12 * S, 0.03 * S),
        makeFabricMaterial('#18181b', 'leather'),
        [0, beltY, 0],
      );
      // Hanging wallet chain arc on right hip
      const chainCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.35 * S, beltY, 0.58 * S),
        new THREE.Vector3(-0.78 * S, beltY - 0.34 * S, 0.52 * S),
        new THREE.Vector3(-1.08 * S, beltY - 0.12 * S, 0.12 * S),
      ]);
      addShadowMesh(
        hipGroup,
        new THREE.TubeGeometry(chainCurve, 14, 0.028 * S, 6, false),
        metalMat,
      );
      addShadowMesh(
        hipGroup,
        createRoundedBoxGeo(0.24 * S, 0.16 * S, 0.08 * S, 0.02 * S),
        metalMat,
        [0, beltY, 0.58 * S],
      );
    } else if (belt === 'sash') {
      const sashMat = makeFabricMaterial(clothing.shirtAccent || clothing.pantsAccent, 'satin');
      addShadowMesh(
        hipGroup,
        createRoundedWrapBandGeo(2.16 * S, 1.18 * S, 0.2 * S, 0.055 * S),
        sashMat,
        [0, beltY, 0],
      );
      // Knot & dangling sash tails on front-left
      addShadowMesh(
        hipGroup,
        new THREE.SphereGeometry(0.11 * S, 10, 8),
        sashMat,
        [0.36 * S, beltY - 0.02 * S, 0.6 * S],
      );
      addShadowMesh(
        hipGroup,
        createRoundedBoxGeo(0.12 * S, 0.52 * S, 0.05 * S, 0.02 * S),
        sashMat,
        [0.42 * S, beltY - 0.3 * S, 0.6 * S],
        [0, 0, 0.14],
      );
    }
  }

  // 2. Hip-Anchored Articulated Skirts (zero tearing between legs, live stride & breeze sway!)
  if (pants === 'pleatedSkirt' || pants === 'midiSkirt') {
    const isPleated = pants === 'pleatedSkirt';
    const skirtLen = isPleated ? 1.06 * S : 1.56 * S;
    const waistY = -0.98 * S;

    // Structured waistband yoke
    addShadowMesh(
      hipGroup,
      createRoundedWrapBandGeo(2.12 * S, 1.13 * S, 0.18 * S, 0.04 * S),
      darkMat,
      [0, waistY, 0],
    );

    const skirtFront = new THREE.Group();
    skirtFront.position.set(0, waistY - 0.06 * S, 0.52 * S);
    hipGroup.add(skirtFront);

    const skirtBack = new THREE.Group();
    skirtBack.position.set(0, waistY - 0.06 * S, -0.52 * S);
    hipGroup.add(skirtBack);

    const skirtLeft = new THREE.Group();
    skirtLeft.position.set(1.04 * S, waistY - 0.06 * S, 0);
    hipGroup.add(skirtLeft);

    const skirtRight = new THREE.Group();
    skirtRight.position.set(-1.04 * S, waistY - 0.06 * S, 0);
    hipGroup.add(skirtRight);

    if (isPleated) {
      // Sculpted accordion pleats across front, back, and sides
      const fbPleats = 6;
      const fbSpan = 2.16 * S;
      const pleatW = fbSpan / fbPleats;
      for (let i = 0; i < fbPleats; i++) {
        const px = -fbSpan * 0.5 + (i + 0.5) * pleatW;
        const twist = (i % 2 === 0 ? 1 : -1) * 0.16;
        addShadowMesh(
          skirtFront,
          createTrapezoidPanelGeo(pleatW * 1.05, pleatW * 1.24, skirtLen, 0.08 * S, 0.02 * S),
          mainMat,
          [px, 0, 0.04 * S],
          [-0.2, twist, 0],
        );
        addShadowMesh(
          skirtBack,
          createTrapezoidPanelGeo(pleatW * 1.05, pleatW * 1.24, skirtLen, 0.08 * S, 0.02 * S),
          mainMat,
          [px, 0, -0.04 * S],
          [0.2, -twist, 0],
        );
      }
      // Side pleat panels closing the silhouette 360°
      const sidePleats = 3;
      const sideSpan = 1.14 * S;
      const sPleatW = sideSpan / sidePleats;
      for (let i = 0; i < sidePleats; i++) {
        const pz = -sideSpan * 0.5 + (i + 0.5) * sPleatW;
        const twist = (i % 2 === 0 ? 1 : -1) * 0.15;
        addShadowMesh(
          skirtLeft,
          createTrapezoidPanelGeo(sPleatW * 1.08, sPleatW * 1.26, skirtLen, 0.08 * S, 0.02 * S),
          mainMat,
          [0.04 * S, 0, pz],
          [0, Math.PI / 2 + twist, 0.2],
        );
        addShadowMesh(
          skirtRight,
          createTrapezoidPanelGeo(sPleatW * 1.08, sPleatW * 1.26, skirtLen, 0.08 * S, 0.02 * S),
          mainMat,
          [-0.04 * S, 0, pz],
          [0, -Math.PI / 2 - twist, -0.2],
        );
      }
      // Subtle contrast hem stripe on front & back
      addShadowMesh(
        skirtFront,
        createRoundedBoxGeo(2.38 * S, 0.07 * S, 0.08 * S, 0.02 * S),
        accentMat,
        [0, -skirtLen + 0.12 * S, 0.22 * S],
        [-0.2, 0, 0],
      );
    } else {
      // Smooth flared A-line Midi Skirt panels wrapping cleanly 360°
      addShadowMesh(
        skirtFront,
        createTrapezoidPanelGeo(2.12 * S, 2.52 * S, skirtLen, 0.1 * S, 0.03 * S),
        mainMat,
        [0, 0, 0.03 * S],
        [-0.18, 0, 0],
      );
      addShadowMesh(
        skirtBack,
        createTrapezoidPanelGeo(2.12 * S, 2.52 * S, skirtLen, 0.1 * S, 0.03 * S),
        mainMat,
        [0, 0, -0.03 * S],
        [0.18, 0, 0],
      );
      addShadowMesh(
        skirtLeft,
        createTrapezoidPanelGeo(1.12 * S, 1.48 * S, skirtLen, 0.1 * S, 0.03 * S),
        mainMat,
        [0.03 * S, 0, 0],
        [0, Math.PI / 2, 0.18],
      );
      addShadowMesh(
        skirtRight,
        createTrapezoidPanelGeo(1.12 * S, 1.48 * S, skirtLen, 0.1 * S, 0.03 * S),
        mainMat,
        [-0.03 * S, 0, 0],
        [0, -Math.PI / 2, -0.18],
      );
    }

    sway.skirtFront = skirtFront;
    sway.skirtBack = skirtBack;
    sway.skirtLeft = skirtLeft;
    sway.skirtRight = skirtRight;
    return;
  }

  // 3. Sculpted Leg Silhouettes (Outer-side biased so inner thighs never interpenetrate!)
  const legs: Array<{ group: THREE.Group; side: number }> = [
    { group: leftLegGroup, side: 1 },
    { group: rightLegGroup, side: -1 },
  ];

  if (pants === 'baggyCargo' || pants === 'cargo') {
    const isBaggy = pants === 'baggyCargo';
    for (const { group, side } of legs) {
      // 3D bellows cargo pocket on outer thigh with flap + strap
      addShadowMesh(
        group,
        createRoundedBoxGeo(0.14 * S, 0.48 * S, 0.56 * S, 0.035 * S),
        mainMat,
        [side * 0.54 * S, 0.12 * S, 0.02 * S],
      );
      addShadowMesh(
        group,
        createRoundedBoxGeo(0.16 * S, 0.14 * S, 0.58 * S, 0.03 * S),
        darkMat,
        [side * 0.55 * S, 0.32 * S, 0.02 * S],
      );
      if (isBaggy) {
        // Wide relaxed lower-leg drape shell (biased slightly outward)
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.08 * S, 1.24 * S, 1.14 * S, 0.06 * S),
          mainMat,
          [side * 0.04 * S, -0.18 * S, 0],
        );
      }
    }
  } else if (pants === 'flaredJeans') {
    for (const { group, side } of legs) {
      // Bell-bottom flared denim cuff near ankles
      addShadowMesh(
        group,
        createRoundedWrapBandGeo(1.09 * S, 1.18 * S, 0.62 * S, 0.05 * S),
        mainMat,
        [side * 0.045 * S, -0.44 * S, 0.02 * S],
      );
      addShadowMesh(
        group,
        createRoundedWrapBandGeo(1.11 * S, 1.21 * S, 0.1 * S, 0.025 * S),
        darkMat,
        [side * 0.05 * S, -0.74 * S, 0.02 * S],
      );
    }
  } else if (pants === 'joggers') {
    for (const { group, side } of legs) {
      // Elasticated ribbed ankle cuff
      addShadowMesh(
        group,
        createRoundedWrapBandGeo(1.04 * S, 1.06 * S, 0.18 * S, 0.045 * S),
        darkMat,
        [side * 0.015 * S, -0.68 * S, 0],
      );
    }
  } else if (pants === 'jeans') {
    for (const { group, side } of legs) {
      // Crisp rolled denim cuff hem above shoes
      addShadowMesh(
        group,
        createRoundedWrapBandGeo(1.05 * S, 1.06 * S, 0.14 * S, 0.035 * S),
        darkMat,
        [side * 0.02 * S, -0.62 * S, 0],
      );
    }
  } else if (pants === 'knightGreaves') {
    const steelMat = makeHardwareMetalMat(clothing.pantsAccent, 0.24, 0.84);
    for (const { group, side } of legs) {
      addShadowMesh(
        group,
        createRoundedBoxGeo(0.76 * S, 0.34 * S, 0.16 * S, 0.05 * S),
        steelMat,
        [side * 0.02 * S, 0.02 * S, 0.53 * S],
      );
    }
  } else if (pants === 'cyberLeggings') {
    const glowMat = new THREE.MeshStandardMaterial({
      color: clothing.pantsAccent,
      emissive: clothing.pantsAccent,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    for (const { group, side } of legs) {
      addShadowMesh(
        group,
        createRoundedBoxGeo(0.05 * S, 1.45 * S, 0.1 * S, 0.015 * S),
        glowMat,
        [side * 0.51 * S, 0.05 * S, 0],
      );
    }
  }
}

function buildSculptedFootwear3D(
  clothing: ClothingConfig,
  leftLegGroup: THREE.Group,
  rightLegGroup: THREE.Group,
) {
  const fw: FootwearId = clothing.footwearId;
  if (fw === 'none') return;

  const fwMeta = FOOTWEAR_CATALOG.find((f) => f.id === fw);
  const shoeColor = clothing.shoeColor ?? fwMeta?.defaultColor ?? '#1e293b';
  const shoeAccent = clothing.shoeAccent ?? fwMeta?.defaultAccent ?? '#f8fafc';
  const darkShoe = shadeHex(shoeColor, -0.25);

  const upperMat =
    fw === 'armoredBoots'
      ? makeHardwareMetalMat(shoeColor, 0.22, 0.86)
      : fw === 'chelseaBoots' || fw === 'loafers'
        ? makeFabricMaterial(shoeColor, 'leather')
        : makeFabricMaterial(shoeColor, 'cotton', null, { roughness: 0.54 });

  const accentMat =
    fw === 'armoredBoots'
      ? makeHardwareMetalMat(shoeAccent, 0.2, 0.88)
      : makeFabricMaterial(shoeAccent, 'cotton', null, { roughness: 0.48 });

  const rubberSoleMat = makeFabricMaterial(
    fw === 'sneakers' || fw === 'highTops' ? shoeAccent : '#18181b',
    'cotton',
    null,
    { roughness: 0.78, sheen: 0.05 },
  );
  const darkTreadMat = makeFabricMaterial('#111827', 'cotton', null, { roughness: 0.88, sheen: 0 });
  const buckleMat = makeHardwareMetalMat('#eab308', 0.22, 0.88);

  const legs: Array<{ group: THREE.Group; side: number }> = [
    { group: leftLegGroup, side: 1 },
    { group: rightLegGroup, side: -1 },
  ];

  for (const { group, side } of legs) {
    // Inner X bias keeps left & right shoes cleanly separated at inner ankle seam
    const xb = side * 0.022 * S;

    switch (fw) {
      case 'sneakers':
      case 'highTops': {
        const isHigh = fw === 'highTops';
        // 1. Dark rubber tread bottom strictly flush at y = -1.0S
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.04 * S, 0.055 * S, 1.24 * S, 0.02 * S),
          darkTreadMat,
          [xb, -0.972 * S, 0.1 * S],
        );
        // 2. Cushioned contrast midsole
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.06 * S, 0.11 * S, 1.26 * S, 0.035 * S),
          rubberSoleMat,
          [xb, -0.895 * S, 0.1 * S],
        );
        // 3. Sculpted rounded toe vamp box
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.98 * S, 0.23 * S, 0.34 * S, 0.08 * S, 3),
          upperMat,
          [xb, -0.78 * S, 0.56 * S],
        );
        // 4. Contrast toe bumper cap
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.94 * S, 0.12 * S, 0.14 * S, 0.045 * S),
          accentMat,
          [xb, -0.83 * S, 0.69 * S],
        );
        // 5. Padded heel counter + side stripe
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.05 * S, isHigh ? 0.42 * S : 0.26 * S, 0.24 * S, 0.05 * S),
          accentMat,
          [xb, (isHigh ? -0.66 : -0.76) * S, -0.44 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.05 * S, 0.1 * S, 0.72 * S, 0.015 * S),
          accentMat,
          [xb + side * 0.52 * S, -0.76 * S, 0.08 * S],
          [0.14, 0, 0],
        );
        // 6. Sculpted lace bars + tongue
        for (let l = 0; l < 3; l++) {
          addShadowMesh(
            group,
            createRoundedBoxGeo(0.46 * S, 0.045 * S, 0.06 * S, 0.015 * S),
            accentMat,
            [xb, (-0.72 + l * 0.075) * S, (0.56 - l * 0.03) * S],
          );
        }
        if (isHigh) {
          // Tall padded high-top collar + Velcro ankle strap
          addShadowMesh(
            group,
            createRoundedWrapBandGeo(1.06 * S, 1.09 * S, 0.22 * S, 0.045 * S),
            upperMat,
            [xb, -0.48 * S, 0.01 * S],
          );
          addShadowMesh(
            group,
            createRoundedWrapBandGeo(1.08 * S, 1.12 * S, 0.11 * S, 0.03 * S),
            accentMat,
            [xb, -0.54 * S, 0.02 * S],
          );
        }
        break;
      }

      case 'boots': {
        // Rugged combat boot: chunky lug sole + toe box + tall shaft + twin buckle straps
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.06 * S, 0.14 * S, 1.26 * S, 0.03 * S),
          darkTreadMat,
          [xb, -0.93 * S, 0.09 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.98 * S, 0.25 * S, 0.34 * S, 0.08 * S, 3),
          upperMat,
          [xb, -0.76 * S, 0.56 * S],
        );
        // Tall boot collar shaft
        addShadowMesh(
          group,
          createRoundedWrapBandGeo(1.06 * S, 1.09 * S, 0.38 * S, 0.045 * S),
          upperMat,
          [xb, -0.54 * S, 0],
        );
        // Twin buckle straps + gold buckles
        for (const sy of [-0.44, -0.62]) {
          addShadowMesh(
            group,
            createRoundedWrapBandGeo(1.08 * S, 1.11 * S, 0.08 * S, 0.02 * S),
            accentMat,
            [xb, sy * S, 0],
          );
          addShadowMesh(
            group,
            createRoundedBoxGeo(0.08 * S, 0.1 * S, 0.14 * S, 0.02 * S),
            buckleMat,
            [xb + side * 0.55 * S, sy * S, 0.14 * S],
          );
        }
        break;
      }

      case 'chelseaBoots': {
        // Sleek glossy leather boot with stacked heel & side elastic gore panels
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.03 * S, 0.11 * S, 1.24 * S, 0.025 * S),
          darkTreadMat,
          [xb, -0.945 * S, 0.09 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.94 * S, 0.22 * S, 0.36 * S, 0.085 * S, 3),
          upperMat,
          [xb, -0.79 * S, 0.55 * S],
        );
        addShadowMesh(
          group,
          createRoundedWrapBandGeo(1.04 * S, 1.06 * S, 0.42 * S, 0.04 * S),
          upperMat,
          [xb, -0.54 * S, 0],
        );
        // Elastic side gore panel + pull tab
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.06 * S, 0.3 * S, 0.36 * S, 0.02 * S),
          accentMat,
          [xb + side * 0.52 * S, -0.54 * S, 0],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.14 * S, 0.14 * S, 0.06 * S, 0.02 * S),
          accentMat,
          [xb, -0.32 * S, -0.53 * S],
        );
        break;
      }

      case 'platformShoes': {
        // Chunky double-deck platform lug sole + clean sculpted upper + contrast welt
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.07 * S, 0.22 * S, 1.28 * S, 0.04 * S),
          darkTreadMat,
          [xb, -0.89 * S, 0.1 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.08 * S, 0.05 * S, 1.29 * S, 0.015 * S),
          accentMat,
          [xb, -0.77 * S, 0.1 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.98 * S, 0.24 * S, 0.36 * S, 0.085 * S, 3),
          upperMat,
          [xb, -0.66 * S, 0.54 * S],
        );
        addShadowMesh(
          group,
          createRoundedWrapBandGeo(1.05 * S, 1.07 * S, 0.22 * S, 0.04 * S),
          upperMat,
          [xb, -0.62 * S, 0],
        );
        break;
      }

      case 'loafers': {
        // Polished dress loafer with low heel, apron stitch ridge, and gold horsebit bar
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.02 * S, 0.095 * S, 1.24 * S, 0.02 * S),
          darkTreadMat,
          [xb, -0.952 * S, 0.09 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.92 * S, 0.19 * S, 0.36 * S, 0.075 * S, 3),
          upperMat,
          [xb, -0.82 * S, 0.55 * S],
        );
        // Vamp saddle strap + brass penny/bit accent
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.96 * S, 0.07 * S, 0.18 * S, 0.02 * S),
          makeFabricMaterial(darkShoe, 'leather'),
          [xb, -0.72 * S, 0.44 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.42 * S, 0.055 * S, 0.08 * S, 0.015 * S),
          buckleMat,
          [xb, -0.7 * S, 0.49 * S],
        );
        break;
      }

      case 'armoredBoots': {
        // Articulated metallic plate sabaton + beveled shin guard + gold trim collar
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.06 * S, 0.12 * S, 1.28 * S, 0.03 * S),
          darkTreadMat,
          [xb, -0.94 * S, 0.1 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.98 * S, 0.26 * S, 0.38 * S, 0.06 * S),
          upperMat,
          [xb, -0.77 * S, 0.56 * S],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.84 * S, 0.44 * S, 0.16 * S, 0.04 * S),
          upperMat,
          [xb, -0.52 * S, 0.53 * S],
        );
        addShadowMesh(
          group,
          createRoundedWrapBandGeo(1.08 * S, 1.12 * S, 0.14 * S, 0.035 * S),
          accentMat,
          [xb, -0.36 * S, 0.02 * S],
        );
        break;
      }

      case 'sandals': {
        // Contoured footbed sole + criss-cross vamp straps + ankle strap buckle
        addShadowMesh(
          group,
          createRoundedBoxGeo(1.04 * S, 0.095 * S, 1.2 * S, 0.03 * S),
          upperMat,
          [xb, -0.952 * S, 0.08 * S],
        );
        // Front criss-cross straps
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.98 * S, 0.07 * S, 0.16 * S, 0.02 * S),
          accentMat,
          [xb, -0.84 * S, 0.54 * S],
          [0, 0.22, 0],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.98 * S, 0.07 * S, 0.16 * S, 0.02 * S),
          accentMat,
          [xb, -0.84 * S, 0.54 * S],
          [0, -0.22, 0],
        );
        // Ankle wrap strap + buckle
        addShadowMesh(
          group,
          createRoundedWrapBandGeo(1.05 * S, 1.06 * S, 0.09 * S, 0.025 * S),
          upperMat,
          [xb, -0.7 * S, 0],
        );
        addShadowMesh(
          group,
          createRoundedBoxGeo(0.07 * S, 0.1 * S, 0.12 * S, 0.02 * S),
          buckleMat,
          [xb + side * 0.53 * S, -0.7 * S, 0.1 * S],
        );
        break;
      }
    }
  }
}

// =========================================================================
// 6. Master Sculpted Layered Clothing Rig Entry Point
// =========================================================================

export function buildClothingRig(
  rawClothing: ClothingConfig,
  torsoTrimGroup: THREE.Group,
  hipClothingGroup: THREE.Group,
  leftArmTrimGroup: THREE.Group,
  rightArmTrimGroup: THREE.Group,
  leftLegTrimGroup: THREE.Group,
  rightLegTrimGroup: THREE.Group,
  anisotropy = 4,
): RobloxClothingRig {
  const clothing = normalizeClothingConfig(rawClothing);

  disposeClothingGroupChildren(torsoTrimGroup);
  disposeClothingGroupChildren(hipClothingGroup);
  disposeClothingGroupChildren(leftArmTrimGroup);
  disposeClothingGroupChildren(rightArmTrimGroup);
  disposeClothingGroupChildren(leftLegTrimGroup);
  disposeClothingGroupChildren(rightLegTrimGroup);

  const sway: SwayHandles = {
    backCoatTail: null,
    frontLeftTail: null,
    frontRightTail: null,
    skirtFront: null,
    skirtBack: null,
    skirtLeft: null,
    skirtRight: null,
    hoodDrape: null,
    drawstringLeft: null,
    drawstringRight: null,
  };

  buildBaseTop3DDetails(clothing, torsoTrimGroup, leftArmTrimGroup, rightArmTrimGroup, sway);
  buildOuterwear3DShell(clothing, torsoTrimGroup, leftArmTrimGroup, rightArmTrimGroup, sway);
  buildBottomsAndBelt3D(clothing, hipClothingGroup, leftLegTrimGroup, rightLegTrimGroup, sway, anisotropy);
  buildSculptedFootwear3D(clothing, leftLegTrimGroup, rightLegTrimGroup);

  return {
    applySecondaryMotion(
      sec: SecondaryMotionState,
      leftLegPitchRad = 0,
      rightLegPitchRad = 0,
    ) {
      // Stride clearance: detect forward (-X pitch in R6) and backward (+X pitch) leg swings
      const maxForwardLeg = Math.max(0, -leftLegPitchRad, -rightLegPitchRad);
      const maxBackwardLeg = Math.max(0, leftLegPitchRad, rightLegPitchRad);
      const legStrideDelta = leftLegPitchRad - rightLegPitchRad;

      if (sway.backCoatTail) {
        sway.backCoatTail.rotation.set(
          Math.min(0.68, sec.capePitch * 0.72 + maxBackwardLeg * 0.58),
          0,
          sec.capeRoll * 0.65,
        );
      }
      if (sway.frontLeftTail) {
        const leftFwd = Math.max(0, -leftLegPitchRad);
        sway.frontLeftTail.rotation.set(
          -Math.min(0.58, leftFwd * 0.62 + sec.capePitch * 0.14),
          0,
          Math.min(0.28, sec.capePitch * 0.25 + leftFwd * 0.18 + Math.max(0, sec.capeRoll * 0.4)),
        );
      }
      if (sway.frontRightTail) {
        const rightFwd = Math.max(0, -rightLegPitchRad);
        sway.frontRightTail.rotation.set(
          -Math.min(0.58, rightFwd * 0.62 + sec.capePitch * 0.14),
          0,
          -Math.min(0.28, sec.capePitch * 0.25 + rightFwd * 0.18 + Math.max(0, -sec.capeRoll * 0.4)),
        );
      }

      if (sway.skirtFront) {
        sway.skirtFront.rotation.set(
          -Math.min(0.65, maxForwardLeg * 0.76 + Math.max(0, sec.capePitch * 0.12)),
          0,
          sec.capeRoll * 0.25 + legStrideDelta * 0.08,
        );
      }
      if (sway.skirtBack) {
        sway.skirtBack.rotation.set(
          Math.min(0.7, maxBackwardLeg * 0.76 + sec.capePitch * 0.42),
          0,
          sec.capeRoll * 0.35 - legStrideDelta * 0.08,
        );
      }
      if (sway.skirtLeft) {
        sway.skirtLeft.rotation.set(
          0,
          0,
          Math.min(0.32, Math.abs(legStrideDelta) * 0.16 + sec.capePitch * 0.16 + Math.max(0, sec.capeRoll * 0.35)),
        );
      }
      if (sway.skirtRight) {
        sway.skirtRight.rotation.set(
          0,
          0,
          -Math.min(0.32, Math.abs(legStrideDelta) * 0.16 + sec.capePitch * 0.16 + Math.max(0, -sec.capeRoll * 0.35)),
        );
      }

      if (sway.hoodDrape) {
        sway.hoodDrape.rotation.set(sec.hairPitch * 0.35, 0, sec.hairRoll * 0.35);
      }
      if (sway.drawstringLeft) {
        sway.drawstringLeft.rotation.set(sec.hairPitch * 0.45, 0, sec.hairRoll * 0.55);
      }
      if (sway.drawstringRight) {
        sway.drawstringRight.rotation.set(sec.hairPitch * 0.45, 0, sec.hairRoll * 0.55);
      }
    },
  };
}
