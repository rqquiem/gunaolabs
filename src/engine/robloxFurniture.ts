import * as THREE from 'three';
import {
  createPlasticBrickMaterial,
  createStudBrickMaterial,
  StudTexturePair,
} from './robloxTextures';

function setShadows(group: THREE.Object3D, cast = true, receive = true) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

function addBrick(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string | number,
  studTextures: StudTexturePair,
  studDensity = 1.6,
  roughness = 0.45,
): THREE.Mesh {
  const mat = createStudBrickMaterial(
    color,
    studTextures,
    Math.max(1, Math.round(w * studDensity)),
    Math.max(1, Math.round(d * studDensity)),
    { roughness, bumpScale: 0.025 },
  );
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// =========================================================================
// Cozy Gamer Bedroom Furniture Models (Grounded at y = 0)
// =========================================================================

export function buildGamerBedGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const frameMat = createStudBrickMaterial('#3b2820', studTextures, 3, 2, {
    roughness: 0.62,
  });
  const mattressMat = createPlasticBrickMaterial('#f1f5f9', { roughness: 0.78 });
  const blanketMat = createStudBrickMaterial(primaryColor, studTextures, 3, 3, {
    roughness: 0.72,
  });
  const pillowMat = createPlasticBrickMaterial(accentColor, { roughness: 0.68 });
  const whitePillowMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.75 });
  const rgbMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.05,
    roughness: 0.2,
  });

  // Corner legs grounded at y = 0
  for (const [lx, lz] of [
    [-0.95, -1.42],
    [0.95, -1.42],
    [-0.95, 1.42],
    [0.95, 1.42],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), frameMat);
    leg.position.set(lx, 0.14, lz);
    root.add(leg);
  }

  // Bed base frame + underglow RGB strip
  const platform = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.22, 3.08), frameMat);
  platform.position.set(0, 0.34, 0);
  root.add(platform);

  const underGlow = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.05, 2.82), rgbMat);
  underGlow.position.set(0, 0.21, 0);
  root.add(underGlow);

  // Tall headboard (-Z) & low footboard (+Z)
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.24, 0.22), frameMat);
  headboard.position.set(0, 0.68, -1.48);
  const headboardTrim = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.08, 0.06), rgbMat);
  headboardTrim.position.set(0, 1.14, -1.35);

  const footboard = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.56, 0.18), frameMat);
  footboard.position.set(0, 0.44, 1.48);
  root.add(headboard, headboardTrim, footboard);

  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.28, 2.74), mattressMat);
  mattress.position.set(0, 0.59, 0);
  root.add(mattress);

  // Folded cozy duvet blanket covering lower 68% with >= 0.03 clearance over mattress
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.12, 1.92), blanketMat);
  blanket.position.set(0, 0.75, 0.41);
  const blanketFold = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.08, 0.28), pillowMat);
  blanketFold.position.set(0, 0.81, -0.42);
  root.add(blanket, blanketFold);

  // Sleeping pillow + accent gamer cushion
  const mainPillow = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.18, 0.52), whitePillowMat);
  mainPillow.position.set(0, 0.81, -1.04);
  mainPillow.rotation.x = 0.14;

  const accentPillow = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.42), pillowMat);
  accentPillow.position.set(0.32, 0.91, -0.82);
  accentPillow.rotation.set(0.28, -0.22, 0);
  root.add(mainPillow, accentPillow);

  setShadows(root, true, true);
  return root;
}

