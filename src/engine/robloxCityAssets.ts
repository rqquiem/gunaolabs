import * as THREE from 'three';
import {
  createPlasticBrickMaterial,
  createStudBrickMaterial,
  StudTexturePair,
} from './robloxTextures';

export type CityMapModuleKind =
  | 'glassSkyscraper'
  | 'brickTower'
  | 'trafficSignal'
  | 'subwayEntrance'
  | 'billboardGantry'
  | 'cityBusStop';

function finalizeCanvasTex(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function addCityBrick(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  studTextures: StudTexturePair,
  studDensity = 1.2,
  roughness = 0.52,
  castShadow = true,
): THREE.Mesh {
  const mat = createStudBrickMaterial(
    color,
    studTextures,
    Math.max(1, Math.round(w * studDensity)),
    Math.max(1, Math.round(d * studDensity)),
    { roughness, bumpScale: 0.024 },
  );
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function setShadowFlags(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

// =========================================================================
// Procedural Architectural Facade, Billboard & Transit Canvas Textures
// =========================================================================

export function createGlassSkyscraperFacadeTexture(
  primaryColor: string,
  accentColor: string,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 3,
): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Reflective curtain-wall base gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, primaryColor);
  grad.addColorStop(0.5, accentColor);
  grad.addColorStop(1, primaryColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle sky-reflection sheen diagonal band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.25);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.28);
  ctx.lineTo(0, h * 0.55);
  ctx.closePath();
  ctx.fill();

  // Horizontal floor spandrel bands + interior office hints
  const rows = 4;
  const cols = 4;
  const cellW = w / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    const y0 = r * cellH;
    // Spandrel slab
    ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
    ctx.fillRect(0, y0, w, cellH * 0.24);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
    ctx.fillRect(0, y0 + cellH * 0.24, w, 2);

    for (let c = 0; c < cols; c++) {
      const x0 = c * cellW;
      const hash = (r * 13 + c * 7) % 11;
      // Subtle interior blinds / warm sunlit office depth
      if (hash < 3) {
        ctx.fillStyle = 'rgba(254, 243, 199, 0.28)';
        ctx.fillRect(x0 + 5, y0 + cellH * 0.3, cellW - 10, cellH * 0.58);
      } else if (hash < 6) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.32)';
        ctx.fillRect(x0 + 5, y0 + cellH * 0.3, cellW - 10, cellH * 0.32);
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.fillRect(x0 + 5, y0 + cellH * 0.3, cellW - 10, cellH * 0.58);
      }
      // Vertical steel mullion
      ctx.fillStyle = 'rgba(226, 232, 240, 0.52)';
      ctx.fillRect(x0, y0, 4, cellH);
    }
  }

  return finalizeCanvasTex(canvas, maxAnisotropy, repeatX, repeatY);
}

export function createBrickTowerFacadeTexture(
  primaryColor: string,
  accentColor: string,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 2.5,
): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle brick courses
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    const offset = (y / 16) % 2 === 0 ? 0 : 16;
    for (let x = offset; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 16);
      ctx.stroke();
    }
  }

  // Stone belt course
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h / 2, w, 8);

  // Classic arched/framed urban windows (2 rows x 3 cols)
  const rows = 2;
  const cols = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = 18 + c * 78;
      const wy = 24 + r * 126;
      const ww = 54;
      const wh = 82;

      // Limestone lintel & sill
      ctx.fillStyle = accentColor;
      ctx.fillRect(wx - 4, wy - 7, ww + 8, 8);
      ctx.fillRect(wx - 5, wy + wh, ww + 10, 7);

      // Window frame
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wx, wy, ww, wh);

      // Daylight glass reflection + warm curtain hint
      const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      g.addColorStop(0, '#bae6fd');
      g.addColorStop(0.55, '#38bdf8');
      g.addColorStop(1, '#1e3a5f');
      ctx.fillStyle = g;
      ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);

      if ((r + c) % 2 === 0) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.fillRect(wx + 4, wy + wh * 0.45, ww - 8, wh * 0.48);
      }

      // Window muntins
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(wx + ww / 2 - 1.5, wy + 4, 3, wh - 8);
      ctx.fillRect(wx + 4, wy + wh / 2 - 1.5, ww - 8, 3);
    }
  }

  return finalizeCanvasTex(canvas, maxAnisotropy, repeatX, repeatY);
}

