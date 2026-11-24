import * as THREE from 'three';
import {
  createBoardroomLaptopTexture,
  createCafeMenuTexture,
  createDinerNeonSignTexture,
  createPlasticBrickMaterial,
  createStainedGlassTexture,
  createStudBrickMaterial,
  createTheaterPlaybillTexture,
  createTourBusBannerTexture,
  createVerbatimSignTexture,
  StudTexturePair,
} from './robloxTextures';

export type IdiomMapModuleKind =
  | 'verbatimSign'
  | 'cafeCounter'
  | 'boardroomSuite'
  | 'weddingAltar'
  | 'theaterWings'
  | 'retroDiner'
  | 'mainStreetSet';

export type IdiomPropKind =
  | 'rainingCatsDogs'
  | 'steelUmbrella'
  | 'beanWaterfall'
  | 'africanElephant'
  | 'iceFeet'
  | 'plasterCast'
  | 'stretcher'
  | 'clydesdalePlatter'
  | 'flyingPigs'
  | 'grocerySpill'
  | 'parkedSedan'
  | 'sightseeingBus';

function addBrick(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  studTextures: StudTexturePair,
  studDensity = 1.5,
  roughness = 0.48,
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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function setShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

// =========================================================================
// 7 Bespoke Map Set Modules for The Idiom Town
// =========================================================================

export function buildIdiomMapModuleGroup(
  kind: IdiomMapModuleKind,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();

  switch (kind) {
    case 'verbatimSign': {
      const woodMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.78 });
      const stoneMat = createStudBrickMaterial('#94a3b8', studTextures, 2, 2, {
        roughness: 0.68,
      });
      const signTex = createVerbatimSignTexture(maxAnisotropy);
      const signFaceMat = new THREE.MeshStandardMaterial({
        map: signTex,
        roughness: 0.48,
      });

      // Stone planter base & wooden posts
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 1.3), stoneMat);
      plinth.position.set(0, 0.225, 0);
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.8, 10), woodMat);
      postL.position.set(-2.2, 2.1, 0);
      const postR = postL.clone();
      postR.position.x = 2.2;

      const board = new THREE.Mesh(
        new THREE.BoxGeometry(4.9, 2.2, 0.26),
        [woodMat, woodMat, woodMat, woodMat, signFaceMat, signFaceMat],
      );
      board.position.set(0, 2.95, 0);

      // Pitched shingle cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.26, 0.56), woodMat);
      cap.position.set(0, 4.18, 0);

      // Flower boxes flanking the welcome sign
      const petalMat = createPlasticBrickMaterial(accentColor, { roughness: 0.55 });
      const leafMat = createPlasticBrickMaterial('#22c55e', { roughness: 0.72 });
      for (const fx of [-2.0, 2.0]) {
        const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), leafMat);
        shrub.position.set(fx, 0.72, 0.42);
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), petalMat);
        bloom.position.set(fx, 1.05, 0.46);
        group.add(shrub, bloom);
      }

      group.add(plinth, postL, postR, board, cap);
      break;
    }

    case 'cafeCounter': {
      const oakMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.65 });
      const creamMat = createPlasticBrickMaterial('#fef3c7', { roughness: 0.42 });
      const espressoSteel = createPlasticBrickMaterial('#cbd5e1', {
        roughness: 0.2,
        metalness: 0.78,
      });
      const menuTex = createCafeMenuTexture(maxAnisotropy);
      const menuMat = new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.52 });

      // Back café wall + menu chalkboard
      addBrick(group, 11.5, 4.8, 0.45, 0, 2.4, -3.4, '#78350f', studTextures, 1.2, 0.68);
      const menuBoard = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.1, 0.14), menuMat);
      menuBoard.position.set(-2.2, 3.05, -3.12);

      // Service bar counter (right-back)
      addBrick(group, 4.6, 1.12, 1.2, 2.6, 0.56, -1.6, primaryColor, studTextures, 1.3, 0.58);
      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 1.36), creamMat);
      counterTop.position.set(2.6, 1.18, -1.6);

      // Espresso machine on counter
      const espBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.62), espressoSteel);
      espBody.position.set(2.9, 1.61, -1.7);
      const espHopper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.34, 10), espressoSteel);
      espHopper.position.set(2.9, 2.12, -1.7);

      // Cozy red vinyl corner booth (left-center, seated characters at x=-1.9 & -0.45)
      const boothMat = createPlasticBrickMaterial(accentColor, { roughness: 0.52 });
      const benchL = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 2.2), boothMat);
      benchL.position.set(-2.35, 0.31, 0.2);
      const benchLBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.35, 2.2), boothMat);
      benchLBack.position.set(-2.82, 0.72, 0.2);
      const benchR = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 2.2), boothMat);
      benchR.position.set(0.15, 0.31, 0.2);
      const benchRBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.35, 2.2), boothMat);
      benchRBack.position.set(0.62, 0.72, 0.2);

      // Café bistro table between booth benches + 2 latte mugs
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 1.85), oakMat);
      tableTop.position.set(-1.1, 1.06, 0.2);
      const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.02, 10), espressoSteel);
      tableLeg.position.set(-1.1, 0.51, 0.2);

      for (const [mx, mz] of [
        [-1.38, 0.32],
        [-0.82, 0.12],
      ]) {
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.2, 12), creamMat);
        mug.position.set(mx, 1.21, mz);
        const latte = new THREE.Mesh(
          new THREE.CylinderGeometry(0.105, 0.105, 0.03, 12),
          createPlasticBrickMaterial('#d97706', { roughness: 0.35 }),
        );
        latte.position.set(mx, 1.3, mz);
        group.add(mug, latte);
      }

      group.add(
        menuBoard,
        counterTop,
        espBody,
        espHopper,
        benchL,
        benchLBack,
        benchR,
        benchRBack,
        tableTop,
        tableLeg,
      );
      break;
    }

    case 'boardroomSuite': {
      const mahoganyMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.32,
        metalness: 0.12,
      });
      const chromeMat = createPlasticBrickMaterial('#cbd5e1', {
        roughness: 0.18,
        metalness: 0.85,
      });
      const leatherMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.62 });
      const laptopTex = createBoardroomLaptopTexture(maxAnisotropy);
      const screenMat = new THREE.MeshStandardMaterial({
        map: laptopTex,
        emissive: '#1e3a8a',
        emissiveIntensity: 0.45,
        roughness: 0.22,
      });

      // Corporate glass/slate back wall
      addBrick(group, 14, 5.0, 0.4, 0, 2.5, -4.5, '#334155', studTextures, 1.2, 0.45);
      const presentationScreen = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 2.4, 0.12),
        new THREE.MeshStandardMaterial({
          map: laptopTex,
          emissive: '#0ea5e9',
          emissiveIntensity: 0.25,
          roughness: 0.24,
        }),
      );
      presentationScreen.position.set(0, 2.95, -4.22);
      group.add(presentationScreen);

      // Long mahogany conference table (y = 1.12 surface)
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.16, 2.9), mahoganyMat);
      tableTop.position.set(0, 1.08, 0);
      for (const lx of [-2.8, 2.8]) {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.0, 12), chromeMat);
        ped.position.set(lx, 0.5, 0);
        group.add(ped);
      }

      // 6 Stiff executive chairs + open glowing laptops along both sides
      const seatXs = [-2.5, 0, 2.5];
      for (const sx of seatXs) {
        for (const side of [-1, 1]) {
          const cz = side * 1.95;
          const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.85), leatherMat);
          chairSeat.position.set(sx, 0.62, cz);
          const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.14), leatherMat);
          chairBack.position.set(sx, 1.18, cz + side * 0.36);
          const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.58, 8), chromeMat);
          chairStem.position.set(sx, 0.29, cz);

          // Laptop on table in front of seat
          const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.44), chromeMat);
          lBase.position.set(sx, 1.18, side * 0.96);
          const lLid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.04), screenMat);
          lLid.position.set(sx, 1.38, side * 0.76);
          lLid.rotation.x = side * -0.22;

          group.add(chairSeat, chairBack, chairStem, lBase, lLid);
        }
      }

      group.add(tableTop);
      break;
    }

    case 'weddingAltar': {
      const marbleMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.28 });
      const goldMat = createPlasticBrickMaterial('#facc15', {
        roughness: 0.22,
        metalness: 0.72,
      });
      const carpetMat = createPlasticBrickMaterial(accentColor, { roughness: 0.85 });
      const woodMat = createPlasticBrickMaterial('#78350f', { roughness: 0.65 });
      const glassTex = createStainedGlassTexture(maxAnisotropy);
      const stainedMat = new THREE.MeshStandardMaterial({
        map: glassTex,
        emissive: '#fef3c7',
        emissiveIntensity: 0.5,
        roughness: 0.2,
      });

      // Red aisle carpet runner + altar steps
      const runner = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 11.5), carpetMat);
      runner.position.set(0, 0.025, 2.2);
      const dais = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.32, 3.6), marbleMat);
      dais.position.set(0, 0.16, -2.6);

      // Church back wall + 3 stained glass arch windows
      addBrick(group, 13.5, 6.2, 0.5, 0, 3.1, -5.2, primaryColor, studTextures, 1.1, 0.6);
      for (const wx of [-3.4, 0, 3.4]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 0.18), stainedMat);
        win.position.set(wx, 3.5, -4.92);
        group.add(win);
      }

      // Floral wedding arch
      const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 3.6, 12), marbleMat);
      colL.position.set(-2.35, 1.95, -2.8);
      const colR = colL.clone();
      colR.position.x = 2.35;
      const archRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.35, 0.2, 10, 24, Math.PI),
        goldMat,
      );
      archRing.position.set(0, 3.7, -2.8);

      // Pews flanking the aisle
      for (const pz of [0.8, 3.0, 5.2]) {
        for (const px of [-3.2, 3.2]) {
          const pew = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 0.72), woodMat);
          pew.position.set(px, 0.425, pz);
          group.add(pew);
        }
      }

      group.add(runner, dais, colL, colR, archRing);
      break;
    }

    case 'theaterWings': {
      const stageWood = createPlasticBrickMaterial('#291d18', { roughness: 0.76 });
      const curtainMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.88 });
      const trussMat = createPlasticBrickMaterial('#475569', {
        roughness: 0.35,
        metalness: 0.75,
      });
      const playbillTex = createTheaterPlaybillTexture(maxAnisotropy);
      const posterMat = new THREE.MeshStandardMaterial({ map: playbillTex, roughness: 0.48 });

      // Backstage floor deck
      const deck = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.14, 10.5), stageWood);
      deck.position.set(0, 0.07, 0);

      // Velvet wing curtains left & right
      for (const cx of [-4.6, -3.5, 3.5, 4.6]) {
        for (const cz of [-2.4, 0.6]) {
          const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 5.4, 10), curtainMat);
          drape.position.set(cx, 2.7, cz);
          group.add(drape);
        }
      }

      // Back brick wall + Shakespeare playbill poster + overhead lighting truss
      addBrick(group, 12.8, 5.6, 0.45, 0, 2.8, -4.6, '#1e293b', studTextures, 1.2, 0.72);
      const poster = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.55, 0.1), posterMat);
      poster.position.set(-2.4, 2.8, -4.32);

      const trussBeam = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.34, 0.34), trussMat);
      trussBeam.position.set(0, 5.1, -1.2);
      const spotCan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.56, 10), trussMat);
      spotCan.position.set(0, 4.8, -1.2);
      spotCan.rotation.x = 0.55;
      const spotLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.06, 10),
        new THREE.MeshStandardMaterial({
          color: accentColor,
          emissive: accentColor,
          emissiveIntensity: 1.5,
          roughness: 0.15,
        }),
      );
      spotLens.position.set(0, 4.58, -1.04);
      spotLens.rotation.x = 0.55;

      // Wooden prop crates in shadow wing
      addBrick(group, 1.2, 1.1, 1.2, 3.6, 0.55, -3.2, '#7c4a2d', studTextures, 1.4);

      group.add(deck, poster, trussBeam, spotCan, spotLens);
      break;
    }

    case 'retroDiner': {
      const chromeMat = createPlasticBrickMaterial('#e2e8f0', {
        roughness: 0.16,
        metalness: 0.85,
      });
      const vinylMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.42 });
      const tealMat = createPlasticBrickMaterial(accentColor, { roughness: 0.45 });
      const neonTex = createDinerNeonSignTexture(maxAnisotropy);
      const neonMat = new THREE.MeshStandardMaterial({
        map: neonTex,
        emissive: '#ef4444',
        emissiveIntensity: 0.28,
        roughness: 0.28,
      });

      // Retro black/white checkerboard strip floor
      for (let ix = -4; ix <= 4; ix++) {
        for (let iz = -3; iz <= 3; iz++) {
          const tileColor = (ix + iz) % 2 === 0 ? '#f8fafc' : '#18181b';
          const tile = new THREE.Mesh(
            new THREE.BoxGeometry(1.48, 0.04, 1.48),
            createPlasticBrickMaterial(tileColor, { roughness: 0.28 }),
          );
          tile.position.set(ix * 1.5, 0.02, iz * 1.5);
          tile.receiveShadow = true;
          group.add(tile);
        }
      }

      // Diner back wall + swinging kitchen double doors + neon sign
      addBrick(group, 5.4, 5.2, 0.45, -4.8, 2.6, -4.4, '#e2e8f0', studTextures, 1.2);
      addBrick(group, 5.4, 5.2, 0.45, 4.8, 2.6, -4.4, '#e2e8f0', studTextures, 1.2);
      addBrick(group, 4.4, 1.6, 0.45, 0, 4.4, -4.4, '#e2e8f0', studTextures, 1.2);

      // Swinging kitchen double doors (slightly burst open!)
      for (const side of [-1, 1]) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.85, 3.2, 0.12), chromeMat);
        door.position.set(side * 1.15, 1.65, -3.9);
        door.rotation.y = side * -0.58;
        const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 12), tealMat);
        porthole.rotation.x = Math.PI / 2;
        porthole.position.set(side * 1.15, 2.25, -3.9);
        group.add(door, porthole);
      }

      const neonSign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.75, 0.18), neonMat);
      neonSign.position.set(0, 4.5, -4.08);

      // Red vinyl diner booth on left (-2.8, 0, 0.8) where Tourist sits
      const boothBench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 2.3), vinylMat);
      boothBench.position.set(-3.8, 0.325, 0.8);
      const boothBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.45, 2.3), vinylMat);
      boothBack.position.set(-4.35, 0.75, 0.8);
      const dinerTable = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 2.1), chromeMat);
      dinerTable.position.set(-2.45, 1.08, 0.8);
      const tablePost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.02, 10), chromeMat);
      tablePost.position.set(-2.45, 0.51, 0.8);

      // Bar stools & counter on right
      addBrick(group, 4.0, 1.15, 1.1, 4.4, 0.575, -1.4, tealMat ? accentColor : '#0ea5e9', studTextures);
      for (const sx of [3.1, 4.3, 5.5]) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 14), vinylMat);
        stool.position.set(sx, 0.82, -0.3);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.78, 10), chromeMat);
        leg.position.set(sx, 0.39, -0.3);
        group.add(stool, leg);
      }

      group.add(neonSign, boothBench, boothBack, dinerTable, tablePost);
      break;
    }

    case 'mainStreetSet': {
      const facadeColors = ['#dc2626', '#2563eb', '#d97706'];
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        roughness: 0.14,
        metalness: 0.25,
      });

      // Row of 3 classic Main Street brick storefronts behind the sidewalk
      facadeColors.forEach((col, i) => {
        const bx = (i - 1) * 6.2;
        addBrick(group, 5.6, 5.2, 4.2, bx, 2.6, -4.6, col, studTextures, 1.1, 0.55);
        addBrick(group, 6.0, 0.42, 4.6, bx, 5.4, -4.6, '#1e293b', studTextures, 1.2);
        // Striped storefront awning
        addBrick(group, 4.4, 0.22, 1.4, bx, 2.45, -1.9, accentColor, studTextures, 1.2);
        // Shop display windows
        const win = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.5, 0.16), glassMat);
        win.position.set(bx, 1.35, -2.44);
        group.add(win);
      });

      // Bus stop shelter sign
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.9, 10),
        createPlasticBrickMaterial('#475569', { roughness: 0.32, metalness: 0.7 }),
      );
      pole.position.set(-4.2, 1.45, 0.75);
      const busPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.75, 0.1),
        createPlasticBrickMaterial('#0ea5e9', { roughness: 0.35 }),
      );
      busPlate.position.set(-4.2, 2.65, 0.75);
      group.add(pole, busPlate);
      break;
    }
  }

  setShadows(group, true, true);
  return group;
}

