import * as THREE from 'three';
import { getHatTuckProfile } from './robloxCatalog';
import {
  ClothingConfig,
  FootwearId,
  HairConfig,
  HairStyleId,
  HatTuckProfile,
  R6BodyColors,
  ShirtStyleId,
  SleeveMode,
} from './types';

export const WARDROBE_STUD = 0.55;
const S = WARDROBE_STUD;

export function disposeGroupChildren(group: THREE.Group) {
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
          std.map?.dispose();
          std.bumpMap?.dispose();
          std.roughnessMap?.dispose();
          m.dispose();
        });
      }
    });
  }
}

export function disposeMaterialSet(mats: THREE.Material | THREE.Material[]) {
  const list = Array.isArray(mats) ? mats : [mats];
  list.forEach((m) => {
    const std = m as THREE.MeshStandardMaterial;
    std.map?.dispose();
    std.bumpMap?.dispose();
    m.dispose();
  });
}

function shadeHex(hex: string, delta: number): string {
  const c = new THREE.Color(hex);
  if (delta >= 0) {
    c.lerp(new THREE.Color('#ffffff'), Math.min(1, delta));
  } else {
    c.lerp(new THREE.Color('#000000'), Math.min(1, -delta));
  }
  return `#${c.getHexString()}`;
}

function makeClothMat(
  color: string,
  roughness = 0.72,
  metalness = 0.04,
  extra?: Partial<THREE.MeshPhysicalMaterialParameters>,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    sheen: roughness > 0.55 ? 0.35 : 0,
    sheenRoughness: 0.65,
    ...extra,
  });
}

function makeMetalMat(color: string, roughness = 0.22, metalness = 0.85): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
  });
}

function resolveEffectiveSleeves(shirtId: ShirtStyleId, sleeveMode: SleeveMode): Exclude<SleeveMode, 'auto'> {
  if (sleeveMode !== 'auto') return sleeveMode;
  if (shirtId === 'none') return 'sleeveless';
  if (shirtId === 'tshirt' || shirtId === 'vest') return 'short';
  return 'long';
}

// =========================================================================
// 1. Procedural 2D Canvas Clothing Texture Synthesizer
// =========================================================================

function canvasToSrgbTexture(canvas: HTMLCanvasElement, anisotropy = 4): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

function drawWeaveGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.05) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let y = 0; y < h; y += 6) {
    ctx.fillRect(0, y, w, 1);
  }
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.9})`;
  for (let x = 0; x < w; x += 8) {
    ctx.fillRect(x, 0, 1, h);
  }
}

function drawTorsoFaceCanvas(
  face: 'front' | 'back' | 'side' | 'top' | 'bottom',
  clothing: ClothingConfig,
  torsoSkinHex: string,
): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const base = clothing.shirtColor;
  const accent = clothing.shirtAccent;
  const darkBase = shadeHex(base, -0.22);
  const lightBase = shadeHex(base, 0.14);

  if (clothing.shirtId === 'none') {
    ctx.fillStyle = torsoSkinHex;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  // Base cloth fill
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  drawWeaveGrain(ctx, size, size, 0.045);

  // Subtle side shading
  const edgeGrad = ctx.createLinearGradient(0, 0, size, 0);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0.14)');
  edgeGrad.addColorStop(0.12, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(0.88, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, size, size);

  if (face === 'top') {
    // Neckline skin cutout
    ctx.fillStyle = torsoSkinHex;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.stroke();
    return canvas;
  }

  if (face === 'bottom') {
    ctx.fillStyle = darkBase;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  if (face === 'side') {
    // Side seam & hem
    ctx.fillStyle = darkBase;
    ctx.fillRect(size * 0.47, 0, 6, size);
    ctx.fillRect(0, size - 20, size, 20);
    if (clothing.shirtId === 'tracksuit' || clothing.shirtId === 'cyberSuit') {
      ctx.fillStyle = accent;
      ctx.fillRect(size * 0.44, 0, 14, size);
    }
    return canvas;
  }

  // Front or Back
  // Neck opening arc
  ctx.fillStyle = torsoSkinHex;
  ctx.beginPath();
  ctx.ellipse(size / 2, 0, 48, face === 'front' ? 28 : 16, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = darkBase;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Bottom hem ribbing
  ctx.fillStyle = darkBase;
  ctx.fillRect(0, size - 22, size, 22);

  switch (clothing.shirtId) {
    case 'tshirt': {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(size / 2, 0, 50, face === 'front' ? 30 : 18, 0, 0, Math.PI);
      ctx.stroke();
      if (face === 'front') {
        // Chest stripe + emblem
        ctx.fillStyle = accent;
        ctx.fillRect(0, 88, size, 24);
        ctx.fillStyle = lightBase;
        ctx.fillRect(0, 84, size, 4);
        ctx.beginPath();
        ctx.arc(size / 2, 100, 22, 0, Math.PI * 2);
        ctx.fillStyle = base;
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      break;
    }

    case 'hoodie': {
      // Kangaroo pocket + drawstrings + ribbed hem
      ctx.fillStyle = accent;
      ctx.fillRect(0, size - 24, size, 24);
      if (face === 'front') {
        // Drawstrings
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(102, 26, 7, 58);
        ctx.fillRect(147, 26, 7, 58);
        ctx.fillStyle = accent;
        ctx.fillRect(100, 80, 11, 10);
        ctx.fillRect(145, 80, 11, 10);
        // Chest band
        ctx.fillStyle = accent;
        ctx.fillRect(58, 102, 140, 14);
        // Kangaroo pocket
        ctx.fillStyle = darkBase;
        ctx.beginPath();
        ctx.moveTo(56, 160);
        ctx.lineTo(200, 160);
        ctx.lineTo(214, 226);
        ctx.lineTo(42, 226);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = lightBase;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        // Back emblem diamond
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

    case 'jacket': {
      if (face === 'front') {
        // Inner tee + open zip jacket panels + diagonal pockets
        ctx.fillStyle = accent;
        ctx.fillRect(88, 18, 80, size - 40);
        ctx.fillStyle = darkBase;
        ctx.fillRect(80, 0, 12, size - 20);
        ctx.fillRect(164, 0, 12, size - 20);
        // Metallic zipper teeth
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(84, 24, 5, size - 48);
        ctx.fillRect(167, 24, 5, size - 48);
        // Jacket chest pocket + waist buckles
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(24, 72, 42, 8);
        ctx.fillRect(190, 168, 42, 8);
      } else {
        // Back yoke seam
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
        // Snap placket + varsity crest
        ctx.fillStyle = accent;
        ctx.fillRect(123, 24, 10, size - 46);
        for (let py = 44; py < 210; py += 34) {
          ctx.beginPath();
          ctx.arc(128, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
        }
        // Letter patch
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
        // Inner shirt under vest
        ctx.fillStyle = accent;
        ctx.fillRect(72, 0, 112, size);
        // Vest panels left/right
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 82, size);
        ctx.fillRect(174, 0, 82, size);
        // Pockets & strap buckles
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
      // Tabard vertical split + metallic breastplate trim + waist belt
      ctx.fillStyle = shadeHex('#94a3b8', 0);
      ctx.fillRect(0, 0, size, 48);
      ctx.fillStyle = accent;
      ctx.fillRect(114, 24, 28, size - 24);
      ctx.fillRect(0, 108, size, 22);
      // Leather belt
      ctx.fillStyle = '#4b2e1e';
      ctx.fillRect(0, size - 36, size, 24);
      ctx.fillStyle = accent;
      ctx.fillRect(108, size - 40, 40, 32);
      if (face === 'front') {
        // Shield crest on chest
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
      // Racing stripes + zip line
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
        // Crisp white dress shirt V + tie + buttons
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(76, 0);
        ctx.lineTo(180, 0);
        ctx.lineTo(128, 122);
        ctx.closePath();
        ctx.fill();
        // Necktie
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(118, 18);
        ctx.lineTo(138, 18);
        ctx.lineTo(142, 112);
        ctx.lineTo(128, 134);
        ctx.lineTo(114, 112);
        ctx.closePath();
        ctx.fill();
        // Suit buttons & pocket square
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
      // Gold rune trim + sash
      ctx.fillStyle = accent;
      ctx.fillRect(108, 16, 40, size - 16);
      ctx.fillStyle = base;
      ctx.fillRect(116, 16, 24, size - 16);
      // Belt sash
      ctx.fillStyle = accent;
      ctx.fillRect(0, size - 44, size, 22);
      if (face === 'front') {
        // Star emblem
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(128, 92, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'cyberSuit': {
      // Segmented dark tech armor + glowing conduit
      ctx.fillStyle = darkBase;
      ctx.fillRect(28, 44, 200, 96);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(32, 48, 192, 88);
      if (face === 'front') {
        // Glowing core hex
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
  clothing: ClothingConfig,
  armSkinHex: string,
): HTMLCanvasElement {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const sleeves = resolveEffectiveSleeves(clothing.shirtId, clothing.sleeveMode);
  const sleeveColor =
    clothing.shirtId === 'varsity'
      ? clothing.shirtAccent
      : clothing.shirtId === 'vest'
        ? clothing.shirtAccent
        : clothing.shirtColor;
  const cuffColor =
    clothing.shirtId === 'varsity' ? clothing.shirtColor : clothing.shirtAccent;
  const darkSleeve = shadeHex(sleeveColor, -0.2);

  // Fill bare skin first
  ctx.fillStyle = armSkinHex;
  ctx.fillRect(0, 0, w, h);

  if (clothing.shirtId === 'none' || sleeves === 'sleeveless') {
    return canvas;
  }

  const coverageRatio = sleeves === 'short' ? 0.44 : 0.82;
  const sleeveH = Math.round(h * coverageRatio);

  ctx.fillStyle = sleeveColor;
  ctx.fillRect(0, 0, w, sleeveH);
  drawWeaveGrain(ctx, w, sleeveH, 0.045);

  // Shoulder cap stripe on tracksuit/cyberSuit
  if (clothing.shirtId === 'tracksuit' || clothing.shirtId === 'cyberSuit') {
    ctx.fillStyle = cuffColor;
    ctx.fillRect(w * 0.42, 0, 18, sleeveH);
  }

  // Crisp cuff band
  ctx.fillStyle = darkSleeve;
  ctx.fillRect(0, sleeveH - 18, w, 18);
  ctx.fillStyle = cuffColor;
  ctx.fillRect(0, sleeveH - 12, w, 6);

  // Subtle glove cuff for knight / cyber
  if (clothing.shirtId === 'knightTunic' || clothing.shirtId === 'cyberSuit') {
    ctx.fillStyle = shadeHex(cuffColor, -0.15);
    ctx.fillRect(0, h - 46, w, 46);
  }

  return canvas;
}

function drawLegCanvas(
  face: 'front' | 'back' | 'side',
  clothing: ClothingConfig,
  legSkinHex: string,
): HTMLCanvasElement {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Start with bare leg skin
  ctx.fillStyle = legSkinHex;
  ctx.fillRect(0, 0, w, h);

  const pants = clothing.pantsId;
  const pCol = clothing.pantsColor;
  const pAcc = clothing.pantsAccent;
  const pDark = shadeHex(pCol, -0.24);

  if (pants !== 'none') {
    const pantLen = pants === 'shorts' ? Math.round(h * 0.5) : h;
    ctx.fillStyle = pCol;
    ctx.fillRect(0, 0, w, pantLen);
    drawWeaveGrain(ctx, w, pantLen, 0.045);

    // Waistband
    ctx.fillStyle = pDark;
    ctx.fillRect(0, 0, w, 20);

    if (pants === 'jeans') {
      // Denim stitching + pockets
      ctx.strokeStyle = pAcc;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(8, 22, w - 16, pantLen - 34);
      ctx.setLineDash([]);
      if (face === 'front') {
        ctx.fillStyle = pDark;
        ctx.fillRect(10, 26, 36, 32);
        ctx.fillRect(82, 26, 36, 32);
      } else if (face === 'back') {
        ctx.fillStyle = pDark;
        ctx.fillRect(24, 30, 80, 48);
        ctx.strokeStyle = pAcc;
        ctx.strokeRect(26, 32, 76, 44);
      }
    } else if (pants === 'cargo') {
      if (face === 'side') {
        ctx.fillStyle = pAcc;
        ctx.fillRect(22, 92, 84, 62);
        ctx.fillStyle = pDark;
        ctx.fillRect(22, 92, 84, 18);
      }
    } else if (pants === 'trackPants' || pants === 'cyberLeggings') {
      if (face === 'side') {
        ctx.fillStyle = pAcc;
        ctx.fillRect(w * 0.38, 0, 14, pantLen);
        ctx.fillRect(w * 0.56, 0, 8, pantLen);
      }
    } else if (pants === 'knightGreaves') {
      ctx.fillStyle = pAcc;
      ctx.fillRect(12, 86, w - 24, 48);
      ctx.fillStyle = pDark;
      ctx.fillRect(0, 126, w, 10);
    } else if (pants === 'shorts') {
      ctx.fillStyle = pAcc;
      ctx.fillRect(0, pantLen - 12, w, 12);
    }
  }

  // Footwear painted onto lower leg canvas
  if (clothing.footwearId !== 'none') {
    const bootTop =
      clothing.footwearId === 'boots' || clothing.footwearId === 'armoredBoots'
        ? Math.round(h * 0.7)
        : Math.round(h * 0.8);
    const shoeColor =
      clothing.footwearId === 'armoredBoots'
        ? '#94a3b8'
        : clothing.footwearId === 'sneakers'
          ? '#1e293b'
          : '#3b2416';
    const soleColor =
      clothing.footwearId === 'sneakers'
        ? '#f8fafc'
        : clothing.footwearId === 'armoredBoots'
          ? '#475569'
          : '#18181b';

    ctx.fillStyle = shoeColor;
    ctx.fillRect(0, bootTop, w, h - bootTop);
    ctx.fillStyle = pAcc;
    ctx.fillRect(0, bootTop, w, 8);
    // Sole
    ctx.fillStyle = soleColor;
    ctx.fillRect(0, h - 20, w, 20);
    if (face === 'front' && clothing.footwearId === 'sneakers') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(36, bootTop + 14, w - 72, 6);
      ctx.fillRect(36, bootTop + 26, w - 72, 6);
    }
  }

  return canvas;
}

export function createTorsoClothingMaterials(
  clothing: ClothingConfig,
  bodyColors: R6BodyColors,
  anisotropy: number,
): THREE.MeshStandardMaterial[] {
  const rough = clothing.shirtId === 'knightTunic' || clothing.shirtId === 'cyberSuit' ? 0.36 : 0.72;
  const metal = clothing.shirtId === 'knightTunic' || clothing.shirtId === 'cyberSuit' ? 0.32 : 0.04;

  const frontTex = canvasToSrgbTexture(drawTorsoFaceCanvas('front', clothing, bodyColors.torso), anisotropy);
  const backTex = canvasToSrgbTexture(drawTorsoFaceCanvas('back', clothing, bodyColors.torso), anisotropy);
  const sideTex = canvasToSrgbTexture(drawTorsoFaceCanvas('side', clothing, bodyColors.torso), anisotropy);
  const topTex = canvasToSrgbTexture(drawTorsoFaceCanvas('top', clothing, bodyColors.torso), anisotropy);
  const botTex = canvasToSrgbTexture(drawTorsoFaceCanvas('bottom', clothing, bodyColors.torso), anisotropy);

  const make = (map: THREE.CanvasTexture) =>
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map,
      roughness: rough,
      metalness: metal,
    });

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
  clothing: ClothingConfig,
  armSkinHex: string,
  anisotropy: number,
): THREE.MeshStandardMaterial {
  const tex = canvasToSrgbTexture(drawArmCanvas(clothing, armSkinHex), anisotropy);
  const sleeves = resolveEffectiveSleeves(clothing.shirtId, clothing.sleeveMode);
  const isBare = clothing.shirtId === 'none' || sleeves === 'sleeveless';
  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: tex,
    roughness: isBare ? 0.36 : 0.68,
    metalness: clothing.shirtId === 'cyberSuit' ? 0.28 : 0.04,
  });
}

export function createLegClothingMaterials(
  clothing: ClothingConfig,
  legSkinHex: string,
  anisotropy: number,
): THREE.MeshStandardMaterial[] {
  const frontTex = canvasToSrgbTexture(drawLegCanvas('front', clothing, legSkinHex), anisotropy);
  const backTex = canvasToSrgbTexture(drawLegCanvas('back', clothing, legSkinHex), anisotropy);
  const sideTex = canvasToSrgbTexture(drawLegCanvas('side', clothing, legSkinHex), anisotropy);
  const isBare = clothing.pantsId === 'none' && clothing.footwearId === 'none';
  const rough = isBare ? 0.38 : clothing.pantsId === 'knightGreaves' ? 0.34 : 0.72;
  const metal = clothing.pantsId === 'knightGreaves' ? 0.42 : 0.04;

  const make = (map: THREE.CanvasTexture) =>
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map,
      roughness: rough,
      metalness: metal,
    });

  // +X, -X, +Y, -Y, +Z, -Z
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
// 2. 3D Clothing Trims, Collars, Jackets, Cuffs & Footwear
// =========================================================================

export function buildClothing3DTrims(
  clothing: ClothingConfig,
  torsoTrimGroup: THREE.Group,
  leftArmTrimGroup: THREE.Group,
  rightArmTrimGroup: THREE.Group,
  leftLegTrimGroup: THREE.Group,
  rightLegTrimGroup: THREE.Group,
) {
  disposeGroupChildren(torsoTrimGroup);
  disposeGroupChildren(leftArmTrimGroup);
  disposeGroupChildren(rightArmTrimGroup);
  disposeGroupChildren(leftLegTrimGroup);
  disposeGroupChildren(rightLegTrimGroup);

  const mainMat = makeClothMat(clothing.shirtColor, 0.68, 0.05);
  const accentMat = makeClothMat(clothing.shirtAccent, 0.45, 0.12);
  const metalMat = makeMetalMat(clothing.shirtAccent, 0.22, 0.8);

  if (clothing.shirtId !== 'none') {
    if (clothing.shirtId === 'hoodie') {
      // 3D draped hood resting at back of neck + collar ring
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.56 * S, 0.11 * S, 8, 18),
        mainMat,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.98 * S, 0);
      const hoodFold = new THREE.Mesh(
        new THREE.BoxGeometry(1.18 * S, 0.36 * S, 0.56 * S),
        mainMat,
      );
      hoodFold.position.set(0, 0.92 * S, -0.44 * S);
      hoodFold.rotation.x = 0.25;
      const hoodTrim = new THREE.Mesh(
        new THREE.BoxGeometry(1.22 * S, 0.1 * S, 0.16 * S),
        accentMat,
      );
      hoodTrim.position.set(0, 1.04 * S, -0.64 * S);
      torsoTrimGroup.add(collar, hoodFold, hoodTrim);
    } else if (
      clothing.shirtId === 'jacket' ||
      clothing.shirtId === 'suitCoat' ||
      clothing.shirtId === 'varsity'
    ) {
      // Sculpted open front lapels + collar stand
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(
          new THREE.BoxGeometry(0.32 * S, 0.85 * S, 0.08 * S),
          clothing.shirtId === 'varsity' ? accentMat : mainMat,
        );
        lapel.position.set(side * 0.48 * S, 0.52 * S, 0.52 * S);
        lapel.rotation.z = side * -0.18;
        torsoTrimGroup.add(lapel);
      }
      const collarBack = new THREE.Mesh(
        new THREE.BoxGeometry(1.28 * S, 0.18 * S, 0.26 * S),
        mainMat,
      );
      collarBack.position.set(0, 1.04 * S, -0.34 * S);
      torsoTrimGroup.add(collarBack);
    } else if (clothing.shirtId === 'knightTunic') {
      // Metallic gorget collar + shoulder trim
      const gorget = new THREE.Mesh(
        new THREE.CylinderGeometry(0.64 * S, 0.72 * S, 0.16 * S, 16),
        metalMat,
      );
      gorget.position.set(0, 1.02 * S, 0);
      torsoTrimGroup.add(gorget);
    } else if (clothing.shirtId === 'wizardRobe') {
      // High mystic flared collar
      const mantle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.76 * S, 0.58 * S, 0.28 * S, 14, 1, true, Math.PI * 0.45, Math.PI * 1.1),
        accentMat,
      );
      mantle.position.set(0, 1.06 * S, -0.05 * S);
      torsoTrimGroup.add(mantle);
    } else if (clothing.shirtId === 'cyberSuit') {
      // Chest armor plate + glowing collar
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(1.64 * S, 0.86 * S, 0.12 * S),
        makeMetalMat(clothing.shirtColor, 0.28, 0.65),
      );
      plate.position.set(0, 0.46 * S, 0.52 * S);
      const node = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 0.15 * S, 12),
        new THREE.MeshStandardMaterial({
          color: clothing.shirtAccent,
          emissive: clothing.shirtAccent,
          emissiveIntensity: 0.9,
          roughness: 0.18,
        }),
      );
      node.rotation.x = Math.PI / 2;
      node.position.set(0, 0.46 * S, 0.54 * S);
      torsoTrimGroup.add(plate, node);
    }

    // Arm sleeve cuffs (3D rings around wrists or mid-arm)
    const sleeves = resolveEffectiveSleeves(clothing.shirtId, clothing.sleeveMode);
    if (sleeves !== 'sleeveless') {
      const cuffY = sleeves === 'short' ? 0.12 * S : -0.62 * S;
      for (const armGroup of [leftArmTrimGroup, rightArmTrimGroup]) {
        const cuff = new THREE.Mesh(
          new THREE.BoxGeometry(1.06 * S, 0.16 * S, 1.06 * S),
          accentMat,
        );
        cuff.position.set(0, cuffY, 0);
        armGroup.add(cuff);
      }
    }
  }

  // 3D Footwear details (grounded flush inside leg bottom [-1.0*S .. -0.4*S])
  if (clothing.footwearId !== 'none') {
    const fw: FootwearId = clothing.footwearId;
    const upperColor =
      fw === 'armoredBoots'
        ? '#94a3b8'
        : fw === 'sneakers'
          ? clothing.pantsAccent
          : '#3b2416';
    const soleColor = fw === 'sneakers' ? '#f8fafc' : '#18181b';
    const upperMat =
      fw === 'armoredBoots'
        ? makeMetalMat(upperColor, 0.25, 0.8)
        : makeClothMat(upperColor, 0.48, 0.1);
    const soleMat = makeClothMat(soleColor, 0.72, 0.05);

    for (const legGroup of [leftLegTrimGroup, rightLegTrimGroup]) {
      // Sole rim flush with bottom (-1.0*S + 0.06*S = -0.94*S -> bottom at -1.0*S)
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(1.06 * S, 0.12 * S, 1.14 * S),
        soleMat,
      );
      sole.position.set(0, -0.94 * S, 0.04 * S);

      // Sculpted toe cap extending slightly forward
      const toeCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.96 * S, 0.2 * S, 0.22 * S),
        upperMat,
      );
      toeCap.position.set(0, -0.82 * S, 0.56 * S);

      legGroup.add(sole, toeCap);

      if (fw === 'boots' || fw === 'armoredBoots') {
        const collar = new THREE.Mesh(
          new THREE.BoxGeometry(1.08 * S, 0.14 * S, 1.08 * S),
          fw === 'armoredBoots'
            ? makeMetalMat(clothing.pantsAccent, 0.25, 0.8)
            : makeClothMat(clothing.pantsAccent, 0.55, 0.05),
        );
        collar.position.set(0, -0.48 * S, 0);
        legGroup.add(collar);
      }
    }
  }
}

// =========================================================================
// 3. Dedicated Blocky Hair Framework (11 Faceted Styles, Solid Matte R6 Plastic)
// =========================================================================

export interface RobloxHairRig {
  root: THREE.Group;
  applyHatTuck: (tuck: HatTuckProfile) => void;
  applyPhysics: (hairPitch: number, hairRoll: number) => void;
}

function makeHairPlasticMat(color: string, isAccent = false): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: isAccent ? 0.5 : 0.56,
    metalness: 0.02,
    flatShading: true,
  });
}

function createPolygonExtrude(
  points: [number, number][],
  depth: number,
  bevel = 0.018 * S,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: bevel > 0,
    bevelSegments: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createOctaBlockGeo(
  width: number,
  height: number,
  depth: number,
  chamfer = 0.14 * S,
  bevel = 0.016 * S,
): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * 0.45, hd * 0.45);
  const pts: [number, number][] = [
    [-hw + c, -hd],
    [hw - c, -hd],
    [hw, -hd + c],
    [hw, hd - c],
    [hw - c, hd],
    [-hw + c, hd],
    [-hw, hd - c],
    [-hw, -hd + c],
  ];
  const geo = createPolygonExtrude(pts, height, bevel);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -height * 0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

function createBlockySpikeGeo(radius: number, height: number): THREE.ConeGeometry {
  const geo = new THREE.ConeGeometry(radius, height, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.computeVertexNormals();
  return geo;
}

function createFacetedHibiscus(): THREE.Group {
  const flower = new THREE.Group();
  const outerMat = makeHairPlasticMat('#fdf2f8', false);
  const innerMat = makeHairPlasticMat('#f472b6', true);
  const stamenMat = makeHairPlasticMat('#fde047', true);

  const outerPetalGeo = createPolygonExtrude(
    [
      [0, 0],
      [-0.08 * S, 0.09 * S],
      [-0.065 * S, 0.21 * S],
      [0, 0.24 * S],
      [0.065 * S, 0.21 * S],
      [0.08 * S, 0.09 * S],
    ],
    0.024 * S,
    0.008 * S,
  );
  const innerPetalGeo = createPolygonExtrude(
    [
      [0, 0],
      [-0.052 * S, 0.06 * S],
      [-0.04 * S, 0.145 * S],
      [0, 0.165 * S],
      [0.04 * S, 0.145 * S],
      [0.052 * S, 0.06 * S],
    ],
    0.026 * S,
    0.007 * S,
  );

  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 + 0.22;
    const petalPivot = new THREE.Group();
    petalPivot.rotation.z = angle;

    const outer = new THREE.Mesh(outerPetalGeo, outerMat);
    outer.rotation.x = -0.24;
    outer.position.set(0, 0.015 * S, 0);
    outer.castShadow = true;

    const inner = new THREE.Mesh(innerPetalGeo, innerMat);
    inner.rotation.x = -0.22;
    inner.position.set(0, 0.012 * S, 0.01 * S);

    petalPivot.add(outer, inner);
    flower.add(petalPivot);
  }

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.036 * S, 0.044 * S, 0.04 * S, 6), innerMat);
  core.rotation.x = Math.PI / 2;
  core.position.z = 0.02 * S;
  flower.add(core);

  const stamenStem = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.02 * S, 0.15 * S), stamenMat);
  stamenStem.position.set(0.015 * S, 0.02 * S, 0.08 * S);
  stamenStem.rotation.set(-0.22, 0.18, 0);
  const stamenTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.028 * S, 0), stamenMat);
  stamenTip.position.set(0.028 * S, 0.038 * S, 0.155 * S);
  flower.add(stamenStem, stamenTip);

  return flower;
}

function addBlockySkullShell(
  crownGroup: THREE.Group,
  sidesGroup: THREE.Group,
  baseMat: THREE.Material,
  sideMat: THREE.Material,
  options: {
    splitPart?: boolean;
    topHeight?: number;
    backDrop?: number;
    sideDrop?: number;
    crownOffsetY?: number;
  } = {},
) {
  const topH = options.topHeight ?? 0.34 * S;
  const backDrop = options.backDrop ?? 0.88 * S;
  const sideDrop = options.sideDrop ?? 0.56 * S;
  const crownY = options.crownOffsetY ?? 0.44 * S;

  if (options.splitPart) {
    const halfGeo = createPolygonExtrude(
      [
        [0.015 * S, 0],
        [0.64 * S, 0.04 * S],
        [0.64 * S, topH * 0.72],
        [0.44 * S, topH],
        [0.06 * S, topH],
        [0.01 * S, topH * 0.62],
      ],
      1.26 * S,
      0.018 * S,
    );
    const rightHalf = new THREE.Mesh(halfGeo, baseMat);
    rightHalf.position.set(0, crownY - topH * 0.5, -0.02 * S);
    rightHalf.castShadow = true;

    const leftHalf = rightHalf.clone();
    leftHalf.scale.x = -1;
    crownGroup.add(rightHalf, leftHalf);
  } else {
    const topCap = new THREE.Mesh(
      createOctaBlockGeo(1.32 * S, topH, 1.3 * S, 0.2 * S, 0.018 * S),
      baseMat,
    );
    topCap.position.set(0, crownY, -0.02 * S);
    topCap.castShadow = true;
    crownGroup.add(topCap);
  }

  // Faceted back-of-head plate (wraps rear skull cleanly behind ears without touching face)
  const backPlate = new THREE.Mesh(
    createOctaBlockGeo(1.26 * S, backDrop, 0.38 * S, 0.14 * S, 0.016 * S),
    sideMat,
  );
  backPlate.position.set(0, 0.42 * S - backDrop * 0.5, -0.46 * S);
  backPlate.castShadow = true;
  crownGroup.add(backPlate);

  // Subtle side temple plates framing the R6 head sides
  if (sideDrop > 0) {
    const templeGeo = createPolygonExtrude(
      [
        [-0.36 * S, 0],
        [0.24 * S, 0],
        [0.16 * S, -sideDrop],
        [-0.36 * S, -sideDrop * 0.85],
      ],
      0.16 * S,
      0.015 * S,
    );
    templeGeo.rotateY(Math.PI / 2);
    for (const side of [-1, 1]) {
      const temple = new THREE.Mesh(templeGeo, sideMat);
      temple.position.set(side * 0.59 * S, 0.32 * S, -0.04 * S);
      temple.castShadow = true;
      sidesGroup.add(temple);
    }
  }
}

export function buildHairRig(
  hairSocket: THREE.Group,
  hair: HairConfig,
  initialHatId: string,
): RobloxHairRig {
  disposeGroupChildren(hairSocket);

  const root = new THREE.Group();
  hairSocket.add(root);

  const crownGroup = new THREE.Group();
  const bangsGroup = new THREE.Group();
  const sidesGroup = new THREE.Group();
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.16 * S, -0.58 * S);
  const accessoryGroup = new THREE.Group();

  root.add(crownGroup, bangsGroup, sidesGroup, tailPivot, accessoryGroup);

  if (hair.styleId === 'none') {
    if (hair.flowerAccessory) {
      const flower = createFacetedHibiscus();
      flower.position.set(0.45 * S, 0.44 * S, 0.5 * S);
      flower.rotation.set(-0.26, 0.42, -0.2);
      accessoryGroup.add(flower);
    }
    return {
      root,
      applyHatTuck: (tuck) => {
        accessoryGroup.visible = tuck !== 'fullCover';
      },
      applyPhysics: () => {},
    };
  }

  const vol = THREE.MathUtils.clamp(hair.volume || 1, 0.8, 1.25);
  root.scale.setScalar(vol);

  const baseMat = makeHairPlasticMat(hair.primaryColor, false);

  const hiColor =
    hair.highlightPattern === 'none'
      ? hair.primaryColor
      : hair.highlightPattern === 'ombre'
        ? shadeHex(hair.highlightColor, 0.05)
        : hair.highlightColor;

  const accentMat = makeHairPlasticMat(hiColor, true);

  const pickMat = (isTipOrStreak: boolean) => {
    if (hair.highlightPattern === 'none') return baseMat;
    return isTipOrStreak ? accentMat : baseMat;
  };

  const style: HairStyleId = hair.styleId;

  if (style === 'longWavyPart') {
    // Reference-inspired blocky center-parted silhouette with inverted-V forehead arch
    // and asymmetric sweeping S-wave (viewer-left -X) + sleek tapered drape (viewer-right +X)
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      splitPart: true,
      topHeight: 0.34 * S,
      backDrop: 0.94 * S,
      sideDrop: 0,
      crownOffsetY: 0.46 * S,
    });

    // Iconic inverted-V arched bangs framing the R6 face cleanly without blocking eyes
    const bangLeft = new THREE.Mesh(
      createPolygonExtrude(
        [
          [0.01 * S, 0.12 * S],
          [-0.24 * S, 0.04 * S],
          [-0.64 * S, -0.34 * S],
          [-0.68 * S, -0.14 * S],
          [-0.28 * S, 0.22 * S],
          [0.01 * S, 0.26 * S],
        ],
        0.22 * S,
        0.018 * S,
      ),
      baseMat,
    );
    bangLeft.position.set(0, 0.24 * S, 0.56 * S);
    bangLeft.rotation.x = -0.16;
    bangLeft.castShadow = true;

    const bangRight = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.01 * S, 0.12 * S],
          [0.24 * S, 0.04 * S],
          [0.64 * S, -0.34 * S],
          [0.68 * S, -0.14 * S],
          [0.28 * S, 0.22 * S],
          [-0.01 * S, 0.26 * S],
        ],
        0.22 * S,
        0.018 * S,
      ),
      pickMat(hair.highlightPattern === 'streaks'),
    );
    bangRight.position.set(0, 0.24 * S, 0.56 * S);
    bangRight.rotation.x = -0.16;
    bangRight.castShadow = true;
    bangsGroup.add(bangLeft, bangRight);

    // Viewer-left (-X) signature chunky stepped S-wave drape cascading over front shoulder
    const leftUpperWave = new THREE.Mesh(
      createPolygonExtrude(
        [
          [0.1 * S, 0.34 * S],
          [-0.14 * S, 0.24 * S],
          [-0.28 * S, -0.26 * S],
          [-0.36 * S, -0.82 * S],
          [-0.22 * S, -1.32 * S],
          [-0.02 * S, -1.62 * S],
          [0.14 * S, -1.46 * S],
          [0.06 * S, -0.92 * S],
          [0.14 * S, -0.36 * S],
        ],
        0.28 * S,
        0.02 * S,
      ),
      pickMat(hair.highlightPattern === 'ombre'),
    );
    leftUpperWave.position.set(-0.62 * S, 0.08 * S, 0.14 * S);
    leftUpperWave.rotation.set(-0.1, 0.26, 0.04);
    leftUpperWave.castShadow = true;

    // Secondary front sculpted wave ridge for crisp faceted depth & tip/streak highlights
    const leftCurlRidge = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.04 * S, -0.34 * S],
          [-0.22 * S, -0.66 * S],
          [-0.3 * S, -1.04 * S],
          [-0.14 * S, -1.48 * S],
          [0.08 * S, -1.66 * S],
          [0.12 * S, -1.38 * S],
          [-0.04 * S, -1.0 * S],
          [0.08 * S, -0.6 * S],
        ],
        0.18 * S,
        0.018 * S,
      ),
      pickMat(hair.highlightPattern !== 'none'),
    );
    leftCurlRidge.position.set(-0.64 * S, 0.06 * S, 0.28 * S);
    leftCurlRidge.rotation.set(-0.14, 0.34, 0.06);
    leftCurlRidge.castShadow = true;

    // Viewer-right (+X) sleek vertical tapered drape
    const rightSleekDrape = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.12 * S, 0.34 * S],
          [0.14 * S, 0.26 * S],
          [0.24 * S, -0.32 * S],
          [0.22 * S, -0.92 * S],
          [0.12 * S, -1.42 * S],
          [-0.04 * S, -1.56 * S],
          [-0.1 * S, -1.16 * S],
          [-0.08 * S, -0.42 * S],
        ],
        0.24 * S,
        0.018 * S,
      ),
      pickMat(hair.highlightPattern === 'ombre'),
    );
    rightSleekDrape.position.set(0.62 * S, 0.08 * S, 0.1 * S);
    rightSleekDrape.rotation.set(-0.08, -0.22, -0.03);
    rightSleekDrape.castShadow = true;

    const rightTipFacet = new THREE.Mesh(
      createPolygonExtrude(
        [
          [0.02 * S, -0.98 * S],
          [0.14 * S, -1.24 * S],
          [0.06 * S, -1.54 * S],
          [-0.08 * S, -1.44 * S],
        ],
        0.16 * S,
        0.014 * S,
      ),
      pickMat(hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
    );
    rightTipFacet.position.set(0.61 * S, 0.08 * S, 0.18 * S);
    rightTipFacet.rotation.set(-0.08, -0.22, -0.03);

    sidesGroup.add(leftUpperWave, leftCurlRidge, rightSleekDrape, rightTipFacet);

    // Back layered faceted veil (swings with tailPivot and clears torso cleanly)
    const backVeilTop = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.68 * S, 0.28 * S],
          [0.68 * S, 0.28 * S],
          [0.74 * S, -0.58 * S],
          [0.36 * S, -0.82 * S],
          [0, -0.68 * S],
          [-0.36 * S, -0.82 * S],
          [-0.74 * S, -0.58 * S],
        ],
        0.2 * S,
        0.02 * S,
      ),
      baseMat,
    );
    backVeilTop.position.set(0, -0.04 * S, -0.08 * S);
    backVeilTop.rotation.x = 0.08;
    backVeilTop.castShadow = true;

    const backVeilLower = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.7 * S, -0.46 * S],
          [0.7 * S, -0.46 * S],
          [0.66 * S, -1.32 * S],
          [0.32 * S, -1.56 * S],
          [0, -1.24 * S],
          [-0.32 * S, -1.56 * S],
          [-0.66 * S, -1.32 * S],
        ],
        0.18 * S,
        0.018 * S,
      ),
      pickMat(hair.highlightPattern === 'ombre' || hair.highlightPattern === 'tips'),
    );
    backVeilLower.position.set(0, -0.04 * S, -0.1 * S);
    backVeilLower.rotation.x = 0.1;
    backVeilLower.castShadow = true;

    tailPivot.add(backVeilTop, backVeilLower);
  } else if (style === 'spiky') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      topHeight: 0.28 * S,
      backDrop: 0.78 * S,
      sideDrop: 0.36 * S,
      crownOffsetY: 0.42 * S,
    });

    const spikeGeo = createBlockySpikeGeo(0.24 * S, 0.68 * S);
    const crownSpikes: [number, number, number, number, number, boolean][] = [
      [0, 0.62, 0.18, 0.46, 0, false],
      [-0.36, 0.52, 0.14, 0.28, 0.56, true],
      [0.36, 0.52, 0.14, 0.28, -0.56, false],
      [0, 0.64, -0.18, -0.34, 0, true],
      [-0.38, 0.48, -0.26, -0.48, 0.42, false],
      [0.38, 0.48, -0.26, -0.48, -0.42, true],
      [-0.5, 0.36, -0.04, 0.08, 0.78, false],
      [0.5, 0.36, -0.04, 0.08, -0.78, true],
    ];
    for (const [x, y, z, rx, rz, hi] of crownSpikes) {
      const m = new THREE.Mesh(spikeGeo, pickMat(hi && hair.highlightPattern !== 'none'));
      m.position.set(x * S, y * S, z * S);
      m.rotation.set(rx, 0, rz);
      m.castShadow = true;
      crownGroup.add(m);
    }

    // Sharp jagged blocky fringe wedges above brows (visible under brimmed hats)
    const bangWedge = createPolygonExtrude(
      [
        [-0.15 * S, 0],
        [0.15 * S, 0],
        [0.03 * S, -0.28 * S],
      ],
      0.1 * S,
      0.012 * S,
    );
    for (const [bx, by, rz, hi] of [
      [-0.34, 0.42, 0.2, false],
      [-0.11, 0.44, 0.06, true],
      [0.12, 0.44, -0.06, false],
      [0.34, 0.42, -0.2, true],
    ] as const) {
      const bang = new THREE.Mesh(
        bangWedge,
        pickMat(hi && (hair.highlightPattern === 'tips' || hair.highlightPattern === 'streaks')),
      );
      bang.position.set(bx * S, by * S, 0.56 * S);
      bang.rotation.set(-0.22, 0, rz);
      bang.castShadow = true;
      bangsGroup.add(bang);
    }
  } else if (style === 'swept') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      topHeight: 0.3 * S,
      backDrop: 0.82 * S,
      sideDrop: 0.48 * S,
      crownOffsetY: 0.44 * S,
    });

    // Diagonal stepped top crest
    const topSlab = new THREE.Mesh(
      createOctaBlockGeo(1.18 * S, 0.24 * S, 1.18 * S, 0.18 * S, 0.018 * S),
      baseMat,
    );
    topSlab.position.set(0.06 * S, 0.56 * S, 0.04 * S);
    topSlab.rotation.z = -0.14;
    topSlab.castShadow = true;
    crownGroup.add(topSlab);

    // Sweeping angular side-swept fringe prism clearing eyes
    const sweepFringe = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.6 * S, 0.24 * S],
          [0.54 * S, 0.12 * S],
          [0.62 * S, -0.16 * S],
          [0.12 * S, 0.02 * S],
          [-0.48 * S, -0.06 * S],
        ],
        0.18 * S,
        0.016 * S,
      ),
      pickMat(hair.highlightPattern !== 'none'),
    );
    sweepFringe.position.set(0.04 * S, 0.34 * S, 0.55 * S);
    sweepFringe.rotation.set(-0.18, 0.08, -0.06);
    sweepFringe.castShadow = true;
    bangsGroup.add(sweepFringe);

    // Layered sideburn wedges
    const sideWedge = createPolygonExtrude(
      [
        [-0.14 * S, 0],
        [0.14 * S, 0],
        [0.06 * S, -0.44 * S],
        [-0.08 * S, -0.34 * S],
      ],
      0.14 * S,
      0.014 * S,
    );
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(sideWedge, baseMat);
      lock.position.set(side * 0.58 * S, 0.26 * S, 0.36 * S);
      lock.rotation.set(-0.08, side * 0.42, 0);
      sidesGroup.add(lock);
    }
  } else if (style === 'sidePart') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      topHeight: 0.26 * S,
      backDrop: 0.8 * S,
      sideDrop: 0.42 * S,
      crownOffsetY: 0.42 * S,
    });

    // Asymmetric parted blocky slabs with clean part groove at x = -0.18*S
    const majorSlab = new THREE.Mesh(
      createOctaBlockGeo(0.82 * S, 0.22 * S, 1.2 * S, 0.14 * S, 0.016 * S),
      baseMat,
    );
    majorSlab.position.set(0.22 * S, 0.54 * S, 0.02 * S);
    majorSlab.rotation.z = -0.1;
    majorSlab.castShadow = true;

    const minorSlab = new THREE.Mesh(
      createOctaBlockGeo(0.46 * S, 0.16 * S, 1.14 * S, 0.12 * S, 0.014 * S),
      pickMat(hair.highlightPattern === 'streaks'),
    );
    minorSlab.position.set(-0.4 * S, 0.48 * S, 0);
    minorSlab.rotation.z = 0.14;
    minorSlab.castShadow = true;
    crownGroup.add(majorSlab, minorSlab);

    const frontSwoop = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.18 * S, 0.18 * S],
          [0.54 * S, 0.14 * S],
          [0.58 * S, -0.08 * S],
          [0.06 * S, 0.02 * S],
        ],
        0.15 * S,
        0.015 * S,
      ),
      pickMat(hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre'),
    );
    frontSwoop.position.set(0.06 * S, 0.34 * S, 0.56 * S);
    frontSwoop.rotation.x = -0.18;
    bangsGroup.add(frontSwoop);
  } else if (style === 'undercut') {
    // Tapered matte 8-sided fade collar + tall angular forward-swept pompadour extrusion
    const fadeCollar = new THREE.Mesh(
      createOctaBlockGeo(1.24 * S, 0.54 * S, 1.24 * S, 0.22 * S, 0.012 * S),
      makeHairPlasticMat(shadeHex(hair.primaryColor, -0.26), false),
    );
    fadeCollar.position.set(0, 0.14 * S, -0.02 * S);
    sidesGroup.add(fadeCollar);

    // Sculpted side-profile pompadour extruded along X
    const pompGeo = createPolygonExtrude(
      [
        [-0.6 * S, 0],
        [0.48 * S, 0],
        [0.72 * S, 0.26 * S],
        [0.54 * S, 0.48 * S],
        [-0.18 * S, 0.42 * S],
        [-0.62 * S, 0.22 * S],
      ],
      0.86 * S,
      0.022 * S,
    );
    pompGeo.rotateY(-Math.PI / 2);
    const pomp = new THREE.Mesh(pompGeo, baseMat);
    pomp.position.set(0, 0.34 * S, 0.04 * S);
    pomp.castShadow = true;

    const pompStreak = new THREE.Mesh(
      createPolygonExtrude(
        [
          [0.08 * S, 0.26 * S],
          [0.64 * S, 0.26 * S],
          [0.52 * S, 0.44 * S],
          [-0.08 * S, 0.4 * S],
        ],
        0.24 * S,
        0.016 * S,
      ),
      pickMat(hair.highlightPattern !== 'none'),
    );
    pompStreak.rotation.y = -Math.PI / 2;
    pompStreak.position.set(0.16 * S, 0.36 * S, 0.06 * S);
    crownGroup.add(pomp, pompStreak);
  } else if (style === 'bob') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      splitPart: true,
      topHeight: 0.32 * S,
      backDrop: 0.52 * S,
      sideDrop: 0,
      crownOffsetY: 0.46 * S,
    });

    // Inverted-V parted bangs framing forehead
    const bobBangGeo = createPolygonExtrude(
      [
        [0, 0.16 * S],
        [0.56 * S, -0.18 * S],
        [0.6 * S, 0.04 * S],
        [0.24 * S, 0.26 * S],
        [0, 0.28 * S],
      ],
      0.16 * S,
      0.015 * S,
    );
    for (const side of [-1, 1]) {
      const bang = new THREE.Mesh(bobBangGeo, baseMat);
      bang.scale.x = side;
      bang.position.set(0, 0.24 * S, 0.56 * S);
      bang.rotation.x = -0.14;
      bangsGroup.add(bang);

      // Flared chin-length faceted cheek curtains
      const curtain = new THREE.Mesh(
        createPolygonExtrude(
          [
            [-0.12 * S, 0.32 * S],
            [0.14 * S, 0.32 * S],
            [0.22 * S, -0.44 * S],
            [0.06 * S, -0.76 * S],
            [-0.14 * S, -0.66 * S],
          ],
          0.32 * S,
          0.018 * S,
        ),
        pickMat(hair.highlightPattern === 'tips' || hair.highlightPattern === 'streaks'),
      );
      curtain.position.set(side * 0.62 * S, 0.08 * S, 0.06 * S);
      curtain.rotation.set(0, side * -0.14, side * -0.06);
      curtain.castShadow = true;
      sidesGroup.add(curtain);
    }

    // Stepped blocky back bob shield
    const backBob = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.64 * S, 0.24 * S],
          [0.64 * S, 0.24 * S],
          [0.72 * S, -0.68 * S],
          [0.44 * S, -0.84 * S],
          [-0.44 * S, -0.84 * S],
          [-0.72 * S, -0.68 * S],
        ],
        0.22 * S,
        0.018 * S,
      ),
      pickMat(hair.highlightPattern === 'ombre' || hair.highlightPattern === 'tips'),
    );
    backBob.position.set(0, -0.02 * S, -0.06 * S);
    backBob.rotation.x = 0.08;
    backBob.castShadow = true;
    tailPivot.add(backBob);
  } else if (style === 'curly') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      topHeight: 0.34 * S,
      backDrop: 0.86 * S,
      sideDrop: 0.44 * S,
      crownOffsetY: 0.44 * S,
    });

    // Sculpted cluster of chunky low-poly beveled blocks instead of smooth spheres
    const puffGeo = createOctaBlockGeo(0.46 * S, 0.42 * S, 0.46 * S, 0.1 * S, 0.016 * S);
    const curlNodes: [number, number, number, number, number, boolean][] = [
      [0, 0.66, 0.04, 0.1, 0.2, false],
      [-0.36, 0.58, 0.22, 0.2, 0.35, true],
      [0.36, 0.58, 0.22, -0.2, -0.35, false],
      [0, 0.58, 0.38, 0.3, 0.1, true],
      [-0.44, 0.48, -0.2, -0.25, 0.4, false],
      [0.44, 0.48, -0.2, -0.25, -0.4, true],
      [0, 0.54, -0.38, -0.35, 0.25, false],
      [-0.26, 0.58, -0.32, -0.3, -0.2, true],
      [0.26, 0.58, -0.32, -0.3, 0.2, false],
      [-0.56, 0.32, 0.04, 0.1, 0.55, true],
      [0.56, 0.32, 0.04, 0.1, -0.55, false],
    ];
    for (const [x, y, z, rx, rz, hi] of curlNodes) {
      const c = new THREE.Mesh(puffGeo, pickMat(hi && hair.highlightPattern !== 'none'));
      c.position.set(x * S, y * S, z * S);
      c.rotation.set(rx, rz * 0.5, rz);
      c.castShadow = true;
      crownGroup.add(c);
    }

    for (const side of [-1, 1]) {
      const sideCurl = new THREE.Mesh(
        createOctaBlockGeo(0.38 * S, 0.42 * S, 0.38 * S, 0.09 * S, 0.014 * S),
        pickMat(side === 1 && hair.highlightPattern === 'streaks'),
      );
      sideCurl.position.set(side * 0.62 * S, 0.16 * S, 0.1 * S);
      sideCurl.rotation.z = side * -0.22;
      sidesGroup.add(sideCurl);
    }
  } else if (style === 'mohawk') {
    // Faceted shaved-side ridge + 6 interlocking beveled chisel blades
    const shavedCap = new THREE.Mesh(
      createOctaBlockGeo(1.22 * S, 0.24 * S, 1.24 * S, 0.2 * S, 0.012 * S),
      makeHairPlasticMat(shadeHex(hair.primaryColor, -0.28), false),
    );
    shavedCap.position.set(0, 0.34 * S, -0.02 * S);
    sidesGroup.add(shavedCap);

    const finGeo = createPolygonExtrude(
      [
        [-0.14 * S, 0],
        [0.14 * S, 0],
        [0.18 * S, 0.44 * S],
        [0, 0.62 * S],
        [-0.14 * S, 0.42 * S],
      ],
      0.24 * S,
      0.016 * S,
    );
    finGeo.rotateY(Math.PI / 2);

    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(
        finGeo,
        pickMat(
          (i % 2 === 1 && hair.highlightPattern === 'streaks') ||
            (i >= 4 && hair.highlightPattern === 'ombre') ||
            (i === 0 && hair.highlightPattern === 'tips'),
        ),
      );
      fin.position.set(0, (0.44 - i * 0.04) * S, (0.44 - i * 0.2) * S);
      fin.rotation.x = 0.24 - i * 0.18;
      fin.castShadow = true;
      crownGroup.add(fin);
    }
  } else if (style === 'ponytail') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      splitPart: true,
      topHeight: 0.3 * S,
      backDrop: 0.84 * S,
      sideDrop: 0.42 * S,
      crownOffsetY: 0.44 * S,
    });

    const bangHalfGeo = createPolygonExtrude(
      [
        [0.02 * S, 0.16 * S],
        [0.54 * S, -0.14 * S],
        [0.58 * S, 0.04 * S],
        [0.2 * S, 0.26 * S],
        [0.02 * S, 0.26 * S],
      ],
      0.14 * S,
      0.014 * S,
    );
    for (const side of [-1, 1]) {
      const bang = new THREE.Mesh(bangHalfGeo, baseMat);
      bang.scale.x = side;
      bang.position.set(0, 0.24 * S, 0.56 * S);
      bang.rotation.x = -0.16;
      bangsGroup.add(bang);
    }

    // Hexagonal blocky hair tie collar
    const tie = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 0.12 * S, 6),
      accentMat,
    );
    tie.rotation.x = Math.PI / 2 - 0.35;
    tie.position.set(0, 0.08 * S, -0.02 * S);

    // Segmented faceted blocky ponytail prisms hanging gracefully down tailPivot
    const upperTail = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.16 * S, 0.04 * S],
          [0.16 * S, 0.04 * S],
          [0.24 * S, -0.52 * S],
          [0, -0.64 * S],
          [-0.24 * S, -0.52 * S],
        ],
        0.26 * S,
        0.018 * S,
      ),
      baseMat,
    );
    upperTail.position.set(0, 0.04 * S, -0.18 * S);
    upperTail.rotation.x = 0.24;
    upperTail.castShadow = true;

    const lowerTail = new THREE.Mesh(
      createPolygonExtrude(
        [
          [-0.22 * S, -0.44 * S],
          [0.22 * S, -0.44 * S],
          [0.18 * S, -1.06 * S],
          [0, -1.32 * S],
          [-0.18 * S, -1.06 * S],
        ],
        0.22 * S,
        0.018 * S,
      ),
      pickMat(hair.highlightPattern !== 'none'),
    );
    lowerTail.position.set(0, 0.02 * S, -0.24 * S);
    lowerTail.rotation.x = 0.06;
    lowerTail.castShadow = true;

    tailPivot.add(tie, upperTail, lowerTail);
  } else if (style === 'twinTails') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      splitPart: true,
      topHeight: 0.3 * S,
      backDrop: 0.8 * S,
      sideDrop: 0.38 * S,
      crownOffsetY: 0.44 * S,
    });

    const bangHalfGeo = createPolygonExtrude(
      [
        [0.01 * S, 0.16 * S],
        [0.54 * S, -0.16 * S],
        [0.58 * S, 0.04 * S],
        [0.2 * S, 0.26 * S],
        [0.01 * S, 0.26 * S],
      ],
      0.14 * S,
      0.014 * S,
    );

    for (const side of [-1, 1]) {
      const bang = new THREE.Mesh(bangHalfGeo, baseMat);
      bang.scale.x = side;
      bang.position.set(0, 0.24 * S, 0.56 * S);
      bang.rotation.x = -0.16;
      bangsGroup.add(bang);

      const scrunchie = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15 * S, 0.15 * S, 0.12 * S, 6),
        accentMat,
      );
      scrunchie.rotation.z = Math.PI / 2;
      scrunchie.position.set(side * 0.66 * S, 0.06 * S, 0.36 * S);

      // Flared low-poly faceted twin tail prism
      const twinTail = new THREE.Mesh(
        createPolygonExtrude(
          [
            [-0.1 * S, 0.04 * S],
            [0.1 * S, 0.04 * S],
            [0.24 * S, -0.68 * S],
            [0.12 * S, -1.18 * S],
            [-0.08 * S, -1.04 * S],
            [-0.16 * S, -0.58 * S],
          ],
          0.22 * S,
          0.016 * S,
        ),
        pickMat(hair.highlightPattern !== 'none'),
      );
      twinTail.scale.x = side;
      twinTail.position.set(side * 0.78 * S, 0.02 * S, 0.24 * S);
      twinTail.rotation.set(0.12, side * -0.16, side * 0.16);
      twinTail.castShadow = true;

      tailPivot.add(scrunchie, twinTail);
    }
  } else if (style === 'braids') {
    addBlockySkullShell(crownGroup, sidesGroup, baseMat, baseMat, {
      splitPart: true,
      topHeight: 0.3 * S,
      backDrop: 0.84 * S,
      sideDrop: 0.4 * S,
      crownOffsetY: 0.44 * S,
    });

    const bangHalfGeo = createPolygonExtrude(
      [
        [0.01 * S, 0.16 * S],
        [0.52 * S, -0.14 * S],
        [0.56 * S, 0.04 * S],
        [0.2 * S, 0.26 * S],
        [0.01 * S, 0.26 * S],
      ],
      0.14 * S,
      0.014 * S,
    );

    const linkGeo = createOctaBlockGeo(0.24 * S, 0.22 * S, 0.24 * S, 0.06 * S, 0.012 * S);

    for (const side of [-1, 1]) {
      const bang = new THREE.Mesh(bangHalfGeo, baseMat);
      bang.scale.x = side;
      bang.position.set(0, 0.24 * S, 0.56 * S);
      bang.rotation.x = -0.16;
      bangsGroup.add(bang);

      for (let seg = 0; seg < 5; seg++) {
        const useHighlight =
          (seg >= 3 && (hair.highlightPattern === 'tips' || hair.highlightPattern === 'ombre')) ||
          (seg % 2 === 1 && hair.highlightPattern === 'streaks');
        const link = new THREE.Mesh(linkGeo, pickMat(useHighlight));
        link.position.set(side * 0.38 * S, (-0.12 - seg * 0.2) * S, -0.04 * S);
        link.rotation.y = (seg % 2 === 0 ? 0.35 : -0.35) + Math.PI / 4;
        link.scale.setScalar(1 - seg * 0.06);
        link.castShadow = true;
        tailPivot.add(link);
      }

      const tie = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11 * S, 0.11 * S, 0.08 * S, 6),
        accentMat,
      );
      tie.position.set(side * 0.38 * S, -1.04 * S, -0.04 * S);

      const tassel = new THREE.Mesh(
        createBlockySpikeGeo(0.11 * S, 0.26 * S),
        pickMat(hair.highlightPattern !== 'none'),
      );
      tassel.rotation.x = Math.PI;
      tassel.position.set(side * 0.38 * S, -1.18 * S, -0.04 * S);
      tailPivot.add(tie, tassel);
    }
  }

  // Optional Hibiscus Flower Accessory pinned at upper viewer-right (+X) temple
  if (hair.flowerAccessory) {
    const flower = createFacetedHibiscus();
    flower.position.set(0.45 * S, 0.44 * S, 0.52 * S);
    flower.rotation.set(-0.26, 0.42, -0.2);
    accessoryGroup.add(flower);
  }

  const applyHatTuck = (tuck: HatTuckProfile) => {
    if (tuck === 'none') {
      crownGroup.visible = true;
      crownGroup.scale.set(1, 1, 1);
      crownGroup.position.set(0, 0, 0);
      bangsGroup.visible = true;
      sidesGroup.visible = true;
      accessoryGroup.visible = true;
      accessoryGroup.position.set(0, 0, 0);
    } else if (tuck === 'brim') {
      crownGroup.visible = true;
      crownGroup.scale.set(0.95, 0.42, 0.95);
      crownGroup.position.set(0, -0.06 * S, 0);
      bangsGroup.visible = true;
      sidesGroup.visible = true;
      accessoryGroup.visible = true;
      accessoryGroup.position.set(0, -0.04 * S, 0.02 * S);
    } else if (tuck === 'crown') {
      crownGroup.visible = true;
      crownGroup.scale.set(0.9, 0.34, 0.9);
      crownGroup.position.set(0, -0.08 * S, 0);
      bangsGroup.visible = true;
      sidesGroup.visible = true;
      accessoryGroup.visible = true;
      accessoryGroup.position.set(0.03 * S, -0.08 * S, 0.03 * S);
    } else {
      // fullCover (helmets, hoods)
      crownGroup.visible = false;
      bangsGroup.visible = true;
      sidesGroup.visible = false;
      accessoryGroup.visible = false;
    }
  };

  applyHatTuck(getHatTuckProfile(initialHatId));

  const applyPhysics = (hairPitch: number, hairRoll: number) => {
    tailPivot.rotation.set(hairPitch, 0, hairRoll);
    bangsGroup.rotation.set(hairPitch * 0.2, 0, hairRoll * 0.16);
    sidesGroup.rotation.set(hairPitch * 0.15, 0, hairRoll * 0.14);
  };

  return { root, applyHatTuck, applyPhysics };
}

// =========================================================================
// 4. Reworked Multi-Part PBR Head, Hat, Arm, Back & Leg Gear Builders
// =========================================================================

export function buildHeadOrnament(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#38bdf8',
) {
  disposeGroupChildren(socket);
  if (id === 'none') return;

  const frameMat = makeClothMat(color, 0.28, 0.25);
  const accentMat = makeMetalMat(accentColor, 0.2, 0.8);

  if (id === 'shades') {
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: shadeHex(color, -0.35),
      roughness: 0.08,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.36 * S, 0.22 * S, 0.07 * S), accentMat);
      rim.position.set(side * 0.23 * S, 0.08 * S, 0.63 * S);
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.3 * S, 0.16 * S, 0.08 * S), lensMat);
      lens.position.set(side * 0.23 * S, 0.08 * S, 0.64 * S);
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.07 * S, 0.86 * S), frameMat);
      temple.position.set(side * 0.59 * S, 0.1 * S, 0.21 * S);
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 0.07 * S, 0.07 * S), accentMat);
      hinge.position.set(side * 0.5 * S, 0.1 * S, 0.62 * S);
      socket.add(rim, lens, temple, hinge);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 0.06 * S, 0.07 * S), accentMat);
    bridge.position.set(0, 0.11 * S, 0.64 * S);
    socket.add(bridge);
  } else if (id === 'headphones') {
    const padMat = makeClothMat('#111827', 0.78, 0.02);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.65 * S, 0.075 * S, 10, 24, Math.PI),
      frameMat,
    );
    band.position.set(0, 0.1 * S, 0);
    const cushion = new THREE.Mesh(
      new THREE.TorusGeometry(0.58 * S, 0.05 * S, 8, 18, Math.PI * 0.65),
      padMat,
    );
    cushion.rotation.z = Math.PI * 0.175;
    cushion.position.set(0, 0.1 * S, 0);
    socket.add(band, cushion);

    for (const side of [-1, 1]) {
      const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.07 * S, 0.24 * S, 0.1 * S), accentMat);
      yoke.position.set(side * 0.64 * S, 0.12 * S, 0);
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26 * S, 0.24 * S, 0.16 * S, 16),
        frameMat,
      );
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.64 * S, 0.0 * S, 0);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.21 * S, 0.03 * S, 8, 16),
        accentMat,
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * 0.72 * S, 0.0 * S, 0);
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * S, 0.22 * S, 0.07 * S, 16),
        padMat,
      );
      pad.rotation.z = Math.PI / 2;
      pad.position.set(side * 0.56 * S, 0.0 * S, 0);
      socket.add(yoke, cup, ring, pad);
    }
    const micBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025 * S, 0.025 * S, 0.55 * S, 8),
      accentMat,
    );
    micBoom.rotation.x = Math.PI / 2 - 0.3;
    micBoom.rotation.z = 0.25;
    micBoom.position.set(0.48 * S, -0.16 * S, 0.34 * S);
    socket.add(micBoom);
  } else if (id === 'visor') {
    const glassMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.5,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.62,
    });
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68 * S, 0.68 * S, 0.24 * S, 18, 1, true, -0.95, 1.9),
      glassMat,
    );
    shield.position.set(0, 0.09 * S, 0);
    const browBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.69 * S, 0.69 * S, 0.06 * S, 18, 1, true, -1.05, 2.1),
      frameMat,
    );
    browBar.position.set(0, 0.21 * S, 0);
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.26 * S, 0.28 * S), frameMat);
      pod.position.set(side * 0.62 * S, 0.1 * S, 0.1 * S);
      socket.add(pod);
    }
    socket.add(shield, browBar);
  } else if (id === 'domino') {
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.88 * S, 0.22 * S, 0.07 * S), frameMat);
    mask.position.set(0, 0.09 * S, 0.64 * S);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.92 * S, 0.05 * S, 0.08 * S), accentMat);
    trim.position.set(0, 0.19 * S, 0.64 * S);
    const strap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6 * S, 0.6 * S, 0.06 * S, 18, 1, true),
      frameMat,
    );
    strap.position.set(0, 0.09 * S, 0);
    socket.add(mask, trim, strap);
  } else if (id === 'goggles') {
    const strap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 * S, 0.62 * S, 0.16 * S, 18, 1, true),
      frameMat,
    );
    strap.position.set(0, 0.12 * S, 0);
    const lensMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.28,
      roughness: 0.12,
      metalness: 0.45,
    });
    for (const side of [-1, 1]) {
      const bezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * S, 0.2 * S, 0.14 * S, 14),
        makeMetalMat('#b45309', 0.25, 0.8),
      );
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(side * 0.24 * S, 0.12 * S, 0.62 * S);
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 0.16 * S, 14),
        lensMat,
      );
      glass.rotation.x = Math.PI / 2;
      glass.position.set(side * 0.24 * S, 0.12 * S, 0.63 * S);
      socket.add(bezel, glass);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.22 * S, 0.07 * S, 0.08 * S), frameMat);
    bridge.position.set(0, 0.12 * S, 0.62 * S);
    socket.add(strap, bridge);
  } else if (id === 'monocle') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.16 * S, 0.025 * S, 8, 18),
      makeMetalMat(color, 0.2, 0.85),
    );
    ring.position.set(0.22 * S, 0.09 * S, 0.64 * S);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.14 * S, 16),
      new THREE.MeshPhysicalMaterial({
        color: accentColor,
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42,
      }),
    );
    lens.position.set(0.22 * S, 0.09 * S, 0.64 * S);
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * S, 0.015 * S, 0.42 * S, 6),
      makeMetalMat(color, 0.25, 0.85),
    );
    chain.position.set(0.42 * S, -0.08 * S, 0.56 * S);
    chain.rotation.z = -0.35;
    socket.add(ring, lens, chain);
  }
}

export function buildHatOrnament(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f2f3f3',
) {
  disposeGroupChildren(socket);
  if (id === 'none') return;

  const mainMat = makeClothMat(color, 0.55, 0.06);
  const accentMat = makeClothMat(accentColor, 0.42, 0.12);
  const metalMat = makeMetalMat(color, 0.22, 0.84);
  const goldTrimMat = makeMetalMat(accentColor, 0.22, 0.82);

  if (id === 'cap') {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.62 * S, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mainMat,
    );
    crown.position.y = -0.02 * S;
    crown.castShadow = true;
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.46 * S, 0.26 * S, 0.12 * S),
      accentMat,
    );
    frontPanel.position.set(0, 0.16 * S, 0.55 * S);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.08 * S, 10, 8), accentMat);
    button.position.set(0, 0.6 * S, 0);
    // Curved visor shape
    const visorShape = new THREE.Shape();
    visorShape.moveTo(-0.54 * S, 0);
    visorShape.quadraticCurveTo(0, 0.72 * S, 0.54 * S, 0);
    visorShape.lineTo(0.44 * S, -0.1 * S);
    visorShape.quadraticCurveTo(0, 0.2 * S, -0.44 * S, -0.1 * S);
    visorShape.closePath();
    const visorGeo = new THREE.ExtrudeGeometry(visorShape, {
      depth: 0.07 * S,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.02 * S,
      bevelThickness: 0.02 * S,
    });
    visorGeo.rotateX(Math.PI / 2 + 0.12);
    const visor = new THREE.Mesh(visorGeo, mainMat);
    visor.position.set(0, 0.04 * S, 0.44 * S);
    visor.castShadow = true;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.42 * S, 0.1 * S, 0.08 * S), accentMat);
    strap.position.set(0, 0.04 * S, -0.58 * S);
    socket.add(crown, frontPanel, button, visor, strap);
  } else if (id === 'beanie') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.63 * S, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      mainMat,
    );
    dome.position.y = -0.02 * S;
    dome.castShadow = true;
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.58 * S, 0.13 * S, 10, 20),
      accentMat,
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = 0.02 * S;
    const pom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 * S, 1), accentMat);
    pom.position.y = 0.66 * S;
    socket.add(dome, cuff, pom);
  } else if (id === 'tophat') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88 * S, 0.9 * S, 0.08 * S, 24),
      mainMat,
    );
    brim.castShadow = true;
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 * S, 0.56 * S, 0.88 * S, 24),
      mainMat,
    );
    crown.position.y = 0.46 * S;
    crown.castShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.59 * S, 0.58 * S, 0.16 * S, 24),
      accentMat,
    );
    band.position.y = 0.12 * S;
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.2 * S, 0.18 * S, 0.06 * S),
      makeMetalMat('#f5cd30', 0.2, 0.85),
    );
    buckle.position.set(0, 0.12 * S, 0.58 * S);
    socket.add(brim, crown, band, buckle);
  } else if (id === 'fedora') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92 * S, 0.94 * S, 0.06 * S, 22),
      mainMat,
    );
    brim.rotation.x = 0.08;
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48 * S, 0.58 * S, 0.52 * S, 20),
      mainMat,
    );
    crown.position.y = 0.28 * S;
    crown.castShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.57 * S, 0.58 * S, 0.11 * S, 20),
      accentMat,
    );
    band.position.y = 0.09 * S;
    const feather = new THREE.Mesh(
      new THREE.BoxGeometry(0.06 * S, 0.36 * S, 0.14 * S),
      accentMat,
    );
    feather.position.set(0.56 * S, 0.22 * S, 0.06 * S);
    feather.rotation.z = -0.35;
    socket.add(brim, crown, band, feather);
  } else if (id === 'valkyrie') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.65 * S, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      metalMat,
    );
    dome.position.y = -0.06 * S;
    dome.castShadow = true;
    const browRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.64 * S, 0.06 * S, 8, 22),
      goldTrimMat,
    );
    browRim.rotation.x = Math.PI / 2;
    browRim.position.y = -0.04 * S;
    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * S, 0.42 * S, 0.88 * S),
      metalMat,
    );
    crest.position.set(0, 0.46 * S, -0.02 * S);
    const noseGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * S, 0.34 * S, 0.08 * S),
      metalMat,
    );
    noseGuard.position.set(0, -0.18 * S, 0.62 * S);

    // Multi-feather wings L/R
    for (const side of [-1, 1]) {
      for (let f = 0; f < 3; f++) {
        const feather = new THREE.Mesh(
          new THREE.BoxGeometry(0.1 * S, (0.72 - f * 0.16) * S, 0.28 * S),
          goldTrimMat,
        );
        feather.position.set(
          side * (0.68 + f * 0.05) * S,
          (0.24 - f * 0.09) * S,
          (-0.08 - f * 0.14) * S,
        );
        feather.rotation.set(-0.32 - f * 0.1, 0, side * (-0.36 - f * 0.06));
        feather.castShadow = true;
        socket.add(feather);
      }
    }
    socket.add(dome, browRim, crest, noseGuard);
  } else if (id === 'knightHelm') {
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 * S, 0.64 * S, 0.84 * S, 16),
      metalMat,
    );
    dome.position.y = -0.22 * S;
    dome.castShadow = true;
    const topCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.62 * S, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      metalMat,
    );
    topCap.position.y = 0.2 * S;
    const visorSlit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9 * S, 0.12 * S, 0.2 * S),
      makeClothMat('#0f172a', 0.5),
    );
    visorSlit.position.set(0, -0.12 * S, 0.58 * S);
    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * S, 0.46 * S, 0.96 * S),
      accentMat,
    );
    crest.position.set(0, 0.68 * S, -0.04 * S);
    socket.add(dome, topCap, visorSlit, crest);
  } else if (id === 'wizard') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.06 * S, 1.12 * S, 0.08 * S, 24),
      mainMat,
    );
    brim.castShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 * S, 0.64 * S, 0.16 * S, 20),
      goldTrimMat,
    );
    band.position.y = 0.12 * S;
    const lowerCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 * S, 0.62 * S, 0.72 * S, 18),
      mainMat,
    );
    lowerCone.position.set(0, 0.44 * S, -0.04 * S);
    lowerCone.rotation.x = -0.12;
    const upperTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.32 * S, 0.68 * S, 16),
      mainMat,
    );
    upperTip.position.set(0, 0.98 * S, -0.22 * S);
    upperTip.rotation.x = -0.45;
    upperTip.castShadow = true;
    const buckle = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14 * S, 0),
      goldTrimMat,
    );
    buckle.position.set(0, 0.14 * S, 0.64 * S);
    socket.add(brim, band, lowerCone, upperTip, buckle);
  } else if (id === 'crown') {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 * S, 0.58 * S, 0.22 * S, 18),
      metalMat,
    );
    band.position.y = 0.12 * S;
    band.castShadow = true;
    socket.add(band);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const point = new THREE.Mesh(
        new THREE.ConeGeometry(0.13 * S, 0.34 * S, 4),
        metalMat,
      );
      point.position.set(Math.sin(ang) * 0.54 * S, 0.36 * S, Math.cos(ang) * 0.54 * S);
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08 * S, 0),
        new THREE.MeshStandardMaterial({
          color: accentColor,
          emissive: accentColor,
          emissiveIntensity: 0.45,
          roughness: 0.15,
        }),
      );
      gem.position.set(Math.sin(ang) * 0.61 * S, 0.14 * S, Math.cos(ang) * 0.61 * S);
      socket.add(point, gem);
    }
  } else if (id === 'hood') {
    const cowlBack = new THREE.Mesh(
      new THREE.SphereGeometry(0.72 * S, 16, 12, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.65),
      mainMat,
    );
    cowlBack.position.set(0, -0.08 * S, -0.04 * S);
    cowlBack.castShadow = true;
    const cowlRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.66 * S, 0.12 * S, 8, 18, Math.PI * 1.25),
      accentMat,
    );
    cowlRim.rotation.z = -Math.PI * 0.125;
    cowlRim.position.set(0, -0.14 * S, 0.42 * S);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.32 * S, 0.48 * S, 6), mainMat);
    point.rotation.x = -1.25;
    point.position.set(0, 0.34 * S, -0.68 * S);
    socket.add(cowlBack, cowlRim, point);
  } else if (id === 'halo') {
    const glowMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.0,
      roughness: 0.15,
    });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.66 * S, 0.06 * S, 10, 28), glowMat);
    outerRing.rotation.x = Math.PI / 2 - 0.14;
    outerRing.position.y = 0.54 * S;
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46 * S, 0.03 * S, 8, 22),
      makeMetalMat(accentColor, 0.18, 0.85),
    );
    innerRing.rotation.x = Math.PI / 2 - 0.14;
    innerRing.position.y = 0.54 * S;
    socket.add(outerRing, innerRing);
  }
}

export function buildArmOrnament(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f5cd30',
) {
  disposeGroupChildren(socket);
  if (id === 'none') return;

  const mainMat = makeMetalMat(color, 0.25, 0.72);
  const accentMat = makeMetalMat(accentColor, 0.22, 0.8);

  if (id === 'gauntlet') {
    const bracer = new THREE.Mesh(
      new THREE.BoxGeometry(1.16 * S, 0.92 * S, 1.16 * S),
      mainMat,
    );
    bracer.position.set(0, 0.32 * S, -0.35 * S);
    bracer.castShadow = true;
    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(1.22 * S, 0.24 * S, 0.26 * S),
      accentMat,
    );
    knuckle.position.set(0, -0.02 * S, 0.14 * S);
    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(0.32 * S, 0.54 * S, 0.14 * S),
      accentMat,
    );
    crest.position.set(-0.56 * S, 0.34 * S, -0.35 * S);
    socket.add(bracer, knuckle, crest);
  } else if (id === 'pauldron') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.72 * S, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      mainMat,
    );
    cap.position.set(-0.08 * S, 1.88 * S, -0.35 * S);
    cap.rotation.z = 0.22;
    cap.castShadow = true;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.68 * S, 0.07 * S, 8, 18),
      accentMat,
    );
    rim.rotation.x = Math.PI / 2;
    rim.rotation.y = -0.22;
    rim.position.set(-0.08 * S, 1.86 * S, -0.35 * S);
    socket.add(cap, rim);
  } else if (id === 'wristWatch') {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(1.08 * S, 0.22 * S, 1.08 * S),
      makeClothMat(color, 0.55, 0.1),
    );
    strap.position.set(0, 0.24 * S, -0.35 * S);
    const dial = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * S, 0.3 * S, 0.36 * S),
      new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.85,
        roughness: 0.15,
      }),
    );
    dial.position.set(-0.54 * S, 0.24 * S, -0.35 * S);
    socket.add(strap, dial);
  } else if (id === 'casterBrace') {
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64 * S, 0.6 * S, 0.72 * S, 8),
      makeClothMat(color, 0.5, 0.2),
    );
    sleeve.position.set(0, 0.36 * S, -0.35 * S);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.64 * S, 0.06 * S, 8, 16),
      new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.36 * S, -0.35 * S);
    socket.add(sleeve, ring);
  } else if (id === 'sword') {
    // Legacy backward compat
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14 * S, 0.24 * S, 2.2 * S), mainMat);
    blade.position.z = 1.45 * S;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.64 * S, 0.16 * S, 0.14 * S), accentMat);
    guard.position.z = 0.34 * S;
    socket.add(blade, guard);
  } else if (id === 'bloxyCola') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * S, 0.24 * S, 0.68 * S, 14), mainMat);
    can.position.y = 0.05 * S;
    socket.add(can);
  } else if (id === 'shield') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.16 * S, 1.4 * S, 1.1 * S), mainMat);
    board.position.set(-0.32 * S, 0.45 * S, 0.1 * S);
    socket.add(board);
  }
}

export function buildBackOrnament(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f5cd30',
): {
  capePivot: THREE.Group | null;
  leftWing: THREE.Group | null;
  rightWing: THREE.Group | null;
} {
  disposeGroupChildren(socket);
  if (id === 'none') {
    return { capePivot: null, leftWing: null, rightWing: null };
  }

  const mainMat = makeClothMat(color, 0.52, 0.08);
  const accentMat = makeMetalMat(accentColor, 0.24, 0.78);

  if (id === 'jetpack') {
    const flameMat = new THREE.MeshStandardMaterial({
      color: '#ff9500',
      emissive: '#ff5500',
      emissiveIntensity: 0.95,
      roughness: 0.25,
    });
    for (const side of [-0.44, 0.44]) {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.29 * S, 0.29 * S, 1.38 * S, 14),
        mainMat,
      );
      tank.position.set(side * S, 0, -0.34 * S);
      tank.castShadow = true;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29 * S, 12, 8), accentMat);
      cap.position.set(side * S, 0.68 * S, -0.34 * S);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.31 * S, 0.31 * S, 0.14 * S, 14),
        accentMat,
      );
      band.position.set(side * S, 0.16 * S, -0.34 * S);
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16 * S, 0.27 * S, 0.28 * S, 14),
        accentMat,
      );
      nozzle.position.set(side * S, -0.8 * S, -0.34 * S);
      const glow = new THREE.Mesh(new THREE.ConeGeometry(0.16 * S, 0.38 * S, 10), flameMat);
      glow.rotation.x = Math.PI;
      glow.position.set(side * S, -1.08 * S, -0.34 * S);
      socket.add(tank, cap, band, nozzle, glow);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.16 * S, 0.48 * S, 0.28 * S), accentMat);
    bridge.position.set(0, 0.1 * S, -0.16 * S);
    const gauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 0.08 * S, 12),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.6 }),
    );
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(0, 0.14 * S, -0.32 * S);
    socket.add(bridge, gauge);
  } else if (id === 'wings') {
    let leftWing: THREE.Group | null = null;
    let rightWing: THREE.Group | null = null;
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.56 * S, 0.46 * S, 0.18 * S), accentMat);
    mount.position.set(0, 0.24 * S, -0.1 * S);
    socket.add(mount);

    for (const side of [-1, 1] as const) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.22 * S, 0.26 * S, -0.16 * S);
      wing.rotation.y = side * -0.45;
      // Primary spar
      const spar = new THREE.Mesh(new THREE.BoxGeometry(1.55 * S, 0.16 * S, 0.12 * S), accentMat);
      spar.position.set(side * 0.78 * S, 0.32 * S, 0);
      spar.rotation.z = side * 0.24;
      wing.add(spar);
      // 4 layered feathers
      for (let f = 0; f < 4; f++) {
        const len = (1.42 - f * 0.22) * S;
        const feather = new THREE.Mesh(
          new THREE.BoxGeometry(len, 0.28 * S, 0.1 * S),
          f === 0 ? accentMat : mainMat,
        );
        feather.position.set(side * (0.68 - f * 0.08) * S, (0.14 - f * 0.22) * S, -0.02 * f * S);
        feather.rotation.z = side * (0.22 - f * 0.08);
        feather.castShadow = true;
        wing.add(feather);
      }
      socket.add(wing);
      if (side === 1) leftWing = wing;
      else rightWing = wing;
    }
    return { capePivot: null, leftWing, rightWing };
  } else if (id === 'backpack') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(1.48 * S, 1.46 * S, 0.66 * S), mainMat);
    pack.position.set(0, -0.06 * S, -0.35 * S);
    pack.castShadow = true;
    const flap = new THREE.Mesh(new THREE.BoxGeometry(1.52 * S, 0.38 * S, 0.7 * S), accentMat);
    flap.position.set(0, 0.56 * S, -0.36 * S);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(1.1 * S, 0.62 * S, 0.26 * S), accentMat);
    pocket.position.set(0, -0.34 * S, -0.74 * S);
    const bedroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * S, 0.2 * S, 1.48 * S, 12),
      makeClothMat(shadeHex(accentColor, -0.15), 0.75),
    );
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.86 * S, -0.36 * S);
    socket.add(pack, flap, pocket, bedroll);
  } else if (id === 'cape' || id === 'scarf') {
    const capeMat = makeClothMat(color, 0.65, 0.04, { side: THREE.DoubleSide });
    const trimMat = makeClothMat(accentColor, 0.5, 0.15, { side: THREE.DoubleSide });
    const capePivot = new THREE.Group();
    capePivot.position.set(0, 0.78 * S, -0.06 * S);
    capePivot.rotation.x = 0.12;
    socket.add(capePivot);

    if (id === 'cape') {
      const drapeShape = new THREE.Shape();
      drapeShape.moveTo(-0.78 * S, 0);
      drapeShape.lineTo(0.78 * S, 0);
      drapeShape.lineTo(1.06 * S, -2.68 * S);
      drapeShape.lineTo(-1.06 * S, -2.68 * S);
      drapeShape.closePath();
      const drapeGeo = new THREE.ExtrudeGeometry(drapeShape, {
        depth: 0.06 * S,
        bevelEnabled: false,
      });
      const drape = new THREE.Mesh(drapeGeo, capeMat);
      drape.position.set(0, 0, -0.12 * S);
      drape.castShadow = true;
      const bottomHem = new THREE.Mesh(new THREE.BoxGeometry(2.14 * S, 0.16 * S, 0.08 * S), trimMat);
      bottomHem.position.set(0, -2.62 * S, -0.09 * S);
      capePivot.add(drape, bottomHem);

      for (const side of [-1, 1]) {
        const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * S, 0.16 * S, 0.1 * S, 12), accentMat);
        clasp.rotation.x = Math.PI / 2;
        clasp.position.set(side * 0.72 * S, 0.78 * S, -0.02 * S);
        socket.add(clasp);
      }
    } else {
      // Scarf neck wrap + trailing ends
      const neckWrap = new THREE.Mesh(new THREE.TorusGeometry(0.62 * S, 0.16 * S, 10, 20), capeMat);
      neckWrap.rotation.x = Math.PI / 2;
      neckWrap.position.set(0, 0.86 * S, 0.5 * S);
      socket.add(neckWrap);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.46 * S, 1.85 * S, 0.1 * S), capeMat);
      tail.position.set(0.22 * S, -0.88 * S, -0.1 * S);
      tail.castShadow = true;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.48 * S, 0.16 * S, 0.12 * S), trimMat);
      stripe.position.set(0.22 * S, -1.62 * S, -0.1 * S);
      capePivot.add(tail, stripe);
    }
    return { capePivot, leftWing: null, rightWing: null };
  } else if (id === 'katana') {
    const harness = new THREE.Mesh(new THREE.BoxGeometry(0.65 * S, 0.65 * S, 0.14 * S), mainMat);
    harness.position.set(0, 0.1 * S, -0.12 * S);
    socket.add(harness);
    for (const side of [-1, 1]) {
      const scabbard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * S, 0.09 * S, 2.55 * S, 10),
        mainMat,
      );
      scabbard.position.set(0, 0.05 * S, -0.22 * S);
      scabbard.rotation.z = side * 0.58;
      scabbard.castShadow = true;
      const tsuba = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 0.06 * S, 12),
        accentMat,
      );
      tsuba.position.set(side * -0.68 * S, 1.02 * S, -0.22 * S);
      tsuba.rotation.z = side * 0.58;
      const hilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09 * S, 0.09 * S, 0.52 * S, 10),
        accentMat,
      );
      hilt.position.set(side * -0.86 * S, 1.28 * S, -0.22 * S);
      hilt.rotation.z = side * 0.58;
      socket.add(scabbard, tsuba, hilt);
    }
  } else if (id === 'quiver') {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26 * S, 0.2 * S, 1.65 * S, 12),
      mainMat,
    );
    tube.position.set(0.14 * S, 0.1 * S, -0.24 * S);
    tube.rotation.z = -0.38;
    tube.castShadow = true;
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.26 * S, 0.05 * S, 8, 14),
      accentMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.rotation.y = 0.38;
    collar.position.set(0.45 * S, 0.85 * S, -0.24 * S);
    socket.add(tube, collar);
    for (let a = -1; a <= 1; a++) {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * S, 0.03 * S, 0.55 * S, 6),
        makeClothMat('#d6b384', 0.65),
      );
      shaft.position.set((0.46 + a * 0.09) * S, 1.02 * S, -0.24 * S);
      shaft.rotation.z = -0.38;
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.18 * S, 0.03 * S), accentMat);
      fletch.position.set((0.54 + a * 0.09) * S, 1.2 * S, -0.24 * S);
      fletch.rotation.z = -0.38;
      socket.add(shaft, fletch);
    }
  }
  return { capePivot: null, leftWing: null, rightWing: null };
}

export function buildLegsOrnaments(
  hipsSocket: THREE.Group,
  leftLegSocket: THREE.Group,
  rightLegSocket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f5cd30',
) {
  disposeGroupChildren(hipsSocket);
  disposeGroupChildren(leftLegSocket);
  disposeGroupChildren(rightLegSocket);
  if (id === 'none') return;

  const mainMat = makeClothMat(color, 0.45, 0.25);
  const accentMat = makeMetalMat(accentColor, 0.22, 0.82);

  if (id === 'belt') {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(2.16 * S, 0.3 * S, 1.16 * S), mainMat);
    strap.position.set(0, -0.88 * S, 0);
    strap.castShadow = true;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.46 * S, 0.34 * S, 0.16 * S), accentMat);
    buckle.position.set(0, -0.88 * S, 0.56 * S);
    for (const sx of [-1.1, 1.1]) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 0.34 * S, 0.42 * S), mainMat);
      pouch.position.set(sx * S, -0.94 * S, 0);
      hipsSocket.add(pouch);
    }
    hipsSocket.add(strap, buckle);
  } else if (id === 'kneepads') {
    for (const sock of [leftLegSocket, rightLegSocket]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.08 * S, 0.22 * S, 1.08 * S), mainMat);
      strap.position.set(0, 0.05 * S, 0);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.84 * S, 0.42 * S, 0.18 * S), accentMat);
      plate.position.set(0, 0.05 * S, 0.52 * S);
      plate.castShadow = true;
      sock.add(strap, plate);
    }
  } else if (id === 'greaves') {
    for (const sock of [leftLegSocket, rightLegSocket]) {
      const shin = new THREE.Mesh(new THREE.BoxGeometry(1.12 * S, 0.96 * S, 0.2 * S), mainMat);
      shin.position.set(0, -0.35 * S, 0.48 * S);
      shin.castShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.92 * S, 0.24 * S, 0.24 * S), accentMat);
      trim.position.set(0, 0.08 * S, 0.5 * S);
      sock.add(shin, trim);
    }
  } else if (id === 'thrusters') {
    const glowMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.85,
      roughness: 0.18,
    });
    for (const sock of [leftLegSocket, rightLegSocket]) {
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(1.16 * S, 0.48 * S, 1.16 * S), mainMat);
      cuff.position.set(0, -0.68 * S, 0);
      cuff.castShadow = true;
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.44 * S, 0.26 * S, 0.24 * S), glowMat);
      vent.position.set(0, -0.68 * S, -0.58 * S);
      sock.add(cuff, vent);
    }
  } else if (id === 'pouches') {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(2.14 * S, 0.24 * S, 1.14 * S), mainMat);
    belt.position.set(0, -0.88 * S, 0);
    hipsSocket.add(belt);
    const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.28 * S, 0.5 * S, 0.64 * S), mainMat);
    pouchL.position.set(0.58 * S, 0.48 * S, 0);
    const buckleL = new THREE.Mesh(new THREE.BoxGeometry(0.32 * S, 0.12 * S, 0.16 * S), accentMat);
    buckleL.position.set(0.58 * S, 0.56 * S, 0.12 * S);
    leftLegSocket.add(pouchL, buckleL);
    const pouchR = pouchL.clone();
    pouchR.position.x = -0.58 * S;
    const buckleR = buckleL.clone();
    buckleR.position.x = -0.58 * S;
    rightLegSocket.add(pouchR, buckleR);
  }
}
