import {
  cloneCharacterHeldItems,
  createDefaultHandStateForItem,
  createEmptyHandState,
} from './itemCatalog';
import {
  CharacterHeldItems,
  FaceRigConfig,
  OrnamentSlot,
  R6BodyColors,
  R6Ornaments,
} from './types';

export interface BrickColorSwatch {
  name: string;
  hex: string;
}

export const CLASSIC_BRICK_COLORS: BrickColorSwatch[] = [
  { name: 'Bright Yellow', hex: '#f5cd30' },
  { name: 'Bright Blue', hex: '#0d69ac' },
  { name: 'Bright Red', hex: '#c4281c' },
  { name: 'Br. Yellowish Green', hex: '#a4bd47' },
  { name: 'Earth Green', hex: '#27462d' },
  { name: 'Bright Orange', hex: '#da8541' },
  { name: 'Nougat', hex: '#cc8e69' },
  { name: 'Medium Stone Grey', hex: '#a3a2a5' },
  { name: 'Dark Stone Grey', hex: '#635f62' },
  { name: 'White', hex: '#f2f3f3' },
  { name: 'Really Black', hex: '#1b2a35' },
  { name: 'Royal Purple', hex: '#6b327c' },
];

export interface OrnamentCatalogItem {
  id: string;
  label: string;
  slot: OrnamentSlot;
  defaultColor: string;
}

export const ORNAMENT_CATALOG: Record<OrnamentSlot, OrnamentCatalogItem[]> = {
  head: [
    { id: 'none', label: 'None', slot: 'head', defaultColor: '#1b2a35' },
    { id: 'shades', label: 'Classic Shades', slot: 'head', defaultColor: '#1b2a35' },
    { id: 'headphones', label: 'Studio Headphones', slot: 'head', defaultColor: '#00a2ff' },
    { id: 'visor', label: 'Blox Visor', slot: 'head', defaultColor: '#00a2ff' },
    { id: 'domino', label: 'Domino Mask', slot: 'head', defaultColor: '#c4281c' },
  ],
  hat: [
    { id: 'none', label: 'None', slot: 'hat', defaultColor: '#c4281c' },
    { id: 'cap', label: 'Classic Cap', slot: 'hat', defaultColor: '#c4281c' },
    { id: 'tophat', label: 'Top Hat', slot: 'hat', defaultColor: '#1b2a35' },
    { id: 'valkyrie', label: 'Valkyrie Helm', slot: 'hat', defaultColor: '#f5cd30' },
    { id: 'spiky', label: 'Spiky Hair', slot: 'hat', defaultColor: '#4b2e1e' },
    { id: 'wizard', label: 'Wizard Hat', slot: 'hat', defaultColor: '#0d69ac' },
  ],
  face: [
    { id: 'smile', label: 'Classic Smile', slot: 'face', defaultColor: '#111827' },
    { id: 'epic', label: 'Epic :D', slot: 'face', defaultColor: '#111827' },
    { id: 'smirk', label: 'Chill Smirk', slot: 'face', defaultColor: '#111827' },
    { id: 'determined', label: 'Determined', slot: 'face', defaultColor: '#111827' },
    { id: 'visorEyes', label: 'Neon Eyes', slot: 'face', defaultColor: '#00a2ff' },
    { id: 'shocked', label: 'Surprised :O', slot: 'face', defaultColor: '#111827' },
  ],
  arm: [
    { id: 'none', label: 'None', slot: 'arm', defaultColor: '#a3a2a5' },
    { id: 'sword', label: 'Linked Sword', slot: 'arm', defaultColor: '#a3a2a5' },
    { id: 'bloxyCola', label: 'Bloxy Cola', slot: 'arm', defaultColor: '#c4281c' },
    { id: 'shield', label: 'Brick Buckler', slot: 'arm', defaultColor: '#0d69ac' },
    { id: 'gauntlet', label: 'Power Gauntlet', slot: 'arm', defaultColor: '#f5cd30' },
  ],
  back: [
    { id: 'none', label: 'None', slot: 'back', defaultColor: '#a3a2a5' },
    { id: 'jetpack', label: 'Rocket Jetpack', slot: 'back', defaultColor: '#c4281c' },
    { id: 'wings', label: 'Brick Wings', slot: 'back', defaultColor: '#f2f3f3' },
    { id: 'backpack', label: 'Studded Pack', slot: 'back', defaultColor: '#27462d' },
    { id: 'cape', label: 'Hero Cape', slot: 'back', defaultColor: '#c4281c' },
    { id: 'katana', label: 'Twin Katanas', slot: 'back', defaultColor: '#1b2a35' },
  ],
  legs: [
    { id: 'none', label: 'None', slot: 'legs', defaultColor: '#635f62' },
    { id: 'belt', label: 'Utility Belt', slot: 'legs', defaultColor: '#635f62' },
    { id: 'kneepads', label: 'Knee Guards', slot: 'legs', defaultColor: '#a3a2a5' },
    { id: 'thrusters', label: 'Rocket Boots', slot: 'legs', defaultColor: '#da8541' },
    { id: 'pouches', label: 'Explorer Pouches', slot: 'legs', defaultColor: '#27462d' },
  ],
};