export function createCityBillboardTexture(
  primaryColor: string,
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Deterministic variant picked from accentColor charCode so multiple billboards vary naturally
  const variant = accentColor.charCodeAt(accentColor.length - 1) % 3;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  if (variant === 0) {
    bg.addColorStop(0, '#0284c7');
    bg.addColorStop(0.6, '#1d4ed8');
    bg.addColorStop(1, '#0f172a');
  } else if (variant === 1) {
    bg.addColorStop(0, '#f59e0b');
    bg.addColorStop(0.55, '#ea580c');
    bg.addColorStop(1, '#7c2d12');
  } else {
    bg.addColorStop(0, '#0f766e');
    bg.addColorStop(0.6, '#0284c7');
    bg.addColorStop(1, '#1e1b4b');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Clean geometric motif
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(w - 84, 78, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, h - 14, w, 14);

  ctx.textAlign = 'left';
  if (variant === 0) {
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('DOWNTOWN ROBLOXIA', 36, 62);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('BLOXY COLA', 36, 126);
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('ICE COLD · NOW ON EVERY CORNER', 36, 174);
  } else if (variant === 1) {
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('APEX TOWER OBSERVATION DECK', 36, 62);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('SKYLINE PLAZA', 36, 126);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('OPEN DAILY · METRO LINE 1', 36, 174);
  } else {
    ctx.fillStyle = '#a5f3fc';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('EXPRESS SHUTTLE SERVICE', 36, 62);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('VISIT VERBATIM', 36, 126);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('WHERE EVERY IDIOM IS LITERAL', 36, 174);
  }

  // Right emblem badge
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w - 116, 48, 76, 76);
  ctx.fillStyle = accentColor;
  ctx.fillRect(w - 104, 60, 52, 52);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w - 90, 74, 24, 24);

  return finalizeCanvasTex(canvas, maxAnisotropy);
}

export function createSubwaySignTexture(
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, h - 14, w, 14);

  // Line M circle badge
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(68, 58, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('M', 68, 73);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('METRO STATION', 124, 62);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('CENTRAL PLAZA · LINE 1 & EXPRESS', 126, 94);

  return finalizeCanvasTex(canvas, maxAnisotropy);
}

export function createDaylightSkylineWindowTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Vibrant daylight sky gradient for high-rise boardroom view
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#38bdf8');
  sky.addColorStop(0.58, '#bae6fd');
  sky.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft daylight clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(46, 28, 92, 22);
  ctx.fillRect(68, 16, 48, 14);
  ctx.fillRect(320, 36, 114, 24);
  ctx.fillRect(350, 22, 60, 16);

  // Far hazy towers
  const farTowers: [number, number, number, string][] = [
    [10, 96, 54, '#93c5fd'],
    [72, 66, 62, '#7dd3fc'],
    [144, 108, 48, '#93c5fd'],
    [206, 52, 68, '#60a5fa'],
    [286, 86, 58, '#93c5fd'],
    [354, 64, 66, '#7dd3fc'],
    [432, 92, 70, '#93c5fd'],
  ];
  farTowers.forEach(([x, y, bw, col]) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, bw, h - y);
  });

  // Near detailed glass & brick towers
  const nearTowers: [number, number, number, string, string][] = [
    [24, 126, 76, '#1e3a5f', '#7dd3fc'],
    [116, 94, 84, '#334155', '#bae6fd'],
    [224, 118, 72, '#9a3412', '#fde68a'],
    [318, 82, 88, '#0c4a6e', '#38bdf8'],
    [418, 134, 82, '#475569', '#e0f2fe'],
  ];
  nearTowers.forEach(([x, y, bw, base, win]) => {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, bw, h - y);
    ctx.fillStyle = win;
    for (let wy = y + 10; wy < h - 10; wy += 16) {
      for (let wx = x + 8; wx < x + bw - 12; wx += 14) {
        ctx.fillRect(wx, wy, 8, 9);
      }
    }
  });

  return finalizeCanvasTex(canvas, maxAnisotropy);
}

export function createHelipadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(84, 68, 22, 120);
  ctx.fillRect(150, 68, 22, 120);
  ctx.fillRect(84, 117, 88, 22);

  return finalizeCanvasTex(canvas, maxAnisotropy);
}

// =========================================================================
// 6 Reusable Urban Map Builder Modules
// =========================================================================

