export type EnvironmentId = 'crossroads' | 'town';

export type LightingMood = 'noon' | 'sunset' | 'midnight' | 'overcast';

export type R6BodyPartId =
  | 'head'
  | 'torso'
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg';

export const R6_BODY_PARTS: R6BodyPartId[] = [
  'head',
  'torso',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg',
];

export const R6_BODY_PART_LABELS: Record<R6BodyPartId, string> = {
  head: 'Head',
  torso: 'Torso',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
};

export type OrnamentSlot = 'head' | 'hat' | 'face' | 'arm' | 'back' | 'legs';

export const ORNAMENT_SLOTS: OrnamentSlot[] = [
  'head',
  'hat',
  'face',
  'arm',
  'back',
  'legs',
];

export const ORNAMENT_SLOT_LABELS: Record<OrnamentSlot, string> = {
  head: 'Head',
  hat: 'Hat',
  face: 'Face',
  arm: 'Arm',
  back: 'Back',
  legs: 'Legs',
};

export interface OrnamentSelection {
  id: string;
  color: string;
}

export type R6Ornaments = Record<OrnamentSlot, OrnamentSelection>;

export type R6BodyColors = Record<R6BodyPartId, string>;

export type PropKind = 'spawnpad' | 'crate' | 'tree' | 'speeder';

export type ActorKind = 'character' | 'prop';

export type PoseClipId =
  | 'idle'
  | 'walk'
  | 'run'
  | 'wave'
  | 'hero'
  | 'sit'
  | 'swordSwing'
  | 'custom';

export const POSE_CLIP_LABELS: Record<PoseClipId, string> = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Sprint',
  wave: 'Wave',
  hero: 'Hero',
  sit: 'Sit',
  swordSwing: 'Slash',
  custom: 'Custom',
};

export type EasingType = 'linear' | 'easeInOut' | 'easeOutCubic' | 'step';

export type CameraPathMode = 'spline' | 'linear';

export type CameraFramingPreset = 'wide' | 'twoShot' | 'closeUp' | 'lowAngle';

export type Vec3Tuple = [number, number, number];

export interface ActorKeyframe {
  id: string;
  time: number;
  position: Vec3Tuple;
  rotation: Vec3Tuple;
  scale: Vec3Tuple;
  clip: PoseClipId;
  clipSpeed: number;
  customJoints?: Partial<Record<R6BodyPartId, Vec3Tuple>>;
  easing: EasingType;
}

export interface SceneActorConfig {
  id: string;
  name: string;
  kind: ActorKind;
  bundleId?: string;
  bodyColors?: R6BodyColors;
  ornaments?: R6Ornaments;
  propKind?: PropKind;
  primaryColor: string;
  accentColor: string;
  keyframes: ActorKeyframe[];
}

export interface CameraKeyframe {
  id: string;
  time: number;
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
  easing: EasingType;
  pathMode?: CameraPathMode;
  trackActorId?: string | null;
  trackOffset?: Vec3Tuple;
  rollDeg?: number;
  shakeIntensity?: number;
  shakeFrequency?: number;
}

export type StageLightType = 'point' | 'spot';

export interface StageLightConfig {
  id: string;
  name: string;
  type: StageLightType;
  color: string;
  intensity: number;
  distance: number;
  angleDeg: number;
  penumbra: number;
  position: Vec3Tuple;
  target: Vec3Tuple;
  enabled: boolean;
  castShadow: boolean;
}

export interface LightingKeyframe {
  id: string;
  time: number;
  sunAzimuth: number;
  sunElevation: number;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
  exposure: number;
  keyColor?: string;
  easing: EasingType;
}

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  speaker: string;
  text: string;
}

export interface AnimationProject {
  id: string;
  name: string;
  duration: number;
  fps: number;
  loop: boolean;
  environment: EnvironmentId;
  lightingMood: LightingMood;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
  sunAzimuth?: number;
  sunElevation?: number;
  exposure?: number;
  lightingTrack?: LightingKeyframe[];
  stageLights?: StageLightConfig[];
  actors: SceneActorConfig[];
  cameraTrack: CameraKeyframe[];
  subtitles: SubtitleCue[];
}

export interface EvaluatedPose {
  joints: Record<R6BodyPartId, Vec3Tuple>;
  torsoOffsetY: number;
}

export interface EvaluatedActorState {
  actorId: string;
  position: Vec3Tuple;
  rotation: Vec3Tuple;
  scale: Vec3Tuple;
  clip: PoseClipId;
  pose: EvaluatedPose;
}

export interface EvaluatedCameraState {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
  rollRad: number;
  shakeOffset: Vec3Tuple;
}

export interface EvaluatedLightingState {
  sunAzimuth: number;
  sunElevation: number;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
  exposure: number;
  keyColor: string | null;
}

export interface EvaluatedFrame {
  time: number;
  actors: Record<string, EvaluatedActorState>;
  camera: EvaluatedCameraState;
  lighting: EvaluatedLightingState;
  subtitle: SubtitleCue | null;
}

export type CameraMode = 'orbit' | 'director';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

export type DockTab = 'timeline' | 'scene' | 'character' | 'cutscene' | 'export';

export type WebmResolution = '720p' | '1080p' | 'native';

export interface WebmExportOptions {
  resolution: WebmResolution;
  fps: 24 | 30 | 60;
  bitrateMbps: 4 | 8 | 14;
  burnSubtitles: boolean;
  burnLetterbox: boolean;
}

export interface WebmRecordingState {
  status: 'idle' | 'recording' | 'processing' | 'ready' | 'error';
  progress: number;
  elapsedSec: number;
  durationSec: number;
  blobUrl: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  error: string | null;
}
