import { evaluateActorFaceAt } from './faceExpressions';
import {
  cloneCharacterHeldItems,
  cloneHandItemState,
  createEmptyCharacterHeldItems,
  createEmptyHandState,
  isValidItemId,
  isValidPropKind,
} from './itemCatalog';
import {
  getActiveMapLabel,
  getBuiltInMapByEnv,
  isBuiltInMapId,
  sanitizeMapDefinition,
} from './mapLibrary';
import {
  BELT_STYLE_OPTIONS,
  CLOTHING_PATTERN_OPTIONS,
  FABRIC_MATERIAL_OPTIONS,
  FOOTWEAR_CATALOG,
  HAIR_ACCESSORY_CATALOG,
  HAIR_BANGS_CATALOG,
  HAIR_FINISH_OPTIONS,
  HAIR_HIGHLIGHT_PATTERNS,
  HAIR_STYLE_CATALOG,
  normalizeAccessoryFit,
  normalizeOrnaments,
  ORNAMENT_CATALOG,
  OUTERWEAR_CATALOG,
  PANT_CATALOG,
  SHIRT_CATALOG,
  SLEEVE_MODE_OPTIONS,
} from './robloxCatalog';
import {
  evaluateCharacterStateAt,
  isValidCharacterStateId,
  sanitizeCharacterStateLimb,
} from './characterStates';
import {
  evaluateCharacterActionAt,
  isValidCharacterActionId,
  sanitizeCharacterActionSource,
  sanitizeCharacterModelBuildId,
} from './characterActions';
import {
  resolveCaptionSettings,
  resolveNarratorSettings,
} from './captionEngine';
import {
  ActorKeyframe,
  AnimationProject,
  CHAPTER_COLORS,
  CINEMATIC_PRESET_IDS,
  CameraKeyframe,
  CinematicPresetId,
  ChapterMarker,
  CharacterActionKeyframe,
  CharacterHeldItems,
  CharacterStateKeyframe,
  EasingType,
  EnvironmentId,
  EvaluatedActorState,
  EvaluatedCameraState,
  EvaluatedFrame,
  EvaluatedHandItemState,
  EvaluatedHeldItems,
  EvaluatedLightingState,
  EvaluatedPose,
  EvaluatedStageState,
  FaceKeyframe,
  HeldHandItemState,
  HeldItemKeyframe,
  LightingKeyframe,
  MAX_SCENE_DURATION,
  MIN_SCENE_DURATION,
  MapKeyframe,
  NormalizedR6Ornaments,
  ORNAMENT_SLOTS,
  PoseClipId,
  R6_BODY_PARTS,
  R6BodyPartId,
  SceneActorConfig,
  ScreenEffectKeyframe,
  SecondaryMotionState,
  SfxCue,
  StageLightConfig,
  SubtitleCue,
  UpperBodyClipId,
  Vec3Tuple,
} from './types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function applyEasing(t: number, easing: EasingType): number {
  const u = clamp(t, 0, 1);
  if (u === 0) return 0;
  if (u === 1) return 1;
  switch (easing) {
    case 'step':
      return 0;
    case 'linear':
      return u;
    case 'easeOutCubic':
      return 1 - Math.pow(1 - u, 3);
    case 'easeInBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * u * u * u - c1 * u * u;
    }
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
    case 'spring': {
      // Damped harmonic spring with crisp natural bounce, normalized at u=1
      const decay = Math.exp(-5.8 * u);
      const raw = 1 - decay * Math.cos(u * Math.PI * 2.5);
      const endVal = 1 - Math.exp(-5.8) * Math.cos(Math.PI * 2.5);
      return raw / endVal;
    }
    case 'easeInOut':
    default:
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }
}

