import * as THREE from 'three';
import { AccessoryFit, SecondaryMotionState } from './types';

export const ACCESSORY_STUD = 0.55;
const S = ACCESSORY_STUD;

export interface AccessoryAnimHandle {
  update?: (sec: SecondaryMotionState, time: number) => void;
}

export function disposeAccessoryGroup(group: THREE.Group) {
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
          if (std.map && !std.map.userData?.shared) std.map.dispose();
          if (std.bumpMap && !std.bumpMap.userData?.shared) std.bumpMap.dispose();
          if (std.roughnessMap && !std.roughnessMap.userData?.shared) std.roughnessMap.dispose();
          m.dispose();
        });
      }
    });
  }
}

export function applyAccessoryFit(fitPivot: THREE.Group, fit?: Partial<AccessoryFit>) {
  const oy = fit?.offsetY ?? 0;
  const oz = fit?.offsetZ ?? 0;
  const tx = ((fit?.tiltX ?? 0) * Math.PI) / 180;
  const tz = ((fit?.tiltZ ?? 0) * Math.PI) / 180;
  const sc = fit?.scale ?? 1;
  fitPivot.position.set(0, oy * S, oz * S);
  fitPivot.rotation.set(tx, 0, tz);
  fitPivot.scale.setScalar(sc);
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

function enableShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      const isTransparentGlass = Boolean(mat && (mat as THREE.MeshPhysicalMaterial).transparent);
      m.castShadow = cast && !isTransparentGlass;
      m.receiveShadow = receive;
    }
  });
}

// =========================================================================
// Calibrated UGC PBR Materials (Glass, Brushed Metal, Fabric, Emissive)
// =========================================================================

function makeUgcMat(
  color: string,
  roughness = 0.52,
  metalness = 0.06,
  extra?: Partial<THREE.MeshPhysicalMaterialParameters>,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    sheen: roughness > 0.55 ? 0.32 : 0,
    sheenRoughness: 0.68,
    ...extra,
  });
}

function makeMetalMat(
  color: string,
  roughness = 0.2,
  metalness = 0.88,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.35,
    clearcoatRoughness: 0.16,
  });
}

function makeOpticalGlassMat(
  tintHex: string,
  opacity = 0.32,
  iridescence = 0.2,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: tintHex,
    roughness: 0.06,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    iridescence,
    iridescenceIOR: 1.35,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function makeEmissiveMat(color: string, intensity = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.18,
    metalness: 0.15,
  });
}

// =========================================================================
// Sculpted Procedural Geometry Builders
// =========================================================================

function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const hw = w / 2;
  const hh = h / 2;
  const cr = Math.min(r, hw * 0.9, hh * 0.9);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);
  return shape;
}

function createRoundedBoxGeo(
  w: number,
  h: number,
  d: number,
  radius = Math.min(w, h, d) * 0.22,
  bevel = Math.min(w, h, d) * 0.08,
): THREE.ExtrudeGeometry {
  const b = Math.min(bevel, d * 0.35);
  const shape = createRoundedRectShape(Math.max(0.01, w - b * 2), Math.max(0.01, h - b * 2), radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.005, d - b * 2),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

function createHeartShape(scale: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -0.58 * scale);
  s.bezierCurveTo(0.12 * scale, -0.45 * scale, 0.72 * scale, -0.05 * scale, 0.62 * scale, 0.36 * scale);
  s.bezierCurveTo(0.55 * scale, 0.68 * scale, 0.14 * scale, 0.66 * scale, 0, 0.34 * scale);
  s.bezierCurveTo(-0.14 * scale, 0.66 * scale, -0.55 * scale, 0.68 * scale, -0.62 * scale, 0.36 * scale);
  s.bezierCurveTo(-0.72 * scale, -0.05 * scale, -0.12 * scale, -0.45 * scale, 0, -0.58 * scale);
  return s;
}

function createAviatorLensShape(scale: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.48 * scale, 0.34 * scale);
  s.quadraticCurveTo(0, 0.42 * scale, 0.48 * scale, 0.32 * scale);
  s.quadraticCurveTo(0.56 * scale, -0.1 * scale, 0.32 * scale, -0.42 * scale);
  s.quadraticCurveTo(0.02 * scale, -0.52 * scale, -0.32 * scale, -0.36 * scale);
  s.quadraticCurveTo(-0.56 * scale, -0.08 * scale, -0.48 * scale, 0.34 * scale);
  return s;
}

function createCatEyeShape(scale: number, side: number): THREE.Shape {
  const s = new THREE.Shape();
  const outX = side * 0.56 * scale;
  const inX = -side * 0.42 * scale;
  s.moveTo(inX, 0.18 * scale);
  s.quadraticCurveTo(0, 0.28 * scale, outX, 0.42 * scale);
  s.quadraticCurveTo(outX * 0.85, -0.16 * scale, side * 0.2 * scale, -0.34 * scale);
  s.quadraticCurveTo(-side * 0.2 * scale, -0.34 * scale, inX, -0.08 * scale);
  s.closePath();
  return s;
}

function addEyewearTemples(
  socket: THREE.Group,
  frameMat: THREE.Material,
  hingeMat: THREE.Material,
  yOffset = 0.1 * S,
  zFront = 0.63 * S,
  thickness = 0.042 * S,
) {
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.48 * S, yOffset, zFront),
      new THREE.Vector3(side * 0.61 * S, yOffset, zFront - 0.06 * S),
      new THREE.Vector3(side * 0.615 * S, yOffset - 0.01 * S, -0.05 * S),
      new THREE.Vector3(side * 0.59 * S, yOffset - 0.1 * S, -0.22 * S),
    ]);
    const temple = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 14, thickness * 0.55, 7, false),
      frameMat,
    );
    const hinge = new THREE.Mesh(
      createRoundedBoxGeo(0.08 * S, 0.06 * S, 0.06 * S, 0.015 * S, 0.008 * S),
      hingeMat,
    );
    hinge.position.set(side * 0.5 * S, yOffset, zFront);
    socket.add(temple, hinge);
  }
}

// =========================================================================
// 1. HEAD / EYEWEAR / MASKS / AUDIO ACCESSORIES
// =========================================================================

