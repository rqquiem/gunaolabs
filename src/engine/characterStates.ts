import * as THREE from 'three';
import {
  CHARACTER_STATE_IDS,
  CharacterStateId,
  CharacterStateKeyframe,
  CharacterStateLimb,
  EvaluatedCharacterState,
} from './types';

export interface CharacterStateMeta {
  id: CharacterStateId;
  label: string;
  shortLabel: string;
  description: string;
  accentColor: string;
  supportsLimb: boolean;
  hasBurstReplay: boolean;
}

export const CHARACTER_STATE_CATALOG: CharacterStateMeta[] = [
  {
    id: 'normal',
    label: 'Normal',
    shortLabel: 'Normal',
    description: 'Intact character rig with no active state effects.',
    accentColor: '#94a3b8',
    supportsLimb: false,
    hasBurstReplay: false,
  },
  {
    id: 'brokenLeg',
    label: 'Broken Leg',
    shortLabel: 'Broken Leg',
    description: 'Snaps the selected leg cleanly in half with a jagged bend and comic fracture flash.',
    accentColor: '#ef4444',
    supportsLimb: true,
    hasBurstReplay: true,
  },
  {
    id: 'mindBlown',
    label: 'Mind Blown',
    shortLabel: 'Mind Blown',
    description: 'Explodes the head into tumbling Roblox brick chunks, spinning stars, and colorful smoke.',
    accentColor: '#ec4899',
    supportsLimb: false,
    hasBurstReplay: true,
  },
  {
    id: 'frozenFeet',
    label: 'Frozen Feet',
    shortLabel: 'Frozen Feet',
    description: 'Encases both legs in translucent frost crystals with rising cold mist puffs.',
    accentColor: '#38bdf8',
    supportsLimb: false,
    hasBurstReplay: true,
  },
  {
    id: 'dizzy',
    label: 'Dizzy / KO',
    shortLabel: 'Dizzy',
    description: 'Orbits bright golden cartoon stars above a wobbling head.',
    accentColor: '#facc15',
    supportsLimb: false,
    hasBurstReplay: false,
  },
  {
    id: 'steamingMad',
    label: 'Steaming Mad',
    shortLabel: 'Steam Mad',
    description: 'Flushes the head crimson red with twin jets of rising cartoon steam puffs.',
    accentColor: '#f97316',
    supportsLimb: false,
    hasBurstReplay: false,
  },
];

export const CHARACTER_STATE_META: Record<CharacterStateId, CharacterStateMeta> =
  CHARACTER_STATE_CATALOG.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<CharacterStateId, CharacterStateMeta>,
  );

const VALID_STATE_SET = new Set<string>(CHARACTER_STATE_IDS);

export function isValidCharacterStateId(val: unknown): val is CharacterStateId {
  return typeof val === 'string' && VALID_STATE_SET.has(val);
}

export function sanitizeCharacterStateLimb(val: unknown): CharacterStateLimb {
  return val === 'leftLeg' ? 'leftLeg' : 'rightLeg';
}

export function createDefaultCharacterState(): EvaluatedCharacterState {
  return {
    stateId: 'normal',
    intensity: 1,
    targetLimb: 'rightLeg',
    triggerTime: 0,
    elapsedSec: 0,
    seed: 1,
  };
}

export function evaluateCharacterStateAt(
  keyframes: CharacterStateKeyframe[] | undefined,
  time: number,
): EvaluatedCharacterState {
  if (!keyframes || keyframes.length === 0) {
    return createDefaultCharacterState();
  }

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  let active: CharacterStateKeyframe | null = null;
  for (const kf of sorted) {
    if (kf.time <= time + 0.0005) {
      active = kf;
    } else {
      break;
    }
  }

  if (!active || !isValidCharacterStateId(active.stateId) || active.stateId === 'normal') {
    return {
      stateId: 'normal',
      intensity: 1,
      targetLimb: active?.targetLimb === 'leftLeg' ? 'leftLeg' : 'rightLeg',
      triggerTime: active ? active.time : 0,
      elapsedSec: active ? Math.max(0, time - active.time) : 0,
      seed: active?.seed ?? 1,
    };
  }

  return {
    stateId: active.stateId,
    intensity: Math.max(0.4, Math.min(1.5, active.intensity ?? 1)),
    targetLimb: sanitizeCharacterStateLimb(active.targetLimb),
    triggerTime: active.time,
    elapsedSec: Math.max(0, time - active.time),
    seed: typeof active.seed === 'number' && Number.isFinite(active.seed) ? active.seed : 1,
  };
}

