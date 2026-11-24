import * as THREE from 'three';
import { getHatTuckProfile } from './robloxCatalog';
import {
  HairAccessoryId,
  HairBangsStyleId,
  HairConfig,
  HairFinishId,
  HairHighlightPattern,
  HairStyleId,
  HatTuckProfile,
} from './types';

const S = 0.55; // Authentic Roblox R6 stud scale (matches robloxCharacter.ts & robloxWardrobe.ts)

// Exact R6 head geometry bounds in hairSocket local space (origin = head center):
// Cylinder radius = 0.58*S, half-height = 0.56*S, top/bottom bevels at ±0.42*S..±0.56*S
const HEAD_R = 0.58 * S;
const HEAD_H = 0.56 * S;
const HEAD_BEVEL_Y = 0.42 * S;

export interface RobloxHairRig {
  root: THREE.Group;
  applyHatTuck: (tuck: HatTuckProfile) => void;
  applyPhysics: (hairPitch: number, hairRoll: number) => void;
}

// =========================================================================
// 1. Color Helpers & Procedural Hair Fiber Textures (Zero External Assets)
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

let sharedStrandBumpTexture: THREE.CanvasTexture | null = null;

function getSharedStrandBumpTexture(): THREE.CanvasTexture {
  if (sharedStrandBumpTexture) return sharedStrandBumpTexture;

  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);

  // Longitudinal sculpted hair strand grooves along V (vertical axis)
  for (let x = 0; x < w; x++) {
    const u = x / w;
    const wave1 = Math.sin(u * Math.PI * 18) * 26;
    const wave2 = Math.sin(u * Math.PI * 46 + 1.3) * 14;
    const wave3 = Math.cos(u * Math.PI * 8 - 0.5) * 18;
    const val = Math.max(20, Math.min(240, Math.round(128 + wave1 + wave2 + wave3)));
    ctx.fillStyle = `rgb(${val},${val},${val})`;
    ctx.fillRect(x, 0, 1, h);
  }

  // Subtle horizontal silky highlight band ripple
  const bandGrad = ctx.createLinearGradient(0, 0, 0, h);
  bandGrad.addColorStop(0, 'rgba(0,0,0,0.08)');
  bandGrad.addColorStop(0.32, 'rgba(255,255,255,0.09)');
  bandGrad.addColorStop(0.55, 'rgba(0,0,0,0.04)');
  bandGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.userData.shared = true;
  tex.needsUpdate = true;
  sharedStrandBumpTexture = tex;
  return tex;
}

function createHairAlbedoTexture(
  primaryHex: string,
  highlightHex: string,
  pattern: HairHighlightPattern | 'scalp' | 'fadeScalp',
): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const rootDark = shadeHex(primaryHex, -0.2);
  const midBase = primaryHex;
  const softSheen = shadeHex(primaryHex, 0.16);

  if (pattern === 'fadeScalp') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, midBase);
    grad.addColorStop(0.42, shadeHex(primaryHex, -0.08));
    grad.addColorStop(0.74, shadeHex(primaryHex, -0.24));
    grad.addColorStop(1, shadeHex(primaryHex, -0.34));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (pattern === 'ombre') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rootDark);
    grad.addColorStop(0.28, midBase);
    grad.addColorStop(0.62, highlightHex);
    grad.addColorStop(1, shadeHex(highlightHex, 0.08));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (pattern === 'tips') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rootDark);
    grad.addColorStop(0.18, midBase);
    grad.addColorStop(0.64, midBase);
    grad.addColorStop(0.82, highlightHex);
    grad.addColorStop(1, shadeHex(highlightHex, 0.1));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, pattern === 'scalp' ? shadeHex(primaryHex, -0.1) : rootDark);
    grad.addColorStop(0.25, midBase);
    grad.addColorStop(0.45, softSheen);
    grad.addColorStop(0.78, midBase);
    grad.addColorStop(1, shadeHex(primaryHex, -0.08));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Longitudinal sculpted fiber strokes
  for (let i = 0; i < 64; i++) {
    const x = (i / 64) * w;
    const width = 2 + (i % 3);
    const isHighlightStreak =
      pattern === 'streaks' && (i % 7 === 1 || i % 7 === 2 || i % 11 === 5);

    if (isHighlightStreak) {
      const sGrad = ctx.createLinearGradient(0, 0, 0, h);
      sGrad.addColorStop(0, 'rgba(0,0,0,0)');
      sGrad.addColorStop(0.15, highlightHex);
      sGrad.addColorStop(0.9, highlightHex);
      sGrad.addColorStop(1, shadeHex(highlightHex, 0.12));
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = sGrad;
      ctx.fillRect(x, 0, width + 1.5, h);
      ctx.globalAlpha = 1;
    } else {
      const light = i % 2 === 0;
      ctx.fillStyle = light ? 'rgba(255,255,255,0.065)' : 'rgba(0,0,0,0.085)';
      ctx.fillRect(x, 0, width, h);
    }
  }

  // Soft anime/UGC crown halo highlight band
  if (pattern !== 'fadeScalp') {
    const halo = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.52);
    halo.addColorStop(0, 'rgba(255,255,255,0)');
    halo.addColorStop(0.45, 'rgba(255,255,255,0.11)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, h * 0.22, w, h * 0.3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

interface HairMaterialSet {
  baseMat: THREE.MeshPhysicalMaterial;
  accentMat: THREE.MeshPhysicalMaterial;
  scalpMat: THREE.MeshPhysicalMaterial;
  fadeScalpMat: THREE.MeshPhysicalMaterial;
  tieMat: THREE.MeshPhysicalMaterial;
}

function createHairMaterialSet(hair: HairConfig): HairMaterialSet {
  const finish: HairFinishId = hair.finish ?? 'silky';
  const bumpMap = getSharedStrandBumpTexture();

  const finishParams =
    finish === 'glossy'
      ? {
          roughness: 0.26,
          metalness: 0.06,
          sheen: 0.9,
          sheenRoughness: 0.24,
          clearcoat: 0.48,
          clearcoatRoughness: 0.18,
          bumpScale: 0.015,
        }
      : finish === 'matte'
        ? {
            roughness: 0.72,
            metalness: 0.02,
            sheen: 0.24,
            sheenRoughness: 0.72,
            clearcoat: 0.0,
            clearcoatRoughness: 0.5,
            bumpScale: 0.01,
          }
        : {
            roughness: 0.42,
            metalness: 0.04,
            sheen: 0.72,
            sheenRoughness: 0.38,
            clearcoat: 0.18,
            clearcoatRoughness: 0.34,
            bumpScale: 0.013,
          };

  const sheenTint = new THREE.Color(shadeHex(hair.primaryColor, 0.34));
  const accentSheenTint = new THREE.Color(
    shadeHex(hair.highlightPattern === 'none' ? hair.primaryColor : hair.highlightColor, 0.32),
  );

  const makeStrandMat = (
    pattern: HairHighlightPattern | 'scalp' | 'fadeScalp',
    useAccentSheen = false,
  ) =>
    new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: createHairAlbedoTexture(hair.primaryColor, hair.highlightColor, pattern),
      bumpMap,
      bumpScale: pattern === 'fadeScalp' ? finishParams.bumpScale * 0.7 : finishParams.bumpScale,
      roughness: pattern === 'fadeScalp' ? Math.min(0.82, finishParams.roughness + 0.18) : finishParams.roughness,
      metalness: finishParams.metalness,
      sheen: pattern === 'fadeScalp' ? finishParams.sheen * 0.45 : finishParams.sheen,
      sheenRoughness: finishParams.sheenRoughness,
      sheenColor: useAccentSheen ? accentSheenTint : sheenTint,
      clearcoat: pattern === 'fadeScalp' ? 0 : finishParams.clearcoat,
      clearcoatRoughness: finishParams.clearcoatRoughness,
      flatShading: false,
    });

  const baseMat = makeStrandMat('none', false);
  const accentMat =
    hair.highlightPattern === 'none'
      ? makeStrandMat('none', false)
      : makeStrandMat(hair.highlightPattern, true);
  const scalpMat = makeStrandMat('scalp', false);
  const fadeScalpMat = makeStrandMat('fadeScalp', false);

  const tieColor =
    hair.accessoryColor && hair.accessoryId && hair.accessoryId !== 'none'
      ? hair.accessoryColor
      : hair.highlightPattern !== 'none'
        ? hair.highlightColor
        : '#f472b6';

  const tieMat = new THREE.MeshPhysicalMaterial({
    color: tieColor,
    roughness: 0.32,
    metalness: 0.12,
    sheen: 0.6,
    sheenRoughness: 0.35,
    clearcoat: 0.25,
  });

  return { baseMat, accentMat, scalpMat, fadeScalpMat, tieMat };
}

// =========================================================================
// 2. Mathematically Gap-Free Parametric Scalp Shell Builder
// =========================================================================

