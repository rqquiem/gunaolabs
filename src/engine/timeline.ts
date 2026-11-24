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
  LightingKeyframe,
  PoseClipId,
  R6_BODY_PARTS,
  R6BodyPartId,
  SceneActorConfig,
  StageLightConfig,
  SubtitleCue,
  Vec3Tuple,
} from './types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function applyEasing(t: number, easing: EasingType): number {
  const u = clamp(t, 0, 1);
  switch (easing) {
    case 'step':
      return u >= 1 ? 1 : 0;
    case 'linear':
      return u;
    case 'easeOutCubic':
      return 1 - Math.pow(1 - u, 3);
    case 'easeInOut':
    default:
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }
}

export function lerp(a: number, b: number, t: number): number {
  if (t <= 0) return a;
  if (t >= 1) return b;
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
): EvaluatedPose {
  const joints = createZeroR6Joints();
  const phase = time * Math.max(0.1, speed);
  let torsoOffsetY = 0;

  switch (clip) {
    case 'idle': {
      const breath = Math.sin(phase * 2.2);
      const look = Math.sin(phase * 0.9);
      torsoOffsetY = breath * 0.015;
      joints.torso = [0.02 + breath * 0.015, look * 0.04, 0];
      joints.head = [-0.02 + breath * 0.02, look * 0.1, 0];
      joints.leftArm = [0.04 + breath * 0.03, 0, 0.08];
      joints.rightArm = [-0.04 - breath * 0.03, 0, -0.08];
      joints.leftLeg = [0, 0, 0.02];
      joints.rightLeg = [0, 0, -0.02];
      break;
    }
    case 'walk': {
      const w = phase * 5.6;
      const swing = Math.sin(w);
      torsoOffsetY = Math.abs(Math.sin(w)) * 0.05;
      joints.torso = [0.05, swing * 0.05, Math.cos(w) * 0.03];
      joints.head = [-0.04, -swing * 0.03, 0];
      joints.leftLeg = [swing * 0.72, 0, 0.02];
      joints.rightLeg = [-swing * 0.72, 0, -0.02];
      joints.leftArm = [-swing * 0.65, 0, 0.06];
      joints.rightArm = [swing * 0.65, 0, -0.06];
      break;
    }
    case 'run': {
      const w = phase * 9.0;
      const swing = Math.sin(w);
      torsoOffsetY = Math.abs(Math.sin(w)) * 0.1;
      joints.torso = [0.18, swing * 0.08, Math.cos(w) * 0.05];
      joints.head = [-0.14, -swing * 0.04, 0];
      joints.leftLeg = [swing * 1.05, 0, 0.03];
      joints.rightLeg = [-swing * 1.05, 0, -0.03];
      joints.leftArm = [-swing * 0.98, 0, 0.1];
      joints.rightArm = [swing * 0.98, 0, -0.1];
      break;
    }
    case 'wave': {
      const osc = Math.sin(phase * 6.5);
      const breath = Math.sin(phase * 2.0);
      torsoOffsetY = breath * 0.012;
      joints.torso = [0, 0.08, -0.03];
      joints.head = [-0.06, -0.08, 0.05];
      joints.leftArm = [0.06, 0, 0.12];
      joints.rightArm = [-0.25, 0.12, -2.55 + osc * 0.28];
      joints.leftLeg = [-0.02, 0, 0.04];
      joints.rightLeg = [0.02, 0, -0.04];
      break;
    }
    case 'hero': {
      const pulse = Math.sin(phase * 1.8) * 0.02;
      torsoOffsetY = -0.02;
      joints.torso = [-0.06 + pulse, -0.18, 0];
      joints.head = [0.04, 0.14, 0];
      joints.leftArm = [0.22, 0.1, 0.35];
      joints.rightArm = [-0.68, -0.12, -0.45];
      joints.leftLeg = [-0.22, 0.08, 0.12];
      joints.rightLeg = [0.24, -0.08, -0.12];
      break;
    }
    case 'sit': {
      const breath = Math.sin(phase * 2.0);
      torsoOffsetY = -0.52 + breath * 0.01;
      joints.torso = [-0.08, 0, 0];
      joints.head = [0.06, Math.sin(phase * 0.8) * 0.08, 0];
      joints.leftLeg = [-1.45, 0.08, 0.06];
      joints.rightLeg = [-1.45, -0.08, -0.06];
      joints.leftArm = [-0.45, 0, 0.14];
      joints.rightArm = [-0.45, 0, -0.14];
      break;
    }
    case 'swordSwing': {
      const cycle = (phase * 1.8) % (Math.PI * 2);
      const slash = Math.sin(cycle);
      torsoOffsetY = Math.abs(Math.cos(cycle)) * 0.04;
      joints.torso = [0.12, slash * 0.42, 0];
      joints.head = [-0.08, -slash * 0.28, 0];
      joints.rightArm = [-1.35 + slash * 1.15, 0.15, -0.35 - slash * 0.25];
      joints.leftArm = [0.35 - slash * 0.2, 0, 0.35];
      joints.leftLeg = [-0.25, 0, 0.08];
      joints.rightLeg = [0.28, 0, -0.08];
      break;
    }
    case 'custom':
    default:
      break;
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

  return { joints, torsoOffsetY };
}

function blendPoses(a: EvaluatedPose, b: EvaluatedPose, t: number): EvaluatedPose {
  const joints = createZeroR6Joints();
  for (const part of R6_BODY_PARTS) {
    joints[part] = lerpEulerVec3(a.joints[part], b.joints[part], t);
  }
  return {
    joints,
    torsoOffsetY: lerp(a.torsoOffsetY, b.torsoOffsetY, t),
  };
}

function sortByTime<T extends { time: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.time - b.time);
}