export function buildHeadAccessory(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#38bdf8',
): AccessoryAnimHandle {
  disposeAccessoryGroup(socket);
  if (id === 'none') return {};

  const frameMat = makeUgcMat(color, 0.24, 0.28, { clearcoat: 0.45 });
  const metalFrame = makeMetalMat(color, 0.18, 0.88);
  const accentMat = makeMetalMat(accentColor, 0.18, 0.85);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'shades') {
    // Sculpted Wayfarer Shades with beveled rims, dark optical glass & metallic hinges
    const lensMat = makeOpticalGlassMat(shadeHex(color, -0.45), 0.78, 0.25);
    for (const side of [-1, 1]) {
      const outer = createRoundedRectShape(0.4 * S, 0.25 * S, 0.065 * S);
      const hole = createRoundedRectShape(0.32 * S, 0.175 * S, 0.045 * S);
      outer.holes.push(hole);
      const rimGeo = new THREE.ExtrudeGeometry(outer, {
        depth: 0.045 * S,
        bevelEnabled: true,
        bevelThickness: 0.012 * S,
        bevelSize: 0.012 * S,
        bevelSegments: 2,
      });
      rimGeo.center();
      const rim = new THREE.Mesh(rimGeo, frameMat);
      rim.position.set(side * 0.255 * S, 0.08 * S, 0.64 * S);

      const lensGeo = new THREE.ShapeGeometry(createRoundedRectShape(0.33 * S, 0.185 * S, 0.045 * S));
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(side * 0.255 * S, 0.08 * S, 0.645 * S);
      lens.renderOrder = 4;

      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.018 * S, 8, 8), accentMat);
      rivet.position.set(side * 0.43 * S, 0.14 * S, 0.665 * S);
      socket.add(rim, lens, rivet);
    }
    const bridge = new THREE.Mesh(
      createRoundedBoxGeo(0.18 * S, 0.055 * S, 0.055 * S, 0.018 * S, 0.008 * S),
      frameMat,
    );
    bridge.position.set(0, 0.125 * S, 0.645 * S);
    const browAccent = new THREE.Mesh(
      createRoundedBoxGeo(0.88 * S, 0.028 * S, 0.03 * S, 0.008 * S, 0.004 * S),
      accentMat,
    );
    browAccent.position.set(0, 0.195 * S, 0.655 * S);
    socket.add(bridge, browAccent);
    addEyewearTemples(socket, frameMat, accentMat, 0.12 * S, 0.64 * S, 0.042 * S);
  } else if (id === 'roundGlasses') {
    // Classic thin metallic round wireframes with crystal clear anti-glare optical lenses
    const lensMat = makeOpticalGlassMat(accentColor, 0.22, 0.35);
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.165 * S, 0.02 * S, 10, 28),
        metalFrame,
      );
      rim.position.set(side * 0.235 * S, 0.09 * S, 0.645 * S);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.155 * S, 24), lensMat);
      lens.position.set(side * 0.235 * S, 0.09 * S, 0.646 * S);
      lens.renderOrder = 4;

      // Delicate nose pad
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.022 * S, 8, 8), makeUgcMat('#f8fafc', 0.3, 0));
      pad.position.set(side * 0.075 * S, 0.06 * S, 0.62 * S);
      socket.add(rim, lens, pad);
    }
    const bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.075 * S, 0.11 * S, 0.645 * S),
      new THREE.Vector3(0, 0.145 * S, 0.655 * S),
      new THREE.Vector3(0.075 * S, 0.11 * S, 0.645 * S),
    ]);
    const bridge = new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 10, 0.016 * S, 6, false), metalFrame);
    socket.add(bridge);
    addEyewearTemples(socket, metalFrame, metalFrame, 0.1 * S, 0.64 * S, 0.026 * S);
  } else if (id === 'aviators') {
    // Teardrop Aviator Sunglasses with double metallic brow bar & dark tinted optical glass
    const lensMat = makeOpticalGlassMat(accentColor, 0.68, 0.45);
    for (const side of [-1, 1]) {
      const outer = createAviatorLensShape(0.39 * S);
      const inner = createAviatorLensShape(0.34 * S);
      outer.holes.push(inner);
      const rimGeo = new THREE.ExtrudeGeometry(outer, {
        depth: 0.028 * S,
        bevelEnabled: true,
        bevelThickness: 0.008 * S,
        bevelSize: 0.008 * S,
        bevelSegments: 2,
      });
      rimGeo.center();
      const rim = new THREE.Mesh(rimGeo, metalFrame);
      rim.position.set(side * 0.245 * S, 0.07 * S, 0.645 * S);
      rim.rotation.z = side * -0.06;

      const lens = new THREE.Mesh(new THREE.ShapeGeometry(createAviatorLensShape(0.35 * S)), lensMat);
      lens.position.set(side * 0.245 * S, 0.07 * S, 0.648 * S);
      lens.rotation.z = side * -0.06;
      lens.renderOrder = 4;
      socket.add(rim, lens);
    }
    // Classic double aviator bridge
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * S, 0.015 * S, 0.52 * S, 8), metalFrame);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 0.205 * S, 0.65 * S);
    const midBar = new THREE.Mesh(new THREE.CylinderGeometry(0.013 * S, 0.013 * S, 0.22 * S, 8), metalFrame);
    midBar.rotation.z = Math.PI / 2;
    midBar.position.set(0, 0.14 * S, 0.65 * S);
    socket.add(topBar, midBar);
    addEyewearTemples(socket, metalFrame, metalFrame, 0.15 * S, 0.645 * S, 0.026 * S);
  } else if (id === 'heartShades') {
    // Sculpted Heart-Shaped UGC Shades with rose translucent lenses
    const lensMat = makeOpticalGlassMat(accentColor, 0.56, 0.35);
    for (const side of [-1, 1]) {
      const outer = createHeartShape(0.33 * S);
      const inner = createHeartShape(0.25 * S);
      outer.holes.push(inner);
      const rimGeo = new THREE.ExtrudeGeometry(outer, {
        depth: 0.036 * S,
        bevelEnabled: true,
        bevelThickness: 0.01 * S,
        bevelSize: 0.01 * S,
        bevelSegments: 2,
      });
      rimGeo.center();
      const rim = new THREE.Mesh(rimGeo, frameMat);
      rim.position.set(side * 0.245 * S, 0.08 * S, 0.645 * S);

      const lens = new THREE.Mesh(new THREE.ShapeGeometry(createHeartShape(0.26 * S)), lensMat);
      lens.position.set(side * 0.245 * S, 0.08 * S, 0.648 * S);
      lens.renderOrder = 4;
      socket.add(rim, lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * S, 0.018 * S, 0.18 * S, 8), frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.12 * S, 0.65 * S);
    socket.add(bridge);
    addEyewearTemples(socket, frameMat, accentMat, 0.14 * S, 0.64 * S, 0.03 * S);
  } else if (id === 'catEyeGlasses') {
    const lensMat = makeOpticalGlassMat(accentColor, 0.26, 0.32);
    for (const side of [-1, 1]) {
      const outer = createCatEyeShape(0.39 * S, side);
      const inner = createCatEyeShape(0.3 * S, side);
      outer.holes.push(inner);
      const rimGeo = new THREE.ExtrudeGeometry(outer, {
        depth: 0.036 * S,
        bevelEnabled: true,
        bevelThickness: 0.01 * S,
        bevelSize: 0.01 * S,
        bevelSegments: 2,
      });
      rimGeo.center();
      const rim = new THREE.Mesh(rimGeo, frameMat);
      rim.position.set(side * 0.245 * S, 0.085 * S, 0.645 * S);

      const lens = new THREE.Mesh(new THREE.ShapeGeometry(createCatEyeShape(0.31 * S, side)), lensMat);
      lens.position.set(side * 0.245 * S, 0.085 * S, 0.648 * S);
      lens.renderOrder = 4;

      const cornerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025 * S, 0), accentMat);
      cornerGem.position.set(side * 0.45 * S, 0.19 * S, 0.665 * S);
      socket.add(rim, lens, cornerGem);
    }
    const bridge = new THREE.Mesh(createRoundedBoxGeo(0.18 * S, 0.045 * S, 0.045 * S), frameMat);
    bridge.position.set(0, 0.12 * S, 0.648 * S);
    socket.add(bridge);
    addEyewearTemples(socket, frameMat, accentMat, 0.15 * S, 0.64 * S, 0.032 * S);
  } else if (id === 'halfRim') {
    // Sleek Browline / Half-Rim academic readers
    const lensMat = makeOpticalGlassMat(accentColor, 0.2, 0.28);
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(
        createRoundedBoxGeo(0.38 * S, 0.068 * S, 0.055 * S, 0.022 * S, 0.01 * S),
        frameMat,
      );
      brow.position.set(side * 0.245 * S, 0.175 * S, 0.645 * S);

      const lowerWireCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.07 * S, 0.16 * S, 0.645 * S),
        new THREE.Vector3(side * 0.1 * S, -0.01 * S, 0.645 * S),
        new THREE.Vector3(side * 0.245 * S, -0.03 * S, 0.645 * S),
        new THREE.Vector3(side * 0.4 * S, -0.01 * S, 0.645 * S),
        new THREE.Vector3(side * 0.42 * S, 0.16 * S, 0.645 * S),
      ]);
      const lowerWire = new THREE.Mesh(
        new THREE.TubeGeometry(lowerWireCurve, 16, 0.014 * S, 6, false),
        accentMat,
      );
      const lens = new THREE.Mesh(
        new THREE.ShapeGeometry(createRoundedRectShape(0.32 * S, 0.18 * S, 0.05 * S)),
        lensMat,
      );
      lens.position.set(side * 0.245 * S, 0.075 * S, 0.645 * S);
      lens.renderOrder = 4;
      socket.add(brow, lowerWire, lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * S, 0.016 * S, 0.16 * S, 8), accentMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.145 * S, 0.648 * S);
    socket.add(bridge);
    addEyewearTemples(socket, frameMat, accentMat, 0.16 * S, 0.64 * S, 0.034 * S);
  } else if (id === 'headphones') {
    const padMat = makeUgcMat('#14161b', 0.82, 0.02);
    const glowMat = makeEmissiveMat(accentColor, 0.75);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.67 * S, 0.072 * S, 12, 28, Math.PI),
      frameMat,
    );
    band.position.set(0, 0.12 * S, 0);
    const cushion = new THREE.Mesh(
      new THREE.TorusGeometry(0.6 * S, 0.05 * S, 10, 20, Math.PI * 0.62),
      padMat,
    );
    cushion.rotation.z = Math.PI * 0.19;
    cushion.position.set(0, 0.12 * S, 0);
    socket.add(band, cushion);

    const glowRings: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const slider = new THREE.Mesh(
        createRoundedBoxGeo(0.06 * S, 0.24 * S, 0.1 * S, 0.015 * S, 0.008 * S),
        accentMat,
      );
      slider.position.set(side * 0.66 * S, 0.12 * S, 0);
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 * S, 0.27 * S, 0.17 * S, 20),
        frameMat,
      );
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.66 * S, 0.0 * S, 0);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * S, 0.21 * S, 0.05 * S, 18),
        accentMat,
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.set(side * 0.75 * S, 0.0 * S, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2 * S, 0.022 * S, 8, 20), glowMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * 0.74 * S, 0.0 * S, 0);
      glowRings.push(ring);
      const pad = new THREE.Mesh(
        new THREE.TorusGeometry(0.2 * S, 0.068 * S, 10, 20),
        padMat,
      );
      pad.rotation.y = Math.PI / 2;
      pad.position.set(side * 0.58 * S, 0.0 * S, 0);
      socket.add(slider, cup, cap, ring, pad);
    }
    // Curved studio boom mic
    const micCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.64 * S, -0.06 * S, 0.04 * S),
      new THREE.Vector3(0.62 * S, -0.18 * S, 0.34 * S),
      new THREE.Vector3(0.34 * S, -0.22 * S, 0.62 * S),
    ]);
    const micBoom = new THREE.Mesh(new THREE.TubeGeometry(micCurve, 14, 0.02 * S, 6, false), accentMat);
    const micFoam = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * S, 0.06 * S, 6, 10), padMat);
    micFoam.rotation.z = Math.PI / 2;
    micFoam.position.set(0.32 * S, -0.22 * S, 0.63 * S);
    socket.add(micBoom, micFoam);

    update = (_sec, time) => {
      glowMat.emissiveIntensity = 0.55 + 0.35 * Math.sin(time * 3.2);
    };
  } else if (id === 'visor') {
    const glassMat = makeOpticalGlassMat(accentColor, 0.54, 0.5);
    const scanMat = makeEmissiveMat(accentColor, 1.15);
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.67 * S, 0.67 * S, 0.25 * S, 24, 1, true, -0.95, 1.9),
      glassMat,
    );
    shield.position.set(0, 0.09 * S, 0);
    shield.renderOrder = 4;
    const browBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.69 * S, 0.69 * S, 0.065 * S, 24, 1, true, -1.08, 2.16),
      frameMat,
    );
    browBar.position.set(0, 0.215 * S, 0);
    const scanLine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.682 * S, 0.682 * S, 0.024 * S, 22, 1, true, -0.82, 1.64),
      scanMat,
    );
    scanLine.position.set(0, 0.09 * S, 0);
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(
        createRoundedBoxGeo(0.14 * S, 0.26 * S, 0.3 * S, 0.03 * S, 0.015 * S),
        frameMat,
      );
      pod.position.set(side * 0.62 * S, 0.1 * S, 0.08 * S);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.03 * S, 0.14 * S, 0.04 * S), scanMat);
      led.position.set(side * 0.69 * S, 0.1 * S, 0.12 * S);
      socket.add(pod, led);
    }
    socket.add(shield, browBar, scanLine);
    update = (_sec, time) => {
      scanLine.position.y = (0.09 + Math.sin(time * 3.8) * 0.065) * S;
      scanMat.emissiveIntensity = 0.85 + 0.35 * Math.sin(time * 5.2);
    };
  } else if (id === 'vrHeadset') {
    const shellMat = makeUgcMat(color, 0.22, 0.12, { clearcoat: 0.6 });
    const facePlateMat = makeUgcMat('#0f172a', 0.1, 0.45, { clearcoat: 1.0 });
    const strapMat = makeUgcMat('#1e293b', 0.78, 0.02);
    const barMat = makeEmissiveMat(accentColor, 0.95);

    const body = new THREE.Mesh(
      createRoundedBoxGeo(0.98 * S, 0.42 * S, 0.44 * S, 0.1 * S, 0.035 * S),
      shellMat,
    );
    body.position.set(0, 0.1 * S, 0.62 * S);

    const visorGlass = new THREE.Mesh(
      createRoundedBoxGeo(0.86 * S, 0.3 * S, 0.08 * S, 0.07 * S, 0.018 * S),
      facePlateMat,
    );
    visorGlass.position.set(0, 0.1 * S, 0.82 * S);

    const lightBar = new THREE.Mesh(
      createRoundedBoxGeo(0.62 * S, 0.045 * S, 0.04 * S, 0.015 * S, 0.008 * S),
      barMat,
    );
    lightBar.position.set(0, 0.1 * S, 0.865 * S);

    const sideStrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 * S, 0.62 * S, 0.14 * S, 22, 1, true),
      strapMat,
    );
    sideStrap.position.set(0, 0.11 * S, 0);

    const topStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.61 * S, 0.055 * S, 8, 20, Math.PI),
      strapMat,
    );
    topStrap.rotation.y = Math.PI / 2;
    topStrap.position.set(0, 0.04 * S, 0);

    socket.add(body, visorGlass, lightBar, sideStrap, topStrap);
    update = (_sec, time) => {
      barMat.emissiveIntensity = 0.7 + 0.4 * Math.sin(time * 2.8);
    };
  } else if (id === 'goggles') {
    const strapMat = makeUgcMat(color, 0.72, 0.04);
    const brassMat = makeMetalMat('#b45309', 0.22, 0.85);
    const lensMat = makeOpticalGlassMat(accentColor, 0.52, 0.4);
    const strap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.625 * S, 0.625 * S, 0.17 * S, 22, 1, true),
      strapMat,
    );
    strap.position.set(0, 0.12 * S, 0);
    for (const side of [-1, 1]) {
      const bezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.185 * S, 0.21 * S, 0.16 * S, 18),
        brassMat,
      );
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(side * 0.245 * S, 0.12 * S, 0.62 * S);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185 * S, 0.025 * S, 8, 18), accentMat);
      rim.position.set(side * 0.245 * S, 0.12 * S, 0.7 * S);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.165 * S, 18), lensMat);
      glass.position.set(side * 0.245 * S, 0.12 * S, 0.705 * S);
      glass.renderOrder = 4;
      socket.add(bezel, rim, glass);
    }
    const bridge = new THREE.Mesh(createRoundedBoxGeo(0.2 * S, 0.07 * S, 0.08 * S), strapMat);
    bridge.position.set(0, 0.12 * S, 0.63 * S);
    socket.add(strap, bridge);
  } else if (id === 'domino') {
    // Sculpted contoured hero domino mask with eye cutouts
    const maskShape = new THREE.Shape();
    maskShape.moveTo(-0.46 * S, 0.12 * S);
    maskShape.quadraticCurveTo(0, 0.18 * S, 0.46 * S, 0.12 * S);
    maskShape.quadraticCurveTo(0.49 * S, -0.08 * S, 0.28 * S, -0.14 * S);
    maskShape.quadraticCurveTo(0, -0.02 * S, -0.28 * S, -0.14 * S);
    maskShape.quadraticCurveTo(-0.49 * S, -0.08 * S, -0.46 * S, 0.12 * S);

    for (const side of [-1, 1]) {
      const eyeHole = new THREE.Path();
      eyeHole.absellipse(side * 0.22 * S, 0.01 * S, 0.12 * S, 0.068 * S, 0, Math.PI * 2, false, side * 0.12);
      maskShape.holes.push(eyeHole);
    }
    const maskGeo = new THREE.ExtrudeGeometry(maskShape, {
      depth: 0.045 * S,
      bevelEnabled: true,
      bevelThickness: 0.012 * S,
      bevelSize: 0.012 * S,
      bevelSegments: 2,
    });
    maskGeo.center();
    const mask = new THREE.Mesh(maskGeo, frameMat);
    mask.position.set(0, 0.095 * S, 0.635 * S);

    const browTrim = new THREE.Mesh(
      createRoundedBoxGeo(0.9 * S, 0.036 * S, 0.04 * S, 0.01 * S, 0.006 * S),
      accentMat,
    );
    browTrim.position.set(0, 0.205 * S, 0.648 * S);

    const strap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6 * S, 0.6 * S, 0.06 * S, 20, 1, true),
      frameMat,
    );
    strap.position.set(0, 0.095 * S, 0);
    socket.add(mask, browTrim, strap);
  } else if (id === 'faceMask') {
    // Contoured streetwear cloth face mask with ear loops and center pleat seam
    const clothMat = makeUgcMat(color, 0.84, 0.02);
    const loopMat = makeUgcMat(accentColor, 0.6, 0.04);

    const mainPanel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.645 * S, 0.61 * S, 0.42 * S, 20, 1, false, -0.92, 1.84),
      clothMat,
    );
    mainPanel.position.set(0, -0.22 * S, 0.02 * S);

    const noseBridge = new THREE.Mesh(
      createRoundedBoxGeo(0.24 * S, 0.06 * S, 0.08 * S, 0.02 * S, 0.01 * S),
      clothMat,
    );
    noseBridge.position.set(0, -0.02 * S, 0.635 * S);

    const seamLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.028 * S, 0.36 * S, 0.03 * S),
      loopMat,
    );
    seamLine.position.set(0, -0.21 * S, 0.655 * S);

    for (const side of [-1, 1]) {
      const earLoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.14 * S, 0.016 * S, 6, 16, Math.PI * 1.4),
        loopMat,
      );
      earLoop.rotation.y = side * (Math.PI / 2 - 0.15);
      earLoop.position.set(side * 0.59 * S, -0.18 * S, 0.24 * S);
      socket.add(earLoop);
    }
    socket.add(mainPanel, noseBridge, seamLine);
  } else if (id === 'kitsuneMask') {
    // Sculpted side-tilted Japanese Kitsune fox mask worn jauntily on upper-right temple
    const maskGroup = new THREE.Group();
    maskGroup.position.set(0.46 * S, 0.34 * S, 0.42 * S);
    maskGroup.rotation.set(-0.22, 0.72, -0.18);

    const porcelainMat = makeUgcMat(color, 0.24, 0.08, { clearcoat: 0.75 });
    const paintMat = makeUgcMat(accentColor, 0.32, 0.1);
    const darkMat = makeUgcMat('#111827', 0.4, 0.05);

    const facePlate = new THREE.Mesh(
      createRoundedBoxGeo(0.56 * S, 0.58 * S, 0.16 * S, 0.18 * S, 0.04 * S),
      porcelainMat,
    );
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.16 * S, 0.26 * S, 6), porcelainMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.1 * S, 0.14 * S);

    const foreheadMark = new THREE.Mesh(new THREE.OctahedronGeometry(0.065 * S, 0), paintMat);
    foreheadMark.scale.set(0.8, 1.35, 0.4);
    foreheadMark.position.set(0, 0.14 * S, 0.09 * S);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13 * S, 0.34 * S, 4), porcelainMat);
      ear.position.set(side * 0.18 * S, 0.4 * S, 0.01 * S);
      ear.rotation.z = -side * 0.18;
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.08 * S, 0.22 * S, 4), paintMat);
      innerEar.position.set(side * 0.18 * S, 0.38 * S, 0.055 * S);
      innerEar.rotation.z = -side * 0.18;

      const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.15 * S, 0.036 * S, 0.03 * S), darkMat);
      eyeSlit.position.set(side * 0.13 * S, 0.02 * S, 0.085 * S);
      eyeSlit.rotation.z = side * 0.22;

      const cheekStripe = new THREE.Mesh(new THREE.BoxGeometry(0.14 * S, 0.028 * S, 0.028 * S), paintMat);
      cheekStripe.position.set(side * 0.17 * S, -0.09 * S, 0.082 * S);
      cheekStripe.rotation.z = -side * 0.25;
      maskGroup.add(ear, innerEar, eyeSlit, cheekStripe);
    }

    const cord = new THREE.Mesh(
      new THREE.TorusGeometry(0.6 * S, 0.022 * S, 6, 24),
      paintMat,
    );
    cord.rotation.x = Math.PI / 2 - 0.18;
    cord.position.set(0, 0.24 * S, 0);

    maskGroup.add(facePlate, snout, foreheadMark);
    socket.add(maskGroup, cord);
  } else if (id === 'monocle') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.165 * S, 0.022 * S, 10, 24),
      metalFrame,
    );
    ring.position.set(0.23 * S, 0.09 * S, 0.648 * S);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.15 * S, 20),
      makeOpticalGlassMat(accentColor, 0.26, 0.4),
    );
    lens.position.set(0.23 * S, 0.09 * S, 0.65 * S);
    lens.renderOrder = 4;

    const chainPivot = new THREE.Group();
    chainPivot.position.set(0.39 * S, 0.06 * S, 0.63 * S);
    const chainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.06 * S, -0.18 * S, -0.02 * S),
      new THREE.Vector3(0.03 * S, -0.36 * S, -0.06 * S),
    ]);
    const chain = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 12, 0.011 * S, 6, false), metalFrame);
    chainPivot.add(chain);
    socket.add(ring, lens, chainPivot);

    update = (sec, time) => {
      chainPivot.rotation.z = sec.hairRoll * 0.8 + Math.sin(time * 2.4) * 0.04;
      chainPivot.rotation.x = sec.hairPitch * 0.5;
    };
  }

  enableShadows(socket);
  return { update };
}

