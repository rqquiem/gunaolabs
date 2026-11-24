import * as THREE from 'three';
import { createPlasticBrickMaterial, createStudBrickMaterial, StudTexturePair } from './robloxTextures';
import { ItemId, PropKind } from './types';

// Match R6 character stud scale
const S = 0.55;

function setShadows(group: THREE.Object3D, cast = true, receive = true) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

// =========================================================================
// 12 Holdable 3D Item Models (Grip-Origin Centered at (0, 0, 0))
// =========================================================================

export function buildItemModelGroup(
  itemId: ItemId,
  primaryColor: string,
  accentColor: string,
  studTextures?: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();

  switch (itemId) {
    case 'linkedSword': {
      const bladeMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.16,
        metalness: 0.72,
      });
      const hiltMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.48,
        metalness: 0.25,
      });
      const gripMat = createPlasticBrickMaterial('#1b2a35', { roughness: 0.72 });

      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11 * S, 0.12 * S, 0.78 * S, 12),
        gripMat,
      );
      grip.rotation.x = Math.PI / 2;

      const pommel = new THREE.Mesh(
        new THREE.SphereGeometry(0.16 * S, 12, 10),
        hiltMat,
      );
      pommel.position.z = -0.44 * S;

      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.76 * S, 0.18 * S, 0.16 * S),
        hiltMat,
      );
      guard.position.z = 0.38 * S;

      const guardCapL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1 * S, 0.1 * S, 0.14 * S, 10),
        hiltMat,
      );
      guardCapL.rotation.z = Math.PI / 2;
      guardCapL.position.set(0.41 * S, 0, 0.38 * S);
      const guardCapR = guardCapL.clone();
      guardCapR.position.x = -0.41 * S;

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 * S, 0.28 * S, 2.32 * S),
        bladeMat,
      );
      blade.position.z = 1.58 * S;

      const fuller = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * S, 0.1 * S, 1.85 * S),
        hiltMat,
      );
      fuller.position.z = 1.42 * S;

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.19 * S, 0.42 * S, 4),
        bladeMat,
      );
      tip.rotation.x = Math.PI / 2;
      tip.rotation.z = Math.PI / 4;
      tip.position.z = 2.94 * S;

      root.add(grip, pommel, guard, guardCapL, guardCapR, blade, fuller, tip);
      break;
    }

    case 'laserBlaster': {
      const bodyMat = studTextures
        ? createStudBrickMaterial(primaryColor, studTextures, 1, 2, {
            roughness: 0.34,
            metalness: 0.25,
          })
        : createPlasticBrickMaterial(primaryColor, { roughness: 0.34, metalness: 0.25 });
      const glowMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.95,
        roughness: 0.15,
        metalness: 0.2,
      });
      const darkMat = createPlasticBrickMaterial('#1b2a35', {
        roughness: 0.65,
        metalness: 0.18,
      });

      const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.24 * S, 0.66 * S, 0.28 * S),
        darkMat,
      );
      grip.position.set(0, -0.08 * S, -0.04 * S);
      grip.rotation.x = -0.22;

      const receiver = new THREE.Mesh(
        new THREE.BoxGeometry(0.34 * S, 0.42 * S, 1.18 * S),
        bodyMat,
      );
      receiver.position.set(0, 0.28 * S, 0.32 * S);

      const sightRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * S, 0.12 * S, 0.62 * S),
        darkMat,
      );
      sightRail.position.set(0, 0.54 * S, 0.25 * S);

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11 * S, 0.13 * S, 0.92 * S, 12),
        glowMat,
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.3 * S, 1.25 * S);

      const muzzleRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.14 * S, 0.035 * S, 8, 16),
        darkMat,
      );
      muzzleRing.position.set(0, 0.3 * S, 1.68 * S);

      const coreStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.38 * S, 0.12 * S, 0.56 * S),
        glowMat,
      );
      coreStrip.position.set(0, 0.29 * S, 0.36 * S);

      root.add(grip, receiver, sightRail, barrel, muzzleRing, coreStrip);
      break;
    }

    case 'bloxyCola': {
      const canMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.26,
        metalness: 0.42,
      });
      const silverMat = createPlasticBrickMaterial('#e2e8f0', {
        roughness: 0.18,
        metalness: 0.85,
      });
      const bandMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.42,
        metalness: 0.1,
      });

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 * S, 0.25 * S, 0.72 * S, 18),
        canMat,
      );
      body.position.y = 0.04 * S;

      const topLip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21 * S, 0.25 * S, 0.09 * S, 18),
        silverMat,
      );
      topLip.position.y = 0.44 * S;

      const bottomLip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 * S, 0.21 * S, 0.08 * S, 18),
        silverMat,
      );
      bottomLip.position.y = -0.35 * S;

      const labelBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.256 * S, 0.256 * S, 0.22 * S, 18),
        bandMat,
      );
      labelBand.position.y = 0.08 * S;

      const tab = new THREE.Mesh(
        new THREE.BoxGeometry(0.11 * S, 0.03 * S, 0.18 * S),
        silverMat,
      );
      tab.position.set(0, 0.49 * S, 0.04 * S);

      root.add(body, topLip, bottomLip, labelBand, tab);
      break;
    }

    case 'pizzaSlice': {
      const cheeseMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.48 });
      const crustMat = createPlasticBrickMaterial('#b4692e', { roughness: 0.78 });
      const pepMat = createPlasticBrickMaterial(accentColor, { roughness: 0.42 });

      // Extruded triangular wedge pointing forward (+Z)
      const sliceShape = new THREE.Shape();
      sliceShape.moveTo(-0.34 * S, 0);
      sliceShape.lineTo(0.34 * S, 0);
      sliceShape.lineTo(0, 0.85 * S);
      sliceShape.closePath();

      const wedgeGeo = new THREE.ExtrudeGeometry(sliceShape, {
        depth: 0.09 * S,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.02 * S,
        bevelThickness: 0.02 * S,
      });
      wedgeGeo.rotateX(Math.PI / 2);

      const cheese = new THREE.Mesh(wedgeGeo, cheeseMat);
      cheese.position.set(0, 0.05 * S, -0.1 * S);

      const crust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085 * S, 0.085 * S, 0.76 * S, 12),
        crustMat,
      );
      crust.rotation.z = Math.PI / 2;
      crust.position.set(0, 0.04 * S, -0.1 * S);

      const pepGeo = new THREE.CylinderGeometry(0.09 * S, 0.09 * S, 0.04 * S, 12);
      const pep1 = new THREE.Mesh(pepGeo, pepMat);
      pep1.position.set(-0.12 * S, 0.08 * S, 0.16 * S);
      const pep2 = new THREE.Mesh(pepGeo, pepMat);
      pep2.position.set(0.11 * S, 0.08 * S, 0.24 * S);
      const pep3 = new THREE.Mesh(pepGeo, pepMat);
      pep3.position.set(0, 0.08 * S, 0.48 * S);

      root.add(cheese, crust, pep1, pep2, pep3);
      break;
    }

    case 'speedCoil': {
      const hubMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.25,
        metalness: 0.65,
      });
      const coilMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.9,
        roughness: 0.18,
        metalness: 0.35,
      });

      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56 * S, 0.56 * S, 0.78 * S, 16, 1, true),
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          roughness: 0.35,
          metalness: 0.45,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        }),
      );

      for (const ry of [-0.36, -0.12, 0.12, 0.36]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.62 * S, 0.075 * S, 10, 22),
          coilMat,
        );
        ring.rotation.x = Math.PI / 2 + 0.14;
        ring.position.y = ry * S;
        root.add(ring);
      }

      const capTop = new THREE.Mesh(
        new THREE.TorusGeometry(0.58 * S, 0.055 * S, 8, 20),
        hubMat,
      );
      capTop.rotation.x = Math.PI / 2;
      capTop.position.y = 0.44 * S;

      const capBot = capTop.clone();
      capBot.position.y = -0.44 * S;

      root.add(sleeve, capTop, capBot);
      break;
    }

    case 'gravityHammer': {
      const steelMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.28,
        metalness: 0.68,
      });
      const coreMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.95,
        roughness: 0.18,
        metalness: 0.25,
      });
      const gripMat = createPlasticBrickMaterial('#1b2a35', { roughness: 0.72 });

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1 * S, 0.11 * S, 2.35 * S, 12),
        gripMat,
      );
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = 0.88 * S;

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 0.28 * S, 12),
        steelMat,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.z = 1.85 * S;

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.18 * S, 0.72 * S, 0.68 * S),
        steelMat,
      );
      head.position.z = 2.26 * S;

      const plateL = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 * S, 0.82 * S, 0.76 * S),
        steelMat,
      );
      plateL.position.set(0.62 * S, 0, 2.26 * S);
      const plateR = plateL.clone();
      plateR.position.x = -0.62 * S;

      const gravBand = new THREE.Mesh(
        new THREE.BoxGeometry(1.24 * S, 0.22 * S, 0.22 * S),
        coreMat,
      );
      gravBand.position.z = 2.26 * S;

      root.add(shaft, collar, head, plateL, plateR, gravBand);
      break;
    }

    case 'heaterShield': {
      const bodyMat = studTextures
        ? createStudBrickMaterial(primaryColor, studTextures, 2, 2, {
            roughness: 0.42,
            metalness: 0.15,
          })
        : createPlasticBrickMaterial(primaryColor, { roughness: 0.42, metalness: 0.15 });
      const trimMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.24,
        metalness: 0.65,
      });
      const strapMat = createPlasticBrickMaterial('#4b2e1e', { roughness: 0.75 });

      const shape = new THREE.Shape();
      shape.moveTo(-0.56 * S, 0.62 * S);
      shape.lineTo(0.56 * S, 0.62 * S);
      shape.lineTo(0.56 * S, -0.05 * S);
      shape.quadraticCurveTo(0.52 * S, -0.58 * S, 0, -0.82 * S);
      shape.quadraticCurveTo(-0.52 * S, -0.58 * S, -0.56 * S, -0.05 * S);
      shape.closePath();

      const plateGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.14 * S,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.04 * S,
        bevelThickness: 0.04 * S,
      });

      const plate = new THREE.Mesh(plateGeo, bodyMat);
      plate.position.set(0, 0, -0.05 * S);

      const boss = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2 * S, 0.26 * S, 0.16 * S, 8),
        trimMat,
      );
      boss.rotation.x = Math.PI / 2;
      boss.position.set(0, 0.08 * S, 0.14 * S);

      const crestV = new THREE.Mesh(
        new THREE.BoxGeometry(0.14 * S, 1.15 * S, 0.06 * S),
        trimMat,
      );
      crestV.position.set(0, -0.05 * S, 0.1 * S);

      const crestH = new THREE.Mesh(
        new THREE.BoxGeometry(0.95 * S, 0.14 * S, 0.06 * S),
        trimMat,
      );
      crestH.position.set(0, 0.12 * S, 0.1 * S);

      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.54 * S, 0.16 * S, 0.16 * S),
        strapMat,
      );
      strap.position.set(0, 0, -0.14 * S);

      root.add(plate, boss, crestV, crestH, strap);
      break;
    }

    case 'arcaneStaff': {
      const woodMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.65 });
      const metalMat = createPlasticBrickMaterial('#f5cd30', {
        roughness: 0.24,
        metalness: 0.72,
      });
      const orbMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.05,
        roughness: 0.12,
        metalness: 0.2,
      });

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095 * S, 0.085 * S, 2.85 * S, 12),
        woodMat,
      );
      shaft.position.y = 0.55 * S;

      const gripBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115 * S, 0.115 * S, 0.45 * S, 12),
        metalMat,
      );

      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 * S, 0.12 * S, 0.28 * S, 8),
        metalMat,
      );
      crown.position.y = 2.02 * S;

      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28 * S, 1),
        orbMat,
      );
      orb.position.y = 2.38 * S;

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.38 * S, 0.04 * S, 8, 20),
        metalMat,
      );
      halo.position.y = 2.38 * S;
      halo.rotation.set(0.65, 0.35, 0);

      root.add(shaft, gripBand, crown, orb, halo);
      break;
    }

    case 'glowLantern': {
      const frameMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.34,
        metalness: 0.65,
      });
      const flameMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.15,
        roughness: 0.15,
      });

      const bail = new THREE.Mesh(
        new THREE.TorusGeometry(0.22 * S, 0.045 * S, 8, 16, Math.PI),
        frameMat,
      );
      bail.position.y = 0.02 * S;

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.34 * S, 0.22 * S, 4),
        frameMat,
      );
      cap.rotation.y = Math.PI / 4;
      cap.position.y = -0.14 * S;

      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 * S, 0.42 * S, 0.3 * S),
        flameMat,
      );
      core.position.y = -0.42 * S;

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.44 * S, 0.1 * S, 0.44 * S),
        frameMat,
      );
      base.position.y = -0.66 * S;

      const strutGeo = new THREE.BoxGeometry(0.055 * S, 0.48 * S, 0.055 * S);
      for (const sx of [-0.18, 0.18]) {
        for (const sz of [-0.18, 0.18]) {
          const strut = new THREE.Mesh(strutGeo, frameMat);
          strut.position.set(sx * S, -0.42 * S, sz * S);
          root.add(strut);
        }
      }

      root.add(bail, cap, core, base);
      break;
    }

    case 'energyBlade': {
      const hiltMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.25,
        metalness: 0.72,
      });
      const plasmaInnerMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: accentColor,
        emissiveIntensity: 1.25,
        roughness: 0.1,
      });
      const plasmaOuterMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        transparent: true,
        opacity: 0.58,
      });

      const hilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * S, 0.13 * S, 0.86 * S, 14),
        hiltMat,
      );
      hilt.rotation.x = Math.PI / 2;

      const emitter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * S, 0.14 * S, 0.22 * S, 12),
        hiltMat,
      );
      emitter.rotation.x = Math.PI / 2;
      emitter.position.z = 0.46 * S;

      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065 * S, 0.065 * S, 2.35 * S, 12),
        plasmaInnerMat,
      );
      core.rotation.x = Math.PI / 2;
      core.position.z = 1.72 * S;

      const aura = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125 * S, 0.135 * S, 2.42 * S, 12),
        plasmaOuterMat,
      );
      aura.rotation.x = Math.PI / 2;
      aura.position.z = 1.74 * S;

      root.add(hilt, emitter, core, aura);
      break;
    }

    case 'holoScanner': {
      const chassisMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.34,
        metalness: 0.45,
      });
      const screenMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.95,
        roughness: 0.15,
      });
      const holoConeMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      });

      const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.22 * S, 0.48 * S, 0.24 * S),
        createPlasticBrickMaterial('#1b2a35', { roughness: 0.65 }),
      );
      grip.position.y = -0.05 * S;

      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(0.68 * S, 0.14 * S, 0.82 * S),
        chassisMat,
      );
      deck.position.set(0, 0.22 * S, 0.24 * S);
      deck.rotation.x = 0.22;

      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.54 * S, 0.04 * S, 0.56 * S),
        screenMat,
      );
      screen.position.set(0, 0.29 * S, 0.24 * S);
      screen.rotation.x = 0.22;

      const holoBeam = new THREE.Mesh(
        new THREE.ConeGeometry(0.32 * S, 0.52 * S, 12, 1, true),
        holoConeMat,
      );
      holoBeam.rotation.x = Math.PI;
      holoBeam.position.set(0, 0.58 * S, 0.28 * S);

      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * S, 0.04 * S, 0.36 * S, 8),
        chassisMat,
      );
      antenna.position.set(0.24 * S, 0.42 * S, 0.52 * S);

      root.add(grip, deck, screen, holoBeam, antenna);
      break;
    }

    case 'teamFlag': {
      const clothMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.68 });
      const poleMat = createPlasticBrickMaterial('#a3a2a5', {
        roughness: 0.28,
        metalness: 0.68,
      });
      const goldMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.24,
        metalness: 0.65,
      });

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075 * S, 0.08 * S, 3.1 * S, 10),
        poleMat,
      );
      pole.position.y = 0.72 * S;

      const finial = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 * S, 12, 10),
        goldMat,
      );
      finial.position.y = 2.32 * S;

      const bannerA = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 * S, 0.85 * S, 0.78 * S),
        clothMat,
      );
      bannerA.position.set(0, 1.75 * S, -0.42 * S);

      const bannerB = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 * S, 0.72 * S, 0.62 * S),
        goldMat,
      );
      bannerB.position.set(0.06 * S, 1.74 * S, -1.06 * S);
      bannerB.rotation.y = 0.16;

      root.add(pole, finial, bannerA, bannerB);
      break;
    }

    case 'camera': {
      const bodyMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.42, metalness: 0.25 });
      const metalMat = createPlasticBrickMaterial(accentColor, { roughness: 0.22, metalness: 0.78 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.08,
        metalness: 0.85,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.76 * S, 0.52 * S, 0.34 * S), bodyMat);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.5 * S, 0.38 * S), bodyMat);
      grip.position.set(0.32 * S, -0.01 * S, 0.04 * S);
      const prism = new THREE.Mesh(new THREE.BoxGeometry(0.36 * S, 0.16 * S, 0.28 * S), metalMat);
      prism.position.set(0, 0.32 * S, 0);
      const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * S, 0.06 * S, 0.06 * S, 10), metalMat);
      shutter.position.set(0.26 * S, 0.28 * S, 0.05 * S);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * S, 0.22 * S, 0.42 * S, 16), bodyMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(-0.04 * S, 0, 0.34 * S);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.21 * S, 0.21 * S, 0.08 * S, 16), metalMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-0.04 * S, 0, 0.48 * S);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * S, 0.16 * S, 0.05 * S, 16), glassMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(-0.04 * S, 0, 0.55 * S);

      root.add(body, grip, prism, shutter, barrel, ring, lens);
      break;
    }

    case 'hairdryer': {
      const shellMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.35, metalness: 0.18 });
      const chromeMat = createPlasticBrickMaterial(accentColor, { roughness: 0.18, metalness: 0.85 });
      const darkMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.72 });

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * S, 0.09 * S, 0.75 * S, 10), shellMat);
      handle.position.set(0, -0.1 * S, 0.04 * S);
      handle.rotation.x = 0.22;

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * S, 0.19 * S, 0.92 * S, 14), shellMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.28 * S, 0.22 * S);

      const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 0.32 * S, 0.28 * S), chromeMat);
      nozzle.position.set(0, 0.28 * S, 0.78 * S);

      const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * S, 0.16 * S, 0.08 * S, 12), darkMat);
      intake.rotation.x = Math.PI / 2;
      intake.position.set(0, 0.28 * S, -0.25 * S);

      const switchBtn = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.14 * S, 0.08 * S), darkMat);
      switchBtn.position.set(0, -0.02 * S, 0.14 * S);

      root.add(handle, barrel, nozzle, intake, switchBtn);
      break;
    }

    case 'bouquet': {
      const wrapMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.65 });
      const bloomMat = createPlasticBrickMaterial(accentColor, { roughness: 0.5 });
      const leafMat = createPlasticBrickMaterial('#22c55e', { roughness: 0.68 });
      const ribbonMat = createPlasticBrickMaterial('#f43f5e', { roughness: 0.45 });

      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * S, 0.1 * S, 0.85 * S, 12), wrapMat);
      cone.position.y = 0.18 * S;
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.24 * S, 0.12 * S, 0.24 * S), ribbonMat);
      bow.position.y = -0.08 * S;

      root.add(cone, bow);
      const bloomOffsets: [number, number, number, boolean][] = [
        [0, 0.72, 0, true],
        [-0.22, 0.65, 0.16, false],
        [0.22, 0.64, 0.16, true],
        [-0.18, 0.62, -0.2, true],
        [0.2, 0.66, -0.18, false],
        [0, 0.6, 0.26, false],
      ];
      bloomOffsets.forEach(([bx, by, bz, alt]) => {
        const rose = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.16 * S, 0),
          alt ? wrapMat : bloomMat,
        );
        rose.position.set(bx * S, by * S, bz * S);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.22 * S, 0.05 * S, 0.14 * S), leafMat);
        leaf.position.set(bx * 1.15 * S, (by - 0.1) * S, bz * 1.15 * S);
        leaf.rotation.z = bx * 0.8;
        root.add(rose, leaf);
      });
      break;
    }

    case 'snowShovel': {
      const scoopMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.42, metalness: 0.15 });
      const shaftMat = createPlasticBrickMaterial(accentColor, { roughness: 0.28, metalness: 0.72 });
      const gripMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.75 });

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * S, 0.06 * S, 2.35 * S, 10), shaftMat);
      shaft.position.set(0, 0.55 * S, 0);

      const dGrip = new THREE.Mesh(new THREE.BoxGeometry(0.36 * S, 0.09 * S, 0.12 * S), gripMat);
      dGrip.position.set(0, -0.62 * S, 0);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.05 * S, 0.85 * S, 0.1 * S), scoopMat);
      blade.position.set(0, 1.85 * S, 0.08 * S);
      blade.rotation.x = -0.18;

      const edge = new THREE.Mesh(new THREE.BoxGeometry(1.08 * S, 0.1 * S, 0.12 * S), shaftMat);
      edge.position.set(0, 2.26 * S, 0.16 * S);
      edge.rotation.x = -0.18;

      root.add(shaft, dGrip, blade, edge);
      break;
    }

    case 'stapler': {
      const topMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.35, metalness: 0.2 });
      const metalMat = createPlasticBrickMaterial(accentColor, { roughness: 0.24, metalness: 0.82 });
      const baseMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.72 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.24 * S, 0.09 * S, 0.72 * S), baseMat);
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.07 * S, 0.66 * S), metalMat);
      anvil.position.y = 0.07 * S;
      const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.22 * S, 0.14 * S, 0.7 * S), topMat);
      topArm.position.set(0, 0.22 * S, -0.02 * S);
      topArm.rotation.x = -0.16;

      root.add(base, anvil, topArm);
      break;
    }

    case 'steelUmbrella': {
      const steelMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.22,
        metalness: 0.86,
      });
      const rivetMat = createPlasticBrickMaterial('#e2e8f0', {
        roughness: 0.16,
        metalness: 0.92,
      });
      const gripMat = createPlasticBrickMaterial(accentColor, { roughness: 0.58 });
      const darkMat = createPlasticBrickMaterial('#1e293b', { roughness: 0.65 });

      // Rubberized grip centered cleanly at hand socket origin (0, 0, 0)
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.056, 0.28, 10),
        gripMat,
      );
      grip.position.y = 0.02;

      const pommel = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 10, 8),
        darkMat,
      );
      pommel.position.y = -0.13;

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.064, 0.05, 10),
        rivetMat,
      );
      collar.position.y = 0.17;

      // Brushed steel shaft rising straight up to canopy hub
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.04, 1.18, 10),
        rivetMat,
      );
      shaft.position.y = 0.74;

      // Faceted reinforced steel canopy dome & rolled safety rim
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.06, 0.38, 10),
        steelMat,
      );
      canopy.position.y = 1.24;

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.04, 0.036, 8, 20),
        rivetMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.06;

      // Top pointed ferrule finial
      const finial = new THREE.Mesh(
        new THREE.ConeGeometry(0.052, 0.18, 8),
        rivetMat,
      );
      finial.position.y = 1.48;

      root.add(grip, pommel, collar, shaft, canopy, rim, finial);

      // Decorative steel rivets around the dome rim
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), rivetMat);
        rivet.position.set(Math.cos(ang) * 0.82, 1.14, Math.sin(ang) * 0.82);
        root.add(rivet);
      }
      break;
    }
  }

  setShadows(root, true, true);
  return root;
}

