export type BuiltInMapId =
  | 'crossroads'
  | 'town'
  | 'robloxianTown'
  | 'robloxCity'
  | 'cozyBedroom'
  | 'skyObby'
  | 'lunarOutpost'
  | 'dojoCourtyard';

export type EnvironmentId = BuiltInMapId | 'custom';

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

export type CoreOrnamentSlot = 'head' | 'hat' | 'face' | 'arm' | 'back' | 'legs';
export type ExtendedOrnamentSlot = 'neck' | 'shoulder' | 'waist';
export type OrnamentSlot = CoreOrnamentSlot | ExtendedOrnamentSlot;

export const ORNAMENT_SLOTS: OrnamentSlot[] = [
  'head',
  'hat',
  'face',
  'neck',
  'shoulder',
  'back',
  'waist',
  'arm',
  'legs',
];

export const WEARABLE_ACCESSORY_SLOTS: Exclude<OrnamentSlot, 'face'>[] = [
  'hat',
  'head',
  'neck',
  'shoulder',
  'back',
  'waist',
  'arm',
  'legs',
];

export const ORNAMENT_SLOT_LABELS: Record<OrnamentSlot, string> = {
  head: 'Eyewear',
  hat: 'Hat',
  face: 'Face',
  neck: 'Neck',
  shoulder: 'Shoulder',
  back: 'Back',
  waist: 'Waist',
  arm: 'Arm',
  legs: 'Legs',
};

export interface AccessoryFit {
  offsetY: number; // -0.35 .. +0.35 studs
  offsetZ: number; // -0.30 .. +0.30 studs
  tiltX: number; // -30 .. +30 deg
  tiltZ: number; // -30 .. +30 deg
  scale: number; // 0.75 .. 1.35
}

export interface OrnamentSelection {
  id: string;
  color: string;
  accentColor?: string;
  fit?: Partial<AccessoryFit>;
}

export type R6Ornaments = Record<CoreOrnamentSlot, OrnamentSelection> &
  Partial<Record<ExtendedOrnamentSlot, OrnamentSelection>>;

export type NormalizedR6Ornaments = Record<OrnamentSlot, OrnamentSelection>;

export type R6BodyColors = Record<R6BodyPartId, string>;

// =========================================================================
// Hair Framework & Layered Clothing Types
// =========================================================================

export type HairStyleId =
  | 'none'
  | 'longWavyPart'
  | 'spiky'
  | 'swept'
  | 'bob'
  | 'ponytail'
  | 'curly'
  | 'mohawk'
  | 'twinTails'
  | 'sidePart'
  | 'undercut'
  | 'braids'
  | 'wolfCut'
  | 'messyFluffy'
  | 'topBun'
  | 'texturedFade';

export type HairHighlightPattern = 'none' | 'tips' | 'streaks' | 'ombre';

export type HairBangsStyleId =
  | 'auto'
  | 'curtain'
  | 'swept'
  | 'blunt'
  | 'wispy'
  | 'middleArch'
  | 'none';

export type HairAccessoryId =
  | 'none'
  | 'hibiscus'
  | 'ribbonBow'
  | 'starClips'
  | 'headband'
  | 'catEars';

export type HairFinishId = 'silky' | 'matte' | 'glossy';

export type HatTuckProfile = 'none' | 'brim' | 'crown' | 'fullCover';

export interface HairConfig {
  styleId: HairStyleId;
  primaryColor: string;
  highlightColor: string;
  highlightPattern: HairHighlightPattern;
  volume: number; // 0.8 .. 1.25
  bangsStyle?: HairBangsStyleId;
  accessoryId?: HairAccessoryId;
  accessoryColor?: string;
  finish?: HairFinishId;
  /** Legacy compatibility alias for accessoryId === 'hibiscus' */
  flowerAccessory?: boolean;
}

export type ShirtStyleId =
  | 'none'
  | 'tshirt'
  | 'hoodie'
  | 'jacket'
  | 'vest'
  | 'knightTunic'
  | 'tracksuit'
  | 'suitCoat'
  | 'wizardRobe'
  | 'varsity'
  | 'cyberSuit'
  | 'sweater'
  | 'turtleneck'
  | 'buttonUp'
  | 'polo'
  | 'cropTop';