interface ScalpShellOptions {
  crownLift?: number; // extra height above head top in studs (default 0.065)
  radialPad?: number; // extra radial clearance beyond head radius in studs (default 0.044)
  foreheadY?: number; // hairline Y at +Z center forehead in studs (default 0.32)
  sideDropY?: number; // hairline Y at ±X temples/ears in studs (default -0.18)
  backDropY?: number; // hairline Y at -Z nape in studs (default -0.46)
  partX?: number | null; // optional sculpted part line X in studs (e.g. 0 or -0.18)
  widowsPeak?: number; // optional subtle downward forehead dip in studs
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Generates a continuous, smooth, watertight curved scalp envelope that
 * wraps 360° over the R6 rounded cylinder head with a mathematically enforced
 * outward clearance at the crown, top bevel, sides, rear skull, and nape.
 */
function createScalpShellGeometry(opts: ScalpShellOptions = {}): THREE.BufferGeometry {
  const crownLift = opts.crownLift ?? 0.068;
  const radialPad = opts.radialPad ?? 0.045;
  const foreheadY = (opts.foreheadY ?? 0.32) * S;
  const sideDropY = (opts.sideDropY ?? -0.18) * S;
  const backDropY = (opts.backDropY ?? -0.46) * S;
  const partX = opts.partX !== undefined ? opts.partX : null;
  const widowsPeak = (opts.widowsPeak ?? 0.02) * S;

  const radialSegs = 40;
  const domeRings = 9;
  const skirtRings = 8;
  const totalOuterRings = domeRings + skirtRings; // 0..17
  const totalRings = totalOuterRings + 1; // +1 inner lip ring so edge has solid thickness

  const baseR = HEAD_R + Math.max(0.038 * S, radialPad * S);
  const topY = HEAD_H + Math.max(0.052 * S, crownLift * S);
  const domeBaseY = 0.34 * S;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= totalRings; ring++) {
    const isInnerLip = ring === totalRings;
    const outerRing = isInnerLip ? totalOuterRings : ring;
    const vNorm = outerRing / totalOuterRings;

    for (let seg = 0; seg <= radialSegs; seg++) {
      const uFrac = seg / radialSegs;
      const phi = uFrac * Math.PI * 2; // 0 = +Z front, PI/2 = +X left, PI = -Z back
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      // Angular distance from +Z front center [0..PI]
      const frontAngle = Math.abs(Math.atan2(sinPhi, cosPhi));

      // Sculpted hairline height around the head circumference
      const frontToSide = smoothstep(0.72, 1.48, frontAngle);
      const sideToBack = smoothstep(1.48, 2.28, frontAngle);
      const peakDip = widowsPeak * Math.exp(-Math.pow(frontAngle / 0.24, 2));
      const templeArch = 0.03 * S * Math.exp(-Math.pow((frontAngle - 0.62) / 0.22, 2));

      let hairlineY =
        THREE.MathUtils.lerp(foreheadY - peakDip + templeArch, sideDropY, frontToSide);
      hairlineY = THREE.MathUtils.lerp(hairlineY, backDropY, sideToBack);

      let r = 0;
      let y = topY;

      if (outerRing <= domeRings) {
        // Superellipse dome curving over the head's top bevel with zero corner clipping
        const d = outerRing / domeRings; // 0 at apex, 1 at domeBaseY
        const sinTerm = Math.sin(d * Math.PI * 0.5);
        const cosTerm = Math.cos(d * Math.PI * 0.5);
        const exp = 0.72;
        r = baseR * Math.pow(sinTerm, exp);
        // Subtle crown loft at rear/sides for natural hair volume
        const rearFullness = 1 + 0.045 * smoothstep(1.0, 2.5, frontAngle) * Math.sin(d * Math.PI);
        r *= rearFullness;
        y = domeBaseY + (topY - domeBaseY) * Math.pow(cosTerm, exp);
      } else {
        // Cylindrical wrap down to sculpted hairline
        const w = (outerRing - domeRings) / skirtRings;
        y = THREE.MathUtils.lerp(domeBaseY, hairlineY, w);
        // Gentle fuller wrap across rear skull, curving neatly inward at lower nape bevel
        const rearFull = 0.018 * S * smoothstep(1.2, 2.6, frontAngle) * Math.sin(w * Math.PI);
        r = baseR + rearFull;
        if (y < -HEAD_BEVEL_Y) {
          const below = (-HEAD_BEVEL_Y - y) / (HEAD_H - HEAD_BEVEL_Y);
          r -= below * 0.11 * S;
        }
      }

      // Optional sculpted crown part groove (strictly clamped above head top)
      if (partX !== null && y > 0.36 * S) {
        const px = sinPhi * r;
        const distPart = Math.abs(px - partX * S);
        const topMask = smoothstep(0.36 * S, 0.56 * S, y);
        const groove = Math.exp(-Math.pow(distPart / (0.09 * S), 2)) * 0.022 * S * topMask;
        const flankPuff =
          Math.exp(-Math.pow((distPart - 0.18 * S) / (0.14 * S), 2)) * 0.02 * S * topMask;
        y = y - groove + flankPuff;
      }

      // -----------------------------------------------------------------
      // MATHEMATICAL ANTI-BALD-SPOT SAFETY ENVELOPE (Guaranteed Clearance)
      // -----------------------------------------------------------------
      if (!isInnerLip) {
        // 1. Flat crown clearance above y = +0.56*S
        if (r < 0.47 * S && y > 0) {
          y = Math.max(y, HEAD_H + 0.04 * S);
        }
        // 2. Top bevel clearance: head bevel lies on r + y = 1.00*S
        if (y > 0.34 * S && r > 0.34 * S) {
          const sum = r + y;
          const minSum = 1.06 * S;
          if (sum < minSum) {
            const delta = (minSum - sum) * 0.52;
            r += delta;
            y += delta;
          }
        }
        // 3. Vertical cylinder wall clearance
        if (y <= HEAD_BEVEL_Y && y >= -HEAD_BEVEL_Y) {
          r = Math.max(r, HEAD_R + 0.036 * S);
        }
        // 4. Lower bevel clearance: head lower bevel lies on r - y = 1.00*S
        if (y < -HEAD_BEVEL_Y) {
          const minR = HEAD_R - (-HEAD_BEVEL_Y - y) + 0.036 * S;
          r = Math.max(r, minR);
        }
      } else {
        // Solid inner return lip tucking gently against the head skin
        r = Math.max(HEAD_R * 0.96, r - 0.045 * S);
        y += 0.025 * S;
      }

      positions.push(sinPhi * r, y, cosPhi * r);
      uvs.push(uFrac * 4, vNorm);
    }
  }

  const stride = radialSegs + 1;
  for (let ring = 0; ring < totalRings; ring++) {
    for (let seg = 0; seg < radialSegs; seg++) {
      const a = ring * stride + seg;
      const b = a + 1;
      const c = (ring + 1) * stride + seg;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// =========================================================================
// 3. Sculpted Roblox UGC Strand Loft Builder (Smooth Tapered Curved Locks)
// =========================================================================

type StudPt = [number, number, number];

interface StrandOptions {
  width: number; // width in studs at widest point
  thickness: number; // thickness in studs
  segments?: number;
  radialSegments?: number;
  rootTaper?: number; // 0..1 width ratio at t=0
  tipTaper?: number; // 0..1 width ratio at t=1
  peakAt?: number; // t in [0..1] where strand is fullest (default 0.28)
  roll?: number; // roll angle around curve tangent in radians
  ridge?: number; // subtle sculpted UGC center ridge prominence (default 0.22)
  outwardHint?: [number, number, number];
}

const _tmpP = new THREE.Vector3();
const _tmpT = new THREE.Vector3();
const _tmpN = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpPrevN = new THREE.Vector3();
const _tmpOut = new THREE.Vector3();

function mirrorStudPts(pts: StudPt[]): StudPt[] {
  return pts.map(([x, y, z]) => [-x, y, z]);
}

/**
 * Lofts a smooth, sculpted tapered almond/crescent hair lock along a 3D spline.
 * Uses head-radial outward alignment + parallel-transport continuity so ribbons
 * wrap organically around the R6 head with crisp UGC silhouettes and zero twists.
 */
function createSculptedStrandGeometry(
  studPoints: StudPt[],
  opts: StrandOptions,
): THREE.BufferGeometry {
  const curvePts = studPoints.map(([x, y, z]) => new THREE.Vector3(x * S, y * S, z * S));
  const curve = new THREE.CatmullRomCurve3(curvePts, false, 'centripetal', 0.5);

  const lengthSegs = opts.segments ?? 14;
  const radialSegs = opts.radialSegments ?? 8;
  const maxW = opts.width * S * 0.5;
  const maxTh = opts.thickness * S * 0.5;
  const rootTaper = opts.rootTaper ?? 0.58;
  const tipTaper = opts.tipTaper ?? 0.04;
  const peakAt = opts.peakAt ?? 0.26;
  const roll = opts.roll ?? 0;
  const ridge = opts.ridge ?? 0.24;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const hint = opts.outwardHint
    ? new THREE.Vector3(opts.outwardHint[0], opts.outwardHint[1], opts.outwardHint[2]).normalize()
    : null;

  let hasPrev = false;

  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs;
    curve.getPoint(t, _tmpP);
    curve.getTangent(t, _tmpT).normalize();

    // Outward normal pointing away from head center (0, -0.04*S, 0)
    if (hint) {
      _tmpOut.copy(hint);
    } else {
      _tmpOut.set(_tmpP.x, _tmpP.y + 0.04 * S, _tmpP.z);
      if (_tmpOut.lengthSq() < 1e-4) {
        _tmpOut.set(0, 1, 0);
      } else {
        _tmpOut.normalize();
      }
    }

    // Blend with previous frame for silky continuity through inflection points
    if (hasPrev) {
      _tmpN.copy(_tmpPrevN).lerp(_tmpOut, 0.35);
    } else {
      _tmpN.copy(_tmpOut);
    }

    // Orthogonalize N against tangent T
    _tmpN.addScaledVector(_tmpT, -_tmpN.dot(_tmpT));
    if (_tmpN.lengthSq() < 1e-5) {
      _tmpN.set(0, 0, 1);
      _tmpN.addScaledVector(_tmpT, -_tmpN.dot(_tmpT));
      if (_tmpN.lengthSq() < 1e-5) {
        _tmpN.set(1, 0, 0);
        _tmpN.addScaledVector(_tmpT, -_tmpN.dot(_tmpT));
      }
    }
    _tmpN.normalize();
    _tmpPrevN.copy(_tmpN);
    hasPrev = true;

    // Width axis B = T x N
    _tmpB.crossVectors(_tmpT, _tmpN).normalize();

    // Optional roll around tangent
    if (roll !== 0) {
      const c = Math.cos(roll);
      const s = Math.sin(roll);
      const nx = _tmpN.x * c + _tmpB.x * s;
      const ny = _tmpN.y * c + _tmpB.y * s;
      const nz = _tmpN.z * c + _tmpB.z * s;
      const bx = -_tmpN.x * s + _tmpB.x * c;
      const by = -_tmpN.y * s + _tmpB.y * c;
      const bz = -_tmpN.z * s + _tmpB.z * c;
      _tmpN.set(nx, ny, nz);
      _tmpB.set(bx, by, bz);
    }

    // Smooth root -> full body -> pointed UGC tip taper profile
    let profile: number;
    if (t <= peakAt) {
      const lt = peakAt > 0 ? t / peakAt : 1;
      profile = THREE.MathUtils.lerp(rootTaper, 1.0, Math.sin(lt * Math.PI * 0.5));
    } else {
      const lt = (t - peakAt) / Math.max(0.001, 1 - peakAt);
      // Graceful curved taper into sharp UGC tip
      profile = THREE.MathUtils.lerp(1.0, tipTaper, Math.pow(lt, 1.38));
    }

    const halfW = maxW * profile;
    const halfTh = maxTh * Math.max(0.12, profile);

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta); // width direction
      const sinT = Math.sin(theta); // thickness direction (+ = outward)

      // Sculpted UGC almond-crescent cross-section:
      // Slightly sharper side edges + soft raised outer spine for silky sheen
      const xLocal = cosT * halfW;
      const outerBoost = sinT > 0 ? 1 + ridge * Math.pow(sinT, 2) : 0.72;
      const edgePinch = 0.85 + 0.15 * Math.abs(sinT);
      const yLocal = sinT * halfTh * outerBoost * edgePinch;

      positions.push(
        _tmpP.x + _tmpB.x * xLocal + _tmpN.x * yLocal,
        _tmpP.y + _tmpB.y * xLocal + _tmpN.y * yLocal,
        _tmpP.z + _tmpB.z * xLocal + _tmpN.z * yLocal,
      );
      uvs.push(u, t);
    }
  }