export function buildPcDeskGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const deskTopMat = createStudBrickMaterial(primaryColor, studTextures, 4, 2, {
    roughness: 0.42,
  });
  const legMat = createPlasticBrickMaterial('#1b2029', {
    roughness: 0.36,
    metalness: 0.45,
  });
  const bezelMat = createPlasticBrickMaterial('#0f172a', {
    roughness: 0.32,
    metalness: 0.3,
  });
  const rgbMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.2,
    roughness: 0.18,
  });
  const screenGlowMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.85,
    roughness: 0.15,
  });
  const screenAltMat = new THREE.MeshStandardMaterial({
    color: '#c084fc',
    emissive: '#7e22ce',
    emissiveIntensity: 0.8,
    roughness: 0.15,
  });

  // Desk Frame Legs (y = 0..0.92)
  for (const [lx, lz] of [
    [-1.24, -0.44],
    [1.24, -0.44],
    [-1.24, 0.44],
    [1.24, 0.44],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 0.12), legMat);
    leg.position.set(lx, 0.46, lz);
    root.add(leg);
  }
  const footL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.04), legMat);
  footL.position.set(-1.24, 0.04, 0);
  const footR = footL.clone();
  footR.position.x = 1.24;
  root.add(footL, footR);

  // Tabletop + Back RGB Strip
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.1, 1.12), deskTopMat);
  top.position.set(0, 0.95, 0);
  const rearLed = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.06, 0.05), rgbMat);
  rearLed.position.set(0, 0.95, -0.57);
  root.add(top, rearLed);

  // Deskmat + Mechanical Keyboard + RGB Mouse (clear Y spacing >= 0.02)
  const deskMat = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.02, 0.56), bezelMat);
  deskMat.position.set(-0.22, 1.01, 0.16);
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.24), legMat);
  keyboard.position.set(-0.32, 1.04, 0.18);
  const keyGlow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.18), rgbMat);
  keyGlow.position.set(-0.32, 1.06, 0.18);
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.2), bezelMat);
  mouse.position.set(0.24, 1.04, 0.18);
  const mouseGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), rgbMat);
  mouseGlow.position.set(0.24, 1.065, 0.18);
  root.add(deskMat, keyboard, keyGlow, mouse, mouseGlow);

  // Primary Ultrawide Monitor + Stand
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.26), legMat);
  standBase.position.set(-0.22, 1.02, -0.34);
  const standNeck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.08), legMat);
  standNeck.position.set(-0.22, 1.24, -0.38);
  const monFrame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.68, 0.08), bezelMat);
  monFrame.position.set(-0.22, 1.48, -0.31);
  const monScreen = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.58, 0.02), screenGlowMat);
  monScreen.position.set(-0.22, 1.48, -0.265);
  root.add(standBase, standNeck, monFrame, monScreen);

  // Secondary Angled Monitor on Left
  const sideMonPivot = new THREE.Group();
  sideMonPivot.position.set(-1.05, 1.46, -0.18);
  sideMonPivot.rotation.y = 0.44;
  const sideNeck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.07), legMat);
  sideNeck.position.set(0, -0.24, -0.05);
  const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.07), bezelMat);
  const sideScreen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.64, 0.02), screenAltMat);
  sideScreen.position.z = 0.04;
  sideMonPivot.add(sideNeck, sideFrame, sideScreen);
  root.add(sideMonPivot);

  // Glass-Side RGB PC Tower on Right Side of Desk
  const towerCase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.74, 0.72), bezelMat);
  towerCase.position.set(1.02, 1.37, -0.08);
  const glassSide = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.62, 0.56),
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      transparent: true,
      opacity: 0.45,
      roughness: 0.12,
    }),
  );
  glassSide.position.set(0.79, 1.37, -0.08);
  const fanTop = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), rgbMat);
  fanTop.rotation.z = Math.PI / 2;
  fanTop.position.set(0.84, 1.54, 0.12);
  const fanBot = fanTop.clone();
  fanBot.position.y = 1.24;
  const frontStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.04), rgbMat);
  frontStrip.position.set(1.02, 1.37, 0.29);
  root.add(towerCase, glassSide, fanTop, fanBot, frontStrip);

  // Rolling Gamer Chair tucked neatly in front of desk
  const chair = new THREE.Group();
  chair.position.set(-0.22, 0, 0.88);
  chair.rotation.y = 0.26;
  const chairHub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 10), legMat);
  chairHub.position.y = 0.26;
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.36), legMat);
    arm.position.set(Math.sin(ang) * 0.18, 0.08, Math.cos(ang) * 0.18);
    arm.rotation.y = ang;
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), bezelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.sin(ang) * 0.32, 0.05, Math.cos(ang) * 0.32);
    chair.add(arm, wheel);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.64), bezelMat);
  seat.position.y = 0.5;
  const seatTrim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.56), rgbMat);
  seatTrim.position.y = 0.49;
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.88, 0.12), bezelMat);
  backrest.position.set(0, 0.96, 0.28);
  backrest.rotation.x = 0.08;
  const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.1), rgbMat);
  headrest.position.set(0, 1.32, 0.22);
  for (const ax of [-0.36, 0.36]) {
    const armRest = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.36), legMat);
    armRest.position.set(ax, 0.68, 0.04);
    chair.add(armRest);
  }
  chair.add(chairHub, seat, seatTrim, backrest, headrest);
  root.add(chair);

  setShadows(root, true, true);
  return root;
}