export function buildGlassSkyscraperGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.62, metalness: 0.08 });
  const darkSteelMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.34, metalness: 0.68 });
  const trimSteelMat = createPlasticBrickMaterial('#cbd5e1', { roughness: 0.24, metalness: 0.78 });
  const lobbyGlowMat = new THREE.MeshStandardMaterial({
    color: '#fef3c7',
    emissive: '#fbbf24',
    emissiveIntensity: 0.48,
    roughness: 0.2,
  });

  const lowerFacadeTex = createGlassSkyscraperFacadeTexture(
    primaryColor,
    accentColor,
    maxAnisotropy,
    2,
    3,
  );
  const upperFacadeTex = createGlassSkyscraperFacadeTexture(
    primaryColor,
    accentColor,
    maxAnisotropy,
    2,
    2.5,
  );

  const glassMatLower = new THREE.MeshStandardMaterial({
    map: lowerFacadeTex,
    roughness: 0.14,
    metalness: 0.42,
  });
  const glassMatUpper = new THREE.MeshStandardMaterial({
    map: upperFacadeTex,
    roughness: 0.12,
    metalness: 0.46,
  });

  // 1. Stone ground lobby podium (y = 0 .. 3.4)
  addCityBrick(group, 9.2, 0.36, 9.2, 0, 0.18, 0, '#cbd5e1', studTextures, 1.0, 0.65);
  const lobbyCore = new THREE.Mesh(new THREE.BoxGeometry(7.8, 3.0, 7.8), lobbyGlowMat);
  lobbyCore.position.y = 1.86;
  group.add(lobbyCore);

  // Perimeter lobby colonnade pilasters
  for (const px of [-3.95, -1.95, 1.95, 3.95]) {
    for (const pz of [-3.95, 3.95]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.62, 3.1, 0.62), stoneMat);
      col.position.set(px, 1.9, pz);
      group.add(col);
    }
  }
  for (const pz of [-1.95, 1.95]) {
    for (const px of [-3.95, 3.95]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.62, 3.1, 0.62), stoneMat);
      col.position.set(px, 1.9, pz);
      group.add(col);
    }
  }

  // Entrance canopy (+Z front)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, 1.9), darkSteelMat);
  canopy.position.set(0, 2.75, 4.95);
  const canopyAccent = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.1, 2.02), trimSteelMat);
  canopyAccent.position.set(0, 2.9, 4.95);
  group.add(canopy, canopyAccent);

  // Podium roof cap
  const podiumCap = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.42, 9.0), stoneMat);
  podiumCap.position.y = 3.56;
  group.add(podiumCap);

  // 2. Main Glass Curtain-Wall Shaft (y = 3.77 .. 18.2)
  const mainShaft = new THREE.Mesh(
    new THREE.BoxGeometry(7.8, 14.4, 7.8),
    [glassMatLower, glassMatLower, darkSteelMat, darkSteelMat, glassMatLower, glassMatLower],
  );
  mainShaft.position.y = 10.97;
  group.add(mainShaft);

  // Sculpted vertical corner fins for bold silhouette depth
  for (const fx of [-3.96, 3.96]) {
    for (const fz of [-3.96, 3.96]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 14.7, 0.42), trimSteelMat);
      fin.position.set(fx, 11.05, fz);
      group.add(fin);
    }
  }

  // Mechanical setback collar band
  const mechBand = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.72, 8.2), darkSteelMat);
  mechBand.position.y = 18.4;
  group.add(mechBand);

  // 3. Upper Setback Crown Shaft (y = 18.76 .. 26.8)
  const upperShaft = new THREE.Mesh(
    new THREE.BoxGeometry(6.1, 8.0, 6.1),
    [glassMatUpper, glassMatUpper, darkSteelMat, darkSteelMat, glassMatUpper, glassMatUpper],
  );
  upperShaft.position.y = 22.76;
  group.add(upperShaft);

  // Rooftop crown parapet & illuminated accent trim
  const crownCap = new THREE.Mesh(new THREE.BoxGeometry(6.55, 0.55, 6.55), trimSteelMat);
  crownCap.position.y = 27.0;
  const crownGlow = new THREE.Mesh(
    new THREE.BoxGeometry(6.62, 0.16, 6.62),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    }),
  );
  crownGlow.position.y = 27.32;
  group.add(crownCap, crownGlow);

  // 4. Rooftop Helipad Deck + Mechanical Penthouse + Spire Antenna
  const helipadTex = createHelipadTexture(maxAnisotropy);
  const helipadDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.25, 0.22, 24),
    [
      darkSteelMat,
      new THREE.MeshStandardMaterial({ map: helipadTex, roughness: 0.65 }),
      darkSteelMat,
    ],
  );
  helipadDeck.position.set(0, 27.45, 0.45);
  group.add(helipadDeck);

  // Mechanical core + tapered spire at rear of roof
  const penthouse = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.7), darkSteelMat);
  penthouse.position.set(0, 28.05, -2.0);
  const spireBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 1.4, 10), trimSteelMat);
  spireBase.position.set(0, 29.45, -2.0);
  const spireRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 5.2, 10), trimSteelMat);
  spireRod.position.set(0, 32.7, -2.0);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 8),
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    }),
  );
  beacon.position.set(0, 35.38, -2.0);
  group.add(penthouse, spireBase, spireRod, beacon);

  setShadowFlags(group, true, true);
  return group;
}