function hash01(seed: number, idx: number): number {
  const x = Math.sin(seed * 127.1 + idx * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function createStarGeometry(outerR: number, innerR: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: depth * 0.18,
    bevelThickness: depth * 0.18,
  });
  geo.center();
  return geo;
}

export interface CharacterStateRigRefs {
  studSize: number;
  headPivot: THREE.Group;
  headMesh: THREE.Mesh;
  headBaseMaterial: THREE.MeshStandardMaterial;
  faceRoot: THREE.Group;
  hairSocket: THREE.Group;
  hatSocket: THREE.Group;
  headSocket: THREE.Group;
  faceSocket: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftLegMesh: THREE.Mesh;
  rightLegMesh: THREE.Mesh;
  leftLegTrimGroup: THREE.Group;
  rightLegTrimGroup: THREE.Group;
  legLeftGuardSocket: THREE.Group;
  legRightGuardSocket: THREE.Group;
  getPalette: () => {
    headColor: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
    leftLegColor: string;
    rightLegColor: string;
    shoeColor: string;
  };
}

export interface CharacterStateController {
  applyState: (state: EvaluatedCharacterState, sceneTime: number) => void;
  refreshPalette: () => void;
  dispose: () => void;
}

interface BrickParticleSpec {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  colorKind: 'head' | 'hair' | 'shirt' | 'accent';
  accentHex: string;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
}

interface StarParticleSpec {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  scale: number;
}

interface SmokeParticleSpec {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  maxScale: number;
  delay: number;
}

interface BrokenLegRigInstance {
  root: THREE.Group;
  upperMesh: THREE.Mesh;
  lowerPivot: THREE.Group;
  lowerMesh: THREE.Mesh;
  shoeMesh: THREE.Mesh;
  sparkRing: THREE.Group;
  sparkRays: THREE.Mesh[];
  upperMat: THREE.MeshStandardMaterial;
  lowerMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  sideSign: number; // +1 for leftLeg (+X), -1 for rightLeg (-X)
}