export function lerp(a: number, b: number, t: number): number {
  if (t === 0) return a;
  if (t === 1) return b;
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function catmullRomScalar(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  if (t <= 0) return p1;
  if (t >= 1) return p2;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function catmullRomVec3(
  p0: Vec3Tuple,
  p1: Vec3Tuple,
  p2: Vec3Tuple,
  p3: Vec3Tuple,
  t: number,
): Vec3Tuple {
  return [
    catmullRomScalar(p0[0], p1[0], p2[0], p3[0], t),
    catmullRomScalar(p0[1], p1[1], p2[1], p3[1], t),
    catmullRomScalar(p0[2], p1[2], p2[2], p3[2], t),
  ];
}

export function lerpAngleRad(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function lerpEulerVec3(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return [
    lerpAngleRad(a[0], b[0], t),
    lerpAngleRad(a[1], b[1], t),
    lerpAngleRad(a[2], b[2], t),
  ];
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function computeCameraShakeOffset(
  time: number,
  intensity: number,
  frequency: number,
): { offset: Vec3Tuple; rollJitterRad: number } {
  if (intensity <= 0.001) {
    return { offset: [0, 0, 0], rollJitterRad: 0 };
  }
  const f = Math.max(1, frequency);
  const ampPos = intensity * 0.14;
  const x =
    (Math.sin(time * f * 1.73) * 0.6 + Math.cos(time * f * 3.11 + 0.8) * 0.4) *
    ampPos;
  const y =
    (Math.cos(time * f * 2.19 + 0.4) * 0.65 +
      Math.sin(time * f * 4.07 + 1.9) * 0.35) *
    ampPos;
  const z = Math.sin(time * f * 1.41 + 2.3) * ampPos * 0.45;
  const rollJitterRad =
    Math.sin(time * f * 2.71 + 1.3) * intensity * 0.032;
  return { offset: [x, y, z], rollJitterRad };
}

export function createZeroR6Joints(): Record<R6BodyPartId, Vec3Tuple> {
  return {
    head: [0, 0, 0],
    torso: [0, 0, 0],
    leftArm: [0, 0, 0],
    rightArm: [0, 0, 0],
    leftLeg: [0, 0, 0],
    rightLeg: [0, 0, 0],
  };
}

export function evaluateProceduralClipPose(
  clip: PoseClipId,
  time: number,
  speed = 1,
  customJoints?: Partial<Record<R6BodyPartId, Vec3Tuple>>,
  hipTiltOverride?: Vec3Tuple,
): EvaluatedPose {
  const joints = createZeroR6Joints();
  const phase = time * Math.max(0.1, speed);
  let torsoOffsetY = 0;
  let hipOffsetX = 0;
  let hipOffsetZ = 0;
  let hipTilt: Vec3Tuple = [0, 0, 0];
  let squashY = 1;

  switch (clip) {
    case 'idle': {
      const breath = Math.sin(phase * 2.2);
      const look = Math.sin(phase * 0.85);
      const weightShift = Math.sin(phase * 1.1);
      torsoOffsetY = breath * 0.018;
      hipOffsetX = weightShift * 0.025;
      hipTilt = [0.01, weightShift * 0.03, weightShift * 0.025];
      squashY = 1 + breath * 0.008;
      joints.torso = [0.02 + breath * 0.015, look * 0.04, -weightShift * 0.015];
      joints.head = [-0.02 + breath * 0.02, look * 0.1, 0];
      joints.leftArm = [0.04 + breath * 0.03, 0, 0.08 + breath * 0.015];
      joints.rightArm = [-0.04 - breath * 0.03, 0, -0.08 - breath * 0.015];
      joints.leftLeg = [0, 0, 0.02];
      joints.rightLeg = [0, 0, -0.02];
      break;
    }
    case 'walk': {
      const w = phase * 5.6;
      const swing = Math.sin(w);
      const lift = Math.abs(Math.sin(w));
      torsoOffsetY = lift * 0.065 - 0.015;
      hipOffsetX = Math.cos(w) * 0.04;
      hipTilt = [0.04, swing * 0.08, Math.cos(w) * 0.045];
      squashY = 1 + (lift - 0.5) * 0.03;
      joints.torso = [0.05, -swing * 0.09, Math.cos(w) * 0.025];
      joints.head = [-0.05, swing * 0.04, -Math.cos(w) * 0.02];
      joints.leftLeg = [swing * 0.78, 0, 0.02];
      joints.rightLeg = [-swing * 0.78, 0, -0.02];
      joints.leftArm = [-swing * 0.68, 0, 0.07];
      joints.rightArm = [swing * 0.68, 0, -0.07];
      break;
    }
    case 'run': {
      const w = phase * 9.2;
      const swing = Math.sin(w);
      const lift = Math.abs(Math.sin(w));
      torsoOffsetY = lift * 0.12 - 0.03;
      hipOffsetX = Math.cos(w) * 0.05;
      hipTilt = [0.16, swing * 0.12, Math.cos(w) * 0.065];
      squashY = 1 + (lift - 0.5) * 0.055;
      joints.torso = [0.16, -swing * 0.14, Math.cos(w) * 0.04];
      joints.head = [-0.22, swing * 0.06, -Math.cos(w) * 0.03];
      joints.leftLeg = [swing * 1.12, 0, 0.03];
      joints.rightLeg = [-swing * 1.12, 0, -0.03];
      joints.leftArm = [-swing * 1.04, 0, 0.12];
      joints.rightArm = [swing * 1.04, 0, -0.12];
      break;
    }
    case 'jump': {
      // Anticipation crouch -> airborne apex -> squash landing cycle
      const cycle = (phase * 1.35) % 1;
      if (cycle < 0.2) {
        const u = cycle / 0.2;
        const crouch = Math.sin(u * Math.PI);
        torsoOffsetY = -crouch * 0.28;
        squashY = 1 - crouch * 0.12;
        hipTilt = [crouch * 0.22, 0, 0];
        joints.torso = [crouch * 0.16, 0, 0];
        joints.head = [-crouch * 0.24, 0, 0];
        joints.leftArm = [crouch * 0.75, 0, 0.15];
        joints.rightArm = [crouch * 0.75, 0, -0.15];
        joints.leftLeg = [-crouch * 0.48, 0, 0.08];
        joints.rightLeg = [-crouch * 0.48, 0, -0.08];
      } else if (cycle < 0.8) {
        const u = (cycle - 0.2) / 0.6;
        const arc = Math.sin(u * Math.PI);
        torsoOffsetY = arc * 0.92;
        squashY = 1 + (1 - Math.abs(u - 0.5) * 2) * 0.08;
        hipTilt = [-0.08 + u * 0.16, 0, 0];
        joints.torso = [-0.06 * arc, 0, 0];
        joints.head = [0.08 * arc, 0, 0];
        joints.leftArm = [-2.2 * arc - 0.2, 0, 0.35];
        joints.rightArm = [-2.2 * arc - 0.2, 0, -0.35];
        joints.leftLeg = [-0.55 * arc, 0, 0.1];
        joints.rightLeg = [0.45 * arc, 0, -0.1];
      } else {
        const u = (cycle - 0.8) / 0.2;
        const land = Math.sin(u * Math.PI);
        torsoOffsetY = -land * 0.22;
        squashY = 1 - land * 0.1;
        hipTilt = [land * 0.18, 0, 0];
        joints.leftArm = [0.4 * land, 0, 0.25];
        joints.rightArm = [0.4 * land, 0, -0.25];
        joints.leftLeg = [-0.35 * land, 0, 0.08];
        joints.rightLeg = [-0.35 * land, 0, -0.08];
      }
      break;
    }
    case 'crouch': {
      const breath = Math.sin(phase * 2.4);
      torsoOffsetY = -0.34 + breath * 0.014;
      hipOffsetZ = -0.08;
      hipTilt = [0.24, 0, 0];
      squashY = 0.94 + breath * 0.01;
      joints.torso = [0.18, Math.sin(phase * 1.1) * 0.05, 0];
      joints.head = [-0.36, Math.sin(phase * 0.9) * 0.14, 0];
      joints.leftArm = [-0.42, 0, 0.22];
      joints.rightArm = [-0.42, 0, -0.22];
      joints.leftLeg = [-0.72, 0.12, 0.12];
      joints.rightLeg = [-0.72, -0.12, -0.12];
      break;
    }
    case 'wave': {
      const osc = Math.sin(phase * 6.8);
      const breath = Math.sin(phase * 2.0);
      torsoOffsetY = breath * 0.015;
      hipTilt = [0, 0.06, -0.04 + osc * 0.02];
      joints.torso = [0, 0.1, -0.04];
      joints.head = [-0.06, -0.08, 0.07 + osc * 0.03];
      joints.leftArm = [0.06, 0, 0.14];
      joints.rightArm = [-0.25, 0.12, -2.58 + osc * 0.32];
      joints.leftLeg = [-0.02, 0, 0.04];
      joints.rightLeg = [0.02, 0, -0.04];
      break;
    }
    case 'hero': {
      const pulse = Math.sin(phase * 1.8) * 0.025;
      torsoOffsetY = -0.02 + pulse * 0.5;
      hipTilt = [-0.05, -0.12, 0.04];
      joints.torso = [-0.06 + pulse, -0.18, -0.02];
      joints.head = [0.04, 0.22, 0];
      joints.leftArm = [0.22, 0.1, 0.38];
      joints.rightArm = [-0.72, -0.14, -0.45];
      joints.leftLeg = [-0.24, 0.08, 0.14];
      joints.rightLeg = [0.26, -0.08, -0.14];
      break;
    }
    case 'sit': {
      const breath = Math.sin(phase * 2.0);
      torsoOffsetY = -0.52 + breath * 0.01;
      hipTilt = [-0.08, 0, 0];
      joints.torso = [-0.04, 0, 0];
      joints.head = [0.08, Math.sin(phase * 0.8) * 0.08, 0];
      joints.leftLeg = [-1.45, 0.08, 0.06];
      joints.rightLeg = [-1.45, -0.08, -0.06];
      joints.leftArm = [-0.45, 0, 0.14];
      joints.rightArm = [-0.45, 0, -0.14];
      break;
    }
    case 'swordSwing': {
      const cycle = (phase * 2.2) % (Math.PI * 2);
      const slash = Math.sin(cycle);
      const follow = Math.cos(cycle);
      torsoOffsetY = Math.abs(follow) * 0.05 - 0.04;
      hipTilt = [0.1, slash * 0.22, -slash * 0.06];
      squashY = 1 - Math.max(0, slash) * 0.04;
      joints.torso = [0.1, slash * 0.48, 0];
      joints.head = [-0.14, -slash * 0.42, 0];
      joints.rightArm = [-1.45 + slash * 1.28, 0.22, -0.35 - slash * 0.3];
      joints.leftArm = [0.42 - slash * 0.26, 0, 0.38];
      joints.leftLeg = [-0.32, 0, 0.1];
      joints.rightLeg = [0.34, 0, -0.1];
      break;
    }
    case 'cheer': {
      const bounce = Math.abs(Math.sin(phase * 6.0));
      const pump = Math.sin(phase * 6.0);
      torsoOffsetY = bounce * 0.14;
      squashY = 1 + (bounce - 0.4) * 0.06;
      hipTilt = [-0.05, pump * 0.06, pump * 0.05];
      joints.torso = [-0.06, 0, pump * 0.04];
      joints.head = [-0.1, 0, -pump * 0.06];
      joints.leftArm = [-2.55 + pump * 0.28, 0, 0.32 + bounce * 0.12];
      joints.rightArm = [-2.55 - pump * 0.28, 0, -0.32 - bounce * 0.12];
      joints.leftLeg = [-bounce * 0.18, 0, 0.08];
      joints.rightLeg = [bounce * 0.12, 0, -0.08];
      break;
    }
    case 'talkGesture': {
      const g1 = Math.sin(phase * 4.2);
      const g2 = Math.cos(phase * 3.1);
      torsoOffsetY = Math.sin(phase * 2.1) * 0.018;
      hipTilt = [0.02, g2 * 0.05, g1 * 0.025];
      joints.torso = [0.03, g2 * 0.07, 0];
      joints.head = [-0.04 + g1 * 0.05, g2 * 0.1, g1 * 0.04];
      joints.leftArm = [-0.72 + g1 * 0.34, -0.25, 0.26 + g2 * 0.12];
      joints.rightArm = [-0.88 - g2 * 0.38, 0.22, -0.28 - g1 * 0.12];
      joints.leftLeg = [0, 0, 0.03];
      joints.rightLeg = [0, 0, -0.03];
      break;
    }
    case 'point': {
      const breath = Math.sin(phase * 2.2);
      torsoOffsetY = breath * 0.015;
      hipTilt = [0.03, -0.14, 0];
      joints.torso = [0.05, -0.16, 0];
      joints.head = [-0.04, 0.24, 0];
      joints.rightArm = [-1.52 + breath * 0.06, -0.08, -0.14];
      joints.leftArm = [0.24, 0, 0.22];
      joints.leftLeg = [-0.18, 0, 0.06];
      joints.rightLeg = [0.18, 0, -0.06];
      break;
    }
    case 'block': {
      const pulse = Math.sin(phase * 2.6);
      torsoOffsetY = -0.1 + pulse * 0.012;
      hipTilt = [0.1, 0.24, -0.05];
      joints.torso = [0.08, 0.2, 0];
      joints.head = [-0.12, -0.34, 0.04];
      joints.rightArm = [-1.25, 0.65, -0.45];
      joints.leftArm = [-0.95, -0.38, 0.35];
      joints.leftLeg = [-0.34, 0.12, 0.14];
      joints.rightLeg = [0.34, -0.12, -0.14];
      break;
    }
    case 'victory': {
      const sway = Math.sin(phase * 2.4);
      torsoOffsetY = Math.abs(sway) * 0.04;
      hipTilt = [-0.08, sway * 0.08, sway * 0.04];
      joints.torso = [-0.08, sway * 0.08, 0];
      joints.head = [-0.12, -sway * 0.06, sway * 0.05];
      joints.leftArm = [-2.68, 0.15, 0.48];
      joints.rightArm = [-2.68, -0.15, -0.48];
      joints.leftLeg = [-0.12, 0.08, 0.14];
      joints.rightLeg = [0.14, -0.08, -0.14];
      break;
    }
    case 'custom':
    default:
      break;
  }

  if (hipTiltOverride) {
    hipTilt = [
      hipTilt[0] + hipTiltOverride[0],
      hipTilt[1] + hipTiltOverride[1],
      hipTilt[2] + hipTiltOverride[2],
    ];
  }

  if (customJoints) {
    for (const part of R6_BODY_PARTS) {
      const override = customJoints[part];
      if (override) {
        if (clip === 'custom') {
          joints[part] = [override[0], override[1], override[2]];
        } else {
          joints[part] = [
            joints[part][0] + override[0],
            joints[part][1] + override[1],
            joints[part][2] + override[2],
          ];
        }
      }
    }
  }

  return {
    joints,
    torsoOffsetY,
    hipOffset: [hipOffsetX, torsoOffsetY, hipOffsetZ],
    hipTilt,
    squashY,
  };
}

/**
 * Layers an independent upper-body action (wave, swordSwing, talkGesture, point, cheer, block)
 * onto a lower-body/base locomotion pose with configurable weight (0..1).
 */
export function applyUpperBodyLayer(
  basePose: EvaluatedPose,
  upperClip: UpperBodyClipId | undefined,
  time: number,
  speed: number,
  weight = 0.85,
): EvaluatedPose {
  if (!upperClip || upperClip === 'none' || weight <= 0.001) {
    return basePose;
  }
  const w = clamp(weight, 0, 1);
  const upper = evaluateProceduralClipPose(upperClip, time, speed);
  const joints: Record<R6BodyPartId, Vec3Tuple> = {
    head: lerpEulerVec3(basePose.joints.head, upper.joints.head, w * 0.7),
    torso: lerpEulerVec3(basePose.joints.torso, upper.joints.torso, w * 0.55),
    leftArm: lerpEulerVec3(basePose.joints.leftArm, upper.joints.leftArm, w),
    rightArm: lerpEulerVec3(basePose.joints.rightArm, upper.joints.rightArm, w),
    leftLeg: [...basePose.joints.leftLeg],
    rightLeg: [...basePose.joints.rightLeg],
  };
  return {
    joints,
    torsoOffsetY: basePose.torsoOffsetY,
    hipOffset: [...basePose.hipOffset],
    hipTilt: [...basePose.hipTilt],
    squashY: basePose.squashY,
  };
}

function blendPoses(a: EvaluatedPose, b: EvaluatedPose, t: number): EvaluatedPose {
  const ct = clamp(t, 0, 1);
  const joints = createZeroR6Joints();
  for (const part of R6_BODY_PARTS) {
    joints[part] = lerpEulerVec3(a.joints[part], b.joints[part], ct);
  }
  return {
    joints,
    torsoOffsetY: lerp(a.torsoOffsetY, b.torsoOffsetY, ct),
    hipOffset: lerpVec3(a.hipOffset, b.hipOffset, ct),
    hipTilt: lerpEulerVec3(a.hipTilt, b.hipTilt, ct),
    squashY: lerp(a.squashY, b.squashY, ct),
  };
}

function sortByTime<T extends { time: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.time - b.time);
}

function sampleActorTransformOnly(
  sorted: ActorKeyframe[],
  time: number,
): { position: Vec3Tuple; rotation: Vec3Tuple; scale: Vec3Tuple } {
  if (sorted.length === 0) {
    return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
  }
  if (time <= sorted[0].time) {
    return {
      position: [...sorted[0].position],
      rotation: [...sorted[0].rotation],
      scale: [...sorted[0].scale],
    };
  }
  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    return {
      position: [...last.position],
      rotation: [...last.rotation],
      scale: [...last.scale],
    };
  }
  let prev = sorted[0];
  let next = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, next.time - prev.time);
  const easedT = applyEasing((time - prev.time) / span, prev.easing);
  return {
    position: lerpVec3(prev.position, next.position, easedT),
    rotation: lerpEulerVec3(prev.rotation, next.rotation, easedT),
    scale: lerpVec3(prev.scale, next.scale, easedT),
  };
}

function evaluateSecondaryMotion(
  actor: SceneActorConfig,
  sorted: ActorKeyframe[],
  time: number,
  clip: PoseClipId,
  upperClip: UpperBodyClipId,
): SecondaryMotionState {
  if (actor.secondaryMotion === false) {
    return {
      capePitch: 0,
      capeRoll: 0,
      wingSpread: 0,
      hatLagX: 0,
      hatLagZ: 0,
      hairPitch: 0,
      hairRoll: 0,
      propSwing: 0,
    };
  }

  const dt = 0.08;
  const nowT = sampleActorTransformOnly(sorted, time);
  const prevT = sampleActorTransformOnly(sorted, Math.max(0, time - dt));

  const vx = (nowT.position[0] - prevT.position[0]) / dt;
  const vy = (nowT.position[1] - prevT.position[1]) / dt;
  const vz = (nowT.position[2] - prevT.position[2]) / dt;
  const speed = Math.hypot(vx, vz);

  let yawDiff = nowT.rotation[1] - prevT.rotation[1];
  if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  const angularVelY = yawDiff / dt;

  // Ambient breeze + movement trail
  const breeze = Math.sin(time * 2.4 + actor.id.length * 0.7) * 0.045;
  const runBoost = clip === 'run' ? 0.24 : clip === 'walk' ? 0.1 : clip === 'jump' ? 0.22 : 0;
  const capePitch = clamp(speed * 0.14 + runBoost + Math.max(0, -vy) * 0.12 + breeze, -0.05, 0.72);
  const capeRoll = clamp(-angularVelY * 0.08 + Math.cos(time * 1.9) * 0.03, -0.35, 0.35);

  const wingFlap =
    clip === 'jump' || clip === 'cheer'
      ? Math.sin(time * 8.5) * 0.25 + 0.18
      : Math.sin(time * 2.2) * 0.06 + speed * 0.05;

  const hatLagX = clamp(-speed * 0.04 - Math.max(0, vy) * 0.05, -0.18, 0.18);
  const hatLagZ = clamp(angularVelY * 0.035, -0.16, 0.16);

  const hairPitch = clamp(
    speed * 0.09 + (clip === 'run' ? 0.16 : clip === 'jump' ? 0.2 : 0) + Math.max(0, -vy) * 0.09 + breeze * 0.7,
    -0.14,
    0.45,
  );
  const hairRoll = clamp(-angularVelY * 0.06 + Math.sin(time * 2.1) * 0.025, -0.25, 0.25);

  const isSwinging = clip === 'swordSwing' || upperClip === 'swordSwing';
  const propSwing = isSwinging ? Math.cos(time * 2.2) * 0.14 : Math.sin(time * 3.1) * 0.025;

  return {
    capePitch,
    capeRoll,
    wingSpread: clamp(wingFlap, -0.25, 0.55),
    hatLagX,
    hatLagZ,
    hairPitch,
    hairRoll,
    propSwing,
  };
}

export function evaluateActorItemsAt(
  actor: SceneActorConfig,
  time: number,
): EvaluatedHeldItems {
  const baseline = actor.heldItems ?? createEmptyCharacterHeldItems();
  const kfs = actor.heldItemKeyframes;

  if (!kfs || kfs.length === 0) {
    return {
      right: { ...cloneHandItemState(baseline.right), visibilityScale: 1 },
      left: { ...cloneHandItemState(baseline.left), visibilityScale: 1 },
    };
  }

  const sorted = sortByTime(kfs);
  let activeIdx = 0;
  if (time > sorted[0].time) {
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].time <= time + 0.0001) {
        activeIdx = i;
      } else {
        break;
      }
    }
  }

  const activeKf = sorted[activeIdx];
  const prevKf = activeIdx > 0 ? sorted[activeIdx - 1] : null;
  const elapsedSinceKey = Math.max(0, time - activeKf.time);
  const popWindow = 0.22;

  const evalHand = (
    hand: 'right' | 'left',
    cur: HeldHandItemState,
    prev: HeldHandItemState | null,
  ): EvaluatedHandItemState => {
    const cloned = cloneHandItemState(cur);
    let visibilityScale = 1;
    if (
      activeKf.easing === 'equipPop' &&
      cur.itemId !== 'none' &&
      elapsedSinceKey < popWindow &&
      (!prev || prev.itemId !== cur.itemId)
    ) {
      const u = clamp(elapsedSinceKey / popWindow, 0, 1);
      visibilityScale = 0.2 + 0.8 * applyEasing(u, 'easeOutBack');
    }
    return {
      ...cloned,
      visibilityScale: clamp(visibilityScale, 0.05, 1.35),
    };
  };

  return {
    right: evalHand('right', activeKf.right, prevKf?.right ?? null),
    left: evalHand('left', activeKf.left, prevKf?.left ?? null),
  };
}