export function buildBrickTowerGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = createPlasticBrickMaterial(accentColor, { roughness: 0.64 });
  const darkTrimMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.42, metalness: 0.45 });
  const brickTex = createBrickTowerFacadeTexture(
    primaryColor,
    accentColor,
    maxAnisotropy,
    2,
    3,
  );
  const brickWallMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.72,
    metalness: 0.04,
  });
  const shopGlassMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    emissive: '#fef3c7',
    emissiveIntensity: 0.36,
    roughness: 0.16,
    metalness: 0.25,
  });

  // Ground-floor retail base
  addCityBrick(group, 8.6, 0.3, 8.6, 0, 0.15, 0, '#94a3b8', studTextures, 1.0, 0.7);
  const groundBody = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.2, 8.2), stoneMat);
  groundBody.position.y = 1.9;
  group.add(groundBody);

  // Glowing storefront display windows + striped awnings on front & side
  for (const side of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const frontGroup = new THREE.Group();
    frontGroup.rotation.y = side;
    const displayWin = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.85, 0.16), shopGlassMat);
    displayWin.position.set(0, 1.55, 4.12);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.22, 1.15),
      createPlasticBrickMaterial(primaryColor, { roughness: 0.55 }),
    );
    awning.position.set(0, 2.75, 4.55);
    awning.rotation.x = 0.22;
    frontGroup.add(displayWin, awning);
    group.add(frontGroup);
  }

  // Stone cornice ledge above retail
  const cornice1 = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.4, 8.7), stoneMat);
  cornice1.position.y = 3.7;
  group.add(cornice1);

  // Brick main shaft (y = 3.9 .. 17.5)
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(7.9, 13.6, 7.9),
    [brickWallMat, brickWallMat, stoneMat, stoneMat, brickWallMat, brickWallMat],
  );
  shaft.position.y = 10.7;
  group.add(shaft);

  // Ornate stepped parapet crown
  const corniceTop = new THREE.Mesh(new THREE.BoxGeometry(8.55, 0.52, 8.55), stoneMat);
  corniceTop.position.y = 17.75;
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(8.15, 0.75, 8.15), darkTrimMat);
  parapet.position.y = 18.35;
  group.add(corniceTop, parapet);

  // Rooftop classic wooden water tower + HVAC unit
  const wtGroup = new THREE.Group();
  wtGroup.position.set(-1.9, 18.7, -1.6);
  const wtWood = createPlasticBrickMaterial('#7c4a2d', { roughness: 0.78 });
  for (const [lx, lz] of [
    [-0.65, -0.65],
    [0.65, -0.65],
    [-0.65, 0.65],
    [0.65, 0.65],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.7, 8), darkTrimMat);
    leg.position.set(lx, 0.85, lz);
    wtGroup.add(leg);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.75, 14), wtWood);
  tank.position.y = 2.45;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.18, 0.85, 14), darkTrimMat);
  roof.position.y = 3.75;
  wtGroup.add(tank, roof);
  group.add(wtGroup);

  const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.05, 1.6), stoneMat);
  hvac.position.set(1.75, 19.2, 1.4);
  group.add(hvac);

  setShadowFlags(group, true, true);
  return group;
}

