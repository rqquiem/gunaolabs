import * as THREE from 'three';
import { getBuiltInMapByEnv } from './mapLibrary';
import {
  createPlasticBrickMaterial,
  createSpawnLocationTexture,
  createStudBrickMaterial,
  StudTexturePair,
} from './robloxTextures';
import { degToRad } from './timeline';
import {
  buildExtendedStagePropGroup,
  buildGroundedItemPropGroup,
} from './robloxItems';
import {
  buildAreaRugGroup,
  buildBedroomCornerShellGroup,
  buildBookshelfGroup,
  buildGamerBedGroup,
  buildMailboxGroup,
  buildPcDeskGroup,
  buildPicketFenceGroup,
  buildStreetLampGroup,
  buildSuburbanHouseGroup,
} from './robloxFurniture';
import {
  buildIdiomMapModuleGroup,
  buildIdiomPropGroup,
  IdiomMapModuleKind,
  IdiomPropKind,
} from './idiomAssets';
import {
  buildCityGridRoadNetwork,
  buildCityMapModuleGroup,
  buildCitySkylinePerimeter,
  CityMapModuleKind,
} from './robloxCityAssets';
import {
  EnvironmentId,
  ItemId,
  MapDefinition,
  MapModuleInstance,
  MapModuleKind,
  PropKind,
} from './types';

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
  roughness = 0.42,
): THREE.Mesh {
  const mat = createStudBrickMaterial(
    color,
    studTextures,
    Math.max(1, Math.round(w * studDensity)),
    Math.max(1, Math.round(d * studDensity)),
    { roughness, bumpScale: 0.03 },
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
  canopyColor = '#3a7d34',
  trunkColor = '#6b4226',
): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  // Trunk
  addBrick(tree, 0.72, 2.2, 0.72, 0, 1.1, 0, trunkColor, studTextures, 1.4);

  // Layered blocky leaf clusters
  addBrick(tree, 2.3, 1.1, 2.3, 0, 2.65, 0, '#27462d', studTextures, 1.5);
  addBrick(tree, 1.85, 0.95, 1.85, 0, 3.55, 0, canopyColor, studTextures, 1.5);
  addBrick(tree, 1.15, 0.72, 1.15, 0, 4.25, 0, '#4b974b', studTextures, 1.5);

  return tree;
}

