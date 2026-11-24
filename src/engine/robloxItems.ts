import * as THREE from 'three';
import { createPlasticBrickMaterial, createStudBrickMaterial, StudTexturePair } from './robloxTextures';
import { ItemId, PropKind } from './types';

// Match R6 character stud scale
const S = 0.55;

function setShadows(group: THREE.Object3D, cast = true, receive = true) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const isGlass = Boolean(mat && (mat as THREE.MeshPhysicalMaterial).transparent);
      mesh.castShadow = cast && !isGlass;
      mesh.receiveShadow = receive;
    }
  });
}

function makeItemGlassMat(tintHex: string, opacity = 0.36): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: tintHex,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createSmartphoneScreenTexture(accentHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 128, 256);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.55, accentHex);
  grad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  // Subtle top notch & status bar
  ctx.fillStyle = '#090d16';
  ctx.fillRect(42, 8, 44, 10);

  // Clock widget
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('12:45', 64, 68);

  // Notification cards
  ctx.fillStyle = 'rgba(15,23,42,0.52)';
  ctx.fillRect(14, 92, 100, 34);
  ctx.fillRect(14, 134, 100, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(24, 102, 58, 6);
  ctx.fillRect(24, 114, 78, 4);
  ctx.fillRect(24, 144, 48, 6);
  ctx.fillRect(24, 156, 72, 4);

  // App dock icons
  const dockColors = ['#38bdf8', '#22c55e', '#f59e0b', '#ec4899'];
  dockColors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(16 + i * 26, 212, 18, 18);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =========================================================================
// 30 Holdable 3D Item Models (Grip-Origin Centered at (0, 0, 0))
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

      const coilRings = new THREE.Group();
      coilRings.userData.itemFx = 'spinY';
      for (const ry of [-0.36, -0.12, 0.12, 0.36]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.62 * S, 0.075 * S, 10, 22),
          coilMat,
        );
        ring.rotation.x = Math.PI / 2 + 0.14;
        ring.position.y = ry * S;
        coilRings.add(ring);
      }

      const capTop = new THREE.Mesh(
        new THREE.TorusGeometry(0.58 * S, 0.055 * S, 8, 20),
        hubMat,
      );
      capTop.rotation.x = Math.PI / 2;
      capTop.position.y = 0.44 * S;

      const capBot = capTop.clone();
      capBot.position.y = -0.44 * S;

      root.add(sleeve, coilRings, capTop, capBot);
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
      orb.userData.itemFx = 'orbHover';
      orb.userData.baseY = 2.38 * S;

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.38 * S, 0.04 * S, 8, 20),
        metalMat,
      );
      halo.position.y = 2.38 * S;
      halo.rotation.set(0.65, 0.35, 0);
      halo.userData.itemFx = 'spinOrbit';

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
        new THREE.OctahedronGeometry(0.18 * S, 1),
        flameMat,
      );
      core.position.y = -0.44 * S;
      core.userData.itemFx = 'flameFlicker';

      const glassPane = new THREE.Mesh(
        new THREE.BoxGeometry(0.34 * S, 0.44 * S, 0.34 * S),
        makeItemGlassMat('#fef3c7', 0.28),
      );
      glassPane.position.y = -0.42 * S;
      glassPane.renderOrder = 3;

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

      root.add(bail, cap, core, glassPane, base);
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
      aura.userData.itemFx = 'pulseAura';

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
      holoBeam.userData.itemFx = 'holoPulse';

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

    // =========================================================================
    // 12 New Everyday, Modern & Fantasy Handheld Items
    // =========================================================================

    case 'smartphone': {
      const chassisMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.22,
        metalness: 0.72,
      });
      const darkMat = createPlasticBrickMaterial('#090d16', { roughness: 0.2, metalness: 0.4 });
      const screenTex = createSmartphoneScreenTexture(accentColor);
      const screenMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: screenTex ?? undefined,
        emissive: screenTex ? '#ffffff' : accentColor,
        emissiveMap: screenTex ?? undefined,
        emissiveIntensity: 0.55,
        roughness: 0.1,
        metalness: 0.12,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.42 * S, 0.78 * S, 0.065 * S), chassisMat);
      body.position.y = 0.08 * S;

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36 * S, 0.7 * S), screenMat);
      screen.position.set(0, 0.08 * S, 0.036 * S);
      screen.userData.itemFx = 'screenPulse';

      // Camera island on back (-Z)
      const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.16 * S, 0.18 * S, 0.025 * S), darkMat);
      camBump.position.set(0.09 * S, 0.3 * S, -0.04 * S);
      const lensMat = new THREE.MeshPhysicalMaterial({
        color: '#0f172a',
        roughness: 0.05,
        metalness: 0.85,
        clearcoat: 1,
      });
      const lensGeo = new THREE.CylinderGeometry(0.032 * S, 0.032 * S, 0.02 * S, 10);
      lensGeo.rotateX(Math.PI / 2);
      for (const [lx, ly] of [
        [0.05, 0.34],
        [0.05, 0.26],
        [0.12, 0.3],
      ]) {
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.set(lx * S, ly * S, -0.055 * S);
        root.add(lens);
      }

      root.add(body, screen, camBump);
      break;
    }

    case 'icedCoffee': {
      const drinkMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.32, metalness: 0.04 });
      const strawMat = createPlasticBrickMaterial(accentColor, { roughness: 0.38 });
      const cupGlassMat = makeItemGlassMat('#f8fafc', 0.3);
      const pearlMat = createPlasticBrickMaterial('#1c120d', { roughness: 0.25 });
      const sleeveMat = createPlasticBrickMaterial('#c99a6b', { roughness: 0.82 });

      // Inner drink liquid
      const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 * S, 0.18 * S, 0.62 * S, 16),
        drinkMat,
      );
      liquid.position.y = 0.02 * S;

      // Translucent iced cup shell
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.275 * S, 0.2 * S, 0.74 * S, 18),
        cupGlassMat,
      );
      cup.position.y = 0.06 * S;
      cup.renderOrder = 3;

      // Kraft sleeve around grip
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.252 * S, 0.228 * S, 0.26 * S, 18),
        sleeveMat,
      );
      sleeve.position.y = 0.02 * S;

      // Domed clear lid
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.27 * S, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        cupGlassMat,
      );
      dome.position.y = 0.43 * S;
      dome.renderOrder = 3;

      const lidRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.275 * S, 0.024 * S, 8, 18),
        cupGlassMat,
      );
      lidRim.rotation.x = Math.PI / 2;
      lidRim.position.y = 0.43 * S;

      // Wide boba straw
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044 * S, 0.044 * S, 1.02 * S, 10),
        strawMat,
      );
      straw.position.set(0.04 * S, 0.34 * S, 0);
      straw.rotation.z = -0.1;

      // Boba pearls at bottom
      const pearlGeo = new THREE.SphereGeometry(0.045 * S, 8, 6);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const pearl = new THREE.Mesh(pearlGeo, pearlMat);
        pearl.position.set(Math.cos(ang) * 0.13 * S, -0.22 * S + (i % 2) * 0.04 * S, Math.sin(ang) * 0.13 * S);
        root.add(pearl);
      }

      root.add(liquid, sleeve, straw, cup, dome, lidRim);
      break;
    }

    case 'gameController': {
      const shellMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.32, metalness: 0.14 });
      const darkMat = createPlasticBrickMaterial('#111827', { roughness: 0.55 });
      const lightbarMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.0,
        roughness: 0.15,
      });

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.84 * S, 0.34 * S, 0.2 * S), shellMat);
      const touchPad = new THREE.Mesh(new THREE.BoxGeometry(0.32 * S, 0.16 * S, 0.04 * S), darkMat);
      touchPad.position.set(0, 0.06 * S, 0.1 * S);

      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(0.34 * S, 0.045 * S, 0.04 * S), lightbarMat);
      lightBar.position.set(0, 0.16 * S, 0.09 * S);
      lightBar.userData.itemFx = 'ledBlink';

      for (const side of [-1, 1]) {
        const grip = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.13 * S, 0.34 * S, 6, 10),
          shellMat,
        );
        grip.position.set(side * 0.39 * S, -0.14 * S, -0.02 * S);
        grip.rotation.z = side * 0.28;
        root.add(grip);

        const stickBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075 * S, 0.08 * S, 0.09 * S, 10),
          darkMat,
        );
        stickBase.rotation.x = Math.PI / 2;
        stickBase.position.set(side * 0.17 * S, -0.06 * S, 0.12 * S);
        root.add(stickBase);
      }

      // Colored face buttons
      const btnColors = ['#38bdf8', '#f43f5e', '#22c55e', '#f59e0b'];
      const btnOffs: [number, number][] = [
        [0.28, 0.1],
        [0.36, 0.04],
        [0.28, -0.02],
        [0.2, 0.04],
      ];
      btnOffs.forEach(([bx, by], i) => {
        const btn = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032 * S, 0.032 * S, 0.04 * S, 8),
          createPlasticBrickMaterial(btnColors[i], { roughness: 0.3 }),
        );
        btn.rotation.x = Math.PI / 2;
        btn.position.set(bx * S, by * S, 0.11 * S);
        root.add(btn);
      });

      // D-pad
      const dpH = new THREE.Mesh(new THREE.BoxGeometry(0.16 * S, 0.05 * S, 0.04 * S), darkMat);
      dpH.position.set(-0.28 * S, 0.04 * S, 0.11 * S);
      const dpV = new THREE.Mesh(new THREE.BoxGeometry(0.05 * S, 0.16 * S, 0.04 * S), darkMat);
      dpV.position.set(-0.28 * S, 0.04 * S, 0.11 * S);

      root.add(bridge, touchPad, lightBar, dpH, dpV);
      break;
    }

    case 'electricGuitar': {
      const bodyMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.18,
        metalness: 0.25,
      });
      const guardMat = createPlasticBrickMaterial(accentColor, { roughness: 0.25 });
      const neckMat = createPlasticBrickMaterial('#d6a874', { roughness: 0.52 });
      const fretMat = createPlasticBrickMaterial('#1e1b18', { roughness: 0.65 });
      const chromeMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.14, metalness: 0.92 });

      // Contoured solid-body shape
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(-0.42 * S, -0.68 * S);
      bodyShape.quadraticCurveTo(0, -0.82 * S, 0.42 * S, -0.68 * S);
      bodyShape.quadraticCurveTo(0.56 * S, -0.32 * S, 0.32 * S, -0.05 * S);
      bodyShape.quadraticCurveTo(0.46 * S, 0.28 * S, 0.26 * S, 0.44 * S);
      bodyShape.lineTo(0.12 * S, 0.28 * S);
      bodyShape.lineTo(-0.12 * S, 0.28 * S);
      bodyShape.lineTo(-0.34 * S, 0.56 * S);
      bodyShape.quadraticCurveTo(-0.54 * S, 0.35 * S, -0.34 * S, -0.04 * S);
      bodyShape.quadraticCurveTo(-0.56 * S, -0.32 * S, -0.42 * S, -0.68 * S);
      const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
        depth: 0.16 * S,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.03 * S,
        bevelThickness: 0.03 * S,
      });
      bodyGeo.center();
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(0, -0.45 * S, 0);

      const pickguard = new THREE.Mesh(new THREE.BoxGeometry(0.48 * S, 0.66 * S, 0.03 * S), guardMat);
      pickguard.position.set(0.05 * S, -0.42 * S, 0.1 * S);

      // Humbucker pickups + bridge
      for (const py of [-0.26, -0.52]) {
        const pickup = new THREE.Mesh(new THREE.BoxGeometry(0.28 * S, 0.11 * S, 0.06 * S), chromeMat);
        pickup.position.set(0, py * S, 0.12 * S);
        root.add(pickup);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.32 * S, 0.1 * S, 0.06 * S), chromeMat);
      bridge.position.set(0, -0.7 * S, 0.12 * S);

      // Neck & fretboard
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 1.85 * S, 0.1 * S), neckMat);
      neck.position.set(0, 0.85 * S, -0.01 * S);
      const fretboard = new THREE.Mesh(new THREE.BoxGeometry(0.17 * S, 1.82 * S, 0.035 * S), fretMat);
      fretboard.position.set(0, 0.86 * S, 0.055 * S);

      // Headstock & tuning pegs
      const headstock = new THREE.Mesh(new THREE.BoxGeometry(0.28 * S, 0.44 * S, 0.09 * S), bodyMat);
      headstock.position.set(0.04 * S, 1.96 * S, 0);
      headstock.rotation.z = -0.12;
      for (let i = 0; i < 4; i++) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * S, 0.025 * S, 0.1 * S, 6), chromeMat);
        peg.rotation.z = Math.PI / 2;
        peg.position.set(-0.14 * S, (1.82 + i * 0.09) * S, 0);
        root.add(peg);
      }

      root.add(body, pickguard, bridge, neck, fretboard, headstock);
      break;
    }

    case 'microphone': {
      const bodyMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.34, metalness: 0.42 });
      const meshMat = createPlasticBrickMaterial(accentColor, { roughness: 0.22, metalness: 0.88 });
      const ringMat = createPlasticBrickMaterial('#38bdf8', { roughness: 0.2, metalness: 0.65 });

      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11 * S, 0.085 * S, 0.78 * S, 14),
        bodyMat,
      );
      grip.position.y = 0.06 * S;

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145 * S, 0.115 * S, 0.1 * S, 14),
        meshMat,
      );
      collar.position.y = 0.48 * S;

      const grille = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.21 * S, 2),
        meshMat,
      );
      grille.position.y = 0.68 * S;

      const grilleBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.212 * S, 0.022 * S, 8, 20),
        ringMat,
      );
      grilleBand.rotation.x = Math.PI / 2;
      grilleBand.position.y = 0.68 * S;

      const switchBox = new THREE.Mesh(new THREE.BoxGeometry(0.05 * S, 0.14 * S, 0.05 * S), meshMat);
      switchBox.position.set(0, 0.18 * S, 0.11 * S);

      root.add(grip, collar, grille, grilleBand, switchBox);
      break;
    }

    case 'flashlight': {
      const barrelMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.28, metalness: 0.74 });
      const rubberMat = createPlasticBrickMaterial('#0f172a', { roughness: 0.82 });
      const lensMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: accentColor,
        emissiveIntensity: 1.35,
        roughness: 0.08,
      });
      const beamMat = new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * S, 0.12 * S, 0.96 * S, 14),
        barrelMat,
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.z = 0.08 * S;

      const knurl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.126 * S, 0.126 * S, 0.42 * S, 14),
        rubberMat,
      );
      knurl.rotation.x = Math.PI / 2;

      const bezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21 * S, 0.13 * S, 0.28 * S, 16),
        barrelMat,
      );
      bezel.rotation.x = Math.PI / 2;
      bezel.position.z = 0.68 * S;

      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.175 * S, 0.175 * S, 0.04 * S, 16),
        lensMat,
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 0.81 * S;

      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.54 * S, 1.45 * S, 14, 1, true),
        beamMat,
      );
      beam.rotation.x = -Math.PI / 2;
      beam.position.z = 1.54 * S;
      beam.userData.itemFx = 'holoPulse';

      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.07 * S, 0.06 * S, 0.12 * S), rubberMat);
      btn.position.set(0, 0.13 * S, 0.34 * S);

      root.add(tube, knurl, bezel, lens, beam, btn);
      break;
    }

    case 'skateboard': {
      const deckMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.42 });
      const gripMat = createPlasticBrickMaterial('#18181b', { roughness: 0.92 });
      const truckMat = createPlasticBrickMaterial('#cbd5e1', { roughness: 0.2, metalness: 0.88 });
      const wheelMat = createPlasticBrickMaterial(accentColor, { roughness: 0.35 });

      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.58 * S, 0.06 * S, 1.85 * S), deckMat);
      const gripTape = new THREE.Mesh(new THREE.BoxGeometry(0.54 * S, 0.015 * S, 1.78 * S), gripMat);
      gripTape.position.y = 0.036 * S;

      // Kicktails
      for (const sz of [-1, 1]) {
        const kick = new THREE.Mesh(new THREE.BoxGeometry(0.54 * S, 0.06 * S, 0.34 * S), deckMat);
        kick.position.set(0, 0.055 * S, sz * 1.05 * S);
        kick.rotation.x = -sz * 0.3;
        root.add(kick);
      }

      // Metal trucks & urethane wheels
      for (const tz of [-0.62, 0.62]) {
        const riser = new THREE.Mesh(new THREE.BoxGeometry(0.22 * S, 0.09 * S, 0.18 * S), truckMat);
        riser.position.set(0, -0.07 * S, tz * S);
        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * S, 0.03 * S, 0.56 * S, 8), truckMat);
        axle.rotation.z = Math.PI / 2;
        axle.position.set(0, -0.14 * S, tz * S);
        root.add(riser, axle);

        for (const wx of [-0.26, 0.26]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.095 * S, 0.095 * S, 0.09 * S, 12),
            wheelMat,
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx * S, -0.14 * S, tz * S);
          root.add(wheel);
        }
      }

      root.add(deck, gripTape);
      break;
    }

    case 'sprayCan': {
      const canMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.24, metalness: 0.45 });
      const labelMat = createPlasticBrickMaterial(accentColor, { roughness: 0.32 });
      const silverMat = createPlasticBrickMaterial('#e2e8f0', { roughness: 0.16, metalness: 0.88 });
      const capMat = createPlasticBrickMaterial('#f8fafc', { roughness: 0.45 });

      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * S, 0.22 * S, 0.72 * S, 18),
        canMat,
      );
      cylinder.position.y = 0.06 * S;

      const labelBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.226 * S, 0.226 * S, 0.34 * S, 18),
        labelMat,
      );
      labelBand.position.y = 0.08 * S;

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 * S, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        silverMat,
      );
      dome.position.y = 0.42 * S;

      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068 * S, 0.072 * S, 0.1 * S, 12),
        capMat,
      );
      nozzle.position.y = 0.65 * S;

      const jetDot = new THREE.Mesh(
        new THREE.BoxGeometry(0.03 * S, 0.03 * S, 0.03 * S),
        labelMat,
      );
      jetDot.position.set(0, 0.66 * S, 0.065 * S);

      root.add(cylinder, labelBand, dome, nozzle, jetDot);
      break;
    }

    case 'walkieTalkie': {
      const bodyMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.52, metalness: 0.18 });
      const darkMat = createPlasticBrickMaterial('#111827', { roughness: 0.65 });
      const ledMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.15,
        roughness: 0.15,
      });

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.36 * S, 0.72 * S, 0.22 * S), bodyMat);
      chassis.position.y = 0.1 * S;

      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.26 * S, 0.16 * S, 0.03 * S), ledMat);
      screen.position.set(0, 0.28 * S, 0.11 * S);

      // Speaker grille slits
      for (let i = 0; i < 4; i++) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.24 * S, 0.025 * S, 0.025 * S), darkMat);
        slit.position.set(0, (0.06 - i * 0.06) * S, 0.115 * S);
        root.add(slit);
      }

      // Whip antenna + knob + blinking LED
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022 * S, 0.034 * S, 0.74 * S, 8),
        darkMat,
      );
      antenna.position.set(0.1 * S, 0.8 * S, 0);

      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055 * S, 0.055 * S, 0.09 * S, 10),
        darkMat,
      );
      knob.position.set(-0.08 * S, 0.5 * S, 0);

      const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.032 * S, 8, 6), ledMat);
      statusLed.position.set(-0.11 * S, 0.4 * S, 0.115 * S);
      statusLed.userData.itemFx = 'ledBlink';

      root.add(chassis, screen, antenna, knob, statusLed);
      break;
    }

    case 'spellbook': {
      const coverMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.58 });
      const goldMat = createPlasticBrickMaterial(accentColor, { roughness: 0.2, metalness: 0.84 });
      const pageMat = createPlasticBrickMaterial('#fef3c7', { roughness: 0.86 });
      const runeMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.1,
        roughness: 0.12,
      });

      const backCover = new THREE.Mesh(new THREE.BoxGeometry(0.68 * S, 0.1 * S, 0.86 * S), coverMat);
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.62 * S, 0.12 * S, 0.8 * S), pageMat);
      pages.position.set(0.02 * S, 0.09 * S, 0);

      // Slightly raised top cover with brass corner brackets
      const topCover = new THREE.Mesh(new THREE.BoxGeometry(0.68 * S, 0.05 * S, 0.86 * S), coverMat);
      topCover.position.set(0, 0.16 * S, 0);

      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.09 * S, 0.22 * S, 0.88 * S), goldMat);
      spine.position.set(-0.33 * S, 0.08 * S, 0);

      for (const sx of [-0.28, 0.28]) {
        for (const sz of [-0.36, 0.36]) {
          const corner = new THREE.Mesh(new THREE.BoxGeometry(0.14 * S, 0.07 * S, 0.14 * S), goldMat);
          corner.position.set(sx * S, 0.17 * S, sz * S);
          root.add(corner);
        }
      }

      // Levitating arcane rune emblem above grimoire
      const runeGroup = new THREE.Group();
      runeGroup.position.set(0, 0.42 * S, 0);
      runeGroup.userData.itemFx = 'orbHover';
      runeGroup.userData.baseY = 0.42 * S;
      const runeRing = new THREE.Mesh(new THREE.TorusGeometry(0.18 * S, 0.024 * S, 8, 18), runeMat);
      runeRing.rotation.x = Math.PI / 2;
      const runeGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 * S, 0), runeMat);
      runeGroup.add(runeRing, runeGem);

      root.add(backCover, pages, topCover, spine, runeGroup);
      break;
    }

    case 'dragonKatana': {
      const bladeMat = createPlasticBrickMaterial(primaryColor, {
        roughness: 0.12,
        metalness: 0.92,
      });
      const goldMat = createPlasticBrickMaterial(accentColor, {
        roughness: 0.2,
        metalness: 0.88,
      });
      const wrapMat = createPlasticBrickMaterial('#111827', { roughness: 0.78 });
      const glowMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.8,
        roughness: 0.15,
      });

      const tsuka = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085 * S, 0.095 * S, 0.92 * S, 10),
        wrapMat,
      );
      tsuka.rotation.x = Math.PI / 2;
      tsuka.position.z = -0.06 * S;

      // Diamond tsuka-ito accents
      for (let i = -3; i <= 2; i++) {
        const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.048 * S, 0), goldMat);
        diamond.scale.set(1.2, 0.4, 0.8);
        diamond.position.set(0, 0.08 * S, i * 0.12 * S);
        root.add(diamond);
      }

      const tsuba = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 * S, 0.24 * S, 0.06 * S, 16),
        goldMat,
      );
      tsuba.rotation.x = Math.PI / 2;
      tsuba.position.z = 0.42 * S;

      const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.11 * S, 0.2 * S, 0.16 * S), goldMat);
      habaki.position.z = 0.52 * S;

      // Segmented gently curved katana blade
      const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.17 * S, 1.35 * S), bladeMat);
      bladeA.position.set(0, 0.02 * S, 1.24 * S);
      const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.055 * S, 0.15 * S, 1.2 * S), bladeMat);
      bladeB.position.set(0, 0.09 * S, 2.48 * S);
      bladeB.rotation.x = -0.09;

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1 * S, 0.34 * S, 4), bladeMat);
      tip.rotation.x = Math.PI / 2 - 0.12;
      tip.rotation.z = Math.PI / 4;
      tip.scale.set(0.45, 1, 1.2);
      tip.position.set(0, 0.17 * S, 3.22 * S);

      // Glowing dragon hamon line
      const hamon = new THREE.Mesh(new THREE.BoxGeometry(0.068 * S, 0.03 * S, 2.35 * S), glowMat);
      hamon.position.set(0, -0.02 * S, 1.82 * S);
      hamon.userData.itemFx = 'pulseAura';

      root.add(tsuka, tsuba, habaki, bladeA, bladeB, tip, hamon);
      break;
    }

    case 'crystalWand': {
      const rodMat = createPlasticBrickMaterial(primaryColor, { roughness: 0.42, metalness: 0.18 });
      const goldMat = createPlasticBrickMaterial('#f5cd30', { roughness: 0.2, metalness: 0.88 });
      const starMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.2,
      });

      const wandRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052 * S, 0.075 * S, 1.48 * S, 12),
        rodMat,
      );
      wandRod.position.y = 0.46 * S;

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.095 * S, 10, 8), goldMat);
      pommel.position.y = -0.3 * S;

      const cradle = new THREE.Mesh(
        new THREE.TorusGeometry(0.14 * S, 0.028 * S, 8, 16, Math.PI * 1.25),
        goldMat,
      );
      cradle.position.y = 1.26 * S;
      cradle.rotation.z = -Math.PI * 0.62;

      const crystalStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 * S, 0), starMat);
      crystalStar.position.y = 1.48 * S;
      crystalStar.userData.itemFx = 'orbHover';
      crystalStar.userData.baseY = 1.48 * S;

      const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.3 * S, 0.022 * S, 8, 18), starMat);
      orbitRing.position.y = 1.48 * S;
      orbitRing.rotation.set(0.7, 0.2, 0);
      orbitRing.userData.itemFx = 'spinOrbit';

      root.add(wandRod, pommel, cradle, crystalStar, orbitRing);
      break;
    }
  }

  setShadows(root, true, true);
  return root;
}

