import {
  cloneCharacterHeldItems,
  createDefaultHandStateForItem,
  createEmptyHandState,
} from './itemCatalog';
import {
  CharacterHeldItems,
  ClothingConfig,
  FaceRigConfig,
  FootwearId,
  HairConfig,
  HairHighlightPattern,
  HairStyleId,
  HatTuckProfile,
  OrnamentSlot,
  PantsStyleId,
  R6BodyColors,
  R6Ornaments,
  SceneActorConfig,
  ShirtStyleId,
  SleeveMode,
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
  { name: 'Light Orange', hex: '#eab892' },
  { name: 'Medium Stone Grey', hex: '#a3a2a5' },
  { name: 'Dark Stone Grey', hex: '#635f62' },
  { name: 'White', hex: '#f2f3f3' },
  { name: 'Really Black', hex: '#1b2a35' },
  { name: 'Royal Purple', hex: '#6b327c' },
  { name: 'Teal', hex: '#0f766e' },
];

export const HAIR_COLOR_SWATCHES: BrickColorSwatch[] = [
  { name: 'Espresso', hex: '#3b2416' },
  { name: 'Jet Black', hex: '#181c24' },
  { name: 'Chestnut', hex: '#6b3f24' },
  { name: 'Auburn', hex: '#8f3622' },
  { name: 'Golden Blonde', hex: '#eab308' },
  { name: 'Platinum', hex: '#e2e8f0' },
  { name: 'Cobalt', hex: '#2563eb' },
  { name: 'Crimson', hex: '#dc2626' },
  { name: 'Sakura', hex: '#ec4899' },
  { name: 'Mint Cyan', hex: '#06b6d4' },
];

export interface OrnamentCatalogItem {
  id: string;
  label: string;
  slot: OrnamentSlot;
  defaultColor: string;
  defaultAccentColor: string;
  hatTuck?: HatTuckProfile;
}