export function evaluateActorAt(
  actor: SceneActorConfig,
  time: number,
  subtitles: SubtitleCue[] = [],
): EvaluatedActorState {
  const sorted = sortByTime(actor.keyframes);
  const face = evaluateActorFaceAt(actor, time, subtitles, applyEasing);
  const heldItems =
    actor.kind === 'character' ? evaluateActorItemsAt(actor, time) : undefined;
  const characterState =
    actor.kind === 'character'
      ? evaluateCharacterStateAt(actor.stateKeyframes, time)
      : undefined;
  const characterAction =
    actor.kind === 'character'
      ? evaluateCharacterActionAt(actor.actionKeyframes, time)
      : undefined;

  if (sorted.length === 0) {
    return {
      actorId: actor.id,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      clip: 'idle',
      upperBodyClip: 'none',
      upperBodyWeight: 0,
      pose: evaluateProceduralClipPose('idle', time, 1),
      face,
      heldItems,
      characterState,
      characterAction,
      secondaryMotion: evaluateSecondaryMotion(actor, sorted, time, 'idle', 'none'),
    };
  }

  const evalKeyframePose = (kf: ActorKeyframe): EvaluatedPose => {
    const base = evaluateProceduralClipPose(
      kf.clip,
      time,
      kf.clipSpeed,
      kf.customJoints,
      kf.hipTilt,
    );
    return applyUpperBodyLayer(
      base,
      kf.upperBodyClip,
      time,
      kf.clipSpeed,
      kf.upperBodyWeight ?? 0.85,
    );
  };

  if (time <= sorted[0].time) {
    const first = sorted[0];
    const upper = first.upperBodyClip ?? 'none';
    return {
      actorId: actor.id,
      position: [...first.position],
      rotation: [...first.rotation],
      scale: [...first.scale],
      clip: first.clip,
      upperBodyClip: upper,
      upperBodyWeight: first.upperBodyWeight ?? (upper !== 'none' ? 0.85 : 0),
      pose: evalKeyframePose(first),
      face,
      heldItems,
      characterState,
      characterAction,
      secondaryMotion: evaluateSecondaryMotion(actor, sorted, time, first.clip, upper),
    };
  }

  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    const upper = last.upperBodyClip ?? 'none';
    return {
      actorId: actor.id,
      position: [...last.position],
      rotation: [...last.rotation],
      scale: [...last.scale],
      clip: last.clip,
      upperBodyClip: upper,
      upperBodyWeight: last.upperBodyWeight ?? (upper !== 'none' ? 0.85 : 0),
      pose: evalKeyframePose(last),
      face,
      heldItems,
      characterState,
      characterAction,
      secondaryMotion: evaluateSecondaryMotion(actor, sorted, time, last.clip, upper),
    };
  }

  let prev = sorted[0];
  let next = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, next.time - prev.time);
  const rawT = (time - prev.time) / span;
  const easedT = applyEasing(rawT, prev.easing);

  const poseA = evalKeyframePose(prev);
  const poseB = evalKeyframePose(next);

  const blendWindow = clamp(prev.blendDuration ?? 0.65, 0.05, 1);
  const blendStart = (1 - blendWindow) * 0.5;
  const poseBlendRaw =
    prev.easing === 'step'
      ? easedT
      : clamp((rawT - blendStart) / Math.max(0.05, blendWindow), 0, 1);

  const sameAnim =
    prev.clip === next.clip &&
    (prev.upperBodyClip ?? 'none') === (next.upperBodyClip ?? 'none') &&
    !prev.customJoints &&
    !next.customJoints &&
    !prev.hipTilt &&
    !next.hipTilt;

  const pose = sameAnim
    ? poseA
    : blendPoses(poseA, poseB, applyEasing(poseBlendRaw, prev.easing === 'step' ? 'step' : 'easeInOut'));

  const activeClip = rawT < 0.5 ? prev.clip : next.clip;
  const activeUpper =
    (rawT < 0.5 ? prev.upperBodyClip : next.upperBodyClip) ?? 'none';
  const activeUpperW = lerp(
    prev.upperBodyWeight ?? (prev.upperBodyClip && prev.upperBodyClip !== 'none' ? 0.85 : 0),
    next.upperBodyWeight ?? (next.upperBodyClip && next.upperBodyClip !== 'none' ? 0.85 : 0),
    clamp(easedT, 0, 1),
  );

  return {
    actorId: actor.id,
    position: lerpVec3(prev.position, next.position, easedT),
    rotation: lerpEulerVec3(prev.rotation, next.rotation, easedT),
    scale: lerpVec3(prev.scale, next.scale, easedT),
    clip: activeClip,
    upperBodyClip: activeUpper,
    upperBodyWeight: clamp(activeUpperW, 0, 1),
    pose,
    face,
    heldItems,
    characterState,
    characterAction,
    secondaryMotion: evaluateSecondaryMotion(actor, sorted, time, activeClip, activeUpper),
  };
}

