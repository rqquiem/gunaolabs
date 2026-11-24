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
import { createDaylightSkylineWindowTexture } from './robloxCityAssets';

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
      const darkWoodMat = createPlasticBrickMaterial('#451a03', { roughness: 0.82 });
      const stoneMat = createStudBrickMaterial('#94a3b8', studTextures, 2, 2, {
        roughness: 0.68,
      });
      const lanternMetal = createPlasticBrickMaterial('#1e293b', { roughness: 0.35, metalness: 0.72 });
      const lanternGlow = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 1.35,
        roughness: 0.2,
      });
      const picketMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.55 });
      const signTex = createVerbatimSignTexture(maxAnisotropy);
      const signFaceMat = new THREE.MeshStandardMaterial({
        map: signTex,
        roughness: 0.48,
      });

      // Tiered stone masonry planter plinth + corner stone piers
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.46, 1.45), stoneMat);
      plinth.position.set(0, 0.23, 0);
      const plinthCap = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 1.62), createPlasticBrickMaterial('#cbd5e1', { roughness: 0.58 }));
      plinthCap.position.set(0, 0.52, 0);

      for (const px of [-2.25, 2.25]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.15, 0.68), stoneMat);
        pier.position.set(px, 0.85, 0);
        const pierCap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.78), createPlasticBrickMaterial('#cbd5e1', { roughness: 0.55 }));
        pierCap.position.set(px, 1.46, 0);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 2.85, 10), woodMat);
        post.position.set(px, 2.85, 0);
        // Diagonal timber bracket corbel
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.14), darkWoodMat);
        brace.position.set(px + (px < 0 ? 0.26 : -0.26), 3.72, 0);
        brace.rotation.z = px < 0 ? -0.68 : 0.68;
        // Hanging warm lantern sconce on outer side of post
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), lanternMetal);
        arm.position.set(px + (px < 0 ? -0.34 : 0.34), 3.35, 0.12);
        const lanternTop = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 6), lanternMetal);
        lanternTop.position.set(px + (px < 0 ? -0.52 : 0.52), 3.22, 0.12);
        const lanternBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.24, 6), lanternGlow);
        lanternBulb.position.set(px + (px < 0 ? -0.52 : 0.52), 3.04, 0.12);
        group.add(pier, pierCap, post, brace, arm, lanternTop, lanternBulb);
      }

      const board = new THREE.Mesh(
        new THREE.BoxGeometry(4.9, 2.2, 0.26),
        [woodMat, woodMat, woodMat, woodMat, signFaceMat, signFaceMat],
      );
      board.position.set(0, 2.95, 0);

      // Pitched shingle gable roof cap with ridge beam
      const capL = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.14, 0.62), darkWoodMat);
      capL.position.set(0, 4.24, -0.22);
      capL.rotation.x = -0.32;
      const capR = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.14, 0.62), darkWoodMat);
      capR.position.set(0, 4.24, 0.22);
      capR.rotation.x = 0.32;
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.14, 0.18), woodMat);
      ridge.position.set(0, 4.38, 0);

      // Lush flowerbed shrubs & multi-color blooms across planter
      const petalMatA = createPlasticBrickMaterial(accentColor, { roughness: 0.52 });
      const petalMatB = createPlasticBrickMaterial('#facc15', { roughness: 0.52 });
      const leafMat = createPlasticBrickMaterial('#22c55e', { roughness: 0.72 });
      for (const fx of [-2.05, -1.05, 0, 1.05, 2.05]) {
        const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), leafMat);
        shrub.position.set(fx, 0.74, 0.45);
        const bloom = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 8, 6),
          Math.abs(fx) > 1.2 ? petalMatA : petalMatB,
        );
        bloom.position.set(fx + 0.08, 1.04, 0.52);
        group.add(shrub, bloom);
      }

      // Flanking white picket fence wings
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.08), picketMat);
        rail.position.set(side * 4.2, 0.68, -0.1);
        const railLo = rail.clone();
        railLo.position.y = 0.28;
        group.add(rail, railLo);
        for (let i = 0; i < 6; i++) {
          const picket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.92, 0.06), picketMat);
          picket.position.set(side * (3.15 + i * 0.42), 0.46, -0.1);
          group.add(picket);
        }
      }

      group.add(plinth, plinthCap, board, capL, capR, ridge);
      break;
    }

    case 'cafeCounter': {
      const oakMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.65 });
      const darkOakMat = createPlasticBrickMaterial('#451a03', { roughness: 0.72 });
      const creamMat = createPlasticBrickMaterial('#fef3c7', { roughness: 0.42 });
      const tileMat = createPlasticBrickMaterial('#f1f5f9', { roughness: 0.34 });
      const espressoSteel = createPlasticBrickMaterial('#cbd5e1', {
        roughness: 0.2,
        metalness: 0.78,
      });
      const brassMat = createPlasticBrickMaterial('#eab308', {
        roughness: 0.25,
        metalness: 0.78,
      });
      const bulbGlow = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42,
      });
      const menuTex = createCafeMenuTexture(maxAnisotropy);
      const menuMat = new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.52 });

      // Back café wall with wood wainscoting + subway tile upper band + menu chalkboard
      addBrick(group, 12.6, 5.1, 0.45, 0, 2.55, -3.45, '#78350f', studTextures, 1.2, 0.68);
      const wainscot = new THREE.Mesh(new THREE.BoxGeometry(12.62, 1.35, 0.1), darkOakMat);
      wainscot.position.set(0, 0.68, -3.19);
      const tileBand = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.1, 0.08), tileMat);
      tileBand.position.set(2.7, 2.55, -3.2);
      const menuBoard = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.1, 0.14), menuMat);
      menuBoard.position.set(-2.2, 3.05, -3.12);
      // Framed coffee art print
      const artFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.4, 0.08), darkOakMat);
      artFrame.position.set(-5.2, 2.95, -3.18);
      const artCanvas = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.1), creamMat);
      artCanvas.position.set(-5.2, 2.95, -3.16);
      group.add(wainscot, tileBand, artFrame, artCanvas);

      // 3 Hanging brass pendant lamps from ceiling rail
      const ceilingRail = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.14, 0.18), darkOakMat);
      ceilingRail.position.set(0.4, 4.95, -1.1);
      group.add(ceilingRail);
      for (const lx of [-1.1, 1.4, 3.3]) {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), darkOakMat);
        cord.position.set(lx, 4.35, lx < 0 ? 0.2 : -1.55);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.24, 12), brassMat);
        shade.position.set(lx, 3.74, lx < 0 ? 0.2 : -1.55);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bulbGlow);
        bulb.position.set(lx, 3.62, lx < 0 ? 0.2 : -1.55);
        group.add(cord, shade, bulb);
      }

      // Service bar counter (right-back)
      addBrick(group, 4.8, 1.12, 1.24, 2.6, 0.56, -1.6, primaryColor, studTextures, 1.3, 0.58);
      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.12, 1.4), creamMat);
      counterTop.position.set(2.6, 1.18, -1.6);

      // Espresso machine + stacked mugs + glass pastry display case
      const espBody = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.78, 0.64), espressoSteel);
      espBody.position.set(3.25, 1.63, -1.72);
      const espHopper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.34, 10), espressoSteel);
      espHopper.position.set(3.25, 2.15, -1.72);
      const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.68, 0.72), glassMat);
      pastryCase.position.set(1.45, 1.58, -1.55);
      const pastryShelf = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.05, 0.64), espressoSteel);
      pastryShelf.position.set(1.45, 1.52, -1.55);
      const pastryMat = createPlasticBrickMaterial('#d97706', { roughness: 0.58 });
      const icingMat = createPlasticBrickMaterial('#f472b6', { roughness: 0.42 });
      for (const px of [1.1, 1.45, 1.8]) {
        const croissant = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 8, 12), px === 1.45 ? icingMat : pastryMat);
        croissant.rotation.x = Math.PI / 2;
        croissant.position.set(px, 1.6, -1.55);
        group.add(croissant);
      }
      group.add(pastryCase, pastryShelf);

      // Cozy red vinyl corner booth (left-center, seated characters at x=-2.15 & 0.05)
      const boothMat = createPlasticBrickMaterial(accentColor, { roughness: 0.52 });
      const benchL = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 2.25), boothMat);
      benchL.position.set(-2.35, 0.31, 0.2);
      const benchLBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.4, 2.25), boothMat);
      benchLBack.position.set(-2.82, 0.74, 0.2);
      const benchR = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 2.25), boothMat);
      benchR.position.set(0.15, 0.31, 0.2);
      const benchRBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.4, 2.25), boothMat);
      benchRBack.position.set(0.62, 0.74, 0.2);

      // Café bistro table between booth benches + 2 latte mugs + warm tabletop mini-lamp
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 1.85), oakMat);
      tableTop.position.set(-1.1, 1.06, 0.2);
      const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.02, 10), espressoSteel);
      tableLeg.position.set(-1.1, 0.51, 0.2);
      const miniLampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.26, 8), brassMat);
      miniLampStem.position.set(-1.1, 1.24, -0.42);
      const miniLampGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 10), bulbGlow);
      miniLampGlow.position.set(-1.1, 1.41, -0.42);
      group.add(miniLampStem, miniLampGlow);

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
      const steelMullionMat = createPlasticBrickMaterial('#1e293b', {
        roughness: 0.34,
        metalness: 0.65,
      });
      const leatherMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.62 });
      const laptopTex = createBoardroomLaptopTexture(maxAnisotropy);
      const skylineWinTex = createDaylightSkylineWindowTexture(maxAnisotropy);
      const screenMat = new THREE.MeshStandardMaterial({
        map: laptopTex,
        emissive: '#1e3a8a',
        emissiveIntensity: 0.45,
        roughness: 0.22,
      });
      const skylineWindowMat = new THREE.MeshStandardMaterial({
        map: skylineWinTex,
        emissive: '#bae6fd',
        emissiveIntensity: 0.22,
        roughness: 0.14,
        metalness: 0.18,
      });

      // Floor-to-ceiling downtown skyscraper skyline glass curtain wall
      const lowerSill = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.72, 0.42), steelMullionMat);
      lowerSill.position.set(0, 0.36, -4.55);
      const upperHeader = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.45, 0.42), steelMullionMat);
      upperHeader.position.set(0, 5.2, -4.55);
      const windowBackdrop = new THREE.Mesh(new THREE.BoxGeometry(14.6, 4.3, 0.14), skylineWindowMat);
      windowBackdrop.position.set(0, 2.86, -4.55);
      group.add(lowerSill, upperHeader, windowBackdrop);

      // Vertical steel curtain-wall mullions framing the city skyline
      for (const mx of [-7.2, -4.4, -2.9, 2.9, 4.4, 7.2]) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.1, 0.34), steelMullionMat);
        mullion.position.set(mx, 2.75, -4.48);
        group.add(mullion);
      }

      // Floating corporate presentation screen mounted in front of central skyline bay
      const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(5.76, 2.54, 0.14), steelMullionMat);
      screenFrame.position.set(0, 2.95, -4.24);
      const presentationScreen = new THREE.Mesh(
        new THREE.BoxGeometry(5.54, 2.34, 0.1),
        new THREE.MeshStandardMaterial({
          map: laptopTex,
          emissive: '#0ea5e9',
          emissiveIntensity: 0.28,
          roughness: 0.22,
        }),
      );
      presentationScreen.position.set(0, 2.95, -4.16);
      group.add(screenFrame, presentationScreen);

      // Overhead recessed architectural LED linear light rectangle
      const ledMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        emissive: '#e0f2fe',
        emissiveIntensity: 1.4,
        roughness: 0.2,
      });
      const lightBarF = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.1, 0.16), ledMat);
      lightBarF.position.set(0, 5.15, 1.0);
      const lightBarB = lightBarF.clone();
      lightBarB.position.z = -1.0;
      group.add(lightBarF, lightBarB);

      // Long mahogany conference table with brushed-steel center cable inlay + water carafe
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.16, 2.96), mahoganyMat);
      tableTop.position.set(0, 1.08, 0);
      const inlay = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.02, 0.36), chromeMat);
      inlay.position.set(0, 1.17, 0);
      const carafe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.15, 0.36, 10),
        new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.72 }),
      );
      carafe.position.set(3.45, 1.34, 0.22);
      group.add(inlay, carafe);

      for (const lx of [-2.8, 2.8]) {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 1.0, 12), chromeMat);
        ped.position.set(lx, 0.5, 0);
        group.add(ped);
      }

      // 6 Stiff executive chairs with armrests + open glowing laptops along both sides
      const seatXs = [-2.5, 0, 2.5];
      for (const sx of seatXs) {
        for (const side of [-1, 1]) {
          const cz = side * 1.95;
          const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.86), leatherMat);
          chairSeat.position.set(sx, 0.62, cz);
          const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.08, 0.14), leatherMat);
          chairBack.position.set(sx, 1.2, cz + side * 0.36);
          const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.62), chromeMat);
          armL.position.set(sx - 0.42, 0.78, cz);
          const armR = armL.clone();
          armR.position.x = sx + 0.42;
          const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.58, 8), chromeMat);
          chairStem.position.set(sx, 0.29, cz);

          // Laptop on table in front of seat
          const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.44), chromeMat);
          lBase.position.set(sx, 1.18, side * 0.96);
          const lLid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.04), screenMat);
          lLid.position.set(sx, 1.38, side * 0.76);
          lLid.rotation.x = side * -0.22;

          group.add(chairSeat, chairBack, armL, armR, chairStem, lBase, lLid);
        }
      }

      group.add(tableTop);
      break;
    }

    case 'weddingAltar': {
      const marbleMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.26 });
      const goldMat = createPlasticBrickMaterial('#facc15', {
        roughness: 0.22,
        metalness: 0.78,
      });
      const carpetMat = createPlasticBrickMaterial(accentColor, { roughness: 0.85 });
      const woodMat = createPlasticBrickMaterial('#78350f', { roughness: 0.65 });
      const leafMat = createPlasticBrickMaterial('#16a34a', { roughness: 0.7 });
      const roseMat = createPlasticBrickMaterial('#fb7185', { roughness: 0.5 });
      const ivoryFlowerMat = createPlasticBrickMaterial('#fef3c7', { roughness: 0.48 });
      const candleFlameMat = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 1.7,
        roughness: 0.18,
      });
      const glassTex = createStainedGlassTexture(maxAnisotropy);
      const stainedMat = new THREE.MeshStandardMaterial({
        map: glassTex,
        emissive: '#fef3c7',
        emissiveIntensity: 0.52,
        roughness: 0.2,
      });

      // Red aisle carpet runner with gold border trim + marble altar dais
      const runner = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 11.8), carpetMat);
      runner.position.set(0, 0.025, 2.2);
      const dais = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.32, 3.8), marbleMat);
      dais.position.set(0, 0.16, -2.6);
      const podium = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.12, 0.56), marbleMat);
      podium.position.set(0, 0.88, -3.55);
      const podiumTop = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.68), goldMat);
      podiumTop.position.set(0, 1.48, -3.55);
      group.add(podium, podiumTop);

      // Church back wall + 3 framed stained glass arch windows
      addBrick(group, 14.2, 6.4, 0.5, 0, 3.2, -5.2, primaryColor, studTextures, 1.1, 0.58);
      for (const wx of [-3.5, 0, 3.5]) {
        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.86, 3.46, 0.14), goldMat);
        winFrame.position.set(wx, 3.5, -4.96);
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.62, 3.22, 0.18), stainedMat);
        win.position.set(wx, 3.5, -4.9);
        group.add(winFrame, win);
      }

      // Floral wedding arch with greenery & rose clusters
      const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 3.6, 12), marbleMat);
      colL.position.set(-2.35, 1.95, -2.8);
      const colR = colL.clone();
      colR.position.x = 2.35;
      const archRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.35, 0.2, 10, 24, Math.PI),
        goldMat,
      );
      archRing.position.set(0, 3.7, -2.8);

      for (let i = 0; i <= 6; i++) {
        const ang = (i / 6) * Math.PI;
        const fx = Math.cos(ang) * 2.35;
        const fy = 3.7 + Math.sin(ang) * 2.35;
        const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), leafMat);
        leaf.position.set(fx, fy, -2.72);
        const rose = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), i % 2 === 0 ? roseMat : ivoryFlowerMat);
        rose.position.set(fx * 0.96, fy + 0.06, -2.56);
        group.add(leaf, rose);
      }

      // Twin brass candelabra stands flanking the dais
      for (const cx of [-3.1, 3.1]) {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 2.2, 10), goldMat);
        stand.position.set(cx, 1.42, -2.55);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.08), goldMat);
        cross.position.set(cx, 2.48, -2.55);
        group.add(stand, cross);
        for (const ox of [-0.28, 0, 0.28]) {
          const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.34, 8), marbleMat);
          candle.position.set(cx + ox, 2.68, -2.55);
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), candleFlameMat);
          flame.position.set(cx + ox, 2.92, -2.55);
          group.add(candle, flame);
        }
      }

      // Pews flanking the aisle with aisle-end floral bouquets
      for (const pz of [0.8, 3.0, 5.2]) {
        for (const side of [-1, 1]) {
          const pew = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.86, 0.72), woodMat);
          pew.position.set(side * 3.25, 0.43, pz);
          const bouquetLeaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), leafMat);
          bouquetLeaf.position.set(side * 1.62, 0.82, pz);
          const bouquetRose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), roseMat);
          bouquetRose.position.set(side * 1.56, 0.92, pz);
          group.add(pew, bouquetLeaf, bouquetRose);
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
      const brassMat = createPlasticBrickMaterial('#facc15', { roughness: 0.24, metalness: 0.75 });
      const playbillTex = createTheaterPlaybillTexture(maxAnisotropy);
      const posterMat = new THREE.MeshStandardMaterial({ map: playbillTex, roughness: 0.48 });

      // Backstage floor deck
      const deck = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.14, 11.0), stageWood);
      deck.position.set(0, 0.07, 0);

      // Velvet wing curtains left & right + upper proscenium valence drape
      for (const cx of [-4.8, -3.7, 3.7, 4.8]) {
        for (const cz of [-2.4, 0.6]) {
          const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 5.5, 10), curtainMat);
          drape.position.set(cx, 2.75, cz);
          group.add(drape);
        }
      }
      const headerDrape = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.85, 0.38), curtainMat);
      headerDrape.position.set(0, 5.35, -2.5);
      group.add(headerDrape);

      // Back brick wall + Shakespeare playbill poster + glowing red "QUIET ON SET" sign
      addBrick(group, 13.6, 5.8, 0.45, 0, 2.9, -4.6, '#1e293b', studTextures, 1.2, 0.72);
      const poster = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.55, 0.1), posterMat);
      poster.position.set(-2.4, 2.8, -4.32);

      const quietSignBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.52, 0.14),
        new THREE.MeshStandardMaterial({
          color: '#dc2626',
          emissive: '#ef4444',
          emissiveIntensity: 1.25,
          roughness: 0.25,
        }),
      );
      quietSignBox.position.set(0.3, 4.1, -4.3);
      group.add(quietSignBox);

      // Backstage dressing vanity mirror with marquee bulbs on right-back wall
      const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.85, 0.14), brassMat);
      mirrorFrame.position.set(2.8, 2.75, -4.32);
      const mirrorGlass = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1.6, 0.16),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.08, metalness: 0.88 }),
      );
      mirrorGlass.position.set(2.8, 2.75, -4.3);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#fbbf24',
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      for (const by of [2.1, 2.55, 3.0, 3.45]) {
        for (const bx of [2.06, 3.54]) {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), bulbMat);
          bulb.position.set(bx, by, -4.2);
          group.add(bulb);
        }
      }
      group.add(mirrorFrame, mirrorGlass);

      // Rigging rope fly-rail on left wing
      const ropeMat = createPlasticBrickMaterial('#d6b98c', { roughness: 0.85 });
      for (let i = 0; i < 4; i++) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 5.2, 6), ropeMat);
        rope.position.set(-4.15, 2.7, -3.5 + i * 0.45);
        group.add(rope);
      }

      // Overhead lighting truss + dual spotlight cans + translucent warm spotlight beam cone
      const trussBeam = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.34, 0.34), trussMat);
      trussBeam.position.set(0, 5.1, -1.2);
      const spotLensMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.6,
        roughness: 0.15,
      });
      for (const sx of [-1.4, 0, 1.4]) {
        const spotCan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.54, 10), trussMat);
        spotCan.position.set(sx, 4.8, -1.2);
        spotCan.rotation.x = 0.52;
        const spotLens = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 10), spotLensMat);
        spotLens.position.set(sx, 4.58, -1.04);
        spotLens.rotation.x = 0.52;
        group.add(spotCan, spotLens);
      }
      const beamCone = new THREE.Mesh(
        new THREE.ConeGeometry(1.85, 4.6, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color: '#fef08a',
          transparent: true,
          opacity: 0.08,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      beamCone.position.set(0, 2.55, -0.15);
      beamCone.rotation.x = -0.32;
      group.add(beamCone);

      // Stacked wooden prop crates & road flight case
      addBrick(group, 1.25, 1.15, 1.25, 3.6, 0.58, -3.2, '#7c4a2d', studTextures, 1.4);
      addBrick(group, 0.92, 0.84, 0.92, 3.7, 1.56, -3.2, '#1e293b', studTextures, 1.4);

      group.add(deck, poster, trussBeam);
      break;
    }

    case 'retroDiner': {
      const chromeMat = createPlasticBrickMaterial('#e2e8f0', {
        roughness: 0.16,
        metalness: 0.86,
      });
      const vinylMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.42 });
      const tealMat = createPlasticBrickMaterial(accentColor, { roughness: 0.45 });
      const neonTex = createDinerNeonSignTexture(maxAnisotropy);
      const neonMat = new THREE.MeshStandardMaterial({
        map: neonTex,
        emissive: '#ef4444',
        emissiveIntensity: 0.34,
        roughness: 0.26,
      });
      const lampGlow = new THREE.MeshStandardMaterial({
        color: '#fef3c7',
        emissive: '#fbbf24',
        emissiveIntensity: 1.4,
        roughness: 0.2,
      });

      // Retro black/white checkerboard floor
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

      // Diner back wall + chrome trim rail + swinging kitchen double doors + neon sign
      addBrick(group, 5.6, 5.3, 0.45, -4.9, 2.65, -4.4, '#e2e8f0', studTextures, 1.2);
      addBrick(group, 5.6, 5.3, 0.45, 4.9, 2.65, -4.4, '#e2e8f0', studTextures, 1.2);
      addBrick(group, 4.4, 1.7, 0.45, 0, 4.45, -4.4, '#e2e8f0', studTextures, 1.2);
      const chromeTrimL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.18, 0.08), chromeMat);
      chromeTrimL.position.set(-4.9, 2.25, -4.14);
      const chromeTrimR = chromeTrimL.clone();
      chromeTrimR.position.x = 4.9;
      group.add(chromeTrimL, chromeTrimR);

      // Glowing Retro Wurlitzer-style Jukebox in back-left corner
      const jukeBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.1, 0.95), createPlasticBrickMaterial('#78350f', { roughness: 0.5 }));
      jukeBody.position.set(-5.6, 1.05, -3.55);
      const jukeArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.11, 8, 18, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 1.35, roughness: 0.2 }),
      );
      jukeArch.position.set(-5.6, 2.08, -3.14);
      const jukeGrill = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.1, 0.08),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 1.0, roughness: 0.2 }),
      );
      jukeGrill.position.set(-5.6, 1.35, -3.05);
      group.add(jukeBody, jukeArch, jukeGrill);

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

      // Hanging chrome pendant lamps over booth & counter
      for (const [px, pz] of [[-2.45, 0.8], [3.6, -1.4], [5.2, -1.4]]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 6), chromeMat);
        rod.position.set(px, 4.45, pz);
        const dome = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.24, 14), chromeMat);
        dome.position.set(px, 3.85, pz);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), lampGlow);
        bulb.position.set(px, 3.74, pz);
        group.add(rod, dome, bulb);
      }

      // Red vinyl diner booth on left (-2.8, 0, 0.8) where Tourist sits
      const boothBench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 2.3), vinylMat);
      boothBench.position.set(-3.8, 0.325, 0.8);
      const boothBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.45, 2.3), vinylMat);
      boothBack.position.set(-4.35, 0.75, 0.8);
      const dinerTable = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 2.1), chromeMat);
      dinerTable.position.set(-2.45, 1.08, 0.8);
      const tablePost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.02, 10), chromeMat);
      tablePost.position.set(-2.45, 0.51, 0.8);

      // Condiment caddy (ketchup/mustard) + strawberry milkshake on booth table
      const ketchup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.24, 8), createPlasticBrickMaterial('#dc2626', { roughness: 0.35 }));
      ketchup.position.set(-2.22, 1.26, 0.22);
      const mustard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.24, 8), createPlasticBrickMaterial('#facc15', { roughness: 0.35 }));
      mustard.position.set(-2.42, 1.26, 0.24);
      const shakeGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.32, 10), createPlasticBrickMaterial('#f472b6', { roughness: 0.25 }));
      shakeGlass.position.set(-2.58, 1.3, 1.12);
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), createPlasticBrickMaterial('#f8fafc', { roughness: 0.4 }));
      straw.position.set(-2.56, 1.5, 1.12);
      straw.rotation.z = 0.2;
      group.add(ketchup, mustard, shakeGlass, straw);

      // Bar stools & counter on right + glass pie display dome
      addBrick(group, 4.2, 1.15, 1.15, 4.4, 0.575, -1.4, tealMat ? accentColor : '#0ea5e9', studTextures);
      const pieBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.08, 14), chromeMat);
      pieBase.position.set(3.9, 1.2, -1.4);
      const pieCrust = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.12, 12), createPlasticBrickMaterial('#d97706', { roughness: 0.6 }));
      pieCrust.position.set(3.9, 1.28, -1.4);
      const pieDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({ color: '#e0f2fe', roughness: 0.1, transparent: true, opacity: 0.42 }),
      );
      pieDome.position.set(3.9, 1.22, -1.4);
      group.add(pieBase, pieCrust, pieDome);

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
      const awningColors = ['#0284c7', '#f59e0b', '#10b981'];
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        emissive: '#38bdf8',
        emissiveIntensity: 0.18,
        roughness: 0.14,
        metalness: 0.25,
      });
      const warmWindowMat = new THREE.MeshStandardMaterial({
        color: '#fef3c7',
        emissive: '#fde68a',
        emissiveIntensity: 0.35,
        roughness: 0.2,
      });
      const trimMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.45, metalness: 0.35 });
      const stoneTrim = createPlasticBrickMaterial('#cbd5e1', { roughness: 0.55 });

      // Row of 3 richly detailed Main Street brick storefronts behind the sidewalk
      facadeColors.forEach((col, i) => {
        const bx = (i - 1) * 6.2;
        addBrick(group, 5.7, 5.6, 4.2, bx, 2.8, -4.6, col, studTextures, 1.1, 0.55);
        addBrick(group, 6.1, 0.46, 4.6, bx, 5.8, -4.6, '#1e293b', studTextures, 1.2);
        // Parapet stone belt course
        const belt = new THREE.Mesh(new THREE.BoxGeometry(5.88, 0.22, 4.35), stoneTrim);
        belt.position.set(bx, 3.05, -4.6);
        group.add(belt);

        // Upper-story double windows with stone sills
        for (const wx of [-1.4, 1.4]) {
          const uWin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, 0.16), glassMat);
          uWin.position.set(bx + wx, 4.25, -2.44);
          const sill = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 0.26), stoneTrim);
          sill.position.set(bx + wx, 3.48, -2.42);
          group.add(uWin, sill);
        }

        // Angled storefront awning with valance drop
        const awning = new THREE.Mesh(
          new THREE.BoxGeometry(4.6, 0.18, 1.48),
          createPlasticBrickMaterial(awningColors[i] ?? accentColor, { roughness: 0.55 }),
        );
        awning.position.set(bx, 2.52, -1.88);
        awning.rotation.x = 0.22;
        const valance = new THREE.Mesh(
          new THREE.BoxGeometry(4.6, 0.22, 0.08),
          createPlasticBrickMaterial('#f8fafc', { roughness: 0.5 }),
        );
        valance.position.set(bx, 2.28, -1.16);
        // Framed glowing ground display window
        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(4.1, 1.72, 0.14), trimMat);
        winFrame.position.set(bx, 1.35, -2.46);
        const win = new THREE.Mesh(new THREE.BoxGeometry(3.85, 1.48, 0.18), warmWindowMat);
        win.position.set(bx, 1.35, -2.42);
        group.add(awning, valance, winFrame, win);
      });

      // Upgraded glass-roof bus stop shelter + wooden bench + bus stop sign
      const shelterMetal = createPlasticBrickMaterial('#334155', { roughness: 0.3, metalness: 0.72 });
      const shelterGlass = new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        roughness: 0.12,
        transparent: true,
        opacity: 0.45,
      });
      for (const sx of [-5.8, -4.1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.75, 8), shelterMetal);
        post.position.set(sx, 1.375, 0.45);
        group.add(post);
      }
      const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 1.25), shelterMetal);
      shelterRoof.position.set(-4.95, 2.78, 0.72);
      const shelterBack = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.35, 0.08), shelterGlass);
      shelterBack.position.set(-4.95, 1.4, 0.45);
      const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.1, 0.48), createPlasticBrickMaterial('#78350f', { roughness: 0.65 }));
      benchSeat.position.set(-4.95, 0.55, 0.76);
      const busPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.75, 0.1),
        createPlasticBrickMaterial('#0ea5e9', { roughness: 0.35 }),
      );
      busPlate.position.set(-3.95, 2.55, 0.75);

      // Sidewalk fire hydrant & city trash bin
      const hydrantMat = createPlasticBrickMaterial('#dc2626', { roughness: 0.32, metalness: 0.45 });
      const hydrantBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.68, 10), hydrantMat);
      hydrantBody.position.set(5.2, 0.34, 1.25);
      const hydrantCap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), hydrantMat);
      hydrantCap.position.set(5.2, 0.7, 1.25);
      const hydrantNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.46, 8), hydrantMat);
      hydrantNozzle.rotation.z = Math.PI / 2;
      hydrantNozzle.position.set(5.2, 0.52, 1.25);
      const trashBin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.84, 10), shelterMetal);
      trashBin.position.set(3.2, 0.42, 0.5);

      group.add(shelterRoof, shelterBack, benchSeat, busPlate, hydrantBody, hydrantCap, hydrantNozzle, trashBin);
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
  const whiteMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.25 });
  const collarMat = createPlasticBrickMaterial('#dc2626', { roughness: 0.45 });
  const tagMat = createPlasticBrickMaterial('#facc15', { roughness: 0.25, metalness: 0.8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.82), furMat);
  body.position.y = 0.42;
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.14), collarMat);
  collar.position.set(0, 0.52, 0.34);
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), tagMat);
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0, 0.46, 0.43);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.38), furMat);
  head.position.set(0, 0.66, 0.42);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), furMat);
  snout.position.set(0, 0.6, 0.64);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.06), noseMat);
  nose.position.set(0, 0.65, 0.76);
  for (const ex of [-0.1, 0.1]) {
    const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), whiteMat);
    sclera.position.set(ex, 0.71, 0.61);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.035), noseMat);
    pupil.position.set(ex, 0.71, 0.62);
    centerWrap.add(sclera, pupil);
  }
  for (const ex of [-0.21, 0.21]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.16), earMat);
    ear.position.set(ex, 0.66, 0.4);
    ear.rotation.z = ex > 0 ? -0.18 : 0.18;
    centerWrap.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.38), furMat);
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
  centerWrap.add(body, collar, tag, head, snout, nose, tail);
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
  const pinkMat = createPlasticBrickMaterial('#f472b6', { roughness: 0.45 });
  const whiskerMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.58), furMat);
  body.position.y = 0.3;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.12), stripeMat);
  stripe.position.set(0, 0.39, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.26), furMat);
  head.position.set(0, 0.48, 0.3);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.04), pinkMat);
  nose.position.set(0, 0.45, 0.44);
  for (const ex of [-0.09, 0.09]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), stripeMat);
    ear.position.set(ex, 0.65, 0.3);
    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.07, 4), pinkMat);
    innerEar.position.set(ex, 0.64, 0.325);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), eyeMat);
    eye.position.set(ex * 0.7, 0.5, 0.43);
    const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.015), whiskerMat);
    whisker.position.set(ex * 1.4, 0.44, 0.43);
    centerWrap.add(ear, innerEar, eye, whisker);
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
  centerWrap.add(body, stripe, head, nose, tail);
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
      // Translucent falling storm rain streaks for lively atmosphere
      const rainMat = new THREE.MeshBasicMaterial({
        color: '#bae6fd',
        transparent: true,
        opacity: 0.36,
      });
      for (let i = 0; i < 16; i++) {
        const streak = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.03), rainMat);
        const rx = -4.2 + ((i * 1.37) % 8.4);
        const rz = -0.8 + ((i * 0.91) % 4.6);
        streak.position.set(rx, 8.5, rz);
        streak.userData.isStormStreak = true;
        streak.userData.streakPhase = i * 0.37;
        streak.userData.baseX = rx;
        streak.userData.baseZ = rz;
        root.add(streak);
      }
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
      const gripMat = createPlasticBrickMaterial(accentColor, { roughness: 0.56 });

      const umb = new THREE.Group();
      umb.position.set(0, 0.24, 0);
      umb.rotation.set(0.32, 0, -0.16);

      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.92, 0.34, 12),
        steelMat,
      );
      canopy.rotation.x = Math.PI;
      canopy.position.y = 0.04;

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.036, 8, 22),
        rivetMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.21;

      // 8 Forged radial steel ribs & rim rivets
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.9), rivetMat);
        rib.position.set(Math.sin(ang) * 0.45, 0.06, Math.cos(ang) * 0.45);
        rib.rotation.y = ang;
        rib.rotation.x = -0.34;
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), rivetMat);
        rivet.position.set(Math.sin(ang) * 0.88, 0.21, Math.cos(ang) * 0.88);
        umb.add(rib, rivet);
      }

      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), rivetMat);
      finial.rotation.x = Math.PI;
      finial.position.y = -0.18;

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.78, 8), rivetMat);
      shaft.position.y = 0.42;

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.22, 8), gripMat);
      handle.position.y = 0.82;
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.036, 6, 12, Math.PI), gripMat);
      hook.position.set(0.085, 0.92, 0);

      umb.add(canopy, rim, finial, shaft, handle, hook);
      root.add(umb);
      break;
    }

    case 'beanWaterfall': {
      const beanMatA = createPlasticBrickMaterial(primaryColor, { roughness: 0.34, metalness: 0.08 });
      const beanMatB = createPlasticBrickMaterial(accentColor, { roughness: 0.38, metalness: 0.06 });
      const beanMatC = createPlasticBrickMaterial('#d97706', { roughness: 0.32, metalness: 0.1 });

      // 30 Cascading pinto/kidney beans pouring from mouth height across cafe table to floor
      for (let i = 0; i < 30; i++) {
        const t = i / 29;
        const arcZ = t * 1.18;
        const arcY = 1.95 - t * t * 1.82;
        const bean = new THREE.Mesh(
          new THREE.SphereGeometry(0.072 + (i % 3) * 0.018, 8, 6),
          i % 3 === 0 ? beanMatA : i % 3 === 1 ? beanMatB : beanMatC,
        );
        bean.scale.set(1.25, 0.82, 0.92);
        bean.position.set(Math.sin(i * 1.9) * 0.15, arcY, arcZ);
        bean.userData.isBeanDrop = true;
        bean.userData.beanIndex = i;
        bean.userData.baseX = bean.position.x;
        bean.userData.baseZ = bean.position.z;
        root.add(bean);
      }

      // Growing bean mound on table & floor with bumpy bean pebble clusters
      const tablePile = new THREE.Mesh(
        new THREE.ConeGeometry(0.72, 0.44, 14),
        beanMatA,
      );
      tablePile.position.set(0, 1.24, 0.68);
      tablePile.userData.isBeanPile = true;
      tablePile.userData.pileBaseY = 1.12;
      tablePile.userData.pileHeight = 0.44;

      const floorPile = new THREE.Mesh(
        new THREE.ConeGeometry(1.24, 0.56, 16),
        beanMatB,
      );
      floorPile.position.set(0, 0.28, 1.25);
      floorPile.userData.isBeanPile = true;
      floorPile.userData.pileBaseY = 0.0;
      floorPile.userData.pileHeight = 0.56;

      // Scattered loose beans spilling around the base of the floor mound
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const rad = 0.9 + (i % 3) * 0.22;
        const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), i % 2 === 0 ? beanMatA : beanMatC);
        pebble.scale.set(1.2, 0.75, 0.9);
        pebble.position.set(Math.cos(ang) * rad, 0.06, 1.25 + Math.sin(ang) * rad * 0.75);
        root.add(pebble);
      }

      root.add(tablePile, floorPile);
      break;
    }

    case 'africanElephant': {
      const skinMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.82 });
      const darkSkinMat = createPlasticBrickMaterial('#475569', { roughness: 0.85 });
      const tuskMat = createPlasticBrickMaterial('#fef3c7', { roughness: 0.3 });
      const lanyardMat = createPlasticBrickMaterial(accentColor, { roughness: 0.45 });
      const badgeMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.35 });
      const staplerMat = createPlasticBrickMaterial('#dc2626', { roughness: 0.3 });
      const eyeWhite = createPlasticBrickMaterial('#f8fafc', { roughness: 0.25 });
      const eyePupil = createPlasticBrickMaterial('#0f172a', { roughness: 0.2 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.5, 2.28), skinMat);
      torso.position.set(0, 1.08, 0);

      for (const [lx, lz] of [
        [-0.58, 0.78],
        [0.58, 0.78],
        [-0.58, -0.78],
        [0.58, -0.78],
      ]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.95, 12), skinMat);
        leg.position.set(lx, 0.475, lz);
        root.add(leg);
        // 3 Ivory toenails per foot
        for (const nx of [-0.12, 0, 0.12]) {
          const nail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), tuskMat);
          nail.position.set(lx + nx, 0.06, lz + 0.31);
          root.add(nail);
        }
      }

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.16, 1.16), skinMat);
      head.position.set(0, 1.72, 1.25);

      // Expressive side eyes
      for (const ex of [-0.56, 0.56]) {
        const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.18), eyeWhite);
        sclera.position.set(ex, 1.88, 1.58);
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.1), eyePupil);
        pupil.position.set(ex + (ex > 0 ? 0.01 : -0.01), 1.88, 1.62);
        root.add(sclera, pupil);
      }

      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.08, 0.86), skinMat);
      earL.position.set(-0.75, 1.76, 1.08);
      earL.rotation.y = 0.42;
      earL.userData.isElephantEar = -1;

      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.08, 0.86), skinMat);
      earR.position.set(0.75, 1.76, 1.08);
      earR.rotation.y = -0.42;
      earR.userData.isElephantEar = 1;

      // Segmented wrinkled trunk with red stapler
      const trunkPivot = new THREE.Group();
      trunkPivot.position.set(0, 1.48, 1.84);
      trunkPivot.userData.isElephantTrunk = true;
      const trunkUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.82, 10), skinMat);
      trunkUpper.position.set(0, -0.28, 0.16);
      trunkUpper.rotation.x = -0.45;
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17 - r * 0.015, 0.025, 6, 12), darkSkinMat);
        ring.rotation.x = Math.PI / 2 - 0.45;
        ring.position.set(0, -0.14 - r * 0.16, 0.08 + r * 0.07);
        trunkPivot.add(ring);
      }
      const trunkTip = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.42, 10), skinMat);
      trunkTip.position.set(0, -0.62, 0.32);
      trunkTip.rotation.x = 0.25;
      // Two-part red stapler pinched in trunk tip
      const staplerBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.12), staplerMat);
      staplerBase.position.set(0, -0.78, 0.36);
      const staplerTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.12), staplerMat);
      staplerTop.position.set(0, -0.71, 0.36);
      staplerTop.userData.isStaplerJaw = true;
      trunkPivot.add(trunkUpper, trunkTip, staplerBase, staplerTop);

      // Curved multi-segment ivory tusks
      for (const tx of [-0.36, 0.36]) {
        const tuskBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.38, 10), tuskMat);
        tuskBase.position.set(tx, 1.34, 1.84);
        tuskBase.rotation.x = 1.15;
        const tuskTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.36, 10), tuskMat);
        tuskTip.position.set(tx * 1.05, 1.32, 2.14);
        tuskTip.rotation.x = 0.78;
        root.add(tuskBase, tuskTip);
      }

      // Swishing tail with tuft
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 1.15, -1.16);
      tailPivot.userData.isElephantTail = true;
      const tailRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.65, 8), skinMat);
      tailRod.position.set(0, -0.32, -0.06);
      tailRod.rotation.x = 0.2;
      const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), darkSkinMat);
      tailTuft.position.set(0, -0.66, -0.12);
      tailTuft.rotation.x = Math.PI + 0.2;
      tailPivot.add(tailRod, tailTuft);

      // Bright Visitor Lanyard around neck
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.055, 8, 22), lanyardMat);
      strap.position.set(0, 1.36, 0.96);
      strap.rotation.x = Math.PI / 2 - 0.35;
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.04), badgeMat);
      badge.position.set(0, 0.92, 1.66);

      root.add(torso, head, earL, earR, trunkPivot, tailPivot, strap, badge);
      break;
    }

    case 'iceFeet': {
      const iceMat = new THREE.MeshStandardMaterial({
        color: primaryColor,
        emissive: '#38bdf8',
        emissiveIntensity: 0.34,
        roughness: 0.1,
        metalness: 0.18,
        transparent: true,
        opacity: 0.78,
      });
      const coreGlowMat = new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        emissive: '#7dd3fc',
        emissiveIntensity: 0.65,
        roughness: 0.15,
      });
      const snowMat = createPlasticBrickMaterial(accentColor, { roughness: 0.78 });

      // Frosted ground puddle disc + twin faceted glacier crystal blocks encasing groom shoes
      const iceCluster = new THREE.Group();
      iceCluster.userData.isIceCluster = true;
      const frostPuddle = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.92, 0.04, 16), iceMat);
      frostPuddle.position.set(0, 0.02, 0.06);
      iceCluster.add(frostPuddle);

      for (const ix of [-0.28, 0.28]) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.74), iceMat);
        block.position.set(ix, 0.29, 0.06);
        const innerCore = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.48), coreGlowMat);
        innerCore.position.set(ix, 0.26, 0.06);
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), iceMat);
        shard.position.set(ix + (ix > 0 ? 0.18 : -0.18), 0.54, -0.06);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.46, 5), iceMat);
        spire.position.set(ix * 1.35, 0.34, 0.34);
        spire.rotation.x = 0.25;
        iceCluster.add(block, innerCore, shard, spire);
      }
      root.add(iceCluster);

      // 6 Rising cold mist puffs
      for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), snowMat);
        puff.position.set((i - 2.5) * 0.2, 0.72 + (i % 2) * 0.18, 0.1 + (i % 3 - 1) * 0.14);
        puff.userData.isIceSteam = true;
        puff.userData.steamPhase = i * 1.1;
        root.add(puff);
      }
      break;
    }

    case 'plasterCast': {
      const plasterMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.85 });
      const bandageMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.78 });
      const stripeMat = createPlasticBrickMaterial(accentColor, { roughness: 0.52 });
      const blueSigMat = createPlasticBrickMaterial('#2563eb', { roughness: 0.5 });

      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.26, 0.96, 12), plasterMat);
      shell.position.set(0, 0.52, 0);
      const topCuff = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 8, 16), bandageMat);
      topCuff.rotation.x = Math.PI / 2;
      topCuff.position.set(0, 0.98, 0);
      for (const ry of [0.36, 0.58, 0.78]) {
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.025, 6, 14), bandageMat);
        wrap.rotation.x = Math.PI / 2 + 0.14;
        wrap.position.set(0, ry, 0);
        root.add(wrap);
      }
      const footBoot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.68), plasterMat);
      footBoot.position.set(0, 0.17, 0.14);
      const doodleRed = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.12), stripeMat);
      doodleRed.position.set(0, 0.64, 0.22);
      const doodleBlue = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.12), blueSigMat);
      doodleBlue.position.set(0, 0.44, 0.22);
      doodleBlue.rotation.z = -0.18;
      root.add(shell, topCuff, footBoot, doodleRed, doodleBlue);
      break;
    }

    case 'stretcher': {
      const frameMat = createPlasticBrickMaterial('#cbd5e1', {
        roughness: 0.22,
        metalness: 0.82,
      });
      const padMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.65 });
      const pillowMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.72 });
      const strapMat = createPlasticBrickMaterial('#18181b', { roughness: 0.7 });
      const wheelMat = createPlasticBrickMaterial('#18181b', { roughness: 0.82 });

      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 2.25), padMat);
      bed.position.y = 0.84;
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.38), pillowMat);
      pillow.position.set(0, 0.98, -0.78);
      for (const sz of [-0.2, 0.45]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.12), strapMat);
        strap.position.set(0, 0.93, sz);
        root.add(strap);
      }

      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 1.9), frameMat);
      railL.position.set(-0.48, 0.98, 0);
      const railR = railL.clone();
      railR.position.x = 0.48;

      // Folding scissor X-frame struts
      for (const sx of [-0.36, 0.36]) {
        const xA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.75), frameMat);
        xA.position.set(sx, 0.46, 0);
        xA.rotation.x = 0.42;
        const xB = xA.clone();
        xB.rotation.x = -0.42;
        root.add(xA, xB);
      }

      // Stainless IV drip pole + translucent IV bag
      const ivPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.35, 8), frameMat);
      ivPole.position.set(-0.44, 1.52, -0.95);
      const ivBag = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.26, 0.08),
        new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.18, transparent: true, opacity: 0.72 }),
      );
      ivBag.position.set(-0.34, 1.98, -0.95);
      root.add(ivPole, ivBag);

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
      root.add(bed, pillow, railL, railR);
      break;
    }

    case 'clydesdalePlatter': {
      const cartMat = createPlasticBrickMaterial('#94a3b8', { roughness: 0.28, metalness: 0.78 });
      const linenMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.75 });
      const silverMat = new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.1,
        metalness: 0.94,
      });
      const parsleyMat = createPlasticBrickMaterial('#16a34a', { roughness: 0.68 });
      const lemonMat = createPlasticBrickMaterial('#facc15', { roughness: 0.42 });
      const horseMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.72 });
      const featherMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.78 });
      const hoofMat = createPlasticBrickMaterial('#18181b', { roughness: 0.55 });
      const maneMat = createPlasticBrickMaterial(accentColor, { roughness: 0.76 });
      const bridleMat = createPlasticBrickMaterial('#451a03', { roughness: 0.52 });
      const steamMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        transparent: true,
        opacity: 0.45,
        roughness: 0.9,
      });

      // Rolling kitchen cart with white linen skirt + chrome push handle
      const cartDeck = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.12, 2.58), cartMat);
      cartDeck.position.y = 0.78;
      const linenSkirt = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.44, 2.5), linenMat);
      linenSkirt.position.y = 0.54;
      const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8), cartMat);
      handleBar.rotation.z = Math.PI / 2;
      handleBar.position.set(0, 1.12, -1.35);
      for (const hx of [-0.66, 0.66]) {
        const hPost = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8), cartMat);
        hPost.position.set(hx, 0.96, -1.3);
        root.add(hPost);
      }
      root.add(linenSkirt, handleBar);

      for (const [wx, wz] of [
        [-0.62, 1.05],
        [0.62, 1.05],
        [-0.62, -1.05],
        [0.62, -1.05],
      ]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.68, 8), cartMat);
        leg.position.set(wx, 0.42, wz);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), hoofMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.12, wz);
        wheel.userData.isCartWheel = true;
        root.add(leg, wheel);
      }

      // Giant gleaming silver platter + scalloped rim + parsley sprigs & lemon wedge
      const platter = new THREE.Mesh(
        new THREE.CylinderGeometry(1.06, 0.92, 0.08, 22),
        silverMat,
      );
      platter.scale.set(0.86, 1, 1.36);
      platter.position.y = 0.88;
      const platterRim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.045, 8, 26), silverMat);
      platterRim.rotation.x = Math.PI / 2;
      platterRim.scale.set(0.86, 1.36, 1);
      platterRim.position.y = 0.92;
      const parsleyStem = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), parsleyMat);
      parsleyStem.position.set(0.48, 0.99, 0.92);
      const parsleyStem2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), parsleyMat);
      parsleyStem2.position.set(0.32, 0.97, 1.04);
      const lemonWedge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8, 1, false, 0, Math.PI), lemonMat);
      lemonWedge.rotation.z = Math.PI / 2;
      lemonWedge.position.set(-0.46, 0.97, 0.96);
      root.add(platterRim, parsleyStem2, lemonWedge);

      // Rising hot-dish steam wisps off the platter
      for (let i = 0; i < 5; i++) {
        const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), steamMat);
        wisp.position.set((i - 2) * 0.34, 1.15, 0.65 - (i % 2) * 0.8);
        wisp.userData.isHotSteam = true;
        wisp.userData.steamPhase = i * 0.9;
        root.add(wisp);
      }

      // Full-sized confused Clydesdale horse standing on the platter
      const hGroup = new THREE.Group();
      hGroup.position.set(0, 0.92, 0);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.86, 1.78), horseMat);
      body.position.set(0, 1.24, 0);
      for (const [hx, hz] of [
        [-0.28, 0.65],
        [0.28, 0.65],
        [-0.28, -0.65],
        [0.28, -0.65],
      ]) {
        const legUpper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.56, 0.2), horseMat);
        legUpper.position.set(hx, 0.66, hz);
        const legFeather = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.32, 0.25), featherMat);
        legFeather.position.set(hx, 0.24, hz);
        const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.24), hoofMat);
        hoof.position.set(hx, 0.05, hz);
        hGroup.add(legUpper, legFeather, hoof);
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
      const bridle = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.08, 0.14), bridleMat);
      bridle.position.set(0, 0.68, 0.68);
      for (const ex of [-0.15, 0.15]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), horseMat);
        ear.position.set(ex, 0.98, 0.28);
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.08), hoofMat);
        eye.position.set(ex * 1.3, 0.78, 0.48);
        neckHead.add(ear, eye);
      }
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.18), maneMat);
      mane.position.set(0, 0.48, -0.02);
      mane.rotation.x = 0.35;
      neckHead.add(neck, head, blaze, bridle, mane);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.84, 0.16), maneMat);
      tail.position.set(0, 1.05, -0.96);
      tail.rotation.x = 0.22;
      tail.userData.isHorseTail = true;

      hGroup.add(body, neckHead, tail);
      root.add(cartDeck, platter, parsleyStem, hGroup);
      break;
    }

    case 'flyingPigs': {
      const pigMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.58 });
      const wingMat = createPlasticBrickMaterial(accentColor, { roughness: 0.42 });
      const snoutMat = createPlasticBrickMaterial('#f472b6', { roughness: 0.5 });
      const eyeMat = createPlasticBrickMaterial('#18181b', { roughness: 0.25 });
      const sparkleMat = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#facc15',
        emissiveIntensity: 1.4,
        roughness: 0.2,
      });

      const placements: [number, number, number, number][] = [
        [-2.8, 4.5, -2.5, 0],
        [-0.4, 5.4, -4.4, 1.2],
        [2.4, 4.4, -1.9, 2.5],
        [-4.2, 5.1, -3.6, 3.8],
        [4.0, 5.3, -3.4, 5.1],
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
        for (const ex of [-0.14, 0.14]) {
          const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.04), eyeMat);
          eye.position.set(ex, 0.16, 0.77);
          const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), snoutMat);
          ear.position.set(ex * 1.45, 0.34, 0.5);
          ear.rotation.z = ex > 0 ? -0.35 : 0.35;
          pig.add(eye, ear);
        }
        const curlyTail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 10), snoutMat);
        curlyTail.position.set(0, 0.1, -0.5);
        pig.add(curlyTail);

        // Dual-segment feathered wings
        for (const side of [-1, 1]) {
          const wingPivot = new THREE.Group();
          wingPivot.position.set(side * 0.32, 0.22, 0);
          wingPivot.userData.isPigWing = side;
          const innerWing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.38), wingMat);
          innerWing.position.set(side * 0.23, 0, 0);
          const outerWing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.26), createPlasticBrickMaterial('#ffffff', { roughness: 0.38 }));
          outerWing.position.set(side * 0.56, 0.02, -0.04);
          wingPivot.add(innerWing, outerWing);
          pig.add(wingPivot);
        }

        const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), sparkleMat);
        sparkle.position.set(0, -0.1, -0.78);
        sparkle.userData.isPigSparkle = true;
        sparkle.userData.sparklePhase = phase;
        pig.add(body, head, snout, sparkle);
        root.add(pig);
      });
      break;
    }

    case 'grocerySpill': {
      const bagMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.85 });
      const appleMat = createPlasticBrickMaterial(accentColor, { roughness: 0.35 });
      const redAppleMat = createPlasticBrickMaterial('#dc2626', { roughness: 0.32 });
      const breadMat = createPlasticBrickMaterial('#d97706', { roughness: 0.72 });
      const milkMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.38 });
      const ojMat = createPlasticBrickMaterial('#f97316', { roughness: 0.3 });
      const celeryMat = createPlasticBrickMaterial('#4ade80', { roughness: 0.65 });

      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.76), bagMat);
      bag.position.set(0, 0.21, 0);
      bag.rotation.y = 0.35;
      const bagCuff = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.14), createPlasticBrickMaterial('#b45309', { roughness: 0.88 }));
      bagCuff.position.set(0.14, 0.24, 0.36);
      bagCuff.rotation.y = 0.35;

      const baguette = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8), breadMat);
      baguette.rotation.set(Math.PI / 2, 0.4, 0.2);
      baguette.position.set(0.28, 0.08, 0.48);

      const celery = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.56, 6), celeryMat);
      celery.rotation.set(Math.PI / 2, -0.25, 0.15);
      celery.position.set(-0.08, 0.07, 0.46);

      const milk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.18), milkMat);
      milk.rotation.z = 1.45;
      milk.position.set(-0.34, 0.09, 0.42);
      milk.userData.isSpillItem = true;
      milk.userData.baseX = -0.34;
      milk.userData.baseZ = 0.42;
      milk.userData.rollDirX = -0.55;
      milk.userData.rollDirZ = 0.42;

      const ojBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.32, 10), ojMat);
      ojBottle.rotation.x = Math.PI / 2;
      ojBottle.position.set(0.32, 0.09, 0.58);
      ojBottle.userData.isSpillItem = true;
      ojBottle.userData.baseX = 0.32;
      ojBottle.userData.baseZ = 0.58;
      ojBottle.userData.rollDirX = 0.62;
      ojBottle.userData.rollDirZ = 0.52;

      const appleCoords: [number, number, number, number, boolean][] = [
        [0.14, 0.68, 0.35, 0.75, false],
        [-0.18, 0.62, -0.45, 0.65, true],
        [0.45, 0.24, 0.72, 0.38, true],
        [-0.38, 0.22, -0.64, 0.28, false],
      ];
      appleCoords.forEach(([ax, az, vx, vz, isRed]) => {
        const apple = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), isRed ? redAppleMat : appleMat);
        apple.position.set(ax, 0.1, az);
        apple.userData.isSpillItem = true;
        apple.userData.baseX = ax;
        apple.userData.baseZ = az;
        apple.userData.rollDirX = vx;
        apple.userData.rollDirZ = vz;
        root.add(apple);
      });
      root.add(bag, bagCuff, baguette, celery, milk, ojBottle);
      break;
    }

    case 'parkedSedan': {
      const paintMat = createStudBrickMaterial(primaryColor, studTextures, 2, 4, {
        roughness: 0.24,
        metalness: 0.35,
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#93c5fd',
        roughness: 0.12,
        metalness: 0.28,
      });
      const tireMat = createPlasticBrickMaterial('#18181b', { roughness: 0.88 });
      const hubMat = createPlasticBrickMaterial('#cbd5e1', { roughness: 0.2, metalness: 0.85 });
      const bumperMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.25,
        metalness: 0.75,
      });
      const grilleMat = createPlasticBrickMaterial('#0f172a', { roughness: 0.4, metalness: 0.6 });
      const headlightMat = new THREE.MeshStandardMaterial({
        color: '#fef9c3',
        emissive: '#fef08a',
        emissiveIntensity: 1.2,
        roughness: 0.15,
      });
      const taillightMat = new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#dc2626',
        emissiveIntensity: 1.0,
        roughness: 0.2,
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
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.26, 0.08), grilleMat);
      grille.position.set(0, 0.68, 2.18);

      // Headlights, taillights & side mirrors
      for (const side of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.08), headlightMat);
        hl.position.set(side * 0.74, 0.72, 2.18);
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), taillightMat);
        tl.position.set(side * 0.72, 0.74, -2.18);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.14), paintMat);
        mirror.position.set(side * 1.04, 1.18, 0.62);
        root.add(hl, tl, mirror);
      }

      for (const [tx, tz] of [
        [-1.06, 1.35],
        [1.06, 1.35],
        [-1.06, -1.35],
        [1.06, -1.35],
      ]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(tx, 0.38, tz);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), hubMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(tx, 0.38, tz);
        root.add(tire, hub);
      }
      root.add(chassis, cabin, windshield, bumperF, bumperR, grille);
      break;
    }

    case 'sightseeingBus': {
      const busMat = createStudBrickMaterial(primaryColor, studTextures, 2, 6, {
        roughness: 0.32,
      });
      const trimMat = createPlasticBrickMaterial(accentColor, { roughness: 0.4 });
      const hubMat = createPlasticBrickMaterial('#cbd5e1', { roughness: 0.22, metalness: 0.84 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        roughness: 0.14,
        metalness: 0.24,
      });
      const tireMat = createPlasticBrickMaterial('#18181b', { roughness: 0.88 });
      const headlightMat = new THREE.MeshStandardMaterial({
        color: '#fef9c3',
        emissive: '#fef08a',
        emissiveIntensity: 1.25,
        roughness: 0.15,
      });
      const destMat = new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#f59e0b',
        emissiveIntensity: 1.15,
        roughness: 0.2,
      });
      const taillightMat = new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#dc2626',
        emissiveIntensity: 1.0,
        roughness: 0.2,
      });
      const bannerTex = createTourBusBannerTexture(512);
      const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.4, 6.8), busMat);
      body.position.y = 1.65;
      const windows = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.86, 5.9), glassMat);
      windows.position.set(0, 2.08, 0.1);
      const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.96, 0.1), glassMat);
      frontWindshield.position.set(0, 2.0, 3.4);
      const destSign = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.26, 0.1), destMat);
      destSign.position.set(0, 2.66, 3.4);

      const bannerL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 4.6), bannerMat);
      bannerL.position.set(-1.3, 1.15, 0);
      const bannerR = bannerL.clone();
      bannerR.position.x = 1.3;
      const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.22, 5.8), trimMat);
      roofDeck.position.y = 2.95;

      // Twin rooftop HVAC pods
      for (const az of [-1.2, 1.1]) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.28, 1.25), hubMat);
        ac.position.set(0, 3.16, az);
        root.add(ac);
      }

      // Headlights, taillights & mirrors
      for (const side of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.1), headlightMat);
        hl.position.set(side * 0.88, 0.92, 3.4);
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.1), taillightMat);
        tl.position.set(side * 0.92, 1.02, -3.4);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.14), trimMat);
        mirror.position.set(side * 1.4, 2.05, 3.15);
        root.add(hl, tl, mirror);
      }

      for (const [tx, tz] of [
        [-1.25, 2.1],
        [1.25, 2.1],
        [-1.25, -2.1],
        [1.25, -2.1],
      ]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 14), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(tx, 0.52, tz);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 10), hubMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(tx, 0.52, tz);
        root.add(tire, hub);
      }
      root.add(body, windows, frontWindshield, destSign, bannerL, bannerR, roofDeck);
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
      } else if (obj.userData?.isStormStreak) {
        const active = time >= 3.45;
        obj.visible = active;
        if (active) {
          const phase = (obj.userData.streakPhase as number) ?? 0;
          const drop = ((time * 2.4 + phase) % 1);
          obj.position.y = 10.5 - drop * 10.2;
        }
      }
    });
  } else if (propKind === 'beanWaterfall') {
    const spillGrowth = THREE.MathUtils.clamp((time - 16.0) / 2.4, 0.15, 1.0);
    group.traverse((obj) => {
      if (obj.userData?.isBeanDrop) {
        const idx = (obj.userData.beanIndex as number) ?? 0;
        const flowT = (time * 2.9 + idx / 30) % 1;
        // Pour from mouth (z=0, y=1.95) onto table (z=0.68, y=1.12), then splash down to floor (z=1.25, y=0.14)
        if (flowT < 0.56) {
          const u = flowT / 0.56;
          obj.position.z = u * 0.68;
          obj.position.y = 1.95 - u * u * 0.83;
        } else {
          const u = (flowT - 0.56) / 0.44;
          const bounce = Math.sin(u * Math.PI) * 0.2;
          obj.position.z = 0.68 + u * 0.57;
          obj.position.y = 1.12 + bounce - u * u * 1.0;
        }
        obj.rotation.x = time * 8 + idx;
        obj.rotation.z = time * 5 + idx * 0.7;
      } else if (obj.userData?.isBeanPile) {
        const baseY = (obj.userData.pileBaseY as number) ?? 0;
        const height = (obj.userData.pileHeight as number) ?? 0.42;
        obj.scale.set(0.65 + spillGrowth * 0.42, spillGrowth, 0.65 + spillGrowth * 0.42);
        obj.position.y = baseY + (height * spillGrowth) / 2;
      }
    });
  } else if (propKind === 'africanElephant') {
    group.traverse((obj) => {
      const earSide = obj.userData?.isElephantEar as number | undefined;
      if (earSide) {
        obj.rotation.y = earSide * (-0.42 + Math.sin(time * 3.1) * 0.16);
      } else if (obj.userData?.isElephantTrunk) {
        obj.rotation.x = Math.sin(time * 4.2) * 0.18;
      } else if (obj.userData?.isElephantTail) {
        obj.rotation.z = Math.sin(time * 5.2) * 0.24;
      } else if (obj.userData?.isStaplerJaw) {
        obj.rotation.z = Math.max(0, Math.sin(time * 7.5)) * 0.28;
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
        const steamSpeed = 0.85 + meltT * 1.65;
        const lift = (time * steamSpeed + phase) % 1;
        obj.position.y = 0.52 + lift * (0.95 + meltT * 0.45);
        obj.scale.setScalar((0.72 + lift * 0.75) * (1 + meltT * 0.35));
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
        obj.rotation.z = Math.sin(time * 2.2) * 0.09;
        obj.rotation.x = Math.sin(time * 1.6) * 0.07;
      } else if (obj.userData?.isHorseTail) {
        obj.rotation.z = Math.sin(time * 4.4) * 0.2;
      } else if (obj.userData?.isCartWheel) {
        obj.rotation.x = rolling ? (time - 69.4) * 8.5 : 0;
      } else if (obj.userData?.isHotSteam) {
        const phase = (obj.userData.steamPhase as number) ?? 0;
        const lift = (time * 0.75 + phase) % 1;
        obj.position.y = 1.05 + lift * 1.35;
        obj.scale.setScalar(0.55 + Math.sin(lift * Math.PI) * 0.8);
      }
    });
  } else if (propKind === 'flyingPigs') {
    group.traverse((obj) => {
      if (obj.userData?.isFlyingPig) {
        const bx = (obj.userData.baseX as number) ?? 0;
        const by = (obj.userData.baseY as number) ?? 4.6;
        const phase = (obj.userData.pigPhase as number) ?? 0;
        const theta = time * 0.88 + phase;
        const dx = Math.cos(theta) * 2.1 * 0.88;
        obj.position.x = bx + Math.sin(theta) * 2.1;
        obj.position.y = by + Math.sin(time * 2.6 + phase) * 0.36;
        obj.rotation.y = dx >= 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
        obj.rotation.z = -Math.cos(theta) * 0.26;
      } else if (obj.userData?.isPigSparkle) {
        const phase = (obj.userData.sparklePhase as number) ?? 0;
        const s = 0.65 + Math.sin(time * 9 + phase) * 0.4;
        obj.scale.setScalar(s);
        obj.rotation.y = time * 4 + phase;
      } else {
        const wingSide = obj.userData?.isPigWing as number | undefined;
        if (wingSide) {
          obj.rotation.z = wingSide * Math.sin(time * 9.0) * 0.52;
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
