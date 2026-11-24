import { resolveExpressionParams } from './faceExpressions';
import {
  EXPRESSION_PRESET_IDS,
  ExpressionParams,
  ExpressionPresetId,
  POSE_CATEGORIES,
  PoseCategory,
  PoseExpressionBundle,
  PosePreset,
  R6_BODY_PARTS,
  R6BodyPartId,
  Vec3Tuple,
} from './types';

const CUSTOM_POSES_STORAGE_KEY = 'stagecraft3d.customPoses.v1';

const Z: Vec3Tuple = [0, 0, 0];

export const BUILT_IN_POSES: PosePreset[] = [
  // --- IDLE ---
  {
    id: 'pose_relaxed_stand',
    name: 'Relaxed Stand',
    category: 'idle',
    builtIn: true,
    joints: {
      head: [0.04, 0.08, 0.03],
      torso: [0.02, -0.06, 0],
      leftArm: [0.08, 0, 0.1],
      rightArm: [-0.06, 0, -0.12],
      leftLeg: [-0.05, 0, 0.04],
      rightLeg: [0.06, 0, -0.04],
    },
    hipTilt: [0, 0.06, 0.03],
    expression: { preset: 'neutral' },
  },
  {
    id: 'pose_arms_crossed',
    name: 'Arms Crossed',
    category: 'idle',
    builtIn: true,
    joints: {
      head: [-0.04, -0.14, -0.04],
      torso: [-0.04, 0.14, 0],
      leftArm: [-0.92, -0.58, -0.45],
      rightArm: [-0.98, 0.58, 0.45],
      leftLeg: [-0.06, 0, 0.08],
      rightLeg: [0.08, 0, -0.08],
    },
    hipTilt: [0, -0.1, -0.04],
    expression: { preset: 'smug' },
  },
  {
    id: 'pose_hands_on_hips',
    name: 'Hero Confidence',
    category: 'idle',
    builtIn: true,
    joints: {
      head: [-0.08, 0.05, 0.04],
      torso: [-0.1, 0, 0],
      leftArm: [0.22, -0.25, 0.52],
      rightArm: [0.22, 0.25, -0.52],
      leftLeg: [-0.1, 0, 0.14],
      rightLeg: [-0.1, 0, -0.14],
    },
    hipTilt: [-0.05, 0, 0],
    expression: { preset: 'happy' },
  },
  {
    id: 'pose_thoughtful',
    name: 'Thoughtful Chin',
    category: 'idle',
    builtIn: true,
    joints: {
      head: [0.16, -0.18, 0.12],
      torso: [0.06, 0.1, 0.04],
      leftArm: [0.12, 0, 0.18],
      rightArm: [-1.42, 0.42, 0.36],
      leftLeg: [0.04, 0, 0.05],
      rightLeg: [-0.08, 0, -0.05],
    },
    hipTilt: [0.04, -0.06, -0.03],
    expression: { preset: 'focused', overrides: { mouthSkew: 0.35, browRaise: 0.25 } },
  },

  // --- ACTION ---
  {
    id: 'pose_sprint_leap',
    name: 'Dynamic Leap',
    category: 'action',
    builtIn: true,
    joints: {
      head: [-0.12, 0.08, -0.06],
      torso: [0.26, -0.18, 0.06],
      leftArm: [-1.45, 0, 0.28],
      rightArm: [0.95, 0, -0.22],
      leftLeg: [-0.88, 0, 0.08],
      rightLeg: [0.92, 0, -0.08],
    },
    hipTilt: [0.18, 0.12, -0.06],
    expression: { preset: 'excited' },
  },
  {
    id: 'pose_superhero_landing',
    name: 'Hero Landing',
    category: 'action',
    builtIn: true,
    joints: {
      head: [-0.34, 0.12, 0],
      torso: [0.58, -0.22, 0.06],
      leftArm: [0.75, 0, 0.55],
      rightArm: [-1.25, 0.18, -0.12],
      leftLeg: [-0.95, 0, 0.16],
      rightLeg: [0.72, 0, -0.14],
    },
    hipTilt: [0.24, 0.14, 0.05],
    expression: { preset: 'determined' },
  },
  {
    id: 'pose_victory_pump',
    name: 'Victory Pump',
    category: 'action',
    builtIn: true,
    joints: {
      head: [-0.18, -0.12, -0.08],
      torso: [-0.14, 0.18, -0.06],
      leftArm: [0.32, 0, 0.42],
      rightArm: [-2.68, -0.15, -0.35],
      leftLeg: [-0.18, 0, 0.15],
      rightLeg: [0.22, 0, -0.12],
    },
    hipTilt: [-0.08, -0.12, 0.06],
    expression: { preset: 'excited' },
  },
  {
    id: 'pose_dodge_lean',
    name: 'Matrix Dodge',
    category: 'action',
    builtIn: true,
    joints: {
      head: [0.28, -0.12, 0.1],
      torso: [-0.46, 0.18, -0.14],
      leftArm: [-0.75, 0, 0.82],
      rightArm: [-0.55, 0, -0.86],
      leftLeg: [-0.42, 0, 0.24],
      rightLeg: [0.35, 0, -0.22],
    },
    hipTilt: [-0.26, -0.1, 0.12],
    expression: { preset: 'surprised' },
  },

  // --- COMBAT ---
  {
    id: 'pose_knight_guard',
    name: 'Knight Guard',
    category: 'combat',
    builtIn: true,
    joints: {
      head: [0.06, 0.26, -0.04],
      torso: [0.12, -0.32, 0.04],
      leftArm: [-1.05, -0.52, -0.18],
      rightArm: [-0.82, 0.22, -0.38],
      leftLeg: [-0.36, 0, 0.14],
      rightLeg: [0.42, 0, -0.14],
    },
    hipTilt: [0.08, 0.22, -0.04],
    expression: { preset: 'determined' },
  },
  {
    id: 'pose_overhead_strike',
    name: 'Overhead Strike',
    category: 'combat',
    builtIn: true,
    joints: {
      head: [-0.12, 0.18, 0],
      torso: [-0.18, -0.36, 0.08],
      leftArm: [-0.88, -0.25, 0.45],
      rightArm: [-2.78, 0.12, -0.28],
      leftLeg: [-0.42, 0, 0.12],
      rightLeg: [0.54, 0, -0.12],
    },
    hipTilt: [-0.08, 0.24, -0.06],
    expression: { preset: 'angry' },
  },
  {
    id: 'pose_battle_ready',
    name: 'Dual Ready',
    category: 'combat',
    builtIn: true,
    joints: {
      head: [0.14, 0, 0],
      torso: [0.22, 0, 0],
      leftArm: [-1.18, -0.24, 0.34],
      rightArm: [-1.18, 0.24, -0.34],
      leftLeg: [-0.38, 0, 0.22],
      rightLeg: [0.34, 0, -0.22],
    },
    hipTilt: [0.12, 0, 0],
    expression: { preset: 'angry' },
  },

  // --- SOCIAL ---
  {
    id: 'pose_friendly_wave',
    name: 'Friendly Wave',
    category: 'social',
    builtIn: true,
    joints: {
      head: [-0.04, 0.1, 0.12],
      torso: [-0.04, -0.08, -0.06],
      leftArm: [0.14, 0, 0.16],
      rightArm: [-2.42, 0.15, -0.52],
      leftLeg: [-0.05, 0, 0.06],
      rightLeg: [0.08, 0, -0.06],
    },
    hipTilt: [0, 0.04, 0.04],
    expression: { preset: 'happy' },
  },
  {
    id: 'pose_dramatic_point',
    name: 'Dramatic Point',
    category: 'social',
    builtIn: true,
    joints: {
      head: [0.02, 0.24, -0.04],
      torso: [0.14, -0.28, 0],
      leftArm: [0.35, 0, 0.28],
      rightArm: [-1.58, -0.22, -0.12],
      leftLeg: [-0.26, 0, 0.1],
      rightLeg: [0.32, 0, -0.1],
    },
    hipTilt: [0.08, 0.18, 0],
    expression: { preset: 'determined' },
  },
  {
    id: 'pose_confused_shrug',
    name: 'Confused Shrug',
    category: 'social',
    builtIn: true,
    joints: {
      head: [0.08, -0.12, 0.2],
      torso: [-0.06, 0.06, 0.04],
      leftArm: [-0.68, -0.35, 0.88],
      rightArm: [-0.68, 0.35, -0.88],
      leftLeg: [0, 0, 0.08],
      rightLeg: [0, 0, -0.08],
    },
    hipTilt: [0, 0, -0.04],
    expression: { preset: 'surprised', overrides: { jawOpen: 0.12, mouthSkew: -0.4, browRaise: 0.55 } },
  },

  // --- CINEMATIC ---
  {
    id: 'pose_dramatic_bow',
    name: 'Dramatic Bow',
    category: 'cinematic',
    builtIn: true,
    joints: {
      head: [0.45, 0, 0],
      torso: [0.62, 0, 0],
      leftArm: [0.38, 0, 0.42],
      rightArm: [-0.72, 0.56, 0.38],
      leftLeg: [-0.14, 0, 0.06],
      rightLeg: [0.24, 0, -0.06],
    },
    hipTilt: [0.18, 0, 0],
    expression: { preset: 'happy' },
  },
  {
    id: 'pose_over_shoulder',
    name: 'Shoulder Glance',
    category: 'cinematic',
    builtIn: true,
    joints: {
      head: [-0.06, -0.82, 0.06],
      torso: [0.04, -0.34, 0],
      leftArm: [0.18, 0, 0.14],
      rightArm: [-0.22, 0, -0.18],
      leftLeg: [0.14, 0, 0.06],
      rightLeg: [-0.12, 0, -0.06],
    },
    hipTilt: [0, 0.22, 0.03],
    expression: { preset: 'wink' },
  },
];