function resolveCameraShotTarget(
  kf: CameraKeyframe,
  actorsMap?: Record<string, EvaluatedActorState>,
): Vec3Tuple {
  if (kf.trackActorId && actorsMap && actorsMap[kf.trackActorId]) {
    const actorPos = actorsMap[kf.trackActorId].position;
    const offset = kf.trackOffset ?? [0, 1.35, 0];
    return [
      actorPos[0] + offset[0],
      actorPos[1] + offset[1],
      actorPos[2] + offset[2],
    ];
  }
  return [...kf.target];
}

export function evaluateCameraAt(
  cameraTrack: CameraKeyframe[],
  time: number,
  actorsMap?: Record<string, EvaluatedActorState>,
): EvaluatedCameraState {
  const sorted = sortByTime(cameraTrack);
  if (sorted.length === 0) {
    return {
      position: [6.4, 3.8, 8.2],
      target: [0, 1.3, 0],
      fov: 52,
      rollRad: 0,
      shakeOffset: [0, 0, 0],
    };
  }

  if (time <= sorted[0].time) {
    const first = sorted[0];
    const shake = computeCameraShakeOffset(
      time,
      first.shakeIntensity ?? 0,
      first.shakeFrequency ?? 8,
    );
    return {
      position: [...first.position],
      target: resolveCameraShotTarget(first, actorsMap),
      fov: first.fov,
      rollRad: degToRad(first.rollDeg ?? 0) + shake.rollJitterRad,
      shakeOffset: shake.offset,
      povActorId: first.povActorId ?? null,
    };
  }

  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    const shake = computeCameraShakeOffset(
      time,
      last.shakeIntensity ?? 0,
      last.shakeFrequency ?? 8,
    );
    return {
      position: [...last.position],
      target: resolveCameraShotTarget(last, actorsMap),
      fov: last.fov,
      rollRad: degToRad(last.rollDeg ?? 0) + shake.rollJitterRad,
      shakeOffset: shake.offset,
      povActorId: last.povActorId ?? null,
    };
  }

  let idx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      idx = i;
      break;
    }
  }
  const prev = sorted[idx];
  const next = sorted[idx + 1];

  const span = Math.max(0.0001, next.time - prev.time);
  const rawT = (time - prev.time) / span;
  const easedT = applyEasing(rawT, prev.easing);

  const prevTarget = resolveCameraShotTarget(prev, actorsMap);
  const nextTarget = resolveCameraShotTarget(next, actorsMap);

  const useSpline =
    prev.easing !== 'step' &&
    prev.pathMode !== 'linear' &&
    sorted.length >= 2;

  let position: Vec3Tuple;
  let target: Vec3Tuple;

  if (useSpline) {
    const p0Kf =
      idx > 0 && sorted[idx - 1].easing !== 'step' ? sorted[idx - 1] : prev;
    const p3Kf =
      idx + 2 < sorted.length && next.easing !== 'step'
        ? sorted[idx + 2]
        : next;
    position = catmullRomVec3(
      p0Kf.position,
      prev.position,
      next.position,
      p3Kf.position,
      clamp(easedT, 0, 1),
    );
    const t0 = resolveCameraShotTarget(p0Kf, actorsMap);
    const t3 = resolveCameraShotTarget(p3Kf, actorsMap);
    target = catmullRomVec3(t0, prevTarget, nextTarget, t3, clamp(easedT, 0, 1));
  } else {
    position = lerpVec3(prev.position, next.position, easedT);
    target = lerpVec3(prevTarget, nextTarget, easedT);
  }

  const shakeAmp = lerp(
    prev.shakeIntensity ?? 0,
    next.shakeIntensity ?? 0,
    clamp(easedT, 0, 1),
  );
  const shakeFreq = lerp(
    prev.shakeFrequency ?? 8,
    next.shakeFrequency ?? 8,
    clamp(easedT, 0, 1),
  );
  const shake = computeCameraShakeOffset(time, shakeAmp, shakeFreq);

  const activePovActorId =
    prev.easing === 'step' && time >= next.time - 0.0005
      ? (next.povActorId ?? null)
      : (prev.povActorId ?? null);

  return {
    position,
    target,
    fov: clamp(lerp(prev.fov, next.fov, easedT), 18, 95),
    rollRad:
      lerp(degToRad(prev.rollDeg ?? 0), degToRad(next.rollDeg ?? 0), easedT) +
      shake.rollJitterRad,
    shakeOffset: shake.offset,
    povActorId: activePovActorId,
  };
}

export function evaluateStageAt(
  project: AnimationProject,
  time: number,
): EvaluatedStageState {
  const baseLabel = getActiveMapLabel(project);
  const track = project.mapTrack;
  if (!track || track.length === 0) {
    return {
      environment: project.environment,
      mapId: project.mapId,
      customMap: project.customMap,
      lightingMood: project.lightingMood,
      label: baseLabel,
    };
  }

  const sorted = sortByTime(track);
  let activeCue: MapKeyframe | null = null;
  for (const kf of sorted) {
    if (kf.time <= time + 0.0005) {
      activeCue = kf;
    } else {
      break;
    }
  }

  if (!activeCue) {
    return {
      environment: project.environment,
      mapId: project.mapId,
      customMap: project.customMap,
      lightingMood: project.lightingMood,
      label: baseLabel,
    };
  }

  const rec =
    activeCue.environment === 'custom' && activeCue.customMap
      ? activeCue.customMap.recommendedLighting
      : activeCue.environment !== 'custom'
        ? getBuiltInMapByEnv(activeCue.environment).recommendedLighting
        : undefined;

  return {
    environment: activeCue.environment,
    mapId: activeCue.mapId,
    customMap: activeCue.customMap,
    lightingMood: activeCue.applyAtmosphere && rec ? rec.mood : project.lightingMood,
    recommendedLighting: activeCue.applyAtmosphere ? rec : undefined,
    label: activeCue.label,
  };
}

export function evaluateLightingAt(
  project: AnimationProject,
  time: number,
  stage?: EvaluatedStageState,
): EvaluatedLightingState {
  const rec = stage?.recommendedLighting;
  const baseState: EvaluatedLightingState = {
    sunAzimuth: rec?.sunAzimuth ?? project.sunAzimuth ?? 42,
    sunElevation: rec?.sunElevation ?? project.sunElevation ?? 54,
    keyIntensity: rec?.keyIntensity ?? project.keyIntensity,
    rimIntensity: rec?.rimIntensity ?? project.rimIntensity,
    ambientIntensity: rec?.ambientIntensity ?? project.ambientIntensity,
    exposure: rec?.exposure ?? project.exposure ?? 1.06,
    keyColor: null,
  };

  const track = project.lightingTrack;
  if (!track || track.length === 0) {
    return baseState;
  }

  const sorted = sortByTime(track);
  if (time <= sorted[0].time) {
    const k = sorted[0];
    return {
      sunAzimuth: k.sunAzimuth,
      sunElevation: k.sunElevation,
      keyIntensity: k.keyIntensity,
      rimIntensity: k.rimIntensity,
      ambientIntensity: k.ambientIntensity,
      exposure: k.exposure,
      keyColor: k.keyColor ?? null,
    };
  }

  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    return {
      sunAzimuth: last.sunAzimuth,
      sunElevation: last.sunElevation,
      keyIntensity: last.keyIntensity,
      rimIntensity: last.rimIntensity,
      ambientIntensity: last.ambientIntensity,
      exposure: last.exposure,
      keyColor: last.keyColor ?? null,
    };
  }

  let prev = sorted[0];
  let next = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, next.time - prev.time);
  const easedT = clamp(applyEasing((time - prev.time) / span, prev.easing), 0, 1);

  return {
    sunAzimuth: lerp(prev.sunAzimuth, next.sunAzimuth, easedT),
    sunElevation: lerp(prev.sunElevation, next.sunElevation, easedT),
    keyIntensity: lerp(prev.keyIntensity, next.keyIntensity, easedT),
    rimIntensity: lerp(prev.rimIntensity, next.rimIntensity, easedT),
    ambientIntensity: lerp(prev.ambientIntensity, next.ambientIntensity, easedT),
    exposure: lerp(prev.exposure, next.exposure, easedT),
    keyColor:
      prev.keyColor && next.keyColor
        ? lerpHexColor(prev.keyColor, next.keyColor, easedT)
        : prev.keyColor ?? next.keyColor ?? null,
  };
}

function lerpHexColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const r = Math.round(lerp(pa[0], pb[0], t));
  const g = Math.round(lerp(pa[1], pb[1], t));
  const bl = Math.round(lerp(pa[2], pb[2], t));
  return `#${toHex2(r)}${toHex2(g)}${toHex2(bl)}`;
}

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const n = Number.parseInt(clean, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex2(n: number): string {
  return clamp(n, 0, 255).toString(16).padStart(2, '0');
}

export function evaluateSubtitleAt(
  subtitles: SubtitleCue[],
  time: number,
): SubtitleCue | null {
  for (const cue of subtitles) {
    if (time >= cue.startTime && time <= cue.endTime) {
      return cue;
    }
  }
  return null;
}

export function evaluateScreenBlackoutAt(
  screenEffects: ScreenEffectKeyframe[] | undefined,
  time: number,
): number {
  if (!screenEffects || screenEffects.length === 0) return 0;
  const sorted = sortByTime(screenEffects);
  if (time <= sorted[0].time) {
    return clamp(sorted[0].blackout, 0, 1);
  }
  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    return clamp(last.blackout, 0, 1);
  }
  let prev = sorted[0];
  let next = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }
  if (prev.easing === 'step') {
    return time >= next.time - 0.0005 ? clamp(next.blackout, 0, 1) : clamp(prev.blackout, 0, 1);
  }
  const span = Math.max(0.0001, next.time - prev.time);
  const easedT = clamp(applyEasing((time - prev.time) / span, prev.easing), 0, 1);
  return clamp(lerp(prev.blackout, next.blackout, easedT), 0, 1);
}