// =========================================================================
// Composite Animals, Gag Props & Vehicles for The Idiom Town
// =========================================================================

function buildGoldenRetrieverMesh(furColor = '#eab308'): THREE.Group {
  const dog = new THREE.Group();
  const centerWrap = new THREE.Group();
  // Shift down by pawHeight (0.34) so local origin (0,0,0) is torso center of mass for clean 3D tumbling
  centerWrap.position.y = -0.34;
  dog.add(centerWrap);

  const furMat = createPlasticBrickMaterial(furColor, { roughness: 0.75 });
  const earMat = createPlasticBrickMaterial('#ca8a04', { roughness: 0.78 });
  const noseMat = createPlasticBrickMaterial('#18181b', { roughness: 0.3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.82), furMat);
  body.position.y = 0.42;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.38), furMat);
  head.position.set(0, 0.66, 0.42);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), furMat);
  snout.position.set(0, 0.6, 0.64);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.06), noseMat);
  nose.position.set(0, 0.65, 0.76);
  for (const ex of [-0.21, 0.21]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.16), earMat);
    ear.position.set(ex, 0.66, 0.4);
    ear.rotation.z = ex > 0 ? -0.18 : 0.18;
    centerWrap.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.36), furMat);
  tail.position.set(0, 0.56, -0.5);
  tail.rotation.x = 0.55;
  for (const [lx, lz] of [
    [-0.14, 0.26],
    [0.14, 0.26],
    [-0.14, -0.26],
    [0.14, -0.26],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), furMat);
    leg.position.set(lx, 0.14, lz);
    centerWrap.add(leg);
  }
  centerWrap.add(body, head, snout, nose, tail);
  return dog;
}

