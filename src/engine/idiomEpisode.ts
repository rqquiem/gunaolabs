import {
  AnimationProject,
  CameraKeyframe,
  ChapterMarker,
  ClothingConfig,
  FaceKeyframe,
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
  SubtitleCue,
  Vec3Tuple,
} from './types';
import { createEmptyCharacterHeldItems, createDefaultHandStateForItem } from './itemCatalog';
import { cloneBundle } from './robloxCatalog';

function makeDefaultOrnaments(
  hat: { id: string; color: string; accentColor?: string } = { id: 'none', color: '#1b2a35', accentColor: '#f2f3f3' },
  head: { id: string; color: string; accentColor?: string } = { id: 'none', color: '#1b2a35', accentColor: '#38bdf8' },
  back: { id: string; color: string; accentColor?: string } = { id: 'none', color: '#1b2a35', accentColor: '#f5cd30' },
): R6Ornaments {
  return {
    head,
    hat,
    face: { id: 'smile', color: '#111827', accentColor: '#ffffff' },
    arm: { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
    back,
    legs: { id: 'none', color: '#635f62', accentColor: '#f5cd30' },
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

  frames.push({
    id: `${idPrefix}-enter`,
    time: startSec,
    position: pos,
    rotation: rot,
    scale,
    clip,
    clipSpeed: 1,
    easing: extraFrames.length > 0 ? 'easeInOut' : 'step',
  });

  frames.push(...extraFrames);

  if (endSec < 90) {
    frames.push({
      id: `${idPrefix}-exit`,
      time: endSec,
      position: pos,
      rotation: rot,
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
  keyframes: SceneActorConfig['keyframes'];
  faceKeyframes?: FaceKeyframe[];
  heldItemKeyframes?: HeldItemKeyframe[];
  lookAtTarget?: string;
}): SceneActorConfig {
  const baseBundle = cloneBundle('noob');
  return {
    id: config.id,
    name: config.name,
    kind: 'character',
    bundleId: 'noob',
    bodyColors: config.bodyColors,
    hair: config.hair,
    clothing: config.clothing,
    ornaments: config.ornaments ?? makeDefaultOrnaments(),
    faceConfig: baseBundle.faceConfig,
    faceKeyframes: config.faceKeyframes,
    heldItems: createEmptyCharacterHeldItems(),
    heldItemKeyframes: config.heldItemKeyframes,
    lookAtTarget: config.lookAtTarget ?? 'camera',
    lookAtWeight: 0.55,
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
  description: 'Sunny small-town entrance with wooden welcome sign before the pet storm.',
  recommendedLighting: {
    mood: 'noon',
    sunAzimuth: 38,
    sunElevation: 58,
    keyIntensity: 2.35,
    rimIntensity: 1.05,
    ambientIntensity: 0.98,
    exposure: 1.05,
  },
  baseplate: {
    size: 32,
    groundColor: '#4d8b55',
    trimColor: '#3f7245',
    pathStyle: 'street',
    perimeter: 'trees',
    studDensity: 1.2,
  },
  modules: [
    { id: 's1-sign', kind: 'verbatimSign', label: 'Verbatim Sign', position: [0, 0, -2.5], rotationYDeg: 0, scale: 1, primaryColor: '#78350f', accentColor: '#f43f5e' },
    { id: 's1-house-l', kind: 'suburbanHouse', label: 'Town House L', position: [-8.5, 0, -6.5], rotationYDeg: 11, scale: 1, primaryColor: '#f8fafc', accentColor: '#dc2626' },
    { id: 's1-house-r', kind: 'suburbanHouse', label: 'Town House R', position: [8.5, 0, -6.5], rotationYDeg: -11, scale: 1, primaryColor: '#fef3c7', accentColor: '#2563eb' },
    { id: 's1-tree-1', kind: 'treeGrove', label: 'Tree Grove L', position: [-4.8, 0, -2.2], rotationYDeg: 0, scale: 1.0, primaryColor: '#6b4226', accentColor: '#27462d' },
    { id: 's1-tree-2', kind: 'treeGrove', label: 'Tree Grove R', position: [5.0, 0, -2.0], rotationYDeg: 34, scale: 1.0, primaryColor: '#6b4226', accentColor: '#27462d' },
  ],
};

const SCENE_2_MAP: MapDefinition = {
  id: 'idiom_map_s2_cafe',
  name: 'Verbatim Coffee Shop',
  category: 'interior',
  builtIn: false,
  description: 'Cozy wood-paneled coffee corner booth and espresso counter.',
  recommendedLighting: {
    mood: 'sunset',
    sunAzimuth: -35,
    sunElevation: 38,
    keyIntensity: 2.15,
    rimIntensity: 0.95,
    ambientIntensity: 0.92,
    exposure: 1.04,
  },
  baseplate: {
    size: 20,
    groundColor: '#7c4a2d',
    trimColor: '#451a03',
    pathStyle: 'hardwood',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's2-cafe', kind: 'cafeCounter', label: 'Bean Cafe Corner', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#7c4a2d', accentColor: '#dc2626' },
    { id: 's2-lamp', kind: 'streetLamp', label: 'Corner Lamp', position: [-3.8, 0, -2.6], rotationYDeg: 0, scale: 0.9, primaryColor: '#1e293b', accentColor: '#fbbf24' },
  ],
};

const SCENE_3_MAP: MapDefinition = {
  id: 'idiom_map_s3_boardroom',
  name: 'Corporate Boardroom',
  category: 'interior',
  builtIn: false,
  description: 'Sleek office conference room with mahogany table and glowing presentation wall.',
  recommendedLighting: {
    mood: 'noon',
    sunAzimuth: 18,
    sunElevation: 62,
    keyIntensity: 2.25,
    rimIntensity: 0.9,
    ambientIntensity: 1.05,
    exposure: 1.06,
  },
  baseplate: {
    size: 22,
    groundColor: '#334155',
    trimColor: '#1e293b',
    pathStyle: 'none',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's3-boardroom', kind: 'boardroomSuite', label: 'Boardroom Suite', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#78350f', accentColor: '#38bdf8' },
  ],
};

const SCENE_4_MAP: MapDefinition = {
  id: 'idiom_map_s4_wedding',
  name: 'Verbatim Chapel Altar',
  category: 'interior',
  builtIn: false,
  description: 'Bright church altar with stained glass windows, red carpet, and marble arch.',
  recommendedLighting: {
    mood: 'noon',
    sunAzimuth: 25,
    sunElevation: 55,
    keyIntensity: 2.45,
    rimIntensity: 1.1,
    ambientIntensity: 1.08,
    exposure: 1.08,
  },
  baseplate: {
    size: 24,
    groundColor: '#e2e8f0',
    trimColor: '#cbd5e1',
    pathStyle: 'none',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's4-altar', kind: 'weddingAltar', label: 'Church Altar', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#f8fafc', accentColor: '#dc2626' },
  ],
};

const SCENE_5_MAP: MapDefinition = {
  id: 'idiom_map_s5_theater',
  name: 'Theater Backstage Wings',
  category: 'interior',
  builtIn: false,
  description: 'Dimly lit backstage wings with crimson velvet curtains and overhead truss spotlight.',
  recommendedLighting: {
    mood: 'midnight',
    sunAzimuth: -20,
    sunElevation: 42,
    keyIntensity: 1.85,
    rimIntensity: 1.35,
    ambientIntensity: 0.65,
    exposure: 1.02,
  },
  baseplate: {
    size: 22,
    groundColor: '#291d18',
    trimColor: '#0f172a',
    pathStyle: 'hardwood',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's5-wings', kind: 'theaterWings', label: 'Theater Backstage', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#991b1b', accentColor: '#fbbf24' },
  ],
};

const SCENE_6_MAP: MapDefinition = {
  id: 'idiom_map_s6_diner',
  name: 'Verbatim Retro Diner',
  category: 'interior',
  builtIn: false,
  description: 'Checkered floor diner with red vinyl booth, counter stools, and swinging kitchen doors.',
  recommendedLighting: {
    mood: 'sunset',
    sunAzimuth: 42,
    sunElevation: 48,
    keyIntensity: 2.3,
    rimIntensity: 1.0,
    ambientIntensity: 0.96,
    exposure: 1.06,
  },
  baseplate: {
    size: 22,
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
  description: 'Bustling town sidewalk lined with colorful storefronts and bus stop.',
  recommendedLighting: {
    mood: 'noon',
    sunAzimuth: 46,
    sunElevation: 56,
    keyIntensity: 2.4,
    rimIntensity: 1.05,
    ambientIntensity: 1.0,
    exposure: 1.06,
  },
  baseplate: {
    size: 34,
    groundColor: '#94a3b8',
    trimColor: '#475569',
    pathStyle: 'street',
    perimeter: 'open',
    studDensity: 1.2,
  },
  modules: [
    { id: 's7-street', kind: 'mainStreetSet', label: 'Verbatim Main St', position: [0, 0, 0], rotationYDeg: 0, scale: 1, primaryColor: '#94a3b8', accentColor: '#0284c7' },
    { id: 's7-lamp-l', kind: 'streetLamp', label: 'Street Lamp L', position: [-6.0, 0, 1.0], rotationYDeg: 0, scale: 1, primaryColor: '#1b2a35', accentColor: '#fef08a' },
    { id: 's7-lamp-r', kind: 'streetLamp', label: 'Street Lamp R', position: [6.0, 0, 1.0], rotationYDeg: 0, scale: 1, primaryColor: '#1b2a35', accentColor: '#fef08a' },
  ],
};

// =========================================================================
// Cast & Literal Gag Props
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

const ACTORS: SceneActorConfig[] = [
  // 1. Local Man (Scene 1 umbrella + Scene 7 panicking local)
  makeCharActor({
    id: 'idiom-man-umbrella',
    name: 'Local Citizen',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'sidePart', primaryColor: '#3b2416', highlightColor: '#6b3f24', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'jacket', shirtColor: '#2563eb', shirtAccent: '#e2e8f0', sleeveMode: 'long', pantsId: 'jeans', pantsColor: '#1e3a8a', pantsAccent: '#94a3b8', footwearId: 'sneakers' },
    keyframes: [
      { id: 'man-s1-0', time: 0, position: [0.3, 0, 1.4], rotation: [0, 0.25, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
      { id: 'man-s1-talk', time: 3.6, position: [0.3, 0, 1.4], rotation: [0, 0.2, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.9, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'man-s1-brace', time: 5.7, position: [0.3, 0, 1.4], rotation: [0, 0.2, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.75, clipSpeed: 1, easing: 'step' },
      { id: 'man-hide', time: 12, position: [0.3, 0, 1.4], rotation: [0, 0.2, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'man-s7-pre', time: 76.95, position: [2.2, 0, 1.2], rotation: [0, -0.8, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'man-s7-in', time: 77, position: [2.2, 0, 1.2], rotation: [0, -0.8, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
      { id: 'man-s7-dive', time: 82.9, position: [2.2, 0, 1.2], rotation: [0, 1.3, 0], scale: [1, 1, 1], clip: 'run', clipSpeed: 1.5, easing: 'easeInOut' },
      { id: 'man-s7-duck', time: 84.5, position: [4.4, 0, 2.2], rotation: [0, 2.8, 0], scale: [1, 1, 1], clip: 'crouch', upperBodyClip: 'block', upperBodyWeight: 1, clipSpeed: 1, easing: 'step' },
    ],
    faceKeyframes: [
      { id: 'mf-0', time: 0, preset: 'happy', easing: 'step' },
      { id: 'mf-1', time: 3.4, preset: 'determined', easing: 'step' },
      { id: 'mf-2', time: 82.8, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 2. Town Local Bystander (Scene 1 umbrella + Scene 7 drops groceries)
  makeCharActor({
    id: 'idiom-bystander',
    name: 'Verbatim Neighbor',
    bodyColors: SKIN_WARM,
    hair: { styleId: 'ponytail', primaryColor: '#6b3f24', highlightColor: '#da8541', highlightPattern: 'tips', volume: 1 },
    clothing: { shirtId: 'hoodie', shirtColor: '#16a34a', shirtAccent: '#fef08a', sleeveMode: 'long', pantsId: 'cargo', pantsColor: '#334155', pantsAccent: '#94a3b8', footwearId: 'boots' },
    keyframes: [
      { id: 'bys-s1-0', time: 0, position: [-2.2, 0, 1.9], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
      { id: 'bys-s1-up', time: 5.7, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.7, clipSpeed: 1, easing: 'step' },
      { id: 'bys-hide', time: 12, position: [-2.2, 0, 1.9], rotation: [0, 0.45, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'bys-s7-pre', time: 76.95, position: [1.3, 0, 1.0], rotation: [0, -0.9, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
      { id: 'bys-s7-in', time: 77, position: [1.3, 0, 1.0], rotation: [0, -0.9, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 0.6, easing: 'easeInOut' },
      { id: 'bys-s7-panic', time: 82.8, position: [1.4, 0, 1.1], rotation: [0, 1.4, 0], scale: [1, 1, 1], clip: 'run', clipSpeed: 1.5, easing: 'easeInOut' },
      { id: 'bys-s7-hide', time: 84.4, position: [3.9, 0, 2.1], rotation: [0, 3.0, 0], scale: [1, 1, 1], clip: 'crouch', upperBodyClip: 'block', upperBodyWeight: 1, clipSpeed: 1, easing: 'step' },
    ],
    faceKeyframes: [
      { id: 'bf-0', time: 0, preset: 'happy', easing: 'step' },
      { id: 'bf-1', time: 5.5, preset: 'surprised', easing: 'step' },
      { id: 'bf-2', time: 77, preset: 'happy', easing: 'step' },
      { id: 'bf-3', time: 82.8, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 3. Woman A / Gossiper (Scene 2 Café + Scene 3 Boardroom worker)
  makeCharActor({
    id: 'idiom-gossiper',
    name: 'Gossiper',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'bob', primaryColor: '#181c24', highlightColor: '#ec4899', highlightPattern: 'streaks', volume: 1.05 },
    clothing: { shirtId: 'varsity', shirtColor: '#be185d', shirtAccent: '#fef3c7', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#1e293b', pantsAccent: '#64748b', footwearId: 'loafers' },
    keyframes: [
      ...makeActorWindow('gos-s2', 12, 25, [-2.15, 0.16, 0.2], [0, Math.PI / 2, 0], [1, 1, 1], 'sit', [
        { id: 'gos-s2-talk', time: 13.8, position: [-2.15, 0.16, 0.2], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'talkGesture', upperBodyWeight: 0.9, clipSpeed: 1, easing: 'easeInOut' },
        { id: 'gos-s2-shock', time: 16.4, position: [-2.15, 0.16, 0.2], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.65, clipSpeed: 1, easing: 'step' },
      ]),
    ],
    faceKeyframes: [
      { id: 'gf-0', time: 12, preset: 'wink', easing: 'step' },
      { id: 'gf-1', time: 13.8, preset: 'smug', easing: 'step' },
      { id: 'gf-2', time: 16.1, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 4. Woman B / Listener (Scene 2 Café)
  makeCharActor({
    id: 'idiom-listener',
    name: 'Café Friend',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'curly', primaryColor: '#8f3622', highlightColor: '#f59e0b', highlightPattern: 'ombre', volume: 1.1 },
    clothing: { shirtId: 'tshirt', shirtColor: '#0284c7', shirtAccent: '#f8fafc', sleeveMode: 'short', pantsId: 'jeans', pantsColor: '#334155', pantsAccent: '#94a3b8', footwearId: 'sneakers' },
    keyframes: makeActorWindow('lis-s2', 12, 25, [0.05, 0.16, 0.2], [0, -Math.PI / 2, 0], [1, 1, 1], 'sit', [
      { id: 'lis-s2-lean', time: 13.8, position: [0.05, 0.16, 0.2], rotation: [0, -Math.PI / 2, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'talkGesture', upperBodyWeight: 0.4, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'lis-s2-shock', time: 16.2, position: [0.05, 0.16, 0.2], rotation: [0, -Math.PI / 2, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.85, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'lf-0', time: 12, preset: 'happy', easing: 'step' },
      { id: 'lf-1', time: 16.1, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 5. Deadpan Barista with Snow Shovel (Scene 2)
  makeCharActor({
    id: 'idiom-barista',
    name: 'Deadpan Barista',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'undercut', primaryColor: '#3b2416', highlightColor: '#3b2416', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'vest', shirtColor: '#14532d', shirtAccent: '#fef3c7', sleeveMode: 'short', pantsId: 'slacks', pantsColor: '#18181b', pantsAccent: '#52525b', footwearId: 'boots' },
    ornaments: makeDefaultOrnaments({ id: 'cap', color: '#14532d', accentColor: '#fef3c7' }),
    keyframes: makeActorWindow('bar-s2', 12, 25, [2.9, 0, -0.5], [0, -0.6, 0], [1, 1, 1], 'idle', [
      { id: 'bar-walk', time: 17.8, position: [2.9, 0, -0.5], rotation: [0, -1.1, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 1, easing: 'easeInOut' },
      { id: 'bar-stop', time: 20.2, position: [1.55, 0, 0.35], rotation: [0, -1.45, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.45, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [{ id: 'barf-0', time: 12, preset: 'sad', easing: 'step' }],
    heldItemKeyframes: [
      { id: 'barh-0', time: 12, right: createDefaultHandStateForItem('snowShovel', 'right'), left: { itemId: 'none', primaryColor: '#1e293b', accentColor: '#cbd5e1', gripPreset: 'carry', scale: 1, positionOffset: [0, 0, 0], rotationDeg: [0, 0, 0] }, easing: 'step' },
    ],
  }),

  // 6. Stiff Executive A (Scene 3 Boardroom)
  makeCharActor({
    id: 'idiom-exec-1',
    name: 'Executive 1',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'sidePart', primaryColor: '#eab308', highlightColor: '#fef08a', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'suitCoat', shirtColor: '#1e293b', shirtAccent: '#dc2626', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#0f172a', pantsAccent: '#475569', footwearId: 'loafers' },
    ornaments: makeDefaultOrnaments(undefined, { id: 'shades', color: '#1e293b', accentColor: '#94a3b8' }),
    keyframes: makeActorWindow('ex1-s3', 25, 38, [-2.5, 0.2, -1.95], [0, 0, 0], [1, 1, 1], 'sit'),
    faceKeyframes: [{ id: 'ex1f-0', time: 25, preset: 'determined', easing: 'step' }],
    lookAtTarget: 'none',
  }),

  // 7. Stiff Executive B (Scene 3 Boardroom)
  makeCharActor({
    id: 'idiom-exec-2',
    name: 'Executive 2',
    bodyColors: SKIN_WARM,
    hair: { styleId: 'braids', primaryColor: '#181c24', highlightColor: '#181c24', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'suitCoat', shirtColor: '#334155', shirtAccent: '#38bdf8', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#1e293b', pantsAccent: '#64748b', footwearId: 'loafers' },
    keyframes: makeActorWindow('ex2-s3', 25, 38, [2.5, 0.2, -1.95], [0, 0, 0], [1, 1, 1], 'sit'),
    faceKeyframes: [{ id: 'ex2f-0', time: 25, preset: 'sad', easing: 'step' }],
    lookAtTarget: 'none',
  }),

  // 8. Stiff Executive C (Scene 3 Boardroom)
  makeCharActor({
    id: 'idiom-exec-3',
    name: 'Executive 3',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'swept', primaryColor: '#6b3f24', highlightColor: '#6b3f24', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'suitCoat', shirtColor: '#1e1b4b', shirtAccent: '#f5cd30', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#0f172a', pantsAccent: '#475569', footwearId: 'loafers' },
    keyframes: makeActorWindow('ex3-s3', 25, 38, [-2.5, 0.2, 1.95], [0, Math.PI, 0], [1, 1, 1], 'sit'),
    faceKeyframes: [{ id: 'ex3f-0', time: 25, preset: 'determined', easing: 'step' }],
    lookAtTarget: 'none',
  }),

  // 9. Stiff Executive D (Scene 3 Boardroom)
  makeCharActor({
    id: 'idiom-exec-4',
    name: 'Executive 4',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'spiky', primaryColor: '#8f3622', highlightColor: '#8f3622', highlightPattern: 'none', volume: 0.95 },
    clothing: { shirtId: 'suitCoat', shirtColor: '#374151', shirtAccent: '#e2e8f0', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#111827', pantsAccent: '#6b7280', footwearId: 'loafers' },
    keyframes: makeActorWindow('ex4-s3', 25, 38, [2.5, 0.2, 1.95], [0, Math.PI, 0], [1, 1, 1], 'sit'),
    faceKeyframes: [{ id: 'ex4f-0', time: 25, preset: 'smug', easing: 'step' }],
    lookAtTarget: 'none',
  }),

  // 10. Bride (Scene 4 Wedding)
  makeCharActor({
    id: 'idiom-bride',
    name: 'Bride',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'twinTails', primaryColor: '#3b2416', highlightColor: '#fef3c7', highlightPattern: 'tips', volume: 1.05 },
    clothing: { shirtId: 'vest', shirtColor: '#ffffff', shirtAccent: '#fb7185', sleeveMode: 'sleeveless', pantsId: 'slacks', pantsColor: '#f8fafc', pantsAccent: '#e2e8f0', footwearId: 'loafers' },
    ornaments: makeDefaultOrnaments({ id: 'crown', color: '#facc15', accentColor: '#f8fafc' }),
    keyframes: makeActorWindow('brd-s4', 38, 51, [-0.95, 0.32, -2.0], [0, Math.PI / 2, 0], [1, 1, 1], 'idle', [
      { id: 'brd-frown', time: 41.0, position: [-0.95, 0.32, -2.0], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.55, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'brdf-0', time: 38, preset: 'happy', easing: 'step' },
      { id: 'brdf-1', time: 40.7, preset: 'angry', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'brdh-0', time: 38, right: createDefaultHandStateForItem('bouquet', 'right'), left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
  }),

  // 11. Groom (Scene 4 Wedding)
  makeCharActor({
    id: 'idiom-groom',
    name: 'Groom',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'swept', primaryColor: '#181c24', highlightColor: '#181c24', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'suitCoat', shirtColor: '#0f172a', shirtAccent: '#f8fafc', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#0f172a', pantsAccent: '#334155', footwearId: 'loafers' },
    keyframes: makeActorWindow('grm-s4', 38, 51, [0.95, 0.32, -2.0], [0, -Math.PI / 2, 0], [1, 1, 1], 'idle', [
      { id: 'grm-freeze', time: 40.6, position: [0.95, 0.32, -2.0], rotation: [0, -Math.PI / 2, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.7, clipSpeed: 1.5, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'grmf-0', time: 38, preset: 'happy', easing: 'step' },
      { id: 'grmf-1', time: 40.5, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 12. Groomsman with Hairdryer (Scene 4 Wedding)
  makeCharActor({
    id: 'idiom-groomsman',
    name: 'Groomsman',
    bodyColors: SKIN_WARM,
    hair: { styleId: 'spiky', primaryColor: '#181c24', highlightColor: '#181c24', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'suitCoat', shirtColor: '#334155', shirtAccent: '#fb7185', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#1e293b', pantsAccent: '#64748b', footwearId: 'loafers' },
    keyframes: makeActorWindow('gms-s4', 38, 51, [2.4, 0, 4.6], [0, Math.PI, 0], [1, 1, 1], 'idle', [
      { id: 'gms-sprint', time: 43.4, position: [2.4, 0, 4.6], rotation: [0, 2.8, 0], scale: [1, 1, 1], clip: 'run', clipSpeed: 1.6, easing: 'easeInOut' },
      { id: 'gms-aim', time: 46.2, position: [1.95, 0.32, -1.35], rotation: [0, -2.35, 0], scale: [1, 1, 1], clip: 'crouch', upperBodyClip: 'point', upperBodyWeight: 0.95, clipSpeed: 1, easing: 'step' },
    ]),
    heldItemKeyframes: [
      { id: 'gmsh-0', time: 38, right: createDefaultHandStateForItem('hairdryer', 'right'), left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
  }),

  // 13. Shakespearean Actor (Scene 5 Theater)
  makeCharActor({
    id: 'idiom-shakespeare',
    name: 'Lead Actor',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'curly', primaryColor: '#6b3f24', highlightColor: '#eab308', highlightPattern: 'streaks', volume: 1.05 },
    clothing: { shirtId: 'knightTunic', shirtColor: '#7c2d12', shirtAccent: '#facc15', sleeveMode: 'long', pantsId: 'knightGreaves', pantsColor: '#1e293b', pantsAccent: '#facc15', footwearId: 'boots' },
    ornaments: makeDefaultOrnaments(undefined, undefined, { id: 'cape', color: '#991b1b', accentColor: '#facc15' }),
    keyframes: makeActorWindow('act-s5', 51, 64, [-0.55, 0.14, 0.25], [0, 0.3, 0], [1, 1, 1], 'idle', [
      { id: 'act-hop', time: 56.0, position: [-0.55, 0.14, 0.25], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'jump', clipSpeed: 1.3, easing: 'easeOutBack' },
      { id: 'act-limp', time: 57.6, position: [-1.35, 0.14, 0.55], rotation: [0, 0.5, 0], scale: [1, 1, 1], clip: 'crouch', upperBodyClip: 'block', upperBodyWeight: 0.75, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'actf-0', time: 51, preset: 'sad', easing: 'step' },
      { id: 'actf-1', time: 56.0, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 14. Stagehand (Scene 5 Theater)
  makeCharActor({
    id: 'idiom-stagehand',
    name: 'Stagehand',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'none', primaryColor: '#181c24', highlightColor: '#181c24', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'hoodie', shirtColor: '#18181b', shirtAccent: '#fbbf24', sleeveMode: 'long', pantsId: 'cargo', pantsColor: '#27272a', pantsAccent: '#52525b', footwearId: 'sneakers' },
    ornaments: makeDefaultOrnaments({ id: 'cap', color: '#18181b', accentColor: '#fbbf24' }, { id: 'headphones', color: '#1e293b', accentColor: '#fbbf24' }),
    keyframes: makeActorWindow('stg-s5', 51, 64, [0.85, 0.14, 0.3], [0, -0.8, 0], [1, 1, 1], 'idle', [
      { id: 'stg-slap', time: 53.2, position: [0.65, 0.14, 0.3], rotation: [0, -1.1, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'cheer', upperBodyWeight: 0.95, clipSpeed: 1.2, easing: 'easeInOut' },
      { id: 'stg-oops', time: 56.8, position: [0.95, 0.14, 0.45], rotation: [0, -0.7, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'block', upperBodyWeight: 0.65, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'stgf-0', time: 51, preset: 'excited', easing: 'step' },
      { id: 'stgf-1', time: 56.3, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 15. Paramedic (Scene 5 Theater)
  makeCharActor({
    id: 'idiom-paramedic',
    name: 'Paramedic',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'ponytail', primaryColor: '#eab308', highlightColor: '#eab308', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'tracksuit', shirtColor: '#0284c7', shirtAccent: '#ffffff', sleeveMode: 'long', pantsId: 'trackPants', pantsColor: '#0f172a', pantsAccent: '#38bdf8', footwearId: 'boots' },
    keyframes: makeActorWindow('emt-s5', 51, 64, [4.8, 0.14, -0.2], [0, -Math.PI / 2, 0], [1, 1, 1], 'idle', [
      { id: 'emt-run', time: 57.2, position: [4.8, 0.14, -0.2], rotation: [0, -Math.PI / 2, 0], scale: [1, 1, 1], clip: 'run', clipSpeed: 1.5, easing: 'easeInOut' },
      { id: 'emt-stop', time: 60.0, position: [1.85, 0.14, -0.2], rotation: [0, -Math.PI / 2, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.65, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [{ id: 'emtf-0', time: 51, preset: 'determined', easing: 'step' }],
  }),

  // 16. Tourist (Scene 6 Diner + Scene 7 Main Street)
  makeCharActor({
    id: 'idiom-tourist',
    name: 'Tourist',
    bodyColors: SKIN_LIGHT,
    hair: { styleId: 'swept', primaryColor: '#6b3f24', highlightColor: '#eab308', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'tshirt', shirtColor: '#f97316', shirtAccent: '#fde047', sleeveMode: 'short', pantsId: 'shorts', pantsColor: '#d6d3d1', pantsAccent: '#78350f', footwearId: 'sneakers' },
    ornaments: makeDefaultOrnaments({ id: 'fedora', color: '#fef3c7', accentColor: '#dc2626' }, { id: 'shades', color: '#1e293b', accentColor: '#38bdf8' }),
    keyframes: [
      { id: 'tur-pre', time: 0, position: [-3.55, 0.2, 0.8], rotation: [0, Math.PI / 2, 0], scale: [0, 0, 0], clip: 'sit', clipSpeed: 1, easing: 'step' },
      { id: 'tur-pre2', time: 63.95, position: [-3.55, 0.2, 0.8], rotation: [0, Math.PI / 2, 0], scale: [0, 0, 0], clip: 'sit', clipSpeed: 1, easing: 'step' },
      { id: 'tur-s6-in', time: 64, position: [-3.55, 0.2, 0.8], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'talkGesture', upperBodyWeight: 0.85, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'tur-s6-shock', time: 71.2, position: [-3.55, 0.2, 0.8], rotation: [0, 0.75, 0], scale: [1, 1, 1], clip: 'sit', upperBodyClip: 'block', upperBodyWeight: 0.6, clipSpeed: 1, easing: 'step' },
      { id: 'tur-s7-step', time: 77, position: [-2.1, 0, 1.7], rotation: [0, 0.65, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 0.9, easing: 'easeInOut' },
      { id: 'tur-s7-admire', time: 79.8, position: [-0.9, 0, 1.35], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'talkGesture', upperBodyWeight: 0.85, clipSpeed: 1, easing: 'easeInOut' },
      { id: 'tur-s7-confused', time: 84.0, position: [-0.9, 0, 1.35], rotation: [0, 0.8, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'wave', upperBodyWeight: 0.5, clipSpeed: 0.6, easing: 'step' },
    ],
    faceKeyframes: [
      { id: 'turf-0', time: 64, preset: 'sad', easing: 'step' },
      { id: 'turf-1', time: 70.8, preset: 'surprised', easing: 'step' },
      { id: 'turf-2', time: 77, preset: 'excited', easing: 'step' },
      { id: 'turf-3', time: 83.6, preset: 'surprised', easing: 'step' },
    ],
    heldItemKeyframes: [
      { id: 'turh-0', time: 64, right: createEmptyCharacterHeldItems().right, left: createEmptyCharacterHeldItems().left, easing: 'step' },
      { id: 'turh-1', time: 77, right: createDefaultHandStateForItem('camera', 'right'), left: createEmptyCharacterHeldItems().left, easing: 'step' },
    ],
  }),

  // 17. Diner Waitress (Scene 6 Diner)
  makeCharActor({
    id: 'idiom-waitress',
    name: 'Waitress',
    bodyColors: SKIN_TAN,
    hair: { styleId: 'ponytail', primaryColor: '#dc2626', highlightColor: '#f59e0b', highlightPattern: 'tips', volume: 1 },
    clothing: { shirtId: 'tshirt', shirtColor: '#ec4899', shirtAccent: '#ffffff', sleeveMode: 'short', pantsId: 'slacks', pantsColor: '#f8fafc', pantsAccent: '#ec4899', footwearId: 'sneakers' },
    keyframes: makeActorWindow('wai-s6', 64, 77, [-1.15, 0.04, 1.25], [0, -Math.PI / 2, 0], [1, 1, 1], 'idle', [
      { id: 'wai-stare', time: 68.5, position: [-1.15, 0.04, 1.25], rotation: [0, -Math.PI / 2, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [
      { id: 'waif-0', time: 64, preset: 'happy', easing: 'step' },
      { id: 'waif-1', time: 68.2, preset: 'surprised', easing: 'step' },
    ],
  }),

  // 18. Diner Chef pushing Clydesdale platter (Scene 6 Diner)
  makeCharActor({
    id: 'idiom-chef',
    name: 'Diner Chef',
    bodyColors: SKIN_WARM,
    hair: { styleId: 'none', primaryColor: '#181c24', highlightColor: '#181c24', highlightPattern: 'none', volume: 1 },
    clothing: { shirtId: 'tshirt', shirtColor: '#f8fafc', shirtAccent: '#dc2626', sleeveMode: 'long', pantsId: 'slacks', pantsColor: '#1e293b', pantsAccent: '#94a3b8', footwearId: 'boots' },
    ornaments: makeDefaultOrnaments({ id: 'tophat', color: '#ffffff', accentColor: '#e2e8f0' }),
    keyframes: makeActorWindow('chf-s6', 64, 77, [0, 0.04, -3.5], [0, 0, 0], [1, 1, 1], 'idle', [
      { id: 'chf-push', time: 69.6, position: [0, 0.04, -3.4], rotation: [0, -0.1, 0], scale: [1, 1, 1], clip: 'walk', clipSpeed: 1.35, easing: 'easeInOut' },
      { id: 'chf-serve', time: 73.2, position: [0.1, 0.04, -0.5], rotation: [0, -0.45, 0], scale: [1, 1, 1], clip: 'idle', upperBodyClip: 'point', upperBodyWeight: 0.75, clipSpeed: 1, easing: 'step' },
    ]),
    faceKeyframes: [{ id: 'chff-0', time: 64, preset: 'excited', easing: 'step' }],
  }),

  // =======================================================================
  // Literal Idiom Gag Props & Animals (scoped cleanly per scene)
  // =======================================================================

  makePropActor('prop-cats-dogs', 'Raining Cats & Dogs', 'rainingCatsDogs', '#d97706', '#94a3b8', [
    { id: 'cd-0', time: 0, position: [-0.8, 0, 1.4], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cd-pre', time: 3.45, position: [-0.8, 0, 1.4], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cd-on', time: 3.5, position: [-0.8, 0, 1.4], rotation: [0, 0, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cd-off', time: 12, position: [-0.8, 0, 1.4], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-umb-1', 'Steel Umbrella 1', 'steelUmbrella', '#64748b', '#0284c7', [
    { id: 'u1-0', time: 0, position: [0.3, 2.35, 1.45], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u1-pre', time: 5.55, position: [0.3, 2.35, 1.45], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u1-on', time: 5.65, position: [0.3, 2.35, 1.45], rotation: [0, 0.2, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u1-off', time: 12, position: [0.3, 2.35, 1.45], rotation: [0, 0.2, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-umb-2', 'Steel Umbrella 2', 'steelUmbrella', '#64748b', '#dc2626', [
    { id: 'u2-0', time: 0, position: [-2.2, 2.35, 1.95], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u2-pre', time: 5.65, position: [-2.2, 2.35, 1.95], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u2-on', time: 5.75, position: [-2.2, 2.35, 1.95], rotation: [0, 0.45, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'u2-off', time: 12, position: [-2.2, 0, 1.95], rotation: [0, 0.45, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-beans', 'Bean Waterfall', 'beanWaterfall', '#b45309', '#78350f',
    makeActorWindow('beans', 16.0, 25, [-1.1, 0, 0.2], [0, 0, 0], [1.15, 1.15, 1.15], 'idle')),

  makePropActor('prop-elephant', 'Boardroom Elephant', 'africanElephant', '#64748b', '#ef4444',
    makeActorWindow('elph', 25, 38, [0, 1.14, 0], [0, 0.28, 0], [1.05, 1.05, 1.05], 'idle')),

  makePropActor('prop-ice-feet', 'Cold Feet Ice Blocks', 'iceFeet', '#7dd3fc', '#e0f2fe',
    makeActorWindow('ice', 40.6, 51, [0.95, 0.32, -2.0], [0, -Math.PI / 2, 0], [1.15, 1.15, 1.15], 'idle')),

  makePropActor('prop-plaster-cast', 'Plaster Leg Cast', 'plasterCast', '#f8fafc', '#ef4444', [
    { id: 'cst-0', time: 0, position: [-0.75, 0.14, 0.25], rotation: [0, 0.3, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cst-pre', time: 55.95, position: [-0.75, 0.14, 0.25], rotation: [0, 0.3, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cst-on', time: 56.0, position: [-0.75, 0.14, 0.25], rotation: [0, 0.5, 0], scale: [1.1, 1.1, 1.1], clip: 'idle', clipSpeed: 1, easing: 'easeOutBack' },
    { id: 'cst-move', time: 57.6, position: [-1.52, 0.14, 0.55], rotation: [0, 0.5, 0], scale: [1.1, 1.1, 1.1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'cst-off', time: 64, position: [-1.52, 0.14, 0.55], rotation: [0, 0.5, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-stretcher', 'Paramedic Stretcher', 'stretcher', '#dc2626', '#cbd5e1', [
    { id: 'str-0', time: 0, position: [3.8, 0.14, -0.2], rotation: [0, Math.PI / 2, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'str-pre', time: 57.15, position: [3.8, 0.14, -0.2], rotation: [0, Math.PI / 2, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'str-in', time: 57.2, position: [3.8, 0.14, -0.2], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
    { id: 'str-stop', time: 60.0, position: [0.85, 0.14, -0.2], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'str-off', time: 64, position: [0.85, 0.14, -0.2], rotation: [0, Math.PI / 2, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-horse-platter', 'Clydesdale on Silver Platter', 'clydesdalePlatter', '#78350f', '#e2e8f0', [
    { id: 'hrs-0', time: 0, position: [0, 0.04, -2.2], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'hrs-pre', time: 69.35, position: [0, 0.04, -2.2], rotation: [0, 0, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'hrs-in', time: 69.4, position: [0, 0.04, -2.2], rotation: [0, -0.2, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'easeInOut' },
    { id: 'hrs-stop', time: 73.2, position: [-0.25, 0.04, 0.85], rotation: [0, -0.65, 0], scale: [1, 1, 1], clip: 'idle', clipSpeed: 1, easing: 'step' },
    { id: 'hrs-off', time: 77, position: [-0.25, 0.04, 0.85], rotation: [0, -0.65, 0], scale: [0, 0, 0], clip: 'idle', clipSpeed: 1, easing: 'step' },
  ]),

  makePropActor('prop-flying-pigs', 'Flock of Flying Pigs', 'flyingPigs', '#f472b6', '#fef08a',
    makeActorWindow('pigs', 77, 90, [0, 0.5, -1.5], [0, 0, 0], [1.05, 1.05, 1.05], 'idle')),

  makePropActor('prop-tour-bus', 'Verbatim Tour Bus', 'sightseeingBus', '#eab308', '#1e293b',
    makeActorWindow('bus', 77, 90, [-5.2, 0, 3.2], [0, 0.12, 0], [1, 1, 1], 'idle')),

  makePropActor('prop-sedan', 'Parked Sedan', 'parkedSedan', '#2563eb', '#e2e8f0',
    makeActorWindow('sedan', 77, 90, [4.2, 0, 3.3], [0, -0.15, 0], [1, 1, 1], 'idle')),

  makePropActor('prop-groceries', 'Dropped Groceries', 'grocerySpill', '#d97706', '#22c55e',
    makeActorWindow('groc', 82.8, 90, [1.55, 0, 1.05], [0, 0.4, 0], [1.1, 1.1, 1.1], 'idle')),
];

// =========================================================================
// Chapters, Map Track, Lighting Track, Cameras, Subtitles, SFX & Blackout
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
  { id: 'mk-s1', time: 0, environment: 'custom', customMap: SCENE_1_MAP, applyAtmosphere: false, label: '1. Welcome to Verbatim' },
  { id: 'mk-s2', time: 12, environment: 'custom', customMap: SCENE_2_MAP, applyAtmosphere: true, label: '2. Coffee Shop' },
  { id: 'mk-s3', time: 25, environment: 'custom', customMap: SCENE_3_MAP, applyAtmosphere: true, label: '3. Boardroom' },
  { id: 'mk-s4', time: 38, environment: 'custom', customMap: SCENE_4_MAP, applyAtmosphere: true, label: '4. Church Altar' },
  { id: 'mk-s5', time: 51, environment: 'custom', customMap: SCENE_5_MAP, applyAtmosphere: true, label: '5. Theater Wings' },
  { id: 'mk-s6', time: 64, environment: 'custom', customMap: SCENE_6_MAP, applyAtmosphere: true, label: '6. Retro Diner' },
  { id: 'mk-s7', time: 77, environment: 'custom', customMap: SCENE_7_MAP, applyAtmosphere: true, label: '7. Main Street' },
];

const LIGHTING_TRACK: LightingKeyframe[] = [
  { id: 'lk-s1-sun', time: 0, sunAzimuth: 38, sunElevation: 58, keyIntensity: 2.35, rimIntensity: 1.05, ambientIntensity: 0.98, exposure: 1.05, keyColor: '#fffbeb', easing: 'easeInOut' },
  { id: 'lk-s1-storm', time: 3.4, sunAzimuth: -25, sunElevation: 24, keyIntensity: 1.05, rimIntensity: 0.95, ambientIntensity: 0.56, exposure: 0.88, keyColor: '#94a3b8', easing: 'step' },
  { id: 'lk-s2', time: 12, sunAzimuth: -35, sunElevation: 38, keyIntensity: 2.15, rimIntensity: 0.95, ambientIntensity: 0.92, exposure: 1.04, keyColor: '#fed7aa', easing: 'step' },
  { id: 'lk-s3', time: 25, sunAzimuth: 18, sunElevation: 62, keyIntensity: 2.25, rimIntensity: 0.9, ambientIntensity: 1.05, exposure: 1.06, keyColor: '#f8fafc', easing: 'step' },
  { id: 'lk-s4', time: 38, sunAzimuth: 25, sunElevation: 55, keyIntensity: 2.45, rimIntensity: 1.1, ambientIntensity: 1.08, exposure: 1.08, keyColor: '#ffffff', easing: 'step' },
  { id: 'lk-s5', time: 51, sunAzimuth: -20, sunElevation: 42, keyIntensity: 1.85, rimIntensity: 1.35, ambientIntensity: 0.65, exposure: 1.02, keyColor: '#fde68a', easing: 'step' },
  { id: 'lk-s6', time: 64, sunAzimuth: 42, sunElevation: 48, keyIntensity: 2.3, rimIntensity: 1.0, ambientIntensity: 0.96, exposure: 1.06, keyColor: '#ffedd5', easing: 'step' },
  { id: 'lk-s7', time: 77, sunAzimuth: 46, sunElevation: 56, keyIntensity: 2.4, rimIntensity: 1.05, ambientIntensity: 1.0, exposure: 1.06, keyColor: '#fffbeb', easing: 'step' },
];

// All camera shots strictly verify visibleHeight >= 5.5 and fov >= 48
const CAMERA_TRACK: CameraKeyframe[] = [
  // Scene 1: Verbatim Hook
  { id: 'cam-s1-wide', time: 0, position: [0.4, 3.6, 8.8], target: [0, 2.1, -0.8], fov: 52, easing: 'easeInOut' },
  { id: 'cam-s1-man', time: 3.4, position: [2.4, 2.8, 7.6], target: [-0.4, 1.9, 1.2], fov: 50, easing: 'easeInOut', shakeIntensity: 0.08, shakeFrequency: 18 },
  { id: 'cam-s1-rain', time: 6.2, position: [-2.8, 3.2, 8.4], target: [-0.8, 2.0, 1.4], fov: 52, easing: 'step' },

  // Scene 2: Coffee Shop
  { id: 'cam-s2-booth', time: 12, position: [-1.1, 3.0, 7.0], target: [-1.1, 1.4, 0.2], fov: 50, easing: 'easeInOut' },
  { id: 'cam-s2-beans', time: 16.0, position: [0.6, 2.6, 6.8], target: [-0.8, 1.3, 0.2], fov: 50, easing: 'easeInOut', shakeIntensity: 0.14, shakeFrequency: 20 },
  { id: 'cam-s2-shovel', time: 19.2, position: [3.2, 2.8, 7.2], target: [0.2, 1.4, 0.2], fov: 50, easing: 'step' },

  // Scene 3: Boardroom
  { id: 'cam-s3-pan-l', time: 25, position: [-5.8, 3.2, 6.8], target: [-2.4, 1.8, 0], fov: 52, easing: 'easeInOut' },
  { id: 'cam-s3-elephant', time: 30.2, position: [3.8, 3.8, 7.2], target: [0, 2.2, 0], fov: 52, easing: 'step' },

  // Scene 4: Wedding
  { id: 'cam-s4-altar', time: 38, position: [0.1, 2.9, 5.8], target: [0, 1.8, -1.6], fov: 50, easing: 'easeInOut' },
  { id: 'cam-s4-feet', time: 41.2, position: [2.2, 1.7, 4.9], target: [0.95, 0.8, -2.0], fov: 50, easing: 'easeInOut' },
  { id: 'cam-s4-dryer', time: 45.2, position: [4.2, 2.6, 5.2], target: [1.1, 1.4, -1.7], fov: 50, easing: 'step' },

  // Scene 5: Theater Backstage
  { id: 'cam-s5-wings', time: 51, position: [0.4, 2.5, 7.2], target: [0, 1.5, 0.2], fov: 50, easing: 'easeInOut' },
  { id: 'cam-s5-cast', time: 56.2, position: [-2.6, 2.0, 6.8], target: [-0.8, 1.1, 0.3], fov: 50, easing: 'easeInOut', shakeIntensity: 0.12, shakeFrequency: 18 },
  { id: 'cam-s5-emt', time: 58.6, position: [3.4, 2.8, 7.4], target: [0.4, 1.3, 0.1], fov: 52, easing: 'step' },

  // Scene 6: Retro Diner
  { id: 'cam-s6-booth', time: 64, position: [-1.8, 2.6, 7.4], target: [-2.2, 1.4, 0.8], fov: 50, easing: 'easeInOut' },
  { id: 'cam-s6-horse', time: 69.5, position: [3.2, 3.2, 7.4], target: [-0.8, 1.7, 0.2], fov: 52, easing: 'step' },

  // Scene 7: Main Street Punchline
  { id: 'cam-s7-pigs', time: 77, position: [-1.8, 2.4, 8.6], target: [-0.8, 3.2, -0.4], fov: 54, easing: 'easeInOut' },
  { id: 'cam-s7-panic', time: 82.6, position: [1.8, 2.7, 8.2], target: [1.5, 1.4, 1.4], fov: 52, easing: 'step' },
];

const SUBTITLES: SubtitleCue[] = [
  // Scene 1
  { id: 'sub-1a', startTime: 3.6, endTime: 6.1, speaker: 'Man', role: 'dialogue', text: "Looks like it's raining cats and dogs." },
  { id: 'sub-1b', startTime: 6.4, endTime: 11.6, speaker: 'Narrator', role: 'voiceover', text: 'In this town, every single figure of speech happens literally.' },

  // Scene 2
  { id: 'sub-2a', startTime: 13.7, endTime: 16.3, speaker: 'Gossiper', role: 'dialogue', text: "Okay, fine. I'll spill the beans." },
  { id: 'sub-2b', startTime: 16.9, endTime: 24.5, speaker: 'Narrator', role: 'voiceover', text: 'That means you have to be extremely careful with what you say. Because if you love gossip, someone has to clean it up.' },

  // Scene 3
  { id: 'sub-3', startTime: 28.2, endTime: 37.4, speaker: 'Narrator', role: 'voiceover', text: 'Office meetings are a complete disaster, mostly because nobody ever wants to address the elephant in the room.' },

  // Scene 4
  { id: 'sub-4', startTime: 41.2, endTime: 50.2, speaker: 'Narrator', role: 'voiceover', text: 'Half the weddings get postponed the second the groom gets cold feet...' },

  // Scene 5
  { id: 'sub-5a', startTime: 53.2, endTime: 55.8, speaker: 'Stagehand', role: 'dialogue', text: 'You got this! Go break a leg!' },
  { id: 'sub-5b', startTime: 56.9, endTime: 63.5, speaker: 'Narrator', role: 'voiceover', text: '...and the local theater has been sued fourteen times just for wishing actors good luck.' },

  // Scene 6
  { id: 'sub-6a', startTime: 65.2, endTime: 68.4, speaker: 'Tourist', role: 'dialogue', text: 'Man, I am so hungry I could eat a horse.' },
  { id: 'sub-6b', startTime: 70.0, endTime: 76.6, speaker: 'Narrator', role: 'voiceover', text: 'Locals have learned to speak in plain, boring facts. Tourists? They usually learn the hard way.' },

  // Scene 7
  { id: 'sub-7a', startTime: 79.8, endTime: 82.9, speaker: 'Tourist', role: 'dialogue', text: 'Whoa... this place is about to blow my mind.' },
  { id: 'sub-7b', startTime: 85.2, endTime: 89.9, speaker: 'Narrator', role: 'voiceover', text: "Just whatever you do—if you ever visit—never tell anyone they're going to blow my mind." },
];

const SFX_TRACK: SfxCue[] = [
  { id: 'sfx-1-thunder', time: 3.2, kind: 'thunder', label: 'Storm Thunderclap', volume: 0.82 },
  { id: 'sfx-1-pets', time: 4.1, kind: 'catsDogsRain', label: 'Barking & Meowing Rain', volume: 0.75 },
  { id: 'sfx-1-clang1', time: 5.8, kind: 'umbrellaClang', label: 'Steel Umbrella Clang', volume: 0.8 },
  { id: 'sfx-1-clang2', time: 7.7, kind: 'umbrellaClang', label: 'Steel Umbrella Bounce', volume: 0.72 },
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
  lightingMood: 'noon',
  sunAzimuth: 38,
  sunElevation: 58,
  keyIntensity: 2.35,
  rimIntensity: 1.05,
  ambientIntensity: 0.98,
  exposure: 1.05,
  duration: 90,
  fps: 30,
  loop: false,
  chapters: CHAPTERS,
  mapTrack: MAP_TRACK,
  lightingTrack: LIGHTING_TRACK,
  stageLights: [],
  actors: ACTORS,
  cameraTrack: CAMERA_TRACK,
  subtitles: SUBTITLES,
  sfxTrack: SFX_TRACK,
  screenEffects: SCREEN_EFFECTS,
};
