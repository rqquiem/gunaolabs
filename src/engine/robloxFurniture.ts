import * as THREE from 'three';
import {
  createBedroomConsoleTvTexture,
  createBedroomMainMonitorTexture,
  createBedroomPosterTexture,
  createBedroomSideMonitorTexture,
  createBedroomSkylineTexture,
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
  const frameMat = createStudBrickMaterial('#3b2820', studTextures, 4, 3, {
    roughness: 0.6,
  });
  const headboardPadMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.72 });
  const mattressMat = createPlasticBrickMaterial('#f1f5f9', { roughness: 0.8 });
  const blanketMat = createStudBrickMaterial(primaryColor, studTextures, 4, 4, {
    roughness: 0.74,
  });
  const pillowMat = createPlasticBrickMaterial(accentColor, { roughness: 0.68 });
  const whitePillowMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.76 });
  const rgbMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.05,
    roughness: 0.2,
  });

  // Corner legs grounded at y = 0 (R6 ergonomic twin bed: 2.75 wide x 3.65 long)
  for (const [lx, lz] of [
    [-1.22, -1.62],
    [1.22, -1.62],
    [-1.22, 1.62],
    [1.22, 1.62],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.22), frameMat);
    leg.position.set(lx, 0.17, lz);
    root.add(leg);
  }

  // Bed base platform + underglow RGB strip
  const platform = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.28, 3.65), frameMat);
  platform.position.set(0, 0.48, 0);
  root.add(platform);

  const underGlow = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 3.32), rgbMat);
  underGlow.position.set(0, 0.30, 0);
  root.add(underGlow);

  // Tall padded headboard (-Z) & sculpted footboard (+Z)
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.82, 1.95, 0.24), frameMat);
  headboard.position.set(0, 0.975, -1.725);
  const headboardPad = new THREE.Mesh(new THREE.BoxGeometry(2.48, 1.12, 0.08), headboardPadMat);
  headboardPad.position.set(0, 1.24, -1.58);
  const headboardTrim = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.08, 0.06), rgbMat);
  headboardTrim.position.set(0, 1.84, -1.57);

  const footboard = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.74, 0.2), frameMat);
  footboard.position.set(0, 0.56, 1.725);
  root.add(headboard, headboardPad, headboardTrim, footboard);

  // Mattress (top surface at y = 0.95)
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.34, 3.32), mattressMat);
  mattress.position.set(0, 0.78, 0);
  root.add(mattress);

  // Folded cozy duvet blanket covering lower 65% with >= 0.03 clearance over mattress
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.14, 2.3), blanketMat);
  blanket.position.set(0, 1.05, 0.49);
  const blanketFold = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.1, 0.36), pillowMat);
  blanketFold.position.set(0, 1.14, -0.48);
  root.add(blanket, blanketFold);

  // Sleeping pillow + accent gamer cushion
  const mainPillow = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 0.64), whitePillowMat);
  mainPillow.position.set(0, 1.1, -1.24);
  mainPillow.rotation.x = 0.16;

  const accentPillow = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.2, 0.52), pillowMat);
  accentPillow.position.set(0.45, 1.22, -0.98);
  accentPillow.rotation.set(0.28, -0.22, 0);
  root.add(mainPillow, accentPillow);

  setShadows(root, true, true);
  return root;
}