function buildTabbyCatMesh(furColor = '#f97316'): THREE.Group {
  const cat = new THREE.Group();
  const centerWrap = new THREE.Group();
  // Shift down by pawHeight (0.24) so local origin (0,0,0) is torso center of mass
  centerWrap.position.y = -0.24;
  cat.add(centerWrap);

  const furMat = createPlasticBrickMaterial(furColor, { roughness: 0.72 });
  const stripeMat = createPlasticBrickMaterial('#7c2d12', { roughness: 0.75 });
  const eyeMat = createPlasticBrickMaterial('#bef264', { roughness: 0.25 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.58), furMat);
  body.position.y = 0.3;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.12), stripeMat);
  stripe.position.set(0, 0.39, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.26), furMat);
  head.position.set(0, 0.48, 0.3);
  for (const ex of [-0.09, 0.09]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), stripeMat);
    ear.position.set(ex, 0.65, 0.3);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), eyeMat);
    eye.position.set(ex * 0.7, 0.5, 0.43);
    centerWrap.add(ear, eye);
  }
  for (const [lx, lz] of [
    [-0.1, 0.18],
    [0.1, 0.18],
    [-0.1, -0.18],
    [0.1, -0.18],
  ]) {
    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), furMat);
    paw.position.set(lx, 0.1, lz);
    centerWrap.add(paw);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.44, 8), stripeMat);
  tail.position.set(0, 0.48, -0.34);
  tail.rotation.x = -0.35;
  centerWrap.add(body, stripe, head, tail);
  return cat;
}

interface FallingPetSpec {
  id: number;
  isDog: boolean;
  furColor: string;
  spawnX: number;
  spawnZ: number;
  windVx: number;
  windVz: number;
  startTime: number;
  period: number;
  spinX: number;
  spinZ: number;
  yaw: number;
}