export function buildMapModuleGroup(
  kind: MapModuleKind,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();

  switch (kind) {
    case 'tower': {
      addBrick(group, 4.6, 0.48, 4.6, 0, 0.24, 0, accentColor, studTextures);
      addBrick(group, 3.6, 3.1, 3.6, 0, 2.03, 0, primaryColor, studTextures);
      addBrick(group, 4.3, 0.42, 4.3, 0, 3.79, 0, accentColor, studTextures);
      for (const sx of [-1.6, 1.6]) {
        for (const sz of [-1.6, 1.6]) {
          addBrick(group, 0.82, 0.72, 0.82, sx, 4.36, sz, primaryColor, studTextures);
        }
      }
      // Door arch recess
      addBrick(group, 1.15, 1.8, 0.24, 0, 1.38, 1.82, '#1e293b', studTextures, 1.4);
      break;
    }

    case 'fortWall': {
      addBrick(group, 5.2, 0.4, 5.2, 0, 0.2, 0, accentColor, studTextures);
      addBrick(group, 4.6, 2.2, 0.6, 0, 1.5, 2.0, primaryColor, studTextures);
      addBrick(group, 4.6, 2.2, 0.6, 0, 1.5, -2.0, primaryColor, studTextures);
      addBrick(group, 0.6, 2.2, 3.4, -2.0, 1.5, 0, primaryColor, studTextures);
      for (const cx of [-1.7, 0, 1.7]) {
        addBrick(group, 0.9, 0.55, 0.65, cx, 2.88, 2.0, accentColor, studTextures);
        addBrick(group, 0.9, 0.55, 0.65, cx, 2.88, -2.0, accentColor, studTextures);
      }
      break;
    }

    case 'archBridge': {
      addBrick(group, 1.35, 0.35, 1.5, -2.6, 0.175, 0, accentColor, studTextures);
      addBrick(group, 1.35, 0.35, 1.5, 2.6, 0.175, 0, accentColor, studTextures);
      addBrick(group, 1.05, 3.1, 1.05, -2.6, 1.9, 0, primaryColor, studTextures);
      addBrick(group, 1.05, 3.1, 1.05, 2.6, 1.9, 0, primaryColor, studTextures);
      addBrick(group, 6.8, 0.65, 1.5, 0, 3.72, 0, accentColor, studTextures);
      addBrick(group, 5.2, 0.32, 0.9, 0, 4.18, 0, primaryColor, studTextures);
      break;
    }

    case 'shopFront': {
      addBrick(group, 4.8, 4.2, 4.6, 0, 2.1, 0, primaryColor, studTextures);
      addBrick(group, 5.2, 0.45, 5.0, 0, 4.42, 0, accentColor, studTextures);
      addBrick(group, 3.4, 0.25, 1.4, 0, 2.2, 2.8, accentColor, studTextures);
      addBrick(group, 1.4, 2.0, 0.2, 0, 1.0, 2.32, '#6b4226', studTextures);
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#93c5fd',
        roughness: 0.15,
        metalness: 0.2,
      });
      for (const wx of [-1.4, 1.4]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.2), glassMat);
        win.position.set(wx, 3.1, 2.32);
        group.add(win);
      }
      break;
    }

    case 'pillarGate': {
      addBrick(group, 1.2, 0.45, 1.2, -2.15, 0.225, 0, accentColor, studTextures);
      addBrick(group, 1.2, 0.45, 1.2, 2.15, 0.225, 0, accentColor, studTextures);
      addBrick(group, 0.68, 3.8, 0.68, -2.15, 2.35, 0, primaryColor, studTextures);
      addBrick(group, 0.68, 3.8, 0.68, 2.15, 2.35, 0, primaryColor, studTextures);
      addBrick(group, 5.8, 0.48, 0.95, 0, 3.9, 0, primaryColor, studTextures);
      addBrick(group, 6.5, 0.45, 1.15, 0, 4.45, 0, accentColor, studTextures);
      addBrick(group, 0.7, 0.52, 0.7, 0, 4.18, 0, accentColor, studTextures);
      break;
    }

    case 'rampStairs': {
      for (let i = 0; i < 4; i++) {
        const h = 0.42 * (i + 1);
        addBrick(
          group,
          1.15,
          h,
          2.6,
          -1.72 + i * 1.15,
          h / 2,
          0,
          i === 3 ? accentColor : primaryColor,
          studTextures,
        );
      }
      break;
    }

    case 'spawnPad': {
      const topTex = createSpawnLocationTexture(primaryColor, accentColor, maxAnisotropy);
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.36 });
      const sideMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.42 });
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.22, 2.4),
        [sideMat, sideMat, topMat, sideMat, sideMat, sideMat],
      );
      base.position.y = 0.11;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(2.65, 0.08, 2.65),
        createPlasticBrickMaterial(accentColor, { roughness: 0.3 }),
      );
      rim.position.y = 0.04;
      rim.receiveShadow = true;
      group.add(rim);
      break;
    }

    case 'treeGrove': {
      group.add(buildBlockyRobloxTree(0, 0, 1.0, studTextures, primaryColor, accentColor));
      break;
    }

    case 'waterPool': {
      addBrick(group, 3.8, 0.52, 3.8, 0, 0.26, 0, primaryColor, studTextures);
      const waterMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.14,
        metalness: 0.12,
        transparent: true,
        opacity: 0.86,
      });
      const water = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.32, 3.05), waterMat);
      water.position.y = 0.44;
      group.add(water);
      addBrick(group, 0.95, 1.45, 0.95, 0, 0.96, 0, '#a3a2a5', studTextures);
      addBrick(group, 1.85, 0.25, 1.85, 0, 1.68, 0, '#d4d4d8', studTextures);
      const spout = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.65, 0.54), waterMat);
      spout.position.y = 2.1;
      group.add(spout);
      break;
    }

    case 'neonBeacon': {
      addBrick(group, 1.9, 0.35, 1.9, 0, 0.175, 0, primaryColor, studTextures, 1.4, true, 0.5);
      addBrick(group, 1.15, 2.3, 1.15, 0, 1.5, 0, primaryColor, studTextures, 1.4, true, 0.4);
      const glowMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.55,
        roughness: 0.18,
        metalness: 0.1,
      });
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.1, 0.76), glowMat);
      core.position.y = 3.15;
      group.add(core);
      const finMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.35, metalness: 0.45 });
      for (const [fx, fz] of [
        [-0.55, 0],
        [0.55, 0],
        [0, -0.55],
        [0, 0.55],
      ]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), finMat);
        fin.position.set(fx, 3.25, fz);
        fin.castShadow = true;
        group.add(fin);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.25, 1.25), finMat);
      cap.position.y = 3.95;
      group.add(cap);
      break;
    }

    case 'rockOutcrop': {
      const rockMatA = createPlasticBrickMaterial(primaryColor, { roughness: 0.85, metalness: 0.05 });
      const rockMatB = createPlasticBrickMaterial(accentColor, { roughness: 0.88, metalness: 0.05 });
      const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 0), rockMatA);
      mainRock.position.set(0, 0.85, 0);
      mainRock.scale.set(1.2, 0.9, 1.0);
      mainRock.castShadow = true;
      mainRock.receiveShadow = true;
      const sideA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 0), rockMatB);
      sideA.position.set(-1.1, 0.52, 0.45);
      sideA.castShadow = true;
      sideA.receiveShadow = true;
      const sideB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), rockMatB);
      sideB.position.set(1.05, 0.45, -0.35);
      sideB.castShadow = true;
      sideB.receiveShadow = true;
      group.add(mainRock, sideA, sideB);
      break;
    }

    case 'gamerBed': {
      group.add(buildGamerBedGroup(primaryColor, accentColor, studTextures));
      break;
    }

    case 'pcDesk': {
      group.add(buildPcDeskGroup(primaryColor, accentColor, studTextures, maxAnisotropy));
      break;
    }

    case 'areaRug': {
      group.add(buildAreaRugGroup(primaryColor, accentColor, studTextures));
      break;
    }

    case 'bookshelf': {
      group.add(buildBookshelfGroup(primaryColor, accentColor, studTextures));
      break;
    }

    case 'suburbanHouse': {
      group.add(buildSuburbanHouseGroup(primaryColor, accentColor, studTextures));
      break;
    }

    case 'picketFence': {
      group.add(buildPicketFenceGroup(primaryColor, accentColor, studTextures));
      break;
    }

    case 'streetLamp': {
      group.add(buildStreetLampGroup(primaryColor, accentColor, studTextures));
      break;
    }

    case 'glassSkyscraper':
    case 'brickTower':
    case 'trafficSignal':
    case 'subwayEntrance':
    case 'billboardGantry':
    case 'cityBusStop': {
      group.add(
        buildCityMapModuleGroup(
          kind as CityMapModuleKind,
          primaryColor,
          accentColor,
          studTextures,
          maxAnisotropy,
        ),
      );
      break;
    }

    case 'verbatimSign':
    case 'cafeCounter':
    case 'boardroomSuite':
    case 'weddingAltar':
    case 'theaterWings':
    case 'retroDiner':
    case 'mainStreetSet': {
      group.add(
        buildIdiomMapModuleGroup(
          kind as IdiomMapModuleKind,
          primaryColor,
          accentColor,
          studTextures,
          maxAnisotropy,
        ),
      );
      break;
    }

    case 'crateCluster':
    default: {
      addBrick(group, 1.25, 1.25, 1.25, -0.45, 0.625, 0.15, primaryColor, studTextures, 1.8);
      addBrick(group, 1.32, 0.16, 1.32, -0.45, 1.15, 0.15, accentColor, studTextures, 1.8);
      addBrick(group, 1.05, 1.05, 1.05, 0.82, 0.525, -0.25, primaryColor, studTextures, 1.8);
      addBrick(group, 0.82, 0.82, 0.82, -0.25, 1.66, 0.08, accentColor, studTextures, 1.8);
      break;
    }
  }

  return group;
}