  const ringStride = radialSegs + 1;
  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * ringStride + j;
      const b = a + 1;
      const c = (i + 1) * ringStride + j;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Cap root and tip cleanly with outward-facing normals
  const rootCenterIdx = positions.length / 3;
  curve.getPoint(0, _tmpP);
  positions.push(_tmpP.x, _tmpP.y, _tmpP.z);
  uvs.push(0.5, 0);
  for (let j = 0; j < radialSegs; j++) {
    indices.push(rootCenterIdx, j, j + 1);
  }

  const tipCenterIdx = positions.length / 3;
  curve.getPoint(1, _tmpP);
  positions.push(_tmpP.x, _tmpP.y, _tmpP.z);
  uvs.push(0.5, 1);
  const lastRingStart = lengthSegs * ringStride;
  for (let j = 0; j < radialSegs; j++) {
    indices.push(tipCenterIdx, lastRingStart + j + 1, lastRingStart + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addStrand(
  parent: THREE.Group,
  pts: StudPt[],
  opts: StrandOptions,
  mat: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(createSculptedStrandGeometry(pts, opts), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addMirroredStrandPair(
  parent: THREE.Group,
  pts: StudPt[],
  opts: StrandOptions,
  leftMat: THREE.Material,
  rightMat?: THREE.Material,
) {
  addStrand(parent, pts, opts, leftMat);
  const mirroredOpts: StrandOptions = {
    ...opts,
    roll: opts.roll ? -opts.roll : 0,
    outwardHint: opts.outwardHint
      ? [-opts.outwardHint[0], opts.outwardHint[1], opts.outwardHint[2]]
      : undefined,
  };
  addStrand(parent, mirrorStudPts(pts), mirroredOpts, rightMat ?? leftMat);
}

// =========================================================================
// 4. Modular Mix-and-Match Bangs Library (Guaranteed Eye/Brow Clearance)
// =========================================================================

function resolveAutoBangs(style: HairStyleId): Exclude<HairBangsStyleId, 'auto'> {
  switch (style) {
    case 'longWavyPart':
    case 'twinTails':
    case 'braids':
      return 'middleArch';
    case 'bob':
    case 'ponytail':
    case 'topBun':
      return 'curtain';
    case 'swept':
    case 'sidePart':
      return 'swept';
    case 'spiky':
    case 'wolfCut':
    case 'messyFluffy':
      return 'wispy';
    case 'undercut':
    case 'mohawk':
    case 'curly':
    case 'texturedFade':
      return 'none';
    default:
      return 'none';
  }
}

function populateBangsGroup(
  bangsGroup: THREE.Group,
  bangsId: Exclude<HairBangsStyleId, 'auto'>,
  baseMat: THREE.Material,
  accentMat: THREE.Material,
  highlightPattern: HairHighlightPattern,
) {
  if (bangsId === 'none') return;
  const pickHi = (cond: boolean) => (highlightPattern !== 'none' && cond ? accentMat : baseMat);

  if (bangsId === 'middleArch') {
    // Signature Roblox UGC center-parted sweeping arch locks framing cheekbones cleanly
    addMirroredStrandPair(
      bangsGroup,
      [
        [0.02, 0.62, 0.34],
        [0.24, 0.53, 0.56],
        [0.48, 0.34, 0.61],
        [0.64, 0.04, 0.5],
        [0.66, -0.26, 0.38],
      ],
      { width: 0.34, thickness: 0.14, rootTaper: 0.65, tipTaper: 0.08, roll: 0.12 },
      baseMat,
      pickHi(highlightPattern === 'streaks' || highlightPattern === 'ombre'),
    );
    // Inner feathery arch accent
    addMirroredStrandPair(
      bangsGroup,
      [
        [0.03, 0.58, 0.44],
        [0.22, 0.46, 0.61],
        [0.44, 0.25, 0.6],
        [0.57, -0.02, 0.49],
      ],
      { width: 0.22, thickness: 0.1, rootTaper: 0.6, tipTaper: 0.05 },
      pickHi(highlightPattern === 'tips' || highlightPattern === 'ombre'),
      baseMat,
    );
  } else if (bangsId === 'curtain') {
    // Soft romantic curtain bangs sweeping outward above eyebrows
    addMirroredStrandPair(
      bangsGroup,
      [
        [0.02, 0.62, 0.3],
        [0.2, 0.52, 0.58],
        [0.44, 0.36, 0.62],
        [0.6, 0.14, 0.52],
      ],
      { width: 0.32, thickness: 0.13, rootTaper: 0.62, tipTaper: 0.07 },
      baseMat,
      pickHi(highlightPattern === 'streaks'),
    );
    addMirroredStrandPair(
      bangsGroup,
      [
        [0.08, 0.61, 0.28],
        [0.34, 0.49, 0.56],
        [0.57, 0.26, 0.54],
        [0.65, -0.04, 0.42],
      ],
      { width: 0.26, thickness: 0.12, rootTaper: 0.6, tipTaper: 0.06 },
      pickHi(highlightPattern === 'tips' || highlightPattern === 'ombre'),
    );
  } else if (bangsId === 'swept') {
    // Layered diagonal side-swept fringe curving cleanly over the upper brow
    addStrand(
      bangsGroup,
      [
        [-0.36, 0.62, 0.34],
        [-0.08, 0.54, 0.61],
        [0.24, 0.43, 0.65],
        [0.54, 0.28, 0.54],
        [0.64, 0.08, 0.42],
      ],
      { width: 0.34, thickness: 0.14, rootTaper: 0.64, tipTaper: 0.06, roll: -0.1 },
      pickHi(highlightPattern !== 'none'),
    );
    addStrand(
      bangsGroup,
      [
        [-0.24, 0.64, 0.28],
        [0.06, 0.56, 0.58],
        [0.36, 0.46, 0.61],
        [0.6, 0.28, 0.46],
      ],
      { width: 0.28, thickness: 0.12, rootTaper: 0.6, tipTaper: 0.07 },
      baseMat,
    );
    addStrand(
      bangsGroup,
      [
        [-0.38, 0.58, 0.36],
        [-0.54, 0.42, 0.53],
        [-0.63, 0.16, 0.44],
      ],
      { width: 0.22, thickness: 0.1, rootTaper: 0.58, tipTaper: 0.06 },
      baseMat,
    );
  } else if (bangsId === 'blunt') {
    // Sleek sculpted curved blunt fringe sitting cleanly right above brows (y ~ 0.28*S)
    const bluntXs = [-0.42, -0.22, 0, 0.22, 0.42];
    bluntXs.forEach((bx, idx) => {
      const zCurve = Math.sqrt(Math.max(0.08, 0.64 * 0.64 - bx * bx));
      const isEdge = Math.abs(bx) > 0.35;
      addStrand(
        bangsGroup,
        [
          [bx * 0.65, 0.62, 0.28],
          [bx * 0.9, 0.5, zCurve * 0.98],
          [bx, 0.38, zCurve + 0.02],
          [bx * 1.04, isEdge ? 0.22 : 0.28, zCurve - 0.01],
        ],
        {
          width: isEdge ? 0.25 : 0.27,
          thickness: 0.12,
          rootTaper: 0.68,
          tipTaper: 0.42,
          segments: 10,
        },
        pickHi(idx === 2 || (highlightPattern === 'tips' || highlightPattern === 'ombre')),
      );
    });
  } else if (bangsId === 'wispy') {
    // Airy layered UGC wispy locks with natural forehead gaps
    const locks: { pts: StudPt[]; w: number; hi: boolean }[] = [
      {
        pts: [
          [-0.08, 0.63, 0.32],
          [-0.14, 0.5, 0.62],
          [-0.08, 0.31, 0.65],
        ],
        w: 0.17,
        hi: true,
      },
      {
        pts: [
          [0.08, 0.63, 0.32],
          [0.14, 0.5, 0.62],
          [0.18, 0.3, 0.64],
        ],
        w: 0.18,
        hi: false,
      },
      {
        pts: [
          [-0.24, 0.61, 0.3],
          [-0.38, 0.46, 0.58],
          [-0.46, 0.24, 0.56],
        ],
        w: 0.21,
        hi: false,
      },
      {
        pts: [
          [0.24, 0.61, 0.3],
          [0.38, 0.46, 0.58],
          [0.48, 0.23, 0.55],
        ],
        w: 0.21,
        hi: true,
      },
      {
        pts: [
          [-0.36, 0.56, 0.26],
          [-0.56, 0.36, 0.48],
          [-0.63, 0.08, 0.42],
        ],
        w: 0.22,
        hi: false,
      },
      {
        pts: [
          [0.36, 0.56, 0.26],
          [0.56, 0.36, 0.48],
          [0.63, 0.08, 0.42],
        ],
        w: 0.22,
        hi: false,
      },
    ];
    for (const lock of locks) {
      addStrand(
        bangsGroup,
        lock.pts,
        { width: lock.w, thickness: 0.1, rootTaper: 0.62, tipTaper: 0.05, segments: 11 },
        pickHi(lock.hi || highlightPattern === 'tips' || highlightPattern === 'ombre'),
      );
    }
  }
}

// =========================================================================
// 5. Hair Accessories Builder (5 Sculpted Accessories with Custom Tint)
// =========================================================================

function createSculptedHibiscus(accentColor: string): THREE.Group {
  const flower = new THREE.Group();
  const outerMat = new THREE.MeshPhysicalMaterial({
    color: '#fff5f9',
    roughness: 0.38,
    sheen: 0.5,
    sheenColor: new THREE.Color(accentColor),
  });
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: accentColor,
    roughness: 0.35,
    sheen: 0.65,
  });
  const stamenMat = new THREE.MeshStandardMaterial({
    color: '#fde047',
    roughness: 0.35,
    metalness: 0.08,
  });

  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(-0.09 * S, 0.07 * S, -0.1 * S, 0.21 * S, 0, 0.25 * S);
  petalShape.bezierCurveTo(0.1 * S, 0.21 * S, 0.09 * S, 0.07 * S, 0, 0);
  const petalGeo = new THREE.ExtrudeGeometry(petalShape, {
    depth: 0.018 * S,
    steps: 1,
    curveSegments: 10,
    bevelEnabled: true,
    bevelThickness: 0.008 * S,
    bevelSize: 0.008 * S,
    bevelSegments: 2,
  });
  petalGeo.translate(0, 0, -0.009 * S);

  const innerGeo = petalGeo.clone();
  innerGeo.scale(0.65, 0.65, 1.15);

  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI * 2) / 5 + 0.2;
    const outer = new THREE.Mesh(petalGeo, outerMat);
    outer.rotation.x = -0.26;
    outer.position.y = 0.01 * S;
    outer.castShadow = true;

    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -0.22;
    inner.position.set(0, 0.01 * S, 0.01 * S);

    pivot.add(outer, inner);
    flower.add(pivot);
  }

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.042 * S, 12, 10), innerMat);
  core.position.z = 0.02 * S;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01 * S, 0.016 * S, 0.16 * S, 8),
    stamenMat,
  );
  stem.rotation.x = Math.PI / 2 - 0.18;
  stem.position.set(0.01 * S, 0.015 * S, 0.08 * S);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.026 * S, 10, 8), stamenMat);
  tip.position.set(0.015 * S, 0.03 * S, 0.16 * S);

  flower.add(core, stem, tip);
  return flower;
}

