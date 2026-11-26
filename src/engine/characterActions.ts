import * as THREE from 'three';
import {
  CHARACTER_ACTION_IDS,
  CHARACTER_MODEL_BUILD_IDS,
  CharacterActionId,
  CharacterActionKeyframe,
  CharacterActionSource,
  CharacterModelBuildId,
  CharacterModelSocketId,
  EvaluatedCharacterAction,
  ExpressionParams,
  Vec3Tuple,
} from './types';

// ---------------------------------------------------------------------------
// 1. Character Model Build Presets & Ground-Flush Rig Layout Math
// ---------------------------------------------------------------------------

export interface CharacterModelBuildSpec {
  id: CharacterModelBuildId;
  label: string;
  shortLabel: string;
  description: string;
  headScale: Vec3Tuple;
  torsoScale: Vec3Tuple;
  armScale: Vec3Tuple;
  legScale: Vec3Tuple;
}

export const CHARACTER_MODEL_BUILD_CATALOG: CharacterModelBuildSpec[] = [
  {
    id: 'classic',
    label: 'Classic R6',
    shortLabel: 'Classic',
    description: 'Standard iconic Roblox R6 proportions.',
    headScale: [1, 1, 1],
    torsoScale: [1, 1, 1],
    armScale: [1, 1, 1],
    legScale: [1, 1, 1],
  },
  {
    id: 'tall',
    label: 'Tall Heroic',
    shortLabel: 'Tall',
    description: 'Slender elongated silhouette with longer legs and torso.',
    headScale: [0.94, 0.96, 0.94],
    torsoScale: [0.92, 1.14, 0.92],
    armScale: [0.88, 1.15, 0.88],
    legScale: [0.92, 1.22, 0.92],
  },
  {
    id: 'chibi',
    label: 'Chibi Toy',
    shortLabel: 'Chibi',
    description: 'Stylized oversized head with compact torso and stubby limbs.',
    headScale: [1.32, 1.26, 1.3],
    torsoScale: [0.88, 0.78, 0.9],
    armScale: [0.82, 0.74, 0.82],
    legScale: [0.88, 0.72, 0.88],
  },
  {
    id: 'chunky',
    label: 'Chunky Heavy',
    shortLabel: 'Chunky',
    description: 'Broad sturdy torso with thick muscular arms and grounded stance.',
    headScale: [1.05, 1.0, 1.05],
    torsoScale: [1.26, 1.04, 1.24],
    armScale: [1.22, 1.02, 1.22],
    legScale: [1.16, 0.98, 1.16],
  },
];

export const CHARACTER_MODEL_BUILD_MAP: Record<
  CharacterModelBuildId,
  CharacterModelBuildSpec
> = CHARACTER_MODEL_BUILD_CATALOG.reduce(
  (acc, spec) => {
    acc[spec.id] = spec;
    return acc;
  },
  {} as Record<CharacterModelBuildId, CharacterModelBuildSpec>,
);

const VALID_BUILD_SET = new Set<string>(CHARACTER_MODEL_BUILD_IDS);

export function isValidCharacterModelBuildId(
  val: unknown,
): val is CharacterModelBuildId {
  return typeof val === 'string' && VALID_BUILD_SET.has(val);
}

export function sanitizeCharacterModelBuildId(
  val: unknown,
): CharacterModelBuildId {
  return isValidCharacterModelBuildId(val) ? val : 'classic';
}

export interface BuildRigLayout {
  spec: CharacterModelBuildSpec;
  torsoBaseY: number;
  headPivotY: number;
  armOffsetX: number;
  armOffsetY: number;
  legOffsetX: number;
  legOffsetY: number;
  neckSocketY: number;
  shoulderSocketY: number;
  backSocketZ: number;
  waistSocketY: number;
}

/**
 * Computes exact mathematically grounded R6 pivot positions for any body build.
 * Guarantees foot bottom Y === torsoBaseY + legOffsetY - 2 * stud * legScale[1] === 0.
 */
export function computeBuildRigLayout(
  buildId: CharacterModelBuildId,
  studSize: number,
): BuildRigLayout {
  const spec = CHARACTER_MODEL_BUILD_MAP[sanitizeCharacterModelBuildId(buildId)];
  const [tx, ty, tz] = spec.torsoScale;
  const [ax] = spec.armScale;
  const [lx, ly] = spec.legScale;

  const torsoBaseY = (2.0 * ly + 1.0 * ty) * studSize;
  const headPivotY = 1.0 * ty * studSize;
  const armOffsetX = (1.0 * tx + 0.52 * ax) * studSize;
  const armOffsetY = 0.85 * ty * studSize;
  const legOffsetX = 0.51 * Math.max(lx, tx * 0.96) * studSize;
  const legOffsetY = -1.0 * ty * studSize;

  return {
    spec,
    torsoBaseY,
    headPivotY,
    armOffsetX,
    armOffsetY,
    legOffsetX,
    legOffsetY,
    neckSocketY: 0.98 * ty * studSize,
    shoulderSocketY: 1.02 * ty * studSize,
    backSocketZ: -0.54 * tz * studSize,
    waistSocketY: -0.92 * ty * studSize,
  };
}

// ---------------------------------------------------------------------------
// 2. Character Action Function Catalog, Evaluation & Facial Sync Overlay
// ---------------------------------------------------------------------------

export interface CharacterActionMeta {
  id: CharacterActionId;
  label: string;
  shortLabel: string;
  description: string;
  accentColor: string;
  defaultSocketLabel: string;
  supportsSourceToggle: boolean;
}