const FALLING_PET_SPECS: FallingPetSpec[] = [
  // Direct street drop while characters look at clouds & bend down
  { id: 0, isDog: true, furColor: '#eab308', spawnX: -1.15, spawnZ: 0.35, windVx: -0.18, windVz: 0.12, startTime: 3.50, period: 4.5, spinX: 3.8, spinZ: 2.1, yaw: 0.4 },
  // Hits Umbrella 1 dome at t ≈ 5.73s (and 10.33s)
  { id: 1, isDog: false, furColor: '#f97316', spawnX: 0.44, spawnZ: 1.98, windVx: -0.02, windVz: 0.08, startTime: 4.82, period: 4.6, spinX: -4.4, spinZ: 3.2, yaw: -0.5 },
  // Hits Umbrella 2 dome at t ≈ 6.35s (and 11.15s)
  { id: 2, isDog: true, furColor: '#d97706', spawnX: -1.84, spawnZ: 2.52, windVx: -0.04, windVz: 0.06, startTime: 5.45, period: 4.8, spinX: 4.6, spinZ: -2.8, yaw: -0.9 },
  // Direct street drop left foreground
  { id: 3, isDog: false, furColor: '#fde68a', spawnX: -3.45, spawnZ: 1.45, windVx: -0.22, windVz: 0.15, startTime: 4.10, period: 4.4, spinX: -3.5, spinZ: -2.5, yaw: 0.8 },
  // Hits Umbrella 1 dome at t ≈ 7.35s
  { id: 4, isDog: true, furColor: '#b45309', spawnX: -0.26, spawnZ: 2.58, windVx: 0.02, windVz: -0.04, startTime: 6.45, period: 4.6, spinX: 5.1, spinZ: 2.9, yaw: 0.2 },
  // Hits Umbrella 2 dome at t ≈ 7.75s
  { id: 5, isDog: false, furColor: '#475569', spawnX: -2.54, spawnZ: 3.08, windVx: -0.04, windVz: 0.04, startTime: 6.85, period: 4.7, spinX: -4.8, spinZ: -3.1, yaw: -0.3 },
  // Direct street drop right side
  { id: 6, isDog: true, furColor: '#f59e0b', spawnX: 1.92, spawnZ: 1.15, windVx: 0.25, windVz: 0.14, startTime: 5.15, period: 4.3, spinX: 4.1, spinZ: -3.4, yaw: 1.1 },
  // Hits Umbrella 1 dome at t ≈ 8.80s
  { id: 7, isDog: false, furColor: '#ea580c', spawnX: 0.36, spawnZ: 2.66, windVx: 0.03, windVz: 0.02, startTime: 7.90, period: 4.5, spinX: 5.3, spinZ: -3.6, yaw: -0.7 },
  // Hits Umbrella 2 dome at t ≈ 9.35s
  { id: 8, isDog: true, furColor: '#eab308', spawnX: -2.02, spawnZ: 3.16, windVx: 0.04, windVz: 0.05, startTime: 8.45, period: 4.6, spinX: -4.2, spinZ: 3.9, yaw: 0.6 },
];

const UMBRELLA_DOMES = [
  { x: 0.08, y: 3.18, z: 2.30, radius: 1.06 },
  { x: -2.22, y: 3.18, z: 2.84, radius: 1.06 },
];