/**
 * Places any handheld item model on stage grounded cleanly at y = 0.
 * Uses a compact display stand / rest angle so swords, blasters, colas,
 * lanterns, shields, and staffs sit naturally on floors or pedestals.
 */
export function buildGroundedItemPropGroup(
  itemId: ItemId,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const container = new THREE.Group();
  const model = buildItemModelGroup(itemId, primaryColor, accentColor, studTextures);

  // Orient horizontal weapons cleanly for floor / pedestal display
  if (itemId === 'linkedSword' || itemId === 'energyBlade') {
    model.rotation.set(-Math.PI / 2, 0, 0);
  } else if (itemId === 'laserBlaster' || itemId === 'gravityHammer') {
    model.rotation.set(0, 0, Math.PI / 2);
  } else if (itemId === 'pizzaSlice') {
    model.rotation.set(0, 0, 0);
  }

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (Number.isFinite(box.min.y)) {
    model.position.y -= box.min.y;
    const cx = (box.min.x + box.max.x) * 0.5;
    const cz = (box.min.z + box.max.z) * 0.5;
    model.position.x -= cx;
    model.position.z -= cz;
  }

  container.add(model);
  setShadows(container, true, true);
  return container;
}

// =========================================================================
// 8 New Multi-Part Grounded Stage Props (y = 0 bottom-center)
// =========================================================================