export const CHARACTER_ACTION_CATALOG: CharacterActionMeta[] = [
  {
    id: 'none',
    label: 'Off',
    shortLabel: 'Off',
    description: 'No active emitter function.',
    accentColor: '#94a3b8',
    defaultSocketLabel: 'None',
    supportsSourceToggle: false,
  },
  {
    id: 'spewBeans',
    label: 'Spew Beans',
    shortLabel: 'Spew Beans',
    description:
      'Spews a ballistic stream of glossy 3D baked beans directly from the open mouth with ground pile accumulation.',
    accentColor: '#d97706',
    defaultSocketLabel: 'Mouth Socket + Jaw Sync',
    supportsSourceToggle: false,
  },
  {
    id: 'cryTears',
    label: 'Cry Tears',
    shortLabel: 'Cry Tears',
    description:
      'Twin cartoon fountain waterfalls of glistening 3D tears arching from both eye sockets with floor splashes.',
    accentColor: '#38bdf8',
    defaultSocketLabel: 'Left & Right Eye Sockets',
    supportsSourceToggle: false,
  },
  {
    id: 'breatheFire',
    label: 'Breathe Fire',
    shortLabel: 'Fire Breath',
    description:
      'Blazing volumetric cartoon flame stream surging from the mouth socket with ember sparks and smoke.',
    accentColor: '#f97316',
    defaultSocketLabel: 'Mouth Socket + Jaw Sync',
    supportsSourceToggle: false,
  },
  {
    id: 'confettiBurst',
    label: 'Confetti Burst',
    shortLabel: 'Confetti',
    description:
      'Fluttering multi-color confetti ribbons and spinning 3D golden sparkles erupting from the mouth or both hands.',
    accentColor: '#ec4899',
    defaultSocketLabel: 'Mouth or Hands Socket',
    supportsSourceToggle: true,
  },
  {
    id: 'sweatColdBreath',
    label: 'Sweat & Breath',
    shortLabel: 'Sweat/Cold',
    description:
      'Oversized anime forehead sweat drop paired with rhythmic cold-breath vapor puffs from the mouth.',
    accentColor: '#7dd3fc',
    defaultSocketLabel: 'Forehead + Mouth Sockets',
    supportsSourceToggle: false,
  },
];

export const CHARACTER_ACTION_META: Record<CharacterActionId, CharacterActionMeta> =
  CHARACTER_ACTION_CATALOG.reduce(
    (acc, meta) => {
      acc[meta.id] = meta;
      return acc;
    },
    {} as Record<CharacterActionId, CharacterActionMeta>,
  );

const VALID_ACTION_SET = new Set<string>(CHARACTER_ACTION_IDS);

export function isValidCharacterActionId(val: unknown): val is CharacterActionId {
  return typeof val === 'string' && VALID_ACTION_SET.has(val);
}

export function sanitizeCharacterActionSource(
  val: unknown,
): CharacterActionSource {
  return val === 'hands' ? 'hands' : 'mouth';
}

export function createDefaultCharacterAction(): EvaluatedCharacterAction {
  return {
    actionId: 'none',
    intensity: 1,
    source: 'mouth',
    triggerTime: 0,
    elapsedSec: 0,
    seed: 1,
  };
}

export function evaluateCharacterActionAt(
  keyframes: CharacterActionKeyframe[] | undefined,
  time: number,
): EvaluatedCharacterAction {
  if (!keyframes || keyframes.length === 0) {
    return createDefaultCharacterAction();
  }

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  let active: CharacterActionKeyframe | null = null;
  for (const kf of sorted) {
    if (kf.time <= time + 0.0005) {
      active = kf;
    } else {
      break;
    }
  }

  if (!active || !isValidCharacterActionId(active.actionId) || active.actionId === 'none') {
    return {
      actionId: 'none',
      intensity: 1,
      source: sanitizeCharacterActionSource(active?.source),
      triggerTime: active ? active.time : 0,
      elapsedSec: active ? Math.max(0, time - active.time) : 0,
      seed: active?.seed ?? 1,
    };
  }

  return {
    actionId: active.actionId,
    intensity: Math.max(0.4, Math.min(1.5, active.intensity ?? 1)),
    source: sanitizeCharacterActionSource(active.source),
    triggerTime: active.time,
    elapsedSec: Math.max(0, time - active.time),
    seed:
      typeof active.seed === 'number' && Number.isFinite(active.seed)
        ? active.seed
        : 1,
  };
}

/**
 * Returns non-destructive facial sync parameter overrides for active mouth/eye actions
 * so the 3D mouth visibly opens wide when spewing beans or breathing fire.
 */