export const ORNAMENT_CATALOG: Record<OrnamentSlot, OrnamentCatalogItem[]> = {
  head: [
    { id: 'none', label: 'None', slot: 'head', defaultColor: '#1b2a35', defaultAccentColor: '#38bdf8' },
    { id: 'shades', label: 'Classic Shades', slot: 'head', defaultColor: '#1b2a35', defaultAccentColor: '#94a3b8' },
    { id: 'headphones', label: 'Studio Headphones', slot: 'head', defaultColor: '#1e293b', defaultAccentColor: '#00a2ff' },
    { id: 'visor', label: 'Cyber Visor', slot: 'head', defaultColor: '#1e293b', defaultAccentColor: '#00a2ff' },
    { id: 'domino', label: 'Domino Mask', slot: 'head', defaultColor: '#c4281c', defaultAccentColor: '#f5cd30' },
    { id: 'goggles', label: 'Aviator Goggles', slot: 'head', defaultColor: '#6b4226', defaultAccentColor: '#f59e0b' },
    { id: 'monocle', label: 'Brass Monocle', slot: 'head', defaultColor: '#f5cd30', defaultAccentColor: '#bae6fd' },
  ],
  hat: [
    { id: 'none', label: 'None', slot: 'hat', defaultColor: '#c4281c', defaultAccentColor: '#f2f3f3', hatTuck: 'none' },
    { id: 'cap', label: 'Classic Cap', slot: 'hat', defaultColor: '#c4281c', defaultAccentColor: '#f2f3f3', hatTuck: 'brim' },
    { id: 'beanie', label: 'Knit Beanie', slot: 'hat', defaultColor: '#0d69ac', defaultAccentColor: '#f2f3f3', hatTuck: 'crown' },
    { id: 'tophat', label: 'Top Hat', slot: 'hat', defaultColor: '#1b2a35', defaultAccentColor: '#c4281c', hatTuck: 'brim' },
    { id: 'fedora', label: 'Noir Fedora', slot: 'hat', defaultColor: '#2b2e35', defaultAccentColor: '#e2e8f0', hatTuck: 'brim' },
    { id: 'valkyrie', label: 'Valkyrie Helm', slot: 'hat', defaultColor: '#f5cd30', defaultAccentColor: '#f2f3f3', hatTuck: 'fullCover' },
    { id: 'knightHelm', label: 'Knight Sallet', slot: 'hat', defaultColor: '#94a3b8', defaultAccentColor: '#0d69ac', hatTuck: 'fullCover' },
    { id: 'wizard', label: 'Wizard Hat', slot: 'hat', defaultColor: '#0d69ac', defaultAccentColor: '#f5cd30', hatTuck: 'crown' },
    { id: 'crown', label: 'Royal Crown', slot: 'hat', defaultColor: '#f5cd30', defaultAccentColor: '#ef4444', hatTuck: 'brim' },
    { id: 'hood', label: 'Ranger Hood', slot: 'hat', defaultColor: '#27462d', defaultAccentColor: '#da8541', hatTuck: 'fullCover' },
    { id: 'halo', label: 'Starlight Halo', slot: 'hat', defaultColor: '#fde047', defaultAccentColor: '#38bdf8', hatTuck: 'none' },
  ],
  face: [
    { id: 'smile', label: 'Classic Smile', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'epic', label: 'Epic :D', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'smirk', label: 'Chill Smirk', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'determined', label: 'Determined', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'visorEyes', label: 'Neon Eyes', slot: 'face', defaultColor: '#00a2ff', defaultAccentColor: '#ffffff' },
    { id: 'shocked', label: 'Surprised :O', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
  ],
  arm: [
    { id: 'none', label: 'None', slot: 'arm', defaultColor: '#a3a2a5', defaultAccentColor: '#f5cd30' },
    { id: 'gauntlet', label: 'Power Gauntlet', slot: 'arm', defaultColor: '#f5cd30', defaultAccentColor: '#c4281c' },
    { id: 'pauldron', label: 'Shoulder Pauldron', slot: 'arm', defaultColor: '#94a3b8', defaultAccentColor: '#0d69ac' },
    { id: 'wristWatch', label: 'Holo Wristband', slot: 'arm', defaultColor: '#1b2a35', defaultAccentColor: '#38bdf8' },
    { id: 'casterBrace', label: 'Arcane Bracer', slot: 'arm', defaultColor: '#6b327c', defaultAccentColor: '#fde047' },
  ],
  back: [
    { id: 'none', label: 'None', slot: 'back', defaultColor: '#a3a2a5', defaultAccentColor: '#f5cd30' },
    { id: 'cape', label: 'Hero Cape', slot: 'back', defaultColor: '#c4281c', defaultAccentColor: '#f5cd30' },
    { id: 'jetpack', label: 'Rocket Jetpack', slot: 'back', defaultColor: '#c4281c', defaultAccentColor: '#94a3b8' },
    { id: 'wings', label: 'Valkyrie Wings', slot: 'back', defaultColor: '#f2f3f3', defaultAccentColor: '#f5cd30' },
    { id: 'backpack', label: 'Explorer Pack', slot: 'back', defaultColor: '#27462d', defaultAccentColor: '#da8541' },
    { id: 'katana', label: 'Twin Katanas', slot: 'back', defaultColor: '#1b2a35', defaultAccentColor: '#cbd5e1' },
    { id: 'quiver', label: 'Ranger Quiver', slot: 'back', defaultColor: '#6b4226', defaultAccentColor: '#f2f3f3' },
    { id: 'scarf', label: 'Flowing Scarf', slot: 'back', defaultColor: '#c4281c', defaultAccentColor: '#f2f3f3' },
  ],
  legs: [
    { id: 'none', label: 'None', slot: 'legs', defaultColor: '#635f62', defaultAccentColor: '#f5cd30' },
    { id: 'belt', label: 'Utility Belt', slot: 'legs', defaultColor: '#4b2e1e', defaultAccentColor: '#f5cd30' },
    { id: 'kneepads', label: 'Armored Kneepads', slot: 'legs', defaultColor: '#635f62', defaultAccentColor: '#94a3b8' },
    { id: 'greaves', label: 'Knight Greaves', slot: 'legs', defaultColor: '#94a3b8', defaultAccentColor: '#f5cd30' },
    { id: 'thrusters', label: 'Hover Boots', slot: 'legs', defaultColor: '#1e293b', defaultAccentColor: '#38bdf8' },
    { id: 'pouches', label: 'Tactical Holsters', slot: 'legs', defaultColor: '#27462d', defaultAccentColor: '#635f62' },
  ],
};

export interface HairCatalogEntry {
  id: HairStyleId;
  label: string;
  description: string;
  defaultColor: string;
  defaultHighlight: string;
  hasTail: boolean;
}

export const HAIR_STYLE_CATALOG: HairCatalogEntry[] = [
  { id: 'none', label: 'None', description: 'Bare classic stud head', defaultColor: '#3b2416', defaultHighlight: '#f59e0b', hasTail: false },
  { id: 'spiky', label: 'Spiky', description: 'Dynamic angled classic spikes', defaultColor: '#3b2416', defaultHighlight: '#f59e0b', hasTail: false },
  { id: 'swept', label: 'Swept Fringe', description: 'Layered side-swept bangs & crown', defaultColor: '#181c24', defaultHighlight: '#38bdf8', hasTail: false },
  { id: 'sidePart', label: 'Neat Part', description: 'Clean parted hair with soft volume', defaultColor: '#6b3f24', defaultHighlight: '#eab308', hasTail: false },
  { id: 'undercut', label: 'Undercut', description: 'Textured top crop with tapered sides', defaultColor: '#181c24', defaultHighlight: '#a855f7', hasTail: false },
  { id: 'bob', label: 'Layered Bob', description: 'Chin-length bob with side locks', defaultColor: '#8f3622', defaultHighlight: '#fb923c', hasTail: true },
  { id: 'curly', label: 'Curly Afro', description: 'Voluminous sculpted curl clusters', defaultColor: '#181c24', defaultHighlight: '#64748b', hasTail: false },
  { id: 'mohawk', label: 'Punk Mohawk', description: 'Bold central ridge crest', defaultColor: '#dc2626', defaultHighlight: '#fde047', hasTail: false },
  { id: 'ponytail', label: 'High Ponytail', description: 'Sleek crown with flowing back tail', defaultColor: '#3b2416', defaultHighlight: '#ec4899', hasTail: true },
  { id: 'twinTails', label: 'Twin Tails', description: 'Parted bangs with dual animated tails', defaultColor: '#eab308', defaultHighlight: '#ec4899', hasTail: true },
  { id: 'braids', label: 'Twin Braids', description: 'Woven back braids with colored ties', defaultColor: '#3b2416', defaultHighlight: '#38bdf8', hasTail: true },
];

export const HAIR_HIGHLIGHT_PATTERNS: { id: HairHighlightPattern; label: string }[] = [
  { id: 'none', label: 'Solid' },
  { id: 'tips', label: 'Tips' },
  { id: 'streaks', label: 'Streaks' },
  { id: 'ombre', label: 'Fade' },
];

export interface ShirtCatalogEntry {
  id: ShirtStyleId;
  label: string;
  defaultColor: string;
  defaultAccent: string;
  defaultSleeves: Exclude<SleeveMode, 'auto'>;
}

export const SHIRT_CATALOG: ShirtCatalogEntry[] = [
  { id: 'none', label: 'None (Bare Torso)', defaultColor: '#0d69ac', defaultAccent: '#f5cd30', defaultSleeves: 'short' },
  { id: 'tshirt', label: 'Classic Tee', defaultColor: '#0d69ac', defaultAccent: '#f2f3f3', defaultSleeves: 'short' },
  { id: 'hoodie', label: 'Pullover Hoodie', defaultColor: '#312e81', defaultAccent: '#38bdf8', defaultSleeves: 'long' },
  { id: 'jacket', label: 'Moto Jacket', defaultColor: '#1e293b', defaultAccent: '#c4281c', defaultSleeves: 'long' },
  { id: 'varsity', label: 'Varsity Jacket', defaultColor: '#c4281c', defaultAccent: '#f2f3f3', defaultSleeves: 'long' },
  { id: 'vest', label: 'Explorer Vest', defaultColor: '#da8541', defaultAccent: '#27462d', defaultSleeves: 'short' },
  { id: 'knightTunic', label: 'Knight Tabard', defaultColor: '#0d69ac', defaultAccent: '#f5cd30', defaultSleeves: 'long' },
  { id: 'tracksuit', label: 'Track Jacket', defaultColor: '#0f766e', defaultAccent: '#f2f3f3', defaultSleeves: 'long' },
  { id: 'suitCoat', label: 'Tailored Suit', defaultColor: '#1b2a35', defaultAccent: '#c4281c', defaultSleeves: 'long' },
  { id: 'wizardRobe', label: 'Arcane Robe', defaultColor: '#4c1d95', defaultAccent: '#f5cd30', defaultSleeves: 'long' },
  { id: 'cyberSuit', label: 'Cyber Armor', defaultColor: '#1e293b', defaultAccent: '#00a2ff', defaultSleeves: 'long' },
];

export const SLEEVE_MODE_OPTIONS: { id: SleeveMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'sleeveless', label: 'Sleeveless' },
];