export function createCharacterStateController(
  refs: CharacterStateRigRefs,
): CharacterStateController {
  const S = refs.studSize;
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // =========================================================================
  // 1. BROKEN LEG COMPOSITE RIGS (Left & Right)
  // =========================================================================
  const upperLegGeo = trackGeo(new THREE.BoxGeometry(1.0 * S, 0.96 * S, 1.0 * S));
  const lowerLegGeo = trackGeo(new THREE.BoxGeometry(1.0 * S, 0.94 * S, 1.0 * S));
  const shoeCapGeo = trackGeo(new THREE.BoxGeometry(1.04 * S, 0.36 * S, 1.12 * S));
  const boneStubGeo = trackGeo(new THREE.CylinderGeometry(0.16 * S, 0.2 * S, 0.34 * S, 7));
  const boneKnobGeo = trackGeo(new THREE.SphereGeometry(0.15 * S, 7, 7));
  const crackToothGeo = trackGeo(new THREE.ConeGeometry(0.18 * S, 0.3 * S, 4));
  const sparkRayGeo = trackGeo(new THREE.BoxGeometry(0.08 * S, 0.48 * S, 0.08 * S));

  const boneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.42,
      metalness: 0.04,
      emissive: '#fef3c7',
      emissiveIntensity: 0.14,
    }),
  );
  const innerSplitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fda4af',
      roughness: 0.6,
      metalness: 0.02,
    }),
  );
  const sparkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#facc15',
      emissiveIntensity: 0.9,
      roughness: 0.25,
    }),
  );

  const buildBrokenLegRig = (
    parentPivot: THREE.Group,
    sideSign: number,
  ): BrokenLegRigInstance => {
    const root = new THREE.Group();
    root.visible = false;
    parentPivot.add(root);

    const upperMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.46,
        metalness: 0.05,
      }),
    );
    const lowerMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.46,
        metalness: 0.05,
      }),
    );
    const shoeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#18181b',
        roughness: 0.5,
        metalness: 0.08,
      }),
    );

    const upperMesh = new THREE.Mesh(upperLegGeo, upperMat);
    upperMesh.position.set(0, -0.48 * S, 0);
    upperMesh.castShadow = true;
    upperMesh.receiveShadow = true;
    root.add(upperMesh);

    // Exposed snap cross-section & cartoon bone nub sticking out of the upper thigh break
    const splitCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.92 * S, 0.06 * S, 0.92 * S)),
      innerSplitMat,
    );
    splitCap.position.set(0, -0.96 * S, 0);
    root.add(splitCap);

    const boneStub = new THREE.Mesh(boneStubGeo, boneMat);
    boneStub.position.set(sideSign * 0.14 * S, -1.04 * S, 0.08 * S);
    boneStub.rotation.set(0.18, 0, -sideSign * 0.25);
    root.add(boneStub);

    const boneKnobA = new THREE.Mesh(boneKnobGeo, boneMat);
    boneKnobA.position.set(sideSign * 0.22 * S, -1.16 * S, 0.16 * S);
    root.add(boneKnobA);

    const boneKnobB = new THREE.Mesh(boneKnobGeo, boneMat);
    boneKnobB.position.set(sideSign * 0.12 * S, -1.18 * S, 0.02 * S);
    root.add(boneKnobB);

    // Jagged fracture teeth along the upper split edge
    for (let i = 0; i < 4; i++) {
      const tooth = new THREE.Mesh(crackToothGeo, upperMat);
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      tooth.position.set(
        Math.cos(angle) * 0.3 * S,
        -1.01 * S,
        Math.sin(angle) * 0.3 * S,
      );
      tooth.rotation.x = Math.PI;
      root.add(tooth);
    }

    // Articulated broken lower-shin pivot positioned at the snap point (mid-leg)
    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, -0.96 * S, 0);
    root.add(lowerPivot);

    const lowerMesh = new THREE.Mesh(lowerLegGeo, lowerMat);
    lowerMesh.position.set(0, -0.52 * S, 0);
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;
    lowerPivot.add(lowerMesh);

    const lowerSplitCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.9 * S, 0.06 * S, 0.9 * S)),
      innerSplitMat,
    );
    lowerSplitCap.position.set(0, -0.05 * S, 0);
    lowerPivot.add(lowerSplitCap);

    const shoeMesh = new THREE.Mesh(shoeCapGeo, shoeMat);
    shoeMesh.position.set(0, -0.84 * S, 0.06 * S);
    shoeMesh.castShadow = true;
    shoeMesh.receiveShadow = true;
    lowerPivot.add(shoeMesh);

    // Comic impact fracture spark rays radiating from the snap joint
    const sparkRing = new THREE.Group();
    sparkRing.position.set(0, -0.96 * S, 0);
    root.add(sparkRing);
    const sparkRays: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const ray = new THREE.Mesh(sparkRayGeo, sparkMat);
      const ang = (i / 6) * Math.PI * 2;
      ray.position.set(Math.cos(ang) * 0.65 * S, 0, Math.sin(ang) * 0.65 * S);
      ray.rotation.z = Math.PI / 2;
      ray.rotation.y = -ang;
      sparkRing.add(ray);
      sparkRays.push(ray);
    }

    return {
      root,
      upperMesh,
      lowerPivot,
      lowerMesh,
      shoeMesh,
      sparkRing,
      sparkRays,
      upperMat,
      lowerMat,
      shoeMat,
      sideSign,
    };
  };

  const brokenLegRigs: Record<CharacterStateLimb, BrokenLegRigInstance> = {
    leftLeg: buildBrokenLegRig(refs.leftLegPivot, 1),
    rightLeg: buildBrokenLegRig(refs.rightLegPivot, -1),
  };

  // =========================================================================
  // 2. MIND BLOWN PARTICLE BURST RIG (Roblox bricks + stars + colorful smoke)
  // =========================================================================
  const mindBlownGroup = new THREE.Group();
  mindBlownGroup.position.set(0, 0.56 * S, 0);
  mindBlownGroup.visible = false;
  refs.headPivot.add(mindBlownGroup);

  // Clean dark neck-collar stump so headless torso reads sharply
  const neckStump = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.36 * S, 0.14 * S, 12)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.72,
        metalness: 0.1,
      }),
    ),
  );
  neckStump.position.set(0, -0.52 * S, 0);
  mindBlownGroup.add(neckStump);

  // Expanding pop shockwave ring
  const shockwaveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f472b6',
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.9,
      roughness: 0.2,
    }),
  );
  const shockwaveRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.42 * S, 0.07 * S, 8, 20)),
    shockwaveMat,
  );
  shockwaveRing.rotation.x = Math.PI / 2;
  mindBlownGroup.add(shockwaveRing);

  // Shared geometries for Roblox bricks, stars, and smoke puffs
  const brickBaseGeo = trackGeo(new THREE.BoxGeometry(0.36 * S, 0.24 * S, 0.24 * S));
  const brickStudGeo = trackGeo(new THREE.CylinderGeometry(0.07 * S, 0.07 * S, 0.05 * S, 8));
  const starGeo = trackGeo(createStarGeometry(0.24 * S, 0.11 * S, 0.08 * S));
  const smokeGeo = trackGeo(new THREE.IcosahedronGeometry(0.26 * S, 1));

  const brickAccents = ['#facc15', '#38bdf8', '#f472b6', '#a855f7', '#fb7185', '#34d399'];
  const brickParticles: BrickParticleSpec[] = [];
  for (let i = 0; i < 20; i++) {
    const colorKind: BrickParticleSpec['colorKind'] =
      i < 7 ? 'head' : i < 12 ? 'hair' : i < 15 ? 'shirt' : 'accent';
    const accentHex = brickAccents[i % brickAccents.length];
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: accentHex,
        roughness: 0.34,
        metalness: 0.08,
      }),
    );
    const brickGroup = new THREE.Group();
    const block = new THREE.Mesh(brickBaseGeo, mat);
    block.castShadow = true;
    brickGroup.add(block);
    const stud = new THREE.Mesh(brickStudGeo, mat);
    stud.position.y = 0.145 * S;
    brickGroup.add(stud);
    mindBlownGroup.add(brickGroup);

    const azimuth = (i / 20) * Math.PI * 2 + (hash01(7, i) - 0.5) * 0.45;
    const speedXZ = 1.65 + hash01(13, i) * 2.85;
    const speedY = 2.6 + hash01(29, i) * 3.4;
    brickParticles.push({
      group: brickGroup,
      mat,
      colorKind,
      accentHex,
      vx: Math.cos(azimuth) * speedXZ,
      vy: speedY,
      vz: Math.sin(azimuth) * speedXZ,
      rx: (hash01(41, i) - 0.5) * 14,
      ry: (hash01(53, i) - 0.5) * 14,
      rz: (hash01(67, i) - 0.5) * 14,
      scale: 0.72 + hash01(79, i) * 0.62,
    });
  }

  const starColors = ['#facc15', '#38bdf8', '#f472b6', '#fde047'];
  const starParticles: StarParticleSpec[] = [];
  for (let i = 0; i < 8; i++) {
    const col = starColors[i % starColors.length];
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.62,
        roughness: 0.22,
        metalness: 0.15,
      }),
    );
    const mesh = new THREE.Mesh(starGeo, mat);
    mindBlownGroup.add(mesh);
    const ang = (i / 8) * Math.PI * 2 + 0.25;
    const spd = 2.1 + hash01(101, i) * 2.2;
    starParticles.push({
      mesh,
      vx: Math.cos(ang) * spd,
      vy: 2.2 + hash01(113, i) * 2.5,
      vz: Math.sin(ang) * spd,
      spin: (i % 2 === 0 ? 1 : -1) * (5.5 + hash01(127, i) * 5.0),
      scale: 0.85 + hash01(139, i) * 0.5,
    });
  }

  const smokeColors = ['#fb7185', '#38bdf8', '#fde047', '#c084fc', '#f8fafc'];
  const smokeParticles: SmokeParticleSpec[] = [];
  for (let i = 0; i < 10; i++) {
    const col = smokeColors[i % smokeColors.length];
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.22,
        roughness: 0.75,
        transparent: true,
        opacity: 0.88,
      }),
    );
    const mesh = new THREE.Mesh(smokeGeo, mat);
    mindBlownGroup.add(mesh);
    const ang = (i / 10) * Math.PI * 2;
    const radSpd = 0.75 + hash01(151, i) * 1.45;
    smokeParticles.push({
      mesh,
      vx: Math.cos(ang) * radSpd,
      vy: 1.35 + hash01(163, i) * 1.75,
      vz: Math.sin(ang) * radSpd,
      maxScale: 1.05 + hash01(179, i) * 0.9,
      delay: hash01(191, i) * 0.08,
    });
  }

  // Lingering neck-stump cartoon smoke wisps after initial explosion
  const neckWispMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.85,
      transparent: true,
      opacity: 0.72,
    }),
  );
  const neckWisps: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(smokeGeo, neckWispMat);
    mindBlownGroup.add(w);
    neckWisps.push(w);
  }

  // =========================================================================
  // 3. FROZEN FEET RIG (Faceted cyan ice crystals + rising cold mist)
  // =========================================================================
  const iceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      emissive: '#0284c7',
      emissiveIntensity: 0.28,
      roughness: 0.14,
      metalness: 0.18,
      transparent: true,
      opacity: 0.8,
    }),
  );
  const frostHighlightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f0f9ff',
      emissive: '#7dd3fc',
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.1,
      transparent: true,
      opacity: 0.86,
    }),
  );
  const coldMistMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      emissive: '#bae6fd',
      emissiveIntensity: 0.2,
      roughness: 0.9,
      transparent: true,
      opacity: 0.65,
    }),
  );

  const iceBlockGeo = trackGeo(new THREE.BoxGeometry(1.22 * S, 1.16 * S, 1.28 * S));
  const iceShardGeo = trackGeo(new THREE.OctahedronGeometry(0.32 * S, 0));
  const mistGeo = trackGeo(new THREE.SphereGeometry(0.15 * S, 8, 8));

  const buildFrozenFootGroup = (parentPivot: THREE.Group): {
    group: THREE.Group;
    mistPuffs: THREE.Mesh[];
  } => {
    const group = new THREE.Group();
    group.visible = false;
    parentPivot.add(group);

    const encase = new THREE.Mesh(iceBlockGeo, iceMat);
    encase.position.set(0, -1.42 * S, 0.04 * S);
    encase.castShadow = true;
    group.add(encase);

    const shardOffsets: [number, number, number, number, number][] = [
      [0.48, -1.05, 0.36, 0.35, 1.15],
      [-0.46, -1.2, 0.42, -0.4, 1.0],
      [0.36, -1.62, -0.46, 0.25, 0.95],
      [-0.38, -0.92, -0.34, -0.3, 1.2],
      [0.0, -0.86, 0.52, 0.12, 1.1],
    ];
    for (let i = 0; i < shardOffsets.length; i++) {
      const [ox, oy, oz, rotZ, sc] = shardOffsets[i];
      const shard = new THREE.Mesh(
        iceShardGeo,
        i % 2 === 0 ? frostHighlightMat : iceMat,
      );
      shard.position.set(ox * S, oy * S, oz * S);
      shard.scale.set(sc * 0.72, sc * 1.45, sc * 0.72);
      shard.rotation.set(0.18 * (i - 2), i * 0.8, rotZ);
      group.add(shard);
    }

    const mistPuffs: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(mistGeo, coldMistMat);
      group.add(puff);
      mistPuffs.push(puff);
    }

    return { group, mistPuffs };
  };

  const frozenLeft = buildFrozenFootGroup(refs.leftLegPivot);
  const frozenRight = buildFrozenFootGroup(refs.rightLegPivot);

  // =========================================================================
  // 4. DIZZY / KNOCKED OUT RIG (Orbiting golden cartoon stars)
  // =========================================================================
  const dizzyGroup = new THREE.Group();
  dizzyGroup.position.set(0, 1.38 * S, 0);
  dizzyGroup.visible = false;
  refs.headPivot.add(dizzyGroup);

  const dizzyRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.82 * S, 0.03 * S, 6, 28)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#facc15',
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.52,
        roughness: 0.3,
      }),
    ),
  );
  dizzyRing.rotation.x = Math.PI / 2;
  dizzyGroup.add(dizzyRing);

  const dizzyStarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#f59e0b',
      emissiveIntensity: 0.72,
      roughness: 0.2,
      metalness: 0.15,
    }),
  );
  const dizzyStarGeo = trackGeo(createStarGeometry(0.2 * S, 0.09 * S, 0.06 * S));
  const dizzyStars: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const st = new THREE.Mesh(dizzyStarGeo, dizzyStarMat);
    dizzyGroup.add(st);
    dizzyStars.push(st);
  }

  // =========================================================================
  // 5. STEAMING MAD RIG (Crimson head glow + twin ear steam jets)
  // =========================================================================
  const steamGroup = new THREE.Group();
  steamGroup.position.set(0, 0.56 * S, 0);
  steamGroup.visible = false;
  refs.headPivot.add(steamGroup);

  const steamPuffGeo = trackGeo(new THREE.IcosahedronGeometry(0.16 * S, 1));
  const steamWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#fecdd3',
      emissiveIntensity: 0.24,
      roughness: 0.85,
      transparent: true,
      opacity: 0.82,
    }),
  );
  const steamPuffs: { mesh: THREE.Mesh; side: number; index: number }[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(steamPuffGeo, steamWhiteMat);
      steamGroup.add(puff);
      steamPuffs.push({ mesh: puff, side, index: i });
    }
  }

  // =========================================================================
  // PALETTE SYNC & STATE APPLICATION
  // =========================================================================
  const refreshPalette = () => {
    const pal = refs.getPalette();
    brokenLegRigs.leftLeg.upperMat.color.set(pal.pantsColor || pal.leftLegColor);
    brokenLegRigs.leftLeg.lowerMat.color.set(pal.pantsColor || pal.leftLegColor);
    brokenLegRigs.leftLeg.shoeMat.color.set(pal.shoeColor || '#18181b');

    brokenLegRigs.rightLeg.upperMat.color.set(pal.pantsColor || pal.rightLegColor);
    brokenLegRigs.rightLeg.lowerMat.color.set(pal.pantsColor || pal.rightLegColor);
    brokenLegRigs.rightLeg.shoeMat.color.set(pal.shoeColor || '#18181b');

    for (const bp of brickParticles) {
      if (bp.colorKind === 'head') bp.mat.color.set(pal.headColor);
      else if (bp.colorKind === 'hair') bp.mat.color.set(pal.hairColor || pal.headColor);
      else if (bp.colorKind === 'shirt') bp.mat.color.set(pal.shirtColor || bp.accentHex);
      else bp.mat.color.set(bp.accentHex);
    }
  };

  refreshPalette();

  const applyState = (state: EvaluatedCharacterState, sceneTime: number) => {
    const { stateId, intensity, targetLimb, elapsedSec, seed } = state;
    const isBroken = stateId === 'brokenLeg';
    const isMindBlown = stateId === 'mindBlown';
    const isFrozen = stateId === 'frozenFeet';
    const isDizzy = stateId === 'dizzy';
    const isSteaming = stateId === 'steamingMad';

    // 1. Restore baseline head & leg visibility cleanly before applying active state
    const showIntactHead = !isMindBlown;
    refs.headMesh.visible = showIntactHead;
    refs.faceRoot.visible = showIntactHead;
    refs.hairSocket.visible = showIntactHead;
    refs.hatSocket.visible = showIntactHead;
    refs.headSocket.visible = showIntactHead;
    refs.faceSocket.visible = showIntactHead;

    const leftBroken = isBroken && targetLimb === 'leftLeg';
    const rightBroken = isBroken && targetLimb === 'rightLeg';

    refs.leftLegMesh.visible = !leftBroken;
    refs.leftLegTrimGroup.visible = !leftBroken;
    refs.legLeftGuardSocket.visible = !leftBroken;
    brokenLegRigs.leftLeg.root.visible = leftBroken;

    refs.rightLegMesh.visible = !rightBroken;
    refs.rightLegTrimGroup.visible = !rightBroken;
    refs.legRightGuardSocket.visible = !rightBroken;
    brokenLegRigs.rightLeg.root.visible = rightBroken;

    mindBlownGroup.visible = isMindBlown;
    frozenLeft.group.visible = isFrozen;
    frozenRight.group.visible = isFrozen;
    dizzyGroup.visible = isDizzy;
    steamGroup.visible = isSteaming;

    // Reset head crimson glow unless Steaming Mad is active
    if (!isSteaming) {
      refs.headBaseMaterial.emissive.setHex(0x000000);
      refs.headBaseMaterial.emissiveIntensity = 0;
    }

    // 2. Broken Leg fracture spring animation & spark pop
    if (isBroken) {
      const rig = brokenLegRigs[targetLimb];
      const t = Math.max(0, elapsedSec);
      // Fast overshoot spring snap over first 0.28s
      const snapProgress =
        t < 0.28
          ? Math.min(1.24, (t / 0.16) * 1.18) - Math.max(0, (t - 0.16) / 0.12) * 0.18
          : 1.0;
      const clampedSnap = Math.max(0.18, snapProgress);
      const painQuiver =
        t < 0.75 ? Math.sin(t * 48) * 0.08 * (1 - t / 0.75) : Math.sin(sceneTime * 9) * 0.015;

      const bendZ = rig.sideSign * (0.74 * intensity * clampedSnap + painQuiver);
      const bendX = 0.56 * intensity * clampedSnap;
      rig.lowerPivot.rotation.set(bendX, rig.sideSign * 0.18 * clampedSnap, bendZ);

      // Comic snap-spark burst for first 0.52s
      const sparkAlive = t <= 0.52;
      rig.sparkRing.visible = sparkAlive;
      if (sparkAlive) {
        const u = t / 0.52;
        const burstScale = 0.45 + Math.sin(u * Math.PI) * 1.25 * intensity;
        rig.sparkRing.scale.setScalar(Math.max(0.01, burstScale));
        rig.sparkRing.rotation.y = u * 1.6;
      }
    }

    // 3. Mind Blown deterministic Roblox brick chunks + stars + colorful smoke pop
    if (isMindBlown) {
      const t = Math.max(0, elapsedSec);
      const seedOff = (seed % 97) * 0.13;
      const gravity = -9.6;

      // Rapid initial shockwave ring flash
      if (t <= 0.42) {
        const u = t / 0.42;
        shockwaveRing.visible = true;
        shockwaveRing.scale.setScalar(0.3 + u * 3.8 * intensity);
        shockwaveMat.opacity = Math.max(0, (1 - u) * 0.92);
      } else {
        shockwaveRing.visible = false;
      }

      // Tumbling Roblox bricks with ground bounce
      for (let i = 0; i < brickParticles.length; i++) {
        const bp = brickParticles[i];
        const sTwist = 0.85 + hash01(seed + 3, i) * 0.35;
        const vx = bp.vx * intensity * sTwist;
        const vy = bp.vy * intensity * sTwist;
        const vz = bp.vz * intensity * sTwist;
        const px = vx * t;
        const pz = vz * t;
        let py = vy * t + 0.5 * gravity * t * t;
        // Floor bounce in headPivot local space (floor is ~ -2.25 below head center)
        const floorY = -2.25;
        if (py < floorY) {
          const over = floorY - py;
          py = floorY + Math.abs(Math.sin(over * 2.2)) * Math.exp(-t * 1.15) * 0.55;
        }
        bp.group.position.set(px, py, pz);
        bp.group.rotation.set(
          bp.rx * t + seedOff,
          bp.ry * t + i * 0.5,
          bp.rz * t,
        );
        const fade = t > 2.4 ? Math.max(0.001, 1 - (t - 2.4) / 0.9) : 1;
        bp.group.visible = fade > 0.01;
        bp.group.scale.setScalar(bp.scale * fade * Math.min(1, t * 14 + 0.35));
      }

      // Spinning cartoon 3D stars
      for (let i = 0; i < starParticles.length; i++) {
        const sp = starParticles[i];
        const px = sp.vx * intensity * t;
        const py = sp.vy * intensity * t + 0.5 * -4.2 * t * t;
        const pz = sp.vz * intensity * t;
        sp.mesh.position.set(px, py, pz);
        sp.mesh.rotation.set(sp.spin * t * 0.6, sp.spin * t, sp.spin * t * 0.4);
        const life = Math.max(0, 1 - t / 1.85);
        sp.mesh.visible = life > 0.02;
        const pop = Math.sin(Math.min(1, t / 0.18) * (Math.PI / 2));
        sp.mesh.scale.setScalar(Math.max(0.001, sp.scale * pop * life * intensity));
      }

      // Colorful expanding smoke puffs
      for (let i = 0; i < smokeParticles.length; i++) {
        const sm = smokeParticles[i];
        const lt = Math.max(0, t - sm.delay);
        const life = Math.max(0, 1 - lt / 1.65);
        sm.mesh.visible = life > 0.02;
        if (life > 0.02) {
          const expand = 1 - Math.exp(-lt * 6.2);
          sm.mesh.position.set(
            sm.vx * intensity * expand * 1.15,
            sm.vy * intensity * (expand * 0.95 + lt * 0.35),
            sm.vz * intensity * expand * 1.15,
          );
          const sc = sm.maxScale * intensity * (0.35 + expand * 0.95) * Math.min(1, life * 1.5);
          sm.mesh.scale.setScalar(Math.max(0.001, sc));
          sm.mesh.rotation.y = lt * 1.4 + i;
        }
      }

      // Continuous subtle cartoon smoke wisps rising out of the empty neck collar
      for (let i = 0; i < neckWisps.length; i++) {
        const cycle = (sceneTime * 0.85 + i * 0.25) % 1;
        const w = neckWisps[i];
        w.visible = t > 0.15;
        w.position.set(
          Math.sin(sceneTime * 3.1 + i * 1.7) * 0.12 * S,
          (-0.42 + cycle * 1.35) * S,
          Math.cos(sceneTime * 2.6 + i * 1.3) * 0.12 * S,
        );
        const sc = Math.sin(cycle * Math.PI) * 0.62 * intensity;
        w.scale.setScalar(Math.max(0.001, sc));
      }
    }

    // 4. Frozen Feet crystal growth + cold mist + shiver
    if (isFrozen) {
      const t = Math.max(0, elapsedSec);
      const grow = Math.min(1, t / 0.32);
      const easeGrow = 1 - Math.pow(1 - grow, 3);
      const crystalScale = Math.max(0.05, easeGrow * (0.85 + 0.18 * intensity));
      const shiver = Math.sin(sceneTime * 34) * 0.032 * intensity;

      refs.leftLegPivot.rotation.z += shiver;
      refs.rightLegPivot.rotation.z -= shiver;

      const pairs = [
        { fg: frozenLeft, phaseOff: 0 },
        { fg: frozenRight, phaseOff: 0.48 },
      ];
      for (const { fg, phaseOff } of pairs) {
        fg.group.scale.set(crystalScale, crystalScale, crystalScale);
        for (let i = 0; i < fg.mistPuffs.length; i++) {
          const cycle = (sceneTime * 0.65 + phaseOff + i * 0.25) % 1;
          const ang = i * 1.57 + sceneTime * 1.1;
          const puff = fg.mistPuffs[i];
          puff.position.set(
            Math.cos(ang) * (0.48 + cycle * 0.25) * S,
            (-1.65 + cycle * 1.45) * S,
            Math.sin(ang) * (0.48 + cycle * 0.25) * S,
          );
          const sc = Math.sin(cycle * Math.PI) * (0.85 + 0.25 * intensity);
          puff.scale.setScalar(Math.max(0.001, sc));
        }
      }
    }

    // 5. Dizzy orbiting cartoon stars + head wobble
    if (isDizzy) {
      const orbitSpeed = 3.2 * (0.7 + 0.3 * intensity);
      dizzyGroup.rotation.z = Math.sin(sceneTime * 2.4) * 0.14;
      dizzyGroup.rotation.x = Math.cos(sceneTime * 2.0) * 0.1;

      for (let i = 0; i < dizzyStars.length; i++) {
        const ang = sceneTime * orbitSpeed + (i / dizzyStars.length) * Math.PI * 2;
        const st = dizzyStars[i];
        st.position.set(
          Math.cos(ang) * 0.82 * S,
          Math.sin(ang * 2 + sceneTime * 3) * 0.08 * S,
          Math.sin(ang) * 0.82 * S,
        );
        st.rotation.y = -ang + sceneTime * 2.5;
        st.rotation.z = Math.sin(sceneTime * 5 + i) * 0.35;
        st.scale.setScalar(0.85 + 0.25 * intensity);
      }

      // Figure-eight dazed head wobble applied additively over pose/look-at
      refs.headPivot.rotation.z += Math.sin(sceneTime * 4.4) * 0.16 * intensity;
      refs.headPivot.rotation.x += Math.cos(sceneTime * 2.2) * 0.1 * intensity;
    }

    // 6. Steaming Mad crimson head flush + twin ear steam jets
    if (isSteaming) {
      const ramp = Math.min(1, elapsedSec / 0.35);
      const pulse = 0.82 + 0.18 * Math.sin(sceneTime * 11);
      refs.headBaseMaterial.emissive.setHex(0xdc2626);
      refs.headBaseMaterial.emissiveIntensity = 0.52 * ramp * pulse * intensity;

      // Tense angry vibration rattle on head
      refs.headPivot.rotation.z += Math.sin(sceneTime * 42) * 0.035 * intensity;

      for (const sp of steamPuffs) {
        const cycle = (sceneTime * 1.65 + sp.index / 6 + (sp.side > 0 ? 0.08 : 0)) % 1;
        const outDist = (0.58 + cycle * 1.15 * intensity) * S;
        const riseY = (0.04 + Math.pow(cycle, 1.35) * 1.15 * intensity) * S;
        const swayZ = Math.sin(cycle * 7 + sp.index) * 0.12 * S;
        sp.mesh.position.set(sp.side * outDist, riseY, swayZ);
        const sc = Math.sin(cycle * Math.PI) * (0.55 + cycle * 1.15) * intensity;
        sp.mesh.scale.setScalar(Math.max(0.001, sc));
      }
    }
  };

  const dispose = () => {
    brokenLegRigs.leftLeg.root.parent?.remove(brokenLegRigs.leftLeg.root);
    brokenLegRigs.rightLeg.root.parent?.remove(brokenLegRigs.rightLeg.root);
    mindBlownGroup.parent?.remove(mindBlownGroup);
    frozenLeft.group.parent?.remove(frozenLeft.group);
    frozenRight.group.parent?.remove(frozenRight.group);
    dizzyGroup.parent?.remove(dizzyGroup);
    steamGroup.parent?.remove(steamGroup);

    for (const g of disposableGeos) g.dispose();
    for (const m of disposableMats) m.dispose();
  };

  return {
    applyState,
    refreshPalette,
    dispose,
  };
}