export function getActionFaceSyncOverlay(
  action: EvaluatedCharacterAction | undefined,
  sceneTime: number,
): Partial<ExpressionParams> | null {
  if (!action || action.actionId === 'none') return null;

  const t = Math.max(0, action.elapsedSec);
  const pulse = 0.5 + 0.5 * Math.sin(sceneTime * 16 + action.seed);

  switch (action.actionId) {
    case 'spewBeans':
      return {
        jawOpen: Math.min(1, 0.86 + pulse * 0.14),
        mouthWidth: 0.32 + pulse * 0.12,
        smile: -0.25,
        browRaise: 0.55,
        eyeWide: 0.45,
        blush: 0.35 + pulse * 0.15,
      };
    case 'breatheFire':
      return {
        jawOpen: Math.min(1, 0.92 + pulse * 0.08),
        mouthWidth: 0.42,
        smile: -0.4,
        browFurrow: 0.85,
        browRaise: -0.25,
        eyeWide: 0.25,
      };
    case 'cryTears':
      return {
        eyeWide: -0.75,
        browRaise: 0.42,
        browFurrow: 0.45,
        smile: -0.68,
        jawOpen: 0.38 + pulse * 0.24,
        blush: 0.3,
      };
    case 'confettiBurst':
      if (action.source === 'mouth' && t < 1.35) {
        return {
          jawOpen: Math.max(0.2, 0.82 * Math.max(0, 1 - t / 1.35)),
          smile: 0.85,
          mouthWidth: 0.25,
          eyeWide: 0.35,
        };
      }
      return {
        smile: 0.85,
        eyeWide: 0.25,
      };
    case 'sweatColdBreath': {
      const breathPhase = (t % 1.35) / 1.35;
      const exhaling = breathPhase < 0.55;
      return {
        jawOpen: exhaling ? 0.38 : 0.08,
        mouthWidth: exhaling ? -0.45 : -0.1,
        browRaise: 0.45,
        eyeWide: 0.2,
      };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 3. Pooled Deterministic 3D World-Space Character Action Controller
// ---------------------------------------------------------------------------

function hash01(seed: number, idx: number): number {
  const x = Math.sin(seed * 127.1 + idx * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function createSparkleGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const points = 4;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points;
    const r = i % 2 === 0 ? 0.095 : 0.028;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
  });
  geo.center();
  return geo;
}

function createTeardropGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.09),
    new THREE.Vector2(0.045, -0.082),
    new THREE.Vector2(0.068, -0.042),
    new THREE.Vector2(0.062, 0.015),
    new THREE.Vector2(0.036, 0.072),
    new THREE.Vector2(0.012, 0.115),
    new THREE.Vector2(0.0, 0.135),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

// Module-scope reusable scratch math objects (Zero GC inside render loop)
const _worldPos = new THREE.Vector3();
const _worldPosB = new THREE.Vector3();
const _worldDir = new THREE.Vector3();
const _worldUp = new THREE.Vector3();
const _worldRight = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _rootInvQuat = new THREE.Quaternion();
const _localOrigin = new THREE.Vector3();
const _localOriginB = new THREE.Vector3();
const _localFwd = new THREE.Vector3();
const _localRight = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _partPos = new THREE.Vector3();
const _partScale = new THREE.Vector3();
const _partQuat = new THREE.Quaternion();
const _partEuler = new THREE.Euler();
const _partMat = new THREE.Matrix4();
const _tmpColor = new THREE.Color();
const _zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);

export interface CharacterActionRigRefs {
  root: THREE.Group;
  studSize: number;
  sockets: Record<CharacterModelSocketId, THREE.Group>;
}

export interface CharacterActionController {
  applyAction: (
    action: EvaluatedCharacterAction | undefined,
    sceneTime: number,
  ) => void;
  dispose: () => void;
}

const BEAN_COUNT = 64;
const BEAN_MOUND_PIECES = 18;
const TEAR_COUNT = 48;
const FIRE_COUNT = 36;
const CONFETTI_COUNT = 56;
const SPARKLE_COUNT = 12;
const BREATH_COUNT = 18;

const BEAN_PALETTE = [
  0x9a3412,
  0xb45309,
  0xc2410c,
  0x7c2d12,
  0xd97706,
  0x92400e,
];

const CONFETTI_PALETTE = [
  0xf43f5e,
  0xfacc15,
  0x38bdf8,
  0x4ade80,
  0xc084fc,
  0xf97316,
  0x2dd4bf,
];