// =========================================================================
// 2. HATS, HELMETS, CROWNS & HEADGEAR
// =========================================================================

export function buildHatAccessory(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f2f3f3',
): AccessoryAnimHandle {
  disposeAccessoryGroup(socket);
  if (id === 'none') return {};

  const primaryMat = makeUgcMat(color, 0.64, 0.06);
  const accentMat = makeUgcMat(accentColor, 0.44, 0.14);
  const metalPrimary = makeMetalMat(color, 0.2, 0.86);
  const metalAccent = makeMetalMat(accentColor, 0.18, 0.88);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'cap' || id === 'backwardsCap') {
    const dir = id === 'backwardsCap' ? -1 : 1;
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.66 * S, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
      primaryMat,
    );
    crown.position.y = -0.06 * S;
    const sweatBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.665 * S, 0.665 * S, 0.09 * S, 22),
      accentMat,
    );
    sweatBand.position.y = -0.04 * S;

    // Curved sculpted snapback brim
    const brimShape = createRoundedRectShape(1.06 * S, 0.72 * S, 0.34 * S);
    const brimGeo = new THREE.ExtrudeGeometry(brimShape, {
      depth: 0.05 * S,
      bevelEnabled: true,
      bevelThickness: 0.015 * S,
      bevelSize: 0.015 * S,
      bevelSegments: 2,
    });
    brimGeo.center();
    const brim = new THREE.Mesh(brimGeo, primaryMat);
    brim.rotation.x = Math.PI / 2 + dir * 0.08;
    brim.position.set(0, -0.04 * S, dir * 0.54 * S);

    const button = new THREE.Mesh(new THREE.SphereGeometry(0.065 * S, 10, 8), accentMat);
    button.position.y = 0.6 * S;

    const patch = new THREE.Mesh(
      createRoundedBoxGeo(0.26 * S, 0.18 * S, 0.04 * S, 0.04 * S, 0.008 * S),
      accentMat,
    );
    patch.position.set(0, 0.22 * S, dir * 0.61 * S);
    patch.rotation.x = -dir * 0.22;

    socket.add(crown, sweatBand, brim, button, patch);
  } else if (id === 'beanie') {
    const knitMat = makeUgcMat(color, 0.88, 0.02);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.685 * S, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      knitMat,
    );
    dome.scale.set(1, 1.06, 1.05);
    dome.position.set(0, -0.06 * S, -0.03 * S);
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.635 * S, 0.125 * S, 12, 26),
      accentMat,
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.05 * S;
    const labelTag = new THREE.Mesh(
      createRoundedBoxGeo(0.18 * S, 0.1 * S, 0.04 * S, 0.015 * S, 0.006 * S),
      makeUgcMat('#181c24', 0.5, 0.1),
    );
    labelTag.position.set(0.28 * S, -0.05 * S, 0.68 * S);
    labelTag.rotation.y = 0.36;

    const pom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 * S, 1), accentMat);
    pom.position.set(0, 0.68 * S, -0.04 * S);
    socket.add(dome, cuff, labelTag, pom);
    update = (sec) => {
      pom.position.x = sec.hatLagZ * 0.45 * S;
      pom.position.z = (-0.04 - sec.hatLagX * 0.45) * S;
    };
  } else if (id === 'bucketHat') {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56 * S, 0.65 * S, 0.46 * S, 24),
      primaryMat,
    );
    crown.position.y = 0.18 * S;
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * S, 0.56 * S, 0.04 * S, 24), primaryMat);
    topCap.position.y = 0.42 * S;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.658 * S, 0.665 * S, 0.09 * S, 24),
      accentMat,
    );
    band.position.y = -0.01 * S;
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65 * S, 0.98 * S, 0.24 * S, 28, 1, true),
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.72, sheen: 0.35, side: THREE.DoubleSide }),
    );
    brim.position.y = -0.14 * S;
    const brimEdge = new THREE.Mesh(new THREE.TorusGeometry(0.97 * S, 0.022 * S, 8, 28), accentMat);
    brimEdge.rotation.x = Math.PI / 2;
    brimEdge.position.y = -0.25 * S;
    socket.add(crown, topCap, band, brim, brimEdge);
  } else if (id === 'beret') {
    const woolMat = makeUgcMat(color, 0.86, 0.02);
    const beretGroup = new THREE.Group();
    beretGroup.position.set(-0.08 * S, 0.14 * S, -0.02 * S);
    beretGroup.rotation.set(-0.08, 0, 0.24);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.76 * S, 24, 16), woolMat);
    puff.scale.set(1.08, 0.42, 1.05);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.58 * S, 0.06 * S, 8, 24), makeUgcMat('#181c24', 0.6, 0.05));
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.18 * S;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * S, 0.04 * S, 0.14 * S, 8), woolMat);
    stem.position.set(0.04 * S, 0.33 * S, 0);
    stem.rotation.z = -0.22;
    const pin = new THREE.Mesh(new THREE.OctahedronGeometry(0.065 * S, 0), metalAccent);
    pin.scale.set(1, 1, 0.35);
    pin.position.set(0.45 * S, -0.02 * S, 0.56 * S);
    beretGroup.add(puff, band, stem, pin);
    socket.add(beretGroup);
  } else if (id === 'cowboyHat') {
    const leatherMat = makeUgcMat(color, 0.54, 0.08, { clearcoat: 0.12 });
    // Sculpted curved saddle brim using Lathe + vertex lift on sides
    const brimGeo = new THREE.CylinderGeometry(1.16 * S, 1.18 * S, 0.06 * S, 32, 1, false);
    const pos = brimGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r > 0.6 * S) {
        const sideLift = (x * x) / (1.18 * S * 1.18 * S) * 0.26 * S;
        const frontDip = -(z * z) / (1.18 * S * 1.18 * S) * 0.07 * S;
        pos.setY(i, pos.getY(i) + sideLift + frontDip);
      }
    }
    brimGeo.computeVertexNormals();
    const brim = new THREE.Mesh(brimGeo, leatherMat);
    brim.position.y = 0.02 * S;

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * S, 0.62 * S, 0.56 * S, 20), leatherMat);
    crown.position.y = 0.3 * S;
    const creaseL = new THREE.Mesh(new THREE.CapsuleGeometry(0.14 * S, 0.36 * S, 6, 10), leatherMat);
    creaseL.rotation.x = Math.PI / 2;
    creaseL.position.set(-0.22 * S, 0.56 * S, 0);
    const creaseR = creaseL.clone();
    creaseR.position.x = 0.22 * S;

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.625 * S, 0.635 * S, 0.1 * S, 22), makeUgcMat('#2c1810', 0.45, 0.1));
    band.position.y = 0.08 * S;
    const buckle = new THREE.Mesh(createRoundedBoxGeo(0.2 * S, 0.13 * S, 0.05 * S), metalAccent);
    buckle.position.set(0, 0.08 * S, 0.64 * S);
    socket.add(brim, crown, creaseL, creaseR, band, buckle);
  } else if (id === 'ushanka') {
    const shellMat = makeUgcMat(color, 0.72, 0.04);
    const furMat = makeUgcMat(accentColor, 0.94, 0.0);
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 * S, 0.66 * S, 0.52 * S, 18),
      shellMat,
    );
    crown.position.y = 0.18 * S;
    const topDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.62 * S, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      shellMat,
    );
    topDome.scale.y = 0.35;
    topDome.position.y = 0.43 * S;
    const frontFur = new THREE.Mesh(
      createRoundedBoxGeo(0.92 * S, 0.38 * S, 0.22 * S, 0.08 * S, 0.03 * S),
      furMat,
    );
    frontFur.position.set(0, 0.12 * S, 0.6 * S);

    const earFlaps: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const flapPivot = new THREE.Group();
      flapPivot.position.set(side * 0.66 * S, 0.06 * S, 0.02 * S);
      const flap = new THREE.Mesh(
        createRoundedBoxGeo(0.18 * S, 0.62 * S, 0.36 * S, 0.07 * S, 0.025 * S),
        furMat,
      );
      flap.position.set(0, -0.24 * S, 0);
      flapPivot.add(flap);
      socket.add(flapPivot);
      earFlaps.push(flapPivot);
    }
    socket.add(crown, topDome, frontFur);
    update = (sec) => {
      earFlaps.forEach((f, idx) => {
        const sgn = idx === 0 ? -1 : 1;
        f.rotation.z = sgn * 0.08 + sec.hatLagZ * 0.6;
        f.rotation.x = sec.hatLagX * 0.5;
      });
    };
  } else if (id === 'tophat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.94 * S, 0.96 * S, 0.07 * S, 28), primaryMat);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.65 * S, 0.59 * S, 0.96 * S, 26), primaryMat);
    crown.position.y = 0.5 * S;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.606 * S, 0.606 * S, 0.17 * S, 26), accentMat);
    band.position.y = 0.14 * S;
    const buckle = new THREE.Mesh(createRoundedBoxGeo(0.18 * S, 0.14 * S, 0.04 * S), metalAccent);
    buckle.position.set(0, 0.14 * S, 0.61 * S);
    socket.add(brim, crown, band, buckle);
  } else if (id === 'fedora') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.98 * S, 1.0 * S, 0.06 * S, 28), primaryMat);
    brim.rotation.x = 0.06;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.49 * S, 0.62 * S, 0.52 * S, 22), primaryMat);
    crown.position.y = 0.26 * S;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.615 * S, 0.625 * S, 0.1 * S, 22), accentMat);
    band.position.y = 0.08 * S;
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.055 * S, 0.34 * S, 6), accentMat);
    feather.position.set(0.56 * S, 0.24 * S, 0.1 * S);
    feather.rotation.z = -0.45;
    socket.add(brim, crown, band, feather);
  } else if (id === 'valkyrie') {
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.68 * S, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      metalPrimary,
    );
    helm.position.y = -0.1 * S;
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.66 * S, 0.065 * S, 10, 24), metalAccent);
    brow.rotation.x = Math.PI / 2;
    brow.position.y = -0.05 * S;
    const crest = new THREE.Mesh(createRoundedBoxGeo(0.12 * S, 0.34 * S, 0.85 * S, 0.04 * S, 0.015 * S), metalAccent);
    crest.position.set(0, 0.56 * S, -0.02 * S);
    const wingPivots: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const wp = new THREE.Group();
      wp.position.set(side * 0.66 * S, 0.12 * S, -0.02 * S);
      for (let i = 0; i < 3; i++) {
        const feather = new THREE.Mesh(
          createRoundedBoxGeo(0.11 * S, (0.58 - i * 0.1) * S, (0.28 - i * 0.04) * S, 0.03 * S, 0.01 * S),
          metalAccent,
        );
        feather.position.set(side * (0.14 + i * 0.08) * S, (0.2 + i * 0.12) * S, -i * 0.14 * S);
        feather.rotation.z = -side * (0.52 + i * 0.14);
        feather.rotation.x = -0.25 - i * 0.12;
        wp.add(feather);
      }
      socket.add(wp);
      wingPivots.push(wp);
    }
    socket.add(helm, brow, crest);
    update = (_sec, time) => {
      wingPivots.forEach((wp, idx) => {
        const sgn = idx === 0 ? -1 : 1;
        wp.rotation.z = sgn * Math.sin(time * 3.0) * 0.06;
      });
    };
  } else if (id === 'knightHelm') {
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65 * S, 0.68 * S, 0.92 * S, 20),
      metalPrimary,
    );
    dome.position.y = -0.12 * S;
    const topCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.65 * S, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      metalPrimary,
    );
    topCap.position.y = 0.34 * S;
    const visor = new THREE.Mesh(
      createRoundedBoxGeo(1.06 * S, 0.22 * S, 0.24 * S, 0.04 * S, 0.015 * S),
      makeMetalMat('#111827', 0.35, 0.7),
    );
    visor.position.set(0, -0.22 * S, 0.62 * S);
    const plume = new THREE.Group();
    plume.position.set(0, 0.92 * S, -0.05 * S);
    const plumeMesh = new THREE.Mesh(
      createRoundedBoxGeo(0.16 * S, 0.44 * S, 0.88 * S, 0.06 * S, 0.02 * S),
      accentMat,
    );
    plume.add(plumeMesh);
    socket.add(dome, topCap, visor, plume);
    update = (sec) => {
      plume.rotation.x = -sec.hatLagX * 0.9;
      plume.rotation.z = sec.hatLagZ * 0.8;
    };
  } else if (id === 'wizard' || id === 'witchHat') {
    const isWitch = id === 'witchHat';
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.18 * S, 1.24 * S, 0.07 * S, 28), primaryMat);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.64 * S, 1.38 * S, 22), primaryMat);
    cone.position.set(0, 0.68 * S, -0.08 * S);
    cone.rotation.x = isWitch ? -0.24 : -0.14;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24 * S, 0.52 * S, 14), primaryMat);
    tip.position.set(0, 1.34 * S, isWitch ? -0.34 * S : -0.22 * S);
    tip.rotation.x = isWitch ? -0.62 : -0.34;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.61 * S, 0.64 * S, 0.14 * S, 22), accentMat);
    band.position.y = 0.09 * S;
    const buckle = new THREE.Mesh(createRoundedBoxGeo(0.2 * S, 0.16 * S, 0.06 * S), metalAccent);
    buckle.position.set(0, 0.09 * S, 0.63 * S);
    socket.add(brim, cone, tip, band, buckle);
  } else if (id === 'crown') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58 * S, 0.54 * S, 0.24 * S, 20), metalPrimary);
    base.position.y = 0.09 * S;
    const velvet = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * S, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      accentMat,
    );
    velvet.scale.y = 0.65;
    velvet.position.y = 0.14 * S;
    socket.add(base, velvet);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11 * S, 0.34 * S, 4), metalPrimary);
      spike.position.set(Math.sin(angle) * 0.52 * S, 0.36 * S, Math.cos(angle) * 0.52 * S);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.068 * S, 0), makeEmissiveMat(accentColor, 0.45));
      gem.position.set(Math.sin(angle) * 0.58 * S, 0.12 * S, Math.cos(angle) * 0.58 * S);
      socket.add(spike, gem);
    }
  } else if (id === 'hood') {
    const cowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.76 * S, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.78),
      primaryMat,
    );
    cowl.scale.set(1.04, 1.06, 1.15);
    cowl.position.set(0, -0.32 * S, -0.1 * S);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68 * S, 0.08 * S, 10, 22), accentMat);
    rim.position.set(0, -0.3 * S, 0.56 * S);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.32 * S, 0.64 * S, 10), primaryMat);
    tail.rotation.x = -Math.PI / 2 - 0.3;
    tail.position.set(0, -0.14 * S, -0.82 * S);
    socket.add(cowl, rim, tail);
  } else if (id === 'halo') {
    const haloPivot = new THREE.Group();
    haloPivot.position.y = 0.46 * S;
    const haloMat = makeEmissiveMat(color, 1.05);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56 * S, 0.055 * S, 12, 32), haloMat);
    ring.rotation.x = Math.PI / 2;
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.45 * S, 0.02 * S, 8, 24), makeEmissiveMat(accentColor, 0.9));
    innerRing.rotation.x = Math.PI / 2;
    haloPivot.add(ring, innerRing);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.068 * S, 0), makeEmissiveMat(accentColor, 1.0));
      star.position.set(Math.cos(a) * 0.64 * S, 0, Math.sin(a) * 0.64 * S);
      haloPivot.add(star);
    }
    socket.add(haloPivot);
    update = (_sec, time) => {
      haloPivot.position.y = (0.46 + Math.sin(time * 2.6) * 0.055) * S;
      haloPivot.rotation.y = time * 0.85;
    };
  } else if (id === 'demonHorns') {
    const hornMat = makeUgcMat(color, 0.25, 0.25, { clearcoat: 0.5 });
    const bandMat = makeMetalMat(accentColor, 0.2, 0.85);
    for (const side of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.34 * S, -0.02 * S, 0.16 * S),
        new THREE.Vector3(side * 0.54 * S, 0.24 * S, 0.2 * S),
        new THREE.Vector3(side * 0.48 * S, 0.54 * S, 0.06 * S),
        new THREE.Vector3(side * 0.38 * S, 0.72 * S, -0.06 * S),
      ]);
      const segs = 12;
      const hornGeo = new THREE.TubeGeometry(curve, segs, 0.105 * S, 10, false);
      // Taper radius along horn length
      const pos = hornGeo.attributes.position;
      const centerPts = curve.getSpacedPoints(segs);
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const taper = Math.max(0.08, 1 - t * 0.92);
        const c = centerPts[i];
        for (let j = 0; j <= 10; j++) {
          const idx = i * 11 + j;
          if (idx < pos.count) {
            pos.setXYZ(
              idx,
              c.x + (pos.getX(idx) - c.x) * taper,
              c.y + (pos.getY(idx) - c.y) * taper,
              c.z + (pos.getZ(idx) - c.z) * taper,
            );
          }
        }
      }
      hornGeo.computeVertexNormals();
      const horn = new THREE.Mesh(hornGeo, hornMat);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.11 * S, 0.025 * S, 8, 14), bandMat);
      collar.position.set(side * 0.37 * S, 0.04 * S, 0.17 * S);
      collar.rotation.set(Math.PI / 2 - 0.3, 0, -side * 0.4);
      socket.add(horn, collar);
    }
  } else if (id === 'bunnyEars') {
    const plushMat = makeUgcMat(color, 0.9, 0.0);
    const innerMat = makeUgcMat(accentColor, 0.78, 0.02);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.58 * S, 0.055 * S, 8, 24, Math.PI), plushMat);
    band.position.y = -0.32 * S;
    socket.add(band);

    const earPivots: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const ep = new THREE.Group();
      ep.position.set(side * 0.28 * S, 0.08 * S, 0.02 * S);
      const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.14 * S, 0.62 * S, 8, 12), plushMat);
      outer.scale.set(0.9, 1, 0.55);
      outer.position.y = 0.36 * S;
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.085 * S, 0.44 * S, 6, 10), innerMat);
      inner.scale.set(0.85, 1, 0.4);
      inner.position.set(0, 0.34 * S, 0.055 * S);
      ep.add(outer, inner);
      if (side === 1) {
        // Playful slightly folded tip on one ear
        ep.rotation.z = -0.22;
        ep.rotation.x = 0.14;
      } else {
        ep.rotation.z = 0.16;
      }
      socket.add(ep);
      earPivots.push(ep);
    }
    update = (sec, time) => {
      earPivots.forEach((ep, i) => {
        const sgn = i === 0 ? -1 : 1;
        ep.rotation.z = sgn * -0.18 + sec.hatLagZ * 0.9 + Math.sin(time * 2.5 + i) * 0.04;
        ep.rotation.x = (i === 1 ? 0.14 : 0.02) + sec.hatLagX * 0.9;
      });
    };
  }

  enableShadows(socket);
  return { update };
}