export function buildExtendedStagePropGroup(
  propKind: Exclude<PropKind, 'spawnpad' | 'crate' | 'tree' | 'speeder' | 'heldItem'>,
  primaryColor: string,
  accentColor: string,
  studTextures: StudTexturePair,
): THREE.Group {
  const root = new THREE.Group();

  switch (propKind) {
    case 'chest': {
      const woodMat = createStudBrickMaterial(primaryColor, studTextures, 2, 2, {
        roughness: 0.68,
      });
      const brassMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.24,
        metalness: 0.72,
      });
      const glintMat = new THREE.MeshStandardMaterial({
        color: '#fde047',
        emissive: '#f59e0b',
        emissiveIntensity: 0.45,
        roughness: 0.25,
      });

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.72, 0.96), woodMat);
      base.position.y = 0.36;

      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.72, -0.46);
      lidPivot.rotation.x = -0.28; // Slightly ajar showing treasure glint!
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.34, 0.98), woodMat);
      lid.position.set(0, 0.17, 0.46);
      lidPivot.add(lid);

      const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 1.02), brassMat);
      strapL.position.set(-0.52, 0.17, 0.46);
      const strapR = strapL.clone();
      strapR.position.x = 0.52;
      lidPivot.add(strapL, strapR);

      const lowerStrapL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.74, 1.0), brassMat);
      lowerStrapL.position.set(-0.52, 0.37, 0);
      const lowerStrapR = lowerStrapL.clone();
      lowerStrapR.position.x = 0.52;

      const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.1), brassMat);
      lockPlate.position.set(0, 0.64, 0.5);

      const goldStip = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.16, 0.74), glintMat);
      goldStip.position.set(0, 0.7, 0);

      root.add(base, lidPivot, lowerStrapL, lowerStrapR, lockPlate, goldStip);
      break;
    }

    case 'barrel': {
      const woodMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.72 });
      const hoopMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.28,
        metalness: 0.72,
      });

      const lathePts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.42, 0),
        new THREE.Vector2(0.54, 0.55),
        new THREE.Vector2(0.42, 1.15),
        new THREE.Vector2(0, 1.15),
      ];
      const body = new THREE.Mesh(new THREE.LatheGeometry(lathePts, 16), woodMat);

      for (const [hy, hr] of [
        [0.16, 0.455],
        [0.57, 0.545],
        [0.98, 0.455],
      ]) {
        const hoop = new THREE.Mesh(
          new THREE.CylinderGeometry(hr, hr, 0.09, 18, 1, true),
          hoopMat,
        );
        hoop.position.y = hy;
        root.add(hoop);
      }

      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.39, 0.39, 0.04, 16),
        woodMat,
      );
      lid.position.y = 1.13;
      root.add(body, lid);
      break;
    }

    case 'flag': {
      const clothMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.68 });
      const goldMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.25,
        metalness: 0.68,
      });
      const stoneMat = createStudBrickMaterial('#635f62', studTextures, 2, 2, {
        roughness: 0.55,
      });

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.24, 1.15), stoneMat);
      plinth.position.y = 0.12;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.24, 12), stoneMat);
      collar.position.y = 0.34;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.2, 12), goldMat);
      pole.position.y = 1.84;
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), goldMat);
      finial.position.y = 3.5;

      const flagA = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.78, 0.06), clothMat);
      flagA.position.set(0.46, 2.95, 0);
      const flagB = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.06), goldMat);
      flagB.position.set(1.14, 2.93, 0.08);
      flagB.rotation.y = -0.22;

      root.add(plinth, collar, pole, finial, flagA, flagB);
      break;
    }

    case 'bench': {
      const woodMat = createStudBrickMaterial(primaryColor, studTextures, 3, 1, {
        roughness: 0.65,
      });
      const ironMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.35,
        metalness: 0.65,
      });

      for (const sx of [-1.05, 1.05]) {
        const legF = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.14), ironMat);
        legF.position.set(sx, 0.26, 0.34);
        const legB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.14), ironMat);
        legB.position.set(sx, 0.525, -0.34);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.82), ironMat);
        arm.position.set(sx, 0.72, 0);
        root.add(legF, legB, arm);
      }

      const seatA = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.11, 0.36), woodMat);
      seatA.position.set(0, 0.54, 0.18);
      const seatB = seatA.clone();
      seatB.position.z = -0.2;

      const backA = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.24, 0.1), woodMat);
      backA.position.set(0, 0.88, -0.35);
      const backB = backA.clone();
      backB.position.y = 1.15;

      root.add(seatA, seatB, backA, backB);
      break;
    }

    case 'targetDummy': {
      const strawMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.78 });
      const targetMat = createPlasticBrickMaterial(accentColor, { roughness: 0.42 });
      const whiteMat = createPlasticBrickMaterial('#f2f3f3', { roughness: 0.45 });
      const postMat = createPlasticBrickMaterial('#5c3a21', { roughness: 0.72 });

      const crossA = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.22), postMat);
      crossA.position.y = 0.06;
      const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 1.15), postMat);
      crossB.position.y = 0.06;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.7, 10), postMat);
      post.position.y = 0.85;

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.06, 0.52), strawMat);
      torso.position.y = 1.62;
      const armBar = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.22, 0.22), postMat);
      armBar.position.y = 1.92;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.56, 16), strawMat);
      head.position.y = 2.46;

      const ringOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.04, 18),
        targetMat,
      );
      ringOuter.rotation.x = Math.PI / 2;
      ringOuter.position.set(0, 1.64, 0.27);
      const ringMid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.05, 18),
        whiteMat,
      );
      ringMid.rotation.x = Math.PI / 2;
      ringMid.position.set(0, 1.64, 0.275);
      const bullseye = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16),
        targetMat,
      );
      bullseye.rotation.x = Math.PI / 2;
      bullseye.position.set(0, 1.64, 0.28);

      root.add(crossA, crossB, post, torso, armBar, head, ringOuter, ringMid, bullseye);
      break;
    }

    case 'campfire': {
      const logMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.85 });
      const stoneMat = createPlasticBrickMaterial('#635f62', { roughness: 0.78 });
      const flameOuterMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.05,
        roughness: 0.25,
      });
      const flameInnerMat = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#facc15',
        emissiveIntensity: 1.25,
        roughness: 0.2,
      });

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const stone = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.21, 0),
          stoneMat,
        );
        stone.position.set(Math.cos(ang) * 0.72, 0.14, Math.sin(ang) * 0.72);
        stone.scale.set(1.15, 0.75, 1.0);
        stone.rotation.y = ang;
        root.add(stone);
      }

      for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.13, 1.15, 8),
          logMat,
        );
        log.position.y = 0.18;
        log.rotation.z = Math.PI / 2 - 0.18;
        log.rotation.y = (i / 4) * Math.PI;
        root.add(log);
      }

      const emberBed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 0.08, 12),
        flameOuterMat,
      );
      emberBed.position.y = 0.05;
      root.add(emberBed);

      const flameA = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.88, 6), flameOuterMat);
      flameA.position.y = 0.52;
      flameA.userData.isCampfireFlame = true;
      flameA.userData.phaseOffset = 0;

      const flameB = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 6), flameInnerMat);
      flameB.position.set(0.08, 0.44, -0.06);
      flameB.userData.isCampfireFlame = true;
      flameB.userData.phaseOffset = 1.7;

      root.add(flameA, flameB);
      break;
    }

    case 'pedestal': {
      const stoneMat = createStudBrickMaterial(primaryColor, studTextures, 2, 2, {
        roughness: 0.48,
      });
      const trimMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.25,
        metalness: 0.65,
      });

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 1.35), stoneMat);
      base.position.y = 0.11;
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.16, 1.06), stoneMat);
      step.position.y = 0.3;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.85, 12), stoneMat);
      col.position.y = 0.8;
      const trimRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.46, 0.1, 16),
        trimMat,
      );
      trimRing.position.y = 1.24;
      const topSlab = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.16, 1.18), stoneMat);
      topSlab.position.y = 1.37;

      root.add(base, step, col, trimRing, topSlab);
      break;
    }

    case 'lanternPost': {
      const ironMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.35,
        metalness: 0.68,
      });
      const glowMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.15,
        roughness: 0.18,
      });

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.34, 8), ironMat);
      plinth.position.y = 0.17;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.95, 10), ironMat);
      pole.position.y = 1.75;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.1), ironMat);
      arm.position.set(0.35, 3.12, 0);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 4), ironMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(0.68, 2.98, 0);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), glowMat);
      bulb.position.set(0.68, 2.72, 0);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.36), ironMat);
      base.position.set(0.68, 2.48, 0);

      root.add(plinth, pole, arm, cap, bulb, base);
      break;
    }
  }

  setShadows(root, true, true);
  return root;
}