function evaluateFallingPetPhysics(
  spec: FallingPetSpec,
  time: number,
): {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
} {
  if (time < spec.startTime) {
    return {
      visible: false,
      x: spec.spawnX,
      y: 11,
      z: spec.spawnZ,
      rotX: 0,
      rotY: spec.yaw,
      rotZ: 0,
      scaleX: 0.001,
      scaleY: 0.001,
      scaleZ: 0.001,
    };
  }

  const elapsed = time - spec.startTime;
  const cycleIndex = Math.floor(elapsed / spec.period);
  const tau = elapsed - cycleIndex * spec.period;
  const cycleStartAbs = spec.startTime + cycleIndex * spec.period;

  const g = 14.8;
  const y0 = 10.2;
  const vy0 = -0.8;
  const pawH = spec.isDog ? 0.34 : 0.24;

  // Check if pet intersects either raised steel umbrella dome (active from t = 5.20s onward)
  const domeTargetY = 3.18 + pawH * 0.6;
  const discDome = vy0 * vy0 - 4 * (-0.5 * g) * (y0 - domeTargetY);
  const tDome = (-vy0 + Math.sqrt(Math.max(0, discDome))) / g; // positive fall root (~0.90s)
  const domeAbsTime = cycleStartAbs + tDome;
  const hitCandidateX = spec.spawnX + spec.windVx * tDome;
  const hitCandidateZ = spec.spawnZ + spec.windVz * tDome;

  let hitDome: (typeof UMBRELLA_DOMES)[number] | null = null;
  if (domeAbsTime >= 5.2) {
    for (const d of UMBRELLA_DOMES) {
      const dist = Math.hypot(hitCandidateX - d.x, hitCandidateZ - d.z);
      if (dist <= d.radius) {
        hitDome = d;
        break;
      }
    }
  }

  let x = spec.spawnX;
  let y = y0;
  let z = spec.spawnZ;
  let rotX = 0;
  let rotY = spec.yaw;
  let rotZ = 0;
  let scaleX = 1;
  let scaleY = 1;
  let scaleZ = 1;

  if (hitDome) {
    // Radial outward direction from curved steel dome center
    const dx = hitCandidateX - hitDome.x;
    const dz = hitCandidateZ - hitDome.z;
    const dLen = Math.max(0.08, Math.hypot(dx, dz));
    const nx = dx / dLen;
    const nz = dz / dLen;

    const vyRebound = 4.9;
    const vxRebound = nx * 3.35;
    const vzRebound = nz * 3.35;

    // Solve ground hit time uGround after dome rebound: domeTargetY + vyRebound*u - 0.5*g*u^2 = pawH
    const a = 0.5 * g;
    const b = -vyRebound;
    const c = pawH - domeTargetY;
    const uGround = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a); // ~1.07s
    const tGround = tDome + uGround;

    // Single street restitution bounce after landing
    const vyImpactGround = Math.abs(vyRebound - g * uGround);
    const vyBounce1 = vyImpactGround * 0.36;
    const tBounce1Dur = (2 * vyBounce1) / g; // ~0.53s
    const tSettle = tGround + tBounce1Dur;

    if (tau < tDome) {
      // Phase 1: Gravity drop from storm cloud
      x = spec.spawnX + spec.windVx * tau;
      z = spec.spawnZ + spec.windVz * tau;
      y = y0 + vy0 * tau - 0.5 * g * tau * tau;
      rotX = spec.spinX * tau;
      rotZ = spec.spinZ * tau;
      scaleY = 1 + Math.min(0.14, tau * 0.12);
      scaleX = 1 / Math.sqrt(scaleY);
      scaleZ = scaleX;
    } else if (tau < tGround) {
      // Phase 2: Steel umbrella dome impact squash + radial outward tumble arc
      const u = tau - tDome;
      x = hitCandidateX + vxRebound * u;
      z = hitCandidateZ + vzRebound * u;
      y = domeTargetY + vyRebound * u - 0.5 * g * u * u;
      rotX = spec.spinX * tDome + (spec.spinX * 1.9) * u;
      rotZ = spec.spinZ * tDome + (spec.spinZ * 1.9) * u;
      rotY = Math.atan2(vxRebound, vzRebound);
      if (u < 0.11) {
        const sq = Math.sin((u / 0.11) * Math.PI);
        scaleY = 1 - sq * 0.34;
        scaleX = 1 + sq * 0.22;
        scaleZ = 1 + sq * 0.22;
      }
    } else if (tau < tSettle) {
      // Phase 3: Street impact squash + restitution bounce + decaying roll
      const u = tau - tGround;
      const landX = hitCandidateX + vxRebound * uGround;
      const landZ = hitCandidateZ + vzRebound * uGround;
      x = landX + vxRebound * 0.55 * u;
      z = landZ + vzRebound * 0.55 * u;
      y = pawH + vyBounce1 * u - 0.5 * g * u * u;
      const settleBlend = 1 - Math.min(1, u / tBounce1Dur);
      rotX = (spec.spinX * 0.45) * settleBlend;
      rotZ = (spec.spinZ * 0.45) * settleBlend;
      rotY = Math.atan2(vxRebound, vzRebound);
      if (u < 0.09) {
        const sq = Math.sin((u / 0.09) * Math.PI);
        scaleY = 1 - sq * 0.3;
        scaleX = 1 + sq * 0.2;
        scaleZ = 1 + sq * 0.2;
      }
    } else {
      // Phase 4: Upright scamper away along rebound vector + smooth disappear before wrap
      const u = tau - tSettle;
      const landX = hitCandidateX + vxRebound * uGround;
      const landZ = hitCandidateZ + vzRebound * uGround;
      const baseX = landX + vxRebound * 0.55 * tBounce1Dur;
      const baseZ = landZ + vzRebound * 0.55 * tBounce1Dur;
      const scamperSpeed = 2.8;
      x = baseX + nx * scamperSpeed * u;
      z = baseZ + nz * scamperSpeed * u;
      y = pawH + Math.abs(Math.sin(u * 16)) * 0.14;
      rotX = Math.sin(u * 16) * 0.1;
      rotY = Math.atan2(nx, nz);
      rotZ = 0;
      const fadeStart = Math.max(0.25, spec.period - tSettle - 0.35);
      if (u > fadeStart) {
        const f = Math.max(0.001, 1 - (u - fadeStart) / 0.35);
        scaleX = f;
        scaleY = f;
        scaleZ = f;
      }
    }
  } else {
    // Direct street impact (outside umbrellas or before umbrellas are raised)
    const a = 0.5 * g;
    const b = -vy0;
    const c = pawH - y0;
    const tGround = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a); // ~1.10s
    const vyImpact = Math.abs(vy0 - g * tGround);
    const vyB1 = vyImpact * 0.40;
    const durB1 = (2 * vyB1) / g; // ~0.92s
    const vyB2 = vyB1 * 0.45;
    const durB2 = (2 * vyB2) / g; // ~0.41s
    const tAfterB1 = tGround + durB1;
    const tSettle = tAfterB1 + durB2;
    const skidVx = (spec.windVx >= 0 ? 1 : -1) * 1.45;
    const skidVz = 0.75;

    if (tau < tGround) {
      x = spec.spawnX + spec.windVx * tau;
      z = spec.spawnZ + spec.windVz * tau;
      y = y0 + vy0 * tau - 0.5 * g * tau * tau;
      rotX = spec.spinX * tau;
      rotZ = spec.spinZ * tau;
      scaleY = 1 + Math.min(0.14, tau * 0.12);
      scaleX = 1 / Math.sqrt(scaleY);
      scaleZ = scaleX;
    } else if (tau < tAfterB1) {
      const u = tau - tGround;
      const hitX = spec.spawnX + spec.windVx * tGround;
      const hitZ = spec.spawnZ + spec.windVz * tGround;
      x = hitX + skidVx * u;
      z = hitZ + skidVz * u;
      y = pawH + vyB1 * u - 0.5 * g * u * u;
      const blend = 1 - u / durB1;
      rotX = (spec.spinX * 0.65) * blend;
      rotZ = (spec.spinZ * 0.65) * blend;
      rotY = Math.atan2(skidVx, skidVz);
      if (u < 0.1) {
        const sq = Math.sin((u / 0.1) * Math.PI);
        scaleY = 1 - sq * 0.34;
        scaleX = 1 + sq * 0.24;
        scaleZ = 1 + sq * 0.24;
      }
    } else if (tau < tSettle) {
      const u = tau - tAfterB1;
      const b1X = spec.spawnX + spec.windVx * tGround + skidVx * durB1;
      const b1Z = spec.spawnZ + spec.windVz * tGround + skidVz * durB1;
      x = b1X + skidVx * 0.5 * u;
      z = b1Z + skidVz * 0.5 * u;
      y = pawH + vyB2 * u - 0.5 * g * u * u;
      rotX = 0;
      rotZ = 0;
      rotY = Math.atan2(skidVx, skidVz);
      if (u < 0.07) {
        const sq = Math.sin((u / 0.07) * Math.PI);
        scaleY = 1 - sq * 0.18;
        scaleX = 1 + sq * 0.12;
        scaleZ = 1 + sq * 0.12;
      }
    } else {
      const u = tau - tSettle;
      const sX = spec.spawnX + spec.windVx * tGround + skidVx * (durB1 + 0.5 * durB2);
      const sZ = spec.spawnZ + spec.windVz * tGround + skidVz * (durB1 + 0.5 * durB2);
      const runLen = Math.hypot(skidVx, skidVz);
      const rx = skidVx / runLen;
      const rz = skidVz / runLen;
      x = sX + rx * 2.5 * u;
      z = sZ + rz * 2.5 * u;
      y = pawH + Math.abs(Math.sin(u * 16)) * 0.12;
      rotX = Math.sin(u * 16) * 0.09;
      rotY = Math.atan2(rx, rz);
      const fadeStart = Math.max(0.2, spec.period - tSettle - 0.35);
      if (u > fadeStart) {
        const f = Math.max(0.001, 1 - (u - fadeStart) / 0.35);
        scaleX = f;
        scaleY = f;
        scaleZ = f;
      }
    }
  }

  return {
    visible: scaleY > 0.02,
    x,
    y,
    z,
    rotX,
    rotY,
    rotZ,
    scaleX,
    scaleY,
    scaleZ,
  };
}

