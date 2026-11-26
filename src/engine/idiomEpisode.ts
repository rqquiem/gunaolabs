import {
  AnimationProject,
  CameraKeyframe,
  ChapterMarker,
  CharacterActionKeyframe,
  CharacterModelBuildId,
  CharacterStateKeyframe,
  ClothingConfig,
  FaceKeyframe,
  FaceRigConfig,
  HairConfig,
  HeldItemKeyframe,
  LightingKeyframe,
  MapDefinition,
  MapKeyframe,
  PropKind,
  R6BodyColors,
  R6Ornaments,
  SceneActorConfig,
  ScreenEffectKeyframe,
  SfxCue,
  StageLightConfig,
  SubtitleCue,
  Vec3Tuple,
} from './types';
import { createEmptyCharacterHeldItems, createDefaultHandStateForItem } from './itemCatalog';
import { cloneBundle } from './robloxCatalog';

type OrnamentPatch = {
  hat?: { id: string; color: string; accentColor?: string };
  head?: { id: string; color: string; accentColor?: string };
  neck?: { id: string; color: string; accentColor?: string };
  shoulder?: { id: string; color: string; accentColor?: string };
  arm?: { id: string; color: string; accentColor?: string };
  back?: { id: string; color: string; accentColor?: string };
  waist?: { id: string; color: string; accentColor?: string };
  legs?: { id: string; color: string; accentColor?: string };
};