export interface PantsCatalogEntry {
  id: PantsStyleId;
  label: string;
  defaultColor: string;
  defaultAccent: string;
}

export const PANT_CATALOG: PantsCatalogEntry[] = [
  { id: 'none', label: 'None (Bare Legs)', defaultColor: '#a4bd47', defaultAccent: '#f2f3f3' },
  { id: 'jeans', label: 'Denim Jeans', defaultColor: '#1d4ed8', defaultAccent: '#f59e0b' },
  { id: 'cargo', label: 'Cargo Pants', defaultColor: '#27462d', defaultAccent: '#635f62' },
  { id: 'slacks', label: 'Dress Slacks', defaultColor: '#1b2a35', defaultAccent: '#64748b' },
  { id: 'shorts', label: 'Athletic Shorts', defaultColor: '#334155', defaultAccent: '#38bdf8' },
  { id: 'trackPants', label: 'Track Pants', defaultColor: '#1e293b', defaultAccent: '#f2f3f3' },
  { id: 'knightGreaves', label: 'Armored Pants', defaultColor: '#475569', defaultAccent: '#94a3b8' },
  { id: 'cyberLeggings', label: 'Cyber Trousers', defaultColor: '#0f172a', defaultAccent: '#00a2ff' },
];

export const FOOTWEAR_CATALOG: { id: FootwearId; label: string }[] = [
  { id: 'none', label: 'Bare / Default' },
  { id: 'sneakers', label: 'Low Sneakers' },
  { id: 'boots', label: 'Combat Boots' },
  { id: 'armoredBoots', label: 'Plate Sabatons' },
  { id: 'loafers', label: 'Dress Shoes' },
];