export function buildIdiomPropGroup(
  propKind: IdiomPropKind,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();

  switch (propKind) {
    case 'rainingCatsDogs': {
      FALLING_PET_SPECS.forEach((s) => {
        const pet = s.isDog
          ? buildGoldenRetrieverMesh(s.furColor)
          : buildTabbyCatMesh(s.furColor);
        pet.position.set(s.spawnX, 10.2, s.spawnZ);
        pet.rotation.y = s.yaw;
        pet.userData.isFallingPet = true;
        pet.userData.petSpecIndex = s.id;
        root.add(pet);
      });
      break;
    }

    case 'steelUmbrella': {
      // Grounded resting steel umbrella: tilted canopy rim/ferrule touches y=0 cleanly while grip points up at y ≈ 0.85
      const steelMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.22,
        metalness: 0.84,
      });
      const rivetMat = createPlasticBrickMaterial('#e2e8f0', {
        roughness: 0.18,
        metalness: 0.9,
      });
      const gripMat = createPlasticBrickMaterial(accentColor, { roughness: 0.6 });

      const umb = new THREE.Group();
      // Tilt inverted/angled so lowest canopy/rim sits at y=0 and handle rises cleanly to y ≈ 0.85
      umb.position.set(0, 0.24, 0);
      umb.rotation.set(0.32, 0, -0.16);

      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.92, 0.34, 10),
        steelMat,
      );
      canopy.rotation.x = Math.PI;
      canopy.position.y = 0.04;

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.036, 8, 20),
        rivetMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.21;

      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), rivetMat);
      finial.rotation.x = Math.PI;
      finial.position.y = -0.18;

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.78, 8), rivetMat);
      shaft.position.y = 0.42;

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.24, 8), gripMat);
      handle.position.y = 0.82;

      umb.add(canopy, rim, finial, shaft, handle);
      root.add(umb);
      break;
    }

    case 'beanWaterfall': {
      const beanMatA = createPlasticBrickMaterial(primaryColor, { roughness: 0.34, metalness: 0.08 });
      const beanMatB = createPlasticBrickMaterial(accentColor, { roughness: 0.38, metalness: 0.06 });

      // Cascading stream arc from mouth height (~1.95) down across cafe table (~1.1) to floor (0.12)
      for (let i = 0; i < 22; i++) {
        const t = i / 21;
        const arcZ = t * 1.15;
        const arcY = 1.95 - t * t * 1.82;
        const bean = new THREE.Mesh(
          new THREE.SphereGeometry(0.075 + (i % 3) * 0.018, 8, 6),
          i % 2 === 0 ? beanMatA : beanMatB,
        );
        bean.scale.set(1.2, 0.85, 0.9);
        bean.position.set(Math.sin(i * 1.9) * 0.14, arcY, arcZ);
        bean.userData.isBeanDrop = true;
        bean.userData.beanIndex = i;
        bean.userData.baseX = bean.position.x;
        bean.userData.baseZ = bean.position.z;
        root.add(bean);
      }

      // Growing bean mound on table & floor
      const tablePile = new THREE.Mesh(
        new THREE.ConeGeometry(0.68, 0.42, 12),
        beanMatA,
      );
      tablePile.position.set(0, 1.24, 0.68);
      tablePile.userData.isBeanPile = true;
      tablePile.userData.pileBaseY = 1.12;
      tablePile.userData.pileHeight = 0.42;

      const floorPile = new THREE.Mesh(
        new THREE.ConeGeometry(1.18, 0.52, 14),
        beanMatB,
      );
      floorPile.position.set(0, 0.26, 1.25);
      floorPile.userData.isBeanPile = true;
      floorPile.userData.pileBaseY = 0.0;
      floorPile.userData.pileHeight = 0.52;

      root.add(tablePile, floorPile);
      break;
    }

    case 'africanElephant': {
      const skinMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.82 });
      const tuskMat = createPlasticBrickMaterial('#fef3c7', { roughness: 0.32 });
      const lanyardMat = createPlasticBrickMaterial(accentColor, { roughness: 0.45 });
      const badgeMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.35 });
      const staplerMat = createPlasticBrickMaterial('#dc2626', { roughness: 0.3 });

      // Sitting awkwardly atop conference table (root placed on table or ground at y=0)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.48, 2.25), skinMat);
      torso.position.set(0, 1.08, 0);

      for (const [lx, lz] of [
        [-0.58, 0.78],
        [0.58, 0.78],
        [-0.58, -0.78],
        [0.58, -0.78],
      ]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.95, 12), skinMat);
        leg.position.set(lx, 0.475, lz);
        root.add(leg);
      }

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.15, 1.15), skinMat);
      head.position.set(0, 1.72, 1.25);

      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.82), skinMat);
      earL.position.set(-0.74, 1.76, 1.08);
      earL.rotation.y = 0.42;
      earL.userData.isElephantEar = -1;

      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.82), skinMat);
      earR.position.set(0.74, 1.76, 1.08);
      earR.rotation.y = -0.42;
      earR.userData.isElephantEar = 1;

      const trunkPivot = new THREE.Group();
      trunkPivot.position.set(0, 1.48, 1.84);
      trunkPivot.userData.isElephantTrunk = true;
      const trunkUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.82, 10), skinMat);
      trunkUpper.position.set(0, -0.28, 0.16);
      trunkUpper.rotation.x = -0.45;
      const trunkTip = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.42, 10), skinMat);
      trunkTip.position.set(0, -0.62, 0.32);
      trunkTip.rotation.x = 0.25;
      // Red stapler pinched in trunk tip!
      const stapler = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.12), staplerMat);
      stapler.position.set(0, -0.76, 0.36);
      trunkPivot.add(trunkUpper, trunkTip, stapler);

      for (const tx of [-0.36, 0.36]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.65, 10), tuskMat);
        tusk.position.set(tx, 1.32, 1.88);
        tusk.rotation.x = 1.1;
        root.add(tusk);
      }

      // Bright Visitor Lanyard around neck
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.055, 8, 22), lanyardMat);
      strap.position.set(0, 1.36, 0.96);
      strap.rotation.x = Math.PI / 2 - 0.35;
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.04), badgeMat);
      badge.position.set(0, 0.92, 1.66);

      root.add(torso, head, earL, earR, trunkPivot, strap, badge);
      break;
    }

    case 'iceFeet': {
      const iceMat = new THREE.MeshStandardMaterial({
        color: primaryColor,
        emissive: '#38bdf8',
        emissiveIntensity: 0.28,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.78,
      });
      const snowMat = createPlasticBrickMaterial(accentColor, { roughness: 0.78 });

      // Twin chunky ice blocks encasing both groom shoes
      const iceCluster = new THREE.Group();
      iceCluster.userData.isIceCluster = true;
      for (const ix of [-0.28, 0.28]) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.72), iceMat);
        block.position.set(ix, 0.28, 0.06);
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), iceMat);
        shard.position.set(ix + (ix > 0 ? 0.16 : -0.16), 0.52, -0.06);
        iceCluster.add(block, shard);
      }
      root.add(iceCluster);
      // Rising cold steam puffs
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 8, 8),
          snowMat,
        );
        puff.position.set((i - 1.5) * 0.24, 0.72 + (i % 2) * 0.18, 0.1);
        puff.userData.isIceSteam = true;
        puff.userData.steamPhase = i * 1.4;
        root.add(puff);
      }
      break;
    }

    case 'plasterCast': {
      const plasterMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.85 });
      const stripeMat = createPlasticBrickMaterial(accentColor, { roughness: 0.55 });
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.96, 12), plasterMat);
      shell.position.set(0, 0.52, 0);
      const footBoot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.68), plasterMat);
      footBoot.position.set(0, 0.17, 0.14);
      const doodle = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.14), stripeMat);
      doodle.position.set(0, 0.62, 0.22);
      root.add(shell, footBoot, doodle);
      break;
    }

    case 'stretcher': {
      const frameMat = createPlasticBrickMaterial('#cbd5e1', {
        roughness: 0.22,
        metalness: 0.8,
      });
      const padMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.65 });
      const wheelMat = createPlasticBrickMaterial('#18181b', { roughness: 0.82 });

      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 2.25), padMat);
      bed.position.y = 0.84;
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 1.9), frameMat);
      railL.position.set(-0.48, 0.98, 0);
      const railR = railL.clone();
      railR.position.x = 0.48;
      for (const [wx, wz] of [
        [-0.38, 0.82],
        [0.38, 0.82],
        [-0.38, -0.82],
        [0.38, -0.82],
      ]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.76, 8), frameMat);
        leg.position.set(wx, 0.44, wz);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.11, wz);
        wheel.userData.isCartWheel = true;
        root.add(leg, wheel);
      }
      root.add(bed, railL, railR);
      break;
    }

    case 'clydesdalePlatter': {
      const cartMat = createPlasticBrickMaterial('#94a3b8', { roughness: 0.28, metalness: 0.78 });
      const silverMat = new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.12,
        metalness: 0.92,
      });
      const parsleyMat = createPlasticBrickMaterial('#16a34a', { roughness: 0.68 });
      const horseMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.72 });
      const featherMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.78 });
      const maneMat = createPlasticBrickMaterial(accentColor, { roughness: 0.76 });

      // Rolling kitchen cart
      const cartDeck = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 2.55), cartMat);
      cartDeck.position.y = 0.78;
      for (const [wx, wz] of [
        [-0.62, 1.05],
        [0.62, 1.05],
        [-0.62, -1.05],
        [0.62, -1.05],
      ]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.68, 8), cartMat);
        leg.position.set(wx, 0.42, wz);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), maneMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.12, wz);
        wheel.userData.isCartWheel = true;
        root.add(leg, wheel);
      }

      // Giant silver platter + single sprig of parsley
      const platter = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 0.92, 0.08, 20),
        silverMat,
      );
      platter.scale.set(0.85, 1, 1.35);
      platter.position.y = 0.88;
      const parsleyStem = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), parsleyMat);
      parsleyStem.position.set(0.48, 0.98, 0.92);

      // Full-sized confused Clydesdale horse standing on the platter
      const hGroup = new THREE.Group();
      hGroup.position.set(0, 0.92, 0);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.84, 1.75), horseMat);
      body.position.set(0, 1.24, 0);
      for (const [hx, hz] of [
        [-0.28, 0.65],
        [0.28, 0.65],
        [-0.28, -0.65],
        [0.28, -0.65],
      ]) {
        const legUpper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.56, 0.2), horseMat);
        legUpper.position.set(hx, 0.66, hz);
        const legFeather = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), featherMat);
        legFeather.position.set(hx, 0.19, hz);
        hGroup.add(legUpper, legFeather);
      }
      const neckHead = new THREE.Group();
      neckHead.position.set(0, 1.56, 0.72);
      neckHead.userData.isHorseHead = true;
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.88, 0.44), horseMat);
      neck.position.set(0, 0.34, 0.16);
      neck.rotation.x = 0.35;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.74), horseMat);
      head.position.set(0, 0.72, 0.46);
      head.rotation.x = 0.22;
      const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.52), featherMat);
      blaze.position.set(0, 0.79, 0.58);
      blaze.rotation.x = 0.22;
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.18), maneMat);
      mane.position.set(0, 0.48, -0.02);
      mane.rotation.x = 0.35;
      neckHead.add(neck, head, blaze, mane);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.82, 0.16), maneMat);
      tail.position.set(0, 1.05, -0.96);
      tail.rotation.x = 0.22;
      tail.userData.isHorseTail = true;

      hGroup.add(body, neckHead, tail);
      root.add(cartDeck, platter, parsleyStem, hGroup);
      break;
    }

    case 'flyingPigs': {
      const pigMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.62 });
      const wingMat = createPlasticBrickMaterial(accentColor, { roughness: 0.45 });
      const snoutMat = createPlasticBrickMaterial('#f472b6', { roughness: 0.55 });

      const placements: [number, number, number, number][] = [
        [-2.2, 4.6, -2.5, 0],
        [0.4, 5.2, -4.0, 1.6],
        [2.6, 4.3, -1.8, 3.1],
      ];
      placements.forEach(([px, py, pz, phase]) => {
        const pig = new THREE.Group();
        pig.position.set(px, py, pz);
        pig.userData.isFlyingPig = true;
        pig.userData.baseX = px;
        pig.userData.baseY = py;
        pig.userData.pigPhase = phase;

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.92), pigMat);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.42), pigMat);
        head.position.set(0, 0.1, 0.56);
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.12), snoutMat);
        snout.position.set(0, 0.04, 0.81);
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.38), wingMat);
        wingL.position.set(-0.56, 0.22, 0);
        wingL.userData.isPigWing = -1;
        const wingR = wingL.clone();
        wingR.position.x = 0.56;
        wingR.userData.isPigWing = 1;

        pig.add(body, head, snout, wingL, wingR);
        root.add(pig);
      });
      break;
    }

    case 'grocerySpill': {
      const bagMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.85 });
      const appleMat = createPlasticBrickMaterial(accentColor, { roughness: 0.35 });
      const breadMat = createPlasticBrickMaterial('#d97706', { roughness: 0.72 });
      const milkMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.38 });

      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.76), bagMat);
      bag.position.set(0, 0.21, 0);
      bag.rotation.y = 0.35;
      const baguette = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8), breadMat);
      baguette.rotation.set(Math.PI / 2, 0.4, 0.2);
      baguette.position.set(0.28, 0.08, 0.48);
      const milk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.18), milkMat);
      milk.rotation.z = 1.45;
      milk.position.set(-0.34, 0.09, 0.42);
      milk.userData.isSpillItem = true;
      milk.userData.baseX = -0.34;
      milk.userData.baseZ = 0.42;
      milk.userData.rollDirX = -0.55;
      milk.userData.rollDirZ = 0.42;

      const appleCoords: [number, number, number, number][] = [
        [0.14, 0.68, 0.35, 0.75],
        [-0.18, 0.62, -0.45, 0.65],
        [0.45, 0.24, 0.72, 0.38],
      ];
      appleCoords.forEach(([ax, az, vx, vz]) => {
        const apple = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), appleMat);
        apple.position.set(ax, 0.1, az);
        apple.userData.isSpillItem = true;
        apple.userData.baseX = ax;
        apple.userData.baseZ = az;
        apple.userData.rollDirX = vx;
        apple.userData.rollDirZ = vz;
        root.add(apple);
      });
      root.add(bag, baguette, milk);
      break;
    }

    case 'parkedSedan': {
      const paintMat = createStudBrickMaterial(primaryColor, studTextures, 2, 4, {
        roughness: 0.24,
        metalness: 0.35,
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#93c5fd',
        roughness: 0.14,
        metalness: 0.25,
      });
      const tireMat = createPlasticBrickMaterial('#18181b', { roughness: 0.88 });
      const bumperMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.25,
        metalness: 0.75,
      });

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.78, 4.35), paintMat);
      chassis.position.y = 0.68;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.72, 2.2), paintMat);
      cabin.position.set(0, 1.4, -0.15);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.58, 2.26), glassMat);
      windshield.position.set(0, 1.38, -0.15);
      const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.22, 0.22), bumperMat);
      bumperF.position.set(0, 0.42, 2.18);
      const bumperR = bumperF.clone();
      bumperR.position.z = -2.18;
      for (const [tx, tz] of [
        [-1.06, 1.35],
        [1.06, 1.35],
        [-1.06, -1.35],
        [1.06, -1.35],
      ]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(tx, 0.38, tz);
        root.add(tire);
      }
      root.add(chassis, cabin, windshield, bumperF, bumperR);
      break;
    }

    case 'sightseeingBus': {
      const busMat = createStudBrickMaterial(primaryColor, studTextures, 2, 6, {
        roughness: 0.32,
      });
      const trimMat = createPlasticBrickMaterial(accentColor, { roughness: 0.4 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        roughness: 0.16,
        metalness: 0.2,
      });
      const tireMat = createPlasticBrickMaterial('#18181b', { roughness: 0.88 });
      const bannerTex = createTourBusBannerTexture(512);
      const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.4, 6.8), busMat);
      body.position.y = 1.65;
      const windows = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.86, 5.9), glassMat);
      windows.position.set(0, 2.08, 0.1);
      const bannerL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 4.6), bannerMat);
      bannerL.position.set(-1.3, 1.15, 0);
      const bannerR = bannerL.clone();
      bannerR.position.x = 1.3;
      const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.22, 5.8), trimMat);
      roofDeck.position.y = 2.95;

      for (const [tx, tz] of [
        [-1.25, 2.1],
        [1.25, 2.1],
        [-1.25, -2.1],
        [1.25, -2.1],
      ]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 14), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(tx, 0.52, tz);
        root.add(tire);
      }
      root.add(body, windows, bannerL, bannerR, roofDeck);
      break;
    }
  }

  setShadows(root, true, true);
  return root;
}