export function evaluateProjectAt(
  project: AnimationProject,
  time: number,
): EvaluatedFrame {
  const clampedTime = clamp(time, 0, project.duration);
  const actors: Record<string, EvaluatedActorState> = {};
  for (const actor of project.actors) {
    actors[actor.id] = evaluateActorAt(actor, clampedTime, project.subtitles);
  }
  const stage = evaluateStageAt(project, clampedTime);
  return {
    time: clampedTime,
    actors,
    camera: evaluateCameraAt(project.cameraTrack, clampedTime, actors),
    lighting: evaluateLightingAt(project, clampedTime, stage),
    stage,
    subtitle: evaluateSubtitleAt(project.subtitles, clampedTime),
    screenBlackout: evaluateScreenBlackoutAt(project.screenEffects, clampedTime),
  };
}

// =========================================================================
// Keyframe CRUD & Drag-Move Helpers
// =========================================================================

function snapTimeToStep(time: number, duration: number): number {
  const clamped = clamp(time, 0, duration);
  return Math.round(clamped * 20) / 20; // 0.05s snap
}

export function upsertActorKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframe: ActorKeyframe,
): AnimationProject {
  const snapTime = Math.round(keyframe.time * 100) / 100;
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const existingIdx = actor.keyframes.findIndex(
        (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
      );
      const nextKfs = [...actor.keyframes];
      const normalized = { ...keyframe, time: snapTime };
      if (existingIdx >= 0) {
        nextKfs[existingIdx] = {
          ...nextKfs[existingIdx],
          ...normalized,
          id: nextKfs[existingIdx].id,
        };
      } else {
        nextKfs.push(normalized);
      }
      nextKfs.sort((a, b) => a.time - b.time);
      return { ...actor, keyframes: nextKfs };
    }),
  };
}

export function moveActorKeyframeTime(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const nextKfs = actor.keyframes
        .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
        .sort((a, b) => a.time - b.time);
      return { ...actor, keyframes: nextKfs };
    }),
  };
}

export function deleteActorKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
): AnimationProject {
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      if (actor.keyframes.length <= 1) return actor;
      return {
        ...actor,
        keyframes: actor.keyframes.filter((kf) => kf.id !== keyframeId),
      };
    }),
  };
}

export function upsertFaceKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframe: FaceKeyframe,
): AnimationProject {
  const snapTime = Math.round(keyframe.time * 100) / 100;
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.faceKeyframes ?? [];
      const existingIdx = current.findIndex(
        (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
      );
      const nextKfs = [...current];
      const normalized = { ...keyframe, time: snapTime };
      if (existingIdx >= 0) {
        nextKfs[existingIdx] = {
          ...nextKfs[existingIdx],
          ...normalized,
          id: nextKfs[existingIdx].id,
        };
      } else {
        nextKfs.push(normalized);
      }
      nextKfs.sort((a, b) => a.time - b.time);
      return { ...actor, faceKeyframes: nextKfs };
    }),
  };
}

export function moveFaceKeyframeTime(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.faceKeyframes ?? [];
      const nextKfs = current
        .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
        .sort((a, b) => a.time - b.time);
      return { ...actor, faceKeyframes: nextKfs };
    }),
  };
}

export function deleteFaceKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
): AnimationProject {
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.faceKeyframes ?? [];
      return {
        ...actor,
        faceKeyframes: current.filter((kf) => kf.id !== keyframeId),
      };
    }),
  };
}

export function upsertItemKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframe: HeldItemKeyframe,
): AnimationProject {
  const snapTime = Math.round(keyframe.time * 100) / 100;
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.heldItemKeyframes ?? [];
      const existingIdx = current.findIndex(
        (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
      );
      const nextKfs = [...current];
      const normalized: HeldItemKeyframe = {
        ...keyframe,
        time: snapTime,
        right: cloneHandItemState(keyframe.right),
        left: cloneHandItemState(keyframe.left),
      };
      if (existingIdx >= 0) {
        nextKfs[existingIdx] = {
          ...nextKfs[existingIdx],
          ...normalized,
          id: nextKfs[existingIdx].id,
        };
      } else {
        nextKfs.push(normalized);
      }
      nextKfs.sort((a, b) => a.time - b.time);
      return {
        ...actor,
        heldItems: nextKfs[0]
          ? {
              right: cloneHandItemState(nextKfs[0].right),
              left: cloneHandItemState(nextKfs[0].left),
            }
          : actor.heldItems,
        heldItemKeyframes: nextKfs,
      };
    }),
  };
}

export function moveItemKeyframeTime(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.heldItemKeyframes ?? [];
      const nextKfs = current
        .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
        .sort((a, b) => a.time - b.time);
      return { ...actor, heldItemKeyframes: nextKfs };
    }),
  };
}

export function deleteItemKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
): AnimationProject {
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.heldItemKeyframes ?? [];
      return {
        ...actor,
        heldItemKeyframes: current.filter((kf) => kf.id !== keyframeId),
      };
    }),
  };
}

export function upsertCharacterStateKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframe: CharacterStateKeyframe,
): AnimationProject {
  const snapTime = Math.round(clamp(keyframe.time, 0, project.duration) * 100) / 100;
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.stateKeyframes ?? [];
      const existingIdx = current.findIndex(
        (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
      );
      const nextFrames = [...current];
      const normalized: CharacterStateKeyframe = {
        id: keyframe.id,
        time: snapTime,
        stateId: isValidCharacterStateId(keyframe.stateId) ? keyframe.stateId : 'normal',
        intensity: clamp(keyframe.intensity ?? 1, 0.4, 1.5),
        targetLimb: sanitizeCharacterStateLimb(keyframe.targetLimb),
        seed:
          typeof keyframe.seed === 'number' && Number.isFinite(keyframe.seed)
            ? keyframe.seed
            : 1,
      };
      if (existingIdx >= 0) {
        nextFrames[existingIdx] = {
          ...nextFrames[existingIdx],
          ...normalized,
          id: nextFrames[existingIdx].id,
        };
      } else {
        nextFrames.push(normalized);
      }
      nextFrames.sort((a, b) => a.time - b.time);
      return { ...actor, stateKeyframes: nextFrames };
    }),
  };
}

export function moveCharacterStateKeyframeTime(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.stateKeyframes ?? [];
      const nextFrames = current
        .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
        .sort((a, b) => a.time - b.time);
      return { ...actor, stateKeyframes: nextFrames };
    }),
  };
}

export function deleteCharacterStateKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
): AnimationProject {
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.stateKeyframes ?? [];
      return {
        ...actor,
        stateKeyframes: current.filter((kf) => kf.id !== keyframeId),
      };
    }),
  };
}

export function upsertCharacterActionKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframe: CharacterActionKeyframe,
): AnimationProject {
  const snapTime = Math.round(clamp(keyframe.time, 0, project.duration) * 100) / 100;
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.actionKeyframes ?? [];
      const existingIdx = current.findIndex(
        (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
      );
      const nextFrames = [...current];
      const normalized: CharacterActionKeyframe = {
        id: keyframe.id,
        time: snapTime,
        actionId: isValidCharacterActionId(keyframe.actionId) ? keyframe.actionId : 'none',
        intensity: clamp(keyframe.intensity ?? 1, 0.4, 1.5),
        source: sanitizeCharacterActionSource(keyframe.source),
        seed:
          typeof keyframe.seed === 'number' && Number.isFinite(keyframe.seed)
            ? keyframe.seed
            : 1,
      };
      if (existingIdx >= 0) {
        nextFrames[existingIdx] = {
          ...nextFrames[existingIdx],
          ...normalized,
          id: nextFrames[existingIdx].id,
        };
      } else {
        nextFrames.push(normalized);
      }
      nextFrames.sort((a, b) => a.time - b.time);
      return { ...actor, actionKeyframes: nextFrames };
    }),
  };
}

export function moveCharacterActionKeyframeTime(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.actionKeyframes ?? [];
      const nextFrames = current
        .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
        .sort((a, b) => a.time - b.time);
      return { ...actor, actionKeyframes: nextFrames };
    }),
  };
}

export function deleteCharacterActionKeyframe(
  project: AnimationProject,
  actorId: string,
  keyframeId: string,
): AnimationProject {
  return {
    ...project,
    actors: project.actors.map((actor) => {
      if (actor.id !== actorId) return actor;
      const current = actor.actionKeyframes ?? [];
      return {
        ...actor,
        actionKeyframes: current.filter((kf) => kf.id !== keyframeId),
      };
    }),
  };
}