export interface AvatarBundlePreset {
  id: string;
  name: string;
  description: string;
  bodyColors: R6BodyColors;
  ornaments: R6Ornaments;
  hair: HairConfig;
  clothing: ClothingConfig;
  faceConfig: FaceRigConfig;
  defaultHeldItems: CharacterHeldItems;
}

export const ROBLOX_AVATAR_BUNDLES: AvatarBundlePreset[] = [
  {
    id: 'noob',
    name: 'Classic Noob',
    description: 'Iconic bright R6 icon upgraded with crisp tee & sneakers',
    bodyColors: {
      head: '#f5cd30',
      torso: '#0d69ac',
      leftArm: '#f5cd30',
      rightArm: '#f5cd30',
      leftLeg: '#a4bd47',
      rightLeg: '#a4bd47',
    },
    ornaments: {
      head: { id: 'none', color: '#1b2a35', accentColor: '#94a3b8' },
      hat: { id: 'none', color: '#c4281c', accentColor: '#f2f3f3' },
      face: { id: 'smile', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
      back: { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
      legs: { id: 'none', color: '#635f62', accentColor: '#f5cd30' },
    },
    hair: {
      styleId: 'none',
      primaryColor: '#3b2416',
      highlightColor: '#f59e0b',
      highlightPattern: 'none',
      volume: 1,
    },
    clothing: {
      shirtId: 'tshirt',
      shirtColor: '#0d69ac',
      shirtAccent: '#f5cd30',
      sleeveMode: 'short',
      pantsId: 'shorts',
      pantsColor: '#4d7c0f',
      pantsAccent: '#f2f3f3',
      footwearId: 'sneakers',
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
    description: 'Crested Valkyrie helm, royal tabard, cape & plate sabatons',
    bodyColors: {
      head: '#f5cd30',
      torso: '#0d69ac',
      leftArm: '#eab892',
      rightArm: '#eab892',
      leftLeg: '#635f62',
      rightLeg: '#635f62',
    },
    ornaments: {
      head: { id: 'none', color: '#1b2a35', accentColor: '#94a3b8' },
      hat: { id: 'valkyrie', color: '#f5cd30', accentColor: '#f2f3f3' },
      face: { id: 'determined', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'pauldron', color: '#94a3b8', accentColor: '#0d69ac' },
      back: { id: 'cape', color: '#c4281c', accentColor: '#f5cd30' },
      legs: { id: 'greaves', color: '#94a3b8', accentColor: '#f5cd30' },
    },
    hair: {
      styleId: 'swept',
      primaryColor: '#6b3f24',
      highlightColor: '#eab308',
      highlightPattern: 'none',
      volume: 1,
    },
    clothing: {
      shirtId: 'knightTunic',
      shirtColor: '#0d69ac',
      shirtAccent: '#f5cd30',
      sleeveMode: 'long',
      pantsId: 'knightGreaves',
      pantsColor: '#475569',
      pantsAccent: '#94a3b8',
      footwearId: 'armoredBoots',
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
    description: 'Aviator goggles, rugged vest, spiky hair under cap & jetpack',
    bodyColors: {
      head: '#cc8e69',
      torso: '#da8541',
      leftArm: '#cc8e69',
      rightArm: '#cc8e69',
      leftLeg: '#27462d',
      rightLeg: '#27462d',
    },
    ornaments: {
      head: { id: 'goggles', color: '#6b4226', accentColor: '#f59e0b' },
      hat: { id: 'cap', color: '#c4281c', accentColor: '#f2f3f3' },
      face: { id: 'epic', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'wristWatch', color: '#1b2a35', accentColor: '#38bdf8' },
      back: { id: 'jetpack', color: '#c4281c', accentColor: '#94a3b8' },
      legs: { id: 'belt', color: '#4b2e1e', accentColor: '#f5cd30' },
    },
    hair: {
      styleId: 'spiky',
      primaryColor: '#3b2416',
      highlightColor: '#f59e0b',
      highlightPattern: 'tips',
      volume: 1,
    },
    clothing: {
      shirtId: 'vest',
      shirtColor: '#da8541',
      shirtAccent: '#27462d',
      sleeveMode: 'short',
      pantsId: 'cargo',
      pantsColor: '#27462d',
      pantsAccent: '#635f62',
      footwearId: 'boots',
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
    description: 'Varsity streetwear jacket, studio headphones & classic cap',
    bodyColors: {
      head: '#f2f3f3',
      torso: '#1b2a35',
      leftArm: '#f2f3f3',
      rightArm: '#f2f3f3',
      leftLeg: '#1b2a35',
      rightLeg: '#1b2a35',
    },
    ornaments: {
      head: { id: 'headphones', color: '#1e293b', accentColor: '#00a2ff' },
      hat: { id: 'cap', color: '#1b2a35', accentColor: '#00a2ff' },
      face: { id: 'smirk', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'wristWatch', color: '#1b2a35', accentColor: '#c4281c' },
      back: { id: 'backpack', color: '#27462d', accentColor: '#da8541' },
      legs: { id: 'pouches', color: '#1e293b', accentColor: '#635f62' },
    },
    hair: {
      styleId: 'undercut',
      primaryColor: '#181c24',
      highlightColor: '#00a2ff',
      highlightPattern: 'streaks',
      volume: 1,
    },
    clothing: {
      shirtId: 'varsity',
      shirtColor: '#1b2a35',
      shirtAccent: '#00a2ff',
      sleeveMode: 'long',
      pantsId: 'jeans',
      pantsColor: '#1e293b',
      pantsAccent: '#94a3b8',
      footwearId: 'sneakers',
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
    description: 'Cyber visor, tailored suit coat, katana rig & hover boots',
    bodyColors: {
      head: '#a3a2a5',
      torso: '#1b2a35',
      leftArm: '#635f62',
      rightArm: '#635f62',
      leftLeg: '#1b2a35',
      rightLeg: '#1b2a35',
    },
    ornaments: {
      head: { id: 'visor', color: '#1e293b', accentColor: '#00a2ff' },
      hat: { id: 'tophat', color: '#1b2a35', accentColor: '#00a2ff' },
      face: { id: 'visorEyes', color: '#00a2ff', accentColor: '#ffffff' },
      arm: { id: 'gauntlet', color: '#1e293b', accentColor: '#00a2ff' },
      back: { id: 'katana', color: '#1b2a35', accentColor: '#38bdf8' },
      legs: { id: 'thrusters', color: '#1e293b', accentColor: '#38bdf8' },
    },
    hair: {
      styleId: 'sidePart',
      primaryColor: '#181c24',
      highlightColor: '#38bdf8',
      highlightPattern: 'streaks',
      volume: 1,
    },
    clothing: {
      shirtId: 'cyberSuit',
      shirtColor: '#1b2a35',
      shirtAccent: '#00a2ff',
      sleeveMode: 'long',
      pantsId: 'cyberLeggings',
      pantsColor: '#0f172a',
      pantsAccent: '#00a2ff',
      footwearId: 'boots',
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
  {
    id: 'cozyGamer',
    name: 'Cozy Gamer',
    description: 'Pullover hoodie, high ponytail, studio headphones & joggers',
    bodyColors: {
      head: '#eab892',
      torso: '#312e81',
      leftArm: '#eab892',
      rightArm: '#eab892',
      leftLeg: '#1e293b',
      rightLeg: '#1e293b',
    },
    ornaments: {
      head: { id: 'headphones', color: '#f2f3f3', accentColor: '#a855f7' },
      hat: { id: 'none', color: '#312e81', accentColor: '#a855f7' },
      face: { id: 'smile', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'wristWatch', color: '#1e293b', accentColor: '#a855f7' },
      back: { id: 'none', color: '#a3a2a5', accentColor: '#a855f7' },
      legs: { id: 'none', color: '#635f62', accentColor: '#a855f7' },
    },
    hair: {
      styleId: 'ponytail',
      primaryColor: '#3b2416',
      highlightColor: '#ec4899',
      highlightPattern: 'tips',
      volume: 1.05,
    },
    clothing: {
      shirtId: 'hoodie',
      shirtColor: '#312e81',
      shirtAccent: '#38bdf8',
      sleeveMode: 'long',
      pantsId: 'trackPants',
      pantsColor: '#1e293b',
      pantsAccent: '#a855f7',
      footwearId: 'sneakers',
    },
    faceConfig: {
      eyeStyle: 'expressive',
      browStyle: 'rounded',
      mouthStyle: 'openCavity',
      cheekStyle: 'blush',
      eyeColor: '#4f46e5',
      browColor: '#3b2416',
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
    id: 'arcaneMage',
    name: 'Arcane Mage',
    description: 'Wizard hat over layered bob hair, rune robes & mystic bracer',
    bodyColors: {
      head: '#eab892',
      torso: '#4c1d95',
      leftArm: '#eab892',
      rightArm: '#eab892',
      leftLeg: '#312e81',
      rightLeg: '#312e81',
    },
    ornaments: {
      head: { id: 'monocle', color: '#f5cd30', accentColor: '#38bdf8' },
      hat: { id: 'wizard', color: '#4c1d95', accentColor: '#f5cd30' },
      face: { id: 'determined', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'casterBrace', color: '#6b327c', accentColor: '#fde047' },
      back: { id: 'cape', color: '#312e81', accentColor: '#f5cd30' },
      legs: { id: 'belt', color: '#4b2e1e', accentColor: '#f5cd30' },
    },
    hair: {
      styleId: 'bob',
      primaryColor: '#e2e8f0',
      highlightColor: '#06b6d4',
      highlightPattern: 'ombre',
      volume: 1,
    },
    clothing: {
      shirtId: 'wizardRobe',
      shirtColor: '#4c1d95',
      shirtAccent: '#f5cd30',
      sleeveMode: 'long',
      pantsId: 'slacks',
      pantsColor: '#1e1b4b',
      pantsAccent: '#f5cd30',
      footwearId: 'boots',
    },
    faceConfig: {
      eyeStyle: 'starry',
      browStyle: 'arched',
      mouthStyle: 'sculpted',
      cheekStyle: 'none',
      eyeColor: '#7c3aed',
      browColor: '#475569',
      mouthColor: '#1e293b',
      accentColor: '#38bdf8',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createDefaultHandStateForItem('arcaneStaff', 'right'),
      left: createDefaultHandStateForItem('glowLantern', 'left'),
    },
  },
  {
    id: 'townCasual',
    name: 'Town Casual',
    description: 'Moto jacket, denim jeans, knit beanie & tousled fringe',
    bodyColors: {
      head: '#cc8e69',
      torso: '#1e293b',
      leftArm: '#cc8e69',
      rightArm: '#cc8e69',
      leftLeg: '#1d4ed8',
      rightLeg: '#1d4ed8',
    },
    ornaments: {
      head: { id: 'shades', color: '#1b2a35', accentColor: '#f59e0b' },
      hat: { id: 'beanie', color: '#c4281c', accentColor: '#f2f3f3' },
      face: { id: 'smirk', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
      back: { id: 'scarf', color: '#c4281c', accentColor: '#f2f3f3' },
      legs: { id: 'none', color: '#635f62', accentColor: '#f5cd30' },
    },
    hair: {
      styleId: 'swept',
      primaryColor: '#6b3f24',
      highlightColor: '#eab308',
      highlightPattern: 'tips',
      volume: 1,
    },
    clothing: {
      shirtId: 'jacket',
      shirtColor: '#1e293b',
      shirtAccent: '#c4281c',
      sleeveMode: 'long',
      pantsId: 'jeans',
      pantsColor: '#1d4ed8',
      pantsAccent: '#f59e0b',
      footwearId: 'boots',
    },
    faceConfig: {
      eyeStyle: 'classic',
      browStyle: 'bold',
      mouthStyle: 'smirk',
      cheekStyle: 'freckles',
      eyeColor: '#111827',
      browColor: '#3b2416',
      mouthColor: '#111827',
      accentColor: '#f59e0b',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createEmptyHandState(),
      left: createEmptyHandState(),
    },
  },
];

export interface OutfitPreset {
  id: string;
  name: string;
  tag: string;
  hair: HairConfig;
  clothing: ClothingConfig;
  hat: { id: string; color: string; accentColor: string };
  head: { id: string; color: string; accentColor: string };
  back: { id: string; color: string; accentColor: string };
  arm: { id: string; color: string; accentColor: string };
  legs: { id: string; color: string; accentColor: string };
}

export const OUTFIT_PRESETS: OutfitPreset[] = ROBLOX_AVATAR_BUNDLES.map((b) => ({
  id: b.id,
  name: b.name,
  tag: b.description,
  hair: { ...b.hair },
  clothing: { ...b.clothing },
  hat: {
    id: b.ornaments.hat.id,
    color: b.ornaments.hat.color,
    accentColor: b.ornaments.hat.accentColor ?? '#f2f3f3',
  },
  head: {
    id: b.ornaments.head.id,
    color: b.ornaments.head.color,
    accentColor: b.ornaments.head.accentColor ?? '#38bdf8',
  },
  back: {
    id: b.ornaments.back.id,
    color: b.ornaments.back.color,
    accentColor: b.ornaments.back.accentColor ?? '#f5cd30',
  },
  arm: {
    id: b.ornaments.arm.id,
    color: b.ornaments.arm.color,
    accentColor: b.ornaments.arm.accentColor ?? '#f5cd30',
  },
  legs: {
    id: b.ornaments.legs.id,
    color: b.ornaments.legs.color,
    accentColor: b.ornaments.legs.accentColor ?? '#f5cd30',
  },
}));

export function getHatTuckProfile(hatId: string | undefined): HatTuckProfile {
  if (!hatId || hatId === 'none') return 'none';
  const found = ORNAMENT_CATALOG.hat.find((h) => h.id === hatId);
  return found?.hatTuck ?? 'brim';
}

export function createDefaultHairConfig(): HairConfig {
  return {
    styleId: 'none',
    primaryColor: '#3b2416',
    highlightColor: '#f59e0b',
    highlightPattern: 'none',
    volume: 1,
  };
}

export function createDefaultClothingConfig(): ClothingConfig {
  return {
    shirtId: 'none',
    shirtColor: '#0d69ac',
    shirtAccent: '#f5cd30',
    sleeveMode: 'auto',
    pantsId: 'none',
    pantsColor: '#1d4ed8',
    pantsAccent: '#f2f3f3',
    footwearId: 'none',
  };
}

export function resolveActorHair(actor?: Partial<SceneActorConfig> | null): HairConfig {
  if (actor?.hair) {
    return { ...actor.hair };
  }
  // Graceful legacy migration if an older project used hat === 'spiky'
  if (actor?.ornaments?.hat?.id === 'spiky') {
    return {
      styleId: 'spiky',
      primaryColor: actor.ornaments.hat.color || '#4b2e1e',
      highlightColor: actor.ornaments.hat.accentColor || '#f59e0b',
      highlightPattern: 'none',
      volume: 1,
    };
  }
  const bundle = ROBLOX_AVATAR_BUNDLES.find((b) => b.id === actor?.bundleId);
  if (bundle) return { ...bundle.hair };
  return createDefaultHairConfig();
}

export function resolveActorClothing(actor?: Partial<SceneActorConfig> | null): ClothingConfig {
  if (actor?.clothing) {
    return { ...actor.clothing };
  }
  const bundle = ROBLOX_AVATAR_BUNDLES.find((b) => b.id === actor?.bundleId);
  if (bundle) return { ...bundle.clothing };
  return createDefaultClothingConfig();
}

export function cloneBundle(bundleId: string): {
  bodyColors: R6BodyColors;
  ornaments: R6Ornaments;
  hair: HairConfig;
  clothing: ClothingConfig;
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
    hair: { ...found.hair },
    clothing: { ...found.clothing },
    faceConfig: { ...found.faceConfig },
    heldItems: cloneCharacterHeldItems(found.defaultHeldItems),
  };
}