export function evaluateActorAt(
  actor: SceneActorConfig,
  time: number,
): EvaluatedActorState {
  const sorted = sortByTime(actor.keyframes);
  if (sorted.length === 0) {
    return {
      actorId: actor.id,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      clip: 'idle',
      pose: evaluateProceduralClipPose('idle', time, 1),
    };
  }

  if (time <= sorted[0].time) {
    const first = sorted[0];
    return {
      actorId: actor.id,
      position: [...first.position],
      rotation: [...first.rotation],
      scale: [...first.scale],
      clip: first.clip,
      pose: evaluateProceduralClipPose(
        first.clip,
        time,
        first.clipSpeed,
        first.customJoints,
      ),
    };
  }

  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    return {
      actorId: actor.id,
      position: [...last.position],
      rotation: [...last.rotation],
      scale: [...last.scale],
      clip: last.clip,
      pose: evaluateProceduralClipPose(
        last.clip,
        time,
        last.clipSpeed,
        last.customJoints,
      ),
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

  const poseA = evaluateProceduralClipPose(
    prev.clip,
    time,
    prev.clipSpeed,
    prev.customJoints,
  );
  const poseB = evaluateProceduralClipPose(
    next.clip,
    time,
    next.clipSpeed,
    next.customJoints,
  );

  const poseBlend = prev.easing === 'step' ? easedT : clamp((rawT - 0.15) / 0.7, 0, 1);
  const pose =
    prev.clip === next.clip && !prev.customJoints && !next.customJoints
      ? poseA
      : blendPoses(poseA, poseB, applyEasing(poseBlend, prev.easing));

  return {
    actorId: actor.id,
    position: lerpVec3(prev.position, next.position, easedT),
    rotation: lerpEulerVec3(prev.rotation, next.rotation, easedT),
    scale: lerpVec3(prev.scale, next.scale, easedT),
    clip: rawT < 0.5 ? prev.clip : next.clip,
    pose,
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
    // Respect step cuts as spline segment boundaries so hard cuts do not warp adjacent shots
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
      easedT,
    );
    const t0 = resolveCameraShotTarget(p0Kf, actorsMap);
    const t3 = resolveCameraShotTarget(p3Kf, actorsMap);
    target = catmullRomVec3(t0, prevTarget, nextTarget, t3, easedT);
  } else {
    position = lerpVec3(prev.position, next.position, easedT);
    target = lerpVec3(prevTarget, nextTarget, easedT);
  }

  const shakeAmp = lerp(
    prev.shakeIntensity ?? 0,
    next.shakeIntensity ?? 0,
    easedT,
  );
  const shakeFreq = lerp(
    prev.shakeFrequency ?? 8,
    next.shakeFrequency ?? 8,
    easedT,
  );
  const shake = computeCameraShakeOffset(time, shakeAmp, shakeFreq);

  return {
    position,
    target,
    fov: lerp(prev.fov, next.fov, easedT),
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
  const easedT = applyEasing((time - prev.time) / span, prev.easing);

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
    actors[actor.id] = evaluateActorAt(actor, clampedTime);
  }
  return {
    time: clampedTime,
    actors,
    camera: evaluateCameraAt(project.cameraTrack, clampedTime, actors),
    lighting: evaluateLightingAt(project, clampedTime),
    subtitle: evaluateSubtitleAt(project.subtitles, clampedTime),
  };
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
        nextKfs[existingIdx] = normalized;
      } else {
        nextKfs.push(normalized);
      }
      nextKfs.sort((a, b) => a.time - b.time);
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
    nextTrack[existingIdx] = normalized;
  } else {
    nextTrack.push(normalized);
  }
  nextTrack.sort((a, b) => a.time - b.time);
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
    nextTrack[existingIdx] = normalized;
  } else {
    nextTrack.push(normalized);
  }
  nextTrack.sort((a, b) => a.time - b.time);
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