function createRibbonBow(color: string): THREE.Group {
  const bow = new THREE.Group();
  const satinMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0.05,
    sheen: 0.85,
    sheenRoughness: 0.3,
    clearcoat: 0.22,
  });

  for (const side of [-1, 1]) {
    const loopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.18 * S, 0.1 * S, 0.05 * S),
      new THREE.Vector3(side * 0.26 * S, 0.01 * S, 0.02 * S),
      new THREE.Vector3(side * 0.16 * S, -0.09 * S, 0.03 * S),
      new THREE.Vector3(0, -0.01 * S, 0),
    ]);
    const loop = new THREE.Mesh(new THREE.TubeGeometry(loopCurve, 18, 0.048 * S, 8, false), satinMat);
    loop.scale.set(1, 1, 0.55);
    loop.castShadow = true;

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.03 * S, -0.02 * S, 0),
      new THREE.Vector3(side * 0.1 * S, -0.16 * S, 0.02 * S),
      new THREE.Vector3(side * 0.17 * S, -0.3 * S, -0.01 * S),
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.03 * S, 6, false), satinMat);
    tail.scale.set(1, 1, 0.4);
    bow.add(loop, tail);
  }

  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.068 * S, 12, 10), satinMat);
  knot.scale.set(0.95, 0.85, 0.72);
  bow.add(knot);
  return bow;
}

function createStarClips(color: string): THREE.Group {
  const clips = new THREE.Group();
  const starMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.2,
    metalness: 0.55,
    clearcoat: 0.7,
  });

  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.085 * S : 0.038 * S;
    const ang = (i * Math.PI) / 5 - Math.PI / 2;
    const sx = Math.cos(ang) * r;
    const sy = Math.sin(ang) * r;
    if (i === 0) starShape.moveTo(sx, sy);
    else starShape.lineTo(sx, sy);
  }
  starShape.closePath();

  const starGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.022 * S,
    bevelEnabled: true,
    bevelThickness: 0.008 * S,
    bevelSize: 0.007 * S,
    bevelSegments: 2,
  });
  starGeo.translate(0, 0, -0.011 * S);

  const clip1 = new THREE.Mesh(starGeo, starMat);
  clip1.position.set(0.42 * S, 0.42 * S, 0.56 * S);
  clip1.rotation.set(-0.24, 0.55, 0.12);
  clip1.castShadow = true;

  const clip2 = new THREE.Mesh(starGeo, starMat);
  clip2.scale.setScalar(0.76);
  clip2.position.set(0.54 * S, 0.32 * S, 0.45 * S);
  clip2.rotation.set(-0.18, 0.82, -0.22);
  clip2.castShadow = true;

  clips.add(clip1, clip2);
  return clips;
}

function createHeadband(color: string): THREE.Group {
  const bandGroup = new THREE.Group();
  const bandMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0.08,
    sheen: 0.65,
    clearcoat: 0.32,
  });

  const arcPts: THREE.Vector3[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = THREE.MathUtils.lerp(-Math.PI * 0.56, Math.PI * 0.56, t);
    const x = Math.sin(ang) * 0.69 * S;
    const y = 0.08 * S + Math.cos(ang) * 0.64 * S;
    const z = 0.14 * S + Math.cos(ang) * 0.08 * S;
    arcPts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(arcPts);
  const geo = new THREE.TubeGeometry(curve, 28, 0.048 * S, 10, false);
  const mesh = new THREE.Mesh(geo, bandMat);
  mesh.scale.set(1, 1, 1.45);
  mesh.castShadow = true;
  bandGroup.add(mesh);
  return bandGroup;
}

function createCatEars(color: string): THREE.Group {
  const earsGroup = createHeadband(shadeHex(color, -0.28));
  const outerMat = new THREE.MeshPhysicalMaterial({
    color: shadeHex(color, -0.32),
    roughness: 0.65,
    sheen: 0.8,
  });
  const innerMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.5,
    sheen: 0.7,
  });

  const earGeo = new THREE.ConeGeometry(0.18 * S, 0.36 * S, 4);
  earGeo.scale(1, 1, 0.55);
  const innerGeo = new THREE.ConeGeometry(0.11 * S, 0.24 * S, 4);
  innerGeo.scale(1, 1, 0.38);

  for (const side of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.36 * S, 0.72 * S, 0.16 * S);
    earPivot.rotation.set(0.08, side * -0.18, side * -0.34);

    const outer = new THREE.Mesh(earGeo, outerMat);
    outer.rotation.y = Math.PI / 4;
    outer.castShadow = true;

    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.y = Math.PI / 4;
    inner.position.set(0, -0.02 * S, 0.045 * S);

    earPivot.add(outer, inner);
    earsGroup.add(earPivot);
  }
  return earsGroup;
}

function populateAccessoryGroup(
  accessoryGroup: THREE.Group,
  accessoryId: HairAccessoryId,
  accessoryColor: string,
  styleId: HairStyleId,
) {
  if (accessoryId === 'none') return;

  if (accessoryId === 'hibiscus') {
    const flower = createSculptedHibiscus(accessoryColor);
    flower.position.set(0.46 * S, 0.45 * S, 0.54 * S);
    flower.rotation.set(-0.24, 0.44, -0.2);
    accessoryGroup.add(flower);
  } else if (accessoryId === 'ribbonBow') {
    const bow = createRibbonBow(accessoryColor);
    if (styleId === 'ponytail' || styleId === 'topBun') {
      bow.position.set(0, styleId === 'topBun' ? 0.68 * S : 0.38 * S, styleId === 'topBun' ? 0.04 * S : -0.62 * S);
      if (styleId === 'ponytail') bow.rotation.y = Math.PI;
    } else {
      bow.position.set(0.44 * S, 0.5 * S, 0.46 * S);
      bow.rotation.set(-0.2, 0.48, -0.25);
    }
    accessoryGroup.add(bow);
  } else if (accessoryId === 'starClips') {
    accessoryGroup.add(createStarClips(accessoryColor));
  } else if (accessoryId === 'headband') {
    accessoryGroup.add(createHeadband(accessoryColor));
  } else if (accessoryId === 'catEars') {
    accessoryGroup.add(createCatEars(accessoryColor));
  }
}

// =========================================================================
// 6. Sculpted Crown Wrap & Hairstyle Builders (15 Styles, Zero Bald Spots)
// =========================================================================

/**
 * Adds soft overlapping sculpted crown ribbons over the scalp shell so the
 * top and back of the head have rich Roblox UGC sculpted volume & silhouette.
 */
function addLayeredCrownFlow(
  crownGroup: THREE.Group,
  baseMat: THREE.Material,
  accentMat: THREE.Material,
  highlightPattern: HairHighlightPattern,
  opts: {
    partX?: number;
    backLength?: number;
    sideLength?: number;
    crownLift?: number;
  } = {},
) {
  const px = opts.partX ?? 0;
  const backLen = opts.backLength ?? -0.46;
  const sideLen = opts.sideLength ?? -0.24;
  const lift = opts.crownLift ?? 0.69;
  const pickHi = (cond: boolean) => (highlightPattern !== 'none' && cond ? accentMat : baseMat);

  // Sculpted side-crown draping locks hugging left and right sides cleanly
  for (const side of [-1, 1]) {
    const startX = px + side * 0.06;
    // Upper front-side crown wave
    addStrand(
      crownGroup,
      [
        [startX, lift, 0.14],
        [side * 0.46, 0.56, 0.3],
        [side * 0.66, 0.24, 0.24],
        [side * 0.64, sideLen, 0.12],
      ],
      { width: 0.36, thickness: 0.15, rootTaper: 0.72, tipTaper: 0.12 },
      baseMat,
    );
    // Mid-side crown drape covering upper temple & ear zone seamlessly
    addStrand(
      crownGroup,
      [
        [startX, lift, -0.06],
        [side * 0.52, 0.54, -0.08],
        [side * 0.68, 0.18, -0.14],
        [side * 0.63, sideLen - 0.12, -0.2],
      ],
      { width: 0.4, thickness: 0.16, rootTaper: 0.75, tipTaper: 0.14 },
      pickHi(side === 1 && highlightPattern === 'streaks'),
    );
    // Rear-quarter corner lock covering the 45° rear skull seam
    addStrand(
      crownGroup,
      [
        [startX * 0.5, lift - 0.02, -0.22],
        [side * 0.44, 0.48, -0.46],
        [side * 0.52, 0.08, -0.54],
        [side * 0.46, backLen, -0.5],
      ],
      { width: 0.44, thickness: 0.16, rootTaper: 0.78, tipTaper: 0.16 },
      baseMat,
    );
  }

  // Center-back sculpted occipital veil locking rear crown to nape
  addStrand(
    crownGroup,
    [
      [0, lift - 0.02, -0.24],
      [0, 0.46, -0.62],
      [0, 0.04, -0.68],
      [0, backLen, -0.62],
    ],
    { width: 0.52, thickness: 0.16, rootTaper: 0.8, tipTaper: 0.2 },
    baseMat,
  );
}

