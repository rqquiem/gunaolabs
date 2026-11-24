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

// =========================================================================
// 3D Sculpted Face & Expression Framework Types
// =========================================================================

export type FaceEyeStyle = 'classic' | 'expressive' | 'hero' | 'cyber' | 'starry';
export type FaceBrowStyle = 'rounded' | 'bold' | 'sharp' | 'arched' | 'none';
export type FaceMouthStyle = 'sculpted' | 'openCavity' | 'smirk' | 'cyber';
export type FaceCheekStyle = 'none' | 'blush' | 'freckles' | 'bandage' | 'scar';

export type FaceGazeTarget = 'forward' | 'camera' | 'manual' | string;

export interface FaceRigConfig {
  eyeStyle: FaceEyeStyle;
  browStyle: FaceBrowStyle;
  mouthStyle: FaceMouthStyle;
  cheekStyle: FaceCheekStyle;
  eyeColor: string;
  browColor: string;
  mouthColor: string;
  accentColor: string;
  autoBlink: boolean;
  autoLipSync: boolean;
  gazeTarget: FaceGazeTarget;
}

export type ExpressionPresetId =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'angry'
  | 'sad'
  | 'surprised'
  | 'smug'
  | 'wink'
  | 'determined'
  | 'focused';

export const EXPRESSION_PRESET_IDS: ExpressionPresetId[] = [
  'neutral',
  'happy',
  'excited',
  'angry',
  'sad',
  'surprised',
  'smug',
  'wink',
  'determined',
  'focused',
];

export const EXPRESSION_PRESET_LABELS: Record<ExpressionPresetId, string> = {
  neutral: 'Neutral',
  happy: 'Happy',
  excited: 'Excited',
  angry: 'Angry',
  sad: 'Sad',
  surprised: 'Surprised',
  smug: 'Smug',
  wink: 'Wink',
  determined: 'Determined',
  focused: 'Focused',
};

export interface ExpressionParams {
  smile: number; // -1 (frown) .. 1 (big grin)
  browRaise: number; // -1 (lowered) .. 1 (raised high)
  browFurrow: number; // 0 (flat) .. 1 (angled angry/intense)
  eyeWide: number; // -1 (squint) .. 1 (wide open)
  blinkL: number; // 0 (open) .. 1 (closed)
  blinkR: number; // 0 (open) .. 1 (closed)
  jawOpen: number; // 0 (closed) .. 1 (wide open)
  mouthWidth: number; // -1 (narrow/O) .. 1 (wide)
  mouthSkew: number; // -1 (left smirk) .. 1 (right smirk)
  gazeX: number; // -1 (right) .. 1 (left)
  gazeY: number; // -1 (down) .. 1 (up)
  blush: number; // 0 .. 1
}

export interface FaceKeyframe {
  id: string;
  time: number;
  preset: ExpressionPresetId;
  overrides?: Partial<ExpressionParams>;
  easing: EasingType;
}

export interface EvaluatedFaceState {
  preset: ExpressionPresetId;
  params: ExpressionParams;
  isSpeaking: boolean;
}

// =========================================================================
// Enhanced R6 Animation Framework Types
// =========================================================================

export type PoseClipId =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'crouch'
  | 'wave'
  | 'hero'
  | 'sit'
  | 'swordSwing'
  | 'cheer'
  | 'talkGesture'
  | 'point'
  | 'block'
  | 'victory'
  | 'custom';

export const POSE_CLIP_LABELS: Record<PoseClipId, string> = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Sprint',
  jump: 'Jump',
  crouch: 'Crouch',
  wave: 'Wave',
  hero: 'Hero',
  sit: 'Sit',
  swordSwing: 'Slash',
  cheer: 'Cheer',
  talkGesture: 'Talk',
  point: 'Point',
  block: 'Guard',
  victory: 'Victory',
  custom: 'Custom',
};

export type UpperBodyClipId =
  | 'none'
  | 'wave'
  | 'swordSwing'
  | 'talkGesture'
  | 'point'
  | 'cheer'
  | 'block';

export const UPPER_BODY_CLIPS: UpperBodyClipId[] = [
  'none',
  'wave',
  'swordSwing',
  'talkGesture',
  'point',
  'cheer',
  'block',
];

export const UPPER_BODY_CLIP_LABELS: Record<UpperBodyClipId, string> = {
  none: 'None (Full Base)',
  wave: 'Wave Hand',
  swordSwing: 'Sword Slash',
  talkGesture: 'Talk Gesture',
  point: 'Point Ahead',
  cheer: 'Cheer Arms',
  block: 'Shield Guard',
};

export type EasingType =
  | 'linear'
  | 'easeInOut'
  | 'easeOutCubic'
  | 'easeInBack'
  | 'easeOutBack'
  | 'spring'
  | 'step';

export const EASING_OPTIONS: { id: EasingType; label: string }[] = [
  { id: 'easeInOut', label: 'Smooth' },
  { id: 'easeOutCubic', label: 'Ease Out' },
  { id: 'linear', label: 'Linear' },
  { id: 'easeInBack', label: 'Anticipate' },
  { id: 'easeOutBack', label: 'Overshoot' },
  { id: 'spring', label: 'Spring' },
  { id: 'step', label: 'Step / Cut' },
];

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
  upperBodyClip?: UpperBodyClipId;
  upperBodyWeight?: number;
  blendDuration?: number;
  hipTilt?: Vec3Tuple;
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
  faceConfig?: FaceRigConfig;
  faceKeyframes?: FaceKeyframe[];
  lookAtTarget?: 'none' | 'camera' | string;
  lookAtWeight?: number;
  secondaryMotion?: boolean;
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
  actorId?: string | null;
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
  hipOffset: Vec3Tuple;
  hipTilt: Vec3Tuple;
  squashY: number;
}

export interface SecondaryMotionState {
  capePitch: number;
  capeRoll: number;
  wingSpread: number;
  hatLagX: number;
  hatLagZ: number;
  propSwing: number;
}

export interface EvaluatedActorState {
  actorId: string;
  position: Vec3Tuple;
  rotation: Vec3Tuple;
  scale: Vec3Tuple;
  clip: PoseClipId;
  upperBodyClip: UpperBodyClipId;
  upperBodyWeight: number;
  pose: EvaluatedPose;
  face: EvaluatedFaceState;
  secondaryMotion: SecondaryMotionState;
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

export type PoseCategory =
  | 'idle'
  | 'action'
  | 'combat'
  | 'social'
  | 'cinematic'
  | 'custom';

export const POSE_CATEGORIES: PoseCategory[] = [
  'idle',
  'action',
  'combat',
  'social',
  'cinematic',
  'custom',
];

export const POSE_CATEGORY_LABELS: Record<PoseCategory, string> = {
  idle: 'Idle',
  action: 'Action',
  combat: 'Combat',
  social: 'Social',
  cinematic: 'Cinematic',
  custom: 'Custom',
};

export interface PoseExpressionBundle {
  preset: ExpressionPresetId;
  overrides?: Partial<ExpressionParams>;
}

export interface PosePreset {
  id: string;
  name: string;
  category: PoseCategory;
  builtIn: boolean;
  joints: Record<R6BodyPartId, Vec3Tuple>;
  hipTilt: Vec3Tuple;
  expression?: PoseExpressionBundle;
}