function makeDefaultOrnaments(patch: OrnamentPatch = {}): R6Ornaments {
  return {
    head: patch.head ?? { id: 'none', color: '#1b2a35', accentColor: '#38bdf8' },
    hat: patch.hat ?? { id: 'none', color: '#1b2a35', accentColor: '#f2f3f3' },
    face: { id: 'smile', color: '#111827', accentColor: '#ffffff' },
    neck: patch.neck ?? { id: 'none', color: '#eab308', accentColor: '#f8fafc' },
    shoulder: patch.shoulder ?? { id: 'none', color: '#38bdf8', accentColor: '#f8fafc' },
    arm: patch.arm ?? { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
    back: patch.back ?? { id: 'none', color: '#1b2a35', accentColor: '#f5cd30' },
    waist: patch.waist ?? { id: 'none', color: '#1e293b', accentColor: '#eab308' },
    legs: patch.legs ?? { id: 'none', color: '#635f62', accentColor: '#f5cd30' },
  };
}

function makeActorWindow(
  idPrefix: string,
  startSec: number,
  endSec: number,
  pos: Vec3Tuple,
  rot: Vec3Tuple,
  scale: Vec3Tuple,
  clip: SceneActorConfig['keyframes'][number]['clip'],
  extraFrames: SceneActorConfig['keyframes'] = [],
  enterEasing: SceneActorConfig['keyframes'][number]['easing'] = 'step',
): SceneActorConfig['keyframes'] {
  const frames: SceneActorConfig['keyframes'] = [];
  if (startSec > 0) {
    frames.push({
      id: `${idPrefix}-pre`,
      time: 0,
      position: pos,
      rotation: rot,
      scale: [0, 0, 0],
      clip: 'idle',
      clipSpeed: 1,
      easing: 'step',
    });
    frames.push({
      id: `${idPrefix}-hide-edge`,
      time: Math.max(0.05, Number((startSec - 0.05).toFixed(2))),
      position: pos,
      rotation: rot,
      scale: [0, 0, 0],
      clip: 'idle',
      clipSpeed: 1,
      easing: 'step',
    });
  }

  const enterFrame: SceneActorConfig['keyframes'][number] = {
    id: `${idPrefix}-enter`,
    time: startSec,
    position: pos,
    rotation: rot,
    scale,
    clip,
    clipSpeed: 1,
    easing: enterEasing,
  };
  frames.push(enterFrame);

  frames.push(...extraFrames);

  if (endSec < 90) {
    // Always hold the final active scale/transform right up to endSec so no actor ever shrinks out of frame
    const lastActive = extraFrames.length > 0 ? extraFrames[extraFrames.length - 1] : enterFrame;
    const holdTime = Number((endSec - 0.02).toFixed(2));
    if (holdTime > lastActive.time) {
      frames.push({
        ...lastActive,
        id: `${idPrefix}-hold-exit`,
        time: holdTime,
        easing: 'step',
      });
    }
    frames.push({
      id: `${idPrefix}-exit`,
      time: endSec,
      position: lastActive.position,
      rotation: lastActive.rotation,
      scale: [0, 0, 0],
      clip: 'idle',
      clipSpeed: 1,
      easing: 'step',
    });
  }

  return frames;
}

function makePropActor(
  id: string,
  name: string,
  propKind: PropKind,
  primaryColor: string,
  accentColor: string,
  keyframes: SceneActorConfig['keyframes'],
): SceneActorConfig {
  return {
    id,
    name,
    kind: 'prop',
    propKind,
    primaryColor,
    accentColor,
    keyframes,
  };
}

function makeCharActor(config: {
  id: string;
  name: string;
  bodyColors: R6BodyColors;
  hair: HairConfig;
  clothing: ClothingConfig;
  ornaments?: R6Ornaments;
  faceStyle?: Partial<FaceRigConfig>;
  keyframes: SceneActorConfig['keyframes'];
  faceKeyframes?: FaceKeyframe[];
  heldItemKeyframes?: HeldItemKeyframe[];
  stateKeyframes?: CharacterStateKeyframe[];
  actionKeyframes?: CharacterActionKeyframe[];
  modelBuild?: CharacterModelBuildId;
  lookAtTarget?: string;
  gazeTarget?: string;
  lookAtWeight?: number;
}): SceneActorConfig {
  const baseBundle = cloneBundle('noob');
  const resolvedLookTarget = config.lookAtTarget ?? 'camera';
  const resolvedGazeTarget = config.gazeTarget ?? resolvedLookTarget;
  return {
    id: config.id,
    name: config.name,
    kind: 'character',
    bundleId: 'noob',
    ...(config.modelBuild ? { modelBuild: config.modelBuild } : {}),
    bodyColors: config.bodyColors,
    hair: config.hair,
    clothing: config.clothing,
    ornaments: config.ornaments ?? makeDefaultOrnaments(),
    faceConfig: {
      ...baseBundle.faceConfig,
      ...config.faceStyle,
      gazeTarget: resolvedGazeTarget,
    },
    faceKeyframes: config.faceKeyframes,
    heldItems: createEmptyCharacterHeldItems(),
    heldItemKeyframes: config.heldItemKeyframes,
    ...(config.stateKeyframes ? { stateKeyframes: config.stateKeyframes } : {}),
    ...(config.actionKeyframes ? { actionKeyframes: config.actionKeyframes } : {}),
    lookAtTarget: resolvedLookTarget,
    lookAtWeight: config.lookAtWeight ?? 0.84,
    secondaryMotion: true,
    primaryColor: config.clothing.shirtColor,
    accentColor: config.clothing.shirtAccent,
    keyframes: config.keyframes,
  };
}

// =========================================================================
// 7 Bespoke Set Maps (embedded inside mapTrack keyframes)
// =========================================================================

const SCENE_1_MAP: MapDefinition = {
  id: 'idiom_map_s1_verbatim',
  name: 'Welcome to Verbatim',
  category: 'town',
  builtIn: false,
  description: 'Stormy small-town entrance framed by Roblox City skyline towers as literal cats and dogs rain from the sky.',
  recommendedLighting: {
    mood: 'overcast',
    sunAzimuth: -25,
    sunElevation: 32,
    keyIntensity: 1.55,
    rimIntensity: 1.25,
    ambientIntensity: 0.72,
    exposure: 0.96,
  },
  baseplate: {
    size: 56,
    groundColor: '#4d8b55',
    trimColor: '#3f7245',
    pathStyle: 'street',
    perimeter: 'citySkyline',
    studDensity: 1.2,
  },
  modules: [
    { id: 's1-sign', kind: 'verbatimSign', label: 'Verbatim Sign', position: [0, 0, -3.1], rotationYDeg: 0, scale: 1, primaryColor: '#78350f', accentColor: '#f43f5e' },
    { id: 's1-house-l', kind: 'suburbanHouse', label: 'Town House L', position: [-9.6, 0, -7.4], rotationYDeg: 14, scale: 1, primaryColor: '#f8fafc', accentColor: '#dc2626' },
    { id: 's1-house-r', kind: 'suburbanHouse', label: 'Town House R', position: [9.6, 0, -7.4], rotationYDeg: -14, scale: 1, primaryColor: '#fef3c7', accentColor: '#2563eb' },
    { id: 's1-cafe-far', kind: 'shopFront', label: 'Verbatim Bakery', position: [-15.5, 0, -11.8], rotationYDeg: 16, scale: 1, primaryColor: '#fed7aa', accentColor: '#b91c1c' },
    { id: 's1-shop-r', kind: 'shopFront', label: 'Idiom Books & Tea', position: [15.5, 0, -11.8], rotationYDeg: -16, scale: 1, primaryColor: '#bae6fd', accentColor: '#0284c7' },
    { id: 's1-tower-far-l', kind: 'glassSkyscraper', label: 'West Skyline Tower', position: [-20.5, 0, -16.5], rotationYDeg: 10, scale: 0.92, primaryColor: '#0284c7', accentColor: '#e0f2fe' },
    { id: 's1-tower-far', kind: 'brickTower', label: 'Uptown Brick Tower', position: [19.5, 0, -16.5], rotationYDeg: -12, scale: 0.95, primaryColor: '#b45309', accentColor: '#38bdf8' },
    { id: 's1-signal', kind: 'trafficSignal', label: 'Entrance Signal R', position: [6.8, 0, -0.35], rotationYDeg: -90, scale: 0.92, primaryColor: '#334155', accentColor: '#22c55e' },
    { id: 's1-signal-l', kind: 'trafficSignal', label: 'Entrance Signal L', position: [-6.8, 0, 6.55], rotationYDeg: 90, scale: 0.92, primaryColor: '#334155', accentColor: '#ef4444' },
    { id: 's1-lamp-l', kind: 'streetLamp', label: 'Entry Lamp L', position: [-5.8, 0, -0.35], rotationYDeg: 0, scale: 1, primaryColor: '#1e293b', accentColor: '#fef08a' },
    { id: 's1-lamp-r', kind: 'streetLamp', label: 'Entry Lamp R', position: [5.6, 0, -0.35], rotationYDeg: 0, scale: 1, primaryColor: '#1e293b', accentColor: '#fef08a' },
    { id: 's1-lamp-far-l', kind: 'streetLamp', label: 'Boulevard Lamp L', position: [-12.4, 0, -0.35], rotationYDeg: 0, scale: 1, primaryColor: '#1e293b', accentColor: '#fef08a' },
    { id: 's1-lamp-far-r', kind: 'streetLamp', label: 'Boulevard Lamp R', position: [12.4, 0, -0.35], rotationYDeg: 0, scale: 1, primaryColor: '#1e293b', accentColor: '#fef08a' },
    { id: 's1-tree-1', kind: 'treeGrove', label: 'Tree Grove L', position: [-6.2, 0, -3.2], rotationYDeg: 0, scale: 1.0, primaryColor: '#6b4226', accentColor: '#27462d' },
    { id: 's1-tree-2', kind: 'treeGrove', label: 'Tree Grove R', position: [6.2, 0, -3.2], rotationYDeg: 34, scale: 1.0, primaryColor: '#6b4226', accentColor: '#27462d' },
    { id: 's1-tree-3', kind: 'treeGrove', label: 'Outer Oaks L', position: [-14.2, 0, -4.4], rotationYDeg: 18, scale: 1.05, primaryColor: '#6b4226', accentColor: '#15803d' },
    { id: 's1-tree-4', kind: 'treeGrove', label: 'Outer Oaks R', position: [14.2, 0, -4.4], rotationYDeg: -22, scale: 1.05, primaryColor: '#6b4226', accentColor: '#15803d' },
  ],
};

const SCENE_2_MAP: MapDefinition = {
  id: 'idiom_map_s2_cafe',
  name: 'Verbatim Coffee Shop',
  category: 'interior',
  builtIn: false,
  description: 'Cozy wood-paneled coffee corner booth, pendant lamps, pastry case, and espresso counter.',
  recommendedLighting: {
    mood: 'sunset',
    sunAzimuth: -35,
    sunElevation: 38,
    keyIntensity: 2.25,
    rimIntensity: 1.15,
    ambientIntensity: 0.94,
    exposure: 1.05,
  },
  baseplate: {
    size: 24,
    groundColor: '#7c4a2d',
    trimColor: '#451a03',
    pathStyle: 'hardwood',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's2-cafe', kind: 'cafeCounter', label: 'Bean Cafe Corner', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#7c4a2d', accentColor: '#dc2626' },
    { id: 's2-lamp', kind: 'streetLamp', label: 'Corner Lamp L', position: [-4.6, 0, -2.6], rotationYDeg: 0, scale: 0.9, primaryColor: '#1e293b', accentColor: '#fbbf24' },
    { id: 's2-lamp-r', kind: 'streetLamp', label: 'Corner Lamp R', position: [5.4, 0, -2.4], rotationYDeg: 0, scale: 0.9, primaryColor: '#1e293b', accentColor: '#fbbf24' },
    { id: 's2-books', kind: 'bookshelf', label: 'Roastery Shelf', position: [-5.8, 0, -1.0], rotationYDeg: 90, scale: 0.95, primaryColor: '#57371d', accentColor: '#f59e0b' },
    { id: 's2-arch', kind: 'pillarGate', label: 'Roastery Brick Arch', position: [-6.4, 0, 1.8], rotationYDeg: 90, scale: 0.85, primaryColor: '#78350f', accentColor: '#fbbf24' },
  ],
};

const SCENE_3_MAP: MapDefinition = {
  id: 'idiom_map_s3_boardroom',
  name: 'Corporate Boardroom',
  category: 'interior',
  builtIn: false,
  description: 'High-rise executive boardroom with mahogany table and floor-to-ceiling city skyline windows.',
  recommendedLighting: {
    mood: 'noon',
    sunAzimuth: 18,
    sunElevation: 62,
    keyIntensity: 2.35,
    rimIntensity: 1.1,
    ambientIntensity: 1.05,
    exposure: 1.06,
  },
  baseplate: {
    size: 24,
    groundColor: '#334155',
    trimColor: '#1e293b',
    pathStyle: 'none',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's3-boardroom', kind: 'boardroomSuite', label: 'Boardroom Suite', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#78350f', accentColor: '#38bdf8' },
    { id: 's3-books-l', kind: 'bookshelf', label: 'Law & Finance Volumes L', position: [-5.4, 0, -3.4], rotationYDeg: 25, scale: 0.92, primaryColor: '#451a03', accentColor: '#38bdf8' },
    { id: 's3-books-r', kind: 'bookshelf', label: 'Quarterly Archives R', position: [5.4, 0, -3.4], rotationYDeg: -25, scale: 0.92, primaryColor: '#451a03', accentColor: '#f59e0b' },
  ],
};

const SCENE_4_MAP: MapDefinition = {
  id: 'idiom_map_s4_wedding',
  name: 'Verbatim Chapel Altar',
  category: 'interior',
  builtIn: false,
  description: 'Sunlit chapel altar with stained glass, floral gold arch, candelabras, and red carpet.',
  recommendedLighting: {
    mood: 'noon',
    sunAzimuth: 25,
    sunElevation: 55,
    keyIntensity: 2.45,
    rimIntensity: 1.15,
    ambientIntensity: 1.06,
    exposure: 1.08,
  },
  baseplate: {
    size: 26,
    groundColor: '#e2e8f0',
    trimColor: '#cbd5e1',
    pathStyle: 'none',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's4-altar', kind: 'weddingAltar', label: 'Church Altar', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#f8fafc', accentColor: '#dc2626' },
    { id: 's4-arch-l', kind: 'pillarGate', label: 'Chapel Nave Arch L', position: [-5.8, 0, -1.8], rotationYDeg: 90, scale: 0.95, primaryColor: '#f8fafc', accentColor: '#eab308' },
  ],
};

const SCENE_5_MAP: MapDefinition = {
  id: 'idiom_map_s5_theater',
  name: 'Theater Backstage Wings',
  category: 'interior',
  builtIn: false,
  description: 'Moody backstage wings with crimson drapes, illuminated vanity mirror, rigging, and truss spotlights.',
  recommendedLighting: {
    mood: 'midnight',
    sunAzimuth: -20,
    sunElevation: 42,
    keyIntensity: 2.1,
    rimIntensity: 1.5,
    ambientIntensity: 0.58,
    exposure: 1.02,
  },
  baseplate: {
    size: 24,
    groundColor: '#291d18',
    trimColor: '#0f172a',
    pathStyle: 'hardwood',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's5-wings', kind: 'theaterWings', label: 'Theater Backstage', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#991b1b', accentColor: '#fbbf24' },
    { id: 's5-props-shelf', kind: 'bookshelf', label: 'Backstage Prop Rack', position: [5.4, 0, -2.6], rotationYDeg: -35, scale: 0.9, primaryColor: '#451a03', accentColor: '#ef4444' },
  ],
};

const SCENE_6_MAP: MapDefinition = {
  id: 'idiom_map_s6_diner',
  name: 'Verbatim Retro Diner',
  category: 'interior',
  builtIn: false,
  description: 'Checkered retro diner with glowing jukebox, chrome pendant lamps, pie dome, and swinging kitchen doors.',
  recommendedLighting: {
    mood: 'sunset',
    sunAzimuth: 42,
    sunElevation: 48,
    keyIntensity: 2.3,
    rimIntensity: 1.25,
    ambientIntensity: 0.95,
    exposure: 1.06,
  },
  baseplate: {
    size: 24,
    groundColor: '#475569',
    trimColor: '#dc2626',
    pathStyle: 'none',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's6-diner', kind: 'retroDiner', label: 'Retro Diner Set', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#dc2626', accentColor: '#0ea5e9' },
  ],
};

const SCENE_7_MAP: MapDefinition = {
  id: 'idiom_map_s7_mainstreet',
  name: 'Verbatim Main Street',
  category: 'town',
  builtIn: false,
  description: 'Bustling town avenue lined with colorful storefronts, bus shelter, billboard, and downtown city skyline.',
  recommendedLighting: {
    mood: 'noon',
    sunAzimuth: 46,
    sunElevation: 56,
    keyIntensity: 2.45,
    rimIntensity: 1.15,
    ambientIntensity: 1.02,
    exposure: 1.07,
  },
  baseplate: {
    size: 56,
    groundColor: '#94a3b8',
    trimColor: '#475569',
    pathStyle: 'street',
    perimeter: 'citySkyline',
    studDensity: 1.2,
  },
  modules: [
    { id: 's7-street', kind: 'mainStreetSet', label: 'Verbatim Main St', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#94a3b8', accentColor: '#0284c7' },
    { id: 's7-tower-l', kind: 'glassSkyscraper', label: 'Midtown Glass Tower', position: [-16.5, 0, -13.5], rotationYDeg: 8, scale: 0.95, primaryColor: '#0284c7', accentColor: '#e0f2fe' },
    { id: 's7-tower-r', kind: 'brickTower', label: 'Avenue Brick Tower', position: [16.5, 0, -13.5], rotationYDeg: -8, scale: 0.95, primaryColor: '#b45309', accentColor: '#f59e0b' },
    { id: 's7-east-shop', kind: 'shopFront', label: 'East Boulevard Corner Shop', position: [17.5, 0, 0.8], rotationYDeg: -90, scale: 1.05, primaryColor: '#dc2626', accentColor: '#fef08a' },
    { id: 's7-east-tower', kind: 'glassSkyscraper', label: 'East Vista Skyscraper', position: [22.5, 0, 3.2], rotationYDeg: -90, scale: 0.95, primaryColor: '#1e3a8a', accentColor: '#38bdf8' },
    { id: 's7-south-shop', kind: 'suburbanHouse', label: 'South Avenue Townhouse', position: [10.6, 0, 12.2], rotationYDeg: 180, scale: 1, primaryColor: '#fef3c7', accentColor: '#dc2626' },
    { id: 's7-billboard', kind: 'billboardGantry', label: 'Verbatim City Board', position: [10.5, 0, -3.8], rotationYDeg: -22, scale: 0.85, primaryColor: '#1e293b', accentColor: '#00a2ff' },
    { id: 's7-signal', kind: 'trafficSignal', label: 'Main St Traffic Light E', position: [8.4, 0, -0.35], rotationYDeg: -90, scale: 0.95, primaryColor: '#334155', accentColor: '#22c55e' },
    { id: 's7-signal-s', kind: 'trafficSignal', label: 'Main St Traffic Light S', position: [3.6, 0, 6.55], rotationYDeg: -90, scale: 0.95, primaryColor: '#334155', accentColor: '#ef4444' },
    { id: 's7-lamp-l', kind: 'streetLamp', label: 'Street Lamp L', position: [-6.8, 0, -0.35], rotationYDeg: 0, scale: 1, primaryColor: '#1b2a35', accentColor: '#fef08a' },
    { id: 's7-lamp-r', kind: 'streetLamp', label: 'Street Lamp R', position: [5.8, 0, -0.35], rotationYDeg: 0, scale: 1, primaryColor: '#1b2a35', accentColor: '#fef08a' },
    { id: 's7-lamp-s1', kind: 'streetLamp', label: 'South Curb Lamp W', position: [-4.8, 0, 6.55], rotationYDeg: 180, scale: 1, primaryColor: '#1b2a35', accentColor: '#fef08a' },
    { id: 's7-lamp-s2', kind: 'streetLamp', label: 'South Curb Lamp E', position: [6.8, 0, 6.55], rotationYDeg: 180, scale: 1, primaryColor: '#1b2a35', accentColor: '#fef08a' },
    { id: 's7-tree-r', kind: 'treeGrove', label: 'Sidewalk Oaks E', position: [14.2, 0, -2.6], rotationYDeg: 24, scale: 0.95, primaryColor: '#6b4226', accentColor: '#15803d' },
    { id: 's7-tree-s', kind: 'treeGrove', label: 'South Boulevard Oaks', position: [13.5, 0, 8.8], rotationYDeg: -32, scale: 0.95, primaryColor: '#6b4226', accentColor: '#15803d' },
  ],
};

// =========================================================================
// Cast Skin Palettes & Reworked 18-Character Roster
// =========================================================================

const SKIN_LIGHT: R6BodyColors = {
  head: '#f4c7a1',
  torso: '#334155',
  leftArm: '#f4c7a1',
  rightArm: '#f4c7a1',
  leftLeg: '#1e293b',
  rightLeg: '#1e293b',
};

const SKIN_WARM: R6BodyColors = {
  head: '#cc8e69',
  torso: '#334155',
  leftArm: '#cc8e69',
  rightArm: '#cc8e69',
  leftLeg: '#1e293b',
  rightLeg: '#1e293b',
};

const SKIN_TAN: R6BodyColors = {
  head: '#eab892',
  torso: '#334155',
  leftArm: '#eab892',
  rightArm: '#eab892',
  leftLeg: '#1e293b',
  rightLeg: '#1e293b',
};

const SKIN_OLIVE: R6BodyColors = {
  head: '#dfa878',
  torso: '#334155',
  leftArm: '#dfa878',
  rightArm: '#dfa878',
  leftLeg: '#1e293b',
  rightLeg: '#1e293b',
};

const SKIN_DEEP: R6BodyColors = {
  head: '#8d553a',
  torso: '#1e293b',
  leftArm: '#8d553a',
  rightArm: '#8d553a',
  leftLeg: '#0f172a',
  rightLeg: '#0f172a',
};

const ACTORS: SceneActorConfig[] = [
  // 1. Local Man (Scene 1 steel umbrella + Scene 7 panicking local)
  makeCharActor({
    id: 'idiom-man-umbrella',
    name: 'Local Citizen',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'texturedFade', primaryColor: '#3b2416', highlightColor: '#8f3622', highlightPattern: 'tips', volume: 1.06, finish: 'silky' },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'bold',
      mouthStyle: 'sculpted',
      cheekStyle: 'none',
      eyeColor: '#1e3a8a',
    },
    clothing: {
      shirtId: 'sweater',
      shirtColor: '#f8fafc',
      shirtAccent: '#93c5fd',
      sleeveMode: 'long',
      topFabric: 'knit',
      topPattern: 'stripes',
      outerwearId: 'trenchCoat',
      outerwearColor: '#c28b59',
      outerwearAccent: '#57371d',
      outerwearFabric: 'cotton',
      outerwearOpen: true,
      pantsId: 'jeans',
      pantsColor: '#1e3a8a',
      pantsAccent: '#94a3b8',
      bottomFabric: 'denim',
      footwearId: 'chelseaBoots',
      shoeColor: '#3b2416',
      shoeAccent: '#18181b',
    },
    ornaments: makeDefaultOrnaments({
      head: { id: 'halfRim', color: '#1e293b', accentColor: '#bae6fd' },
      neck: { id: 'knitScarf', color: '#1d4ed8', accentColor: '#e2e8f0' },
      arm: { id: 'smartwatch', color: '#181c24', accentColor: '#38bdf8' },
      waist: { id: 'messengerBag', color: '#57371d', accentColor: '#eab308' },
    }),
    lookAtTarget: 'prop-cats-dogs',
    gazeTarget: 'prop-cats-dogs',
    lookAtWeight: 0.82,
    keyframes: [
      { id: 'man-s1-0', time: 0, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'wave', upperBodyWeight: 0.45, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'man-s1-talk', time: 3.4, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.92, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'man-s1-bend', time: 4.35, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'crouch', clipSpeed: 1, customJoints: { rightArm: [-0.50, 0, 0.24], torso: [0.10, 0.12, 0] }, easing: 'easeInOut' },
      { id: 'man-s1-grab', time: 5.05, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'crouch', clipSpeed: 1, customJoints: { rightArm: [-0.50, 0, 0.24], torso: [0.10, 0.12, 0] }, easing: 'easeOutBack' },
      { id: 'man-s1-raise', time: 5.25, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.20, 0, 0.28], torso: [0.04, 0.18, 0], head: [0.22, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'man-s1-clang1', time: 5.73, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.10, 0, 0.28], leftArm: [-0.45, 0, -0.25], torso: [0.08, 0.18, 0], head: [0.14, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'man-s1-recover1', time: 5.95, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.20, 0, 0.28], torso: [0.04, 0.18, 0], head: [0.22, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'man-s1-clang2', time: 7.35, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.11, 0, 0.28], leftArm: [-0.4, 0, -0.22], torso: [0.08, 0.18, 0], head: [0.14, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'man-s1-recover2', time: 7.55, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.20, 0, 0.28], torso: [0.04, 0.18, 0], head: [0.22, -0.10, 0] }, easing: 'step' },
      { id: 'man-hide', time: 12, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'man-s7-pre', time: 76.95, position: [2.25, 0.08, -0.95], rotation: [0, -1.25, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'man-s7-in', time: 77, position: [2.25, 0.08, -0.95], rotation: [0, -1.25, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.55, clipSpeed: 1, easing: 'step' },
      { id: 'man-s7-stare', time: 80.2, position: [2.25, 0.08, -0.95], rotation: [0, -1.35, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.85, clipSpeed: 1, easing: 'step' },
      { id: 'man-s7-dive', time: 82.8, position: [2.25, 0.08, -0.95], rotation: [0, 0.38, 0], scale: [1, 1, 1], clip: 'run', clipSpeed: 1.55, easing: 'easeInOut' },
      { id: 'man-s7-duck', time: 84.5, position: [4.45, 0, 5.45], rotation: [0, -1.25, 0], scale: [1, 1, 1], clip: 'crouch', upperBodyClip: 'block', upperBodyWeight: 1, clipSpeed: 1, easing: 'step' },
    ],
    faceKeyframes: [
      { id: 'mf-0', time: 0, preset: 'happy', easing: 'step' },
      { id: 'mf-1', time: 3.3, preset: 'surprised', easing: 'step' },
      { id: 'mf-1b', time: 4.3, preset: 'determined', easing: 'step' },
      { id: 'mf-1c', time: 5.7, preset: 'surprised', easing: 'step' },
      { id: 'mf-1d', time: 6.1, preset: 'determined', easing: 'step' },
      { id: 'mf-2', time: 77, preset: 'happy', easing: 'step' },
      { id: 'mf-3', time: 82.6, preset: 'surprised', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'manh-0', time: 0, right: createEmptyCharacterHeldItems().right, left: createEmptyCharacterHeldItems().left, easing: 'step' },
      { id: 'manh-umb', time: 5.05, right: createDefaultHandStateForItem('steelUmbrella', 'right', { primaryColor: '#64748b', accentColor: '#0284c7' }), left: createEmptyCharacterHeldItems().left, easing: 'equipPop' },
      { id: 'manh-off', time: 12, right: createEmptyCharacterHeldItems().right, left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
  }),

  // 2. Town Local Bystander (Scene 1 umbrella + Scene 7 drops groceries)
  makeCharActor({
    id: 'idiom-bystander',
    name: 'Verbatim Neighbor',
    bodyColors: SKIN_WARM,
    hair: { styleId: 'wolfCut', primaryColor: '#6b3f24', highlightColor: '#da8541', highlightPattern: 'ombre', volume: 1.08, bangsStyle: 'curtain', finish: 'silky' },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'arched',
      mouthStyle: 'openCavity',
      cheekStyle: 'freckles',
      eyeColor: '#15803d',
    },
    clothing: {
      shirtId: 'hoodie',
      shirtColor: '#15803d',
      shirtAccent: '#fef08a',
      sleeveMode: 'long',
      topFabric: 'cotton',
      outerwearId: 'pufferVest',
      outerwearColor: '#f59e0b',
      outerwearAccent: '#fef3c7',
      outerwearFabric: 'quilted',
      outerwearOpen: true,
      pantsId: 'baggyCargo',
      pantsColor: '#334155',
      pantsAccent: '#94a3b8',
      footwearId: 'highTops',
      shoeColor: '#18181b',
      shoeAccent: '#f8fafc',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'beanie', color: '#dc2626', accentColor: '#fef3c7' },
      neck: { id: 'lanyard', color: '#fef08a', accentColor: '#15803d' },
      back: { id: 'streetBackpack', color: '#1e293b', accentColor: '#f59e0b' },
      legs: { id: 'kneePads', color: '#1e293b', accentColor: '#f59e0b' },
    }),
    lookAtTarget: 'prop-cats-dogs',
    gazeTarget: 'prop-cats-dogs',
    lookAtWeight: 0.82,
    keyframes: [
      { id: 'bys-s1-0', time: 0, position: [-2.2, 0, 1.9], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.4, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'bys-s1-react', time: 3.45, position: [-2.2, 0, 1.9], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.75, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'bys-s1-bend', time: 4.35, position: [-2.2, 0, 1.9], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'crouch', clipSpeed: 1, customJoints: { rightArm: [-0.50, 0, 0.24], torso: [0.10, 0.12, 0] }, easing: 'easeInOut' },
      { id: 'bys-s1-grab', time: 5.05, position: [-2.2, 0, 1.9], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'crouch', clipSpeed: 1, customJoints: { rightArm: [-0.50, 0, 0.24], torso: [0.10, 0.12, 0] }, easing: 'easeOutBack' },
      { id: 'bys-s1-raise', time: 5.25, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.20, 0, 0.28], torso: [0.04, 0.18, 0], head: [0.22, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'bys-s1-clang1', time: 6.35, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.10, 0, 0.28], leftArm: [-0.42, 0, -0.24], torso: [0.08, 0.18, 0], head: [0.12, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'bys-s1-recover1', time: 6.55, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.20, 0, 0.28], torso: [0.04, 0.18, 0], head: [0.22, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'bys-s1-clang2', time: 7.75, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.11, 0, 0.28], leftArm: [-0.38, 0, -0.22], torso: [0.08, 0.18, 0], head: [0.12, -0.10, 0] }, easing: 'easeInOut' },
      { id: 'bys-s1-recover2', time: 7.95, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, customJoints: { rightArm: [-1.20, 0, 0.28], torso: [0.04, 0.18, 0], head: [0.22, -0.10, 0] }, easing: 'step' },
      { id: 'bys-hide', time: 12, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'bys-s7-pre', time: 76.95, position: [0.85, 0.08, -0.95], rotation: [0, -1.15, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'bys-s7-in', time: 77, position: [0.85, 0.08, -0.95], rotation: [0, -1.15, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.45, clipSpeed: 1, easing: 'step' },
      { id: 'bys-s7-turn', time: 80.1, position: [0.85, 0.08, -0.95], rotation: [0, -1.25, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.9, clipSpeed: 1, easing: 'step' },
      { id: 'bys-s7-panic', time: 82.8, position: [0.85, 0.08, -0.95], rotation: [0, 0.35, 0], scale: [1, 1, 1], clip: 'run', clipSpeed: 1.55, easing: 'easeInOut' },
      { id: 'bys-s7-hide', time: 84.4, position: [3.15, 0, 5.45], rotation: [0, -1.25, 0], scale: [1, 1, 1], clip: 'crouch', upperBodyClip: 'block', upperBodyWeight: 1, clipSpeed: 1, easing: 'step' },
    ],
    faceKeyframes: [
      { id: 'bf-0', time: 0, preset: 'happy', easing: 'step' },
      { id: 'bf-1', time: 3.4, preset: 'surprised', easing: 'step' },
      { id: 'bf-1b', time: 5.3, preset: 'determined', easing: 'step' },
      { id: 'bf-1c', time: 6.3, preset: 'surprised', easing: 'step' },
      { id: 'bf-2', time: 77, preset: 'happy', easing: 'step' },
      { id: 'bf-3', time: 82.6, preset: 'surprised', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'bysh-0', time: 0, right: createEmptyCharacterHeldItems().right, left: createEmptyCharacterHeldItems().left, easing: 'step' },
      { id: 'bysh-umb', time: 5.05, right: createDefaultHandStateForItem('steelUmbrella', 'right', { primaryColor: '#64748b', accentColor: '#dc2626' }), left: createEmptyCharacterHeldItems().left, easing: 'equipPop' },
      { id: 'bysh-off', time: 12, right: createEmptyCharacterHeldItems().right, left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
  }),

  // 3. Woman A / Gossiper (Scene 2 Café — faces directly into Café Friend's POV lens)
  makeCharActor({
    id: 'idiom-gossiper',
    name: 'Gossiper',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'bob', primaryColor: '#181c24', highlightColor: '#ec4899', highlightPattern: 'streaks', volume: 1.08, bangsStyle: 'blunt', accessoryId: 'starClips', accessoryColor: '#facc15', finish: 'glossy' },
    faceStyle: {
      eyeStyle: 'starry',
      browStyle: 'arched',
      mouthStyle: 'smirk',
      cheekStyle: 'blush',
      eyeColor: '#be185d',
    },
    clothing: {
      shirtId: 'turtleneck',
      shirtColor: '#f8fafc',
      shirtAccent: '#f472b6',
      sleeveMode: 'long',
      topFabric: 'knit',
      outerwearId: 'cardigan',
      outerwearColor: '#be185d',
      outerwearAccent: '#fef3c7',
      outerwearFabric: 'knit',
      outerwearOpen: true,
      pantsId: 'pleatedSkirt',
      pantsColor: '#1e293b',
      pantsAccent: '#ec4899',
      bottomPattern: 'plaid',
      footwearId: 'platformShoes',
      shoeColor: '#181c24',
      shoeAccent: '#f472b6',
    },
    ornaments: makeDefaultOrnaments({
      head: { id: 'catEyeGlasses', color: '#991b1b', accentColor: '#e0f2fe' },
      neck: { id: 'pearlNecklace', color: '#f8fafc', accentColor: '#eab308' },
      arm: { id: 'wristband', color: '#f472b6', accentColor: '#fef08a' },
      waist: { id: 'fannyPack', color: '#831843', accentColor: '#facc15' },
    }),
    lookAtTarget: 'idiom-listener',
    gazeTarget: 'idiom-listener',
    lookAtWeight: 0.86,
    keyframes: [
      ...makeActorWindow('gos-s2', 12, 25, [-2.22, 0.22, 0.2], [0, 1.38, 0], [1, 1, 1], 'sit', [
        { id: 'gos-s2-talk', time: 13.6, position: [-2.14, 0.22, 0.2], rotation: [0, 1.42, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'talkGesture', upperBodyWeight: 0.95, clipSpeed: 1.2, customJoints: { torso: [0.12, 0, 0] }, easing: 'step' },
        { id: 'gos-s2-shock', time: 16.05, position: [-2.28, 0.22, 0.2], rotation: [0, 1.28, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.88, clipSpeed: 1, customJoints: { torso: [-0.14, 0, 0] }, easing: 'step' },
        { id: 'gos-s2-sheepish', time: 19.4, position: [-2.24, 0.22, 0.2], rotation: [0, 1.02, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'wave', upperBodyWeight: 0.55, clipSpeed: 0.85, easing: 'step' },
      ]),
    ],
    faceKeyframes: [
      { id: 'gf-0', time: 12, preset: 'wink', easing: 'step' },
      { id: 'gf-1', time: 13.6, preset: 'smug', easing: 'step' },
      { id: 'gf-2', time: 16.0, preset: 'surprised', easing: 'step' },
      { id: 'gf-3', time: 19.4, preset: 'sad', easing: 'step' },
    ],
    heldItemKeyframes: [
      {
        id: 'gosh-0',
        time: 12,
        right: createEmptyCharacterHeldItems().right,
        left: createDefaultHandStateForItem('smartphone', 'left', { primaryColor: '#ec4899', accentColor: '#38bdf8' }),
        easing: 'step',
      },
    ],
    actionKeyframes: [
      { id: 'gos-act-0', time: 12, actionId: 'none', intensity: 1, source: 'mouth', seed: 24 },
      { id: 'gos-act-beans', time: 15.85, actionId: 'spewBeans', intensity: 1.25, source: 'mouth', seed: 24 },
      { id: 'gos-act-end', time: 20.4, actionId: 'none', intensity: 1, source: 'mouth', seed: 24 },
    ],
  }),

  // 4. Woman B / Listener (Scene 2 Café — POV Protagonist!)
  makeCharActor({
    id: 'idiom-listener',
    name: 'Café Friend',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'longWavyPart', primaryColor: '#8f3622', highlightColor: '#f59e0b', highlightPattern: 'ombre', volume: 1.08, bangsStyle: 'curtain', accessoryId: 'headband', accessoryColor: '#2563eb', finish: 'silky' },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'arched',
      mouthStyle: 'sculpted',
      cheekStyle: 'blush',
      eyeColor: '#0284c7',
    },
    clothing: {
      shirtId: 'sweater',
      shirtColor: '#fef3c7',
      shirtAccent: '#0284c7',
      sleeveMode: 'long',
      topFabric: 'knit',
      topPattern: 'stripes',
      outerwearId: 'denimJacket',
      outerwearColor: '#2563eb',
      outerwearAccent: '#e2e8f0',
      outerwearFabric: 'denim',
      outerwearOpen: true,
      pantsId: 'flaredJeans',
      pantsColor: '#1e3a8a',
      pantsAccent: '#94a3b8',
      bottomFabric: 'denim',
      footwearId: 'sneakers',
      shoeColor: '#f8fafc',
      shoeAccent: '#0284c7',
    },
    ornaments: makeDefaultOrnaments({
      head: { id: 'roundGlasses', color: '#eab308', accentColor: '#bae6fd' },
      neck: { id: 'heartLocket', color: '#facc15', accentColor: '#f43f5e' },
      waist: { id: 'messengerBag', color: '#78350f', accentColor: '#eab308' },
    }),
    lookAtTarget: 'prop-beans',
    gazeTarget: 'prop-beans',
    lookAtWeight: 0.85,
    keyframes: makeActorWindow('lis-s2', 12, 25, [0.12, 0.22, 0.22], [0, -1.35, 0], [1, 1, 1], 'sit', [
      { id: 'lis-s2-lean', time: 13.6, position: [0.06, 0.22, 0.22], rotation: [0, -1.38, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'talkGesture', upperBodyWeight: 0.5, clipSpeed: 1, easing: 'step' },
      { id: 'lis-s2-shock', time: 16.05, position: [0.22, 0.22, 0.24], rotation: [0, -1.25, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.9, clipSpeed: 1, customJoints: { torso: [-0.16, 0, 0] }, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'lf-0', time: 12, preset: 'happy', easing: 'step' },
      { id: 'lf-1', time: 13.8, preset: 'excited', easing: 'step' },
      { id: 'lf-2', time: 16.0, preset: 'surprised', easing: 'step' },
    ],
    heldItemKeyframes: [
      {
        id: 'lish-0',
        time: 12,
        right: createDefaultHandStateForItem('icedCoffee', 'right'),
        left: createEmptyCharacterHeldItems().left,
        easing: 'step',
      },
    ],
  }),

  // 5. Deadpan Barista with Snow Shovel (Scene 2 — glares into POV lens)
  makeCharActor({
    id: 'idiom-barista',
    name: 'Deadpan Barista',
    bodyColors: SKIN_OLIVE,
    hair: { styleId: 'undercut', primaryColor: '#291d18', highlightColor: '#6b3f24', highlightPattern: 'tips', volume: 1.03, finish: 'matte' },
    faceStyle: {
      eyeStyle: 'classic',
      browStyle: 'sharp',
      mouthStyle: 'sculpted',
      cheekStyle: 'bandage',
      eyeColor: '#3b2416',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#f8fafc',
      shirtAccent: '#14532d',
      sleeveMode: 'short',
      outerwearId: 'overalls',
      outerwearColor: '#14532d',
      outerwearAccent: '#fef3c7',
      outerwearFabric: 'cotton',
      pantsId: 'slacks',
      pantsColor: '#18181b',
      pantsAccent: '#52525b',
      footwearId: 'boots',
      shoeColor: '#291d18',
      shoeAccent: '#52525b',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'cap', color: '#14532d', accentColor: '#fef3c7' },
      neck: { id: 'lanyard', color: '#15803d', accentColor: '#fef3c7' },
      arm: { id: 'wristband', color: '#14532d', accentColor: '#f59e0b' },
    }),
    lookAtTarget: 'prop-beans',
    gazeTarget: 'prop-beans',
    lookAtWeight: 0.88,
    // Strictly hidden off-stage until 17.6s cue, then enters cleanly along open floor aisle clear of the espresso counter (x=[0.1..5.1], z=[-2.3..-0.9])
    keyframes: makeActorWindow(
      'bar-s2',
      17.6,
      25,
      [5.25, 0, -0.35],
      [0, -1.42, 0],
      [1, 1, 1],
      'walk',
      [
        { id: 'bar-stop', time: 20.0, position: [1.35, 0, -0.45], rotation: [0, -0.95, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.78, clipSpeed: 1, easing: 'step' },
      ],
      'easeInOut',
    ),
    faceKeyframes: [
      { id: 'barf-0', time: 17.6, preset: 'sad', easing: 'step' },
      { id: 'barf-1', time: 19.6, preset: 'angry', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'barh-0', time: 17.6, right: createDefaultHandStateForItem('snowShovel', 'right'), left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
    stateKeyframes: [
      { id: 'bars-0', time: 17.6, stateId: 'normal', intensity: 1 },
      { id: 'bars-mad', time: 19.6, stateId: 'steamingMad', intensity: 1.15 },
      { id: 'bars-end', time: 25, stateId: 'normal', intensity: 1 },
    ],
  }),

  // 6. Stiff Executive A (Scene 3 Boardroom — across table left, looking toward POV)
  makeCharActor({
    id: 'idiom-exec-1',
    name: 'Executive 1',
    modelBuild: 'tall',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'sidePart', primaryColor: '#eab308', highlightColor: '#fef08a', highlightPattern: 'streaks', volume: 1.03, finish: 'glossy' },
    faceStyle: {
      eyeStyle: 'hero',
      browStyle: 'sharp',
      mouthStyle: 'sculpted',
      cheekStyle: 'none',
      eyeColor: '#1d4ed8',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#f8fafc',
      shirtAccent: '#dc2626',
      sleeveMode: 'long',
      outerwearId: 'blazer',
      outerwearColor: '#1e293b',
      outerwearAccent: '#dc2626',
      outerwearOpen: true,
      pantsId: 'slacks',
      pantsColor: '#0f172a',
      pantsAccent: '#475569',
      footwearId: 'loafers',
      shoeColor: '#18181b',
      shoeAccent: '#94a3b8',
    },
    ornaments: makeDefaultOrnaments({
      head: { id: 'halfRim', color: '#1e293b', accentColor: '#cbd5e1' },
      neck: { id: 'necktie', color: '#dc2626', accentColor: '#fef3c7' },
      arm: { id: 'smartwatch', color: '#181c24', accentColor: '#eab308' },
    }),
    lookAtTarget: 'idiom-exec-2',
    gazeTarget: 'idiom-exec-2',
    lookAtWeight: 0.82,
    keyframes: makeActorWindow('ex1-s3', 25, 38, [-2.5, 0.24, -1.95], [0, 0.28, 0], [1, 1, 1], 'sit', [
      { id: 'ex1-s3-talk', time: 26.5, position: [-2.5, 0.24, -1.95], rotation: [0, 0.28, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'talkGesture', upperBodyWeight: 0.85, clipSpeed: 1, easing: 'step' },
      { id: 'ex1-s3-flinch', time: 33.8, position: [-2.58, 0.24, -2.02], rotation: [0, 0.38, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.85, clipSpeed: 1, customJoints: { torso: [-0.15, 0, 0] }, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'ex1f-0', time: 25, preset: 'determined', easing: 'step' },
      { id: 'ex1f-1', time: 30.6, preset: 'surprised', easing: 'step' },
      { id: 'ex1f-2', time: 31.8, preset: 'determined', easing: 'step' },
      { id: 'ex1f-3', time: 33.8, preset: 'surprised', easing: 'step' },
    ],
    heldItemKeyframes: [
      {
        id: 'ex1h-0',
        time: 25,
        right: createDefaultHandStateForItem('smartphone', 'right', { primaryColor: '#1e293b', accentColor: '#38bdf8' }),
        left: createEmptyCharacterHeldItems().left,
        easing: 'step',
      },
    ],
    stateKeyframes: [
      { id: 'ex1s-0', time: 25, stateId: 'normal', intensity: 1 },
      { id: 'ex1s-dizzy', time: 33.8, stateId: 'dizzy', intensity: 1.1 },
      { id: 'ex1s-end', time: 38, stateId: 'normal', intensity: 1 },
    ],
  }),

  // 7. Stiff Executive B (Scene 3 Boardroom — across table right, looking toward POV)
  makeCharActor({
    id: 'idiom-exec-2',
    name: 'Executive 2',
    bodyColors: SKIN_DEEP,
    hair: { styleId: 'topBun', primaryColor: '#181c24', highlightColor: '#38bdf8', highlightPattern: 'tips', volume: 1.06, finish: 'silky' },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'arched',
      mouthStyle: 'smirk',
      cheekStyle: 'none',
      eyeColor: '#451a03',
    },
    clothing: {
      shirtId: 'turtleneck',
      shirtColor: '#e2e8f0',
      shirtAccent: '#38bdf8',
      sleeveMode: 'long',
      topFabric: 'knit',
      outerwearId: 'blazer',
      outerwearColor: '#334155',
      outerwearAccent: '#38bdf8',
      outerwearOpen: true,
      pantsId: 'slacks',
      pantsColor: '#1e293b',
      pantsAccent: '#64748b',
      footwearId: 'loafers',
      shoeColor: '#1e293b',
      shoeAccent: '#cbd5e1',
    },
    ornaments: makeDefaultOrnaments({
      head: { id: 'catEyeGlasses', color: '#1e293b', accentColor: '#bae6fd' },
      neck: { id: 'pearlNecklace', color: '#f8fafc', accentColor: '#eab308' },
      arm: { id: 'smartwatch', color: '#0f172a', accentColor: '#38bdf8' },
    }),
    lookAtTarget: 'idiom-exec-1',
    gazeTarget: 'idiom-exec-1',
    lookAtWeight: 0.82,
    keyframes: makeActorWindow('ex2-s3', 25, 38, [2.5, 0.24, -1.95], [0, -0.28, 0], [1, 1, 1], 'sit', [
      { id: 'ex2-s3-flinch', time: 33.8, position: [2.58, 0.24, -2.02], rotation: [0, -0.38, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.88, clipSpeed: 1, customJoints: { torso: [-0.15, 0, 0] }, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'ex2f-0', time: 25, preset: 'sad', easing: 'step' },
      { id: 'ex2f-1', time: 30.6, preset: 'surprised', easing: 'step' },
      { id: 'ex2f-2', time: 33.8, preset: 'angry', easing: 'step' },
    ],
    heldItemKeyframes: [
      {
        id: 'ex2h-0',
        time: 25,
        right: createDefaultHandStateForItem('icedCoffee', 'right'),
        left: createEmptyCharacterHeldItems().left,
        easing: 'step',
      },
    ],
  }),

  // 8. Stiff Executive C (Scene 3 Boardroom — POV Protagonist!)
  makeCharActor({
    id: 'idiom-exec-3',
    name: 'Executive 3',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'swept', primaryColor: '#6b3f24', highlightColor: '#8f3622', highlightPattern: 'streaks', volume: 1.04, finish: 'glossy' },
    faceStyle: {
      eyeStyle: 'classic',
      browStyle: 'rounded',
      mouthStyle: 'sculpted',
      cheekStyle: 'none',
      eyeColor: '#1e3a8a',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#f8fafc',
      shirtAccent: '#f5cd30',
      sleeveMode: 'long',
      outerwearId: 'blazer',
      outerwearColor: '#1e1b4b',
      outerwearAccent: '#f5cd30',
      outerwearOpen: true,
      pantsId: 'slacks',
      pantsColor: '#0f172a',
      pantsAccent: '#475569',
      footwearId: 'loafers',
      shoeColor: '#3b2416',
      shoeAccent: '#eab308',
    },
    ornaments: makeDefaultOrnaments({
      neck: { id: 'necktie', color: '#1d4ed8', accentColor: '#facc15' },
      arm: { id: 'smartwatch', color: '#1e293b', accentColor: '#facc15' },
    }),
    lookAtTarget: 'prop-elephant',
    gazeTarget: 'prop-elephant',
    lookAtWeight: 0.85,
    keyframes: makeActorWindow('ex3-s3', 25, 38, [-2.5, 0.24, 1.95], [0, 2.35, 0], [1, 1, 1], 'sit', [
      { id: 'ex3-s3-flinch', time: 33.8, position: [-2.58, 0.24, 2.02], rotation: [0, 2.25, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.85, clipSpeed: 1, customJoints: { torso: [-0.15, 0, 0] }, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'ex3f-0', time: 25, preset: 'determined', easing: 'step' },
      { id: 'ex3f-1', time: 33.8, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 9. Stiff Executive D (Scene 3 Boardroom — near-right table seat angled inward)
  makeCharActor({
    id: 'idiom-exec-4',
    name: 'Executive 4',
    bodyColors: SKIN_OLIVE,
    hair: { styleId: 'texturedFade', primaryColor: '#8f3622', highlightColor: '#da8541', highlightPattern: 'tips', volume: 1.02 },
    faceStyle: {
      eyeStyle: 'classic',
      browStyle: 'bold',
      mouthStyle: 'smirk',
      cheekStyle: 'none',
      eyeColor: '#14532d',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#f1f5f9',
      shirtAccent: '#38bdf8',
      sleeveMode: 'long',
      outerwearId: 'blazer',
      outerwearColor: '#374151',
      outerwearAccent: '#e2e8f0',
      outerwearOpen: true,
      pantsId: 'slacks',
      pantsColor: '#111827',
      pantsAccent: '#6b7280',
      footwearId: 'loafers',
      shoeColor: '#18181b',
      shoeAccent: '#64748b',
    },
    ornaments: makeDefaultOrnaments({
      head: { id: 'roundGlasses', color: '#cbd5e1', accentColor: '#bae6fd' },
      neck: { id: 'lanyard', color: '#0284c7', accentColor: '#f8fafc' },
      waist: { id: 'messengerBag', color: '#1e293b', accentColor: '#38bdf8' },
    }),
    lookAtTarget: 'idiom-exec-1',
    gazeTarget: 'idiom-exec-1',
    lookAtWeight: 0.82,
    keyframes: makeActorWindow('ex4-s3', 25, 38, [2.5, 0.24, 1.95], [0, -2.35, 0], [1, 1, 1], 'sit', [
      { id: 'ex4-s3-flinch', time: 33.8, position: [2.58, 0.24, 2.02], rotation: [0, -2.25, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.85, clipSpeed: 1, customJoints: { torso: [-0.15, 0, 0] }, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'ex4f-0', time: 25, preset: 'smug', easing: 'step' },
      { id: 'ex4f-1', time: 33.8, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 10. Bride (Scene 4 Wedding — faces directly into the Groom's POV camera)
  makeCharActor({
    id: 'idiom-bride',
    name: 'Bride',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'longWavyPart', primaryColor: '#3b2416', highlightColor: '#fef3c7', highlightPattern: 'tips', volume: 1.1, bangsStyle: 'curtain', accessoryId: 'starClips', accessoryColor: '#ffffff', finish: 'glossy' },
    faceStyle: {
      eyeStyle: 'starry',
      browStyle: 'arched',
      mouthStyle: 'sculpted',
      cheekStyle: 'blush',
      eyeColor: '#78350f',
    },
    clothing: {
      shirtId: 'cropTop',
      shirtColor: '#ffffff',
      shirtAccent: '#fb7185',
      sleeveMode: 'sleeveless',
      topFabric: 'satin',
      outerwearId: 'cardigan',
      outerwearColor: '#f8fafc',
      outerwearAccent: '#facc15',
      outerwearFabric: 'satin',
      outerwearOpen: true,
      pantsId: 'midiSkirt',
      pantsColor: '#ffffff',
      pantsAccent: '#fef3c7',
      bottomFabric: 'satin',
      footwearId: 'platformShoes',
      shoeColor: '#f8fafc',
      shoeAccent: '#facc15',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'crown', color: '#facc15', accentColor: '#f8fafc' },
      neck: { id: 'pearlNecklace', color: '#f8fafc', accentColor: '#facc15' },
      back: { id: 'angelWings', color: '#ffffff', accentColor: '#fef08a' },
    }),
    lookAtTarget: 'idiom-groom',
    gazeTarget: 'idiom-groom',
    lookAtWeight: 0.88,
    keyframes: makeActorWindow('brd-s4', 38, 51, [-1.15, 0.32, -2.0], [0, 1.15, 0], [1, 1, 1], 'idle', [
      { id: 'brd-frown', time: 40.8, position: [-1.15, 0.32, -2.0], rotation: [0, 1.25, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.85, clipSpeed: 1, easing: 'step' },
      { id: 'brd-relief', time: 49.4, position: [-1.15, 0.32, -2.0], rotation: [0, 1.15, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'cheer', upperBodyWeight: 0.72, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'brdf-0', time: 38, preset: 'happy', easing: 'step' },
      { id: 'brdf-1', time: 40.5, preset: 'surprised', easing: 'step' },
      { id: 'brdf-2', time: 42.0, preset: 'angry', easing: 'step' },
      { id: 'brdf-3', time: 49.4, preset: 'happy', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'brdh-0', time: 38, right: createDefaultHandStateForItem('bouquet', 'right'), left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
  }),

  // 11. Groom (Scene 4 Wedding — angled three-quarters toward altar camera)
  makeCharActor({
    id: 'idiom-groom',
    name: 'Groom',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'swept', primaryColor: '#181c24', highlightColor: '#334155', highlightPattern: 'streaks', volume: 1.04, finish: 'glossy' },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'arched',
      mouthStyle: 'sculpted',
      cheekStyle: 'blush',
      eyeColor: '#0284c7',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#ffffff',
      shirtAccent: '#0f172a',
      sleeveMode: 'long',
      outerwearId: 'blazer',
      outerwearColor: '#0f172a',
      outerwearAccent: '#f8fafc',
      outerwearFabric: 'satin',
      outerwearOpen: true,
      pantsId: 'slacks',
      pantsColor: '#0f172a',
      pantsAccent: '#334155',
      footwearId: 'loafers',
      shoeColor: '#0f172a',
      shoeAccent: '#e2e8f0',
    },
    ornaments: makeDefaultOrnaments({
      neck: { id: 'bowTie', color: '#dc2626', accentColor: '#f8fafc' },
      shoulder: { id: 'pauldron', color: '#facc15', accentColor: '#dc2626' },
    }),
    lookAtTarget: 'prop-ice-feet',
    gazeTarget: 'prop-ice-feet',
    lookAtWeight: 0.82,
    keyframes: makeActorWindow('grm-s4', 38, 51, [1.15, 0.32, -1.95], [0, -1.05, 0], [1, 1, 1], 'idle', [
      { id: 'grm-freeze', time: 40.6, position: [1.15, 0.32, -1.95], rotation: [0, -0.95, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.78, clipSpeed: 2.8, easing: 'step' },
      { id: 'grm-thawed', time: 49.4, position: [1.15, 0.32, -1.95], rotation: [0, -1.05, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'cheer', upperBodyWeight: 0.65, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'grmf-0', time: 38, preset: 'happy', easing: 'step' },
      { id: 'grmf-1', time: 40.5, preset: 'surprised', easing: 'step' },
      { id: 'grmf-2', time: 44.0, preset: 'sad', easing: 'step' },
      { id: 'grmf-3', time: 49.4, preset: 'happy', easing: 'step' },
    ],
    stateKeyframes: [
      { id: 'grms-0', time: 38, stateId: 'normal', intensity: 1 },
      { id: 'grms-ice', time: 40.6, stateId: 'frozenFeet', intensity: 1.15 },
      { id: 'grms-thaw', time: 49.2, stateId: 'normal', intensity: 1 },
    ],
  }),

  // 12. Groomsman with Hairdryer (Scene 4 Wedding — sprints up the red carpet to thaw the Groom's frozen feet)
  makeCharActor({
    id: 'idiom-groomsman',
    name: 'Groomsman',
    bodyColors: SKIN_WARM,
    hair: { styleId: 'messyFluffy', primaryColor: '#181c24', highlightColor: '#f43f5e', highlightPattern: 'tips', volume: 1.06 },
    faceStyle: {
      eyeStyle: 'hero',
      browStyle: 'bold',
      mouthStyle: 'openCavity',
      cheekStyle: 'freckles',
      eyeColor: '#78350f',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#f8fafc',
      shirtAccent: '#fb7185',
      sleeveMode: 'long',
      outerwearId: 'blazer',
      outerwearColor: '#334155',
      outerwearAccent: '#fb7185',
      outerwearOpen: true,
      pantsId: 'slacks',
      pantsColor: '#1e293b',
      pantsAccent: '#64748b',
      footwearId: 'loafers',
      shoeColor: '#18181b',
      shoeAccent: '#94a3b8',
    },
    ornaments: makeDefaultOrnaments({
      head: { id: 'aviators', color: '#facc15', accentColor: '#1e293b' },
      neck: { id: 'bowTie', color: '#fb7185', accentColor: '#f8fafc' },
      arm: { id: 'smartwatch', color: '#1e293b', accentColor: '#fb7185' },
    }),
    lookAtTarget: 'prop-ice-feet',
    gazeTarget: 'prop-ice-feet',
    lookAtWeight: 0.86,
    // Strictly hidden until 43.2s rescue cue so he NEVER blocks the center aisle camera, then sprints in from the off-camera left Chapel Nave Arch!
    keyframes: makeActorWindow(
      'gms-s4',
      43.2,
      51,
      [-5.35, 0, -1.55],
      [0, 1.48, 0],
      [1, 1, 1],
      'run',
      [
        { id: 'gms-aim', time: 45.6, position: [-0.05, 0.32, -1.35], rotation: [0, 1.25, 0], scale: [1, 1, 1], clip: 'crouch', upperBodyClip: 'point', upperBodyWeight: 0.95, clipSpeed: 1, easing: 'step' },
      ],
      'easeInOut',
    ),
    faceKeyframes: [
      { id: 'gmsf-0', time: 43.2, preset: 'determined', easing: 'step' },
      { id: 'gmsf-1', time: 49.4, preset: 'smug', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'gmsh-0', time: 43.2, right: createDefaultHandStateForItem('hairdryer', 'right'), left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
  }),

  // 13. Shakespearean Actor (Scene 5 Theater — POV Protagonist!)
  makeCharActor({
    id: 'idiom-shakespeare',
    name: 'Lead Actor',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'curly', primaryColor: '#6b3f24', highlightColor: '#eab308', highlightPattern: 'streaks', volume: 1.1, finish: 'silky' },
    faceStyle: {
      eyeStyle: 'hero',
      browStyle: 'arched',
      mouthStyle: 'smirk',
      cheekStyle: 'none',
      eyeColor: '#7c2d12',
    },
    clothing: {
      shirtId: 'knightTunic',
      shirtColor: '#7c2d12',
      shirtAccent: '#facc15',
      sleeveMode: 'long',
      topFabric: 'satin',
      pantsId: 'knightGreaves',
      pantsColor: '#1e293b',
      pantsAccent: '#facc15',
      footwearId: 'boots',
      shoeColor: '#451a03',
      shoeAccent: '#facc15',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'crown', color: '#facc15', accentColor: '#dc2626' },
      shoulder: { id: 'furMantle', color: '#e2d5c3', accentColor: '#78350f' },
      neck: { id: 'goldMedallion', color: '#eab308', accentColor: '#dc2626' },
      back: { id: 'cape', color: '#991b1b', accentColor: '#facc15' },
    }),
    lookAtTarget: 'prop-stretcher',
    gazeTarget: 'prop-stretcher',
    lookAtWeight: 0.82,
    keyframes: makeActorWindow('act-s5', 51, 64, [-0.65, 0.14, 0.35], [0, -0.35, 0], [1, 1, 1], 'idle', [
      { id: 'act-hop', time: 56.0, position: [-0.65, 0.14, 0.42], rotation: [0, 0.12, 0], scale: [1, 1, 1], clip: 'jump', clipSpeed: 1.2, customJoints: { rightLeg: [-0.26, 0, 0.08], leftLeg: [0.12, 0, -0.05] }, easing: 'easeOutBack' },
      { id: 'act-limp', time: 57.6, position: [-0.65, 0.14, 0.45], rotation: [0, 0.22, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.78, clipSpeed: 1, customJoints: { rightLeg: [-0.18, 0, 0.06] }, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'actf-0', time: 51, preset: 'determined', easing: 'step' },
      { id: 'actf-1', time: 56.0, preset: 'surprised', easing: 'step' },
      { id: 'actf-2', time: 58.0, preset: 'sad', easing: 'step' },
    ],
    stateKeyframes: [
      { id: 'acts-0', time: 51, stateId: 'normal', intensity: 1, targetLimb: 'rightLeg' },
      { id: 'acts-snap', time: 56.0, stateId: 'brokenLeg', intensity: 1.18, targetLimb: 'rightLeg' },
      { id: 'acts-end', time: 64, stateId: 'normal', intensity: 1, targetLimb: 'rightLeg' },
    ],
  }),

  // 14. Stagehand (Scene 5 Theater — slaps Lead Actor's back, then panics beside him as ambulance arrives)
  makeCharActor({
    id: 'idiom-stagehand',
    name: 'Stagehand',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'spiky', primaryColor: '#181c24', highlightColor: '#fbbf24', highlightPattern: 'tips', volume: 1.0 },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'bold',
      mouthStyle: 'openCavity',
      cheekStyle: 'freckles',
      eyeColor: '#451a03',
    },
    clothing: {
      shirtId: 'hoodie',
      shirtColor: '#18181b',
      shirtAccent: '#fbbf24',
      sleeveMode: 'long',
      outerwearId: 'pufferVest',
      outerwearColor: '#27272a',
      outerwearAccent: '#fbbf24',
      outerwearFabric: 'quilted',
      outerwearOpen: true,
      pantsId: 'baggyCargo',
      pantsColor: '#27272a',
      pantsAccent: '#52525b',
      footwearId: 'highTops',
      shoeColor: '#18181b',
      shoeAccent: '#fbbf24',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'backwardsCap', color: '#18181b', accentColor: '#fbbf24' },
      head: { id: 'headphones', color: '#1e293b', accentColor: '#fbbf24' },
      neck: { id: 'lanyard', color: '#fbbf24', accentColor: '#18181b' },
      waist: { id: 'fannyPack', color: '#181c24', accentColor: '#fbbf24' },
    }),
    lookAtTarget: 'idiom-shakespeare',
    gazeTarget: 'idiom-shakespeare',
    lookAtWeight: 0.88,
    keyframes: makeActorWindow('stg-s5', 51, 64, [-2.45, 0.14, 0.15], [0, 0.95, 0], [1, 1, 1], 'idle', [
      { id: 'stg-step-in', time: 52.5, position: [-2.45, 0.14, 0.15], rotation: [0, 0.95, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 1.2, easing: 'easeInOut' },
      { id: 'stg-slap', time: 53.2, position: [-1.85, 0.14, 0.25], rotation: [0, 1.05, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'cheer', upperBodyWeight: 0.96, clipSpeed: 1.25, easing: 'step' },
      { id: 'stg-recoil-start', time: 56.0, position: [-1.85, 0.14, 0.25], rotation: [0, 0.95, 0], scale: [1, 1, 1], clip: 'walk', upperBodyClip: 'block', upperBodyWeight: 0.92, clipSpeed: 1.1, easing: 'easeInOut' },
      { id: 'stg-oops', time: 56.8, position: [-2.35, 0.14, 0.05], rotation: [0, 0.85, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.92, clipSpeed: 1, customJoints: { torso: [-0.14, 0, 0] }, easing: 'easeInOut' },
      { id: 'stg-panic-bay', time: 58.2, position: [-2.25, 0.14, -0.45], rotation: [0, 0.72, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.95, clipSpeed: 1, customJoints: { torso: [-0.12, 0, 0] }, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'stgf-0', time: 51, preset: 'excited', easing: 'step' },
      { id: 'stgf-1', time: 56.1, preset: 'surprised', easing: 'step' },
      { id: 'stgf-2', time: 58.5, preset: 'sad', easing: 'step' },
    ],
    heldItemKeyframes: [
      {
        id: 'stgh-0',
        time: 51,
        right: createEmptyCharacterHeldItems().right,
        left: createDefaultHandStateForItem('walkieTalkie', 'left', { primaryColor: '#18181b', accentColor: '#fbbf24' }),
        easing: 'step',
      },
    ],
  }),

  // 15. Paramedic (Scene 5 Theater — rushes out of the 3D Ambulance at the open backstage loading dock with the rolling stretcher!)
  makeCharActor({
    id: 'idiom-paramedic',
    name: 'Paramedic',
    bodyColors: SKIN_DEEP,
    hair: { styleId: 'ponytail', primaryColor: '#181c24', highlightColor: '#38bdf8', highlightPattern: 'tips', volume: 1.05, finish: 'silky' },
    faceStyle: {
      eyeStyle: 'hero',
      browStyle: 'sharp',
      mouthStyle: 'sculpted',
      cheekStyle: 'bandage',
      eyeColor: '#1e293b',
    },
    clothing: {
      shirtId: 'tracksuit',
      shirtColor: '#0284c7',
      shirtAccent: '#ffffff',
      sleeveMode: 'long',
      outerwearId: 'bomberJacket',
      outerwearColor: '#0369a1',
      outerwearAccent: '#f8fafc',
      outerwearOpen: true,
      pantsId: 'cargo',
      pantsColor: '#0f172a',
      pantsAccent: '#38bdf8',
      footwearId: 'boots',
      shoeColor: '#0f172a',
      shoeAccent: '#38bdf8',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'visor', color: '#0284c7', accentColor: '#ffffff' },
      neck: { id: 'lanyard', color: '#dc2626', accentColor: '#ffffff' },
      arm: { id: 'smartwatch', color: '#181c24', accentColor: '#22c55e' },
      back: { id: 'backpack', color: '#dc2626', accentColor: '#ffffff' },
    }),
    lookAtTarget: 'idiom-shakespeare',
    gazeTarget: 'idiom-shakespeare',
    lookAtWeight: 0.88,
    // Strictly hidden until 57.5s when the 3D Ambulance docks at the open loading bay, then rushes out of the rear doors!
    keyframes: makeActorWindow(
      'emt-s5',
      57.5,
      64,
      [2.75, 0.14, -5.15],
      [0, -0.35, 0],
      [1, 1, 1],
      'run',
      [
        { id: 'emt-stop', time: 60.0, position: [2.15, 0.14, -0.65], rotation: [0, -1.15, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.85, clipSpeed: 1, easing: 'step' },
      ],
      'easeInOut',
    ),
    faceKeyframes: [
      { id: 'emtf-0', time: 57.5, preset: 'determined', easing: 'step' },
      { id: 'emtf-1', time: 60.0, preset: 'angry', easing: 'step' },
    ],
    heldItemKeyframes: [
      {
        id: 'emth-0',
        time: 57.5,
        right: createDefaultHandStateForItem('walkieTalkie', 'right', { primaryColor: '#dc2626', accentColor: '#f8fafc' }),
        left: createEmptyCharacterHeldItems().left,
        easing: 'step',
      },
    ],
  }),

  // 16. Tourist (Scene 6 Diner + Scene 7 Main Street — POV Protagonist for Scenes 6 & 7!)
  makeCharActor({
    id: 'idiom-tourist',
    name: 'Tourist',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'messyFluffy', primaryColor: '#6b3f24', highlightColor: '#eab308', highlightPattern: 'tips', volume: 1.05 },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'arched',
      mouthStyle: 'openCavity',
      cheekStyle: 'freckles',
      eyeColor: '#0284c7',
    },
    clothing: {
      shirtId: 'polo',
      shirtColor: '#f97316',
      shirtAccent: '#fde047',
      sleeveMode: 'short',
      topPattern: 'stripes',
      outerwearId: 'pufferVest',
      outerwearColor: '#0284c7',
      outerwearAccent: '#fde047',
      outerwearFabric: 'quilted',
      outerwearOpen: true,
      pantsId: 'shorts',
      pantsColor: '#d6d3d1',
      pantsAccent: '#78350f',
      footwearId: 'sneakers',
      shoeColor: '#f8fafc',
      shoeAccent: '#f97316',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'bucketHat', color: '#fef3c7', accentColor: '#dc2626' },
      head: { id: 'aviators', color: '#eab308', accentColor: '#0f172a' },
      waist: { id: 'hipCamera', color: '#1e293b', accentColor: '#cbd5e1' },
      back: { id: 'backpack', color: '#0284c7', accentColor: '#fde047' },
    }),
    lookAtTarget: 'prop-horse-platter',
    gazeTarget: 'prop-horse-platter',
    lookAtWeight: 0.85,
    keyframes: [
      { id: 'tur-pre', time: 0, position: [-3.55, 0.22, 0.8], rotation: [0, 1.15, 0], scale: [0, 0, 0], clip: 'sit', clipSpeed: 1, easing: 'step' },
      { id: 'tur-pre2', time: 63.95, position: [-3.55, 0.22, 0.8], rotation: [0, 1.15, 0], scale: [0, 0, 0], clip: 'sit', clipSpeed: 1, easing: 'step' },
      { id: 'tur-s6-in', time: 64, position: [-3.55, 0.22, 0.8], rotation: [0, 1.15, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'talkGesture', upperBodyWeight: 0.88, clipSpeed: 1, easing: 'step' },
      { id: 'tur-s6-shock', time: 70.6, position: [-3.55, 0.22, 0.8], rotation: [0, 1.05, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.82, clipSpeed: 1, customJoints: { torso: [-0.14, 0, 0] }, easing: 'step' },
      { id: 'tur-s7-step', time: 77, position: [-4.15, 0.08, -0.95], rotation: [0, 1.35, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 0.9, easing: 'easeInOut' },
      { id: 'tur-s7-admire', time: 79.8, position: [-2.85, 0.08, -0.95], rotation: [0, 1.25, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.88, clipSpeed: 1, easing: 'step' },
      { id: 'tur-s7-confused', time: 83.2, position: [-2.85, 0.08, -0.95], rotation: [0, 0.75, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'wave', upperBodyWeight: 0.55, clipSpeed: 0.6, easing: 'step' },
    ],
    faceKeyframes: [
      { id: 'turf-0', time: 64, preset: 'sad', easing: 'step' },
      { id: 'turf-1', time: 70.2, preset: 'surprised', easing: 'step' },
      { id: 'turf-2', time: 77, preset: 'excited', easing: 'step' },
      { id: 'turf-3', time: 83.2, preset: 'surprised', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'turh-0', time: 64, right: createEmptyCharacterHeldItems().right, left: createEmptyCharacterHeldItems().left, easing: 'step' },
      { id: 'turh-1', time: 77, right: createDefaultHandStateForItem('camera', 'right'), left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
    stateKeyframes: [
      { id: 'turs-0', time: 64, stateId: 'normal', intensity: 1 },
      { id: 'turs-blow', time: 85.55, stateId: 'mindBlown', intensity: 1.2, seed: 42 },
    ],
  }),

  // 17. Diner Waitress (Scene 6 Diner — angled three-quarters toward Tourist and front camera)
  makeCharActor({
    id: 'idiom-waitress',
    name: 'Waitress',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'ponytail', primaryColor: '#dc2626', highlightColor: '#f59e0b', highlightPattern: 'tips', volume: 1.08, accessoryId: 'ribbonBow', accessoryColor: '#ffffff', finish: 'glossy' },
    faceStyle: {
      eyeStyle: 'starry',
      browStyle: 'arched',
      mouthStyle: 'sculpted',
      cheekStyle: 'blush',
      eyeColor: '#0284c7',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#ec4899',
      shirtAccent: '#ffffff',
      sleeveMode: 'short',
      outerwearId: 'cardigan',
      outerwearColor: '#f43f5e',
      outerwearAccent: '#ffffff',
      outerwearOpen: true,
      pantsId: 'pleatedSkirt',
      pantsColor: '#f8fafc',
      pantsAccent: '#ec4899',
      footwearId: 'sneakers',
      shoeColor: '#ffffff',
      shoeAccent: '#ec4899',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'visor', color: '#ec4899', accentColor: '#ffffff' },
      neck: { id: 'lanyard', color: '#ec4899', accentColor: '#ffffff' },
      waist: { id: 'fannyPack', color: '#ffffff', accentColor: '#ec4899' },
    }),
    lookAtTarget: 'idiom-tourist',
    gazeTarget: 'idiom-tourist',
    lookAtWeight: 0.86,
    // Holds cleanly beside the booth until 68.4s, then walks around the open aisle OUTSIDE the diner table (x=[-3.12..-1.78], z=[-0.25..1.85])
    keyframes: makeActorWindow('wai-s6', 64, 77, [-1.15, 0.04, 0.85], [0, -1.15, 0], [1, 1, 1], 'idle', [
      { id: 'wai-turn-away', time: 68.4, position: [-1.15, 0.04, 0.85], rotation: [0, Math.PI, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 1.2, easing: 'easeInOut' },
      { id: 'wai-clear-aisle', time: 69.8, position: [-1.15, 0.04, -1.25], rotation: [0, -1.35, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 1.1, easing: 'easeInOut' },
      { id: 'wai-stare', time: 71.0, position: [-2.15, 0.04, -1.35], rotation: [0, 0.35, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.72, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'waif-0', time: 64, preset: 'happy', easing: 'step' },
      { id: 'waif-1', time: 69.6, preset: 'surprised', easing: 'step' },
    ],
    heldItemKeyframes: [
      {
        id: 'waih-0',
        time: 64,
        right: createDefaultHandStateForItem('icedCoffee', 'right'),
        left: createEmptyCharacterHeldItems().left,
        easing: 'step',
      },
    ],
  }),

  // 18. Diner Chef pushing Clydesdale platter (Scene 6 Diner — bursts out of kitchen doors to serve the Tourist)
  makeCharActor({
    id: 'idiom-chef',
    name: 'Diner Chef',
    modelBuild: 'chunky',
    bodyColors: SKIN_WARM,
    hair: { styleId: 'curly', primaryColor: '#181c24', highlightColor: '#475569', highlightPattern: 'none', volume: 1.02 },
    faceStyle: {
      eyeStyle: 'expressive',
      browStyle: 'bold',
      mouthStyle: 'openCavity',
      cheekStyle: 'blush',
      eyeColor: '#291d18',
    },
    clothing: {
      shirtId: 'buttonUp',
      shirtColor: '#f8fafc',
      shirtAccent: '#dc2626',
      sleeveMode: 'long',
      outerwearId: 'overalls',
      outerwearColor: '#f8fafc',
      outerwearAccent: '#dc2626',
      pantsId: 'slacks',
      pantsColor: '#1e293b',
      pantsAccent: '#94a3b8',
      bottomPattern: 'checker',
      footwearId: 'boots',
      shoeColor: '#18181b',
      shoeAccent: '#e2e8f0',
    },
    ornaments: makeDefaultOrnaments({
      hat: { id: 'tophat', color: '#ffffff', accentColor: '#dc2626' },
      neck: { id: 'knitScarf', color: '#dc2626', accentColor: '#ffffff' },
    }),
    lookAtTarget: 'idiom-tourist',
    gazeTarget: 'idiom-tourist',
    lookAtWeight: 0.86,
    // Strictly hidden behind the kitchen partition until 69.35s, then bursts cleanly through the swinging double doors!
    keyframes: makeActorWindow(
      'chf-s6',
      69.35,
      77,
      [0.15, 0.04, -4.85],
      [0, -0.15, 0],
      [1, 1, 1],
      'walk',
      [
        { id: 'chf-doors', time: 70.2, position: [0.22, 0.04, -3.2], rotation: [0, -0.35, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 1.35, easing: 'easeInOut' },
        { id: 'chf-serve', time: 73.2, position: [0.95, 0.04, -0.35], rotation: [0, -0.75, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.92, clipSpeed: 1, easing: 'step' },
      ],
      'easeInOut',
    ),
    faceKeyframes: [
      { id: 'chff-0', time: 69.35, preset: 'excited', easing: 'step' },
      { id: 'chff-1', time: 73.2, preset: 'smug', easing: 'step' },
    ],
  }),

  // =======================================================================
  // Literal Idiom Gag Props & Animals (scoped cleanly per scene with zero overlap)
  // =======================================================================

  makePropActor('prop-cats-dogs', 'Raining Cats & Dogs', 'rainingCatsDogs', '#d97706', '#94a3b8', [
    { id: 'cd-0', time: 0, position: [0, 0, 0], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cd-pre', time: 3.45, position: [0, 0, 0], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cd-on', time: 3.5, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cd-off', time: 12, position: [0, 0, 0], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-umb-1', 'Steel Umbrella 1', 'steelUmbrella', '#64748b', '#0284c7', [
    { id: 'u1-0', time: 0, position: [-0.17, 0, 2.42], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u1-pre', time: 5.0, position: [-0.17, 0, 2.42], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u1-pick', time: 5.05, position: [-0.17, 0, 2.42], rotation: [0, 0.25, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u1-off', time: 12, position: [-0.17, 0, 2.42], rotation: [0, 0.25, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-umb-2', 'Steel Umbrella 2', 'steelUmbrella', '#64748b', '#dc2626', [
    { id: 'u2-0', time: 0, position: [-2.40, 0, 3.00], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u2-pre', time: 5.0, position: [-2.40, 0, 3.00], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u2-pick', time: 5.05, position: [-2.40, 0, 3.00], rotation: [0, 0.5, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u2-off', time: 12, position: [-2.40, 0, 3.00], rotation: [0, 0.5, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-beans', 'Bean Waterfall', 'beanWaterfall', '#b45309', '#78350f',
    makeActorWindow('beans', 16.0, 25, [-1.58, 0, 0.24], [0, 1.38, 0], [1.18, 1.18, 1.18], 'idle')),

  makePropActor('prop-elephant', 'Boardroom Elephant', 'africanElephant', '#64748b', '#ef4444',
    makeActorWindow('elph', 25, 38, [0, 1.16, 0], [0, 0.25, 0], [1.05, 1.05, 1.05], 'idle')),

  makePropActor('prop-ice-feet', 'Cold Feet Ice Blocks', 'iceFeet', '#7dd3fc', '#e0f2fe',
    makeActorWindow('ice', 40.6, 51, [1.15, 0.32, -1.95], [0, -1.05, 0], [1.18, 1.18, 1.18], 'idle')),

  makePropActor('prop-plaster-cast', 'Plaster Leg Cast', 'plasterCast', '#f8fafc', '#ef4444', [
    { id: 'cst-0', time: 0, position: [-1.25, 0.95, 0.72], rotation: [0, 0.35, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cst-pre', time: 55.95, position: [-1.25, 0.95, 0.72], rotation: [0, 0.35, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cst-on', time: 56.0, position: [-1.25, 0.72, 0.72], rotation: [0, 0.35, 0], scale: [1.14, 1.14, 1.14], clip: 'idle', clipSpeed: 1, easing: 'easeOutBack' },
    { id: 'cst-snap', time: 56.22, position: [-1.25, 0.14, 0.72], rotation: [0, 0.35, 0], scale: [1.14, 1.14, 1.14], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
    { id: 'cst-move', time: 57.6, position: [-1.25, 0.14, 0.75], rotation: [0, 0.35, 0], scale: [1.14, 1.14, 1.14], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cst-off', time: 64, position: [-1.25, 0.14, 0.75], rotation: [0, 0.35, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-ambulance', 'Emergency Ambulance', 'ambulance', '#f8fafc', '#ef4444', [
    { id: 'amb-0', time: 0, position: [11.2, 0.06, -6.2], rotation: [0, -0.55, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'amb-pre', time: 56.15, position: [11.2, 0.06, -6.2], rotation: [0, -0.55, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'amb-roll', time: 56.2, position: [11.2, 0.06, -6.2], rotation: [0, -0.55, 0], scale: [0.96, 0.96, 0.96], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
    { id: 'amb-dock', time: 57.5, position: [2.75, 0.06, -5.85], rotation: [0, -0.55, 0], scale: [0.96, 0.96, 0.96], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'amb-off', time: 64.0, position: [2.75, 0.06, -5.85], rotation: [0, -0.55, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-stretcher', 'Paramedic Stretcher', 'stretcher', '#dc2626', '#cbd5e1', [
    { id: 'str-0', time: 0, position: [2.45, 0.14, -4.55], rotation: [0, 0.95, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'str-pre', time: 57.45, position: [2.45, 0.14, -4.55], rotation: [0, 0.95, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'str-in', time: 57.5, position: [2.45, 0.14, -4.55], rotation: [0, 0.95, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
    { id: 'str-stop', time: 60.0, position: [1.05, 0.14, -0.55], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'str-off', time: 64, position: [1.05, 0.14, -0.55], rotation: [0, Math.PI / 2, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-horse-platter', 'Clydesdale on Silver Platter', 'clydesdalePlatter', '#78350f', '#e2e8f0', [
    { id: 'hrs-0', time: 0, position: [0.05, 0.04, -4.35], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'hrs-pre', time: 69.35, position: [0.05, 0.04, -4.35], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'hrs-in', time: 69.4, position: [0.05, 0.04, -4.35], rotation: [0, -0.45, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
    { id: 'hrs-stop', time: 73.2, position: [-0.15, 0.04, 0.65], rotation: [0, -0.95, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'hrs-off', time: 77, position: [-0.15, 0.04, 0.65], rotation: [0, -0.95, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-flying-pigs', 'Flock of Flying Pigs', 'flyingPigs', '#f472b6', '#fef08a',
    makeActorWindow('pigs', 77, 90, [2.2, 0.85, 1.85], [0, 0, 0], [1.12, 1.12, 1.12], 'idle')),

  makePropActor('prop-tour-bus', 'Verbatim Tour Bus', 'sightseeingBus', '#eab308', '#1e293b',
    makeActorWindow('bus', 77, 90, [7.2, 0, 2.05], [0, -Math.PI / 2, 0], [1, 1, 1], 'idle')),

  makePropActor('prop-sedan', 'Parked Sedan', 'parkedSedan', '#2563eb', '#e2e8f0',
    makeActorWindow('sedan', 77, 90, [3.8, 0, 4.65], [0, -Math.PI / 2, 0], [1, 1, 1], 'idle')),

  makePropActor('prop-groceries', 'Dropped Groceries', 'grocerySpill', '#d97706', '#22c55e',
    makeActorWindow('groc', 82.8, 90, [0.95, 0.08, -0.85], [0, 0.4, 0], [1.15, 1.15, 1.15], 'idle')),
];

// =========================================================================
// Chapters, Map Track, Lighting Track, Stage Lights, Cameras, Subtitles & SFX
// =========================================================================

const CHAPTERS: ChapterMarker[] = [
  { id: 'ch-1-hook', time: 0, title: '1. Welcome to Verbatim', color: '#0ea5e9' },
  { id: 'ch-2-beans', time: 12, title: '2. Spill the Beans', color: '#f59e0b' },
  { id: 'ch-3-elephant', time: 25, title: '3. Elephant in Room', color: '#64748b' },
  { id: 'ch-4-wedding', time: 38, title: '4. Cold Feet', color: '#ec4899' },
  { id: 'ch-5-theater', time: 51, title: '5. Break a Leg', color: '#ef4444' },
  { id: 'ch-6-diner', time: 64, title: '6. Eat a Horse', color: '#10b981' },
  { id: 'ch-7-punchline', time: 77, title: '7. Blow My Mind', color: '#8b5cf6' },
];

const MAP_TRACK: MapKeyframe[] = [
  { id: 'mk-s1', time: 0, environment: 'custom', customMap: SCENE_1_MAP, applyAtmosphere: true, label: '1. Welcome to Verbatim' },
  { id: 'mk-s2', time: 12, environment: 'custom', customMap: SCENE_2_MAP, applyAtmosphere: true, label: '2. Verbatim Coffee Shop' },
  { id: 'mk-s3', time: 25, environment: 'custom', customMap: SCENE_3_MAP, applyAtmosphere: true, label: '3. Corporate Boardroom' },
  { id: 'mk-s4', time: 38, environment: 'custom', customMap: SCENE_4_MAP, applyAtmosphere: true, label: '4. Verbatim Chapel Altar' },
  { id: 'mk-s5', time: 51, environment: 'custom', customMap: SCENE_5_MAP, applyAtmosphere: true, label: '5. Theater Backstage' },
  { id: 'mk-s6', time: 64, environment: 'custom', customMap: SCENE_6_MAP, applyAtmosphere: true, label: '6. Verbatim Retro Diner' },
  { id: 'mk-s7', time: 77, environment: 'custom', customMap: SCENE_7_MAP, applyAtmosphere: true, label: '7. Verbatim Main Street' },
];

const LIGHTING_TRACK: LightingKeyframe[] = [
  // Scene 1: Pre-storm sun break -> lightning flash -> dark slate pet downpour
  { id: 'lk-s1-sun', time: 0, sunAzimuth: 38, sunElevation: 56, keyIntensity: 2.35, rimIntensity: 1.05, ambientIntensity: 0.96, exposure: 1.04, keyColor: '#fef3c7', easing: 'easeInOut' },
  { id: 'lk-s1-flash', time: 3.2, sunAzimuth: -18, sunElevation: 42, keyIntensity: 3.35, rimIntensity: 1.75, ambientIntensity: 0.85, exposure: 1.18, keyColor: '#bae6fd', easing: 'step' },
  { id: 'lk-s1-storm', time: 3.45, sunAzimuth: -25, sunElevation: 24, keyIntensity: 1.12, rimIntensity: 1.25, ambientIntensity: 0.58, exposure: 0.90, keyColor: '#64748b', easing: 'easeInOut' },

  // Scene 2: Cozy Golden Espresso Café -> warm amber bean-waterfall flare
  { id: 'lk-s2', time: 12, sunAzimuth: -35, sunElevation: 38, keyIntensity: 2.25, rimIntensity: 1.15, ambientIntensity: 0.94, exposure: 1.05, keyColor: '#fbbf24', easing: 'step' },
  { id: 'lk-s2-beans', time: 16.0, sunAzimuth: -28, sunElevation: 42, keyIntensity: 2.45, rimIntensity: 1.25, ambientIntensity: 0.96, exposure: 1.08, keyColor: '#f59e0b', easing: 'easeInOut' },

  // Scene 3: Crisp High-Rise Skylight -> bright elephant reveal
  { id: 'lk-s3', time: 25, sunAzimuth: 18, sunElevation: 62, keyIntensity: 2.35, rimIntensity: 1.1, ambientIntensity: 1.04, exposure: 1.06, keyColor: '#e0f2fe', easing: 'step' },
  { id: 'lk-s3-reveal', time: 30.8, sunAzimuth: 24, sunElevation: 58, keyIntensity: 2.55, rimIntensity: 1.35, ambientIntensity: 1.06, exposure: 1.08, keyColor: '#f8fafc', easing: 'easeInOut' },

  // Scene 4: Stained-Glass Sanctuary -> Icy Cyan Freeze -> Warm Hairdryer Thaw
  { id: 'lk-s4', time: 38, sunAzimuth: 25, sunElevation: 55, keyIntensity: 2.45, rimIntensity: 1.15, ambientIntensity: 1.06, exposure: 1.08, keyColor: '#fef08a', easing: 'step' },
  { id: 'lk-s4-ice', time: 40.6, sunAzimuth: -15, sunElevation: 48, keyIntensity: 2.15, rimIntensity: 1.55, ambientIntensity: 0.88, exposure: 1.02, keyColor: '#38bdf8', easing: 'step' },
  { id: 'lk-s4-thaw', time: 46.2, sunAzimuth: 22, sunElevation: 52, keyIntensity: 2.38, rimIntensity: 1.25, ambientIntensity: 0.98, exposure: 1.06, keyColor: '#fb923c', easing: 'easeInOut' },

  // Scene 5: Midnight Theater Spotlight -> Paramedic Siren Emergency Pulse
  { id: 'lk-s5', time: 51, sunAzimuth: -20, sunElevation: 42, keyIntensity: 2.1, rimIntensity: 1.5, ambientIntensity: 0.58, exposure: 1.02, keyColor: '#f59e0b', easing: 'step' },
  { id: 'lk-s5-siren', time: 58.2, sunAzimuth: 16, sunElevation: 44, keyIntensity: 2.25, rimIntensity: 1.65, ambientIntensity: 0.64, exposure: 1.05, keyColor: '#f87171', easing: 'easeInOut' },

  // Scene 6: Neon Retro Diner -> Silver Platter Presentation Highlight
  { id: 'lk-s6', time: 64, sunAzimuth: 42, sunElevation: 48, keyIntensity: 2.3, rimIntensity: 1.25, ambientIntensity: 0.95, exposure: 1.06, keyColor: '#fb923c', easing: 'step' },
  { id: 'lk-s6-platter', time: 69.8, sunAzimuth: 32, sunElevation: 52, keyIntensity: 2.55, rimIntensity: 1.4, ambientIntensity: 1.0, exposure: 1.09, keyColor: '#fde047', easing: 'easeInOut' },

  // Scene 7: Downtown Main Street Daylight -> Crimson Pre-Blowout Tension
  { id: 'lk-s7', time: 77, sunAzimuth: 46, sunElevation: 56, keyIntensity: 2.45, rimIntensity: 1.15, ambientIntensity: 1.02, exposure: 1.07, keyColor: '#fef08a', easing: 'step' },
  { id: 'lk-s7-panic', time: 82.8, sunAzimuth: -32, sunElevation: 38, keyIntensity: 2.65, rimIntensity: 1.55, ambientIntensity: 0.9, exposure: 1.1, keyColor: '#fb7185', easing: 'easeInOut' },
];

const STAGE_LIGHTS: StageLightConfig[] = [
  {
    id: 'slight-idiom-key',
    name: 'Center Stage Key Spot',
    type: 'spot',
    color: '#fff1c2',
    intensity: 14,
    distance: 20,
    angleDeg: 44,
    penumbra: 0.55,
    position: [0, 5.4, 3.2],
    target: [0, 1.2, 0.2],
    enabled: true,
    castShadow: false,
  },
  {
    id: 'slight-idiom-rim',
    name: 'Cinema Accent Fill',
    type: 'point',
    color: '#38bdf8',
    intensity: 6.5,
    distance: 14,
    angleDeg: 45,
    penumbra: 0.5,
    position: [-3.4, 3.8, -1.6],
    target: [0, 1.2, 0],
    enabled: true,
    castShadow: false,
  },
];

// Automatic Cinematic Hybrid 3P <-> 1P Track:
// Scene 1 remains pure Third-Person; Scenes 2-7 establish wide in 3P, punch into 1P POV for the gag reaction, then cut back to 3P for the wide aftermath.
// All camera shots strictly verify unobstructed sightlines, visibleHeight >= 5.5, and fov >= 48.
const CAMERA_TRACK: CameraKeyframe[] = [
  // Scene 1: Verbatim Hook (Pure 3P) — sweeping skyline crane -> dialogue medium -> umbrella clang reaction -> storm wide hold
  { id: 'cam-s1-wide', time: 0, position: [-2.4, 4.3, 11.2], target: [0, 2.2, -1.6], fov: 54, pathMode: 'spline', easing: 'easeInOut' },
  { id: 'cam-s1-sweep', time: 2.8, position: [1.4, 3.1, 8.4], target: [-0.2, 1.9, 0.5], fov: 52, pathMode: 'spline', easing: 'step' },
  { id: 'cam-s1-man', time: 3.45, position: [2.6, 2.45, 7.5], target: [-0.3, 1.75, 1.3], fov: 50, pathMode: 'spline', easing: 'easeInOut', shakeIntensity: 0.09, shakeFrequency: 18 },
  { id: 'cam-s1-rain', time: 5.2, position: [-3.1, 2.75, 8.2], target: [-0.9, 1.95, 1.6], fov: 52, pathMode: 'spline', easing: 'easeInOut', shakeIntensity: 0.06, shakeFrequency: 15 },
  { id: 'cam-s1-out', time: 11.5, position: [-4.4, 3.6, 9.5], target: [-0.6, 2.0, 0.9], fov: 54, easing: 'step' },

  // Scene 2: Spill the Beans (3P Wide -> 1P Café Friend POV -> 3P Wide Barista Entrance)
  { id: 'cam-s2-booth', time: 12, position: [1.2, 3.25, 7.5], target: [-1.0, 1.45, -0.35], fov: 54, easing: 'step' },
  { id: 'cam-s2-gossip', time: 13.7, position: [-0.12, 2.08, 0.22], target: [-5.95, 1.65, 0.16], fov: 54, povActorId: 'idiom-listener', easing: 'step' },
  { id: 'cam-s2-beans', time: 16.0, position: [0.08, 2.05, 0.24], target: [-5.75, 1.25, 0.18], fov: 56, povActorId: 'idiom-listener', easing: 'step', shakeIntensity: 0.12, shakeFrequency: 19 },
  { id: 'cam-s2-shovel', time: 18.4, position: [2.15, 2.85, 6.75], target: [-0.35, 1.45, -0.35], fov: 54, pathMode: 'spline', easing: 'easeInOut' },
  { id: 'cam-s2-hold', time: 24.4, position: [2.55, 2.95, 7.05], target: [-0.35, 1.45, -0.45], fov: 54, easing: 'step' },

  // Scene 3: Elephant in the Room (3P Elevated Center Corridor -> 1P Executive 3 POV -> 3P Elevated Trumpet Wide)
  { id: 'cam-s3-pan-l', time: 25, position: [-1.05, 3.55, 7.85], target: [0.0, 1.9, -0.3], fov: 54, pathMode: 'spline', easing: 'easeInOut' },
  { id: 'cam-s3-pan-mid', time: 28.2, position: [1.05, 3.45, 7.75], target: [0.0, 1.9, -0.3], fov: 54, easing: 'step' },
  { id: 'cam-s3-elephant', time: 30.6, position: [-2.32, 2.38, 1.65], target: [3.2, 1.65, -2.2], fov: 56, povActorId: 'idiom-exec-3', easing: 'step', shakeIntensity: 0.05, shakeFrequency: 14 },
  { id: 'cam-s3-trumpet', time: 33.8, position: [0.0, 3.65, 8.15], target: [0.0, 1.95, -0.35], fov: 56, pathMode: 'spline', easing: 'easeInOut', shakeIntensity: 0.14, shakeFrequency: 18 },
  { id: 'cam-s3-close', time: 36.8, position: [-0.85, 3.6, 8.2], target: [0.0, 1.9, -0.35], fov: 54, easing: 'step' },

  // Scene 4: Cold Feet (3P Clear Chapel Aisle -> 1P Groom POV & Look-Down Ice Feet -> 3P Wide Side-Arch Hairdryer Rescue)
  { id: 'cam-s4-altar', time: 38, position: [0.0, 3.15, 6.2], target: [0.0, 1.85, -2.2], fov: 54, easing: 'step' },
  { id: 'cam-s4-freeze', time: 40.6, position: [0.92, 2.52, -1.95], target: [-5.2, 1.95, -2.0], fov: 56, povActorId: 'idiom-groom', easing: 'step', shakeIntensity: 0.08, shakeFrequency: 18 },
  { id: 'cam-s4-feet', time: 42.2, position: [1.15, 2.55, -1.95], target: [0.55, -3.45, -1.95], fov: 62, povActorId: 'idiom-groom', easing: 'step' },
  { id: 'cam-s4-dryer', time: 44.2, position: [-1.65, 2.65, 5.15], target: [0.05, 1.45, -1.75], fov: 54, pathMode: 'spline', easing: 'easeInOut' },
  { id: 'cam-s4-thaw', time: 49.8, position: [0.0, 2.95, 5.85], target: [0.0, 1.75, -2.1], fov: 54, easing: 'step' },

  // Scene 5: Break a Leg (3P Backstage Two-Shot -> 1P Lead Actor Look-Down Cast Snap -> 3P Wide Ambulance & Stretcher Hero Shot)
  { id: 'cam-s5-wings', time: 51, position: [-1.15, 2.95, 7.65], target: [-0.85, 1.65, -0.85], fov: 54, pathMode: 'spline', easing: 'easeInOut' },
  { id: 'cam-s5-slap', time: 53.2, position: [-1.55, 2.15, 6.25], target: [-1.25, 1.65, 0.15], fov: 50, easing: 'step' },
  { id: 'cam-s5-cast', time: 56.0, position: [-0.65, 2.42, 0.42], target: [-0.72, -3.58, 0.95], fov: 62, povActorId: 'idiom-shakespeare', easing: 'step', shakeIntensity: 0.16, shakeFrequency: 21 },
  { id: 'cam-s5-emt', time: 58.2, position: [-2.35, 3.05, 7.65], target: [0.55, 1.65, -1.65], fov: 56, pathMode: 'spline', easing: 'easeInOut' },
  { id: 'cam-s5-end', time: 63.4, position: [-1.85, 3.25, 8.25], target: [0.45, 1.65, -1.85], fov: 56, easing: 'step' },

  // Scene 6: Eat a Horse (3P Retro Diner Booth -> 1P Tourist POV Kitchen Door Burst -> 3P Deadpan Platter Wide)
  { id: 'cam-s6-booth', time: 64, position: [0.85, 3.15, 7.65], target: [-1.15, 1.65, -0.65], fov: 54, pathMode: 'spline', easing: 'easeInOut' },
  { id: 'cam-s6-order', time: 66.8, position: [-1.75, 2.25, 6.75], target: [-2.35, 1.45, 0.75], fov: 50, easing: 'step' },
  { id: 'cam-s6-horse', time: 69.4, position: [-3.18, 2.15, 0.72], target: [2.45, 1.65, -2.55], fov: 56, povActorId: 'idiom-tourist', easing: 'step', shakeIntensity: 0.06, shakeFrequency: 14 },
  { id: 'cam-s6-platter', time: 73.4, position: [-0.25, 2.85, 7.85], target: [-1.15, 1.65, 0.25], fov: 56, easing: 'step' },

  // Scene 7: Blow My Mind (3P Main Street Boulevard -> 1P Tourist POV East Down Main St -> 3P Crimson Panic Wide -> Push-In Blackout)
  { id: 'cam-s7-pigs', time: 77, position: [-6.8, 3.85, 8.6], target: [1.2, 2.45, 0.2], fov: 56, easing: 'step' },
  { id: 'cam-s7-tourist', time: 79.8, position: [-2.55, 2.48, -0.92], target: [6.8, 2.05, 1.45], fov: 58, povActorId: 'idiom-tourist', easing: 'step' },
  { id: 'cam-s7-panic', time: 83.2, position: [-2.8, 3.15, 9.85], target: [0.85, 1.35, 1.45], fov: 54, pathMode: 'spline', easing: 'easeInOut', shakeIntensity: 0.14, shakeFrequency: 19 },
  { id: 'cam-s7-smash', time: 85.0, position: [-3.85, 2.35, 5.85], target: [-2.75, 1.55, -0.95], fov: 50, shakeIntensity: 0.22, shakeFrequency: 24, easing: 'step' },
];

const SUBTITLES: SubtitleCue[] = [
  // Scene 1
  { id: 'sub-1a', startTime: 3.6, endTime: 6.1, speaker: 'Man', role: 'dialogue', text: "Looks like it's raining *cats and dogs.*" },
  { id: 'sub-1b', startTime: 6.4, endTime: 11.6, speaker: 'Narrator', role: 'voiceover', text: 'In this town, every single figure of speech happens *literally.*' },

  // Scene 2
  { id: 'sub-2a', startTime: 13.7, endTime: 16.3, speaker: 'Gossiper', role: 'dialogue', text: "Okay, fine. I'll *spill the beans!*" },
  { id: 'sub-2b', startTime: 16.9, endTime: 24.5, speaker: 'Narrator', role: 'voiceover', text: 'That means you have to be *extremely* careful with what you say. Because if you love gossip, someone has to *clean it up.*' },

  // Scene 3
  { id: 'sub-3', startTime: 28.2, endTime: 37.4, speaker: 'Narrator', role: 'voiceover', text: 'Office meetings are a *complete disaster,* mostly because nobody ever wants to address the *elephant in the room.*' },

  // Scene 4
  { id: 'sub-4', startTime: 41.2, endTime: 50.2, speaker: 'Narrator', role: 'voiceover', text: 'Half the weddings get postponed the second the groom gets *cold feet...*' },

  // Scene 5
  { id: 'sub-5a', startTime: 53.2, endTime: 55.8, speaker: 'Stagehand', role: 'dialogue', text: 'You got this! Go *break a leg!*' },
  { id: 'sub-5b', startTime: 56.9, endTime: 63.5, speaker: 'Narrator', role: 'voiceover', text: '...and the local theater has been sued *fourteen times* just for wishing actors good luck.' },

  // Scene 6
  { id: 'sub-6a', startTime: 65.2, endTime: 68.4, speaker: 'Tourist', role: 'dialogue', text: 'Man, I am so hungry I could *eat a horse.*' },
  { id: 'sub-6b', startTime: 70.0, endTime: 76.6, speaker: 'Narrator', role: 'voiceover', text: 'Locals have learned to speak in plain, boring facts. Tourists? They usually learn the *hard way.*' },

  // Scene 7
  { id: 'sub-7a', startTime: 79.8, endTime: 82.9, speaker: 'Tourist', role: 'dialogue', text: 'Whoa... this place is about to *blow my mind!*' },
  { id: 'sub-7b', startTime: 85.2, endTime: 89.9, speaker: 'Narrator', role: 'voiceover', text: "Just whatever you do—if you ever visit—*never* tell anyone they're going to *blow my mind.*" },
];

const SFX_TRACK: SfxCue[] = [
  { id: 'sfx-1-thunder', time: 3.2, kind: 'thunder', label: 'Storm Thunderclap', volume: 0.82 },
  { id: 'sfx-1-pets', time: 4.1, kind: 'catsDogsRain', label: 'Barking & Meowing Rain', volume: 0.75 },
  { id: 'sfx-1-clang1', time: 5.73, kind: 'umbrellaClang', label: 'Steel Umbrella Clang 1', volume: 0.82 },
  { id: 'sfx-1-clang2', time: 6.35, kind: 'umbrellaClang', label: 'Steel Umbrella Clang 2', volume: 0.78 },
  { id: 'sfx-1-clang3', time: 7.75, kind: 'umbrellaClang', label: 'Steel Umbrella Clang 3', volume: 0.76 },
  { id: 'sfx-1-clang4', time: 9.35, kind: 'umbrellaClang', label: 'Steel Umbrella Clang 4', volume: 0.72 },
  { id: 'sfx-2-cafe', time: 12.4, kind: 'cafeChatter', label: 'Cafe Espresso Steam', volume: 0.55 },
  { id: 'sfx-2-beans', time: 16.0, kind: 'beanCascade', label: 'Pinto Bean Avalanche', volume: 0.85 },
  { id: 'sfx-3-hum', time: 25.4, kind: 'officeSilence', label: 'Awkward Office Hum', volume: 0.5 },
  { id: 'sfx-3-stapler', time: 30.6, kind: 'staplerCrunch', label: 'Stapler Crunch', volume: 0.78 },
  { id: 'sfx-3-trumpet', time: 33.8, kind: 'elephantTrumpet', label: 'Elephant Trumpet', volume: 0.78 },
  { id: 'sfx-4-organ', time: 40.3, kind: 'weddingOrganScratch', label: 'Organ Record Scratch', volume: 0.8 },
  { id: 'sfx-4-ice', time: 43.8, kind: 'iceCrackWhir', label: 'Ice Crack + Hairdryer', volume: 0.82 },
  { id: 'sfx-5-snap', time: 56.0, kind: 'legSnap', label: 'Instant Leg Cast Snap', volume: 0.85 },
  { id: 'sfx-5-siren', time: 58.2, kind: 'ambulanceSiren', label: 'Paramedic Siren', volume: 0.7 },
  { id: 'sfx-6-diner', time: 64.4, kind: 'dinerClatter', label: 'Diner Dishes Clatter', volume: 0.65 },
  { id: 'sfx-6-horse', time: 70.0, kind: 'horseCartNeigh', label: 'Clydesdale Neigh', volume: 0.8 },
  { id: 'sfx-7-panic', time: 82.9, kind: 'crowdPanicScreech', label: 'Crowd Panic', volume: 0.82 },
  { id: 'sfx-7-smash', time: 86.5, kind: 'smashCutSilence', label: 'Smash Cut Silence', volume: 1.0 },
];

const SCREEN_EFFECTS: ScreenEffectKeyframe[] = [
  { id: 'se-0', time: 0, blackout: 0, easing: 'step' },
  { id: 'se-pre', time: 86.45, blackout: 0, easing: 'step' },
  { id: 'se-cut', time: 86.5, blackout: 1, easing: 'step' },
  { id: 'se-end', time: 90, blackout: 1, easing: 'step' },
];

export const THE_IDIOM_TOWN_PROJECT: AnimationProject = {
  id: 'proj_idiom_town_ep1',
  name: 'The Idiom Town (Ep. 1)',
  environment: 'custom',
  customMap: SCENE_1_MAP,
  lightingMood: 'overcast',
  sunAzimuth: 38,
  sunElevation: 56,
  keyIntensity: 2.35,
  rimIntensity: 1.05,
  ambientIntensity: 0.96,
  exposure: 1.04,
  duration: 90,
  fps: 30,
  loop: false,
  chapters: CHAPTERS,
  mapTrack: MAP_TRACK,
  lightingTrack: LIGHTING_TRACK,
  stageLights: STAGE_LIGHTS,
  actors: ACTORS,
  cameraTrack: CAMERA_TRACK,
  subtitles: SUBTITLES,
  sfxTrack: SFX_TRACK,
  screenEffects: SCREEN_EFFECTS,
  captionSettings: {
    mode: 'wordPop',
    position: 'bottom',
    size: 'medium',
    wordsPerChunk: 3,
    highlightColor: '#fbbf24',
    emphasisColor: '#ff5d73',
    backdrop: 'scrim',
    showSpeaker: true,
    emphasisPop: true,
  },
  narratorSettings: {
    engine: 'ai',
    voice: 'Charon',
    style: 'snappyComedy',
    speed: 1.02,
    pitchSemitones: 0,
    volume: 0.94,
    autoDuckSfx: true,
    duckAmount: 0.68,
  },
};