export function buildHairRig(
  hairSocket: THREE.Group,
  hair: HairConfig,
  initialHatId: string,
): RobloxHairRig {
  // Dispose previous children safely (preserving shared bump map)
  while (hairSocket.children.length > 0) {
    const child = hairSocket.children[0];
    hairSocket.remove(child);
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

  const root = new THREE.Group();
  hairSocket.add(root);

  // 5-Layer Gap-Free Rig Hierarchy:
  // 1. scalpShellGroup — locked >= 1.0x scale so head NEVER pokes through!
  // 2. crownStrandsGroup — scales with volume & compresses cleanly under hats
  // 3. bangsGroup — auto or mix-and-match fringe with subtle physics
  // 4. sidesGroup — face-framing cheek/shoulder locks with subtle physics
  // 5. tailPivot — dynamic back hair/ponytail/braids with inertia sway
  // 6. accessoryGroup — hibiscus, bow, star clips, headband, cat ears
  const scalpShellGroup = new THREE.Group();
  const volumeGroup = new THREE.Group();
  const crownStrandsGroup = new THREE.Group();
  const bangsGroup = new THREE.Group();
  const sidesGroup = new THREE.Group();
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.14 * S, -0.58 * S);
  const accessoryGroup = new THREE.Group();

  volumeGroup.add(crownStrandsGroup, bangsGroup, sidesGroup, tailPivot, accessoryGroup);
  root.add(scalpShellGroup, volumeGroup);

  const resolvedAccessory: HairAccessoryId =
    hair.accessoryId ?? (hair.flowerAccessory ? 'hibiscus' : 'none');
  const resolvedAccessoryColor = hair.accessoryColor ?? '#f472b6';

  if (hair.styleId === 'none') {
    populateAccessoryGroup(accessoryGroup, resolvedAccessory, resolvedAccessoryColor, 'none');
    return {
      root,
      applyHatTuck: (tuck) => {
        accessoryGroup.visible = tuck !== 'fullCover';
      },
      applyPhysics: () => {},
    };
  }

  // Safe Volume Scaling:
  // Outer strands scale smoothly (0.88..1.20), while scalpShellGroup NEVER shrinks < 1.0!
  const vol = THREE.MathUtils.clamp(hair.volume || 1, 0.85, 1.25);
  const outerScale = 0.94 + (vol - 0.85) * (0.24 / 0.4); // 0.94 at 85% .. 1.18 at 125%
  volumeGroup.scale.setScalar(outerScale);
  const safeScalpScale = vol > 1 ? 1 + (vol - 1) * 0.25 : 1.0;
  scalpShellGroup.scale.setScalar(safeScalpScale);

  const mats = createHairMaterialSet(hair);
  const { baseMat, accentMat, scalpMat, fadeScalpMat, tieMat } = mats;
  const pickHi = (cond: boolean) =>
    hair.highlightPattern !== 'none' && cond ? accentMat : baseMat;

  const style: HairStyleId = hair.styleId;

  const addScalp = (opts: ScalpShellOptions = {}, useFade = false) => {
    const mesh = new THREE.Mesh(
      createScalpShellGeometry(opts),
      useFade ? fadeScalpMat : scalpMat,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scalpShellGroup.add(mesh);
  };

  // -----------------------------------------------------------------------
  // BUILD EACH OF THE 15 SCULPTED UGC HAIRSTYLES
  // -----------------------------------------------------------------------

  if (style === 'longWavyPart') {
    addScalp({ partX: 0, crownLift: 0.08, sideDropY: -0.26, backDropY: -0.49 });
    addLayeredCrownFlow(crownStrandsGroup, baseMat, accentMat, hair.highlightPattern, {
      partX: 0,
      sideLength: -0.34,
      backLength: -0.52,
      crownLift: 0.71,
    });

    // Asymmetric sweeping front shoulder S-wave (viewer-left -X)
    addStrand(
      sidesGroup,
      [
        [-0.36, 0.56, 0.28],
        [-0.68, 0.26, 0.3],
        [-0.76, -0.26, 0.36],
        [-0.66, -0.78, 0.46],
        [-0.78, -1.24, 0.42],
        [-0.62, -1.62, 0.36],
      ],
      { width: 0.42, thickness: 0.18, segments: 18, rootTaper: 0.65, tipTaper: 0.06, roll: 0.22 },
      pickHi(hair.highlightPattern === 'ombre' || hair.highlightPattern === 'tips'),
    );
    addStrand(
      sidesGroup,
      [
        [-0.44, 0.48, 0.1],
        [-0.72, 0.06, 0.14],
        [-0.68, -0.52, 0.22],
        [-0.76, -1.08, 0.26],
        [-0.58, -1.52, 0.24],
      ],
      { width: 0.34, thickness: 0.16, segments: 16, rootTaper: 0.6, tipTaper: 0.05 },
      pickHi(hair.highlightPattern === 'streaks'),
    );

    // Sleek sculpted cascading right-side wave (+X)
    addStrand(
      sidesGroup,
      [
        [0.36, 0.56, 0.26],
        [0.68, 0.24, 0.26],
        [0.72, -0.34, 0.3],
        [0.66, -0.94, 0.36],
        [0.58, -1.5, 0.3],
      ],
      { width: 0.38, thickness: 0.17, segments: 16, rootTaper: 0.65, tipTaper: 0.06, roll: -0.18 },
      pickHi(hair.highlightPattern === 'ombre' || hair.highlightPattern === 'tips'),
    );
    addStrand(
      sidesGroup,
      [
        [0.44, 0.46, 0.06],
        [0.7, 0.02, 0.08],
        [0.68, -0.62, 0.12],
        [0.58, -1.26, 0.1],
      ],
      { width: 0.32, thickness: 0.15, segments: 14 },
      baseMat,
    );

    // Lush multi-strand wavy back curtain in tailPivot (relative to (0, 0.14*S, -0.58*S))
    const backCols = [-0.52, -0.26, 0, 0.26, 0.52];
    backCols.forEach((bx, idx) => {
      const waveDir = idx % 2 === 0 ? 1 : -1;
      const len = idx === 2 ? -1.68 : idx === 1 || idx === 3 ? -1.6 : -1.44;
      addStrand(
        tailPivot,
        [
          [bx * 0.85, 0.24, 0.04],
          [bx * 1.05, -0.24, -0.1],
          [bx * 1.12 + waveDir * 0.06, -0.78, -0.2],
          [bx * 1.04 - waveDir * 0.05, -1.26, -0.14],
          [bx * 0.9, len, -0.2],
        ],
        {
          width: idx === 2 ? 0.46 : 0.4,
          thickness: 0.17,
          segments: 16,
          rootTaper: 0.78,
          tipTaper: 0.08,
          outwardHint: [bx * 0.3, 0, -1],
        },
        pickHi(
          hair.highlightPattern === 'ombre' ||
            hair.highlightPattern === 'tips' ||
            (hair.highlightPattern === 'streaks' && idx % 2 === 1),
        ),
      );
    });
  } else if (style === 'wolfCut') {
    // NEW: Shaggy layered Roblox UGC Wolf Cut
    addScalp({ partX: 0, crownLift: 0.085, sideDropY: -0.24, backDropY: -0.49 });
    addLayeredCrownFlow(crownStrandsGroup, baseMat, accentMat, hair.highlightPattern, {
      partX: 0,
      sideLength: -0.28,
      backLength: -0.48,
      crownLift: 0.72,
    });

    // Shaggy upper crown chop layers
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI * 0.85 + (i / 5) * Math.PI * 1.7;
      const sx = Math.sin(ang);
      const sz = Math.cos(ang);
      if (sz > 0.55) continue;
      addStrand(
        crownStrandsGroup,
        [
          [sx * 0.24, 0.72, sz * 0.24],
          [sx * 0.64, 0.52, sz * 0.64],
          [sx * 0.76, 0.14, sz * 0.72],
          [sx * 0.84, -0.14, sz * 0.74],
        ],
        { width: 0.28, thickness: 0.13, segments: 12, rootTaper: 0.6, tipTaper: 0.04 },
        pickHi(i % 2 === 1),
      );
    }

    // Iconic cheek-hugging inward wolf-cut flicks that kick outward at jaw
    addMirroredStrandPair(
      sidesGroup,
      [
        [0.42, 0.52, 0.22],
        [0.68, 0.18, 0.34],
        [0.6, -0.24, 0.44],
        [0.74, -0.56, 0.38],
      ],
      { width: 0.3, thickness: 0.13, segments: 14, rootTaper: 0.62, tipTaper: 0.04 },
      pickHi(hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      pickHi(hair.highlightPattern !== 'none'),
    );
    addMirroredStrandPair(
      sidesGroup,
      [
        [0.46, 0.46, 0.0],
        [0.72, 0.08, 0.06],
        [0.68, -0.42, 0.16],
        [0.82, -0.82, 0.12],
      ],
      { width: 0.32, thickness: 0.14, segments: 14, rootTaper: 0.64, tipTaper: 0.05 },
      baseMat,
    );

    // Feathered mullet-drape rear layers in tailPivot
    const rearCols = [-0.54, -0.28, 0, 0.28, 0.54];
    rearCols.forEach((bx, idx) => {
      const len = idx === 2 ? -1.24 : idx === 1 || idx === 3 ? -1.16 : -0.98;
      addStrand(
        tailPivot,
        [
          [bx * 0.84, 0.22, 0.04],
          [bx * 1.06, -0.22, -0.12],
          [bx * 1.14, -0.68, -0.16],
          [bx * 1.24, len, -0.28],
        ],
        {
          width: 0.34,
          thickness: 0.14,
          segments: 14,
          rootTaper: 0.72,
          tipTaper: 0.05,
          outwardHint: [bx * 0.35, 0, -1],
        },
        pickHi(idx % 2 === 0 || hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      );
    });
  } else if (style === 'messyFluffy') {
    // NEW: Soft tousled Roblox UGC Messy Fluffy cut
    addScalp({ crownLift: 0.09, radialPad: 0.05, sideDropY: -0.2, backDropY: -0.46 });

    // Tousled layered cloud-like sculpted locks sweeping organically around entire head
    const fluffLocks: { pts: StudPt[]; w: number; th: number; hi: boolean }[] = [
      // Top voluminous swept fluff peaks
      {
        pts: [
          [-0.22, 0.66, -0.12],
          [-0.08, 0.84, 0.08],
          [0.24, 0.76, 0.38],
          [0.44, 0.48, 0.56],
        ],
        w: 0.36,
        th: 0.18,
        hi: true,
      },
      {
        pts: [
          [0.18, 0.68, -0.18],
          [0.02, 0.85, -0.02],
          [-0.32, 0.72, 0.28],
          [-0.5, 0.42, 0.5],
        ],
        w: 0.36,
        th: 0.18,
        hi: false,
      },
      {
        pts: [
          [0.0, 0.7, 0.04],
          [0.22, 0.82, -0.24],
          [0.46, 0.54, -0.54],
          [0.52, 0.08, -0.62],
        ],
        w: 0.38,
        th: 0.18,
        hi: false,
      },
      {
        pts: [
          [-0.06, 0.7, 0.0],
          [-0.28, 0.8, -0.26],
          [-0.5, 0.52, -0.52],
          [-0.54, 0.06, -0.62],
        ],
        w: 0.38,
        th: 0.18,
        hi: true,
      },
      {
        pts: [
          [0, 0.72, -0.08],
          [0, 0.76, -0.46],
          [0.06, 0.36, -0.72],
          [0.02, -0.22, -0.68],
          [0, -0.48, -0.62],
        ],
        w: 0.46,
        th: 0.19,
        hi: false,
      },
    ];
    for (const fl of fluffLocks) {
      addStrand(
        crownStrandsGroup,
        fl.pts,
        { width: fl.w, thickness: fl.th, segments: 14, rootTaper: 0.72, tipTaper: 0.06 },
        pickHi(fl.hi || hair.highlightPattern === 'ombre'),
      );
    }

    // Fluffy outward-tousled side & rear curls framing the head silhouette
    for (const side of [-1, 1]) {
      addStrand(
        sidesGroup,
        [
          [side * 0.34, 0.62, 0.18],
          [side * 0.72, 0.38, 0.24],
          [side * 0.76, 0.0, 0.2],
          [side * 0.64, -0.3, 0.28],
        ],
        { width: 0.34, thickness: 0.16, segments: 13, rootTaper: 0.68, tipTaper: 0.06 },
        pickHi(side === 1 && hair.highlightPattern === 'streaks'),
      );
      addStrand(
        sidesGroup,
        [
          [side * 0.38, 0.56, -0.14],
          [side * 0.74, 0.28, -0.2],
          [side * 0.74, -0.14, -0.24],
          [side * 0.58, -0.44, -0.32],
        ],
        { width: 0.36, thickness: 0.16, segments: 13, rootTaper: 0.7, tipTaper: 0.07 },
        baseMat,
      );
      addStrand(
        crownStrandsGroup,
        [
          [side * 0.28, 0.52, -0.46],
          [side * 0.46, 0.16, -0.68],
          [side * 0.36, -0.36, -0.66],
        ],
        { width: 0.36, thickness: 0.16, segments: 12, rootTaper: 0.7, tipTaper: 0.07 },
        pickHi(hair.highlightPattern === 'tips'),
      );
    }
  } else if (style === 'topBun') {
    // NEW: Sleek pulled-up crown + twisted high bun + soft front tendrils
    addScalp({ crownLift: 0.072, sideDropY: -0.14, backDropY: -0.44 });

    // Sleek pulled-up crown contour strands sweeping toward the bun anchor (0, 0.66, -0.24)
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const sx = Math.sin(ang);
      const sz = Math.cos(ang);
      const startY = sz > 0.3 ? 0.38 : sz < -0.3 ? -0.34 : 0.02;
      addStrand(
        crownStrandsGroup,
        [
          [sx * 0.62, startY, sz * 0.62],
          [sx * 0.58, Math.max(0.42, startY + 0.32), sz * 0.54],
          [sx * 0.24, 0.66, sz * 0.14 - 0.16],
          [0, 0.68, -0.24],
        ],
        { width: 0.32, thickness: 0.1, segments: 12, rootTaper: 0.8, tipTaper: 0.45 },
        pickHi(i % 3 === 0 && hair.highlightPattern === 'streaks'),
      );
    }

    // Sculpted coiled high bun perched at top-back crown
    const bunGroup = new THREE.Group();
    bunGroup.position.set(0, 0.78 * S, -0.26 * S);
    bunGroup.rotation.x = -0.35;

    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.24 * S, 0.048 * S, 10, 22), tieMat);
    tie.rotation.x = Math.PI / 2;
    tie.position.y = -0.1 * S;
    bunGroup.add(tie);

    const bunCore = new THREE.Mesh(new THREE.SphereGeometry(0.29 * S, 18, 14), baseMat);
    bunCore.scale.set(1.08, 0.86, 1.08);
    bunCore.position.y = 0.05 * S;
    bunCore.castShadow = true;
    bunGroup.add(bunCore);

    // Spiraling braided coils wrapped around the bun
    for (let c = 0; c < 3; c++) {
      const coilPts: StudPt[] = [];
      for (let k = 0; k <= 12; k++) {
        const frac = k / 12;
        const a = frac * Math.PI * 1.85 + (c * Math.PI * 2) / 3;
        const rad = 0.26 - frac * 0.12;
        coilPts.push([Math.cos(a) * rad, -0.06 + frac * 0.26, Math.sin(a) * rad]);
      }
      addStrand(
        bunGroup,
        coilPts,
        {
          width: 0.17,
          thickness: 0.13,
          segments: 16,
          rootTaper: 0.75,
          tipTaper: 0.35,
          outwardHint: [0, 1, 0],
        },
        pickHi(c === 1 || hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      );
    }
    crownStrandsGroup.add(bunGroup);

    // Delicate face-framing loose cheek tendrils
    addMirroredStrandPair(
      sidesGroup,
      [
        [0.44, 0.44, 0.36],
        [0.62, 0.18, 0.44],
        [0.6, -0.16, 0.42],
        [0.54, -0.44, 0.36],
      ],
      { width: 0.14, thickness: 0.08, segments: 12, rootTaper: 0.55, tipTaper: 0.04 },
      pickHi(hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
    );
  } else if (style === 'texturedFade') {
    // NEW: Seamless tapered buzz-fade scalp + sculpted wavy/curly top crop
    addScalp({ crownLift: 0.06, radialPad: 0.04, foreheadY: 0.34, sideDropY: -0.08, backDropY: -0.42 }, true);

    // Sculpted layered textured crop locks across the top crown
    const cropClusters: { pts: StudPt[]; w: number; hi: boolean }[] = [
      { pts: [[-0.22, 0.62, -0.36], [-0.14, 0.78, -0.1], [-0.08, 0.76, 0.24], [-0.06, 0.56, 0.56]], w: 0.32, hi: false },
      { pts: [[0.22, 0.62, -0.36], [0.16, 0.8, -0.08], [0.14, 0.76, 0.26], [0.18, 0.56, 0.55]], w: 0.32, hi: true },
      { pts: [[0, 0.64, -0.44], [0.02, 0.84, -0.12], [0.04, 0.82, 0.24], [0.02, 0.58, 0.6]], w: 0.36, hi: false },
      { pts: [[-0.4, 0.58, -0.26], [-0.46, 0.72, 0.02], [-0.42, 0.66, 0.34], [-0.36, 0.48, 0.54]], w: 0.28, hi: true },
      { pts: [[0.4, 0.58, -0.26], [0.46, 0.72, 0.02], [0.42, 0.66, 0.34], [0.36, 0.48, 0.54]], w: 0.28, hi: false },
      { pts: [[-0.3, 0.62, -0.42], [-0.18, 0.74, -0.52], [-0.12, 0.46, -0.62]], w: 0.3, hi: false },
      { pts: [[0.3, 0.62, -0.42], [0.18, 0.74, -0.52], [0.12, 0.46, -0.62]], w: 0.3, hi: true },
    ];
    for (const c of cropClusters) {
      addStrand(
        crownStrandsGroup,
        c.pts,
        { width: c.w, thickness: 0.17, segments: 12, rootTaper: 0.76, tipTaper: 0.14 },
        pickHi(c.hi || hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      );
    }
  } else if (style === 'spiky') {
    addScalp({ crownLift: 0.072, sideDropY: -0.14, backDropY: -0.45 });

    // Sculpted layered curved anime/UGC spikes radiating dynamically from the crown
    const spikes: { pts: StudPt[]; w: number; th: number; hi: boolean }[] = [
      // Central crown hero spikes
      { pts: [[0, 0.62, 0.06], [0.02, 0.88, 0.28], [0.04, 1.06, 0.56]], w: 0.34, th: 0.2, hi: false },
      { pts: [[0, 0.64, -0.12], [-0.04, 0.94, -0.02], [-0.08, 1.14, 0.16]], w: 0.34, th: 0.2, hi: true },
      { pts: [[0, 0.62, -0.28], [0, 0.86, -0.48], [0.02, 0.96, -0.78]], w: 0.36, th: 0.2, hi: false },
      // Side crown flared spikes
      { pts: [[-0.22, 0.6, 0.1], [-0.48, 0.82, 0.22], [-0.74, 0.9, 0.34]], w: 0.3, th: 0.18, hi: true },
      { pts: [[0.22, 0.6, 0.1], [0.48, 0.82, 0.22], [0.74, 0.9, 0.34]], w: 0.3, th: 0.18, hi: false },
      { pts: [[-0.26, 0.58, -0.22], [-0.56, 0.74, -0.36], [-0.82, 0.72, -0.52]], w: 0.32, th: 0.18, hi: false },
      { pts: [[0.26, 0.58, -0.22], [0.56, 0.74, -0.36], [0.82, 0.72, -0.52]], w: 0.32, th: 0.18, hi: true },
      // Lower rear-skull flared spikes
      { pts: [[-0.36, 0.36, -0.44], [-0.66, 0.24, -0.64], [-0.84, 0.04, -0.74]], w: 0.28, th: 0.15, hi: false },
      { pts: [[0.36, 0.36, -0.44], [0.66, 0.24, -0.64], [0.84, 0.04, -0.74]], w: 0.28, th: 0.15, hi: true },
      { pts: [[0, 0.32, -0.56], [0, 0.16, -0.82], [0, -0.1, -0.92]], w: 0.34, th: 0.17, hi: false },
      // Sideburn spikes
      { pts: [[-0.5, 0.36, 0.18], [-0.68, 0.14, 0.28], [-0.68, -0.22, 0.34]], w: 0.22, th: 0.12, hi: false },
      { pts: [[0.5, 0.36, 0.18], [0.68, 0.14, 0.28], [0.68, -0.22, 0.34]], w: 0.22, th: 0.12, hi: false },
    ];
    for (const sp of spikes) {
      addStrand(
        crownStrandsGroup,
        sp.pts,
        { width: sp.w, thickness: sp.th, segments: 12, rootTaper: 0.85, tipTaper: 0.03 },
        pickHi(sp.hi || hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      );
    }
  } else if (style === 'swept') {
    addScalp({ partX: -0.22, crownLift: 0.075, sideDropY: -0.18, backDropY: -0.46 });
    addLayeredCrownFlow(crownStrandsGroup, baseMat, accentMat, hair.highlightPattern, {
      partX: -0.2,
      sideLength: -0.24,
      backLength: -0.48,
      crownLift: 0.72,
    });

    // Sculpted sweeping diagonal crest waves flowing left-to-right across crown
    for (let i = 0; i < 3; i++) {
      const zOff = 0.22 - i * 0.22;
      addStrand(
        crownStrandsGroup,
        [
          [-0.42, 0.56, zOff],
          [-0.08, 0.78, zOff + 0.08],
          [0.34, 0.72, zOff + 0.06],
          [0.66, 0.42, zOff - 0.02],
          [0.68, -0.04, zOff - 0.08],
        ],
        { width: 0.36, thickness: 0.16, segments: 14, rootTaper: 0.7, tipTaper: 0.08 },
        pickHi(i === 0 || (hair.highlightPattern === 'streaks' && i === 1)),
      );
    }

    // Tapered sculpted sideburns
    addMirroredStrandPair(
      sidesGroup,
      [
        [0.46, 0.42, 0.26],
        [0.64, 0.14, 0.32],
        [0.62, -0.26, 0.3],
      ],
      { width: 0.22, thickness: 0.11, segments: 10 },
      baseMat,
    );
  } else if (style === 'sidePart') {
    addScalp({ partX: -0.2, crownLift: 0.07, sideDropY: -0.16, backDropY: -0.46 });
    addLayeredCrownFlow(crownStrandsGroup, baseMat, accentMat, hair.highlightPattern, {
      partX: -0.2,
      sideLength: -0.2,
      backLength: -0.48,
      crownLift: 0.7,
    });

    // Sleek sculpted major side wave (+X)
    addStrand(
      crownStrandsGroup,
      [
        [-0.18, 0.66, 0.26],
        [0.14, 0.74, 0.22],
        [0.54, 0.58, 0.14],
        [0.66, 0.16, 0.06],
        [0.64, -0.18, 0.02],
      ],
      { width: 0.42, thickness: 0.15, segments: 14, rootTaper: 0.75, tipTaper: 0.12 },
      baseMat,
    );
    // Minor neat comb-down wave (-X)
    addStrand(
      crownStrandsGroup,
      [
        [-0.22, 0.64, 0.22],
        [-0.48, 0.54, 0.18],
        [-0.65, 0.2, 0.12],
        [-0.62, -0.18, 0.06],
      ],
      { width: 0.34, thickness: 0.13, segments: 12, rootTaper: 0.72, tipTaper: 0.12 },
      pickHi(hair.highlightPattern === 'streaks'),
    );
  } else if (style === 'undercut') {
    // Seamless dark buzzed fade sides + sculptural sweeping pompadour locks
    addScalp({ crownLift: 0.06, radialPad: 0.04, foreheadY: 0.34, sideDropY: -0.08, backDropY: -0.44 }, true);

    // Multi-ribbon sculpted pompadour curving boldly upward and back over the crown
    const pompCols = [-0.26, 0, 0.26];
    pompCols.forEach((px, idx) => {
      addStrand(
        crownStrandsGroup,
        [
          [px * 0.85, 0.44, 0.52],
          [px * 0.95, 0.74, 0.58],
          [px, 0.92, 0.18],
          [px * 0.92, 0.82, -0.26],
          [px * 0.7, 0.54, -0.58],
        ],
        {
          width: idx === 1 ? 0.42 : 0.32,
          thickness: 0.2,
          segments: 16,
          rootTaper: 0.65,
          tipTaper: 0.18,
          outwardHint: [px * 0.4, 1, 0.1],
        },
        pickHi(idx === 2 || (idx === 1 && hair.highlightPattern === 'ombre')),
      );
    });
    // Swept side-crest lock tucking cleanly into the fade transition
    addMirroredStrandPair(
      crownStrandsGroup,
      [
        [0.36, 0.56, 0.38],
        [0.48, 0.76, 0.08],
        [0.44, 0.68, -0.32],
        [0.32, 0.44, -0.56],
      ],
      { width: 0.26, thickness: 0.15, segments: 12, rootTaper: 0.68, tipTaper: 0.14 },
      baseMat,
      pickHi(hair.highlightPattern === 'streaks'),
    );
  } else if (style === 'bob') {
    addScalp({ partX: 0, crownLift: 0.078, sideDropY: -0.24, backDropY: -0.48 });
    addLayeredCrownFlow(crownStrandsGroup, baseMat, accentMat, hair.highlightPattern, {
      partX: 0,
      sideLength: -0.32,
      backLength: -0.5,
      crownLift: 0.7,
    });

    // Chin-length sculpted curved cheek curtains tucking inward around jaw
    addMirroredStrandPair(
      sidesGroup,
      [
        [0.34, 0.56, 0.24],
        [0.68, 0.24, 0.26],
        [0.74, -0.24, 0.28],
        [0.62, -0.66, 0.34],
        [0.46, -0.78, 0.36],
      ],
      { width: 0.38, thickness: 0.17, segments: 16, rootTaper: 0.66, tipTaper: 0.08 },
      pickHi(hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      pickHi(hair.highlightPattern !== 'none'),
    );
    addMirroredStrandPair(
      sidesGroup,
      [
        [0.4, 0.5, 0.0],
        [0.74, 0.12, 0.02],
        [0.74, -0.34, 0.04],
        [0.58, -0.74, 0.08],
      ],
      { width: 0.4, thickness: 0.17, segments: 14, rootTaper: 0.7, tipTaper: 0.12 },
      baseMat,
    );

    // Rounded sculpted back bob shell in tailPivot
    const bobCols = [-0.46, -0.22, 0, 0.22, 0.46];
    bobCols.forEach((bx, idx) => {
      addStrand(
        tailPivot,
        [
          [bx * 0.85, 0.24, 0.04],
          [bx * 1.08, -0.14, -0.14],
          [bx * 1.12, -0.54, -0.16],
          [bx * 0.94, -0.84, -0.02],
        ],
        {
          width: 0.38,
          thickness: 0.16,
          segments: 14,
          rootTaper: 0.78,
          tipTaper: 0.22,
          outwardHint: [bx * 0.3, 0, -1],
        },
        pickHi(hair.highlightPattern === 'ombre' || hair.highlightPattern === 'tips' || (hair.highlightPattern === 'streaks' && idx % 2 === 1)),
      );
    });
  } else if (style === 'curly') {
    addScalp({ crownLift: 0.09, radialPad: 0.055, sideDropY: -0.22, backDropY: -0.47 });

    // Lush sculpted afro halo made of overlapping organic textured curl domes & spiral locks
    const puffGeo = new THREE.IcosahedronGeometry(0.26 * S, 2);
    const curlNodes: [number, number, number, number, boolean][] = [
      [0, 0.82, 0.02, 1.15, false],
      [-0.36, 0.74, 0.24, 1.08, true],
      [0.36, 0.74, 0.24, 1.08, false],
      [0, 0.72, 0.42, 1.02, true],
      [-0.44, 0.68, -0.18, 1.12, false],
      [0.44, 0.68, -0.18, 1.12, true],
      [0, 0.7, -0.44, 1.12, false],
      [-0.28, 0.74, -0.36, 1.06, true],
      [0.28, 0.74, -0.36, 1.06, false],
      [-0.64, 0.46, 0.08, 1.06, false],
      [0.64, 0.46, 0.08, 1.06, true],
      [-0.66, 0.22, -0.26, 1.04, true],
      [0.66, 0.22, -0.26, 1.04, false],
      [-0.44, 0.24, -0.58, 1.06, false],
      [0.44, 0.24, -0.58, 1.06, true],
      [0, 0.28, -0.66, 1.1, false],
      [-0.34, -0.1, -0.58, 0.96, true],
      [0.34, -0.1, -0.58, 0.96, false],
      [0, -0.12, -0.64, 1.0, false],
      [-0.68, 0.08, 0.16, 0.96, false],
      [0.68, 0.08, 0.16, 0.96, true],
      [-0.58, -0.22, 0.04, 0.88, true],
      [0.58, -0.22, 0.04, 0.88, false],
    ];
    for (const [x, y, z, sc, hi] of curlNodes) {
      const puff = new THREE.Mesh(
        puffGeo,
        pickHi(hi || hair.highlightPattern === 'ombre'),
      );
      puff.position.set(x * S, y * S, z * S);
      puff.scale.set(sc * 1.06, sc * 0.96, sc * 1.04);
      puff.rotation.set(x * 2, y * 2, z * 2);
      puff.castShadow = true;
      puff.receiveShadow = true;
      crownStrandsGroup.add(puff);
    }
  } else if (style === 'mohawk') {
    // Seamless dark shaved-side scalp shell + dramatic sculpted sweeping crest flames
    addScalp({ crownLift: 0.055, radialPad: 0.04, foreheadY: 0.34, sideDropY: -0.06, backDropY: -0.44 }, true);

    const crestPlumes: { pts: StudPt[]; w: number; hi: boolean }[] = [
      { pts: [[0, 0.44, 0.56], [0, 0.84, 0.72], [0, 1.08, 0.82]], w: 0.24, hi: true },
      { pts: [[0, 0.62, 0.32], [0, 0.98, 0.42], [0, 1.22, 0.46]], w: 0.28, hi: false },
      { pts: [[0, 0.66, 0.06], [0, 1.04, 0.04], [0, 1.24, -0.06]], w: 0.3, hi: true },
      { pts: [[0, 0.64, -0.2], [0, 0.98, -0.34], [0, 1.12, -0.56]], w: 0.28, hi: false },
      { pts: [[0, 0.48, -0.48], [0, 0.66, -0.78], [0, 0.68, -1.04]], w: 0.26, hi: true },
      { pts: [[0, 0.14, -0.6], [0, 0.14, -0.88], [0, -0.04, -1.04]], w: 0.24, hi: false },
      { pts: [[0, -0.22, -0.6], [0, -0.34, -0.82], [0, -0.52, -0.9]], w: 0.22, hi: true },
    ];
    for (const p of crestPlumes) {
      addStrand(
        crownStrandsGroup,
        p.pts,
        {
          width: p.w,
          thickness: 0.24,
          segments: 12,
          rootTaper: 0.85,
          tipTaper: 0.04,
          outwardHint: [1, 0, 0], // align width along X so plumes stay razor-sculpted
        },
        pickHi(p.hi || hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      );
    }
  } else if (style === 'ponytail') {
    addScalp({ partX: 0, crownLift: 0.072, sideDropY: -0.16, backDropY: -0.46 });

    // Sleek pulled-back sculpted crown tension ribbons leading to rear tie
    for (const side of [-1, 1]) {
      addStrand(
        crownStrandsGroup,
        [
          [side * 0.26, 0.56, 0.38],
          [side * 0.54, 0.54, 0.06],
          [side * 0.44, 0.4, -0.44],
          [side * 0.1, 0.26, -0.62],
        ],
        { width: 0.34, thickness: 0.12, segments: 12, rootTaper: 0.72, tipTaper: 0.35 },
        baseMat,
      );
      addStrand(
        crownStrandsGroup,
        [
          [side * 0.48, 0.28, 0.22],
          [side * 0.62, 0.22, -0.16],
          [side * 0.38, 0.2, -0.54],
          [side * 0.08, 0.2, -0.62],
        ],
        { width: 0.3, thickness: 0.11, segments: 12, rootTaper: 0.68, tipTaper: 0.35 },
        pickHi(side === 1 && hair.highlightPattern === 'streaks'),
      );
    }

    // Sculpted ribbon hair tie at tailPivot
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.16 * S, 0.052 * S, 10, 20), tieMat);
    tie.rotation.x = Math.PI / 2 - 0.32;
    tie.position.set(0, 0.08 * S, -0.02 * S);
    tailPivot.add(tie);

    // Lush cascading multi-strand high ponytail in tailPivot
    const tailStrands: { pts: StudPt[]; w: number; th: number; hi: boolean }[] = [
      {
        pts: [
          [0, 0.1, -0.04],
          [0, 0.16, -0.34],
          [0, -0.3, -0.54],
          [0, -0.96, -0.42],
          [0, -1.48, -0.56],
        ],
        w: 0.42,
        th: 0.22,
        hi: false,
      },
      {
        pts: [
          [-0.08, 0.08, -0.06],
          [-0.22, 0.08, -0.32],
          [-0.3, -0.42, -0.46],
          [-0.22, -1.04, -0.36],
          [-0.14, -1.38, -0.44],
        ],
        w: 0.32,
        th: 0.16,
        hi: true,
      },
      {
        pts: [
          [0.08, 0.08, -0.06],
          [0.22, 0.08, -0.32],
          [0.3, -0.42, -0.46],
          [0.22, -1.04, -0.36],
          [0.14, -1.38, -0.44],
        ],
        w: 0.32,
        th: 0.16,
        hi: false,
      },
      {
        pts: [
          [0, 0.12, -0.06],
          [0, 0.22, -0.42],
          [0, -0.18, -0.64],
          [0.06, -0.78, -0.56],
          [0, -1.24, -0.68],
        ],
        w: 0.28,
        th: 0.14,
        hi: true,
      },
    ];
    for (const ts of tailStrands) {
      addStrand(
        tailPivot,
        ts.pts,
        {
          width: ts.w,
          thickness: ts.th,
          segments: 16,
          rootTaper: 0.5,
          tipTaper: 0.04,
          outwardHint: [0, 0.15, -1],
        },
        pickHi(ts.hi || hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      );
    }
  } else if (style === 'twinTails') {
    addScalp({ partX: 0, crownLift: 0.075, sideDropY: -0.18, backDropY: -0.46 });
    addLayeredCrownFlow(crownStrandsGroup, baseMat, accentMat, hair.highlightPattern, {
      partX: 0,
      sideLength: -0.22,
      backLength: -0.48,
      crownLift: 0.7,
    });

    for (const side of [-1, 1]) {
      const scrunchie = new THREE.Mesh(new THREE.TorusGeometry(0.14 * S, 0.048 * S, 10, 18), tieMat);
      scrunchie.rotation.y = Math.PI / 2;
      scrunchie.position.set(side * 0.66 * S, 0.12 * S, 0.36 * S);
      tailPivot.add(scrunchie);

      // Outer flowing twin-tail main plume
      addStrand(
        tailPivot,
        [
          [side * 0.66, 0.12, 0.34],
          [side * 0.92, 0.08, 0.26],
          [side * 1.06, -0.42, 0.18],
          [side * 0.96, -0.96, 0.24],
          [side * 1.08, -1.36, 0.16],
        ],
        {
          width: 0.38,
          thickness: 0.2,
          segments: 16,
          rootTaper: 0.45,
          tipTaper: 0.04,
          outwardHint: [side, 0, -0.2],
        },
        pickHi(hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
      );
      // Inner layered accent tail wave
      addStrand(
        tailPivot,
        [
          [side * 0.66, 0.1, 0.32],
          [side * 0.86, -0.02, 0.18],
          [side * 0.92, -0.58, 0.1],
          [side * 0.84, -1.12, 0.16],
        ],
        {
          width: 0.28,
          thickness: 0.15,
          segments: 14,
          rootTaper: 0.42,
          tipTaper: 0.04,
          outwardHint: [side, 0, -0.4],
        },
        pickHi(side === 1 || hair.highlightPattern === 'streaks'),
      );
    }
  } else if (style === 'braids') {
    addScalp({ partX: 0, crownLift: 0.075, sideDropY: -0.2, backDropY: -0.47 });
    addLayeredCrownFlow(crownStrandsGroup, baseMat, accentMat, hair.highlightPattern, {
      partX: 0,
      sideLength: -0.24,
      backLength: -0.48,
      crownLift: 0.7,
    });

    // Sculpted interwoven dual braids hanging cleanly in tailPivot
    const plaitGeo = new THREE.SphereGeometry(0.145 * S, 12, 10);
    for (const side of [-1, 1]) {
      for (let seg = 0; seg < 6; seg++) {
        const sc = 1 - seg * 0.055;
        const yPos = (-0.06 - seg * 0.19) * S;
        const zPos = (-0.06 - Math.sin(seg * 0.5) * 0.02) * S;
        const useHi =
          (seg >= 4 && (hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre')) ||
          (seg % 2 === 1 && hair.highlightPattern === 'streaks');

        // Interlocking left/right woven lobes per braid segment
        for (const lobe of [-1, 1]) {
          const plait = new THREE.Mesh(plaitGeo, pickHi(useHi));
          plait.position.set(
            (side * 0.38 + lobe * 0.055 * sc) * S,
            yPos + (lobe === 1 ? -0.045 * S : 0.045 * S),
            zPos,
          );
          plait.scale.set(0.95 * sc, 1.2 * sc, 0.88 * sc);
          plait.rotation.z = lobe * 0.42;
          plait.castShadow = true;
          tailPivot.add(plait);
        }
      }

      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.085 * S, 0.032 * S, 8, 16), tieMat);
      tie.rotation.x = Math.PI / 2;
      tie.position.set(side * 0.38 * S, -1.16 * S, -0.06 * S);
      tailPivot.add(tie);

      // Sculpted soft tapered tassel tip
      addStrand(
        tailPivot,
        [
          [side * 0.38, -1.15, -0.06],
          [side * 0.39, -1.32, -0.08],
          [side * 0.38, -1.5, -0.05],
        ],
        {
          width: 0.16,
          thickness: 0.13,
          segments: 8,
          rootTaper: 0.72,
          tipTaper: 0.04,
          outwardHint: [0, 0, -1],
        },
        pickHi(hair.highlightPattern !== 'none'),
      );
    }
  }

  // -----------------------------------------------------------------------
  // MIX-AND-MATCH BANGS LAYER
  // -----------------------------------------------------------------------
  const requestedBangs: HairBangsStyleId = hair.bangsStyle ?? 'auto';
  const effectiveBangs =
    requestedBangs === 'auto' ? resolveAutoBangs(style) : requestedBangs;
  populateBangsGroup(
    bangsGroup,
    effectiveBangs,
    baseMat,
    accentMat,
    hair.highlightPattern,
  );

  // -----------------------------------------------------------------------
  // HAIR ACCESSORY LAYER
  // -----------------------------------------------------------------------
  populateAccessoryGroup(accessoryGroup, resolvedAccessory, resolvedAccessoryColor, style);

  // -----------------------------------------------------------------------
  // GAP-FREE HAT TUCKING (Scalp Shell Stays Unbroken Under Brims & Beanies)
  // -----------------------------------------------------------------------
  const applyHatTuck = (tuck: HatTuckProfile) => {
    if (tuck === 'none') {
      scalpShellGroup.visible = true;
      crownStrandsGroup.visible = true;
      crownStrandsGroup.scale.set(1, 1, 1);
      crownStrandsGroup.position.set(0, 0, 0);
      bangsGroup.visible = true;
      sidesGroup.visible = true;
      tailPivot.visible = true;
      accessoryGroup.visible = true;
      accessoryGroup.position.set(0, 0, 0);
    } else if (tuck === 'brim') {
      // Cap, Top Hat, Fedora, Crown:
      // Scalp shell remains 100% intact & gap-free; tall crown strands compress cleanly inside hat
      scalpShellGroup.visible = true;
      crownStrandsGroup.visible = style !== 'topBun' && style !== 'mohawk';
      crownStrandsGroup.scale.set(0.98, 0.56, 0.98);
      crownStrandsGroup.position.set(0, 0.08 * S, 0);
      bangsGroup.visible = true;
      sidesGroup.visible = true;
      tailPivot.visible = true;
      accessoryGroup.visible = resolvedAccessory !== 'catEars' && resolvedAccessory !== 'headband';
      accessoryGroup.position.set(0, -0.04 * S, 0.02 * S);
    } else if (tuck === 'crown') {
      // Knit Beanie, Wizard Hat:
      // Snug crown covers top — keep seamless scalp shell visible so lower temples/back never gap
      scalpShellGroup.visible = true;
      crownStrandsGroup.visible = false;
      bangsGroup.visible = true;
      sidesGroup.visible = true;
      tailPivot.visible = true;
      accessoryGroup.visible = resolvedAccessory === 'starClips' || resolvedAccessory === 'hibiscus';
      accessoryGroup.position.set(0.02 * S, -0.07 * S, 0.03 * S);
    } else {
      // fullCover (Valkyrie Helm, Knight Sallet, Ranger Hood):
      // Helmet encloses skull completely; keep front fringe & long back tails peeking naturally
      scalpShellGroup.visible = false;
      crownStrandsGroup.visible = false;
      bangsGroup.visible = true;
      sidesGroup.visible = false;
      tailPivot.visible = true;
      accessoryGroup.visible = false;
    }
  };

  applyHatTuck(getHatTuckProfile(initialHatId));

  // Secondary physics: smooth inertia on tails, bangs, and side locks without exposing scalp
  const applyPhysics = (hairPitch: number, hairRoll: number) => {
    tailPivot.rotation.set(hairPitch, 0, hairRoll);
    bangsGroup.rotation.set(hairPitch * 0.16, 0, hairRoll * 0.12);
    sidesGroup.rotation.set(hairPitch * 0.12, 0, hairRoll * 0.11);
  };

  return { root, applyHatTuck, applyPhysics };
}