export function buildTrafficSignalGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const group = new THREE.Group();
  const poleMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.36, metalness: 0.68 });
  const housingMat = createPlasticBrickMaterial(accentColor, { roughness: 0.42, metalness: 0.25 });

  // Concrete plinth base
  addCityBrick(group, 0.72, 0.34, 0.72, 0, 0.17, 0, '#94a3b8', studTextures, 1.5, 0.72);

  // Vertical mast pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.8, 12), poleMat);
  pole.position.y = 3.1;
  group.add(pole);

  // Cantilever mast arm reaching over traffic lane (+X)
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 4.2, 10), poleMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(2.05, 5.45, 0);
  group.add(arm);

  // Two hanging signal heads (one mid-arm, one far-arm)
  for (const sx of [1.9, 3.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.24, 0.34), housingMat);
    head.position.set(sx, 4.95, 0);
    group.add(head);

    const lights: [number, string, number][] = [
      [5.32, '#ef4444', 0.45],
      [4.95, '#f59e0b', 0.35],
      [4.58, '#22c55e', 1.65],
    ];
    for (const [ly, col, em] of lights) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 8),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: em,
          roughness: 0.2,
        }),
      );
      bulb.position.set(sx, ly, 0.16);
      group.add(bulb);
    }
  }

  // Green street-name blade on arm
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.34, 0.08),
    createPlasticBrickMaterial('#15803d', { roughness: 0.45 }),
  );
  blade.position.set(1.05, 5.75, 0);
  group.add(blade);

  // Pedestrian walk/don't-walk box
  const pedBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.24), poleMat);
  pedBox.position.set(0, 2.65, 0.22);
  const walkGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.22, 0.04),
    new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#38bdf8',
      emissiveIntensity: 1.1,
    }),
  );
  walkGlow.position.set(0, 2.65, 0.34);
  group.add(pedBox, walkGlow);

  setShadowFlags(group, true, true);
  return group;
}

export function buildSubwayEntranceGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.32, metalness: 0.72 });
  const tileMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.48 });
  const darkVoidMat = createPlasticBrickMaterial('#090d16', { roughness: 0.9 });
  const glassRoofMat = new THREE.MeshStandardMaterial({
    color: '#7dd3fc',
    roughness: 0.12,
    metalness: 0.22,
    transparent: true,
    opacity: 0.68,
  });

  // Concrete & tiled perimeter surround walls
  addCityBrick(group, 4.4, 0.16, 6.2, 0, 0.08, 0, '#cbd5e1', studTextures, 1.2, 0.7);
  addCityBrick(group, 0.28, 1.15, 5.8, -1.95, 0.65, 0, '#475569', studTextures, 1.2, 0.55);
  addCityBrick(group, 0.28, 1.15, 5.8, 1.95, 0.65, 0, '#475569', studTextures, 1.2, 0.55);
  addCityBrick(group, 4.18, 1.35, 0.32, 0, 0.75, -2.75, '#475569', studTextures, 1.2, 0.55);

  // Descending tiled steps + recessed glowing subterranean doorway
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.14, 0.55), tileMat);
    step.position.set(0, 0.14 - i * 0.03, 1.6 - i * 0.68);
    group.add(step);
  }
  const tunnel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 2.2), darkVoidMat);
  tunnel.position.set(0, 0.18, -1.4);
  group.add(tunnel);

  // Steel canopy arches & translucent sky-glass roof
  for (const cz of [-2.4, -0.3, 1.8]) {
    for (const cx of [-1.85, 1.85]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 3.0, 10), steelMat);
      post.position.set(cx, 1.65, cz);
      group.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.14, 0.16), steelMat);
    beam.position.set(0, 3.12, cz);
    group.add(beam);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.12, 4.8), glassRoofMat);
  roof.position.set(0, 3.24, -0.3);
  group.add(roof);

  // Illuminated METRO entrance marquee
  const signTex = createSubwaySignTexture(accentColor, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: '#1e293b',
    emissiveIntensity: 0.35,
    roughness: 0.28,
  });
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(4.15, 0.92, 0.22),
    [steelMat, steelMat, steelMat, steelMat, signMat, signMat],
  );
  signBoard.position.set(0, 3.45, 2.18);
  group.add(signBoard);

  // Twin classic green-globe transit lamps flanking front entrance
  const globeMat = new THREE.MeshStandardMaterial({
    color: '#4ade80',
    emissive: '#22c55e',
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  for (const gx of [-1.95, 1.95]) {
    const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.4, 10), steelMat);
    lampPost.position.set(gx, 1.2, 2.75);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), globeMat);
    globe.position.set(gx, 2.52, 2.75);
    group.add(lampPost, globe);
  }

  setShadowFlags(group, true, true);
  return group;
}