/**
 * Deterministic timeline-synced micro-FX for glowing, floating, or spinning held items.
 */
export function animateHeldItemGroup(group: THREE.Object3D, time: number) {
  group.traverse((obj) => {
    const fx = obj.userData?.itemFx as string | undefined;
    if (!fx) return;
    switch (fx) {
      case 'spinY':
        obj.rotation.y = time * 4.5;
        break;
      case 'spinOrbit':
        obj.rotation.y = time * 2.4;
        obj.rotation.x = 0.65 + Math.sin(time * 2.1) * 0.18;
        break;
      case 'orbHover': {
        const baseY = (obj.userData.baseY as number) ?? obj.position.y;
        obj.position.y = baseY + Math.sin(time * 3.2) * 0.032;
        obj.rotation.y = time * 1.6;
        break;
      }
      case 'flameFlicker': {
        const sy = 0.88 + Math.sin(time * 12.5) * 0.14 + Math.cos(time * 19.3) * 0.06;
        const sxz = 0.94 + Math.cos(time * 10.2) * 0.08;
        obj.scale.set(sxz, sy, sxz);
        break;
      }
      case 'pulseAura': {
        const pulse = 0.94 + Math.sin(time * 8.0) * 0.08;
        obj.scale.set(pulse, 1, pulse);
        break;
      }
      case 'holoPulse': {
        const p = 0.92 + Math.sin(time * 5.2) * 0.09;
        obj.scale.set(p, 1, p);
        break;
      }
      case 'screenPulse': {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mat && typeof mat.emissiveIntensity === 'number') {
          mat.emissiveIntensity = 0.48 + Math.sin(time * 2.8) * 0.12;
        }
        break;
      }
      case 'ledBlink': {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mat && typeof mat.emissiveIntensity === 'number') {
          mat.emissiveIntensity = Math.sin(time * 6.0) > 0.15 ? 1.25 : 0.25;
        }
        break;
      }
    }
  });
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
  if (
    itemId === 'linkedSword' ||
    itemId === 'energyBlade' ||
    itemId === 'dragonKatana'
  ) {
    model.rotation.set(-Math.PI / 2, 0, 0);
  } else if (
    itemId === 'laserBlaster' ||
    itemId === 'gravityHammer' ||
    itemId === 'flashlight'
  ) {
    model.rotation.set(0, 0, Math.PI / 2);
  } else if (itemId === 'pizzaSlice' || itemId === 'skateboard') {
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