export type OuterwearStyleId =
  | 'none'
  | 'pufferVest'
  | 'pufferJacket'
  | 'cardigan'
  | 'denimJacket'
  | 'trenchCoat'
  | 'bomberJacket'
  | 'blazer'
  | 'hoodedParka'
  | 'overalls';

export type SleeveMode = 'auto' | 'short' | 'long' | 'sleeveless';

export type PantsStyleId =
  | 'none'
  | 'jeans'
  | 'cargo'
  | 'slacks'
  | 'shorts'
  | 'knightGreaves'
  | 'trackPants'
  | 'cyberLeggings'
  | 'pleatedSkirt'
  | 'midiSkirt'
  | 'baggyCargo'
  | 'joggers'
  | 'flaredJeans';

export type FootwearId =
  | 'none'
  | 'sneakers'
  | 'highTops'
  | 'boots'
  | 'chelseaBoots'
  | 'platformShoes'
  | 'loafers'
  | 'armoredBoots'
  | 'sandals';

export type FabricMaterialId =
  | 'auto'
  | 'cotton'
  | 'denim'
  | 'knit'
  | 'leather'
  | 'quilted'
  | 'satin'
  | 'armor';

export type ClothingPatternId =
  | 'solid'
  | 'stripes'
  | 'plaid'
  | 'colorblock'
  | 'checker'
  | 'camo'
  | 'argyle';

export type BeltStyleId = 'auto' | 'none' | 'leather' | 'chain' | 'sash';

export interface ClothingConfig {
  shirtId: ShirtStyleId;
  shirtColor: string;
  shirtAccent: string;
  sleeveMode: SleeveMode;
  topFabric?: FabricMaterialId;
  topPattern?: ClothingPatternId;
  outerwearId?: OuterwearStyleId;
  outerwearColor?: string;
  outerwearAccent?: string;
  outerwearFabric?: FabricMaterialId;
  outerwearOpen?: boolean;
  pantsId: PantsStyleId;
  pantsColor: string;
  pantsAccent: string;
  bottomFabric?: FabricMaterialId;
  bottomPattern?: ClothingPatternId;
  beltStyle?: BeltStyleId;
  footwearId: FootwearId;
  shoeColor?: string;
  shoeAccent?: string;
}

export type PropKind =
  | 'spawnpad'
  | 'crate'
  | 'tree'
  | 'speeder'
  | 'chest'
  | 'barrel'
  | 'flag'
  | 'bench'
  | 'targetDummy'
  | 'campfire'
  | 'pedestal'
  | 'lanternPost'
  | 'gamerBed'
  | 'pcDesk'
  | 'areaRug'
  | 'bookshelf'
  | 'suburbanHouse'
  | 'picketFence'
  | 'streetLamp'
  | 'mailbox'
  | 'rainingCatsDogs'
  | 'steelUmbrella'
  | 'beanWaterfall'
  | 'africanElephant'
  | 'iceFeet'
  | 'plasterCast'
  | 'stretcher'
  | 'clydesdalePlatter'
  | 'flyingPigs'
  | 'grocerySpill'
  | 'parkedSedan'
  | 'sightseeingBus'
  | 'heldItem';

export type PropCategory = 'bedroom' | 'town' | 'furniture' | 'battle' | 'classic';

export type ItemCategory = 'gear' | 'scifiFantasy' | 'everyday' | 'props';

export type ItemId =
  | 'linkedSword'
  | 'laserBlaster'
  | 'bloxyCola'
  | 'pizzaSlice'
  | 'speedCoil'
  | 'gravityHammer'
  | 'heaterShield'
  | 'arcaneStaff'
  | 'glowLantern'
  | 'energyBlade'
  | 'holoScanner'
  | 'teamFlag'
  | 'camera'
  | 'hairdryer'
  | 'bouquet'
  | 'snowShovel'
  | 'stapler'
  | 'steelUmbrella'
  | 'smartphone'
  | 'icedCoffee'
  | 'gameController'
  | 'electricGuitar'
  | 'microphone'
  | 'flashlight'
  | 'skateboard'
  | 'sprayCan'
  | 'spellbook'
  | 'dragonKatana'
  | 'crystalWand'
  | 'walkieTalkie';

export type HandSlot = 'right' | 'left';
export type HandTargetMode = 'right' | 'left' | 'dual';
export type GripPreset = 'standard' | 'reverse' | 'forearm' | 'carry';
export type ItemEasingMode = 'step' | 'equipPop';