// =========================================================================
// 3. NECKWEAR ACCESSORIES (Mounted on Torso Collar)
// =========================================================================

export function buildNeckAccessory(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f8fafc',
): AccessoryAnimHandle {
  disposeAccessoryGroup(socket);
  if (id === 'none') return {};

  const primaryMat = makeUgcMat(color, 0.68, 0.05);
  const accentMat = makeUgcMat(accentColor, 0.5, 0.12);
  const metalPrimary = makeMetalMat(color, 0.16, 0.92);
  const metalAccent = makeMetalMat(accentColor, 0.18, 0.9);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'cubanChain') {
    // Draped metallic Cuban links across the upper chest
    const linkCount = 15;
    for (let i = 0; i < linkCount; i++) {
      const t = i / (linkCount - 1);
      const angle = (t - 0.5) * Math.PI * 1.15;
      const x = Math.sin(angle) * 0.52 * S;
      const z = Math.cos(angle) * 0.34 * S + 0.24 * S;
      const drapeY = -0.02 * S - Math.cos(angle * 0.95) * 0.36 * S;
      const link = new THREE.Mesh(
        new THREE.TorusGeometry(0.068 * S, 0.028 * S, 8, 12),
        i % 4 === 0 ? metalAccent : metalPrimary,
      );
      link.position.set(x, drapeY, z);
      link.rotation.set(0.25, angle, (i % 2 === 0 ? 1 : -1) * 0.35);
      socket.add(link);
    }
    const charmPivot = new THREE.Group();
    charmPivot.position.set(0, -0.39 * S, 0.58 * S);
    const pendant = new THREE.Mesh(
      createRoundedBoxGeo(0.22 * S, 0.24 * S, 0.05 * S, 0.04 * S, 0.012 * S),
      metalAccent,
    );
    pendant.position.y = -0.11 * S;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 * S, 0), makeEmissiveMat(accentColor, 0.5));
    gem.position.set(0, -0.11 * S, 0.03 * S);
    charmPivot.add(pendant, gem);
    socket.add(charmPivot);
    update = (sec, time) => {
      charmPivot.rotation.z = sec.capeRoll * 0.8 + Math.sin(time * 2.2) * 0.04;
      charmPivot.rotation.x = Math.max(-0.2, sec.capePitch * 0.5);
    };
  } else if (id === 'knitScarf') {
    const knitMat = makeUgcMat(color, 0.9, 0.0);
    const stripeMat = makeUgcMat(accentColor, 0.88, 0.0);
    const collarWrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.56 * S, 0.16 * S, 12, 26),
      knitMat,
    );
    collarWrap.rotation.x = Math.PI / 2;
    collarWrap.scale.set(1.22, 1.06, 0.95);
    collarWrap.position.y = 0.05 * S;

    const frontTail = new THREE.Group();
    frontTail.position.set(0.32 * S, -0.02 * S, 0.58 * S);
    const tailBody = new THREE.Mesh(
      createRoundedBoxGeo(0.34 * S, 0.88 * S, 0.12 * S, 0.04 * S, 0.02 * S),
      knitMat,
    );
    tailBody.position.y = -0.42 * S;
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.35 * S, 0.09 * S, 0.13 * S), stripeMat);
    stripe1.position.y = -0.66 * S;
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.35 * S, 0.09 * S, 0.13 * S), stripeMat);
    stripe2.position.y = -0.79 * S;
    frontTail.add(tailBody, stripe1, stripe2);

    const backTail = new THREE.Group();
    backTail.position.set(-0.24 * S, -0.02 * S, -0.58 * S);
    const bBody = new THREE.Mesh(
      createRoundedBoxGeo(0.32 * S, 0.78 * S, 0.11 * S, 0.04 * S, 0.02 * S),
      knitMat,
    );
    bBody.position.y = -0.38 * S;
    const bStripe = new THREE.Mesh(new THREE.BoxGeometry(0.33 * S, 0.1 * S, 0.12 * S), stripeMat);
    bStripe.position.y = -0.66 * S;
    backTail.add(bBody, bStripe);

    socket.add(collarWrap, frontTail, backTail);
    update = (sec, time) => {
      frontTail.rotation.x = -0.06 - sec.capePitch * 0.45 + Math.sin(time * 2.1) * 0.03;
      frontTail.rotation.z = sec.capeRoll * 0.6;
      backTail.rotation.x = 0.1 + sec.capePitch * 0.9 + Math.cos(time * 2.1) * 0.03;
      backTail.rotation.z = sec.capeRoll * 0.8;
    };
  } else if (id === 'necktie') {
    const tiePivot = new THREE.Group();
    tiePivot.position.set(0, -0.02 * S, 0.56 * S);
    const knot = new THREE.Mesh(
      createRoundedBoxGeo(0.2 * S, 0.18 * S, 0.1 * S, 0.04 * S, 0.015 * S),
      primaryMat,
    );
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.07 * S, 0);
    bladeShape.lineTo(0.07 * S, 0);
    bladeShape.lineTo(0.15 * S, -0.92 * S);
    bladeShape.lineTo(0, -1.14 * S);
    bladeShape.lineTo(-0.15 * S, -0.92 * S);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.045 * S,
      bevelEnabled: true,
      bevelThickness: 0.01 * S,
      bevelSize: 0.01 * S,
      bevelSegments: 2,
    });
    const blade = new THREE.Mesh(bladeGeo, primaryMat);
    blade.position.set(0, -0.06 * S, -0.02 * S);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.24 * S, 0.045 * S, 0.07 * S), metalAccent);
    clip.position.set(0, -0.58 * S, 0.02 * S);
    tiePivot.add(knot, blade, clip);
    socket.add(tiePivot);
    update = (sec) => {
      tiePivot.rotation.x = Math.max(-0.04, -sec.capePitch * 0.55);
      tiePivot.rotation.z = sec.capeRoll * 0.5;
    };
  } else if (id === 'bowTie') {
    const center = new THREE.Mesh(createRoundedBoxGeo(0.14 * S, 0.14 * S, 0.1 * S), accentMat);
    center.position.set(0, -0.06 * S, 0.57 * S);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.15 * S, 0.34 * S, 4), primaryMat);
      wing.rotation.z = side * (Math.PI / 2);
      wing.rotation.x = Math.PI / 4;
      wing.scale.set(1, 1, 0.45);
      wing.position.set(side * 0.19 * S, -0.06 * S, 0.56 * S);
      socket.add(wing);
    }
    socket.add(center);
  } else if (id === 'spikedChoker') {
    const leatherMat = makeUgcMat(color, 0.42, 0.12);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.46 * S, 0.48 * S, 0.15 * S, 20), leatherMat);
    band.position.y = 0.06 * S;
    socket.add(band);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05 * S, 0.16 * S, 8), metalAccent);
      spike.position.set(Math.sin(a) * 0.52 * S, 0.06 * S, Math.cos(a) * 0.52 * S);
      spike.rotation.z = -Math.sin(a) * (Math.PI / 2);
      spike.rotation.x = Math.cos(a) * (Math.PI / 2);
      socket.add(spike);
    }
  } else if (id === 'pearlNecklace') {
    const pearlMat = makeUgcMat(color, 0.14, 0.15, { clearcoat: 1.0, iridescence: 0.45 });
    const count = 17;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const angle = (t - 0.5) * Math.PI * 1.3;
      const x = Math.sin(angle) * 0.5 * S;
      const z = Math.cos(angle) * 0.32 * S + 0.24 * S;
      const y = -0.02 * S - Math.cos(angle * 0.85) * 0.28 * S;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.056 * S, 12, 10), pearlMat);
      pearl.position.set(x, y, z);
      socket.add(pearl);
    }
    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.075 * S, 0), metalAccent);
    clasp.position.set(0, -0.34 * S, 0.57 * S);
    socket.add(clasp);
  } else if (id === 'lanyard') {
    const strapMat = makeUgcMat(color, 0.62, 0.05);
    const badgeMat = makeUgcMat(accentColor, 0.3, 0.08, { clearcoat: 0.5 });
    for (const side of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.44 * S, 0.04 * S, 0.14 * S),
        new THREE.Vector3(side * 0.34 * S, -0.18 * S, 0.56 * S),
        new THREE.Vector3(side * 0.04 * S, -0.68 * S, 0.58 * S),
      ]);
      const strap = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.032 * S, 6, false), strapMat);
      socket.add(strap);
    }
    const cardPivot = new THREE.Group();
    cardPivot.position.set(0, -0.68 * S, 0.58 * S);
    const clip = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * S, 0.03 * S, 0.09 * S, 8), metalAccent);
    const card = new THREE.Mesh(createRoundedBoxGeo(0.36 * S, 0.46 * S, 0.04 * S, 0.03 * S, 0.008 * S), badgeMat);
    card.position.y = -0.26 * S;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32 * S, 0.08 * S, 0.046 * S), strapMat);
    stripe.position.y = -0.12 * S;
    const photo = new THREE.Mesh(new THREE.BoxGeometry(0.14 * S, 0.14 * S, 0.046 * S), makeUgcMat('#334155', 0.4, 0.1));
    photo.position.set(-0.07 * S, -0.28 * S, 0);
    cardPivot.add(clip, card, stripe, photo);
    socket.add(cardPivot);
    update = (sec, time) => {
      cardPivot.rotation.z = sec.capeRoll * 0.9 + Math.sin(time * 2.5) * 0.04;
      cardPivot.rotation.x = Math.max(-0.08, -sec.capePitch * 0.7);
    };
  } else if (id === 'goldMedallion') {
    const chainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.46 * S, 0.04 * S, 0.2 * S),
      new THREE.Vector3(-0.34 * S, -0.28 * S, 0.57 * S),
      new THREE.Vector3(0, -0.52 * S, 0.59 * S),
      new THREE.Vector3(0.34 * S, -0.28 * S, 0.57 * S),
      new THREE.Vector3(0.46 * S, 0.04 * S, 0.2 * S),
    ]);
    const chain = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 22, 0.026 * S, 8, false), metalPrimary);
    const medPivot = new THREE.Group();
    medPivot.position.set(0, -0.52 * S, 0.59 * S);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.21 * S, 0.21 * S, 0.05 * S, 20), metalPrimary);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = -0.18 * S;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1 * S, 0), makeEmissiveMat(accentColor, 0.75));
    gem.position.set(0, -0.18 * S, 0.03 * S);
    medPivot.add(disc, gem);
    socket.add(chain, medPivot);
    update = (sec, time) => {
      medPivot.rotation.z = sec.capeRoll * 0.8 + Math.sin(time * 2.3) * 0.05;
      gem.rotation.z = time * 0.9;
    };
  }

  enableShadows(socket);
  return { update };
}