function mirrorEuler(rot: Vec3Tuple): Vec3Tuple {
  // Mirror across the character's YZ sagittal plane: keep X pitch, negate Y yaw & Z roll
  return [
    Math.round(rot[0] * 1000) / 1000,
    Math.round(-rot[1] * 1000) / 1000,
    Math.round(-rot[2] * 1000) / 1000,
  ];
}

export function mirrorPoseJoints(
  joints: Record<R6BodyPartId, Vec3Tuple>,
): Record<R6BodyPartId, Vec3Tuple> {
  return {
    head: mirrorEuler(joints.head),
    torso: mirrorEuler(joints.torso),
    leftArm: mirrorEuler(joints.rightArm),
    rightArm: mirrorEuler(joints.leftArm),
    leftLeg: mirrorEuler(joints.rightLeg),
    rightLeg: mirrorEuler(joints.leftLeg),
  };
}

export function mirrorHipTilt(hipTilt: Vec3Tuple): Vec3Tuple {
  return mirrorEuler(hipTilt);
}

export function mirrorExpressionBundle(
  expr: PoseExpressionBundle,
): PoseExpressionBundle {
  const full = resolveExpressionParams(expr.preset, expr.overrides);
  const mirroredOverrides: Partial<ExpressionParams> = {
    ...(expr.overrides ?? {}),
    mouthSkew: Math.round(-full.mouthSkew * 1000) / 1000,
    gazeX: Math.round(-full.gazeX * 1000) / 1000,
    blinkL: full.blinkR,
    blinkR: full.blinkL,
  };
  return {
    preset: expr.preset,
    overrides: mirroredOverrides,
  };
}