function buildModuleInstanceNode(
  mod: MapModuleInstance,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
  selectedModuleId?: string | null,
): THREE.Group {
  const wrapper = buildMapModuleGroup(
    mod.kind,
    mod.primaryColor,
    mod.accentColor,
    studTextures,
    maxAnisotropy,
  );
  wrapper.position.set(mod.position[0], mod.position[1], mod.position[2]);
  wrapper.rotation.y = degToRad(mod.rotationYDeg);
  wrapper.scale.setScalar(mod.scale);
  wrapper.userData.mapModuleId = mod.id;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.32, 44),
    new THREE.MeshBasicMaterial({
      color: 0x00a2ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = selectedModuleId === mod.id;
  ring.userData.mapModuleRingId = mod.id;
  wrapper.add(ring);

  return wrapper;
}

function buildBaseplateAndPaths(
  root: THREE.Group,
  mapDef: MapDefinition,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
) {
  const { size, groundColor, trimColor, pathStyle, studDensity, perimeter } =
    mapDef.baseplate;
  const studCount = Math.max(16, Math.round(size * studDensity));

  const baseplateMat = createStudBrickMaterial(groundColor, studTextures, studCount, studCount, {
    roughness: 0.62,
    bumpScale: 0.032,
  });
  const baseplate = new THREE.Mesh(new THREE.BoxGeometry(size, 0.5, size), baseplateMat);
  baseplate.position.set(0, -0.25, 0);
  baseplate.receiveShadow = true;
  root.add(baseplate);

  // Subtle dark slate underside bevel trim so elevated maps read crisply
  const apronMat = createPlasticBrickMaterial('#1e222b', { roughness: 0.72 });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(size + 0.6, 0.24, size + 0.6), apronMat);
  apron.position.set(0, -0.38, 0);
  apron.receiveShadow = true;
  root.add(apron);

  const halfSpan = Math.max(12, size - 6);

  if (pathStyle === 'cross') {
    addBrick(root, halfSpan, 0.08, 3.8, 0, 0.04, 0, trimColor, studTextures, 1.5, false);
    addBrick(root, 3.8, 0.08, halfSpan, 0, 0.046, 0, trimColor, studTextures, 1.5, false);
    addBrick(root, 5.2, 0.14, 5.2, 0, 0.07, 0, '#635f62', studTextures, 1.5, false);
  } else if (pathStyle === 'plaza') {
    const plazaW = Math.min(size * 0.46, 16);
    const plazaD = Math.min(size * 0.42, 14);
    addBrick(root, plazaW, 0.08, plazaD, 0, 0.04, -0.4, '#8b8d94', studTextures, 1.4, false);
    addBrick(
      root,
      plazaW - 2.4,
      0.12,
      plazaD - 2.4,
      0,
      0.06,
      -0.4,
      trimColor,
      studTextures,
      1.4,
      false,
    );
  } else if (pathStyle === 'runway') {
    addBrick(root, 4.6, 0.08, halfSpan, 0, 0.04, 0, '#475569', studTextures, 1.4, false);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      emissive: trimColor,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    for (const ex of [-2.4, 2.4]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, halfSpan - 1), edgeMat);
      strip.position.set(ex, 0.05, 0);
      root.add(strip);
    }
  } else if (pathStyle === 'street') {
    const streetSpan = size;
    const halfS = size * 0.5;
    const roadCenterZ = 3.2;
    const roadDepth = 6.4; // z = 0.0 .. 6.4 (wide 4-lane avenue)
    const crossHalfW = 2.8; // cross-street x = -2.8 .. +2.8

    // Continuous North Sidewalk & Storefront Plaza (z = -8.4 .. 0.0, zero gaps to buildings)
    addBrick(root, streetSpan, 0.08, 8.4, 0, 0.04, -4.2, '#cbd5e1', studTextures, 1.1, false, 0.72);
    // Raised North Curb
    const curbMat = createPlasticBrickMaterial('#94a3b8', { roughness: 0.62 });
    const northCurb = new THREE.Mesh(new THREE.BoxGeometry(streetSpan, 0.11, 0.22), curbMat);
    northCurb.position.set(0, 0.055, -0.06);
    northCurb.receiveShadow = true;
    root.add(northCurb);

    // Continuous South Sidewalks flanking the perpendicular South Cross-Street (z = 6.4 .. 12.8)
    const southSidewalkW = Math.max(8, halfS - crossHalfW);
    const southSidewalkCenterX = crossHalfW + southSidewalkW * 0.5;
    for (const side of [-1, 1]) {
      addBrick(
        root,
        southSidewalkW,
        0.08,
        6.4,
        side * southSidewalkCenterX,
        0.04,
        9.6,
        '#cbd5e1',
        studTextures,
        1.1,
        false,
        0.72,
      );
      const southCurb = new THREE.Mesh(new THREE.BoxGeometry(southSidewalkW, 0.11, 0.22), curbMat);
      southCurb.position.set(side * southSidewalkCenterX, 0.055, 6.46);
      southCurb.receiveShadow = true;
      root.add(southCurb);

      const crossCurbLen = Math.max(4, halfS - 6.4);
      const crossCurb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, crossCurbLen), curbMat);
      crossCurb.position.set(side * (crossHalfW + 0.06), 0.055, 6.4 + crossCurbLen * 0.5);
      crossCurb.receiveShadow = true;
      root.add(crossCurb);
    }

    // Full-span 4-lane East-West Asphalt Main Avenue (edge-to-edge across entire baseplate)
    const asphaltMat = createPlasticBrickMaterial('#273244', { roughness: 0.88 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(streetSpan, 0.06, roadDepth), asphaltMat);
    road.position.set(0, 0.03, roadCenterZ);
    road.receiveShadow = true;
    root.add(road);

    // Perpendicular South Cross-Street extending from Main Avenue to South edge of baseplate
    const southRoadLen = Math.max(6, halfS - 6.2);
    const southRoad = new THREE.Mesh(
      new THREE.BoxGeometry(crossHalfW * 2, 0.058, southRoadLen),
      asphaltMat,
    );
    southRoad.position.set(0, 0.029, 6.2 + southRoadLen * 0.5);
    southRoad.receiveShadow = true;
    root.add(southRoad);

    // Double solid yellow centerlines along Main Avenue & South Cross-Street
    const yellowStripeMat = createPlasticBrickMaterial('#facc15', { roughness: 0.48 });
    const whiteStripeMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.48 });
    const wingLen = Math.max(6, halfS - 3.9);
    const wingCenterX = 3.9 + wingLen * 0.5;
    for (const side of [-1, 1]) {
      for (const offsetZ of [-0.11, 0.11]) {
        const yLine = new THREE.Mesh(new THREE.BoxGeometry(wingLen, 0.024, 0.11), yellowStripeMat);
        yLine.position.set(side * wingCenterX, 0.072, roadCenterZ + offsetZ);
        root.add(yLine);
      }
      // Solid white stop bar at intersection approach
      const stopBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, roadDepth - 0.6), whiteStripeMat);
      stopBar.position.set(side * 3.85, 0.073, roadCenterZ);
      root.add(stopBar);
    }

    // Double yellow centerline on South Cross-Street
    const southYellowLen = Math.max(4, halfS - 7.6);
    for (const offsetX of [-0.11, 0.11]) {
      const syLine = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, southYellowLen), yellowStripeMat);
      syLine.position.set(offsetX, 0.072, 7.6 + southYellowLen * 0.5);
      root.add(syLine);
    }

    // Dashed white outer lane dividers for all 4 lanes (z = 1.6 and z = 4.8)
    for (const laneZ of [1.6, 4.8]) {
      for (let dx = -halfS + 1.8; dx <= halfS - 1.8; dx += 2.5) {
        if (Math.abs(dx) < 4.4) continue;
        const dash = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.024, 0.12), whiteStripeMat);
        dash.position.set(dx, 0.072, laneZ);
        root.add(dash);
      }
    }

    // Complete Zebra Crosswalks across West, East, and South intersection approaches
    for (const crossX of [-3.15, 3.15]) {
      for (let cz = 0.55; cz <= 5.85; cz += 0.66) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.026, 0.32), whiteStripeMat);
        bar.position.set(crossX, 0.075, cz);
        root.add(bar);
      }
    }
    for (let cx = -2.25; cx <= 2.25; cx += 0.75) {
      const sBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.026, 1.05), whiteStripeMat);
      sBar.position.set(cx, 0.075, 6.75);
      root.add(sBar);
    }

    // Detailed cast-iron manhole covers & storm drain grates along the avenue
    const ironMat = createPlasticBrickMaterial('#475569', { roughness: 0.45, metalness: 0.65 });
    for (const [mx, mz] of [
      [-6.5, 2.4],
      [0, 3.2],
      [7.5, 4.1],
    ]) {
      const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.026, 14), ironMat);
      manhole.position.set(mx, 0.073, mz);
      root.add(manhole);
    }
  } else if (pathStyle === 'cityGrid') {
    buildCityGridRoadNetwork(root, size, trimColor, studTextures);
  } else if (pathStyle === 'hardwood') {
    // Alternating hardwood plank strips across the room floor (y = 0.025 above baseplate)
    const plankCount = Math.max(6, Math.round(size / 1.1));
    const plankW = size / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const shade = i % 2 === 0 ? '#9c6644' : '#7f5539';
      const px = -size * 0.5 + (i + 0.5) * plankW;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(plankW - 0.04, 0.04, size - 0.12),
        createPlasticBrickMaterial(shade, { roughness: 0.62 }),
      );
      plank.position.set(px, 0.02, 0);
      plank.receiveShadow = true;
      root.add(plank);
    }
  }

  const edge = size * 0.34;
  if (perimeter === 'trees') {
    root.add(buildBlockyRobloxTree(-edge, -1.6, 1.0, studTextures));
    root.add(buildBlockyRobloxTree(edge, 1.8, 1.08, studTextures));
    root.add(buildBlockyRobloxTree(-edge * 0.55, edge * 0.82, 0.95, studTextures));
    root.add(buildBlockyRobloxTree(edge * 0.8, -edge * 0.9, 1.05, studTextures));
  } else if (perimeter === 'picketFence') {
    // Natural extended lawn horizon skirt so neighborhood blends smoothly into fog
    const skirtMat = createPlasticBrickMaterial('#458238', { roughness: 0.9 });
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(108, 0.3, 108), skirtMat);
    skirt.position.set(0, -0.58, 0);
    skirt.receiveShadow = true;
    root.add(skirt);

    root.add(buildBlockyRobloxTree(-edge * 0.95, -edge * 0.65, 1.08, studTextures));
    root.add(buildBlockyRobloxTree(edge * 0.98, -edge * 0.72, 1.12, studTextures));
    root.add(buildBlockyRobloxTree(-edge * 0.82, edge * 0.78, 0.95, studTextures));
    root.add(buildBlockyRobloxTree(edge * 0.85, edge * 0.76, 1.05, studTextures));
  } else if (perimeter === 'bedroomCorner') {
    root.add(buildBedroomCornerShellGroup(size, size, studTextures, maxAnisotropy));
  } else if (perimeter === 'citySkyline') {
    buildCitySkylinePerimeter(root, size, studTextures, maxAnisotropy);
  } else if (perimeter === 'rocks') {
    const rockMat = createPlasticBrickMaterial('#475569', { roughness: 0.86 });
    const ringPoints: [number, number, number][] = [
      [-edge, -edge * 0.6, 1.4],
      [edge, -edge * 0.7, 1.6],
      [-edge * 0.85, edge * 0.72, 1.25],
      [edge * 0.88, edge * 0.65, 1.35],
    ];
    for (const [rx, rz, rs] of ringPoints) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), rockMat);
      rock.position.set(rx, rs * 0.58, rz);
      rock.castShadow = true;
      rock.receiveShadow = true;
      root.add(rock);
    }
  } else if (perimeter === 'neonRim') {
    const rimMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      emissive: trimColor,
      emissiveIntensity: 0.95,
      roughness: 0.22,
    });
    const span = size - 0.5;
    const half = size * 0.5 - 0.25;
    const north = new THREE.Mesh(new THREE.BoxGeometry(span, 0.18, 0.25), rimMat);
    north.position.set(0, 0.09, -half);
    const south = north.clone();
    south.position.z = half;
    const east = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, span), rimMat);
    east.position.set(half, 0.09, 0);
    const west = east.clone();
    west.position.x = -half;
    root.add(north, south, east, west);
  }
}