export function createCharacterActionController(
  refs: CharacterActionRigRefs,
): CharacterActionController {
  const fxRoot = new THREE.Group();
  fxRoot.name = 'CharacterActionFxRoot';
  refs.root.add(fxRoot);

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

  // --- 1. SPEW BEANS FROM MOUTH ---
  const beansGroup = new THREE.Group();
  beansGroup.visible = false;
  fxRoot.add(beansGroup);

  const beanGeo = trackGeo(new THREE.CapsuleGeometry(0.036, 0.056, 4, 8));
  beanGeo.scale(1.0, 1.0, 0.72); // subtle flattened kidney-bean silhouette
  const beanMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.08,
    }),
  );
  const beanInstanced = new THREE.InstancedMesh(beanGeo, beanMat, BEAN_COUNT);
  beanInstanced.castShadow = true;
  beanInstanced.receiveShadow = true;
  beanInstanced.frustumCulled = false;
  for (let i = 0; i < BEAN_COUNT; i++) {
    _tmpColor.setHex(BEAN_PALETTE[i % BEAN_PALETTE.length]);
    beanInstanced.setColorAt(i, _tmpColor);
    beanInstanced.setMatrixAt(i, _zeroMat);
  }
  if (beanInstanced.instanceColor) beanInstanced.instanceColor.needsUpdate = true;
  beanInstanced.instanceMatrix.needsUpdate = true;
  beansGroup.add(beanInstanced);

  // Growing ground bean pile + glossy baked-bean sauce puddle at the landing zone
  const beanMoundGroup = new THREE.Group();
  beanMoundGroup.visible = false;
  beansGroup.add(beanMoundGroup);

  const saucePuddleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.16,
      metalness: 0.06,
      transparent: true,
      opacity: 0.88,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const saucePuddleGeo = trackGeo(new THREE.CircleGeometry(0.62, 20));
  const saucePuddle = new THREE.Mesh(saucePuddleGeo, saucePuddleMat);
  saucePuddle.rotation.x = -Math.PI / 2;
  saucePuddle.position.y = 0.018;
  saucePuddle.receiveShadow = true;
  beanMoundGroup.add(saucePuddle);

  const moundCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.34,
      metalness: 0.04,
    }),
  );
  const moundCoreGeo = trackGeo(new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2));
  const moundCore = new THREE.Mesh(moundCoreGeo, moundCoreMat);
  moundCore.scale.set(1.15, 0.52, 1.05);
  moundCore.position.y = 0.01;
  moundCore.castShadow = true;
  moundCore.receiveShadow = true;
  beanMoundGroup.add(moundCore);

  const moundBeans = new THREE.InstancedMesh(beanGeo, beanMat, BEAN_MOUND_PIECES);
  moundBeans.castShadow = true;
  moundBeans.receiveShadow = true;
  moundBeans.frustumCulled = false;
  for (let i = 0; i < BEAN_MOUND_PIECES; i++) {
    const angle = hash01(19, i) * Math.PI * 2;
    const rad = Math.sqrt(hash01(37, i)) * 0.44;
    const height = Math.max(0.03, (1 - rad / 0.48) * 0.22);
    _partPos.set(Math.cos(angle) * rad, height, Math.sin(angle) * rad);
    _partEuler.set(
      hash01(51, i) * Math.PI,
      hash01(73, i) * Math.PI * 2,
      hash01(97, i) * Math.PI,
    );
    _partQuat.setFromEuler(_partEuler);
    const sc = 0.95 + hash01(111, i) * 0.45;
    _partScale.set(sc, sc, sc);
    _partMat.compose(_partPos, _partQuat, _partScale);
    moundBeans.setMatrixAt(i, _partMat);
    _tmpColor.setHex(BEAN_PALETTE[i % BEAN_PALETTE.length]);
    moundBeans.setColorAt(i, _tmpColor);
  }
  if (moundBeans.instanceColor) moundBeans.instanceColor.needsUpdate = true;
  moundBeans.instanceMatrix.needsUpdate = true;
  beanMoundGroup.add(moundBeans);

  // --- 2. CRY FOUNTAIN TEARS FROM BOTH EYES ---
  const tearsGroup = new THREE.Group();
  tearsGroup.visible = false;
  fxRoot.add(tearsGroup);

  const tearGeo = trackGeo(new THREE.CapsuleGeometry(0.028, 0.085, 4, 8));
  const tearMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      roughness: 0.12,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const tearInstanced = new THREE.InstancedMesh(tearGeo, tearMat, TEAR_COUNT);
  tearInstanced.frustumCulled = false;
  for (let i = 0; i < TEAR_COUNT; i++) {
    tearInstanced.setMatrixAt(i, _zeroMat);
  }
  tearInstanced.instanceMatrix.needsUpdate = true;
  tearsGroup.add(tearInstanced);

  const tearPuddleGeo = trackGeo(new THREE.CircleGeometry(0.38, 18));
  const tearPuddleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.62,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const leftTearPuddle = new THREE.Mesh(tearPuddleGeo, tearPuddleMat);
  leftTearPuddle.rotation.x = -Math.PI / 2;
  const rightTearPuddle = new THREE.Mesh(tearPuddleGeo, tearPuddleMat);
  rightTearPuddle.rotation.x = -Math.PI / 2;
  tearsGroup.add(leftTearPuddle, rightTearPuddle);

  const splashRingGeo = trackGeo(new THREE.RingGeometry(0.12, 0.18, 18));
  const splashRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const leftSplashRing = new THREE.Mesh(splashRingGeo, splashRingMat);
  leftSplashRing.rotation.x = -Math.PI / 2;
  const rightSplashRing = new THREE.Mesh(splashRingGeo, splashRingMat);
  rightSplashRing.rotation.x = -Math.PI / 2;
  tearsGroup.add(leftSplashRing, rightSplashRing);

  // --- 3. BREATHE CARTOON FIRE STREAM FROM MOUTH ---
  const fireGroup = new THREE.Group();
  fireGroup.visible = false;
  fxRoot.add(fireGroup);

  const fireGeo = trackGeo(new THREE.DodecahedronGeometry(0.11, 1));
  const fireMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff6b00,
      emissiveIntensity: 0.85,
      roughness: 0.4,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
    }),
  );
  const fireInstanced = new THREE.InstancedMesh(fireGeo, fireMat, FIRE_COUNT);
  fireInstanced.frustumCulled = false;
  for (let i = 0; i < FIRE_COUNT; i++) {
    fireInstanced.setMatrixAt(i, _zeroMat);
    _tmpColor.setHex(0xfacc15);
    fireInstanced.setColorAt(i, _tmpColor);
  }
  if (fireInstanced.instanceColor) fireInstanced.instanceColor.needsUpdate = true;
  fireInstanced.instanceMatrix.needsUpdate = true;
  fireGroup.add(fireInstanced);

  const fireCoreGeo = trackGeo(new THREE.SphereGeometry(0.11, 12, 10));
  const fireCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const fireCoreMesh = new THREE.Mesh(fireCoreGeo, fireCoreMat);
  fireGroup.add(fireCoreMesh);

  // --- 4. CONFETTI & SPARKLE BURST (MOUTH OR HANDS) ---
  const confettiGroup = new THREE.Group();
  confettiGroup.visible = false;
  fxRoot.add(confettiGroup);

  const confettiGeo = trackGeo(new THREE.BoxGeometry(0.088, 0.012, 0.052));
  const confettiMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.12,
    }),
  );
  const confettiInstanced = new THREE.InstancedMesh(
    confettiGeo,
    confettiMat,
    CONFETTI_COUNT,
  );
  confettiInstanced.frustumCulled = false;
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    _tmpColor.setHex(CONFETTI_PALETTE[i % CONFETTI_PALETTE.length]);
    confettiInstanced.setColorAt(i, _tmpColor);
    confettiInstanced.setMatrixAt(i, _zeroMat);
  }
  if (confettiInstanced.instanceColor) confettiInstanced.instanceColor.needsUpdate = true;
  confettiInstanced.instanceMatrix.needsUpdate = true;
  confettiGroup.add(confettiInstanced);

  const sparkleGeo = trackGeo(createSparkleGeometry());
  const sparkleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.7,
      roughness: 0.18,
      metalness: 0.45,
    }),
  );
  const sparkleInstanced = new THREE.InstancedMesh(
    sparkleGeo,
    sparkleMat,
    SPARKLE_COUNT,
  );
  sparkleInstanced.frustumCulled = false;
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    sparkleInstanced.setMatrixAt(i, _zeroMat);
  }
  sparkleInstanced.instanceMatrix.needsUpdate = true;
  confettiGroup.add(sparkleInstanced);

  // --- 5. SWEAT DROPS & COLD BREATH PUFF ---
  const sweatColdGroup = new THREE.Group();
  sweatColdGroup.visible = false;
  fxRoot.add(sweatColdGroup);

  const sweatDropGroup = new THREE.Group();
  const sweatDropGeo = trackGeo(createTeardropGeometry());
  const sweatDropMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.22,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    }),
  );
  const sweatDropMesh = new THREE.Mesh(sweatDropGeo, sweatDropMat);
  sweatDropGroup.add(sweatDropMesh);

  const sweatHighlightGeo = trackGeo(new THREE.SphereGeometry(0.024, 8, 8));
  const sweatHighlightMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf0f9ff }),
  );
  const sweatHighlight = new THREE.Mesh(sweatHighlightGeo, sweatHighlightMat);
  sweatHighlight.position.set(0.026, -0.025, 0.048);
  sweatDropGroup.add(sweatHighlight);
  sweatColdGroup.add(sweatDropGroup);

  const breathGeo = trackGeo(new THREE.SphereGeometry(0.075, 10, 8));
  const breathMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.18,
      roughness: 0.92,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  const breathInstanced = new THREE.InstancedMesh(breathGeo, breathMat, BREATH_COUNT);
  breathInstanced.frustumCulled = false;
  for (let i = 0; i < BREATH_COUNT; i++) {
    breathInstanced.setMatrixAt(i, _zeroMat);
  }
  breathInstanced.instanceMatrix.needsUpdate = true;
  sweatColdGroup.add(breathInstanced);

  // Helper: extract socket origin & forward/right/up basis inside refs.root local space
  const readSocketInRootSpace = (
    socket: THREE.Object3D,
    outOrigin: THREE.Vector3,
    outFwd: THREE.Vector3,
    outRight: THREE.Vector3,
    outUp: THREE.Vector3,
  ) => {
    refs.root.getWorldQuaternion(_rootInvQuat).invert();
    socket.getWorldPosition(_worldPos);
    outOrigin.copy(_worldPos);
    refs.root.worldToLocal(outOrigin);

    socket.getWorldQuaternion(_worldQuat);
    _worldDir.set(0, 0, 1).applyQuaternion(_worldQuat).normalize();
    _worldRight.set(1, 0, 0).applyQuaternion(_worldQuat).normalize();
    _worldUp.set(0, 1, 0).applyQuaternion(_worldQuat).normalize();

    outFwd.copy(_worldDir).applyQuaternion(_rootInvQuat).normalize();
    outRight.copy(_worldRight).applyQuaternion(_rootInvQuat).normalize();
    outUp.copy(_worldUp).applyQuaternion(_rootInvQuat).normalize();
  };

  const hideAll = () => {
    beansGroup.visible = false;
    beanMoundGroup.visible = false;
    tearsGroup.visible = false;
    fireGroup.visible = false;
    confettiGroup.visible = false;
    sweatColdGroup.visible = false;
  };

  const applyAction = (
    action: EvaluatedCharacterAction | undefined,
    sceneTime: number,
  ) => {
    if (!action || action.actionId === 'none') {
      hideAll();
      return;
    }

    hideAll();
    const intensity = Math.max(0.4, Math.min(1.5, action.intensity || 1));
    const t = Math.max(0, action.elapsedSec);
    const seed = action.seed || 1;
    // Floor plane in actor-root local space (accounts for seated actors raised above y=0)
    const rootScaleY = Math.max(0.001, Math.abs(refs.root.scale.y) || 1);
    const groundLocalY = -refs.root.position.y / rootScaleY;

    switch (action.actionId) {
      case 'spewBeans': {
        beansGroup.visible = true;
        readSocketInRootSpace(
          refs.sockets.mouth,
          _localOrigin,
          _localFwd,
          _localRight,
          _localUp,
        );

        const gravity = 9.4;
        const cycleDur = 1.45;
        const baseSpeed = 2.05 * (0.75 + 0.35 * intensity);

        for (let i = 0; i < BEAN_COUNT; i++) {
          const spawnOffset = (i / BEAN_COUNT) * cycleDur;
          if (t < spawnOffset * 0.45) {
            beanInstanced.setMatrixAt(i, _zeroMat);
            continue;
          }
          const age = (t - spawnOffset * 0.45) % cycleDur;
          const cycleIndex = Math.floor((t - spawnOffset * 0.45) / cycleDur);
          const pSeed = seed * 31 + i + cycleIndex * 97;

          const spreadX = (hash01(pSeed, 1) - 0.5) * 0.62 * intensity;
          const spreadY = (hash01(pSeed, 2) - 0.32) * 0.72 * intensity;
          const speedJitter = 0.72 + hash01(pSeed, 3) * 0.58;
          const fwdSpeed = baseSpeed * speedJitter;

          const vx = _localFwd.x * fwdSpeed + _localRight.x * spreadX + _localUp.x * spreadY;
          const vy = _localFwd.y * fwdSpeed + _localRight.y * spreadX + _localUp.y * spreadY + 0.65;
          const vz = _localFwd.z * fwdSpeed + _localRight.z * spreadX + _localUp.z * spreadY;

          const floorY = groundLocalY + 0.036;
          // Solve ballistic impact time with floorY
          const h0 = Math.max(0.05, _localOrigin.y - floorY);
          const disc = vy * vy + 2 * gravity * h0;
          const tHit = (vy + Math.sqrt(Math.max(0, disc))) / gravity;

          let px: number;
          let py: number;
          let pz: number;

          if (age <= tHit) {
            px = _localOrigin.x + vx * age;
            py = _localOrigin.y + vy * age - 0.5 * gravity * age * age;
            pz = _localOrigin.z + vz * age;
          } else {
            // Post-impact bounce & roll along floor
            const dt = age - tHit;
            const impactVy = Math.abs(vy - gravity * tHit);
            const bounceVy = impactVy * 0.34;
            const bounceDur = (2 * bounceVy) / gravity;
            const hitX = _localOrigin.x + vx * tHit;
            const hitZ = _localOrigin.z + vz * tHit;
            const rollDist = (1 - Math.exp(-dt * 2.8)) * 0.42;

            px = hitX + vx * rollDist;
            pz = hitZ + vz * rollDist;
            if (dt < bounceDur) {
              py = floorY + bounceVy * dt - 0.5 * gravity * dt * dt;
            } else {
              py = floorY + hash01(pSeed, 5) * 0.04;
            }
          }

          // Smooth fade-out only at very end of cycle
          const fadeOut = age > cycleDur - 0.16 ? Math.max(0.001, (cycleDur - age) / 0.16) : 1;
          const sc = (0.88 + hash01(pSeed, 4) * 0.45) * fadeOut;

          _partPos.set(px, Math.max(floorY, py), pz);
          _partEuler.set(
            age * (7 + hash01(pSeed, 6) * 8),
            age * (6 + hash01(pSeed, 7) * 9),
            hash01(pSeed, 8) * Math.PI,
          );
          _partQuat.setFromEuler(_partEuler);
          _partScale.set(sc, sc, sc);
          _partMat.compose(_partPos, _partQuat, _partScale);
          beanInstanced.setMatrixAt(i, _partMat);
        }
        beanInstanced.instanceMatrix.needsUpdate = true;

        // Place & grow baked-bean mound at exact ballistic landing spot ahead of mouth
        const hAvg = Math.max(0.1, _localOrigin.y - groundLocalY);
        const tLand = (0.65 + Math.sqrt(0.65 * 0.65 + 2 * gravity * hAvg)) / gravity;
        const landDist = baseSpeed * 0.92 * tLand;
        const moundGrow = Math.min(1, Math.max(0, (t - 0.25) / 2.2));
        if (moundGrow > 0.01) {
          beanMoundGroup.visible = true;
          beanMoundGroup.position.set(
            _localOrigin.x + _localFwd.x * landDist,
            groundLocalY,
            _localOrigin.z + _localFwd.z * landDist,
          );
          const mScale = (0.32 + 0.72 * moundGrow) * (0.85 + 0.25 * intensity);
          beanMoundGroup.scale.set(mScale, 0.25 + 0.85 * moundGrow, mScale);
        }
        break;
      }

      case 'cryTears': {
        tearsGroup.visible = true;
        readSocketInRootSpace(
          refs.sockets.leftEye,
          _localOrigin,
          _localFwd,
          _localRight,
          _localUp,
        );
        refs.sockets.rightEye.getWorldPosition(_worldPosB);
        _localOriginB.copy(_worldPosB);
        refs.root.worldToLocal(_localOriginB);

        const gravity = 8.6;
        const cycleDur = 0.95;
        const half = TEAR_COUNT / 2;

        for (let i = 0; i < TEAR_COUNT; i++) {
          const isLeft = i < half;
          const idx = isLeft ? i : i - half;
          const origin = isLeft ? _localOrigin : _localOriginB;
          const sideSign = isLeft ? 1 : -1;

          const phase = (idx / half) * cycleDur;
          const age = (t + phase) % cycleDur;
          const pSeed = seed * 17 + i;

          const outSide = (1.15 + hash01(pSeed, 1) * 0.35) * intensity * sideSign;
          const fwdSpd = (0.78 + hash01(pSeed, 2) * 0.28) * intensity;
          const upSpd = (0.72 + hash01(pSeed, 3) * 0.26) * intensity;

          const vx = _localRight.x * outSide + _localFwd.x * fwdSpd;
          const vy = upSpd + _localFwd.y * fwdSpd;
          const vz = _localRight.z * outSide + _localFwd.z * fwdSpd;

          const px = origin.x + vx * age;
          const py = origin.y + vy * age - 0.5 * gravity * age * age;
          const pz = origin.z + vz * age;

          if (py < groundLocalY + 0.02) {
            tearInstanced.setMatrixAt(i, _zeroMat);
            continue;
          }

          // Align elongated teardrop along instantaneous velocity vector
          const curVy = vy - gravity * age;
          _partPos.set(px, py, pz);
          _worldDir.set(vx, curVy, vz).normalize();
          _partQuat.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, _worldDir);
          const sc = (0.8 + hash01(pSeed, 4) * 0.45) * (0.85 + 0.25 * intensity);
          _partScale.set(sc, sc * 1.25, sc);
          _partMat.compose(_partPos, _partQuat, _partScale);
          tearInstanced.setMatrixAt(i, _partMat);
        }
        tearInstanced.instanceMatrix.needsUpdate = true;

        // Position twin floor puddles + animated ripple rings under left & right arcs
        const hEye = Math.max(0.2, _localOrigin.y - groundLocalY);
        const tSplash = (0.75 * intensity + Math.sqrt(0.6 + 2 * gravity * hEye)) / gravity;
        const puddleGrow = Math.min(1, 0.25 + t * 0.45);
        const rippleCycle = (sceneTime * 2.4) % 1;

        const lx = _localOrigin.x + (_localRight.x * 1.2 + _localFwd.x * 0.8) * intensity * tSplash;
        const lz = _localOrigin.z + (_localRight.z * 1.2 + _localFwd.z * 0.8) * intensity * tSplash;
        const rx = _localOriginB.x + (-_localRight.x * 1.2 + _localFwd.x * 0.8) * intensity * tSplash;
        const rz = _localOriginB.z + (-_localRight.z * 1.2 + _localFwd.z * 0.8) * intensity * tSplash;

        leftTearPuddle.position.set(lx, groundLocalY + 0.02, lz);
        leftTearPuddle.scale.setScalar(puddleGrow * intensity);
        rightTearPuddle.position.set(rx, groundLocalY + 0.02, rz);
        rightTearPuddle.scale.setScalar(puddleGrow * intensity);

        leftSplashRing.position.set(lx, groundLocalY + 0.028, lz);
        leftSplashRing.scale.setScalar(0.5 + rippleCycle * 1.8 * intensity);
        rightSplashRing.position.set(rx, groundLocalY + 0.028, rz);
        rightSplashRing.scale.setScalar(0.5 + ((rippleCycle + 0.5) % 1) * 1.8 * intensity);
        splashRingMat.opacity = Math.max(0.05, 0.78 * (1 - rippleCycle));
        break;
      }

      case 'breatheFire': {
        fireGroup.visible = true;
        readSocketInRootSpace(
          refs.sockets.mouth,
          _localOrigin,
          _localFwd,
          _localRight,
          _localUp,
        );

        const cycleDur = 0.72;
        const jetLen = 2.6 * intensity;

        fireCoreMesh.position.copy(_localOrigin).addScaledVector(_localFwd, 0.14);
        const corePulse = 0.9 + 0.25 * Math.sin(sceneTime * 34);
        fireCoreMesh.scale.setScalar(corePulse * intensity);

        for (let i = 0; i < FIRE_COUNT; i++) {
          const offset = (i / FIRE_COUNT) * cycleDur;
          const age = (t + offset) % cycleDur;
          const norm = age / cycleDur; // 0 = mouth, 1 = far tip
          const pSeed = seed * 43 + i;

          const dist = 0.08 + norm * jetLen;
          const coneRadius = (0.04 + norm * 0.42) * intensity;
          const swirlAngle = norm * 9.0 + hash01(pSeed, 1) * Math.PI * 2 + sceneTime * 6;
          const offR = Math.cos(swirlAngle) * coneRadius * (0.4 + 0.6 * hash01(pSeed, 2));
          const offU = Math.sin(swirlAngle) * coneRadius * (0.4 + 0.6 * hash01(pSeed, 3)) + norm * norm * 0.48;

          _partPos
            .copy(_localOrigin)
            .addScaledVector(_localFwd, dist)
            .addScaledVector(_localRight, offR)
            .addScaledVector(_localUp, offU);

          _partEuler.set(
            sceneTime * 5 + i,
            sceneTime * 7 + i * 0.5,
            sceneTime * 4,
          );
          _partQuat.setFromEuler(_partEuler);
          const sc = (0.55 + Math.sin(norm * Math.PI) * 1.65) * intensity * (0.75 + 0.4 * hash01(pSeed, 4));
          _partScale.set(sc, sc, sc * 1.15);
          _partMat.compose(_partPos, _partQuat, _partScale);
          fireInstanced.setMatrixAt(i, _partMat);

          // Color gradient: incandescent yellow -> bright orange -> crimson -> dark smoke tip
          if (norm < 0.25) {
            _tmpColor.setHex(0xfef08a);
          } else if (norm < 0.55) {
            _tmpColor.setHex(0xf97316);
          } else if (norm < 0.82) {
            _tmpColor.setHex(0xdc2626);
          } else {
            _tmpColor.setHex(0x27272a);
          }
          fireInstanced.setColorAt(i, _tmpColor);
        }
        fireInstanced.instanceMatrix.needsUpdate = true;
        if (fireInstanced.instanceColor) fireInstanced.instanceColor.needsUpdate = true;
        break;
      }

      case 'confettiBurst': {
        confettiGroup.visible = true;
        const fromHands = action.source === 'hands';
        if (fromHands) {
          readSocketInRootSpace(
            refs.sockets.leftHand,
            _localOrigin,
            _localFwd,
            _localRight,
            _localUp,
          );
          refs.sockets.rightHand.getWorldPosition(_worldPosB);
          _localOriginB.copy(_worldPosB);
          refs.root.worldToLocal(_localOriginB);
        } else {
          readSocketInRootSpace(
            refs.sockets.mouth,
            _localOrigin,
            _localFwd,
            _localRight,
            _localUp,
          );
          _localOriginB.copy(_localOrigin);
        }

        const loopDur = 2.6;
        const age = t % loopDur;
        const drag = 1 - Math.exp(-age * 2.1);

        for (let i = 0; i < CONFETTI_COUNT; i++) {
          const origin = fromHands && i % 2 === 1 ? _localOriginB : _localOrigin;
          const pSeed = seed * 61 + i;
          const speed = (1.65 + hash01(pSeed, 1) * 1.95) * intensity;
          const spreadR = (hash01(pSeed, 2) - 0.5) * 2.2;
          const spreadU = (hash01(pSeed, 3) - 0.15) * 2.1;

          const dirX = fromHands
            ? (hash01(pSeed, 4) - 0.5) * 1.4
            : _localFwd.x * 1.35 + _localRight.x * spreadR;
          const dirY = fromHands
            ? 1.25 + hash01(pSeed, 5) * 1.2
            : _localFwd.y + 0.85 + spreadU * 0.65;
          const dirZ = fromHands
            ? (hash01(pSeed, 6) - 0.5) * 1.4 + 0.35
            : _localFwd.z * 1.35 + _localRight.z * spreadR;

          const sway = Math.sin(age * (5 + hash01(pSeed, 7) * 4) + i) * 0.14 * age;
          const px = origin.x + dirX * speed * drag * 0.62 + sway;
          const py = Math.max(
            groundLocalY + 0.015,
            origin.y + dirY * speed * drag * 0.55 - 1.15 * age * age,
          );
          const pz = origin.z + dirZ * speed * drag * 0.62 + Math.cos(age * 4 + i) * 0.1 * age;

          const fade = age > loopDur - 0.35 ? Math.max(0.001, (loopDur - age) / 0.35) : 1;
          const sc = (0.85 + hash01(pSeed, 8) * 0.55) * fade;
          _partPos.set(px, py, pz);
          _partEuler.set(
            age * (8 + hash01(pSeed, 9) * 10),
            age * (7 + hash01(pSeed, 10) * 11),
            age * 6,
          );
          _partQuat.setFromEuler(_partEuler);
          _partScale.set(sc, sc, sc);
          _partMat.compose(_partPos, _partQuat, _partScale);
          confettiInstanced.setMatrixAt(i, _partMat);
        }
        confettiInstanced.instanceMatrix.needsUpdate = true;

        for (let i = 0; i < SPARKLE_COUNT; i++) {
          const origin = fromHands && i % 2 === 1 ? _localOriginB : _localOrigin;
          const pSeed = seed * 89 + i;
          const dist = (0.35 + hash01(pSeed, 1) * 1.65) * drag * intensity;
          const ang = hash01(pSeed, 2) * Math.PI * 2;
          const lift = (0.2 + hash01(pSeed, 3) * 1.1) * drag * intensity - 0.25 * age * age;

          _partPos.set(
            origin.x + (_localFwd.x * (fromHands ? 0.2 : 0.9) + Math.cos(ang) * 0.75) * dist,
            Math.max(groundLocalY + 0.12, origin.y + lift),
            origin.z + (_localFwd.z * (fromHands ? 0.2 : 0.9) + Math.sin(ang) * 0.75) * dist,
          );
          const twinkle = Math.max(0.001, Math.sin(age * 10 + i * 1.3) * 0.5 + 0.65) *
            (age > loopDur - 0.4 ? Math.max(0.001, (loopDur - age) / 0.4) : 1);
          _partEuler.set(0, sceneTime * 5 + i, sceneTime * 3);
          _partQuat.setFromEuler(_partEuler);
          _partScale.setScalar(twinkle * intensity);
          _partMat.compose(_partPos, _partQuat, _partScale);
          sparkleInstanced.setMatrixAt(i, _partMat);
        }
        sparkleInstanced.instanceMatrix.needsUpdate = true;
        break;
      }

      case 'sweatColdBreath': {
        sweatColdGroup.visible = true;

        // 1. Giant animated cartoon sweat drop sliding down forehead socket
        readSocketInRootSpace(
          refs.sockets.forehead,
          _localOrigin,
          _localFwd,
          _localRight,
          _localUp,
        );
        const dropCycle = 1.35;
        const dropPhase = (t % dropCycle) / dropCycle;
        const dropSlide = dropPhase * dropPhase * 0.28 * intensity;
        const dropScale =
          dropPhase < 0.18
            ? dropPhase / 0.18
            : dropPhase > 0.85
              ? Math.max(0.001, (1 - dropPhase) / 0.15)
              : 1;
        sweatDropGroup.position
          .copy(_localOrigin)
          .addScaledVector(_localUp, -dropSlide)
          .addScaledVector(_localRight, 0.04);
        sweatDropGroup.scale.setScalar(dropScale * (0.9 + 0.25 * intensity));

        // 2. Rhythmic cold-breath frost puffs billowing out of mouth socket
        readSocketInRootSpace(
          refs.sockets.mouth,
          _localOrigin,
          _localFwd,
          _localRight,
          _localUp,
        );
        const breathCycle = 1.35;
        for (let i = 0; i < BREATH_COUNT; i++) {
          const emitDelay = (i / BREATH_COUNT) * 0.55;
          const localAge = ((t % breathCycle) - emitDelay);
          if (localAge < 0 || localAge > 0.85) {
            breathInstanced.setMatrixAt(i, _zeroMat);
            continue;
          }
          const norm = localAge / 0.85;
          const pSeed = seed * 53 + i;
          const dist = (0.08 + norm * 1.15) * intensity;
          const lateral = (hash01(pSeed, 1) - 0.5) * 0.36 * norm * intensity;
          const rise = norm * 0.34 * intensity + (hash01(pSeed, 2) - 0.4) * 0.16 * norm;

          _partPos
            .copy(_localOrigin)
            .addScaledVector(_localFwd, dist)
            .addScaledVector(_localRight, lateral)
            .addScaledVector(_localUp, rise);
          const puffScale =
            Math.max(0.001, Math.sin(norm * Math.PI)) *
            (0.65 + norm * 1.4) *
            intensity;
          _partQuat.identity();
          _partScale.setScalar(puffScale);
          _partMat.compose(_partPos, _partQuat, _partScale);
          breathInstanced.setMatrixAt(i, _partMat);
        }
        breathInstanced.instanceMatrix.needsUpdate = true;
        break;
      }
    }
  };

  const dispose = () => {
    fxRoot.removeFromParent();
    for (const g of disposableGeos) g.dispose();
    for (const m of disposableMats) m.dispose();
  };

  return {
    applyAction,
    dispose,
  };
}