// =========================================================================
// 4. SHOULDER COMPANIONS & ARMOR (Mounted on Upper Torso)
// =========================================================================

export function buildShoulderAccessory(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f8fafc',
): AccessoryAnimHandle {
  disposeAccessoryGroup(socket);
  if (id === 'none') return {};

  const primaryMat = makeUgcMat(color, 0.58, 0.08);
  const accentMat = makeUgcMat(accentColor, 0.45, 0.14);
  const metalPrimary = makeMetalMat(color, 0.22, 0.86);
  const metalAccent = makeMetalMat(accentColor, 0.18, 0.88);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'miniBot') {
    const bot = new THREE.Group();
    bot.position.set(-1.32 * S, 0.58 * S, 0.08 * S);
    const head = new THREE.Mesh(createRoundedBoxGeo(0.46 * S, 0.36 * S, 0.38 * S, 0.08 * S, 0.025 * S), metalPrimary);
    const visor = new THREE.Mesh(
      createRoundedBoxGeo(0.36 * S, 0.16 * S, 0.06 * S, 0.03 * S, 0.01 * S),
      makeUgcMat('#0f172a', 0.1, 0.5),
    );
    visor.position.set(0, 0.02 * S, 0.18 * S);
    const glowMat = makeEmissiveMat(accentColor, 1.1);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.055 * S, 0.03 * S), glowMat);
      eye.position.set(side * 0.09 * S, 0.02 * S, 0.215 * S);
      bot.add(eye);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * S, 0.02 * S, 0.22 * S, 6), metalPrimary);
    antenna.position.y = 0.28 * S;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05 * S, 10, 8), glowMat);
    bulb.position.y = 0.4 * S;
    const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.11 * S, 0.18 * S, 10), glowMat);
    thruster.rotation.x = Math.PI;
    thruster.position.y = -0.26 * S;
    bot.add(head, visor, antenna, bulb, thruster);
    socket.add(bot);
    update = (sec, time) => {
      bot.position.y = (0.58 + Math.sin(time * 3.4) * 0.085) * S;
      bot.rotation.y = Math.sin(time * 1.4) * 0.24;
      bot.rotation.z = sec.capeRoll * 0.4 + Math.cos(time * 2.2) * 0.06;
      thruster.scale.y = 0.8 + Math.sin(time * 12) * 0.25;
    };
  } else if (id === 'shoulderCat') {
    const plushMat = makeUgcMat(color, 0.88, 0.0);
    const bellyMat = makeUgcMat(accentColor, 0.9, 0.0);
    const eyeMat = makeUgcMat('#111827', 0.15, 0.1, { clearcoat: 0.8 });
    const cat = new THREE.Group();
    cat.position.set(1.06 * S, 0.06 * S, 0.06 * S);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28 * S, 16, 12), plushMat);
    body.scale.set(0.95, 1.05, 1.15);
    body.position.y = 0.24 * S;
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.18 * S, 12, 10), bellyMat);
    chest.position.set(0, 0.22 * S, 0.18 * S);

    const head = new THREE.Group();
    head.position.set(0, 0.56 * S, 0.12 * S);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24 * S, 16, 12), plushMat);
    skull.scale.set(1.08, 0.95, 1);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03 * S, 8, 8), makeUgcMat('#f472b6', 0.4, 0));
    nose.position.set(0, -0.02 * S, 0.23 * S);
    head.add(skull, nose);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.085 * S, 0.18 * S, 4), plushMat);
      ear.position.set(side * 0.15 * S, 0.22 * S, 0);
      ear.rotation.z = -side * 0.25;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038 * S, 8, 8), eyeMat);
      eye.position.set(side * 0.095 * S, 0.03 * S, 0.21 * S);
      head.add(ear, eye);
    }

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.14 * S, -0.26 * S);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.06 * S, 0.14 * S, -0.18 * S),
      new THREE.Vector3(0.14 * S, 0.34 * S, -0.14 * S),
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.048 * S, 8, false), plushMat);
    tailPivot.add(tail);

    cat.add(body, chest, head, tailPivot);
    socket.add(cat);
    update = (sec, time) => {
      head.rotation.y = Math.sin(time * 1.6) * 0.16;
      head.rotation.z = Math.cos(time * 2.1) * 0.07;
      tailPivot.rotation.z = Math.sin(time * 4.2) * 0.22 + sec.capeRoll * 0.5;
    };
  } else if (id === 'tinyDragon') {
    const scaleMat = makeUgcMat(color, 0.36, 0.24, { clearcoat: 0.35 });
    const wingMat = makeUgcMat(accentColor, 0.45, 0.15);
    const drag = new THREE.Group();
    drag.position.set(-1.1 * S, 0.12 * S, 0.04 * S);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16 * S, 0.3 * S, 8, 12), scaleMat);
    body.rotation.x = 0.28;
    body.position.y = 0.24 * S;
    const head = new THREE.Mesh(createRoundedBoxGeo(0.24 * S, 0.22 * S, 0.34 * S, 0.06 * S, 0.02 * S), scaleMat);
    head.position.set(0, 0.54 * S, 0.18 * S);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.04 * S, 0.16 * S, 6), wingMat);
    hornL.position.set(-0.08 * S, 0.68 * S, 0.08 * S);
    hornL.rotation.x = -0.35;
    const hornR = hornL.clone();
    hornR.position.x = 0.08 * S;
    const eyeGlow = makeEmissiveMat(accentColor, 0.9);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032 * S, 8, 8), eyeGlow);
      eye.position.set(side * 0.1 * S, 0.57 * S, 0.32 * S);
      drag.add(eye);
    }

    const wings: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const wp = new THREE.Group();
      wp.position.set(side * 0.14 * S, 0.32 * S, -0.06 * S);
      const blade = new THREE.Mesh(createRoundedBoxGeo(0.42 * S, 0.26 * S, 0.03 * S, 0.04 * S, 0.008 * S), wingMat);
      blade.position.set(side * 0.2 * S, 0.08 * S, -0.06 * S);
      blade.rotation.z = side * 0.35;
      wp.add(blade);
      drag.add(wp);
      wings.push(wp);
    }

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07 * S, 0.5 * S, 8), scaleMat);
    tail.rotation.x = -Math.PI / 2 - 0.35;
    tail.position.set(0, 0.14 * S, -0.32 * S);

    drag.add(body, head, hornL, hornR, tail);
    socket.add(drag);
    update = (_sec, time) => {
      wings[0].rotation.y = 0.35 + Math.sin(time * 7.5) * 0.35;
      wings[1].rotation.y = -0.35 - Math.sin(time * 7.5) * 0.35;
      drag.position.y = (0.12 + Math.sin(time * 3.8) * 0.03) * S;
    };
  } else if (id === 'parrotBuddy') {
    const featherMat = makeUgcMat(color, 0.72, 0.04);
    const wingMat = makeUgcMat(accentColor, 0.68, 0.05);
    const beakMat = makeUgcMat('#f59e0b', 0.35, 0.1);
    const bird = new THREE.Group();
    bird.position.set(1.04 * S, 0.04 * S, 0.06 * S);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16 * S, 0.28 * S, 8, 12), featherMat);
    torso.position.y = 0.26 * S;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17 * S, 14, 12), featherMat);
    head.position.set(0, 0.52 * S, 0.04 * S);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.065 * S, 0.18 * S, 6), beakMat);
    beak.rotation.x = Math.PI / 2 + 0.25;
    beak.position.set(0, 0.5 * S, 0.22 * S);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.05 * S, 0.16 * S, 5), wingMat);
    crest.position.set(0, 0.7 * S, 0.02 * S);
    crest.rotation.x = -0.3;
    const tail = new THREE.Mesh(createRoundedBoxGeo(0.14 * S, 0.44 * S, 0.05 * S), wingMat);
    tail.position.set(0, 0.06 * S, -0.22 * S);
    tail.rotation.x = 0.38;
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(createRoundedBoxGeo(0.06 * S, 0.28 * S, 0.2 * S), wingMat);
      w.position.set(side * 0.17 * S, 0.24 * S, -0.02 * S);
      bird.add(w);
    }
    bird.add(torso, head, beak, crest, tail);
    socket.add(bird);
    update = (_sec, time) => {
      bird.rotation.y = Math.sin(time * 2.0) * 0.22;
      bird.rotation.z = Math.sin(time * 4.0) * 0.06;
    };
  } else if (id === 'floatingCrystal') {
    const orbitGroup = new THREE.Group();
    orbitGroup.position.set(-1.35 * S, 0.62 * S, 0);
    const shardMat = new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.08,
      metalness: 0.2,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.88,
    });
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.24 * S, 0), shardMat);
    shard.scale.set(0.68, 1.5, 0.68);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32 * S, 0.022 * S, 8, 24),
      makeEmissiveMat(accentColor, 0.9),
    );
    ring.rotation.x = Math.PI / 2 - 0.35;
    orbitGroup.add(shard, ring);
    socket.add(orbitGroup);
    update = (_sec, time) => {
      orbitGroup.position.y = (0.62 + Math.sin(time * 2.8) * 0.12) * S;
      shard.rotation.y = time * 1.4;
      ring.rotation.z = -time * 1.8;
    };
  } else if (id === 'spikedPauldrons') {
    for (const side of [-1, 1]) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.46 * S, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        metalPrimary,
      );
      dome.position.set(side * 1.24 * S, -0.06 * S, 0);
      dome.rotation.z = -side * 0.28;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46 * S, 0.045 * S, 8, 18), metalAccent);
      rim.rotation.x = Math.PI / 2;
      rim.rotation.y = side * 0.28;
      rim.position.set(side * 1.24 * S, -0.06 * S, 0);
      for (let i = -1; i <= 1; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.065 * S, 0.28 * S, 6), metalAccent);
        spike.position.set(side * (1.36 + (i === 0 ? 0.08 : 0)) * S, 0.34 * S, i * 0.24 * S);
        spike.rotation.z = -side * 0.35;
        spike.rotation.x = i * 0.24;
        socket.add(spike);
      }
      socket.add(dome, rim);
    }
  } else if (id === 'furMantle') {
    const furMat = makeUgcMat(color, 0.95, 0.0);
    const claspMat = makeMetalMat(accentColor, 0.2, 0.88);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 * S, 1), furMat);
      puff.scale.set(1.2, 0.85, 1.0);
      puff.position.set(Math.sin(a) * 1.02 * S, 0.04 * S, Math.cos(a) * 0.58 * S);
      socket.add(puff);
    }
    const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 0.06 * S, 14), claspMat);
    clasp.rotation.x = Math.PI / 2;
    clasp.position.set(0, -0.08 * S, 0.64 * S);
    socket.add(clasp);
  }

  enableShadows(socket);
  return { update };
}

