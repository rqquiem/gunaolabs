import * as THREE from 'three';
import {
  createPlasticBrickMaterial,
  createSpawnLocationTexture,
  createStudBrickMaterial,
  StudTexturePair,
} from './robloxTextures';
import { EnvironmentId, PropKind } from './types';

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
  castShadow = true,
): THREE.Mesh {
  const mat = createStudBrickMaterial(
    color,
    studTextures,
    Math.max(1, Math.round(w * studDensity)),
    Math.max(1, Math.round(d * studDensity)),
    { roughness: 0.42, bumpScale: 0.03 },
  );
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildBlockyRobloxTree(
  x: number,
  z: number,
  scale: number,
  studTextures: StudTexturePair,
): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  // Trunk (Reddish Brown)
  addBrick(tree, 0.72, 2.2, 0.72, 0, 1.1, 0, '#6b4226', studTextures, 1.4);

  // Layered blocky leaf clusters (Earth Green & Br. Yellowish Green)
  addBrick(tree, 2.3, 1.1, 2.3, 0, 2.65, 0, '#27462d', studTextures, 1.5);
  addBrick(tree, 1.85, 0.95, 1.85, 0, 3.55, 0, '#3a7d34', studTextures, 1.5);
  addBrick(tree, 1.15, 0.72, 1.15, 0, 4.25, 0, '#4b974b', studTextures, 1.5);

  return tree;
}

function buildCrossroadsEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const root = new THREE.Group();

  // Iconic Classic Roblox Studded Green & Grey Crossroads Baseplate
  const baseplateMat = createStudBrickMaterial('#4b974b', studTextures, 52, 52, {
    roughness: 0.62,
    bumpScale: 0.032,
  });
  const baseplate = new THREE.Mesh(new THREE.BoxGeometry(36, 0.5, 36), baseplateMat);
  baseplate.position.set(0, -0.25, 0);
  baseplate.receiveShadow = true;
  root.add(baseplate);

  // Crossroads stone paths (+X/-X and +Z/-Z)
  addBrick(root, 30, 0.08, 3.8, 0, 0.04, 0, '#a3a2a5', studTextures, 1.5, false);
  addBrick(root, 3.8, 0.08, 30, 0, 0.045, 0, '#a3a2a5', studTextures, 1.5, false);

  // Center raised combat brick pad
  addBrick(root, 5.2, 0.14, 5.2, 0, 0.07, 0, '#635f62', studTextures, 1.5, false);

  // Red Team Brick Battlement Fort (-X, -Z quadrant)
  const redFort = new THREE.Group();
  redFort.position.set(-7.2, 0, -6.8);
  addBrick(redFort, 5.2, 0.4, 5.2, 0, 0.2, 0, '#a3a2a5', studTextures);
  addBrick(redFort, 4.6, 2.2, 0.6, 0, 1.5, 2.0, '#c4281c', studTextures);
  addBrick(redFort, 4.6, 2.2, 0.6, 0, 1.5, -2.0, '#c4281c', studTextures);
  addBrick(redFort, 0.6, 2.2, 3.4, -2.0, 1.5, 0, '#c4281c', studTextures);
  // Battlement crenels
  for (const cx of [-1.7, 0, 1.7]) {
    addBrick(redFort, 0.9, 0.55, 0.65, cx, 2.88, 2.0, '#635f62', studTextures);
    addBrick(redFort, 0.9, 0.55, 0.65, cx, 2.88, -2.0, '#635f62', studTextures);
  }
  root.add(redFort);

  // Blue Team Stepped Watchtower (+X, -Z quadrant)
  const blueTower = new THREE.Group();
  blueTower.position.set(7.4, 0, -6.8);
  addBrick(blueTower, 4.8, 0.5, 4.8, 0, 0.25, 0, '#635f62', studTextures);
  addBrick(blueTower, 3.8, 3.2, 3.8, 0, 2.1, 0, '#0d69ac', studTextures);
  addBrick(blueTower, 4.5, 0.45, 4.5, 0, 3.92, 0, '#a3a2a5', studTextures);
  for (const sx of [-1.7, 1.7]) {
    for (const sz of [-1.7, 1.7]) {
      addBrick(blueTower, 0.85, 0.75, 0.85, sx, 4.52, sz, '#0d69ac', studTextures);
    }
  }
  root.add(blueTower);

  // Classic Stepped Truss / Brick Archway Bridge in background (-Z)
  addBrick(root, 1.1, 3.4, 1.1, -2.6, 1.7, -9.8, '#635f62', studTextures);
  addBrick(root, 1.1, 3.4, 1.1, 2.6, 1.7, -9.8, '#635f62', studTextures);
  addBrick(root, 6.8, 0.65, 1.5, 0, 3.7, -9.8, '#f5cd30', studTextures);

  // Decorative stepped brick ramp (-X, +Z)
  for (let i = 0; i < 4; i++) {
    addBrick(
      root,
      1.2,
      0.38 * (i + 1),
      2.6,
      -8.5 + i * 1.15,
      (0.38 * (i + 1)) / 2,
      5.5,
      '#da8541',
      studTextures,
    );
  }

  // Background SpawnLocation pads
  const spawnTex = createSpawnLocationTexture('#635f62', '#f2f3f3', maxAnisotropy);
  const spawnMat = new THREE.MeshStandardMaterial({
    map: spawnTex,
    roughness: 0.4,
    metalness: 0.05,
  });
  for (const [sx, sz] of [
    [-7.2, -6.8],
    [7.4, -3.5],
  ]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 2.0), spawnMat);
    pad.position.set(sx, 0.48, sz);
    pad.receiveShadow = true;
    root.add(pad);
  }

  // Classic Roblox Trees around perimeter
  root.add(buildBlockyRobloxTree(-10.5, -1.5, 1.0, studTextures));
  root.add(buildBlockyRobloxTree(10.5, 1.8, 1.1, studTextures));
  root.add(buildBlockyRobloxTree(-5.2, 8.6, 0.95, studTextures));
  root.add(buildBlockyRobloxTree(8.8, -10.4, 1.05, studTextures));

  return root;
}

function buildTownEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const root = new THREE.Group();

  // Studded Town Grass Base + Cobble Plaza
  const grassMat = createStudBrickMaterial('#5b9e4b', studTextures, 46, 46, {
    roughness: 0.64,
    bumpScale: 0.03,
  });
  const baseplate = new THREE.Mesh(new THREE.BoxGeometry(36, 0.5, 36), grassMat);
  baseplate.position.set(0, -0.25, 0);
  baseplate.receiveShadow = true;
  root.add(baseplate);

  // Town plaza courtyard paving
  addBrick(root, 15, 0.1, 13, 0, 0.05, -0.5, '#a3a2a5', studTextures, 1.4, false);
  addBrick(root, 12.5, 0.14, 10.5, 0, 0.07, -0.5, '#d4d4d8', studTextures, 1.4, false);

  // Central Tiered Brick Fountain (offset behind main foreground stage)
  const fountain = new THREE.Group();
  fountain.position.set(0, 0, -4.2);
  addBrick(fountain, 3.6, 0.5, 3.6, 0, 0.35, 0, '#635f62', studTextures);
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#00a2ff',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const water = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.32, 2.9), waterMat);
  water.position.y = 0.46;
  fountain.add(water);
  addBrick(fountain, 1.0, 1.45, 1.0, 0, 1.0, 0, '#a3a2a5', studTextures);
  addBrick(fountain, 1.8, 0.25, 1.8, 0, 1.68, 0, '#d4d4d8', studTextures);
  const topWater = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.55), waterMat);
  topWater.position.y = 2.1;
  fountain.add(topWater);
  root.add(fountain);

  // Classic Roblox Shop Buildings (Pizza / Toy Shop & Bank)
  const shopLeft = new THREE.Group();
  shopLeft.position.set(-7.6, 0, -4.5);
  addBrick(shopLeft, 4.8, 4.2, 4.8, 0, 2.1, 0, '#f5cd30', studTextures);
  addBrick(shopLeft, 5.2, 0.45, 5.2, 0, 4.4, 0, '#c4281c', studTextures);
  // Awning
  addBrick(shopLeft, 3.4, 0.25, 1.4, 0, 2.2, 2.9, '#c4281c', studTextures);
  // Doorway & Windows
  addBrick(shopLeft, 1.4, 2.0, 0.2, 0, 1.0, 2.42, '#6b4226', studTextures);
  addBrick(shopLeft, 1.0, 1.0, 0.2, -1.4, 3.1, 2.42, '#7dd3fc', studTextures);
  addBrick(shopLeft, 1.0, 1.0, 0.2, 1.4, 3.1, 2.42, '#7dd3fc', studTextures);
  root.add(shopLeft);

  const shopRight = new THREE.Group();
  shopRight.position.set(7.8, 0, -4.2);
  addBrick(shopRight, 4.8, 5.4, 4.6, 0, 2.7, 0, '#0d69ac', studTextures);
  addBrick(shopRight, 5.2, 0.5, 5.0, 0, 5.65, 0, '#f2f3f3', studTextures);
  addBrick(shopRight, 1.6, 2.1, 0.2, 0, 1.05, 2.32, '#1b2a35', studTextures);
  addBrick(shopRight, 1.1, 1.1, 0.2, -1.3, 3.6, 2.32, '#bae6fd', studTextures);
  addBrick(shopRight, 1.1, 1.1, 0.2, 1.3, 3.6, 2.32, '#bae6fd', studTextures);
  root.add(shopRight);

  // Town Benches & Street Lamps
  for (const bx of [-3.4, 3.4]) {
    addBrick(root, 2.1, 0.25, 0.8, bx, 0.55, -2.0, '#8a5a36', studTextures);
    addBrick(root, 0.25, 0.45, 0.7, bx - 0.75, 0.25, -2.0, '#1b2a35', studTextures);
    addBrick(root, 0.25, 0.45, 0.7, bx + 0.75, 0.25, -2.0, '#1b2a35', studTextures);

    // Street Lamp
    const lx = bx * 1.35;
    addBrick(root, 0.28, 3.2, 0.28, lx, 1.6, -0.8, '#1b2a35', studTextures);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), lanternMat);
    bulb.position.set(lx, 3.35, -0.8);
    root.add(bulb);
  }

  // Town SpawnPad
  const spawnTex = createSpawnLocationTexture('#a3a2a5', '#00a2ff', maxAnisotropy);
  const spawnPad = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.14, 2.0),
    new THREE.MeshStandardMaterial({ map: spawnTex, roughness: 0.4 }),
  );
  spawnPad.position.set(-4.2, 0.14, 3.2);
  spawnPad.receiveShadow = true;
  root.add(spawnPad);

  root.add(buildBlockyRobloxTree(-8.6, 3.8, 0.95, studTextures));
  root.add(buildBlockyRobloxTree(8.6, 3.8, 1.0, studTextures));
  root.add(buildBlockyRobloxTree(0, -10.2, 1.15, studTextures));

  return root;
}