export function upsertCameraKeyframe(
  project: AnimationProject,
  keyframe: CameraKeyframe,
): AnimationProject {
  const snapTime = Math.round(keyframe.time * 100) / 100;
  const existingIdx = project.cameraTrack.findIndex(
    (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
  );
  const nextTrack = [...project.cameraTrack];
  const normalized = { ...keyframe, time: snapTime };
  if (existingIdx >= 0) {
    nextTrack[existingIdx] = {
      ...nextTrack[existingIdx],
      ...normalized,
      id: nextTrack[existingIdx].id,
    };
  } else {
    nextTrack.push(normalized);
  }
  nextTrack.sort((a, b) => a.time - b.time);
  return { ...project, cameraTrack: nextTrack };
}

export function moveCameraKeyframeTime(
  project: AnimationProject,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  const nextTrack = project.cameraTrack
    .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
    .sort((a, b) => a.time - b.time);
  return { ...project, cameraTrack: nextTrack };
}

export function deleteCameraKeyframe(
  project: AnimationProject,
  keyframeId: string,
): AnimationProject {
  if (project.cameraTrack.length <= 1) return project;
  return {
    ...project,
    cameraTrack: project.cameraTrack.filter((kf) => kf.id !== keyframeId),
  };
}

export function upsertLightingKeyframe(
  project: AnimationProject,
  keyframe: LightingKeyframe,
): AnimationProject {
  const snapTime = Math.round(keyframe.time * 100) / 100;
  const currentTrack = project.lightingTrack ?? [];
  const existingIdx = currentTrack.findIndex(
    (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
  );
  const nextTrack = [...currentTrack];
  const normalized = { ...keyframe, time: snapTime };
  if (existingIdx >= 0) {
    nextTrack[existingIdx] = {
      ...nextTrack[existingIdx],
      ...normalized,
      id: nextTrack[existingIdx].id,
    };
  } else {
    nextTrack.push(normalized);
  }
  nextTrack.sort((a, b) => a.time - b.time);
  return { ...project, lightingTrack: nextTrack };
}

export function moveLightingKeyframeTime(
  project: AnimationProject,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  const nextTrack = (project.lightingTrack ?? [])
    .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
    .sort((a, b) => a.time - b.time);
  return { ...project, lightingTrack: nextTrack };
}

export function deleteLightingKeyframe(
  project: AnimationProject,
  keyframeId: string,
): AnimationProject {
  const currentTrack = project.lightingTrack ?? [];
  if (currentTrack.length <= 1) {
    return { ...project, lightingTrack: [] };
  }
  return {
    ...project,
    lightingTrack: currentTrack.filter((kf) => kf.id !== keyframeId),
  };
}

export function upsertStageLight(
  project: AnimationProject,
  light: StageLightConfig,
): AnimationProject {
  const existing = project.stageLights ?? [];
  const idx = existing.findIndex((l) => l.id === light.id);
  const next = [...existing];
  if (idx >= 0) {
    next[idx] = light;
  } else {
    next.push(light);
  }
  return { ...project, stageLights: next };
}

export function deleteStageLight(
  project: AnimationProject,
  lightId: string,
): AnimationProject {
  return {
    ...project,
    stageLights: (project.stageLights ?? []).filter((l) => l.id !== lightId),
  };
}

export function upsertSubtitleCue(
  project: AnimationProject,
  cue: SubtitleCue,
): AnimationProject {
  const idx = project.subtitles.findIndex((c) => c.id === cue.id);
  const next = [...project.subtitles];
  if (idx >= 0) {
    next[idx] = cue;
  } else {
    next.push(cue);
  }
  next.sort((a, b) => a.startTime - b.startTime);
  return { ...project, subtitles: next };
}

export function deleteSubtitleCue(
  project: AnimationProject,
  cueId: string,
): AnimationProject {
  return {
    ...project,
    subtitles: project.subtitles.filter((c) => c.id !== cueId),
  };
}

export function upsertMapKeyframe(
  project: AnimationProject,
  keyframe: MapKeyframe,
): AnimationProject {
  const snapTime = snapTimeToStep(keyframe.time, project.duration);
  const currentTrack = project.mapTrack ?? [];
  const existingIdx = currentTrack.findIndex(
    (kf) => kf.id === keyframe.id || Math.abs(kf.time - snapTime) < 0.04,
  );
  const nextTrack = [...currentTrack];
  const normalized: MapKeyframe = { ...keyframe, time: snapTime };
  if (existingIdx >= 0) {
    nextTrack[existingIdx] = {
      ...nextTrack[existingIdx],
      ...normalized,
      id: nextTrack[existingIdx].id,
    };
  } else {
    nextTrack.push(normalized);
  }
  nextTrack.sort((a, b) => a.time - b.time);
  return { ...project, mapTrack: nextTrack };
}

export function moveMapKeyframeTime(
  project: AnimationProject,
  keyframeId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  const nextTrack = (project.mapTrack ?? [])
    .map((kf) => (kf.id === keyframeId ? { ...kf, time: snapped } : kf))
    .sort((a, b) => a.time - b.time);
  return { ...project, mapTrack: nextTrack };
}

export function deleteMapKeyframe(
  project: AnimationProject,
  keyframeId: string,
): AnimationProject {
  return {
    ...project,
    mapTrack: (project.mapTrack ?? []).filter((kf) => kf.id !== keyframeId),
  };
}

export function upsertChapterMarker(
  project: AnimationProject,
  chapter: ChapterMarker,
): AnimationProject {
  const snapTime = snapTimeToStep(chapter.time, project.duration);
  const current = project.chapters ?? [];
  const existingIdx = current.findIndex(
    (c) => c.id === chapter.id || Math.abs(c.time - snapTime) < 0.08,
  );
  const next = [...current];
  const normalized: ChapterMarker = {
    ...chapter,
    time: snapTime,
    title: chapter.title.trim().slice(0, 48) || 'Chapter',
  };
  if (existingIdx >= 0) {
    next[existingIdx] = {
      ...next[existingIdx],
      ...normalized,
      id: next[existingIdx].id,
    };
  } else {
    next.push(normalized);
  }
  next.sort((a, b) => a.time - b.time);
  return { ...project, chapters: next };
}

export function moveChapterMarkerTime(
  project: AnimationProject,
  chapterId: string,
  newTime: number,
): AnimationProject {
  const snapped = snapTimeToStep(newTime, project.duration);
  const next = (project.chapters ?? [])
    .map((c) => (c.id === chapterId ? { ...c, time: snapped } : c))
    .sort((a, b) => a.time - b.time);
  return { ...project, chapters: next };
}

export function deleteChapterMarker(
  project: AnimationProject,
  chapterId: string,
): AnimationProject {
  return {
    ...project,
    chapters: (project.chapters ?? []).filter((c) => c.id !== chapterId),
  };
}

export function getChapterBounds(
  chapters: ChapterMarker[] | undefined,
  chapterId: string,
  duration: number,
): { startSec: number; endSec: number; chapter: ChapterMarker } | null {
  if (!chapters || chapters.length === 0) return null;
  const sorted = sortByTime(chapters);
  const idx = sorted.findIndex((c) => c.id === chapterId);
  if (idx < 0) return null;
  const startSec = clamp(sorted[idx].time, 0, duration);
  const endSec =
    idx + 1 < sorted.length
      ? clamp(sorted[idx + 1].time, startSec + 0.1, duration)
      : duration;
  return {
    startSec,
    endSec: Math.max(startSec + 0.1, endSec),
    chapter: sorted[idx],
  };
}

export function getChapterAtTime(
  chapters: ChapterMarker[] | undefined,
  time: number,
): ChapterMarker | null {
  if (!chapters || chapters.length === 0) return null;
  const sorted = sortByTime(chapters);
  let active: ChapterMarker | null = null;
  for (const ch of sorted) {
    if (ch.time <= time + 0.04) {
      active = ch;
    } else {
      break;
    }
  }
  return active;
}

export function rippleShiftProjectFrom(
  project: AnimationProject,
  fromTime: number,
  deltaSec: number,
): AnimationProject {
  if (Math.abs(deltaSec) < 0.001) return project;

  const anchor = Math.max(0, fromTime);
  const minShiftedTime = anchor > 0.05 ? 0.05 : 0;

  const shiftTime = (t: number): number => {
    if (anchor <= 0.01 && t <= 0.01) {
      // Keep base 00:00 keyframes anchored when rippling from timeline start
      return 0;
    }
    if (t < anchor - 0.001) {
      return t;
    }
    const raw = t + deltaSec;
    const clamped = clamp(raw, minShiftedTime, MAX_SCENE_DURATION);
    return Math.round(clamped * 20) / 20;
  };

  let maxTime = 0;
  const trackMax = (t: number) => {
    if (t > maxTime) maxTime = t;
    return t;
  };

  const nextCameraTrack = project.cameraTrack
    .map((k) => ({ ...k, time: trackMax(shiftTime(k.time)) }))
    .sort((a, b) => a.time - b.time);

  const nextLightingTrack = (project.lightingTrack ?? [])
    .map((k) => ({ ...k, time: trackMax(shiftTime(k.time)) }))
    .sort((a, b) => a.time - b.time);

  const nextMapTrack = (project.mapTrack ?? [])
    .map((k) => ({ ...k, time: trackMax(shiftTime(k.time)) }))
    .sort((a, b) => a.time - b.time);

  const nextChapters = (project.chapters ?? [])
    .map((c) => ({ ...c, time: trackMax(shiftTime(c.time)) }))
    .sort((a, b) => a.time - b.time);

  const nextSfxTrack = project.sfxTrack
    ? project.sfxTrack
        .map((s) => ({ ...s, time: trackMax(shiftTime(s.time)) }))
        .sort((a, b) => a.time - b.time)
    : undefined;

  const nextScreenEffects = project.screenEffects
    ? project.screenEffects
        .map((e) => ({ ...e, time: trackMax(shiftTime(e.time)) }))
        .sort((a, b) => a.time - b.time)
    : undefined;

  const nextSubtitles = project.subtitles
    .map((sub) => {
      const nextStart = shiftTime(sub.startTime);
      const rawEnd =
        sub.endTime >= anchor - 0.001
          ? clamp(sub.endTime + deltaSec, nextStart + 0.2, MAX_SCENE_DURATION)
          : sub.endTime;
      const nextEnd = Math.round(rawEnd * 20) / 20;
      trackMax(nextEnd);
      return { ...sub, startTime: nextStart, endTime: nextEnd };
    })
    .sort((a, b) => a.startTime - b.startTime);

  const nextActors = project.actors.map((actor) => ({
    ...actor,
    keyframes: actor.keyframes
      .map((kf) => ({ ...kf, time: trackMax(shiftTime(kf.time)) }))
      .sort((a, b) => a.time - b.time),
    ...(actor.faceKeyframes
      ? {
          faceKeyframes: actor.faceKeyframes
            .map((kf) => ({ ...kf, time: trackMax(shiftTime(kf.time)) }))
            .sort((a, b) => a.time - b.time),
        }
      : {}),
    ...(actor.heldItemKeyframes
      ? {
          heldItemKeyframes: actor.heldItemKeyframes
            .map((kf) => ({ ...kf, time: trackMax(shiftTime(kf.time)) }))
            .sort((a, b) => a.time - b.time),
        }
      : {}),
    ...(actor.stateKeyframes
      ? {
          stateKeyframes: actor.stateKeyframes
            .map((kf) => ({ ...kf, time: trackMax(shiftTime(kf.time)) }))
            .sort((a, b) => a.time - b.time),
        }
      : {}),
    ...(actor.actionKeyframes
      ? {
          actionKeyframes: actor.actionKeyframes
            .map((kf) => ({ ...kf, time: trackMax(shiftTime(kf.time)) }))
            .sort((a, b) => a.time - b.time),
        }
      : {}),
  }));

  const targetDuration = Math.round(
    clamp(
      Math.max(MIN_SCENE_DURATION, maxTime, project.duration + deltaSec),
      MIN_SCENE_DURATION,
      MAX_SCENE_DURATION,
    ) * 20,
  ) / 20;

  return {
    ...project,
    duration: targetDuration,
    cameraTrack: nextCameraTrack,
    lightingTrack: nextLightingTrack,
    mapTrack: nextMapTrack,
    ...(nextSfxTrack ? { sfxTrack: nextSfxTrack } : {}),
    ...(nextScreenEffects ? { screenEffects: nextScreenEffects } : {}),
    chapters: nextChapters,
    subtitles: nextSubtitles,
    actors: nextActors,
  };
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe * 10) % 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function serializeProject(project: AnimationProject): string {
  return JSON.stringify(project, null, 2);
}

function sanitizeHandItemState(raw: unknown): HeldHandItemState {
  if (!raw || typeof raw !== 'object') {
    return createEmptyHandState();
  }
  const obj = raw as Partial<HeldHandItemState>;
  const itemId = obj.itemId === 'none' || isValidItemId(obj.itemId) ? obj.itemId : 'none';
  const gripPreset =
    obj.gripPreset === 'reverse' ||
    obj.gripPreset === 'forearm' ||
    obj.gripPreset === 'carry'
      ? obj.gripPreset
      : 'standard';
  const toVec3 = (v: unknown): Vec3Tuple =>
    Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')
      ? [v[0], v[1], v[2]]
      : [0, 0, 0];

  return {
    itemId,
    primaryColor: typeof obj.primaryColor === 'string' ? obj.primaryColor : '#cbd5e1',
    accentColor: typeof obj.accentColor === 'string' ? obj.accentColor : '#635f62',
    positionOffset: toVec3(obj.positionOffset),
    rotationDeg: toVec3(obj.rotationDeg),
    scale: typeof obj.scale === 'number' ? clamp(obj.scale, 0.2, 3) : 1,
    gripPreset,
  };
}

function sanitizeActorConfig(actor: SceneActorConfig): SceneActorConfig {
  const propKind =
    actor.kind === 'prop'
      ? isValidPropKind(actor.propKind)
        ? actor.propKind
        : 'crate'
      : actor.propKind;
  const propItemId =
    actor.kind === 'prop' && propKind === 'heldItem'
      ? isValidItemId(actor.propItemId)
        ? actor.propItemId
        : 'linkedSword'
      : actor.propItemId;

  const heldItems = actor.heldItems
    ? cloneCharacterHeldItems({
        right: sanitizeHandItemState(actor.heldItems.right),
        left: sanitizeHandItemState(actor.heldItems.left),
      })
    : undefined;

  const heldItemKeyframes = Array.isArray(actor.heldItemKeyframes)
    ? actor.heldItemKeyframes
        .filter((k) => k && typeof k.time === 'number')
        .map((k, idx) => ({
          id: typeof k.id === 'string' ? k.id : `ikf_${idx}`,
          time: Math.max(0, k.time),
          easing: k.easing === 'equipPop' ? ('equipPop' as const) : ('step' as const),
          right: sanitizeHandItemState(k.right),
          left: sanitizeHandItemState(k.left),
        }))
        .sort((a, b) => a.time - b.time)
    : undefined;

  const stateKeyframes = Array.isArray(actor.stateKeyframes)
    ? actor.stateKeyframes
        .filter((k) => k && typeof k.time === 'number' && isValidCharacterStateId(k.stateId))
        .map((k, idx) => ({
          id: typeof k.id === 'string' && k.id ? k.id : `skf_${idx}`,
          time: Math.max(0, k.time),
          stateId: k.stateId,
          intensity: typeof k.intensity === 'number' ? clamp(k.intensity, 0.4, 1.5) : 1,
          targetLimb: sanitizeCharacterStateLimb(k.targetLimb),
          seed: typeof k.seed === 'number' && Number.isFinite(k.seed) ? k.seed : 1,
        }))
        .sort((a, b) => a.time - b.time)
    : undefined;

  const modelBuild =
    actor.kind === 'character' && actor.modelBuild !== undefined
      ? sanitizeCharacterModelBuildId(actor.modelBuild)
      : undefined;

  const actionKeyframes = Array.isArray(actor.actionKeyframes)
    ? actor.actionKeyframes
        .filter((k) => k && typeof k.time === 'number' && isValidCharacterActionId(k.actionId))
        .map((k, idx) => ({
          id: typeof k.id === 'string' && k.id ? k.id : `akf_${idx}`,
          time: Math.max(0, k.time),
          actionId: k.actionId,
          intensity: typeof k.intensity === 'number' ? clamp(k.intensity, 0.4, 1.5) : 1,
          source: sanitizeCharacterActionSource(k.source),
          seed: typeof k.seed === 'number' && Number.isFinite(k.seed) ? k.seed : 1,
        }))
        .sort((a, b) => a.time - b.time)
    : undefined;

  // Legacy migration: hat === 'spiky' becomes dedicated hair.styleId === 'spiky'
  let ornaments = actor.ornaments;
  let hair = actor.hair;
  if (ornaments?.hat?.id === 'spiky') {
    if (!hair) {
      hair = {
        styleId: 'spiky',
        primaryColor: ornaments.hat.color || '#4b2e1e',
        highlightColor: ornaments.hat.accentColor || '#f59e0b',
        highlightPattern: 'none',
        volume: 1,
      };
    }
    ornaments = {
      ...ornaments,
      hat: {
        id: 'none',
        color: ornaments.hat.color || '#c4281c',
        accentColor: ornaments.hat.accentColor,
      },
    };
  }

  let sanitizedOrnaments: NormalizedR6Ornaments | undefined;
  if (ornaments && typeof ornaments === 'object') {
    const normalized = normalizeOrnaments(ornaments);
    for (const slot of ORNAMENT_SLOTS) {
      const validIds = new Set<string>(ORNAMENT_CATALOG[slot].map((item) => item.id));
      const sel = normalized[slot];
      const safeId = validIds.has(sel.id) ? sel.id : slot === 'face' ? 'classicSmile' : 'none';
      const fallbackItem = ORNAMENT_CATALOG[slot].find((item) => item.id === safeId);
      normalized[slot] = {
        id: safeId,
        color:
          typeof sel.color === 'string' && sel.color
            ? sel.color
            : fallbackItem?.defaultColor ?? '#1b2a35',
        ...(typeof sel.accentColor === 'string' && sel.accentColor
          ? { accentColor: sel.accentColor }
          : {}),
        ...(sel.fit ? { fit: normalizeAccessoryFit(sel.fit) } : {}),
      };
    }
    sanitizedOrnaments = normalized;
  }

  const validHairIds = new Set<string>(HAIR_STYLE_CATALOG.map((h) => h.id));
  const validHiPatterns = new Set<string>(HAIR_HIGHLIGHT_PATTERNS.map((p) => p.id));
  const validBangsIds = new Set<string>(HAIR_BANGS_CATALOG.map((b) => b.id));
  const validAccessoryIds = new Set<string>(HAIR_ACCESSORY_CATALOG.map((a) => a.id));
  const validFinishIds = new Set<string>(HAIR_FINISH_OPTIONS.map((f) => f.id));
  const sanitizedHair =
    hair && typeof hair === 'object'
      ? (() => {
          const resolvedAccessory =
            typeof hair.accessoryId === 'string' && validAccessoryIds.has(hair.accessoryId)
              ? hair.accessoryId
              : hair.flowerAccessory
                ? ('hibiscus' as const)
                : ('none' as const);
          return {
            styleId: validHairIds.has(hair.styleId) ? hair.styleId : ('none' as const),
            primaryColor: typeof hair.primaryColor === 'string' ? hair.primaryColor : '#3b2416',
            highlightColor: typeof hair.highlightColor === 'string' ? hair.highlightColor : '#f59e0b',
            highlightPattern: validHiPatterns.has(hair.highlightPattern)
              ? hair.highlightPattern
              : ('none' as const),
            volume: typeof hair.volume === 'number' ? clamp(hair.volume, 0.8, 1.25) : 1,
            bangsStyle:
              typeof hair.bangsStyle === 'string' && validBangsIds.has(hair.bangsStyle)
                ? hair.bangsStyle
                : ('auto' as const),
            accessoryId: resolvedAccessory,
            accessoryColor:
              typeof hair.accessoryColor === 'string' ? hair.accessoryColor : '#f472b6',
            finish:
              typeof hair.finish === 'string' && validFinishIds.has(hair.finish)
                ? hair.finish
                : ('silky' as const),
            flowerAccessory: resolvedAccessory === 'hibiscus',
          };
        })()
      : undefined;

  const validShirtIds = new Set<string>(SHIRT_CATALOG.map((s) => s.id));
  const validOuterwearIds = new Set<string>(OUTERWEAR_CATALOG.map((o) => o.id));
  const validSleeveModes = new Set<string>(SLEEVE_MODE_OPTIONS.map((s) => s.id));
  const validPantsIds = new Set<string>(PANT_CATALOG.map((p) => p.id));
  const validFootwearIds = new Set<string>(FOOTWEAR_CATALOG.map((f) => f.id));
  const validFabricIds = new Set<string>(FABRIC_MATERIAL_OPTIONS.map((f) => f.id));
  const validPatternIds = new Set<string>(CLOTHING_PATTERN_OPTIONS.map((p) => p.id));
  const validBeltIds = new Set<string>(BELT_STYLE_OPTIONS.map((b) => b.id));
  const c = actor.clothing;
  const sanitizedClothing =
    c && typeof c === 'object'
      ? {
          shirtId: validShirtIds.has(c.shirtId) ? c.shirtId : ('none' as const),
          shirtColor: typeof c.shirtColor === 'string' ? c.shirtColor : '#0d69ac',
          shirtAccent: typeof c.shirtAccent === 'string' ? c.shirtAccent : '#f5cd30',
          sleeveMode: validSleeveModes.has(c.sleeveMode) ? c.sleeveMode : ('auto' as const),
          topFabric:
            typeof c.topFabric === 'string' && validFabricIds.has(c.topFabric)
              ? c.topFabric
              : ('auto' as const),
          topPattern:
            typeof c.topPattern === 'string' && validPatternIds.has(c.topPattern)
              ? c.topPattern
              : ('solid' as const),
          outerwearId:
            typeof c.outerwearId === 'string' && validOuterwearIds.has(c.outerwearId)
              ? c.outerwearId
              : ('none' as const),
          outerwearColor: typeof c.outerwearColor === 'string' ? c.outerwearColor : '#1e293b',
          outerwearAccent: typeof c.outerwearAccent === 'string' ? c.outerwearAccent : '#f8fafc',
          outerwearFabric:
            typeof c.outerwearFabric === 'string' && validFabricIds.has(c.outerwearFabric)
              ? c.outerwearFabric
              : ('auto' as const),
          outerwearOpen: typeof c.outerwearOpen === 'boolean' ? c.outerwearOpen : true,
          pantsId: validPantsIds.has(c.pantsId) ? c.pantsId : ('none' as const),
          pantsColor: typeof c.pantsColor === 'string' ? c.pantsColor : '#1d4ed8',
          pantsAccent: typeof c.pantsAccent === 'string' ? c.pantsAccent : '#f2f3f3',
          bottomFabric:
            typeof c.bottomFabric === 'string' && validFabricIds.has(c.bottomFabric)
              ? c.bottomFabric
              : ('auto' as const),
          bottomPattern:
            typeof c.bottomPattern === 'string' && validPatternIds.has(c.bottomPattern)
              ? c.bottomPattern
              : ('solid' as const),
          beltStyle:
            typeof c.beltStyle === 'string' && validBeltIds.has(c.beltStyle)
              ? c.beltStyle
              : ('auto' as const),
          footwearId: validFootwearIds.has(c.footwearId) ? c.footwearId : ('none' as const),
          shoeColor: typeof c.shoeColor === 'string' ? c.shoeColor : '#1e293b',
          shoeAccent: typeof c.shoeAccent === 'string' ? c.shoeAccent : '#f8fafc',
        }
      : undefined;

  return {
    ...actor,
    ...(sanitizedOrnaments ? { ornaments: sanitizedOrnaments } : {}),
    ...(sanitizedHair ? { hair: sanitizedHair } : {}),
    ...(sanitizedClothing ? { clothing: sanitizedClothing } : {}),
    ...(propKind ? { propKind } : {}),
    ...(propItemId ? { propItemId } : {}),
    ...(heldItems ? { heldItems } : {}),
    ...(heldItemKeyframes ? { heldItemKeyframes } : {}),
    ...(stateKeyframes ? { stateKeyframes } : {}),
    ...(modelBuild ? { modelBuild } : {}),
    ...(actionKeyframes ? { actionKeyframes } : {}),
  };
}

function sanitizeChapters(raw: unknown, duration: number): ChapterMarker[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === 'object' && typeof (c as ChapterMarker).time === 'number')
    .map((c, idx) => {
      const ch = c as Partial<ChapterMarker>;
      return {
        id: typeof ch.id === 'string' && ch.id ? ch.id : `ch_${idx}`,
        time: clamp(ch.time as number, 0, duration),
        title:
          typeof ch.title === 'string' && ch.title.trim()
            ? ch.title.trim().slice(0, 48)
            : `Chapter ${idx + 1}`,
        color:
          typeof ch.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(ch.color)
            ? ch.color
            : CHAPTER_COLORS[idx % CHAPTER_COLORS.length],
      };
    })
    .sort((a, b) => a.time - b.time);
}

function sanitizeMapTrack(raw: unknown, duration: number): MapKeyframe[] {
  if (!Array.isArray(raw)) return [];
  const res: MapKeyframe[] = [];
  raw.forEach((m, idx) => {
    if (!m || typeof m !== 'object') return;
    const mk = m as Partial<MapKeyframe>;
    if (typeof mk.time !== 'number' || !Number.isFinite(mk.time)) return;
    const customMap = mk.customMap ? sanitizeMapDefinition(mk.customMap, true) ?? undefined : undefined;
    let env: EnvironmentId = 'crossroads';
    if (mk.environment === 'custom' && customMap) {
      env = 'custom';
    } else if (isBuiltInMapId(mk.environment)) {
      env = mk.environment;
    }
    res.push({
      id: typeof mk.id === 'string' && mk.id ? mk.id : `mkf_${idx}`,
      time: clamp(mk.time, 0, duration),
      environment: env,
      ...(typeof mk.mapId === 'string' ? { mapId: mk.mapId } : {}),
      ...(customMap ? { customMap } : {}),
      applyAtmosphere: typeof mk.applyAtmosphere === 'boolean' ? mk.applyAtmosphere : true,
      label:
        typeof mk.label === 'string' && mk.label.trim()
          ? mk.label.trim().slice(0, 48)
          : env === 'custom' && customMap
            ? customMap.name
            : getBuiltInMapByEnv(env === 'custom' ? 'crossroads' : env).name,
    });
  });
  return res.sort((a, b) => a.time - b.time);
}

export function parseProjectJson(raw: string): AnimationProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file. Please provide a valid Stagecraft 3D project JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Project file must contain a JSON object.');
  }

  const obj = parsed as Partial<AnimationProject>;
  if (
    typeof obj.name !== 'string' ||
    typeof obj.duration !== 'number' ||
    !Array.isArray(obj.actors) ||
    !Array.isArray(obj.cameraTrack)
  ) {
    throw new Error('Project JSON is missing required fields (name, duration, actors, cameraTrack).');
  }

  const duration = clamp(obj.duration, MIN_SCENE_DURATION, MAX_SCENE_DURATION);
  const customMap =
    obj.customMap ? sanitizeMapDefinition(obj.customMap, true) ?? undefined : undefined;
  let env: EnvironmentId = 'crossroads';
  if (obj.environment === 'custom' && customMap) {
    env = 'custom';
  } else if (isBuiltInMapId(obj.environment)) {
    env = obj.environment;
  }

  const mood =
    obj.lightingMood === 'sunset' ||
    obj.lightingMood === 'midnight' ||
    obj.lightingMood === 'overcast'
      ? obj.lightingMood
      : 'noon';

  const chapters = sanitizeChapters(obj.chapters, duration);
  const mapTrack = sanitizeMapTrack(obj.mapTrack, duration);
  const sfxTrack: SfxCue[] = Array.isArray(obj.sfxTrack)
    ? obj.sfxTrack
        .filter((s) => s && typeof s === 'object' && typeof s.time === 'number' && typeof s.kind === 'string')
        .map((s, idx) => ({
          id: typeof s.id === 'string' && s.id ? s.id : `sfx_${idx}`,
          time: clamp(s.time, 0, duration),
          kind: s.kind,
          ...(typeof s.label === 'string' ? { label: s.label } : {}),
          ...(typeof s.duration === 'number' ? { duration: s.duration } : {}),
        }))
        .sort((a, b) => a.time - b.time)
    : [];
  const screenEffects: ScreenEffectKeyframe[] = Array.isArray(obj.screenEffects)
    ? obj.screenEffects
        .filter((e) => e && typeof e === 'object' && typeof e.time === 'number')
        .map((e, idx) => ({
          id: typeof e.id === 'string' && e.id ? e.id : `se_${idx}`,
          time: clamp(e.time, 0, duration),
          blackout: typeof e.blackout === 'number' ? clamp(e.blackout, 0, 1) : 0,
          easing: e.easing ?? 'step',
        }))
        .sort((a, b) => a.time - b.time)
    : [];

  const validVoices = new Set(['Charon', 'Fenrir', 'Kore', 'Puck', 'Zephyr']);
  const sanitizedSubtitles: SubtitleCue[] = Array.isArray(obj.subtitles)
    ? obj.subtitles
        .filter(
          (s) =>
            s &&
            typeof s === 'object' &&
            typeof s.startTime === 'number' &&
            typeof s.endTime === 'number' &&
            typeof s.text === 'string',
        )
        .map((s, idx) => ({
          id: typeof s.id === 'string' && s.id ? s.id : `sub_${idx}`,
          startTime: clamp(s.startTime, 0, duration),
          endTime: clamp(Math.max(s.startTime + 0.1, s.endTime), 0, duration),
          speaker: typeof s.speaker === 'string' ? s.speaker : 'Narrator',
          ...(s.actorId !== undefined ? { actorId: s.actorId } : {}),
          text: s.text,
          ...(s.role === 'voiceover' || s.role === 'dialogue'
            ? { role: s.role }
            : {}),
          ...(typeof s.voiceOverride === 'string' && validVoices.has(s.voiceOverride)
            ? { voiceOverride: s.voiceOverride }
            : {}),
        }))
        .sort((a, b) => a.startTime - b.startTime)
    : [];

  return {
    id: typeof obj.id === 'string' ? obj.id : `proj_${Date.now()}`,
    name: obj.name,
    duration,
    fps: typeof obj.fps === 'number' ? clamp(obj.fps, 12, 60) : 30,
    loop: typeof obj.loop === 'boolean' ? obj.loop : true,
    environment: env,
    ...(typeof obj.mapId === 'string' ? { mapId: obj.mapId } : {}),
    ...(customMap ? { customMap } : {}),
    lightingMood: mood,
    keyIntensity: typeof obj.keyIntensity === 'number' ? obj.keyIntensity : 2.3,
    rimIntensity: typeof obj.rimIntensity === 'number' ? obj.rimIntensity : 1.1,
    ambientIntensity: typeof obj.ambientIntensity === 'number' ? obj.ambientIntensity : 0.9,
    sunAzimuth: typeof obj.sunAzimuth === 'number' ? obj.sunAzimuth : 42,
    sunElevation: typeof obj.sunElevation === 'number' ? obj.sunElevation : 54,
    exposure: typeof obj.exposure === 'number' ? obj.exposure : 1.06,
    lightingTrack: Array.isArray(obj.lightingTrack) ? obj.lightingTrack : [],
    ...(mapTrack.length > 0 ? { mapTrack } : {}),
    ...(sfxTrack.length > 0 ? { sfxTrack } : {}),
    ...(screenEffects.length > 0 ? { screenEffects } : {}),
    ...(chapters.length > 0 ? { chapters } : {}),
    stageLights: Array.isArray(obj.stageLights) ? obj.stageLights : [],
    actors: obj.actors.map((a) => sanitizeActorConfig(a)),
    cameraTrack: obj.cameraTrack,
    subtitles: sanitizedSubtitles,
    ...(obj.captionSettings
      ? { captionSettings: resolveCaptionSettings(obj.captionSettings) }
      : {}),
    ...(obj.narratorSettings
      ? { narratorSettings: resolveNarratorSettings(obj.narratorSettings) }
      : {}),
    ...(typeof obj.activeCinematicPreset === 'string' &&
    (CINEMATIC_PRESET_IDS as string[]).includes(obj.activeCinematicPreset)
      ? { activeCinematicPreset: obj.activeCinematicPreset as CinematicPresetId }
      : {}),
    ...(typeof obj.customTranscriptText === 'string' &&
    obj.customTranscriptText.trim().length > 0
      ? { customTranscriptText: obj.customTranscriptText.slice(0, 20000) }
      : {}),
  };
}