// =========================================================================
// 5. BACK GEAR ACCESSORIES (Capes, Packs, Wings, Weapons, Guitar, Deck)
// =========================================================================

export function buildBackAccessory(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f5cd30',
): AccessoryAnimHandle {
  disposeAccessoryGroup(socket);
  if (id === 'none') return {};

  const primaryMat = makeUgcMat(color, 0.66, 0.06);
  const accentMat = makeUgcMat(accentColor, 0.36, 0.35);
  const metalPrimary = makeMetalMat(color, 0.22, 0.82);
  const metalAccent = makeMetalMat(accentColor, 0.2, 0.85);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'cape') {
    const collar = new THREE.Mesh(
      createRoundedBoxGeo(1.74 * S, 0.22 * S, 0.2 * S, 0.05 * S, 0.02 * S),
      accentMat,
    );
    collar.position.set(0, 0.78 * S, -0.02 * S);
    socket.add(collar);

    const capePivot = new THREE.Group();
    capePivot.position.set(0, 0.76 * S, -0.1 * S);
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.76 * S, 0);
    capeShape.lineTo(0.76 * S, 0);
    capeShape.lineTo(1.06 * S, -2.55 * S);
    capeShape.quadraticCurveTo(0, -2.72 * S, -1.06 * S, -2.55 * S);
    capeShape.closePath();
    const capeGeo = new THREE.ExtrudeGeometry(capeShape, {
      depth: 0.065 * S,
      bevelEnabled: true,
      bevelThickness: 0.015 * S,
      bevelSize: 0.015 * S,
      bevelSegments: 2,
    });
    const body = new THREE.Mesh(capeGeo, primaryMat);
    body.position.z = -0.05 * S;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.02 * S, 0.14 * S, 0.09 * S), metalAccent);
    trim.position.set(0, -2.5 * S, -0.02 * S);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.24 * S, 0), metalAccent);
    emblem.scale.set(1, 1.3, 0.32);
    emblem.position.set(0, -1.12 * S, -0.06 * S);
    capePivot.add(body, trim, emblem);
    socket.add(capePivot);
    update = (sec, time) => {
      capePivot.rotation.set(0.14 + sec.capePitch + Math.sin(time * 2.0) * 0.02, 0, sec.capeRoll);
    };
  } else if (id === 'streetBackpack') {
    const pack = new THREE.Mesh(
      createRoundedBoxGeo(1.42 * S, 1.56 * S, 0.66 * S, 0.22 * S, 0.06 * S),
      primaryMat,
    );
    pack.position.set(0, 0.02 * S, -0.4 * S);
    const frontPocket = new THREE.Mesh(
      createRoundedBoxGeo(1.12 * S, 0.68 * S, 0.24 * S, 0.12 * S, 0.03 * S),
      makeUgcMat(shadeHex(color, 0.1), 0.68, 0.04),
    );
    frontPocket.position.set(0, -0.34 * S, -0.76 * S);
    const zipLine = new THREE.Mesh(new THREE.BoxGeometry(1.0 * S, 0.05 * S, 0.05 * S), metalAccent);
    zipLine.position.set(0, -0.08 * S, -0.88 * S);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18 * S, 0.04 * S, 8, 16, Math.PI), accentMat);
    handle.position.set(0, 0.8 * S, -0.34 * S);

    // Swaying keychain charm clipped to zipper
    const charmPivot = new THREE.Group();
    charmPivot.position.set(0.46 * S, -0.1 * S, -0.9 * S);
    const charm = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 * S, 0), makeEmissiveMat(accentColor, 0.5));
    charm.position.y = -0.16 * S;
    charmPivot.add(charm);
    socket.add(pack, frontPocket, zipLine, handle, charmPivot);
    update = (sec, time) => {
      charmPivot.rotation.z = sec.capeRoll * 1.4 + Math.sin(time * 3.1) * 0.09;
      charmPivot.rotation.x = sec.capePitch * 0.8;
    };
  } else if (id === 'backpack') {
    const main = new THREE.Mesh(
      createRoundedBoxGeo(1.38 * S, 1.48 * S, 0.68 * S, 0.14 * S, 0.05 * S),
      primaryMat,
    );
    main.position.set(0, 0.02 * S, -0.4 * S);
    const lid = new THREE.Mesh(
      createRoundedBoxGeo(1.44 * S, 0.34 * S, 0.72 * S, 0.1 * S, 0.035 * S),
      accentMat,
    );
    lid.position.set(0, 0.64 * S, -0.4 * S);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 1.46 * S, 16), accentMat);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.9 * S, -0.4 * S);
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.14 * S, 0.82 * S, 0.07 * S), metalAccent);
      strap.position.set(side * 0.38 * S, 0.18 * S, -0.75 * S);
      socket.add(strap);
    }
    socket.add(main, lid, roll);
  } else if (id === 'jetpack' || id === 'hoverPack') {
    const isCyber = id === 'hoverPack';
    const flameMat = makeEmissiveMat(accentColor, 1.25);
    const plate = new THREE.Mesh(
      createRoundedBoxGeo(1.16 * S, 1.18 * S, 0.24 * S, 0.1 * S, 0.03 * S),
      metalPrimary,
    );
    plate.position.set(0, 0.05 * S, -0.2 * S);
    socket.add(plate);

    const flames: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(
        isCyber
          ? createRoundedBoxGeo(0.42 * S, 1.28 * S, 0.42 * S, 0.1 * S, 0.03 * S)
          : new THREE.CylinderGeometry(0.28 * S, 0.28 * S, 1.38 * S, 18),
        metalPrimary,
      );
      tank.position.set(side * 0.48 * S, 0.06 * S, -0.44 * S);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26 * S, 14, 10), metalAccent);
      cap.position.set(side * 0.48 * S, 0.72 * S, -0.44 * S);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * S, 0.24 * S, 0.24 * S, 14), makeMetalMat('#1f2937', 0.35, 0.75));
      nozzle.position.set(side * 0.48 * S, -0.72 * S, -0.44 * S);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16 * S, 0.44 * S, 10), flameMat);
      flame.rotation.x = Math.PI;
      flame.position.set(side * 0.48 * S, -1.0 * S, -0.44 * S);
      flames.push(flame);
      socket.add(tank, cap, nozzle, flame);
    }
    update = (sec, time) => {
      const boost = 0.75 + Math.min(1.2, Math.abs(sec.capePitch) * 2.2);
      flames.forEach((f, idx) => {
        f.scale.y = boost * (0.85 + Math.sin(time * 16 + idx * 1.4) * 0.22);
      });
      flameMat.emissiveIntensity = 0.9 + Math.sin(time * 14) * 0.3;
    };
  } else if (id === 'wings' || id === 'angelWings') {
    const isSeraph = id === 'angelWings';
    const featherMat = isSeraph ? makeUgcMat(color, 0.55, 0.04, { sheen: 0.65 }) : primaryMat;
    const spine = new THREE.Mesh(createRoundedBoxGeo(0.32 * S, 0.72 * S, 0.16 * S), metalAccent);
    spine.position.set(0, 0.26 * S, -0.14 * S);
    socket.add(spine);

    const wingPivots: THREE.Group[] = [];
    const tiers = isSeraph ? 5 : 4;
    for (const side of [-1, 1]) {
      const wp = new THREE.Group();
      wp.position.set(side * 0.18 * S, 0.36 * S, -0.16 * S);
      for (let i = 0; i < tiers; i++) {
        const len = (2.15 - i * 0.28) * S;
        const feather = new THREE.Mesh(
          createRoundedBoxGeo(len, 0.24 * S, 0.065 * S, 0.08 * S, 0.015 * S),
          i === 0 ? metalAccent : featherMat,
        );
        feather.position.set(side * (len * 0.5), (0.34 - i * 0.28) * S, -i * 0.04 * S);
        feather.rotation.z = side * (0.34 - i * 0.15);
        wp.add(feather);
      }
      socket.add(wp);
      wingPivots.push(wp);
    }
    update = (sec, time) => {
      const flutter = Math.sin(time * 3.2) * 0.08;
      wingPivots[0].rotation.y = -0.45 - sec.wingSpread - flutter;
      wingPivots[1].rotation.y = 0.45 + sec.wingSpread + flutter;
    };
  } else if (id === 'katana') {
    const sheathMat = makeUgcMat(color, 0.26, 0.2, { clearcoat: 0.65 });
    for (const side of [-1, 1]) {
      const grp = new THREE.Group();
      grp.position.set(0, 0.1 * S, -0.22 * S);
      grp.rotation.z = side * 0.66;
      const scabbard = new THREE.Mesh(new THREE.CylinderGeometry(0.085 * S, 0.075 * S, 2.55 * S, 10), sheathMat);
      const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 0.05 * S, 14), metalAccent);
      tsuba.position.y = 1.3 * S;
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * S, 0.08 * S, 0.62 * S, 10), accentMat);
      hilt.position.y = 1.62 * S;
      grp.add(scabbard, tsuba, hilt);
      socket.add(grp);
    }
  } else if (id === 'quiver') {
    const grp = new THREE.Group();
    grp.position.set(0.1 * S, 0.08 * S, -0.32 * S);
    grp.rotation.z = -0.42;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.27 * S, 0.21 * S, 1.52 * S, 16), primaryMat);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * S, 0.27 * S, 0.16 * S, 16), metalAccent);
    band.position.y = 0.56 * S;
    grp.add(tube, band);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * S, 0.025 * S, 0.64 * S, 6), makeUgcMat('#a67c52', 0.7, 0));
      shaft.position.set(Math.cos(a) * 0.1 * S, 0.94 * S, Math.sin(a) * 0.1 * S);
      const fletch = new THREE.Mesh(new THREE.ConeGeometry(0.075 * S, 0.18 * S, 4), accentMat);
      fletch.position.set(Math.cos(a) * 0.1 * S, 1.24 * S, Math.sin(a) * 0.1 * S);
      grp.add(shaft, fletch);
    }
    socket.add(grp);
  } else if (id === 'scarf') {
    const neckWrap = new THREE.Mesh(new THREE.TorusGeometry(0.64 * S, 0.15 * S, 10, 22), primaryMat);
    neckWrap.rotation.x = Math.PI / 2;
    neckWrap.position.set(0, 0.86 * S, 0.5 * S);
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0.18 * S, 0.8 * S, -0.06 * S);
    const tail = new THREE.Mesh(createRoundedBoxGeo(0.46 * S, 1.65 * S, 0.1 * S, 0.04 * S, 0.02 * S), primaryMat);
    tail.position.set(0, -0.82 * S, -0.04 * S);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.47 * S, 0.14 * S, 0.11 * S), accentMat);
    stripe.position.set(0, -1.44 * S, -0.04 * S);
    tailPivot.add(tail, stripe);
    socket.add(neckWrap, tailPivot);
    update = (sec, time) => {
      tailPivot.rotation.set(0.14 + sec.capePitch * 1.1 + Math.sin(time * 2.5) * 0.04, 0, sec.capeRoll * 1.1);
    };
  } else if (id === 'backGuitar') {
    const grp = new THREE.Group();
    grp.position.set(0, 0.18 * S, -0.26 * S);
    grp.rotation.z = -0.58;
    const woodMat = makeUgcMat(color, 0.34, 0.08, { clearcoat: 0.55 });
    const darkMat = makeUgcMat(accentColor, 0.45, 0.12);
    const lowerBout = new THREE.Mesh(new THREE.CylinderGeometry(0.56 * S, 0.56 * S, 0.22 * S, 20), woodMat);
    lowerBout.rotation.x = Math.PI / 2;
    lowerBout.position.y = -0.58 * S;
    const upperBout = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * S, 0.42 * S, 0.22 * S, 18), woodMat);
    upperBout.rotation.x = Math.PI / 2;
    upperBout.position.y = -0.06 * S;
    const soundHole = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * S, 0.16 * S, 0.24 * S, 16), darkMat);
    soundHole.rotation.x = Math.PI / 2;
    soundHole.position.y = -0.28 * S;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.16 * S, 1.38 * S, 0.09 * S), darkMat);
    neck.position.set(0, 0.96 * S, 0);
    const headstock = new THREE.Mesh(createRoundedBoxGeo(0.24 * S, 0.32 * S, 0.09 * S), woodMat);
    headstock.position.set(0, 1.72 * S, 0);
    grp.add(lowerBout, upperBout, soundHole, neck, headstock);
    socket.add(grp);
  } else if (id === 'backSkateboard') {
    const grp = new THREE.Group();
    grp.position.set(0, 0.06 * S, -0.26 * S);
    grp.rotation.z = 0.26;
    const deck = new THREE.Mesh(createRoundedBoxGeo(0.68 * S, 2.15 * S, 0.08 * S, 0.28 * S, 0.02 * S), primaryMat);
    const grip = new THREE.Mesh(createRoundedBoxGeo(0.64 * S, 2.08 * S, 0.02 * S, 0.26 * S, 0.005 * S), makeUgcMat('#181c24', 0.92, 0));
    grip.position.z = 0.045 * S;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24 * S, 1.8 * S, 0.085 * S), accentMat);
    grp.add(deck, grip, stripe);
    for (const wy of [-0.66, 0.66]) {
      const truck = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * S, 0.045 * S, 0.56 * S, 8), makeMetalMat('#cbd5e1', 0.22, 0.85));
      truck.rotation.z = Math.PI / 2;
      truck.position.set(0, wy * S, -0.14 * S);
      grp.add(truck);
      for (const wx of [-0.28, 0.28]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * S, 0.1 * S, 0.09 * S, 14), accentMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx * S, wy * S, -0.14 * S);
        grp.add(wheel);
      }
    }
    socket.add(grp);
  }

  enableShadows(socket);
  return { update };
}