export function buildCustomMapEnvironment(
  mapDef: MapDefinition,
  maxAnisotropy: number,
  studTextures: StudTexturePair,
  selectedModuleId?: string | null,
): THREE.Group {
  const root = new THREE.Group();
  buildBaseplateAndPaths(root, mapDef, studTextures, maxAnisotropy);

  for (const mod of mapDef.modules) {
    root.add(buildModuleInstanceNode(mod, studTextures, maxAnisotropy, selectedModuleId));
  }

  return root;
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
  const redFort = buildMapModuleGroup('fortWall', '#c4281c', '#635f62', studTextures, maxAnisotropy);
  redFort.position.set(-7.2, 0, -6.8);
  root.add(redFort);

  // Blue Team Stepped Watchtower (+X, -Z quadrant)
  const blueTower = buildMapModuleGroup('tower', '#0d69ac', '#a3a2a5', studTextures, maxAnisotropy);
  blueTower.position.set(7.4, 0, -6.8);
  root.add(blueTower);

  // Classic Stepped Truss / Brick Archway Bridge in background (-Z)
  const arch = buildMapModuleGroup('archBridge', '#635f62', '#f5cd30', studTextures, maxAnisotropy);
  arch.position.set(0, 0, -9.8);
  root.add(arch);

  // Decorative stepped brick ramp (-X, +Z)
  const ramp = buildMapModuleGroup('rampStairs', '#da8541', '#a3a2a5', studTextures, maxAnisotropy);
  ramp.position.set(-7.0, 0, 5.5);
  root.add(ramp);

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

  // Central Tiered Brick Fountain
  const fountain = buildMapModuleGroup('waterPool', '#635f62', '#00a2ff', studTextures, maxAnisotropy);
  fountain.position.set(0, 0, -4.2);
  root.add(fountain);

  // Classic Roblox Shop Buildings (Pizza / Toy Shop & Bank)
  const shopLeft = buildMapModuleGroup('shopFront', '#f5cd30', '#c4281c', studTextures, maxAnisotropy);
  shopLeft.position.set(-7.6, 0, -4.5);
  root.add(shopLeft);

  const shopRight = buildMapModuleGroup('shopFront', '#0d69ac', '#f2f3f3', studTextures, maxAnisotropy);
  shopRight.position.set(7.8, 0, -4.2);
  shopRight.scale.setScalar(1.08);
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

function buildSkyObbyEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const mapDef = getBuiltInMapByEnv('skyObby');
  const root = buildCustomMapEnvironment(mapDef, maxAnisotropy, studTextures);

  // Rainbow floating obby stepping bricks & stylized puffy sky clouds
  const obbyColors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#a855f7'];
  obbyColors.forEach((col, i) => {
    addBrick(
      root,
      1.6,
      0.34,
      1.6,
      -5.5 + i * 2.1,
      0.24 + i * 0.28,
      -8.8,
      col,
      studTextures,
      1.5,
    );
  });

  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.9,
    metalness: 0,
  });
  for (const [cx, cy, cz, cs] of [
    [-12, 3.2, -13, 1.2],
    [11, 4.4, -14, 1.4],
    [0, 5.2, -17, 1.6],
  ]) {
    const cloud = new THREE.Group();
    cloud.position.set(cx, cy, cz);
    cloud.scale.setScalar(cs);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.8), cloudMat);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 1.5), cloudMat);
    c2.position.set(0.4, 0.65, 0);
    cloud.add(c1, c2);
    root.add(cloud);
  }

  return root;
}

function buildLunarOutpostEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const mapDef = getBuiltInMapByEnv('lunarOutpost');
  const root = buildCustomMapEnvironment(mapDef, maxAnisotropy, studTextures);

  // Orbital landing pad ring at stage center
  const padMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.45, metalness: 0.3 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.16, 24), padMat);
  pad.position.set(0, 0.08, 0);
  pad.receiveShadow = true;
  root.add(pad);

  const ringMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#38bdf8',
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });
  const glowRing = new THREE.Mesh(new THREE.RingGeometry(3.25, 3.45, 32), ringMat);
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.set(0, 0.17, 0);
  root.add(glowRing);

  return root;
}

function buildDojoCourtyardEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const mapDef = getBuiltInMapByEnv('dojoCourtyard');
  const root = buildCustomMapEnvironment(mapDef, maxAnisotropy, studTextures);

  // Raised timber sparring deck at center
  addBrick(root, 6.8, 0.14, 4.8, 0, 0.07, 0.2, '#8a5a36', studTextures, 1.4, false);

  // Warm paper-style stone lanterns flanking the deck
  const glowMat = new THREE.MeshStandardMaterial({
    color: '#fef3c7',
    emissive: '#f59e0b',
    emissiveIntensity: 1.0,
    roughness: 0.25,
  });
  for (const lx of [-4.2, 4.2]) {
    addBrick(root, 0.75, 0.3, 0.75, lx, 0.15, -2.5, '#78716c', studTextures);
    addBrick(root, 0.42, 0.9, 0.42, lx, 0.75, -2.5, '#a8a29e', studTextures);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), glowMat);
    lantern.position.set(lx, 1.42, -2.5);
    root.add(lantern);
    addBrick(root, 0.85, 0.24, 0.85, lx, 1.76, -2.5, '#57534e', studTextures);
  }

  return root;
}

function buildRobloxianTownEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const mapDef = getBuiltInMapByEnv('robloxianTown');
  const root = buildCustomMapEnvironment(mapDef, maxAnisotropy, studTextures);

  // Curb mailboxes by the residential houses
  for (const [mx, mz, boxCol] of [
    [-6.6, -1.2, '#0d69ac'],
    [1.4, -1.2, '#c4281c'],
  ] as [number, number, string][]) {
    const mb = buildMailboxGroup(boxCol, '#f5cd30', studTextures);
    mb.position.set(mx, 0, mz);
    root.add(mb);
  }

  // Shaded sidewalk bench along the west residential block
  const bench = buildExtendedStagePropGroup('bench', '#a66b3c', '#1b2a35', studTextures);
  bench.position.set(-4.2, 0, 5.7);
  bench.rotation.y = Math.PI;
  root.add(bench);

  return root;
}

function buildCozyBedroomEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const mapDef = getBuiltInMapByEnv('cozyBedroom');
  const root = buildCustomMapEnvironment(mapDef, maxAnisotropy, studTextures);

  // Full-scale R6 Nightstand between Bed and Night Skyline Window (-4.2, 0, -8.25)
  const nsX = -4.2;
  const nsZ = -8.25;
  addBrick(root, 1.05, 0.94, 0.92, nsX, 0.47, nsZ, '#5c3a21', studTextures, 1.4);
  addBrick(root, 1.12, 0.08, 0.98, nsX, 0.96, nsZ, '#6b4226', studTextures, 1.4);
  const drawer = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.3, 0.06),
    createPlasticBrickMaterial('#4a2e1a', { roughness: 0.6 }),
  );
  drawer.position.set(nsX, 0.66, nsZ + 0.46);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    createPlasticBrickMaterial('#f5cd30', { roughness: 0.25, metalness: 0.7 }),
  );
  knob.position.set(nsX, 0.66, nsZ + 0.51);
  root.add(drawer, knob);

  // Warm Glowing Bedside Lamp (y = 1.0..1.72)
  const lampX = nsX - 0.24;
  const lampZ = nsZ - 0.12;
  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.24, 14),
    createPlasticBrickMaterial('#e2e8f0', { roughness: 0.35, metalness: 0.25 }),
  );
  lampBase.position.set(lampX, 1.12, lampZ);
  lampBase.castShadow = true;
  const lampNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.16, 10),
    createPlasticBrickMaterial('#f5cd30', { roughness: 0.3, metalness: 0.65 }),
  );
  lampNeck.position.set(lampX, 1.3, lampZ);
  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.32, 0.36, 14),
    new THREE.MeshStandardMaterial({
      color: '#fde68a',
      emissive: '#f59e0b',
      emissiveIntensity: 0.95,
      roughness: 0.32,
    }),
  );
  lampShade.position.set(lampX, 1.54, lampZ);
  lampShade.castShadow = true;
  root.add(lampBase, lampNeck, lampShade);

  // Bedside Snack Tray (plate + slice + coaster & cocoa mug)
  const trayX = nsX + 0.24;
  const trayZ = nsZ + 0.16;
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.03, 0.38),
    createPlasticBrickMaterial('#334155', { roughness: 0.4, metalness: 0.2 }),
  );
  tray.position.set(trayX, 1.015, trayZ);
  const snackSlice = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.2, 3),
    createPlasticBrickMaterial('#f59e0b', { roughness: 0.6 }),
  );
  snackSlice.rotation.x = Math.PI / 2;
  snackSlice.rotation.z = 0.4;
  snackSlice.scale.set(1, 1, 0.25);
  snackSlice.position.set(trayX - 0.09, 1.055, trayZ);
  const snackMug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.07, 0.14, 12),
    createPlasticBrickMaterial('#ef4444', { roughness: 0.36 }),
  );
  snackMug.position.set(trayX + 0.11, 1.1, trayZ - 0.05);
  root.add(tray, snackSlice, snackMug);

  // Multi-part Sculpted Gaming Beanbag / Pouf beside Bookshelf & TV Corner (-5.5, 0, 3.9)
  const beanbag = new THREE.Group();
  beanbag.position.set(-5.5, 0, 3.9);
  const beanMat = createPlasticBrickMaterial('#7c3aed', { roughness: 0.82 });
  const beanAccentMat = createPlasticBrickMaterial('#5b21b6', { roughness: 0.78 });
  const bbBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.26, 18), beanAccentMat);
  bbBase.position.y = 0.13;
  const bbCushion = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.69, 0.32, 18), beanMat);
  bbCushion.position.y = 0.42;
  const bbTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 0.12, 18), beanMat);
  bbTop.position.y = 0.62;
  const bbBack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.42, 0.28), beanAccentMat);
  bbBack.position.set(-0.22, 0.64, 0.32);
  bbBack.rotation.set(-0.22, 0.45, 0);
  for (const part of [bbBase, bbCushion, bbTop, bbBack]) {
    part.castShadow = true;
    part.receiveShadow = true;
    beanbag.add(part);
  }
  root.add(beanbag);

  return root;
}