export function buildAreaRugGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const baseMat = createStudBrickMaterial(primaryColor, studTextures, 5, 4, {
    roughness: 0.86,
  });
  const trimMat = createPlasticBrickMaterial(accentColor, { roughness: 0.78 });

  const outer = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.04, 2.7), baseMat);
  outer.position.y = 0.02;
  const innerBorder = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.025, 2.05), trimMat);
  innerBorder.position.y = 0.045;
  const center = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.025, 1.55), baseMat);
  center.position.y = 0.065;
  const diamond = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.025, 0.95), trimMat);
  diamond.position.y = 0.085;
  diamond.rotation.y = Math.PI / 4;

  root.add(outer, innerBorder, center, diamond);
  setShadows(root, false, true);
  return root;
}

export function buildBookshelfGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const woodMat = createStudBrickMaterial(primaryColor, studTextures, 2, 1, {
    roughness: 0.58,
  });
  const backMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.72 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  // Outer cabinet sides & back
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.36, 0.54), woodMat);
  sideL.position.set(-0.78, 1.18, 0);
  const sideR = sideL.clone();
  sideR.position.x = 0.78;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.56, 2.32, 0.06), backMat);
  back.position.set(0, 1.18, -0.24);
  root.add(sideL, sideR, back);

  // 4 horizontal shelves
  for (const sy of [0.1, 0.72, 1.34, 1.96, 2.34]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 0.54), woodMat);
    shelf.position.set(0, sy, 0);
    root.add(shelf);
  }

  // Stylized multi-colored book rows
  const bookPalette = ['#c4281c', '#0d69ac', '#f5cd30', '#22c55e', accentColor, '#f97316'];
  const shelfLevels = [0.76, 1.38];
  shelfLevels.forEach((baseY, rowIdx) => {
    for (let i = 0; i < 6; i++) {
      const bw = 0.14;
      const bh = 0.34 + ((i + rowIdx) % 3) * 0.06;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, 0.36),
        createPlasticBrickMaterial(bookPalette[(i + rowIdx * 2) % bookPalette.length], {
          roughness: 0.52,
        }),
      );
      book.position.set(-0.54 + i * 0.19, baseY + bh / 2, 0.02);
      if (i === 5) {
        book.rotation.z = 0.18;
        book.position.x += 0.06;
      }
      root.add(book);
    }
  });

  // Top collectibles: glowing trophy cube & potted block plant
  const cubeLamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), glowMat);
  cubeLamp.position.set(-0.36, 2.52, 0.04);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.11, 0.22, 10),
    createPlasticBrickMaterial('#d97706', { roughness: 0.65 }),
  );
  pot.position.set(0.38, 2.49, 0.02);
  const leaves = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.28, 0.3),
    createPlasticBrickMaterial('#22c55e', { roughness: 0.6 }),
  );
  leaves.position.set(0.38, 2.71, 0.02);
  root.add(cubeLamp, pot, leaves);

  setShadows(root, true, true);
  return root;
}

// =========================================================================
// Robloxian Town Neighborhood Models (Grounded at y = 0)
// =========================================================================