export function buildBillboardGantryGroup(
  primaryColor: string,
  accentColor: string,
  _studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = createPlasticBrickMaterial('#334155', { roughness: 0.36, metalness: 0.72 });
  const frameMat = createPlasticBrickMaterial('#0f172a', { roughness: 0.4, metalness: 0.55 });
  const bbTex = createCityBillboardTexture(primaryColor, accentColor, maxAnisotropy);
  const faceMat = new THREE.MeshStandardMaterial({
    map: bbTex,
    emissive: '#ffffff',
    emissiveMap: bbTex,
    emissiveIntensity: 0.24,
    roughness: 0.32,
  });

  // Twin steel columns
  for (const px of [-2.4, 2.4]) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.85), steelMat);
    plinth.position.set(px, 0.275, 0);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 6.2, 12), steelMat);
    col.position.set(px, 3.35, 0);
    group.add(plinth, col);
  }

  // Billboard frame & double-sided lit display
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 4.1, 0.42),
    [frameMat, frameMat, frameMat, frameMat, faceMat, faceMat],
  );
  board.position.set(0, 7.6, 0);
  group.add(board);

  // Service catwalk & overhead gooseneck floodlights
  const catwalk = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.14, 0.85), steelMat);
  catwalk.position.set(0, 5.45, 0.58);
  group.add(catwalk);

  const lampMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#fde047',
    emissiveIntensity: 1.4,
  });
  for (const lx of [-2.8, 0, 2.8]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.9), steelMat);
    bracket.position.set(lx, 9.72, 0.55);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.3), lampMat);
    hood.position.set(lx, 9.6, 0.92);
    group.add(bracket, hood);
  }

  setShadowFlags(group, true, true);
  return group;
}

export function buildCityBusStopGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.32, metalness: 0.72 });
  const accentMat = createPlasticBrickMaterial(accentColor, { roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.52,
  });

  // Shelter pad & rear glass wall
  addCityBrick(group, 4.6, 0.12, 2.2, 0, 0.06, 0, '#cbd5e1', studTextures, 1.2, 0.72);
  for (const px of [-2.05, 0, 2.05]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 2.95, 10), steelMat);
    post.position.set(px, 1.54, -0.78);
    group.add(post);
  }
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(3.95, 2.3, 0.08), glassMat);
  backGlass.position.set(0, 1.5, -0.78);
  const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 1.45), glassMat);
  sideGlass.position.set(-2.05, 1.5, -0.05);
  group.add(backGlass, sideGlass);

  // Cantilevered roof & transit stripe
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.75, 0.18, 2.15), steelMat);
  roof.position.set(0, 3.05, 0.05);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 0.12), accentMat);
  stripe.position.set(0, 3.05, 1.12);
  group.add(roof, stripe);

  // Illuminated ad / route panel on right flank
  const adTex = createCityBillboardTexture(primaryColor, accentColor, maxAnisotropy);
  const adPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 2.25, 1.4),
    new THREE.MeshStandardMaterial({
      map: adTex,
      emissive: '#ffffff',
      emissiveMap: adTex,
      emissiveIntensity: 0.22,
      roughness: 0.25,
    }),
  );
  adPanel.position.set(2.05, 1.52, -0.02);
  group.add(adPanel);

  // Slatted bench inside shelter
  const benchSeat = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.12, 0.56),
    createPlasticBrickMaterial('#92400e', { roughness: 0.65 }),
  );
  benchSeat.position.set(-0.25, 0.64, -0.25);
  for (const bx of [-1.25, 0.75]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.48), steelMat);
    leg.position.set(bx, 0.34, -0.25);
    group.add(leg);
  }
  group.add(benchSeat);

  setShadowFlags(group, true, true);
  return group;
}