// =========================================================================
// 6. WAIST & BAG ACCESSORIES (Mounted on Hip Pivot)
// =========================================================================

export function buildWaistAccessory(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#eab308',
): AccessoryAnimHandle {
  disposeAccessoryGroup(socket);
  if (id === 'none') return {};

  const primaryMat = makeUgcMat(color, 0.6, 0.08);
  const accentMat = makeUgcMat(accentColor, 0.42, 0.16);
  const metalAccent = makeMetalMat(accentColor, 0.2, 0.86);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'crossbodySling') {
    // Diagonal strap across torso + beveled chest/waist sling pack
    const strapPoints = [
      new THREE.Vector3(-0.78 * S, 1.78 * S, 0.58 * S),
      new THREE.Vector3(-0.18 * S, 1.0 * S, 0.6 * S),
      new THREE.Vector3(0.56 * S, 0.22 * S, 0.6 * S),
      new THREE.Vector3(1.08 * S, 0.08 * S, 0.0 * S),
      new THREE.Vector3(0.56 * S, 0.62 * S, -0.6 * S),
      new THREE.Vector3(-0.78 * S, 1.78 * S, -0.58 * S),
    ];
    const strapCurve = new THREE.CatmullRomCurve3(strapPoints, true);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 32, 0.055 * S, 8, true), primaryMat);
    const pack = new THREE.Mesh(
      createRoundedBoxGeo(0.76 * S, 0.48 * S, 0.24 * S, 0.1 * S, 0.03 * S),
      primaryMat,
    );
    pack.position.set(0.28 * S, 0.52 * S, 0.66 * S);
    pack.rotation.z = 0.52;
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.62 * S, 0.045 * S, 0.04 * S), metalAccent);
    zip.position.set(0.28 * S, 0.58 * S, 0.78 * S);
    zip.rotation.z = 0.52;
    const buckle = new THREE.Mesh(createRoundedBoxGeo(0.14 * S, 0.14 * S, 0.07 * S), metalAccent);
    buckle.position.set(-0.36 * S, 1.24 * S, 0.61 * S);
    buckle.rotation.z = 0.52;
    socket.add(strap, pack, zip, buckle);
  } else if (id === 'messengerBag') {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72 * S, 1.8 * S, 0.56 * S),
      new THREE.Vector3(0.15 * S, 0.9 * S, 0.58 * S),
      new THREE.Vector3(1.08 * S, 0.0 * S, 0.12 * S),
      new THREE.Vector3(1.08 * S, 0.0 * S, -0.14 * S),
      new THREE.Vector3(0.15 * S, 0.9 * S, -0.58 * S),
      new THREE.Vector3(-0.72 * S, 1.8 * S, -0.56 * S),
    ], true);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 28, 0.045 * S, 7, true), primaryMat);

    const bagPivot = new THREE.Group();
    bagPivot.position.set(1.16 * S, -0.02 * S, 0);
    const body = new THREE.Mesh(
      createRoundedBoxGeo(0.32 * S, 0.78 * S, 0.92 * S, 0.07 * S, 0.025 * S),
      primaryMat,
    );
    body.position.y = -0.38 * S;
    const flap = new THREE.Mesh(
      createRoundedBoxGeo(0.35 * S, 0.44 * S, 0.94 * S, 0.06 * S, 0.02 * S),
      makeUgcMat(shadeHex(color, 0.12), 0.62, 0.06),
    );
    flap.position.set(0.02 * S, -0.18 * S, 0);
    for (const bz of [-0.24, 0.24]) {
      const clasp = new THREE.Mesh(createRoundedBoxGeo(0.06 * S, 0.12 * S, 0.09 * S), metalAccent);
      clasp.position.set(0.2 * S, -0.36 * S, bz * S);
      bagPivot.add(clasp);
    }
    bagPivot.add(body, flap);
    socket.add(strap, bagPivot);
    update = (sec, time) => {
      bagPivot.rotation.z = -0.06 + sec.capeRoll * 0.7 + Math.sin(time * 2.2) * 0.03;
      bagPivot.rotation.x = sec.capePitch * 0.85;
    };
  } else if (id === 'fannyPack') {
    const belt = new THREE.Mesh(
      createRoundedBoxGeo(2.14 * S, 0.18 * S, 1.14 * S, 0.06 * S, 0.02 * S),
      makeUgcMat('#181c24', 0.65, 0.04),
    );
    const pouch = new THREE.Mesh(
      createRoundedBoxGeo(0.92 * S, 0.36 * S, 0.34 * S, 0.1 * S, 0.03 * S),
      primaryMat,
    );
    pouch.position.set(0.18 * S, -0.02 * S, 0.66 * S);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.76 * S, 0.045 * S, 0.04 * S), metalAccent);
    zip.position.set(0.18 * S, 0.06 * S, 0.83 * S);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.12 * S, 0.04 * S), accentMat);
    patch.position.set(0.42 * S, -0.06 * S, 0.83 * S);
    socket.add(belt, pouch, zip, patch);
  } else if (id === 'hipKatana') {
    const belt = new THREE.Mesh(
      createRoundedBoxGeo(2.14 * S, 0.16 * S, 1.14 * S, 0.05 * S, 0.02 * S),
      primaryMat,
    );
    const sheathPivot = new THREE.Group();
    sheathPivot.position.set(1.14 * S, -0.06 * S, 0.08 * S);
    sheathPivot.rotation.set(0.42, 0.12, -0.1);
    const scabbard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085 * S, 0.072 * S, 2.4 * S, 10),
      makeUgcMat(color, 0.22, 0.22, { clearcoat: 0.7 }),
    );
    scabbard.rotation.x = Math.PI / 2;
    scabbard.position.z = -0.65 * S;
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 0.05 * S, 14), metalAccent);
    tsuba.rotation.x = Math.PI / 2;
    tsuba.position.z = 0.56 * S;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * S, 0.075 * S, 0.62 * S, 10), accentMat);
    hilt.rotation.x = Math.PI / 2;
    hilt.position.z = 0.9 * S;
    sheathPivot.add(scabbard, tsuba, hilt);
    socket.add(belt, sheathPivot);
    update = (sec) => {
      sheathPivot.rotation.x = 0.42 + sec.capePitch * 0.55;
      sheathPivot.rotation.z = -0.1 + sec.capeRoll * 0.4;
    };
  } else if (id === 'potionBelt') {
    const belt = new THREE.Mesh(
      createRoundedBoxGeo(2.16 * S, 0.22 * S, 1.16 * S, 0.06 * S, 0.02 * S),
      primaryMat,
    );
    const buckle = new THREE.Mesh(createRoundedBoxGeo(0.28 * S, 0.24 * S, 0.09 * S), metalAccent);
    buckle.position.set(0, 0, 0.59 * S);
    const glassMat = makeOpticalGlassMat('#e0f2fe', 0.34, 0.3);
    const liquidMat = makeEmissiveMat(accentColor, 0.85);
    const liquidMeshes: THREE.Mesh[] = [];
    for (const px of [-0.72, -0.44, 0.44, 0.72]) {
      const bottle = new THREE.Mesh(new THREE.SphereGeometry(0.13 * S, 12, 10), glassMat);
      bottle.position.set(px * S, -0.18 * S, 0.62 * S);
      bottle.renderOrder = 4;
      const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.095 * S, 10, 8), liquidMat);
      liquid.position.set(px * S, -0.2 * S, 0.62 * S);
      liquidMeshes.push(liquid);
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * S, 0.04 * S, 0.1 * S, 8), makeUgcMat('#a16207', 0.8, 0));
      cork.position.set(px * S, -0.02 * S, 0.62 * S);
      socket.add(bottle, liquid, cork);
    }
    socket.add(belt, buckle);
    update = (_sec, time) => {
      liquidMat.emissiveIntensity = 0.65 + 0.3 * Math.sin(time * 3.2);
    };
  } else if (id === 'walletChain') {
    const chainMat = makeMetalMat(color, 0.16, 0.92);
    const chainPivot = new THREE.Group();
    chainPivot.position.set(0.95 * S, 0.0 * S, 0.52 * S);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35 * S, 0.05 * S, 0.06 * S),
      new THREE.Vector3(-0.08 * S, -0.42 * S, 0.14 * S),
      new THREE.Vector3(0.16 * S, -0.48 * S, -0.12 * S),
      new THREE.Vector3(0.12 * S, 0.02 * S, -0.52 * S),
    ]);
    const chain = new THREE.Mesh(new THREE.TubeGeometry(curve, 22, 0.028 * S, 8, false), chainMat);
    chainPivot.add(chain);
    socket.add(chainPivot);
    update = (sec, time) => {
      chainPivot.rotation.z = sec.capeRoll * 0.9 + Math.sin(time * 2.8) * 0.05;
      chainPivot.rotation.x = sec.capePitch * 0.65;
    };
  } else if (id === 'hipCamera') {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.46 * S, 1.8 * S, 0.2 * S),
      new THREE.Vector3(-0.36 * S, 0.95 * S, 0.6 * S),
      new THREE.Vector3(0, 0.42 * S, 0.64 * S),
      new THREE.Vector3(0.36 * S, 0.95 * S, 0.6 * S),
      new THREE.Vector3(0.46 * S, 1.8 * S, 0.2 * S),
    ]);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 22, 0.03 * S, 6, false), primaryMat);
    const camPivot = new THREE.Group();
    camPivot.position.set(0, 0.42 * S, 0.66 * S);
    const body = new THREE.Mesh(createRoundedBoxGeo(0.56 * S, 0.36 * S, 0.24 * S, 0.05 * S, 0.018 * S), primaryMat);
    const topBar = new THREE.Mesh(createRoundedBoxGeo(0.56 * S, 0.09 * S, 0.25 * S), metalAccent);
    topBar.position.y = 0.14 * S;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * S, 0.14 * S, 0.22 * S, 16), makeMetalMat('#111827', 0.25, 0.7));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.03 * S, -0.02 * S, 0.18 * S);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.1 * S, 16), makeOpticalGlassMat('#38bdf8', 0.55, 0.6));
    glass.position.set(0.03 * S, -0.02 * S, 0.295 * S);
    glass.renderOrder = 4;
    camPivot.add(body, topBar, barrel, glass);
    socket.add(strap, camPivot);
    update = (sec, time) => {
      camPivot.rotation.z = sec.capeRoll * 0.7 + Math.sin(time * 2.2) * 0.03;
      camPivot.rotation.x = Math.max(-0.08, -sec.capePitch * 0.6);
    };
  }

  enableShadows(socket);
  return { update };
}