export function buildSuburbanHouseGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const trimMat = createPlasticBrickMaterial('#f1f5f9', { roughness: 0.5 });
  const woodMat = createPlasticBrickMaterial('#6b4226', { roughness: 0.65 });
  const warmWinMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#f59e0b',
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });

  // Concrete foundation + front porch & steps
  addBrick(root, 5.2, 0.28, 4.4, 0, 0.14, 0, '#94a3b8', studTextures, 1.4, 0.65);
  addBrick(root, 2.4, 0.24, 1.05, 0, 0.12, 2.68, '#cbd5e1', studTextures, 1.4, 0.6);
  addBrick(root, 1.6, 0.12, 0.45, 0, 0.06, 3.38, '#cbd5e1', studTextures, 1.4, 0.6);

  // Two-story house body
  addBrick(root, 4.8, 3.55, 4.0, 0, 2.05, 0, primaryColor, studTextures, 1.5, 0.48);

  // Porch pillars & awning overhang (+Z front)
  for (const px of [-1.05, 1.05]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.18), trimMat);
    post.position.set(px, 1.29, 3.05);
    root.add(post);
  }
  addBrick(root, 2.6, 0.2, 1.25, 0, 2.38, 2.62, accentColor, studTextures, 1.5, 0.5);

  // Front Door & Brass Knob
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.9, 0.14), woodMat);
  door.position.set(0, 1.23, 2.02);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    createPlasticBrickMaterial('#f5cd30', { roughness: 0.25, metalness: 0.7 }),
  );
  knob.position.set(0.32, 1.18, 2.12);
  root.add(door, knob);

  // Framed Glowing Windows (Ground floor + 2nd floor)
  const windowPositions: [number, number, number][] = [
    [-1.48, 1.45, 2.03],
    [1.48, 1.45, 2.03],
    [-1.48, 2.95, 2.03],
    [0, 2.95, 2.03],
    [1.48, 2.95, 2.03],
  ];
  for (const [wx, wy, wz] of windowPositions) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.86, 0.1), trimMat);
    frame.position.set(wx, wy, wz);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.12), warmWinMat);
    pane.position.set(wx, wy, wz + 0.01);
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.14), trimMat);
    mullionV.position.set(wx, wy, wz + 0.015);
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.14), trimMat);
    mullionH.position.set(wx, wy, wz + 0.015);
    root.add(frame, pane, mullionV, mullionH);
  }

  // Stepped Pitched Gable Roof + Chimney
  addBrick(root, 5.4, 0.36, 4.6, 0, 4.0, 0, accentColor, studTextures, 1.4, 0.55);
  addBrick(root, 4.5, 0.42, 3.8, 0, 4.39, 0, accentColor, studTextures, 1.4, 0.55);
  addBrick(root, 3.4, 0.44, 2.8, 0, 4.82, 0, accentColor, studTextures, 1.4, 0.55);
  addBrick(root, 2.0, 0.36, 1.8, 0, 5.22, 0, accentColor, studTextures, 1.4, 0.55);

  // Brick Chimney
  addBrick(root, 0.65, 1.35, 0.65, 1.45, 5.05, -0.8, '#991b1b', studTextures, 1.6, 0.65);

  setShadows(root, true, true);
  return root;
}

export function buildPicketFenceGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const picketMat = createStudBrickMaterial(primaryColor, studTextures, 1, 1, {
    roughness: 0.45,
  });
  const capMat = createPlasticBrickMaterial(accentColor, { roughness: 0.4 });

  // Two end posts
  for (const px of [-1.5, 1.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.12, 0.22), picketMat);
    post.position.set(px, 0.56, 0);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), capMat);
    cap.position.set(px, 1.16, 0);
    root.add(post, cap);
  }

  // Horizontal rails
  for (const ry of [0.28, 0.76]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.08), picketMat);
    rail.position.set(0, ry, -0.02);
    root.add(rail);
  }

  // 7 vertical pointed pickets
  for (let i = -3; i <= 3; i++) {
    const px = i * 0.38;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.88, 0.06), picketMat);
    slat.position.set(px, 0.44, 0.04);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 4), picketMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.set(px, 0.96, 0.04);
    root.add(slat, tip);
  }

  setShadows(root, true, true);
  return root;
}

export function buildStreetLampGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const poleMat = createPlasticBrickMaterial(primaryColor, {
    roughness: 0.35,
    metalness: 0.65,
  });
  const globeMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.15,
    roughness: 0.18,
  });

  addBrick(root, 0.58, 0.26, 0.58, 0, 0.13, 0, primaryColor, studTextures, 1.4, 0.45);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.34, 8), poleMat);
  collar.position.y = 0.42;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.12, 2.75, 10), poleMat);
  shaft.position.y = 1.92;
  const topRing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.14, 10), poleMat);
  topRing.position.y = 3.34;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), globeMat);
  globe.position.y = 3.62;
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 8), poleMat);
  finial.position.y = 3.94;

  root.add(collar, shaft, topRing, globe, finial);
  setShadows(root, true, true);
  return root;
}

export function buildMailboxGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const postMat = createStudBrickMaterial('#6b4226', studTextures, 1, 1, {
    roughness: 0.68,
  });
  const boxMat = createPlasticBrickMaterial(primaryColor, {
    roughness: 0.34,
    metalness: 0.45,
  });
  const flagMat = createPlasticBrickMaterial(accentColor, { roughness: 0.35 });

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 0.18), postMat);
  post.position.y = 0.525;
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.48), postMat);
  cross.position.set(0, 1.05, 0);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.62), boxMat);
  body.position.set(0, 1.21, 0.02);
  const archTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.62, 12, 1, false, 0, Math.PI),
    boxMat,
  );
  archTop.rotation.z = Math.PI / 2;
  archTop.rotation.y = Math.PI / 2;
  archTop.position.set(0, 1.33, 0.02);

  const flagArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.05), flagMat);
  flagArm.position.set(0.19, 1.35, 0.06);
  const flagTab = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.14), flagMat);
  flagTab.position.set(0.19, 1.46, 0.12);

  root.add(post, cross, body, archTop, flagArm, flagTab);
  setShadows(root, true, true);
  return root;
}