export function buildCityMapModuleGroup(
  kind: CityMapModuleKind,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  switch (kind) {
    case 'glassSkyscraper':
      return buildGlassSkyscraperGroup(primaryColor, accentColor, studTextures, maxAnisotropy);
    case 'brickTower':
      return buildBrickTowerGroup(primaryColor, accentColor, studTextures, maxAnisotropy);
    case 'trafficSignal':
      return buildTrafficSignalGroup(primaryColor, accentColor, studTextures);
    case 'subwayEntrance':
      return buildSubwayEntranceGroup(primaryColor, accentColor, studTextures, maxAnisotropy);
    case 'billboardGantry':
      return buildBillboardGantryGroup(primaryColor, accentColor, studTextures, maxAnisotropy);
    case 'cityBusStop':
      return buildCityBusStopGroup(primaryColor, accentColor, studTextures, maxAnisotropy);
  }
}

// =========================================================================
// Multi-Lane City Grid Roads, Crosswalks & Central Plaza Park
// =========================================================================

export function buildCityGridRoadNetwork(
  root: THREE.Group,
  size: number,
  trimColor: string,
  studTextures: StudTexturePair,
): void {
  const asphaltMat = createPlasticBrickMaterial('#2b3445', { roughness: 0.88 });
  const sidewalkMat = createStudBrickMaterial('#cbd5e1', studTextures, 24, 24, {
    roughness: 0.68,
    bumpScale: 0.02,
  });
  const yellowMat = createPlasticBrickMaterial('#facc15', { roughness: 0.5 });
  const whiteMat = createPlasticBrickMaterial(trimColor, { roughness: 0.48 });

  const roadW = 11.4; // Wide 4-lane boulevard (2 lanes each direction + center divider)
  const span = size - 0.6;

  // Raised city sidewalks covering the 4 building quadrants (leave clean avenue channels along X=0 & Z=0)
  const quadSize = (size - roadW) * 0.5 - 0.5;
  const quadOffset = roadW * 0.5 + quadSize * 0.5;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const quad = new THREE.Mesh(
        new THREE.BoxGeometry(quadSize, 0.12, quadSize),
        sidewalkMat,
      );
      quad.position.set(sx * quadOffset, 0.06, sz * quadOffset);
      quad.receiveShadow = true;
      root.add(quad);
    }
  }

  // Main N-S and E-W 4-lane asphalt avenues (y = 0.035 top = 0.07, safely below sidewalk top 0.12)
  const roadEW = new THREE.Mesh(new THREE.BoxGeometry(span, 0.05, roadW), asphaltMat);
  roadEW.position.set(0, 0.025, 0);
  roadEW.receiveShadow = true;
  const roadNS = new THREE.Mesh(new THREE.BoxGeometry(roadW, 0.05, span), asphaltMat);
  roadNS.position.set(0, 0.028, 0);
  roadNS.receiveShadow = true;
  root.add(roadEW, roadNS);

  // Double-yellow centerlines & dashed white multi-lane dividers along both avenues
  const half = span * 0.5;
  const clearZone = roadW * 0.5 + 3.2;

  for (const dir of [-1, 1]) {
    const segLen = Math.max(4, half - clearZone - 1.5);
    const segCenter = dir * (clearZone + segLen * 0.5);

    // E-W double yellow centerline
    for (const zOff of [-0.18, 0.18]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.02, 0.12), yellowMat);
      line.position.set(segCenter, 0.068, zOff);
      root.add(line);
    }
    // N-S double yellow centerline
    for (const xOff of [-0.18, 0.18]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, segLen), yellowMat);
      line.position.set(xOff, 0.068, segCenter);
      root.add(line);
    }

    // Dashed white multi-lane dividers
    for (let d = clearZone + 1.8; d < half - 2.0; d += 3.8) {
      for (const laneOff of [-2.85, 2.85]) {
        const dashEW = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.02, 0.13), whiteMat);
        dashEW.position.set(dir * d, 0.068, laneOff);
        const dashNS = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 1.75), whiteMat);
        dashNS.position.set(laneOff, 0.068, dir * d);
        root.add(dashEW, dashNS);
      }
    }

    // Four-way zebra crosswalks framing the central intersection
    const crossDist = roadW * 0.5 + 1.35;
    for (let s = -4.3; s <= 4.35; s += 1.08) {
      const stripeEW = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.024, 0.54), whiteMat);
      stripeEW.position.set(dir * crossDist, 0.072, s);
      const stripeNS = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.024, 2.15), whiteMat);
      stripeNS.position.set(s, 0.072, dir * crossDist);
      root.add(stripeEW, stripeNS);
    }
  }

  // Central Plaza Park Lawn in the Southeast (+X, +Z) downtown corner for inviting green contrast
  if (size >= 60) {
    const parkX = 16.5;
    const parkZ = 16.5;
    const parkStone = createPlasticBrickMaterial('#94a3b8', { roughness: 0.65 });
    const parkBorder = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.18, 16.4), parkStone);
    parkBorder.position.set(parkX, 0.15, parkZ);
    parkBorder.receiveShadow = true;
    const parkLawn = new THREE.Mesh(
      new THREE.BoxGeometry(14.8, 0.22, 14.8),
      createStudBrickMaterial('#4b974b', studTextures, 18, 18, { roughness: 0.72 }),
    );
    parkLawn.position.set(parkX, 0.17, parkZ);
    parkLawn.receiveShadow = true;

    // Cross park walkways converging on central fountain
    const walkA = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.05, 2.6), parkStone);
    walkA.position.set(parkX, 0.29, parkZ);
    const walkB = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 15.2), parkStone);
    walkB.position.set(parkX, 0.295, parkZ);
    walkA.receiveShadow = true;
    walkB.receiveShadow = true;

    root.add(parkBorder, parkLawn, walkA, walkB);
  }
}