export function buildPcDeskGroup(
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy = 4,
): THREE.Group {
  const root = new THREE.Group();
  const deskTopMat = createStudBrickMaterial(primaryColor, studTextures, 5, 2, {
    roughness: 0.42,
  });
  const legMat = createPlasticBrickMaterial('#1b2029', {
    roughness: 0.36,
    metalness: 0.5,
  });
  const bezelMat = createPlasticBrickMaterial('#0f172a', {
    roughness: 0.32,
    metalness: 0.35,
  });
  const gpuMat = createPlasticBrickMaterial('#334155', {
    roughness: 0.3,
    metalness: 0.55,
  });
  const rgbMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.2,
    roughness: 0.18,
  });

  const mainTex = createBedroomMainMonitorTexture(accentColor, maxAnisotropy);
  const screenGlowMat = new THREE.MeshStandardMaterial({
    map: mainTex,
    emissiveMap: mainTex,
    emissive: '#ffffff',
    emissiveIntensity: 0.72,
    roughness: 0.18,
    metalness: 0.08,
  });

  const sideTex = createBedroomSideMonitorTexture(accentColor, maxAnisotropy);
  const screenAltMat = new THREE.MeshStandardMaterial({
    map: sideTex,
    emissiveMap: sideTex,
    emissive: '#ffffff',
    emissiveIntensity: 0.72,
    roughness: 0.18,
    metalness: 0.08,
  });

  // Heavy-duty dual-column desk legs (knee clearance y = 1.22, tabletop top y = 1.32)
  for (const lx of [-1.78, 1.78]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 1.32), legMat);
    foot.position.set(lx, 0.045, 0);
    const colFront = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.18, 0.16), legMat);
    colFront.position.set(lx, 0.63, 0.24);
    const colBack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.18, 0.16), legMat);
    colBack.position.set(lx, 0.63, -0.32);
    root.add(foot, colFront, colBack);
  }
  const cableTray = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.18), legMat);
  cableTray.position.set(0, 1.06, -0.52);
  root.add(cableTray);

  // Tabletop (3.95 x 1.45, centered at y = 1.27 -> top at y = 1.32) + Rear RGB Light Bar
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.1, 1.45), deskTopMat);
  top.position.set(0, 1.27, 0);
  const rearLed = new THREE.Mesh(new THREE.BoxGeometry(3.86, 0.06, 0.05), rgbMat);
  rearLed.position.set(0, 1.27, -0.75);
  root.add(top, rearLed);

  // Stitched Deskmat + Sculpted Mechanical RGB Keyboard + Ergonomic Mouse (clean >= 0.02 Y gaps)
  const deskMat = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.025, 0.72), bezelMat);
  deskMat.position.set(-0.3, 1.335, 0.18);
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.05, 0.32), legMat);
  keyboard.position.set(-0.42, 1.375, 0.18);
  const keyGlow = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.02, 0.24), rgbMat);
  keyGlow.position.set(-0.42, 1.402, 0.18);
  const wristRest = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.032, 0.12), bezelMat);
  wristRest.position.set(-0.42, 1.366, 0.42);
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.055, 0.26), bezelMat);
  mouse.position.set(0.3, 1.375, 0.18);
  const mouseGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.16), rgbMat);
  mouseGlow.position.set(0.3, 1.405, 0.18);
  root.add(deskMat, keyboard, keyGlow, wristRest, mouse, mouseGlow);

  // Coaster + Ceramic Gamer Mug on right side of deskmat
  const coaster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14),
    createPlasticBrickMaterial('#312e81', { roughness: 0.75 }),
  );
  coaster.position.set(0.68, 1.355, 0.34);
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.095, 0.18, 14),
    createPlasticBrickMaterial('#f8fafc', { roughness: 0.32 }),
  );
  mug.position.set(0.68, 1.46, 0.34);
  const coffeeTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.02, 12),
    createPlasticBrickMaterial('#451a03', { roughness: 0.2 }),
  );
  coffeeTop.position.set(0.68, 1.545, 0.34);
  root.add(coaster, mug, coffeeTop);

  // Headphone Stand on Left Edge
  const hpBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 12), legMat);
  hpBase.position.set(-1.58, 1.345, 0.34);
  const hpStem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.05), legMat);
  hpStem.position.set(-1.58, 1.58, 0.34);
  const hpCradle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.22), rgbMat);
  hpCradle.position.set(-1.58, 1.82, 0.34);
  root.add(hpBase, hpStem, hpCradle);

  // Primary Ultrawide Monitor (center y = 2.02 aligns with sitting R6 eye level 2.00; top ~2.49 aligns with standing eyes)
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.34), legMat);
  standBase.position.set(-0.22, 1.34, -0.46);
  const standNeck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.1), legMat);
  standNeck.position.set(-0.22, 1.68, -0.5);
  const monFrame = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.94, 0.08), bezelMat);
  monFrame.position.set(-0.22, 2.02, -0.36);
  const monScreen = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.82, 0.02), screenGlowMat);
  monScreen.position.set(-0.22, 2.02, -0.315);
  root.add(standBase, standNeck, monFrame, monScreen);

  // Secondary Angled Vertical Monitor on Left
  const sideMonPivot = new THREE.Group();
  sideMonPivot.position.set(-1.48, 2.02, -0.18);
  sideMonPivot.rotation.y = 0.44;
  const sideBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.28), legMat);
  sideBase.position.set(0, -0.68, -0.08);
  const sideNeck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.68, 0.08), legMat);
  sideNeck.position.set(0, -0.34, -0.07);
  const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.18, 0.07), bezelMat);
  const sideScreen = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.08, 0.02), screenAltMat);
  sideScreen.position.z = 0.04;
  sideMonPivot.add(sideBase, sideNeck, sideFrame, sideScreen);
  root.add(sideMonPivot);

  // Twin Studio Monitor Speakers
  for (const [sx, sRot] of [
    [0.94, -0.22],
    [-1.82, 0.32],
  ] as [number, number][]) {
    const spkGroup = new THREE.Group();
    spkGroup.position.set(sx, 1.54, -0.44);
    spkGroup.rotation.y = sRot;
    const spkBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.26), bezelMat);
    const woofer = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 14), gpuMat);
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(0, -0.07, 0.13);
    const tweeter = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), rgbMat);
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(0, 0.1, 0.13);
    spkGroup.add(spkBox, woofer, tweeter);
    root.add(spkGroup);
  }

  // Articulated Studio Microphone Boom Arm (clamped left desk edge -> reaches near seated speaker)
  const micClamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.14), legMat);
  micClamp.position.set(-1.76, 1.38, 0.44);
  const armLower = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.78, 0.055), legMat);
  armLower.position.set(-1.54, 1.72, 0.34);
  armLower.rotation.set(-0.22, 0, -0.52);
  const armUpper = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.05), legMat);
  armUpper.position.set(-1.08, 1.98, 0.34);
  armUpper.rotation.z = -0.18;
  const micBody = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 12), bezelMat);
  micBody.position.set(-0.76, 1.84, 0.38);
  micBody.rotation.z = 0.24;
  const micCap = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.055, 0.09, 12), gpuMat);
  micCap.position.set(-0.74, 1.95, 0.38);
  micCap.rotation.z = 0.24;
  const popFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 14), bezelMat);
  popFilter.rotation.z = Math.PI / 2;
  popFilter.rotation.y = 0.35;
  popFilter.position.set(-0.62, 1.9, 0.44);
  root.add(micClamp, armLower, armUpper, micBody, micCap, popFilter);

  // Detailed Tempered-Glass RGB PC Tower on Right Side of Desk (open interior cavity facing -X)
  const towerX = 1.5;
  const towerY = 1.82; // 0.98 tall -> 1.33..2.31
  const towerZ = -0.06;
  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 0.88), bezelMat);
  wallRight.position.set(towerX + 0.26, towerY, towerZ);
  const wallTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.88), bezelMat);
  wallTop.position.set(towerX, towerY + 0.46, towerZ);
  const wallBot = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.88), bezelMat);
  wallBot.position.set(towerX, towerY - 0.46, towerZ);
  const wallFront = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.98, 0.08), bezelMat);
  wallFront.position.set(towerX, towerY, towerZ + 0.4);
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.98, 0.06), bezelMat);
  wallBack.position.set(towerX, towerY, towerZ - 0.41);
  const frontStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.84, 0.04), rgbMat);
  frontStrip.position.set(towerX, towerY, towerZ + 0.45);
  root.add(wallRight, wallTop, wallBot, wallFront, wallBack, frontStrip);

  // PC Interior Hardware: PSU shroud, motherboard plate, GPU, AIO CPU block, RAM, 3 RGB fans
  const psuShroud = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.78), gpuMat);
  psuShroud.position.set(towerX + 0.02, towerY - 0.34, towerZ);
  const mobo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.64, 0.56), legMat);
  mobo.position.set(towerX + 0.2, towerY + 0.08, towerZ - 0.06);
  const gpuCard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.48), gpuMat);
  gpuCard.position.set(towerX + 0.08, towerY - 0.06, towerZ + 0.02);
  const gpuLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.36), rgbMat);
  gpuLed.position.set(towerX - 0.04, towerY - 0.06, towerZ + 0.02);
  const cpuCooler = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.14), rgbMat);
  cpuCooler.position.set(towerX + 0.15, towerY + 0.14, towerZ - 0.08);
  const ramA = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.03), rgbMat);
  ramA.position.set(towerX + 0.16, towerY + 0.14, towerZ + 0.07);
  const ramB = ramA.clone();
  ramB.position.z = towerZ + 0.12;
  root.add(psuShroud, mobo, gpuCard, gpuLed, cpuCooler, ramA, ramB);

  for (const fy of [towerY + 0.26, towerY + 0.02, towerY - 0.22]) {
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), rgbMat);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(towerX + 0.02, fy, towerZ + 0.32);
    root.add(fan);
  }

  // Tempered glass panel (depthWrite: false so interior hardware renders cleanly)
  const glassSide = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.84, 0.72),
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      transparent: true,
      opacity: 0.24,
      roughness: 0.08,
      metalness: 0.15,
      depthWrite: false,
    }),
  );
  glassSide.position.set(towerX - 0.27, towerY, towerZ);
  root.add(glassSide);

  // Full-Width R6 Ergonomic Gaming Chair tucked in front of desk (seat top y = 0.58, headrest y = 2.04)
  const chair = new THREE.Group();
  chair.position.set(-0.22, 0, 1.38);
  chair.rotation.y = 0.14;
  const chairHub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.42, 12), legMat);
  chairHub.position.y = 0.27;
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.58), legMat);
    arm.position.set(Math.sin(ang) * 0.28, 0.1, Math.cos(ang) * 0.28);
    arm.rotation.y = ang;
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 10), bezelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.sin(ang) * 0.52, 0.065, Math.cos(ang) * 0.52);
    chair.add(arm, wheel);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.14, 1.16), bezelMat);
  seat.position.y = 0.51;
  const seatTrim = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.07, 1.04), rgbMat);
  seatTrim.position.y = 0.5;
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.54, 0.16), bezelMat);
  backrest.position.set(0, 1.47, 0.46);
  backrest.rotation.x = 0.05;
  const lumbarPillow = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.26, 0.14), rgbMat);
  lumbarPillow.position.set(0, 0.96, 0.34);
  const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.14), rgbMat);
  headrest.position.set(0, 2.04, 0.36);
  for (const ax of [-0.78, 0.78]) {
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.12), legMat);
    armPost.position.set(ax, 0.82, 0.06);
    const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.54), bezelMat);
    armPad.position.set(ax, 1.1, 0.02);
    chair.add(armPost, armPad);
  }
  chair.add(chairHub, seat, seatTrim, backrest, lumbarPillow, headrest);
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
  const baseMat = createStudBrickMaterial(primaryColor, studTextures, 6, 5, {
    roughness: 0.86,
  });
  const trimMat = createPlasticBrickMaterial(accentColor, { roughness: 0.78 });

  const outer = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 3.8), baseMat);
  outer.position.y = 0.02;
  const innerBorder = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.025, 3.0), trimMat);
  innerBorder.position.y = 0.045;
  const center = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.025, 2.3), baseMat);
  center.position.y = 0.065;
  const diamond = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.025, 1.35), trimMat);
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
  const woodMat = createStudBrickMaterial(primaryColor, studTextures, 3, 1, {
    roughness: 0.58,
  });
  const backMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.72 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  // Outer cabinet sides & back (R6 scale: 2.15 wide x 3.25 tall x 0.68 deep)
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.25, 0.68), woodMat);
  sideL.position.set(-1.02, 1.625, 0);
  const sideR = sideL.clone();
  sideR.position.x = 1.02;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.04, 3.2, 0.07), backMat);
  back.position.set(0, 1.625, -0.305);
  root.add(sideL, sideR, back);

  // 5 horizontal shelves
  for (const sy of [0.12, 0.88, 1.64, 2.4, 3.2]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.09, 0.68), woodMat);
    shelf.position.set(0, sy, 0);
    root.add(shelf);
  }

  // Stylized multi-colored book rows across 3 shelves
  const bookPalette = ['#c4281c', '#0d69ac', '#f5cd30', '#22c55e', accentColor, '#f97316'];
  const shelfLevels = [0.925, 1.685, 2.445];
  shelfLevels.forEach((baseY, rowIdx) => {
    for (let i = 0; i < 7; i++) {
      const bw = 0.16;
      const bh = 0.44 + ((i + rowIdx) % 3) * 0.08;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, 0.44),
        createPlasticBrickMaterial(bookPalette[(i + rowIdx * 2) % bookPalette.length], {
          roughness: 0.52,
        }),
      );
      book.position.set(-0.74 + i * 0.23, baseY + bh / 2, 0.04);
      if (i === 6) {
        book.rotation.z = 0.18;
        book.position.x += 0.08;
      }
      root.add(book);
    }
  });

  // Top collectibles: glowing trophy cube, mini blocky figurine & potted block plant
  const cubeLamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), glowMat);
  cubeLamp.position.set(-0.56, 3.43, 0.06);

  const figBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.28, 0.14),
    createPlasticBrickMaterial('#0d69ac', { roughness: 0.42 }),
  );
  figBody.position.set(0.02, 3.39, 0.06);
  const figHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12),
    createPlasticBrickMaterial('#f5cd30', { roughness: 0.42 }),
  );
  figHead.position.set(0.02, 3.62, 0.06);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10),
    createPlasticBrickMaterial('#d97706', { roughness: 0.65 }),
  );
  pot.position.set(0.58, 3.38, 0.04);
  const leaves = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.36, 0.38),
    createPlasticBrickMaterial('#22c55e', { roughness: 0.6 }),
  );
  leaves.position.set(0.58, 3.66, 0.04);
  root.add(cubeLamp, figBody, figHead, pot, leaves);

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
  maxAnisotropy = 4,
): THREE.Group {
  const root = new THREE.Group();
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const wallH = 6.2;

  const wallMat = createStudBrickMaterial('#2e3648', studTextures, 10, 5, {
    roughness: 0.66,
  });
  const wainscotMat = createPlasticBrickMaterial('#1e2433', { roughness: 0.7 });
  const trimMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.48 });
  const woodDarkMat = createPlasticBrickMaterial('#3b2820', { roughness: 0.62 });
  const curtainMat = createPlasticBrickMaterial('#312e81', { roughness: 0.74 });
  const curtainPleatMat = createPlasticBrickMaterial('#3730a3', { roughness: 0.7 });
  const darkMetalMat = createPlasticBrickMaterial('#0f172a', {
    roughness: 0.3,
    metalness: 0.6,
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
  const puckLightMat = new THREE.MeshStandardMaterial({
    color: '#fef3c7',
    emissive: '#fbbf24',
    emissiveIntensity: 1.15,
    roughness: 0.22,
  });

  // Back Wall (-Z) & Left Wall (-X); +X and +Z stay open cutaway
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width + 0.44, wallH, 0.36), wallMat);
  backWall.position.set(0, wallH / 2, -halfD - 0.18);
  backWall.receiveShadow = true;
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, wallH, depth + 0.44), wallMat);
  leftWall.position.set(-halfW - 0.18, wallH / 2, 0);
  leftWall.receiveShadow = true;
  root.add(backWall, leftWall);

  // Lower Wainscot Band, Baseboards, Chair Rail & Upper Crown Molding
  const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(width, 1.55, 0.05), wainscotMat);
  backWainscot.position.set(0, 0.775, -halfD + 0.025);
  const leftWainscot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.55, depth), wainscotMat);
  leftWainscot.position.set(-halfW + 0.025, 0.775, 0);
  const backBase = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.34, 0.09), trimMat);
  backBase.position.set(0, 0.17, -halfD + 0.045);
  const leftBase = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, depth + 0.06), trimMat);
  leftBase.position.set(-halfW + 0.045, 0.17, 0);
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.12, 0.09), trimMat);
  backRail.position.set(0, 1.58, -halfD + 0.045);
  const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, depth + 0.06), trimMat);
  leftRail.position.set(-halfW + 0.045, 1.58, 0);
  const backCrown = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.22, 0.12), trimMat);
  backCrown.position.set(0, wallH - 0.11, -halfD + 0.06);
  const leftCrown = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, depth + 0.1), trimMat);
  leftCrown.position.set(-halfW + 0.06, wallH - 0.11, 0);
  root.add(
    backWainscot,
    leftWainscot,
    backBase,
    leftBase,
    backRail,
    leftRail,
    backCrown,
    leftCrown,
  );

  // Night Skyline Window on Back Wall (between Nightstand and PC Desk)
  const winX = -1.2;
  const winY = 3.45;
  const winZ = -halfD + 0.04;
  const skylineTex = createBedroomSkylineTexture(maxAnisotropy);
  const skylineMat = new THREE.MeshStandardMaterial({
    map: skylineTex,
    emissiveMap: skylineTex,
    emissive: '#ffffff',
    emissiveIntensity: 0.85,
    roughness: 0.16,
  });
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.35, 0.1), trimMat);
  winFrame.position.set(winX, winY, winZ);
  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(3.12, 2.08, 0.04), skylineMat);
  winGlass.position.set(winX, winY, winZ + 0.045);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.12, 0.12), trimMat);
  crossV.position.set(winX, winY, winZ + 0.05);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.16, 0.08, 0.12), trimMat);
  crossH.position.set(winX, winY, winZ + 0.05);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.14, 0.32), trimMat);
  sill.position.set(winX, winY - 1.2, winZ + 0.12);

  // Curtain rod + rings + pleated side drapes
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.4, 12), darkMetalMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(winX, winY + 1.38, winZ + 0.18);
  root.add(winFrame, winGlass, crossV, crossH, sill, rod);

  for (const cx of [winX - 1.82, winX + 1.82]) {
    const drape = new THREE.Mesh(new THREE.BoxGeometry(0.58, 2.75, 0.16), curtainMat);
    drape.position.set(cx, winY - 0.04, winZ + 0.16);
    root.add(drape);
    for (const px of [-0.16, 0, 0.16]) {
      const pleat = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.72, 8), curtainPleatMat);
      pleat.position.set(cx + px, winY - 0.04, winZ + 0.24);
      root.add(pleat);
    }
  }

  // Floating Trophy Shelf & Hexagonal RGB Wall Panels above PC Desk (x = 3.6)
  const deskWallX = 3.6;
  const deskShelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.46), woodDarkMat);
  deskShelf.position.set(deskWallX, 3.65, -halfD + 0.23);
  const shelfLed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.06), neonStripMat);
  shelfLed.position.set(deskWallX, 3.57, -halfD + 0.14);
  const shelfTrophy = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), cyanStripMat);
  shelfTrophy.position.set(deskWallX - 0.72, 3.86, -halfD + 0.24);
  const shelfPlantPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.11, 0.2, 10),
    createPlasticBrickMaterial('#d97706', { roughness: 0.65 }),
  );
  shelfPlantPot.position.set(deskWallX + 0.78, 3.81, -halfD + 0.24);
  const shelfLeaves = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.26, 0.3),
    createPlasticBrickMaterial('#22c55e', { roughness: 0.6 }),
  );
  shelfLeaves.position.set(deskWallX + 0.78, 4.02, -halfD + 0.24);
  root.add(deskShelf, shelfLed, shelfTrophy, shelfPlantPot, shelfLeaves);

  const hexColors = ['#00a2ff', '#a855f7', '#38bdf8', '#c084fc', '#6366f1'];
  const hexOffsets: [number, number][] = [
    [-0.86, 4.72],
    [-0.28, 5.04],
    [0.28, 4.72],
    [0.86, 5.04],
    [0.28, 4.24],
  ];
  hexOffsets.forEach(([hx, hy], idx) => {
    const hCol = hexColors[idx % hexColors.length];
    const hexTile = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.07, 6),
      new THREE.MeshStandardMaterial({
        color: hCol,
        emissive: hCol,
        emissiveIntensity: 1.05,
        roughness: 0.2,
      }),
    );
    hexTile.rotation.x = Math.PI / 2;
    hexTile.position.set(deskWallX + hx, hy, -halfD + 0.05);
    root.add(hexTile);
  });

  // Console TV Lounge Corner on Left Wall (-X at z = -0.3)
  const tvZ = -0.3;
  const credenza = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.88, 3.4), woodDarkMat);
  credenza.position.set(-halfW + 0.45, 0.44, tvZ);
  credenza.castShadow = true;
  credenza.receiveShadow = true;
  const credenzaTop = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 3.48), trimMat);
  credenzaTop.position.set(-halfW + 0.45, 0.92, tvZ);
  const consoleBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.62), darkMetalMat);
  consoleBody.position.set(-halfW + 0.48, 1.03, tvZ - 0.55);
  const consoleLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.32), cyanStripMat);
  consoleLed.position.set(-halfW + 0.69, 1.05, tvZ - 0.55);
  root.add(credenza, credenzaTop, consoleBody, consoleLed);

  for (const cz of [tvZ + 0.35, tvZ + 0.72]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.24), darkMetalMat);
    pad.position.set(-halfW + 0.52, 0.985, cz);
    root.add(pad);
  }

  const tvTex = createBedroomConsoleTvTexture(maxAnisotropy);
  const tvScreenMat = new THREE.MeshStandardMaterial({
    map: tvTex,
    emissiveMap: tvTex,
    emissive: '#ffffff',
    emissiveIntensity: 0.8,
    roughness: 0.18,
  });
  const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.56, 2.76), darkMetalMat);
  tvBezel.position.set(-halfW + 0.08, 2.28, tvZ);
  const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 2.58), tvScreenMat);
  tvScreen.position.set(-halfW + 0.125, 2.28, tvZ);
  root.add(tvBezel, tvScreen);

  // 3 Framed Canvas Posters on Left Wall (-X)
  const posterPlacements: [number, number, 0 | 1 | 2][] = [
    [-5.6, 3.72, 0],
    [-1.15, 4.18, 1],
    [0.85, 4.18, 2],
  ];
  for (const [pz, py, variant] of posterPlacements) {
    const pTex = createBedroomPosterTexture(variant, maxAnisotropy);
    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.62, 1.26), darkMetalMat);
    pFrame.position.set(-halfW + 0.045, py, pz);
    const pArt = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.44, 1.08),
      new THREE.MeshStandardMaterial({
        map: pTex,
        emissiveMap: pTex,
        emissive: '#ffffff',
        emissiveIntensity: 0.25,
        roughness: 0.42,
      }),
    );
    pArt.position.set(-halfW + 0.08, py, pz);
    root.add(pFrame, pArt);
  }

  // Corner RGB Accent Light Column
  const cornerBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.2, 0.16), cyanStripMat);
  cornerBar.position.set(-halfW + 0.14, 2.75, -halfD + 0.14);
  root.add(cornerBar);

  // Perimeter Ceiling Timber Beams + Warm Recessed Puck Lights (leaves center & +X/+Z shots clear)
  const backBeam = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.34, 0.32), woodDarkMat);
  backBeam.position.set(0, wallH - 0.17, -halfD + 0.56);
  const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, depth + 0.2), woodDarkMat);
  leftBeam.position.set(-halfW + 0.56, wallH - 0.17, 0);
  root.add(backBeam, leftBeam);

  for (const bx of [-5.2, -1.2, 3.6]) {
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), puckLightMat);
    puck.position.set(bx, wallH - 0.35, -halfD + 0.56);
    root.add(puck);
  }
  for (const bz of [-4.2, -0.3, 3.8]) {
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), puckLightMat);
    puck.position.set(-halfW + 0.56, wallH - 0.35, bz);
    root.add(puck);
  }

  return root;
}