export interface AvatarBundlePreset {
  id: string;
  name: string;
  bodyColors: R6BodyColors;
  ornaments: R6Ornaments;
  faceConfig: FaceRigConfig;
  defaultHeldItems: CharacterHeldItems;
}

export const ROBLOX_AVATAR_BUNDLES: AvatarBundlePreset[] = [
  {
    id: 'noob',
    name: 'Classic Noob',
    bodyColors: {
      head: '#f5cd30',
      torso: '#0d69ac',
      leftArm: '#f5cd30',
      rightArm: '#f5cd30',
      leftLeg: '#a4bd47',
      rightLeg: '#a4bd47',
    },
    ornaments: {
      head: { id: 'none', color: '#1b2a35' },
      hat: { id: 'none', color: '#c4281c' },
      face: { id: 'smile', color: '#111827' },
      arm: { id: 'none', color: '#c4281c' },
      back: { id: 'none', color: '#a3a2a5' },
      legs: { id: 'none', color: '#635f62' },
    },
    faceConfig: {
      eyeStyle: 'expressive',
      browStyle: 'rounded',
      mouthStyle: 'openCavity',
      cheekStyle: 'blush',
      eyeColor: '#1d4ed8',
      browColor: '#3f2e18',
      mouthColor: '#1f2937',
      accentColor: '#fb7185',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createDefaultHandStateForItem('bloxyCola', 'right'),
      left: createEmptyHandState(),
    },
  },
  {
    id: 'knight',
    name: 'Crossroads Knight',
    bodyColors: {
      head: '#f5cd30',
      torso: '#0d69ac',
      leftArm: '#a3a2a5',
      rightArm: '#a3a2a5',
      leftLeg: '#635f62',
      rightLeg: '#635f62',
    },
    ornaments: {
      head: { id: 'none', color: '#1b2a35' },
      hat: { id: 'valkyrie', color: '#f5cd30' },
      face: { id: 'determined', color: '#111827' },
      arm: { id: 'none', color: '#a3a2a5' },
      back: { id: 'cape', color: '#c4281c' },
      legs: { id: 'kneepads', color: '#a3a2a5' },
    },
    faceConfig: {
      eyeStyle: 'hero',
      browStyle: 'sharp',
      mouthStyle: 'sculpted',
      cheekStyle: 'scar',
      eyeColor: '#0284c7',
      browColor: '#1e293b',
      mouthColor: '#1e293b',
      accentColor: '#b45309',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createDefaultHandStateForItem('linkedSword', 'right'),
      left: createDefaultHandStateForItem('heaterShield', 'left'),
    },
  },
  {
    id: 'explorer',
    name: 'Sky Explorer',
    bodyColors: {
      head: '#cc8e69',
      torso: '#da8541',
      leftArm: '#cc8e69',
      rightArm: '#cc8e69',
      leftLeg: '#27462d',
      rightLeg: '#27462d',
    },
    ornaments: {
      head: { id: 'none', color: '#1b2a35' },
      hat: { id: 'cap', color: '#c4281c' },
      face: { id: 'epic', color: '#111827' },
      arm: { id: 'none', color: '#a3a2a5' },
      back: { id: 'jetpack', color: '#c4281c' },
      legs: { id: 'belt', color: '#635f62' },
    },
    faceConfig: {
      eyeStyle: 'starry',
      browStyle: 'arched',
      mouthStyle: 'openCavity',
      cheekStyle: 'bandage',
      eyeColor: '#0f766e',
      browColor: '#3b2416',
      mouthColor: '#1f2937',
      accentColor: '#f59e0b',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createDefaultHandStateForItem('holoScanner', 'right'),
      left: createDefaultHandStateForItem('glowLantern', 'left'),
    },
  },
  {
    id: 'guest',
    name: 'Retro Guest',
    bodyColors: {
      head: '#f2f3f3',
      torso: '#1b2a35',
      leftArm: '#f2f3f3',
      rightArm: '#f2f3f3',
      leftLeg: '#1b2a35',
      rightLeg: '#1b2a35',
    },
    ornaments: {
      head: { id: 'headphones', color: '#00a2ff' },
      hat: { id: 'cap', color: '#1b2a35' },
      face: { id: 'smirk', color: '#111827' },
      arm: { id: 'gauntlet', color: '#c4281c' },
      back: { id: 'backpack', color: '#27462d' },
      legs: { id: 'pouches', color: '#635f62' },
    },
    faceConfig: {
      eyeStyle: 'classic',
      browStyle: 'bold',
      mouthStyle: 'smirk',
      cheekStyle: 'freckles',
      eyeColor: '#111827',
      browColor: '#111827',
      mouthColor: '#111827',
      accentColor: '#38bdf8',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createEmptyHandState(),
      left: createDefaultHandStateForItem('pizzaSlice', 'left'),
    },
  },
  {
    id: 'bloxxer',
    name: 'Bloxxer Agent',
    bodyColors: {
      head: '#a3a2a5',
      torso: '#1b2a35',
      leftArm: '#635f62',
      rightArm: '#635f62',
      leftLeg: '#1b2a35',
      rightLeg: '#1b2a35',
    },
    ornaments: {
      head: { id: 'visor', color: '#00a2ff' },
      hat: { id: 'tophat', color: '#1b2a35' },
      face: { id: 'visorEyes', color: '#00a2ff' },
      arm: { id: 'none', color: '#0d69ac' },
      back: { id: 'katana', color: '#1b2a35' },
      legs: { id: 'thrusters', color: '#da8541' },
    },
    faceConfig: {
      eyeStyle: 'cyber',
      browStyle: 'sharp',
      mouthStyle: 'cyber',
      cheekStyle: 'none',
      eyeColor: '#00a2ff',
      browColor: '#0f172a',
      mouthColor: '#00a2ff',
      accentColor: '#38bdf8',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createDefaultHandStateForItem('laserBlaster', 'right'),
      left: createDefaultHandStateForItem('energyBlade', 'left'),
    },
  },
];

export function cloneBundle(bundleId: string): {
  bodyColors: R6BodyColors;
  ornaments: R6Ornaments;
  faceConfig: FaceRigConfig;
  heldItems: CharacterHeldItems;
} {
  const found =
    ROBLOX_AVATAR_BUNDLES.find((b) => b.id === bundleId) ??
    ROBLOX_AVATAR_BUNDLES[0];
  return {
    bodyColors: { ...found.bodyColors },
    ornaments: {
      head: { ...found.ornaments.head },
      hat: { ...found.ornaments.hat },
      face: { ...found.ornaments.face },
      arm: { ...found.ornaments.arm },
      back: { ...found.ornaments.back },
      legs: { ...found.ornaments.legs },
    },
    faceConfig: { ...found.faceConfig },
    heldItems: cloneCharacterHeldItems(found.defaultHeldItems),
  };
}