// =========================================================================
// 7. ARM & WRIST ACCESSORIES
// =========================================================================

export function buildArmAccessory(
  socket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f5cd30',
): AccessoryAnimHandle {
  disposeAccessoryGroup(socket);
  if (id === 'none') return {};

  const primaryMat = makeMetalMat(color, 0.22, 0.8);
  const accentMat = makeMetalMat(accentColor, 0.2, 0.85);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'gauntlet') {
    const cuff = new THREE.Mesh(createRoundedBoxGeo(1.16 * S, 0.76 * S, 1.16 * S, 0.08 * S, 0.03 * S), primaryMat);
    cuff.position.set(0, 0.24 * S, -0.35 * S);
    const knuckle = new THREE.Mesh(createRoundedBoxGeo(1.22 * S, 0.18 * S, 1.22 * S, 0.05 * S, 0.02 * S), accentMat);
    knuckle.position.set(0, -0.06 * S, -0.35 * S);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 * S, 0), makeEmissiveMat(accentColor, 0.8));
    gem.position.set(0, 0.26 * S, 0.26 * S);
    socket.add(cuff, knuckle, gem);
  } else if (id === 'pauldron') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.68 * S, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      primaryMat,
    );
    dome.position.set(-0.08 * S, 1.66 * S, -0.35 * S);
    dome.rotation.z = 0.26;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66 * S, 0.055 * S, 8, 18), accentMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(-0.08 * S, 1.66 * S, -0.35 * S);
    socket.add(dome, rim);
  } else if (id === 'wristWatch' || id === 'smartwatch') {
    const isSmart = id === 'smartwatch';
    const strap = new THREE.Mesh(
      createRoundedBoxGeo(1.09 * S, 0.22 * S, 1.09 * S, 0.06 * S, 0.02 * S),
      makeUgcMat(color, 0.45, 0.18),
    );
    strap.position.set(0, 0.24 * S, -0.35 * S);
    const bezel = new THREE.Mesh(
      createRoundedBoxGeo(0.42 * S, 0.34 * S, 0.12 * S, 0.06 * S, 0.015 * S),
      makeMetalMat('#334155', 0.22, 0.85),
    );
    bezel.position.set(0, 0.24 * S, 0.22 * S);
    const screenMat = makeEmissiveMat(accentColor, isSmart ? 0.95 : 0.8);
    const dial = new THREE.Mesh(new THREE.BoxGeometry(0.32 * S, 0.24 * S, 0.03 * S), screenMat);
    dial.position.set(0, 0.24 * S, 0.285 * S);
    socket.add(strap, bezel, dial);
    update = (_sec, time) => {
      screenMat.emissiveIntensity = 0.75 + 0.3 * Math.sin(time * 3.0);
    };
  } else if (id === 'casterBrace') {
    const band = new THREE.Mesh(createRoundedBoxGeo(1.12 * S, 0.46 * S, 1.12 * S, 0.06 * S, 0.02 * S), primaryMat);
    band.position.set(0, 0.32 * S, -0.35 * S);
    const runeMat = makeEmissiveMat(accentColor, 0.95);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64 * S, 0.035 * S, 8, 24), runeMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.32 * S, -0.35 * S);
    socket.add(band, ring);
    update = (_sec, time) => {
      ring.rotation.z = time * 1.4;
      runeMat.emissiveIntensity = 0.75 + 0.35 * Math.sin(time * 4.0);
    };
  } else if (id === 'spikedCuff') {
    const leather = makeUgcMat(color, 0.42, 0.12);
    const band = new THREE.Mesh(createRoundedBoxGeo(1.12 * S, 0.34 * S, 1.12 * S, 0.06 * S, 0.02 * S), leather);
    band.position.set(0, 0.26 * S, -0.35 * S);
    socket.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06 * S, 0.18 * S, 6), accentMat);
      spike.position.set(Math.sin(a) * 0.62 * S, 0.26 * S, -0.35 * S + Math.cos(a) * 0.62 * S);
      spike.rotation.z = -Math.sin(a) * (Math.PI / 2);
      spike.rotation.x = Math.cos(a) * (Math.PI / 2);
      socket.add(spike);
    }
  } else if (id === 'forearmPad') {
    const plate = new THREE.Mesh(
      createRoundedBoxGeo(1.15 * S, 0.88 * S, 1.15 * S, 0.08 * S, 0.025 * S),
      makeUgcMat(color, 0.55, 0.15),
    );
    plate.position.set(0, 0.46 * S, -0.35 * S);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 0.72 * S, 0.08 * S), accentMat);
    stripe.position.set(-0.56 * S, 0.46 * S, -0.35 * S);
    socket.add(plate, stripe);
  }

  enableShadows(socket);
  return { update };
}

// =========================================================================
// 8. LEG GEAR ACCESSORIES (Belts, Greaves, Kneepads, Thrusters, Thigh Bag)
// =========================================================================

export function buildLegsAccessories(
  waistSocket: THREE.Group,
  leftLegSocket: THREE.Group,
  rightLegSocket: THREE.Group,
  id: string,
  color: string,
  accentColor = '#f5cd30',
): AccessoryAnimHandle {
  disposeAccessoryGroup(waistSocket);
  disposeAccessoryGroup(leftLegSocket);
  disposeAccessoryGroup(rightLegSocket);
  if (id === 'none') return {};

  const primaryMat = makeUgcMat(color, 0.56, 0.12);
  const metalPrimary = makeMetalMat(color, 0.22, 0.82);
  const accentMat = makeMetalMat(accentColor, 0.2, 0.85);
  let update: ((sec: SecondaryMotionState, time: number) => void) | undefined;

  if (id === 'belt') {
    const band = new THREE.Mesh(createRoundedBoxGeo(2.14 * S, 0.26 * S, 1.14 * S, 0.05 * S, 0.02 * S), primaryMat);
    band.position.set(0, -0.96 * S, 0);
    const buckle = new THREE.Mesh(createRoundedBoxGeo(0.42 * S, 0.3 * S, 0.12 * S, 0.04 * S, 0.015 * S), accentMat);
    buckle.position.set(0, -0.96 * S, 0.58 * S);
    for (const side of [-1, 1]) {
      const pouch = new THREE.Mesh(createRoundedBoxGeo(0.28 * S, 0.34 * S, 0.44 * S, 0.05 * S, 0.015 * S), primaryMat);
      pouch.position.set(side * 1.14 * S, -0.98 * S, 0.1 * S);
      waistSocket.add(pouch);
    }
    waistSocket.add(band, buckle);
  } else if (id === 'kneepads') {
    [leftLegSocket, rightLegSocket].forEach((leg, idx) => {
      const side = idx === 0 ? 1 : -1;
      const strap = new THREE.Mesh(createRoundedBoxGeo(1.03 * S, 0.22 * S, 1.08 * S, 0.04 * S, 0.012 * S), primaryMat);
      strap.position.set(side * 0.025 * S, -0.02 * S, 0);
      const pad = new THREE.Mesh(createRoundedBoxGeo(0.76 * S, 0.44 * S, 0.18 * S, 0.08 * S, 0.025 * S), accentMat);
      pad.position.set(side * 0.025 * S, -0.02 * S, 0.55 * S);
      leg.add(strap, pad);
    });
  } else if (id === 'greaves') {
    [leftLegSocket, rightLegSocket].forEach((leg, idx) => {
      const side = idx === 0 ? 1 : -1;
      const shin = new THREE.Mesh(createRoundedBoxGeo(1.04 * S, 1.12 * S, 1.09 * S, 0.06 * S, 0.02 * S), metalPrimary);
      shin.position.set(side * 0.03 * S, -0.34 * S, 0);
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.14 * S, 0.96 * S, 0.12 * S), accentMat);
      ridge.position.set(side * 0.03 * S, -0.34 * S, 0.54 * S);
      leg.add(shin, ridge);
    });
  } else if (id === 'thrusters') {
    const glowMat = makeEmissiveMat(accentColor, 1.1);
    const glows: THREE.Mesh[] = [];
    [leftLegSocket, rightLegSocket].forEach((leg, idx) => {
      const side = idx === 0 ? 1 : -1;
      const cuff = new THREE.Mesh(createRoundedBoxGeo(1.04 * S, 0.58 * S, 1.1 * S, 0.06 * S, 0.02 * S), metalPrimary);
      cuff.position.set(side * 0.03 * S, -0.66 * S, 0);
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * S, 0.18 * S, 0.36 * S, 12), makeMetalMat('#1f2937', 0.3, 0.8));
      jet.position.set(side * 0.03 * S, -0.7 * S, -0.62 * S);
      const glow = new THREE.Mesh(new THREE.ConeGeometry(0.13 * S, 0.28 * S, 10), glowMat);
      glow.rotation.x = Math.PI;
      glow.position.set(side * 0.03 * S, -0.96 * S, -0.62 * S);
      glows.push(glow);
      leg.add(cuff, jet, glow);
    });
    update = (_sec, time) => {
      glows.forEach((g, idx) => {
        g.scale.y = 0.8 + Math.sin(time * 14 + idx * 1.5) * 0.25;
      });
    };
  } else if (id === 'pouches') {
    [leftLegSocket, rightLegSocket].forEach((leg, idx) => {
      const side = idx === 0 ? 1 : -1;
      const band = new THREE.Mesh(createRoundedBoxGeo(1.03 * S, 0.16 * S, 1.06 * S, 0.04 * S, 0.012 * S), accentMat);
      band.position.set(side * 0.025 * S, 0.34 * S, 0);
      const holster = new THREE.Mesh(createRoundedBoxGeo(0.26 * S, 0.64 * S, 0.44 * S, 0.06 * S, 0.02 * S), primaryMat);
      holster.position.set(side * 0.58 * S, 0.3 * S, 0.06 * S);
      leg.add(band, holster);
    });
  } else if (id === 'thighPouch') {
    const band = new THREE.Mesh(createRoundedBoxGeo(1.04 * S, 0.16 * S, 1.08 * S, 0.04 * S, 0.012 * S), makeUgcMat('#181c24', 0.65, 0.04));
    band.position.set(-0.025 * S, 0.4 * S, 0);
    const bag = new THREE.Mesh(createRoundedBoxGeo(0.28 * S, 0.58 * S, 0.56 * S, 0.07 * S, 0.02 * S), primaryMat);
    bag.position.set(-0.58 * S, 0.36 * S, 0.04 * S);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.04 * S, 0.05 * S, 0.44 * S), accentMat);
    zip.position.set(-0.72 * S, 0.48 * S, 0.04 * S);
    rightLegSocket.add(band, bag, zip);
  } else if (id === 'neonAnklets') {
    const glowMat = makeEmissiveMat(accentColor, 1.15);
    [leftLegSocket, rightLegSocket].forEach((leg, idx) => {
      const side = idx === 0 ? 1 : -1;
      const base = new THREE.Mesh(createRoundedBoxGeo(1.04 * S, 0.16 * S, 1.08 * S, 0.04 * S, 0.012 * S), primaryMat);
      base.position.set(side * 0.025 * S, -0.62 * S, 0);
      const ring = new THREE.Mesh(createRoundedBoxGeo(1.06 * S, 0.06 * S, 1.1 * S, 0.03 * S, 0.008 * S), glowMat);
      ring.position.set(side * 0.025 * S, -0.62 * S, 0);
      leg.add(base, ring);
    });
    update = (_sec, time) => {
      glowMat.emissiveIntensity = 0.8 + 0.4 * Math.sin(time * 4.5);
    };
  }

  enableShadows(waistSocket);
  enableShadows(leftLegSocket);
  enableShadows(rightLegSocket);
  return { update };
}