// =========================================================================
// Cutaway L-Corner Bedroom Architectural Shell (Unobstructed +X/+Z Views)
// =========================================================================

export function buildBedroomCornerShellGroup(
  width: number,
  depth: number,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const wallH = 4.9;

  const wallMat = createStudBrickMaterial('#2e3648', studTextures, 8, 4, {
    roughness: 0.65,
  });
  const trimMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.48 });
  const curtainMat = createPlasticBrickMaterial('#312e81', { roughness: 0.72 });
  const nightWindowMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#1d4ed8',
    emissiveIntensity: 0.65,
    roughness: 0.12,
  });
  const neonStripMat = new THREE.MeshStandardMaterial({
    color: '#a855f7',
    emissive: '#a855f7',
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });
  const cyanStripMat = new THREE.MeshStandardMaterial({
    color: '#00a2ff',
    emissive: '#00a2ff',
    emissiveIntensity: 1.05,
    roughness: 0.2,
  });

  // Back Wall (-Z)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, wallH, 0.36), wallMat);
  backWall.position.set(0, wallH / 2, -halfD - 0.18);
  backWall.receiveShadow = true;
  root.add(backWall);

  // Left Wall (-X)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, wallH, depth + 0.4), wallMat);
  leftWall.position.set(-halfW - 0.18, wallH / 2, 0);
  leftWall.receiveShadow = true;
  root.add(leftWall);

  // Baseboards + Crown molding (clean >= 0.02 offset)
  const backBase = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.28, 0.08), trimMat);
  backBase.position.set(0, 0.14, -halfD + 0.04);
  const leftBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, depth + 0.04), trimMat);
  leftBase.position.set(-halfW + 0.04, 0.14, 0);
  root.add(backBase, leftBase);

  // Cozy Bedroom Window on Back Wall (Above/Left of center)
  const winX = -0.35;
  const winY = 2.65;
  const winZ = -halfD + 0.02;
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.65, 2.05, 0.1), trimMat);
  winFrame.position.set(winX, winY, winZ);
  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.78, 0.12), nightWindowMat);
  winGlass.position.set(winX, winY, winZ + 0.01);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.82, 0.14), trimMat);
  crossV.position.set(winX, winY, winZ + 0.02);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.08, 0.14), trimMat);
  crossH.position.set(winX, winY, winZ + 0.02);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.12, 0.24), trimMat);
  sill.position.set(winX, winY - 1.02, winZ + 0.08);

  // Side curtains
  for (const cx of [winX - 1.38, winX + 1.38]) {
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.35, 0.16), curtainMat);
    curtain.position.set(cx, winY - 0.05, winZ + 0.12);
    root.add(curtain);
  }
  root.add(winFrame, winGlass, crossV, crossH, sill);

  // Floating Neon Wall Shelf & Posters above Gamer Desk (+X back wall)
  const deskShelf = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.36), trimMat);
  deskShelf.position.set(3.2, 2.75, -halfD + 0.18);
  const shelfLed = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.05, 0.06), neonStripMat);
  shelfLed.position.set(3.2, 2.68, -halfD + 0.12);
  root.add(deskShelf, shelfLed);

  // Framed Posters on Left Wall (-X)
  for (const [pz, pCol] of [
    [-2.1, '#00a2ff'],
    [0.1, '#f43f5e'],
  ] as [number, string][]) {
    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 1.05), trimMat);
    pFrame.position.set(-halfW + 0.04, 2.65, pz);
    const pArt = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 1.15, 0.86),
      createPlasticBrickMaterial(pCol, { roughness: 0.45 }),
    );
    pArt.position.set(-halfW + 0.05, 2.65, pz);
    root.add(pFrame, pArt);
  }

  // Corner RGB Accent Light Column
  const cornerBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.8, 0.14), cyanStripMat);
  cornerBar.position.set(-halfW + 0.14, 2.0, -halfD + 0.14);
  root.add(cornerBar);

  return root;
}