// =========================================================================
// Distant Metropolitan Skyline Ring & Urban Ground Apron
// (Used by both Roblox City & Idiom Town outdoor scenes!)
// =========================================================================

export function buildCitySkylinePerimeter(
  root: THREE.Group,
  size: number,
  _studTextures: StudTexturePair,
  maxAnisotropy: number,
): void {
  // Extended urban ground apron so map never floats in an empty void
  const apronMat = createPlasticBrickMaterial('#3b4658', { roughness: 0.92 });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(280, 0.4, 280), apronMat);
  apron.position.set(0, -0.72, 0);
  apron.receiveShadow = true;
  root.add(apron);

  // Subtle distant green/urban outer horizon belt
  const glassTexA = createGlassSkyscraperFacadeTexture('#2563eb', '#93c5fd', maxAnisotropy, 1, 3);
  const glassTexB = createGlassSkyscraperFacadeTexture('#0284c7', '#bae6fd', maxAnisotropy, 1, 2.5);
  const brickTex = createBrickTowerFacadeTexture('#9a3412', '#e2e8f0', maxAnisotropy, 1, 2.5);

  const skyMats = [
    new THREE.MeshStandardMaterial({ map: glassTexA, roughness: 0.22, metalness: 0.35 }),
    new THREE.MeshStandardMaterial({ map: glassTexB, roughness: 0.2, metalness: 0.38 }),
    new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.68, metalness: 0.05 }),
    createPlasticBrickMaterial('#475569', { roughness: 0.52, metalness: 0.2 }),
  ];
  const capMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.45, metalness: 0.4 });

  // Place a scenic 360-degree skyline ring well beyond the playable baseplate
  const baseRadius = Math.max(size * 0.64, 34);
  const towerCount = 26;

  for (let i = 0; i < towerCount; i++) {
    const angle = (i / towerCount) * Math.PI * 2 + (i % 2 === 0 ? 0.04 : -0.03);
    const radialJitter = ((i * 19) % 11) * 2.2;
    const dist = baseRadius + 10 + radialJitter;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;

    // Emphasize dramatic tallest silhouettes behind -Z (where most cameras face!)
    const isNorthBackdrop = tz < -baseRadius * 0.25;
    const w = 6.5 + ((i * 7) % 5) * 1.4;
    const d = 6.5 + ((i * 5) % 4) * 1.4;
    const h = (isNorthBackdrop ? 22 : 14) + ((i * 11) % 7) * 4.4;

    const wallMat = skyMats[i % skyMats.length];
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      [wallMat, wallMat, capMat, capMat, wallMat, wallMat],
    );
    tower.position.set(tx, h * 0.5 - 0.5, tz);
    tower.castShadow = false;
    tower.receiveShadow = true;
    root.add(tower);

    // Optional stepped crown + spire on every 3rd skyscraper
    if (i % 3 === 0) {
      const crownH = 4.2 + (i % 3) * 1.8;
      const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, crownH, d * 0.68), wallMat);
      crown.position.set(tx, h + crownH * 0.5 - 0.5, tz);
      root.add(crown);

      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.22, 6.2, 8),
        capMat,
      );
      spire.position.set(tx, h + crownH + 2.6, tz);
      root.add(spire);
    }
  }
}