export function animateIdiomProp(group: THREE.Group, propKind: string | undefined, time: number) {
  if (!propKind) return;
  if (propKind === 'rainingCatsDogs') {
    group.traverse((obj) => {
      if (obj.userData?.isFallingPet) {
        const idx = (obj.userData.petSpecIndex as number) ?? 0;
        const spec = FALLING_PET_SPECS[idx] ?? FALLING_PET_SPECS[0];
        const state = evaluateFallingPetPhysics(spec, time);
        obj.visible = state.visible;
        obj.position.set(state.x, state.y, state.z);
        obj.rotation.set(state.rotX, state.rotY, state.rotZ);
        obj.scale.set(state.scaleX, state.scaleY, state.scaleZ);
      }
    });
  } else if (propKind === 'beanWaterfall') {
    const spillGrowth = THREE.MathUtils.clamp((time - 16.0) / 2.4, 0.15, 1.0);
    group.traverse((obj) => {
      if (obj.userData?.isBeanDrop) {
        const idx = (obj.userData.beanIndex as number) ?? 0;
        const flowT = (time * 2.8 + idx / 22) % 1;
        // Pour from mouth (z=0, y=1.95) onto table (z=0.68, y=1.12), then splash down to floor (z=1.25, y=0.14)
        if (flowT < 0.56) {
          const u = flowT / 0.56;
          obj.position.z = u * 0.68;
          obj.position.y = 1.95 - u * u * 0.83;
        } else {
          const u = (flowT - 0.56) / 0.44;
          const bounce = Math.sin(u * Math.PI) * 0.18;
          obj.position.z = 0.68 + u * 0.57;
          obj.position.y = 1.12 + bounce - u * u * 1.0;
        }
      } else if (obj.userData?.isBeanPile) {
        const baseY = (obj.userData.pileBaseY as number) ?? 0;
        const height = (obj.userData.pileHeight as number) ?? 0.42;
        obj.scale.set(0.65 + spillGrowth * 0.4, spillGrowth, 0.65 + spillGrowth * 0.4);
        obj.position.y = baseY + (height * spillGrowth) / 2;
      }
    });
  } else if (propKind === 'africanElephant') {
    group.traverse((obj) => {
      const earSide = obj.userData?.isElephantEar as number | undefined;
      if (earSide) {
        obj.rotation.y = earSide * (-0.42 + Math.sin(time * 3.1) * 0.14);
      } else if (obj.userData?.isElephantTrunk) {
        obj.rotation.x = Math.sin(time * 4.2) * 0.16;
      }
    });
  } else if (propKind === 'iceFeet') {
    const meltT = THREE.MathUtils.clamp((time - 46.2) / 3.2, 0, 1);
    const shiver = time >= 40.6 && time < 46.5 ? Math.sin(time * 38) * 0.018 : 0;
    group.traverse((obj) => {
      if (obj.userData?.isIceCluster) {
        const iceScale = 1 - meltT * 0.78;
        obj.scale.set(iceScale, Math.max(0.18, iceScale), iceScale);
        obj.position.x = shiver;
      } else if (obj.userData?.isIceSteam) {
        const phase = (obj.userData.steamPhase as number) ?? 0;
        const steamSpeed = 0.8 + meltT * 1.6;
        const lift = (time * steamSpeed + phase) % 1;
        obj.position.y = 0.52 + lift * (0.85 + meltT * 0.45);
        obj.scale.setScalar((0.75 + lift * 0.7) * (1 + meltT * 0.35));
      }
    });
  } else if (propKind === 'stretcher') {
    const rolling = time >= 57.2 && time <= 60.05;
    group.traverse((obj) => {
      if (obj.userData?.isCartWheel) {
        obj.rotation.x = rolling ? -(time - 57.2) * 9.5 : 0;
      }
    });
  } else if (propKind === 'clydesdalePlatter') {
    const rolling = time >= 69.4 && time <= 73.25;
    group.traverse((obj) => {
      if (obj.userData?.isHorseHead) {
        obj.rotation.z = Math.sin(time * 2.2) * 0.08;
        obj.rotation.x = Math.sin(time * 1.6) * 0.06;
      } else if (obj.userData?.isHorseTail) {
        obj.rotation.z = Math.sin(time * 4.4) * 0.18;
      } else if (obj.userData?.isCartWheel) {
        obj.rotation.x = rolling ? (time - 69.4) * 8.5 : 0;
      }
    });
  } else if (propKind === 'flyingPigs') {
    group.traverse((obj) => {
      if (obj.userData?.isFlyingPig) {
        const bx = (obj.userData.baseX as number) ?? 0;
        const by = (obj.userData.baseY as number) ?? 4.6;
        const phase = (obj.userData.pigPhase as number) ?? 0;
        const theta = time * 0.85 + phase;
        const dx = Math.cos(theta) * 1.9 * 0.85;
        obj.position.x = bx + Math.sin(theta) * 1.9;
        obj.position.y = by + Math.sin(time * 2.4 + phase) * 0.32;
        obj.rotation.y = dx >= 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
        obj.rotation.z = -Math.cos(theta) * 0.24;
      } else {
        const wingSide = obj.userData?.isPigWing as number | undefined;
        if (wingSide) {
          obj.rotation.z = wingSide * Math.sin(time * 8.5) * 0.48;
        }
      }
    });
  } else if (propKind === 'grocerySpill') {
    const dt = THREE.MathUtils.clamp(time - 82.8, 0, 1.8);
    const rollEase = 1 - Math.pow(1 - dt / 1.8, 2.2);
    group.traverse((obj) => {
      if (obj.userData?.isSpillItem) {
        const bx = (obj.userData.baseX as number) ?? 0;
        const bz = (obj.userData.baseZ as number) ?? 0;
        const vx = (obj.userData.rollDirX as number) ?? 0;
        const vz = (obj.userData.rollDirZ as number) ?? 0;
        obj.position.x = bx + vx * rollEase;
        obj.position.z = bz + vz * rollEase;
        obj.rotation.x = vz * rollEase * 6.5;
        obj.rotation.z = -vx * rollEase * 6.5;
      }
    });
  }
}