function buildRobloxCityEnvironment(
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const mapDef = getBuiltInMapByEnv('robloxCity');
  const root = buildCustomMapEnvironment(mapDef, maxAnisotropy, studTextures);

  // Parked downtown cars (Yellow Taxi, Cobalt Sedan, Crimson Coupe) & City Transit Bus along multi-lane avenues
  const streetVehicles: {
    kind: 'parkedSedan' | 'sightseeingBus';
    pos: [number, number, number];
    rotY: number;
    primary: string;
    accent: string;
  }[] = [
    {
      kind: 'parkedSedan',
      pos: [3.6, 0.05, -14.5],
      rotY: Math.PI,
      primary: '#facc15',
      accent: '#18181b',
    },
    {
      kind: 'parkedSedan',
      pos: [-3.6, 0.05, 16.5],
      rotY: 0,
      primary: '#2563eb',
      accent: '#e2e8f0',
    },
    {
      kind: 'parkedSedan',
      pos: [16.5, 0.05, -3.6],
      rotY: -Math.PI / 2,
      primary: '#dc2626',
      accent: '#f8fafc',
    },
    {
      kind: 'sightseeingBus',
      pos: [-18.5, 0.05, 3.6],
      rotY: Math.PI / 2,
      primary: '#0284c7',
      accent: '#f8fafc',
    },
  ];

  for (const veh of streetVehicles) {
    const vGroup = buildIdiomPropGroup(veh.kind, veh.primary, veh.accent, studTextures);
    vGroup.position.set(veh.pos[0], veh.pos[1], veh.pos[2]);
    vGroup.rotation.y = veh.rotY;
    root.add(vGroup);
  }

  // Park benches flanking the Central Plaza Fountain
  const parkBenches: [number, number, number][] = [
    [16.5, 12.6, 0],
    [16.5, 20.4, Math.PI],
    [12.6, 16.5, Math.PI / 2],
  ];
  for (const [bx, bz, bry] of parkBenches) {
    const bench = buildExtendedStagePropGroup('bench', '#92400e', '#1e293b', studTextures);
    bench.position.set(bx, 0.28, bz);
    bench.rotation.y = bry;
    root.add(bench);
  }

  return root;
}