export interface HeldHandItemState {
  itemId: ItemId | 'none';
  primaryColor: string;
  accentColor: string;
  positionOffset: Vec3Tuple;
  rotationDeg: Vec3Tuple;
  scale: number;
  gripPreset: GripPreset;
}

export interface CharacterHeldItems {
  right: HeldHandItemState;
  left: HeldHandItemState;
}

export interface HeldItemKeyframe {
  id: string;
  time: number;
  easing: ItemEasingMode;
  right: HeldHandItemState;
  left: HeldHandItemState;
}

export interface EvaluatedHandItemState extends HeldHandItemState {
  visibilityScale: number;
}

export interface EvaluatedHeldItems {
  right: EvaluatedHandItemState;
  left: EvaluatedHandItemState;
}

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
  hair?: HairConfig;
  clothing?: ClothingConfig;
  faceConfig?: FaceRigConfig;
  faceKeyframes?: FaceKeyframe[];
  heldItems?: CharacterHeldItems;
  heldItemKeyframes?: HeldItemKeyframe[];
  lookAtTarget?: 'none' | 'camera' | string;
  lookAtWeight?: number;
  secondaryMotion?: boolean;
  propKind?: PropKind;
  propItemId?: ItemId;
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

export type SubtitleRole = 'dialogue' | 'voiceover';

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  speaker: string;
  actorId?: string | null;
  text: string;
  role?: SubtitleRole;
}

export type SfxKind =
  | 'thunder'
  | 'catsDogsRain'
  | 'umbrellaClang'
  | 'cafeChatter'
  | 'beanCascade'
  | 'officeSilence'
  | 'staplerCrunch'
  | 'elephantTrumpet'
  | 'weddingOrganScratch'
  | 'iceCrackWhir'
  | 'legSnap'
  | 'ambulanceSiren'
  | 'dinerClatter'
  | 'horseCartNeigh'
  | 'crowdPanicScreech'
  | 'smashCutSilence';

export interface SfxCue {
  id: string;
  time: number;
  kind: SfxKind;
  label?: string;
  duration?: number;
  volume?: number;
}

export interface ScreenEffectKeyframe {
  id: string;
  time: number;
  blackout: number; // 0..1
  easing: EasingType;
}

export const MIN_SCENE_DURATION = 2;
export const MAX_SCENE_DURATION = 600; // 10 minutes max

export interface ChapterMarker {
  id: string;
  time: number;
  title: string;
  color: string;
}

export const CHAPTER_COLORS: string[] = [
  '#00a2ff',
  '#f59e0b',
  '#10b981',
  '#a855f7',
  '#ef4444',
  '#06b6d4',
];

export interface MapKeyframe {
  id: string;
  time: number;
  environment: EnvironmentId;
  mapId?: string;
  customMap?: MapDefinition;
  applyAtmosphere: boolean;
  label: string;
}

export interface EvaluatedStageState {
  environment: EnvironmentId;
  mapId?: string;
  customMap?: MapDefinition;
  lightingMood: LightingMood;
  recommendedLighting?: MapLightingPreset;
  label: string;
}

export interface AnimationProject {
  id: string;
  name: string;
  duration: number;
  fps: number;
  loop: boolean;
  environment: EnvironmentId;
  mapId?: string;
  customMap?: MapDefinition;
  lightingMood: LightingMood;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
  sunAzimuth?: number;
  sunElevation?: number;
  exposure?: number;
  lightingTrack?: LightingKeyframe[];
  mapTrack?: MapKeyframe[];
  sfxTrack?: SfxCue[];
  screenEffects?: ScreenEffectKeyframe[];
  chapters?: ChapterMarker[];
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
  hairPitch: number;
  hairRoll: number;
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
  heldItems?: EvaluatedHeldItems;
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
  stage: EvaluatedStageState;
  subtitle: SubtitleCue | null;
  screenBlackout: number;
}

export type CameraMode = 'orbit' | 'director';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

export type DockTab = 'timeline' | 'scene' | 'character' | 'cutscene' | 'export';

export type VideoResolution = '720p' | '1080p' | 'native';

export type VideoEncoderBackend = 'webcodecs' | 'mediarecorder';

export type VideoExportRangeMode = 'full' | 'chapter' | 'custom';

export interface VideoExportRange {
  mode: VideoExportRangeMode;
  chapterId?: string;
  startSec: number;
  endSec: number;
}