export function buildRobloxEnvironmentGroup(
  env: EnvironmentId,
  maxAnisotropy: number,
  studTextures: StudTexturePair,
): THREE.Group {
  if (env === 'town') {
    return buildTownEnvironment(studTextures, maxAnisotropy);
  }
  return buildCrossroadsEnvironment(studTextures, maxAnisotropy);
}

export function buildRobloxPropGroup(
  propKind: PropKind,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  shadowTex: THREE.CanvasTexture,
  maxAnisotropy: number,
): THREE.Group {
  const root = new THREE.Group();

  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(1.75, 1.75),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  switch (propKind) {
    case 'spawnpad': {
      const topTex = createSpawnLocationTexture(primaryColor, accentColor, maxAnisotropy);
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35 });
      const sideMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.38 });
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.18, 1.8),
        [sideMat, sideMat, topMat, sideMat, sideMat, sideMat],
      );
      pad.position.y = 0.09;
      pad.castShadow = true;
      pad.receiveShadow = true;
      root.add(pad);
      break;
    }
    case 'tree': {
      const tree = buildBlockyRobloxTree(0, 0, 0.72, studTextures);
      root.add(tree);
      break;
    }
    case 'speeder': {
      const bodyMat = createStudBrickMaterial(primaryColor, studTextures, 2, 4, {
        roughness: 0.3,
      });
      const trimMat = createPlasticBrickMaterial(accentColor, { roughness: 0.28 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#7dd3fc',
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.8,
      });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 2.4), bodyMat);
      hull.position.y = 0.55;
      hull.castShadow = true;
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.8), trimMat);
      nose.position.set(0, 0.52, 1.45);
      nose.castShadow = true;
      const shield = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 0.12), glassMat);
      shield.position.set(0, 0.92, 0.55);
      shield.rotation.x = -0.35;
      const thrusterL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 0.65, 12),
        trimMat,
      );
      thrusterL.rotation.x = Math.PI / 2;
      thrusterL.position.set(-0.48, 0.52, -1.25);
      const thrusterR = thrusterL.clone();
      thrusterR.position.x = 0.48;
      root.add(hull, nose, shield, thrusterL, thrusterR);
      break;
    }
    case 'crate':
    default: {
      addBrick(root, 1.05, 1.05, 1.05, 0, 0.525, 0, primaryColor, studTextures, 2);
      addBrick(root, 1.12, 0.16, 1.12, 0, 0.96, 0, accentColor, studTextures, 2);
      addBrick(root, 0.68, 0.68, 0.68, 0.42, 1.38, -0.1, accentColor, studTextures, 2);
      break;
    }
  }

  return root;
}