export function mirrorPosePreset(pose: PosePreset): PosePreset {
  return {
    ...pose,
    joints: mirrorPoseJoints(pose.joints),
    hipTilt: mirrorHipTilt(pose.hipTilt),
    expression: pose.expression
      ? mirrorExpressionBundle(pose.expression)
      : undefined,
  };
}

function normalizeTuple(raw: unknown, fallback: Vec3Tuple = Z): Vec3Tuple {
  if (
    Array.isArray(raw) &&
    raw.length >= 3 &&
    typeof raw[0] === 'number' &&
    typeof raw[1] === 'number' &&
    typeof raw[2] === 'number' &&
    Number.isFinite(raw[0]) &&
    Number.isFinite(raw[1]) &&
    Number.isFinite(raw[2])
  ) {
    return [raw[0], raw[1], raw[2]];
  }
  return [...fallback];
}

function sanitizeCategory(raw: unknown): PoseCategory {
  if (typeof raw === 'string' && (POSE_CATEGORIES as string[]).includes(raw)) {
    return raw as PoseCategory;
  }
  return 'custom';
}

function sanitizeExpressionBundle(raw: unknown): PoseExpressionBundle | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.preset !== 'string' ||
    !(EXPRESSION_PRESET_IDS as string[]).includes(obj.preset)
  ) {
    return undefined;
  }
  let overrides: Partial<ExpressionParams> | undefined;
  if (obj.overrides && typeof obj.overrides === 'object') {
    const clean: Partial<ExpressionParams> = {};
    const validKeys: (keyof ExpressionParams)[] = [
      'smile',
      'browRaise',
      'browFurrow',
      'eyeWide',
      'blinkL',
      'blinkR',
      'jawOpen',
      'mouthWidth',
      'mouthSkew',
      'gazeX',
      'gazeY',
      'blush',
    ];
    for (const k of validKeys) {
      const val = (obj.overrides as Record<string, unknown>)[k];
      if (typeof val === 'number' && Number.isFinite(val)) {
        clean[k] = val;
      }
    }
    if (Object.keys(clean).length > 0) {
      overrides = clean;
    }
  }
  return {
    preset: obj.preset as ExpressionPresetId,
    overrides,
  };
}