export interface VideoExportOptions {
  resolution: VideoResolution;
  fps: 24 | 30 | 60;
  bitrateMbps: 4 | 8 | 14;
  burnSubtitles: boolean;
  burnLetterbox: boolean;
  streamingMode?: boolean;
  range?: VideoExportRange;
}

export interface VideoRecordingState {
  status: 'idle' | 'recording' | 'processing' | 'ready' | 'error';
  progress: number;
  elapsedSec: number;
  durationSec: number;
  currentFrame: number;
  totalFrames: number;
  encoderBackend: VideoEncoderBackend | null;
  streamedBytes?: number;
  blobUrl: string | null;
  mimeType: string | null;
  fileExtension: 'mp4' | null;
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

// =========================================================================
// Map, Modular Map Builder & Scene Library Framework Types
// =========================================================================

export type MapCategory = 'arena' | 'town' | 'interior' | 'nature' | 'scifi' | 'custom';

export const MAP_CATEGORIES: MapCategory[] = [
  'arena',
  'town',
  'interior',
  'nature',
  'scifi',
  'custom',
];

export const MAP_CATEGORY_LABELS: Record<MapCategory, string> = {
  arena: 'Arena',
  town: 'Town',
  interior: 'Interior',
  nature: 'Nature',
  scifi: 'Sci-Fi',
  custom: 'Custom',
};

export type MapPathStyle =
  | 'none'
  | 'cross'
  | 'plaza'
  | 'runway'
  | 'street'
  | 'cityGrid'
  | 'hardwood';

export type MapPerimeterStyle =
  | 'open'
  | 'trees'
  | 'rocks'
  | 'neonRim'
  | 'picketFence'
  | 'bedroomCorner'
  | 'citySkyline';

export type MapModuleKind =
  | 'tower'
  | 'fortWall'
  | 'archBridge'
  | 'shopFront'
  | 'treeGrove'
  | 'spawnPad'
  | 'crateCluster'
  | 'rampStairs'
  | 'waterPool'
  | 'neonBeacon'
  | 'rockOutcrop'
  | 'pillarGate'
  | 'gamerBed'
  | 'pcDesk'
  | 'areaRug'
  | 'bookshelf'
  | 'suburbanHouse'
  | 'picketFence'
  | 'streetLamp'
  | 'glassSkyscraper'
  | 'brickTower'
  | 'trafficSignal'
  | 'subwayEntrance'
  | 'billboardGantry'
  | 'cityBusStop'
  | 'verbatimSign'
  | 'cafeCounter'
  | 'boardroomSuite'
  | 'weddingAltar'
  | 'theaterWings'
  | 'retroDiner'
  | 'mainStreetSet';

export interface MapBaseplateConfig {
  size: number;
  groundColor: string;
  trimColor: string;
  pathStyle: MapPathStyle;
  studDensity: number;
  perimeter: MapPerimeterStyle;
}

export interface MapModuleInstance {
  id: string;
  kind: MapModuleKind;
  label: string;
  position: Vec3Tuple;
  rotationYDeg: number;
  scale: number;
  primaryColor: string;
  accentColor: string;
}

export interface MapLightingPreset {
  mood: LightingMood;
  sunAzimuth: number;
  sunElevation: number;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
  exposure: number;
}

export interface MapDefinition {
  id: string;
  name: string;
  category: MapCategory;
  builtIn: boolean;
  builtInSourceId?: BuiltInMapId;
  description: string;
  recommendedLighting: MapLightingPreset;
  baseplate: MapBaseplateConfig;
  modules: MapModuleInstance[];
  suggestedCamera?: {
    position: Vec3Tuple;
    target: Vec3Tuple;
    fov: number;
  };
}

export type SceneCategory =
  | 'action'
  | 'comedy'
  | 'showcase'
  | 'template'
  | 'custom';

export const SCENE_CATEGORIES: SceneCategory[] = [
  'action',
  'comedy',
  'showcase',
  'template',
  'custom',
];

export const SCENE_CATEGORY_LABELS: Record<SceneCategory, string> = {
  action: 'Action',
  comedy: 'Comedy',
  showcase: 'Showcase',
  template: 'Template',
  custom: 'Custom',
};

export interface SceneLibraryEntry {
  id: string;
  name: string;
  category: SceneCategory;
  builtIn: boolean;
  description: string;
  savedAt?: string;
  project: AnimationProject;
}


