import { evaluateActorFaceAt } from './faceExpressions';
import {
  ActorKeyframe,
  AnimationProject,
  CameraKeyframe,
  EasingType,
  EvaluatedActorState,
  EvaluatedCameraState,
  EvaluatedFrame,
  EvaluatedLightingState,
  EvaluatedPose,
  FaceKeyframe,
  LightingKeyframe,
  PoseClipId,
  R6_BODY_PARTS,
  R6BodyPartId,
  SceneActorConfig,
  SecondaryMotionState,
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

  const isSwinging = clip === 'swordSwing' || upperClip === 'swordSwing';
  const propSwing = isSwinging ? Math.cos(time * 2.2) * 0.14 : Math.sin(time * 3.1) * 0.025;

  return {
    capePitch,
    capeRoll,
    wingSpread: clamp(wingFlap, -0.25, 0.55),
    hatLagX,
    hatLagZ,
    propSwing,
  };
}

export function evaluateActorAt(
  actor: SceneActorConfig,
  time: number,
  subtitles: SubtitleCue[] = [],
): EvaluatedActorState {
  const sorted = sortByTime(actor.keyframes);
  const face = evaluateActorFaceAt(actor, time, subtitles, applyEasing);

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
      position: [6, 3.8, 8],
      target: [0, 1.3, 0],
      fov: 45,
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

  return {
    position,
    target,
    fov: clamp(lerp(prev.fov, next.fov, easedT), 18, 95),
    rollRad:
      lerp(degToRad(prev.rollDeg ?? 0), degToRad(next.rollDeg ?? 0), easedT) +
      shake.rollJitterRad,
    shakeOffset: shake.offset,
  };
}

export function evaluateLightingAt(
  project: AnimationProject,
  time: number,
): EvaluatedLightingState {
  const baseState: EvaluatedLightingState = {
    sunAzimuth: project.sunAzimuth ?? 42,
    sunElevation: project.sunElevation ?? 54,
    keyIntensity: project.keyIntensity,
    rimIntensity: project.rimIntensity,
    ambientIntensity: project.ambientIntensity,
    exposure: project.exposure ?? 1.06,
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

export function evaluateProjectAt(
  project: AnimationProject,
  time: number,
): EvaluatedFrame {
  const clampedTime = clamp(time, 0, project.duration);
  const actors: Record<string, EvaluatedActorState> = {};
  for (const actor of project.actors) {
    actors[actor.id] = evaluateActorAt(actor, clampedTime, project.subtitles);
  }
  return {
    time: clampedTime,
    actors,
    camera: evaluateCameraAt(project.cameraTrack, clampedTime, actors),
    lighting: evaluateLightingAt(project, clampedTime),
    subtitle: evaluateSubtitleAt(project.subtitles, clampedTime),
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

  const env = obj.environment === 'town' ? 'town' : 'crossroads';
  const mood =
    obj.lightingMood === 'sunset' ||
    obj.lightingMood === 'midnight' ||
    obj.lightingMood === 'overcast'
      ? obj.lightingMood
      : 'noon';

  return {
    id: typeof obj.id === 'string' ? obj.id : `proj_${Date.now()}`,
    name: obj.name,
    duration: clamp(obj.duration, 1, 120),
    fps: typeof obj.fps === 'number' ? clamp(obj.fps, 12, 60) : 30,
    loop: typeof obj.loop === 'boolean' ? obj.loop : true,
    environment: env,
    lightingMood: mood,
    keyIntensity: typeof obj.keyIntensity === 'number' ? obj.keyIntensity : 2.3,
    rimIntensity: typeof obj.rimIntensity === 'number' ? obj.rimIntensity : 1.1,
    ambientIntensity: typeof obj.ambientIntensity === 'number' ? obj.ambientIntensity : 0.9,
    sunAzimuth: typeof obj.sunAzimuth === 'number' ? obj.sunAzimuth : 42,
    sunElevation: typeof obj.sunElevation === 'number' ? obj.sunElevation : 54,
    exposure: typeof obj.exposure === 'number' ? obj.exposure : 1.06,
    lightingTrack: Array.isArray(obj.lightingTrack) ? obj.lightingTrack : [],
    stageLights: Array.isArray(obj.stageLights) ? obj.stageLights : [],
    actors: obj.actors,
    cameraTrack: obj.cameraTrack,
    subtitles: Array.isArray(obj.subtitles) ? obj.subtitles : [],
  };
}