function sanitizePoseEntry(raw: unknown, idx: number): PosePreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.joints || typeof obj.joints !== 'object') return null;
  const rawJoints = obj.joints as Record<string, unknown>;
  const joints = {} as Record<R6BodyPartId, Vec3Tuple>;
  for (const part of R6_BODY_PARTS) {
    joints[part] = normalizeTuple(rawJoints[part], Z);
  }
  const name =
    typeof obj.name === 'string' && obj.name.trim().length > 0
      ? obj.name.trim().slice(0, 48)
      : `Imported Pose ${idx + 1}`;
  const id =
    typeof obj.id === 'string' && obj.id.trim().length > 0
      ? obj.id.trim()
      : `custom_pose_${Date.now()}_${idx}`;

  return {
    id,
    name,
    category: sanitizeCategory(obj.category),
    builtIn: false,
    joints,
    hipTilt: normalizeTuple(obj.hipTilt, Z),
    expression: sanitizeExpressionBundle(obj.expression),
  };
}

export function loadCustomPoses(): PosePreset[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_POSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: PosePreset[] = [];
    parsed.forEach((item, idx) => {
      const clean = sanitizePoseEntry(item, idx);
      if (clean) result.push(clean);
    });
    return result;
  } catch {
    return [];
  }
}

export function saveCustomPoses(poses: PosePreset[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const onlyCustom = poses.filter((p) => !p.builtIn);
    window.localStorage.setItem(
      CUSTOM_POSES_STORAGE_KEY,
      JSON.stringify(onlyCustom),
    );
  } catch {
    // Ignore quota errors cleanly
  }
}

export function serializePoseLibrary(poses: PosePreset[]): string {
  return JSON.stringify(
    {
      format: 'stagecraft-pose-library',
      version: 1,
      poses: poses.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        joints: p.joints,
        hipTilt: p.hipTilt,
        ...(p.expression ? { expression: p.expression } : {}),
      })),
    },
    null,
    2,
  );
}

export function parsePoseLibraryJson(raw: string): PosePreset[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file. Please choose a valid pose pack.');
  }

  let list: unknown[];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as Record<string, unknown>).poses)
  ) {
    list = (parsed as Record<string, unknown>).poses as unknown[];
  } else {
    throw new Error('Pose pack JSON is missing a valid "poses" array.');
  }

  const poses: PosePreset[] = [];
  list.forEach((entry, idx) => {
    const clean = sanitizePoseEntry(entry, idx);
    if (clean) {
      poses.push({
        ...clean,
        id: clean.id.startsWith('pose_')
          ? `custom_${clean.id}_${Date.now()}_${idx}`
          : clean.id,
        builtIn: false,
      });
    }
  });

  if (poses.length === 0) {
    throw new Error('No valid R6 pose definitions were found in this file.');
  }
  return poses;
}