export function buildRobloxEnvironmentGroup(
  env: EnvironmentId,
  maxAnisotropy: number,
  studTextures: StudTexturePair,
  customMap?: MapDefinition,
  selectedModuleId?: string | null,
): THREE.Group {
  if (env === 'custom' && customMap) {
    return buildCustomMapEnvironment(
      customMap,
      maxAnisotropy,
      studTextures,
      selectedModuleId,
    );
  }
  switch (env) {
    case 'town':
      return buildTownEnvironment(studTextures, maxAnisotropy);
    case 'robloxianTown':
      return buildRobloxianTownEnvironment(studTextures, maxAnisotropy);
    case 'robloxCity':
      return buildRobloxCityEnvironment(studTextures, maxAnisotropy);
    case 'cozyBedroom':
      return buildCozyBedroomEnvironment(studTextures, maxAnisotropy);
    case 'skyObby':
      return buildSkyObbyEnvironment(studTextures, maxAnisotropy);
    case 'lunarOutpost':
      return buildLunarOutpostEnvironment(studTextures, maxAnisotropy);
    case 'dojoCourtyard':
      return buildDojoCourtyardEnvironment(studTextures, maxAnisotropy);
    case 'crossroads':
    default:
      return buildCrossroadsEnvironment(studTextures, maxAnisotropy);
  }
}

export function buildRobloxPropGroup(
  propKind: PropKind,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  shadowTex: THREE.CanvasTexture,
  maxAnisotropy: number,
  propItemId?: ItemId,
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
    case 'chest':
    case 'barrel':
    case 'flag':
    case 'bench':
    case 'targetDummy':
    case 'campfire':
    case 'pedestal':
    case 'lanternPost': {
      const extended = buildExtendedStagePropGroup(
        propKind,
        primaryColor,
        accentColor,
        studTextures,
      );
      root.add(extended);
      break;
    }
    case 'gamerBed': {
      root.add(buildGamerBedGroup(primaryColor, accentColor, studTextures));
      break;
    }
    case 'pcDesk': {
      root.add(buildPcDeskGroup(primaryColor, accentColor, studTextures, maxAnisotropy));
      break;
    }
    case 'areaRug': {
      root.add(buildAreaRugGroup(primaryColor, accentColor, studTextures));
      break;
    }
    case 'bookshelf': {
      root.add(buildBookshelfGroup(primaryColor, accentColor, studTextures));
      break;
    }
    case 'suburbanHouse': {
      root.add(buildSuburbanHouseGroup(primaryColor, accentColor, studTextures));
      break;
    }
    case 'picketFence': {
      root.add(buildPicketFenceGroup(primaryColor, accentColor, studTextures));
      break;
    }
    case 'streetLamp': {
      root.add(buildStreetLampGroup(primaryColor, accentColor, studTextures));
      break;
    }
    case 'mailbox': {
      root.add(buildMailboxGroup(primaryColor, accentColor, studTextures));
      break;
    }
    case 'heldItem': {
      const itemGroup = buildGroundedItemPropGroup(
        propItemId ?? 'linkedSword',
        primaryColor,
        accentColor,
        studTextures,
      );
      root.add(itemGroup);
      break;
    }
    case 'rainingCatsDogs':
    case 'steelUmbrella':
    case 'beanWaterfall':
    case 'africanElephant':
    case 'iceFeet':
    case 'plasterCast':
    case 'stretcher':
    case 'clydesdalePlatter':
    case 'flyingPigs':
    case 'grocerySpill':
    case 'parkedSedan':
    case 'sightseeingBus':
    case 'ambulance': {
      if (propKind === 'rainingCatsDogs' || propKind === 'flyingPigs') {
        shadowDisc.visible = false;
      } else if (
        propKind === 'africanElephant' ||
        propKind === 'clydesdalePlatter' ||
        propKind === 'parkedSedan' ||
        propKind === 'sightseeingBus' ||
        propKind === 'ambulance'
      ) {
        shadowDisc.scale.set(2.2, 2.2, 1);
      }
      root.add(
        buildIdiomPropGroup(
          propKind as IdiomPropKind,
          primaryColor,
          accentColor,
          studTextures,
        ),
      );
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
