import {
  cloneCharacterHeldItems,
  createDefaultHandStateForItem,
  createEmptyHandState,
} from './itemCatalog';
import {
  AccessoryFit,
  BeltStyleId,
  CharacterHeldItems,
  ClothingConfig,
  ClothingPatternId,
  FabricMaterialId,
  FaceRigConfig,
  FootwearId,
  HairAccessoryId,
  HairBangsStyleId,
  HairConfig,
  HairFinishId,
  HairHighlightPattern,
  HairStyleId,
  HatTuckProfile,
  NormalizedR6Ornaments,
  ORNAMENT_SLOTS,
  OrnamentSelection,
  OrnamentSlot,
  OuterwearStyleId,
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
  { name: 'Honey Blonde', hex: '#dfc099' },
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

export const ACCESSORY_COLOR_SWATCHES: BrickColorSwatch[] = [
  { name: 'Obsidian', hex: '#181c24' },
  { name: 'Brushed Gold', hex: '#eab308' },
  { name: 'Chrome Silver', hex: '#cbd5e1' },
  { name: 'Tortoise Brown', hex: '#7c3f1d' },
  { name: 'Crimson', hex: '#c4281c' },
  { name: 'Studio Blue', hex: '#00a2ff' },
  { name: 'Sakura Rose', hex: '#f472b6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Ivory Cream', hex: '#f8fafc' },
  { name: 'Royal Purple', hex: '#7e22ce' },
  { name: 'Warm Camel', hex: '#c28b59' },
  { name: 'Electric Cyan', hex: '#22d3ee' },
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
    { id: 'shades', label: 'Classic Shades', slot: 'head', defaultColor: '#181c24', defaultAccentColor: '#eab308' },
    { id: 'roundGlasses', label: 'Round Wire', slot: 'head', defaultColor: '#eab308', defaultAccentColor: '#bae6fd' },
    { id: 'aviators', label: 'Aviators', slot: 'head', defaultColor: '#eab308', defaultAccentColor: '#0f172a' },
    { id: 'heartShades', label: 'Heart Shades', slot: 'head', defaultColor: '#ec4899', defaultAccentColor: '#fda4af' },
    { id: 'catEyeGlasses', label: 'Cat-Eye', slot: 'head', defaultColor: '#991b1b', defaultAccentColor: '#e0f2fe' },
    { id: 'halfRim', label: 'Half-Rim', slot: 'head', defaultColor: '#1e293b', defaultAccentColor: '#cbd5e1' },
    { id: 'headphones', label: 'Headphones', slot: 'head', defaultColor: '#1e293b', defaultAccentColor: '#00a2ff' },
    { id: 'visor', label: 'Cyber Visor', slot: 'head', defaultColor: '#1e293b', defaultAccentColor: '#00a2ff' },
    { id: 'vrHeadset', label: 'VR Headset', slot: 'head', defaultColor: '#f8fafc', defaultAccentColor: '#38bdf8' },
    { id: 'goggles', label: 'Aviator Goggles', slot: 'head', defaultColor: '#6b4226', defaultAccentColor: '#f59e0b' },
    { id: 'domino', label: 'Domino Mask', slot: 'head', defaultColor: '#c4281c', defaultAccentColor: '#f5cd30' },
    { id: 'faceMask', label: 'Street Mask', slot: 'head', defaultColor: '#181c24', defaultAccentColor: '#f8fafc' },
    { id: 'kitsuneMask', label: 'Kitsune Mask', slot: 'head', defaultColor: '#f8fafc', defaultAccentColor: '#dc2626' },
    { id: 'monocle', label: 'Brass Monocle', slot: 'head', defaultColor: '#eab308', defaultAccentColor: '#bae6fd' },
  ],
  hat: [
    { id: 'none', label: 'None', slot: 'hat', defaultColor: '#c4281c', defaultAccentColor: '#f2f3f3', hatTuck: 'none' },
    { id: 'cap', label: 'Classic Cap', slot: 'hat', defaultColor: '#c4281c', defaultAccentColor: '#f2f3f3', hatTuck: 'brim' },
    { id: 'backwardsCap', label: 'Backwards Cap', slot: 'hat', defaultColor: '#1e293b', defaultAccentColor: '#00a2ff', hatTuck: 'brim' },
    { id: 'beanie', label: 'Knit Beanie', slot: 'hat', defaultColor: '#0d69ac', defaultAccentColor: '#f2f3f3', hatTuck: 'crown' },
    { id: 'bucketHat', label: 'Bucket Hat', slot: 'hat', defaultColor: '#d6cfc2', defaultAccentColor: '#1e293b', hatTuck: 'brim' },
    { id: 'beret', label: 'Artist Beret', slot: 'hat', defaultColor: '#991b1b', defaultAccentColor: '#eab308', hatTuck: 'crown' },
    { id: 'cowboyHat', label: 'Cowboy Hat', slot: 'hat', defaultColor: '#78350f', defaultAccentColor: '#eab308', hatTuck: 'brim' },
    { id: 'ushanka', label: 'Fur Ushanka', slot: 'hat', defaultColor: '#334155', defaultAccentColor: '#e2d5c3', hatTuck: 'crown' },
    { id: 'tophat', label: 'Top Hat', slot: 'hat', defaultColor: '#181c24', defaultAccentColor: '#c4281c', hatTuck: 'brim' },
    { id: 'fedora', label: 'Noir Fedora', slot: 'hat', defaultColor: '#2b2e35', defaultAccentColor: '#e2e8f0', hatTuck: 'brim' },
    { id: 'valkyrie', label: 'Valkyrie Helm', slot: 'hat', defaultColor: '#f5cd30', defaultAccentColor: '#f2f3f3', hatTuck: 'fullCover' },
    { id: 'knightHelm', label: 'Knight Sallet', slot: 'hat', defaultColor: '#94a3b8', defaultAccentColor: '#0d69ac', hatTuck: 'fullCover' },
    { id: 'wizard', label: 'Wizard Hat', slot: 'hat', defaultColor: '#0d69ac', defaultAccentColor: '#f5cd30', hatTuck: 'crown' },
    { id: 'witchHat', label: 'Witch Hat', slot: 'hat', defaultColor: '#3b0764', defaultAccentColor: '#f59e0b', hatTuck: 'crown' },
    { id: 'crown', label: 'Royal Crown', slot: 'hat', defaultColor: '#f5cd30', defaultAccentColor: '#ef4444', hatTuck: 'brim' },
    { id: 'hood', label: 'Ranger Hood', slot: 'hat', defaultColor: '#27462d', defaultAccentColor: '#da8541', hatTuck: 'fullCover' },
    { id: 'halo', label: 'Starlight Halo', slot: 'hat', defaultColor: '#fde047', defaultAccentColor: '#38bdf8', hatTuck: 'none' },
    { id: 'demonHorns', label: 'Demon Horns', slot: 'hat', defaultColor: '#181c24', defaultAccentColor: '#dc2626', hatTuck: 'none' },
    { id: 'bunnyEars', label: 'Plush Ears', slot: 'hat', defaultColor: '#f8fafc', defaultAccentColor: '#f472b6', hatTuck: 'none' },
  ],
  face: [
    { id: 'smile', label: 'Classic Smile', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'epic', label: 'Epic :D', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'smirk', label: 'Chill Smirk', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'determined', label: 'Determined', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
    { id: 'visorEyes', label: 'Neon Eyes', slot: 'face', defaultColor: '#00a2ff', defaultAccentColor: '#ffffff' },
    { id: 'shocked', label: 'Surprised :O', slot: 'face', defaultColor: '#111827', defaultAccentColor: '#ffffff' },
  ],
  neck: [
    { id: 'none', label: 'None', slot: 'neck', defaultColor: '#eab308', defaultAccentColor: '#f8fafc' },
    { id: 'cubanChain', label: 'Cuban Chain', slot: 'neck', defaultColor: '#eab308', defaultAccentColor: '#fef08a' },
    { id: 'knitScarf', label: 'Cozy Scarf', slot: 'neck', defaultColor: '#b91c1c', defaultAccentColor: '#f8fafc' },
    { id: 'necktie', label: 'Striped Tie', slot: 'neck', defaultColor: '#1e3a8a', defaultAccentColor: '#eab308' },
    { id: 'bowTie', label: 'Bow Tie', slot: 'neck', defaultColor: '#dc2626', defaultAccentColor: '#f8fafc' },
    { id: 'spikedChoker', label: 'Spiked Choker', slot: 'neck', defaultColor: '#181c24', defaultAccentColor: '#cbd5e1' },
    { id: 'pearlNecklace', label: 'Pearl Strand', slot: 'neck', defaultColor: '#f8fafc', defaultAccentColor: '#eab308' },
    { id: 'lanyard', label: 'ID Lanyard', slot: 'neck', defaultColor: '#00a2ff', defaultAccentColor: '#f8fafc' },
    { id: 'goldMedallion', label: 'Medallion', slot: 'neck', defaultColor: '#eab308', defaultAccentColor: '#38bdf8' },
  ],
  shoulder: [
    { id: 'none', label: 'None', slot: 'shoulder', defaultColor: '#38bdf8', defaultAccentColor: '#f8fafc' },
    { id: 'miniBot', label: 'Mini Bot', slot: 'shoulder', defaultColor: '#cbd5e1', defaultAccentColor: '#00a2ff' },
    { id: 'shoulderCat', label: 'Plush Cat', slot: 'shoulder', defaultColor: '#f59e0b', defaultAccentColor: '#f8fafc' },
    { id: 'tinyDragon', label: 'Tiny Dragon', slot: 'shoulder', defaultColor: '#dc2626', defaultAccentColor: '#fde047' },
    { id: 'parrotBuddy', label: 'Parrot Buddy', slot: 'shoulder', defaultColor: '#10b981', defaultAccentColor: '#ef4444' },
    { id: 'floatingCrystal', label: 'Arcane Shard', slot: 'shoulder', defaultColor: '#38bdf8', defaultAccentColor: '#a855f7' },
    { id: 'spikedPauldrons', label: 'Twin Pauldrons', slot: 'shoulder', defaultColor: '#475569', defaultAccentColor: '#eab308' },
    { id: 'furMantle', label: 'Fur Mantle', slot: 'shoulder', defaultColor: '#e2d5c3', defaultAccentColor: '#78350f' },
  ],
  arm: [
    { id: 'none', label: 'None', slot: 'arm', defaultColor: '#a3a2a5', defaultAccentColor: '#f5cd30' },
    { id: 'gauntlet', label: 'Power Gauntlet', slot: 'arm', defaultColor: '#f5cd30', defaultAccentColor: '#c4281c' },
    { id: 'pauldron', label: 'Arm Pauldron', slot: 'arm', defaultColor: '#94a3b8', defaultAccentColor: '#0d69ac' },
    { id: 'wristWatch', label: 'Holo Wristband', slot: 'arm', defaultColor: '#1b2a35', defaultAccentColor: '#38bdf8' },
    { id: 'smartwatch', label: 'Smartwatch', slot: 'arm', defaultColor: '#181c24', defaultAccentColor: '#22c55e' },
    { id: 'casterBrace', label: 'Arcane Bracer', slot: 'arm', defaultColor: '#6b327c', defaultAccentColor: '#fde047' },
    { id: 'spikedCuff', label: 'Spiked Cuff', slot: 'arm', defaultColor: '#181c24', defaultAccentColor: '#cbd5e1' },
    { id: 'forearmPad', label: 'Tactical Guard', slot: 'arm', defaultColor: '#334155', defaultAccentColor: '#00a2ff' },
  ],
  back: [
    { id: 'none', label: 'None', slot: 'back', defaultColor: '#a3a2a5', defaultAccentColor: '#f5cd30' },
    { id: 'cape', label: 'Hero Cape', slot: 'back', defaultColor: '#c4281c', defaultAccentColor: '#f5cd30' },
    { id: 'streetBackpack', label: 'Street Pack', slot: 'back', defaultColor: '#1e293b', defaultAccentColor: '#f59e0b' },
    { id: 'backpack', label: 'Explorer Pack', slot: 'back', defaultColor: '#27462d', defaultAccentColor: '#da8541' },
    { id: 'jetpack', label: 'Rocket Jetpack', slot: 'back', defaultColor: '#c4281c', defaultAccentColor: '#38bdf8' },
    { id: 'hoverPack', label: 'Cyber Thruster', slot: 'back', defaultColor: '#1e293b', defaultAccentColor: '#22d3ee' },
    { id: 'wings', label: 'Valkyrie Wings', slot: 'back', defaultColor: '#f2f3f3', defaultAccentColor: '#f5cd30' },
    { id: 'angelWings', label: 'Seraph Wings', slot: 'back', defaultColor: '#f8fafc', defaultAccentColor: '#bae6fd' },
    { id: 'katana', label: 'Twin Katanas', slot: 'back', defaultColor: '#1b2a35', defaultAccentColor: '#cbd5e1' },
    { id: 'quiver', label: 'Ranger Quiver', slot: 'back', defaultColor: '#6b4226', defaultAccentColor: '#f2f3f3' },
    { id: 'scarf', label: 'Flowing Scarf', slot: 'back', defaultColor: '#c4281c', defaultAccentColor: '#f2f3f3' },
    { id: 'backGuitar', label: 'Back Guitar', slot: 'back', defaultColor: '#c28b59', defaultAccentColor: '#1e293b' },
    { id: 'backSkateboard', label: 'Back Deck', slot: 'back', defaultColor: '#0284c7', defaultAccentColor: '#f59e0b' },
  ],
  waist: [
    { id: 'none', label: 'None', slot: 'waist', defaultColor: '#1e293b', defaultAccentColor: '#eab308' },
    { id: 'crossbodySling', label: 'Crossbody Sling', slot: 'waist', defaultColor: '#181c24', defaultAccentColor: '#00a2ff' },
    { id: 'messengerBag', label: 'Side Satchel', slot: 'waist', defaultColor: '#78350f', defaultAccentColor: '#eab308' },
    { id: 'fannyPack', label: 'Street Pouch', slot: 'waist', defaultColor: '#1e293b', defaultAccentColor: '#f472b6' },
    { id: 'hipKatana', label: 'Hip Katana', slot: 'waist', defaultColor: '#181c24', defaultAccentColor: '#dc2626' },
    { id: 'potionBelt', label: 'Potion Belt', slot: 'waist', defaultColor: '#6b4226', defaultAccentColor: '#38bdf8' },
    { id: 'walletChain', label: 'Wallet Chain', slot: 'waist', defaultColor: '#cbd5e1', defaultAccentColor: '#181c24' },
    { id: 'hipCamera', label: 'Camera Strap', slot: 'waist', defaultColor: '#1e293b', defaultAccentColor: '#cbd5e1' },
  ],
  legs: [
    { id: 'none', label: 'None', slot: 'legs', defaultColor: '#635f62', defaultAccentColor: '#f5cd30' },
    { id: 'belt', label: 'Utility Belt', slot: 'legs', defaultColor: '#4b2e1e', defaultAccentColor: '#f5cd30' },
    { id: 'kneepads', label: 'Kneepads', slot: 'legs', defaultColor: '#635f62', defaultAccentColor: '#94a3b8' },
    { id: 'greaves', label: 'Knight Greaves', slot: 'legs', defaultColor: '#94a3b8', defaultAccentColor: '#f5cd30' },
    { id: 'thrusters', label: 'Hover Boots', slot: 'legs', defaultColor: '#1e293b', defaultAccentColor: '#38bdf8' },
    { id: 'pouches', label: 'Leg Holsters', slot: 'legs', defaultColor: '#27462d', defaultAccentColor: '#635f62' },
    { id: 'thighPouch', label: 'Thigh Bag', slot: 'legs', defaultColor: '#1e293b', defaultAccentColor: '#f59e0b' },
    { id: 'neonAnklets', label: 'Neon Anklets', slot: 'legs', defaultColor: '#181c24', defaultAccentColor: '#22d3ee' },
  ],
};

export interface AccessoryComboPreset {
  id: string;
  label: string;
  slots: Partial<Record<Exclude<OrnamentSlot, 'face'>, OrnamentSelection>>;
}

export const ACCESSORY_COMBOS: AccessoryComboPreset[] = [
  {
    id: 'streetCreator',
    label: 'Street Creator',
    slots: {
      hat: { id: 'backwardsCap', color: '#181c24', accentColor: '#00a2ff' },
      head: { id: 'shades', color: '#181c24', accentColor: '#eab308' },
      neck: { id: 'cubanChain', color: '#eab308', accentColor: '#fef08a' },
      shoulder: { id: 'none', color: '#cbd5e1', accentColor: '#00a2ff' },
      back: { id: 'streetBackpack', color: '#1e293b', accentColor: '#f59e0b' },
      waist: { id: 'crossbodySling', color: '#181c24', accentColor: '#00a2ff' },
      arm: { id: 'smartwatch', color: '#181c24', accentColor: '#22c55e' },
    },
  },
  {
    id: 'campusCasual',
    label: 'Campus Casual',
    slots: {
      hat: { id: 'beret', color: '#991b1b', accentColor: '#eab308' },
      head: { id: 'roundGlasses', color: '#eab308', accentColor: '#bae6fd' },
      neck: { id: 'knitScarf', color: '#b91c1c', accentColor: '#f8fafc' },
      shoulder: { id: 'shoulderCat', color: '#f59e0b', accentColor: '#f8fafc' },
      back: { id: 'none', color: '#1e293b', accentColor: '#f59e0b' },
      waist: { id: 'messengerBag', color: '#78350f', accentColor: '#eab308' },
    },
  },
  {
    id: 'cyberRunner',
    label: 'Cyber Runner',
    slots: {
      hat: { id: 'none', color: '#181c24', accentColor: '#22d3ee' },
      head: { id: 'visor', color: '#1e293b', accentColor: '#22d3ee' },
      neck: { id: 'lanyard', color: '#00a2ff', accentColor: '#f8fafc' },
      shoulder: { id: 'miniBot', color: '#cbd5e1', accentColor: '#00a2ff' },
      back: { id: 'hoverPack', color: '#1e293b', accentColor: '#22d3ee' },
      waist: { id: 'fannyPack', color: '#181c24', accentColor: '#22d3ee' },
      arm: { id: 'wristWatch', color: '#1b2a35', accentColor: '#38bdf8' },
      legs: { id: 'neonAnklets', color: '#181c24', accentColor: '#22d3ee' },
    },
  },
  {
    id: 'royalPaladin',
    label: 'Royal Paladin',
    slots: {
      hat: { id: 'crown', color: '#f5cd30', accentColor: '#ef4444' },
      head: { id: 'none', color: '#181c24', accentColor: '#f5cd30' },
      neck: { id: 'goldMedallion', color: '#eab308', accentColor: '#38bdf8' },
      shoulder: { id: 'spikedPauldrons', color: '#94a3b8', accentColor: '#eab308' },
      back: { id: 'cape', color: '#c4281c', accentColor: '#f5cd30' },
      waist: { id: 'hipKatana', color: '#1e293b', accentColor: '#eab308' },
      arm: { id: 'gauntlet', color: '#f5cd30', accentColor: '#c4281c' },
      legs: { id: 'greaves', color: '#94a3b8', accentColor: '#f5cd30' },
    },
  },
  {
    id: 'arcaneMage',
    label: 'Arcane Mage',
    slots: {
      hat: { id: 'witchHat', color: '#3b0764', accentColor: '#f59e0b' },
      head: { id: 'monocle', color: '#eab308', accentColor: '#bae6fd' },
      neck: { id: 'pearlNecklace', color: '#f8fafc', accentColor: '#a855f7' },
      shoulder: { id: 'floatingCrystal', color: '#38bdf8', accentColor: '#a855f7' },
      back: { id: 'angelWings', color: '#f8fafc', accentColor: '#bae6fd' },
      waist: { id: 'potionBelt', color: '#6b4226', accentColor: '#38bdf8' },
      arm: { id: 'casterBrace', color: '#6b327c', accentColor: '#fde047' },
    },
  },
  {
    id: 'clearAll',
    label: 'Clear Gear',
    slots: {
      hat: { id: 'none', color: '#c4281c', accentColor: '#f2f3f3' },
      head: { id: 'none', color: '#181c24', accentColor: '#38bdf8' },
      neck: { id: 'none', color: '#eab308', accentColor: '#f8fafc' },
      shoulder: { id: 'none', color: '#38bdf8', accentColor: '#f8fafc' },
      back: { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
      waist: { id: 'none', color: '#1e293b', accentColor: '#eab308' },
      arm: { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
      legs: { id: 'none', color: '#635f62', accentColor: '#f5cd30' },
    },
  },
];

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
  { id: 'longWavyPart', label: 'Long Wavy', description: 'Sculpted center-parted flowing S-waves', defaultColor: '#dfc099', defaultHighlight: '#f7e5cc', hasTail: true },
  { id: 'wolfCut', label: 'Wolf Cut', description: 'Shaggy layered crown with wispy flicks and back curtain', defaultColor: '#181c24', defaultHighlight: '#ec4899', hasTail: true },
  { id: 'messyFluffy', label: 'Messy Fluffy', description: 'Soft tousled UGC curls and layered crown volume', defaultColor: '#3b2416', defaultHighlight: '#da8541', hasTail: false },
  { id: 'topBun', label: 'Top Bun', description: 'Sleek swept crown with twisted high bun and tendrils', defaultColor: '#6b3f24', defaultHighlight: '#f59e0b', hasTail: false },
  { id: 'texturedFade', label: 'Textured Fade', description: 'Seamless tapered fade sides with wavy top crop', defaultColor: '#181c24', defaultHighlight: '#64748b', hasTail: false },
  { id: 'spiky', label: 'Spiky', description: 'Dynamic sculpted layered anime-style spikes', defaultColor: '#3b2416', defaultHighlight: '#f59e0b', hasTail: false },
  { id: 'swept', label: 'Swept Fringe', description: 'Flowing side-swept sculpted crown and fringe', defaultColor: '#181c24', defaultHighlight: '#38bdf8', hasTail: false },
  { id: 'sidePart', label: 'Neat Part', description: 'Smooth side-parted sculpted waves', defaultColor: '#6b3f24', defaultHighlight: '#eab308', hasTail: false },
  { id: 'undercut', label: 'Undercut', description: 'Voluminous sculpted pompadour over seamless fade', defaultColor: '#181c24', defaultHighlight: '#a855f7', hasTail: false },
  { id: 'bob', label: 'Layered Bob', description: 'Chin-length curved UGC bob with tucked cheek locks', defaultColor: '#8f3622', defaultHighlight: '#fb923c', hasTail: true },
  { id: 'curly', label: 'Curly Afro', description: 'Lush sculpted coil cluster with full crown wrap', defaultColor: '#181c24', defaultHighlight: '#64748b', hasTail: false },
  { id: 'mohawk', label: 'Punk Mohawk', description: 'Sweeping sculpted crest over seamless shaved sides', defaultColor: '#dc2626', defaultHighlight: '#fde047', hasTail: false },
  { id: 'ponytail', label: 'High Ponytail', description: 'Pulled-back sculpted crown with cascading tail', defaultColor: '#3b2416', defaultHighlight: '#ec4899', hasTail: true },
  { id: 'twinTails', label: 'Twin Tails', description: 'Parted crown with dual flowing sculpted tails', defaultColor: '#eab308', defaultHighlight: '#ec4899', hasTail: true },
  { id: 'braids', label: 'Twin Braids', description: 'Sculpted interwoven back braids with tapered tips', defaultColor: '#3b2416', defaultHighlight: '#38bdf8', hasTail: true },
];

export const HAIR_HIGHLIGHT_PATTERNS: { id: HairHighlightPattern; label: string }[] = [
  { id: 'none', label: 'Solid' },
  { id: 'tips', label: 'Tips' },
  { id: 'streaks', label: 'Streaks' },
  { id: 'ombre', label: 'Fade' },
];

export const HAIR_BANGS_CATALOG: { id: HairBangsStyleId; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'curtain', label: 'Curtain' },
  { id: 'swept', label: 'Swept' },
  { id: 'blunt', label: 'Blunt' },
  { id: 'wispy', label: 'Wispy' },
  { id: 'middleArch', label: 'Arch' },
  { id: 'none', label: 'None' },
];

export const HAIR_ACCESSORY_CATALOG: {
  id: HairAccessoryId;
  label: string;
  defaultColor: string;
}[] = [
  { id: 'none', label: 'None', defaultColor: '#f472b6' },
  { id: 'hibiscus', label: 'Hibiscus Pin', defaultColor: '#f472b6' },
  { id: 'ribbonBow', label: 'Ribbon Bow', defaultColor: '#ef4444' },
  { id: 'starClips', label: 'Star Clips', defaultColor: '#facc15' },
  { id: 'headband', label: 'Headband', defaultColor: '#38bdf8' },
  { id: 'catEars', label: 'Plush Ears', defaultColor: '#f472b6' },
];

export const HAIR_FINISH_OPTIONS: { id: HairFinishId; label: string }[] = [
  { id: 'silky', label: 'Silky' },
  { id: 'matte', label: 'Matte' },
  { id: 'glossy', label: 'Glossy' },
];

export const CLOTHING_COLOR_SWATCHES: BrickColorSwatch[] = [
  { name: 'Charcoal', hex: '#1e293b' },
  { name: 'Ivory Cream', hex: '#f8fafc' },
  { name: 'Denim Blue', hex: '#1d4ed8' },
  { name: 'Forest Sage', hex: '#27462d' },
  { name: 'Crimson', hex: '#b91c1c' },
  { name: 'Camel Tan', hex: '#c28b59' },
  { name: 'Oatmeal', hex: '#d6cfc2' },
  { name: 'Navy Ink', hex: '#172554' },
  { name: 'Plum Berry', hex: '#6b21a8' },
  { name: 'Mustard Gold', hex: '#d97706' },
  { name: 'Blush Rose', hex: '#ec4899' },
  { name: 'Sky Cyan', hex: '#0284c7' },
];

export interface ShirtCatalogEntry {
  id: ShirtStyleId;
  label: string;
  defaultColor: string;
  defaultAccent: string;
  defaultSleeves: Exclude<SleeveMode, 'auto'>;
  defaultFabric: Exclude<FabricMaterialId, 'auto'>;
}

export const SHIRT_CATALOG: ShirtCatalogEntry[] = [
  { id: 'none', label: 'None (Bare)', defaultColor: '#0d69ac', defaultAccent: '#f5cd30', defaultSleeves: 'short', defaultFabric: 'cotton' },
  { id: 'tshirt', label: 'Classic Tee', defaultColor: '#0d69ac', defaultAccent: '#f2f3f3', defaultSleeves: 'short', defaultFabric: 'cotton' },
  { id: 'hoodie', label: 'Pullover Hoodie', defaultColor: '#312e81', defaultAccent: '#38bdf8', defaultSleeves: 'long', defaultFabric: 'cotton' },
  { id: 'sweater', label: 'Knit Sweater', defaultColor: '#c28b59', defaultAccent: '#f8fafc', defaultSleeves: 'long', defaultFabric: 'knit' },
  { id: 'turtleneck', label: 'Turtleneck', defaultColor: '#1e293b', defaultAccent: '#94a3b8', defaultSleeves: 'long', defaultFabric: 'knit' },
  { id: 'buttonUp', label: 'Button-Up', defaultColor: '#f8fafc', defaultAccent: '#1d4ed8', defaultSleeves: 'long', defaultFabric: 'cotton' },
  { id: 'polo', label: 'Polo Shirt', defaultColor: '#0f766e', defaultAccent: '#f8fafc', defaultSleeves: 'short', defaultFabric: 'cotton' },
  { id: 'cropTop', label: 'Crop Top', defaultColor: '#ec4899', defaultAccent: '#f8fafc', defaultSleeves: 'short', defaultFabric: 'cotton' },
  { id: 'jacket', label: 'Moto Jacket', defaultColor: '#1e293b', defaultAccent: '#c4281c', defaultSleeves: 'long', defaultFabric: 'leather' },
  { id: 'varsity', label: 'Varsity Jacket', defaultColor: '#c4281c', defaultAccent: '#f2f3f3', defaultSleeves: 'long', defaultFabric: 'cotton' },
  { id: 'vest', label: 'Explorer Vest', defaultColor: '#da8541', defaultAccent: '#27462d', defaultSleeves: 'short', defaultFabric: 'cotton' },
  { id: 'tracksuit', label: 'Track Jacket', defaultColor: '#0f766e', defaultAccent: '#f2f3f3', defaultSleeves: 'long', defaultFabric: 'satin' },
  { id: 'suitCoat', label: 'Tailored Suit', defaultColor: '#1b2a35', defaultAccent: '#c4281c', defaultSleeves: 'long', defaultFabric: 'satin' },
  { id: 'knightTunic', label: 'Knight Tabard', defaultColor: '#0d69ac', defaultAccent: '#f5cd30', defaultSleeves: 'long', defaultFabric: 'armor' },
  { id: 'wizardRobe', label: 'Arcane Robe', defaultColor: '#4c1d95', defaultAccent: '#f5cd30', defaultSleeves: 'long', defaultFabric: 'satin' },
  { id: 'cyberSuit', label: 'Cyber Armor', defaultColor: '#1e293b', defaultAccent: '#00a2ff', defaultSleeves: 'long', defaultFabric: 'armor' },
];

export interface OuterwearCatalogEntry {
  id: OuterwearStyleId;
  label: string;
  description: string;
  defaultColor: string;
  defaultAccent: string;
  defaultFabric: Exclude<FabricMaterialId, 'auto'>;
  hasSleeves: boolean;
  supportsOpenToggle: boolean;
}

export const OUTERWEAR_CATALOG: OuterwearCatalogEntry[] = [
  { id: 'none', label: 'None', description: 'No outerwear layer', defaultColor: '#1e293b', defaultAccent: '#f8fafc', defaultFabric: 'cotton', hasSleeves: false, supportsOpenToggle: false },
  { id: 'pufferJacket', label: 'Puffer Jacket', description: 'Quilted baffle insulated streetwear puffer', defaultColor: '#1e293b', defaultAccent: '#38bdf8', defaultFabric: 'quilted', hasSleeves: true, supportsOpenToggle: true },
  { id: 'pufferVest', label: 'Puffer Vest', description: 'Sleeveless quilted body warmer over base top', defaultColor: '#b91c1c', defaultAccent: '#f8fafc', defaultFabric: 'quilted', hasSleeves: false, supportsOpenToggle: true },
  { id: 'cardigan', label: 'Knit Cardigan', description: 'Cozy layered shawl-collar knit sweater coat', defaultColor: '#d6cfc2', defaultAccent: '#78350f', defaultFabric: 'knit', hasSleeves: true, supportsOpenToggle: true },
  { id: 'denimJacket', label: 'Denim Jacket', description: 'Structured trucker jacket with brass rivets', defaultColor: '#1d4ed8', defaultAccent: '#f59e0b', defaultFabric: 'denim', hasSleeves: true, supportsOpenToggle: true },
  { id: 'trenchCoat', label: 'Trench Coat', description: 'Long belted overcoat with swaying coat tails', defaultColor: '#c28b59', defaultAccent: '#57371d', defaultFabric: 'cotton', hasSleeves: true, supportsOpenToggle: true },
  { id: 'bomberJacket', label: 'Bomber Jacket', description: 'Puffed flight jacket with striped ribbed trim', defaultColor: '#27462d', defaultAccent: '#f59e0b', defaultFabric: 'satin', hasSleeves: true, supportsOpenToggle: true },
  { id: 'blazer', label: 'Tailored Blazer', description: 'Structured notched-lapel blazer with pocket square', defaultColor: '#172554', defaultAccent: '#e2e8f0', defaultFabric: 'satin', hasSleeves: true, supportsOpenToggle: true },
  { id: 'hoodedParka', label: 'Hooded Parka', description: 'Faux-fur trimmed winter parka with swaying hem', defaultColor: '#334155', defaultAccent: '#e2d5c3', defaultFabric: 'cotton', hasSleeves: true, supportsOpenToggle: true },
  { id: 'overalls', label: 'Denim Overalls', description: 'Bib overalls with buckled shoulder straps', defaultColor: '#1d4ed8', defaultAccent: '#f59e0b', defaultFabric: 'denim', hasSleeves: false, supportsOpenToggle: false },
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
  defaultFabric: Exclude<FabricMaterialId, 'auto'>;
}

export const PANT_CATALOG: PantsCatalogEntry[] = [
  { id: 'none', label: 'None (Bare)', defaultColor: '#a4bd47', defaultAccent: '#f2f3f3', defaultFabric: 'cotton' },
  { id: 'jeans', label: 'Denim Jeans', defaultColor: '#1d4ed8', defaultAccent: '#f59e0b', defaultFabric: 'denim' },
  { id: 'flaredJeans', label: 'Flared Jeans', defaultColor: '#2563eb', defaultAccent: '#e2e8f0', defaultFabric: 'denim' },
  { id: 'baggyCargo', label: 'Baggy Cargo', defaultColor: '#3f4a3c', defaultAccent: '#a3a2a5', defaultFabric: 'cotton' },
  { id: 'cargo', label: 'Cargo Pants', defaultColor: '#27462d', defaultAccent: '#635f62', defaultFabric: 'cotton' },
  { id: 'joggers', label: 'Cuffed Joggers', defaultColor: '#334155', defaultAccent: '#f8fafc', defaultFabric: 'cotton' },
  { id: 'pleatedSkirt', label: 'Pleated Skirt', defaultColor: '#1e293b', defaultAccent: '#f472b6', defaultFabric: 'cotton' },
  { id: 'midiSkirt', label: 'Flared Skirt', defaultColor: '#6b21a8', defaultAccent: '#fde047', defaultFabric: 'satin' },
  { id: 'slacks', label: 'Dress Slacks', defaultColor: '#1b2a35', defaultAccent: '#64748b', defaultFabric: 'satin' },
  { id: 'shorts', label: 'Athletic Shorts', defaultColor: '#334155', defaultAccent: '#38bdf8', defaultFabric: 'cotton' },
  { id: 'trackPants', label: 'Track Pants', defaultColor: '#1e293b', defaultAccent: '#f2f3f3', defaultFabric: 'satin' },
  { id: 'knightGreaves', label: 'Armored Pants', defaultColor: '#475569', defaultAccent: '#94a3b8', defaultFabric: 'armor' },
  { id: 'cyberLeggings', label: 'Cyber Trousers', defaultColor: '#0f172a', defaultAccent: '#00a2ff', defaultFabric: 'armor' },
];

export interface FootwearCatalogEntry {
  id: FootwearId;
  label: string;
  defaultColor: string;
  defaultAccent: string;
}

export const FOOTWEAR_CATALOG: FootwearCatalogEntry[] = [
  { id: 'none', label: 'Bare / None', defaultColor: '#1e293b', defaultAccent: '#f8fafc' },
  { id: 'sneakers', label: 'Low Sneakers', defaultColor: '#1e293b', defaultAccent: '#f8fafc' },
  { id: 'highTops', label: 'High-Tops', defaultColor: '#b91c1c', defaultAccent: '#f8fafc' },
  { id: 'boots', label: 'Combat Boots', defaultColor: '#3b2416', defaultAccent: '#d97706' },
  { id: 'chelseaBoots', label: 'Chelsea Boots', defaultColor: '#1c1917', defaultAccent: '#57534e' },
  { id: 'platformShoes', label: 'Platforms', defaultColor: '#0f172a', defaultAccent: '#e2e8f0' },
  { id: 'loafers', label: 'Dress Loafers', defaultColor: '#451a03', defaultAccent: '#f59e0b' },
  { id: 'armoredBoots', label: 'Plate Sabatons', defaultColor: '#94a3b8', defaultAccent: '#f5cd30' },
  { id: 'sandals', label: 'Strappy Sandals', defaultColor: '#92400e', defaultAccent: '#fde68a' },
];

export const FABRIC_MATERIAL_OPTIONS: { id: FabricMaterialId; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'cotton', label: 'Cotton' },
  { id: 'denim', label: 'Denim' },
  { id: 'knit', label: 'Knit' },
  { id: 'leather', label: 'Leather' },
  { id: 'quilted', label: 'Quilted' },
  { id: 'satin', label: 'Satin' },
  { id: 'armor', label: 'Armor' },
];

export const CLOTHING_PATTERN_OPTIONS: { id: ClothingPatternId; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'plaid', label: 'Plaid' },
  { id: 'colorblock', label: 'Block' },
  { id: 'checker', label: 'Check' },
  { id: 'camo', label: 'Camo' },
  { id: 'argyle', label: 'Argyle' },
];

export const BELT_STYLE_OPTIONS: { id: BeltStyleId; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'none', label: 'None' },
  { id: 'leather', label: 'Leather' },
  { id: 'chain', label: 'Chain' },
  { id: 'sash', label: 'Sash' },
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
  {
    id: 'campusLayered',
    name: 'Campus Layered',
    description: 'Turtleneck under knit cardigan, plaid pleated skirt & platforms',
    bodyColors: {
      head: '#eab892',
      torso: '#eab892',
      leftArm: '#eab892',
      rightArm: '#eab892',
      leftLeg: '#eab892',
      rightLeg: '#eab892',
    },
    ornaments: {
      head: { id: 'none', color: '#1b2a35', accentColor: '#94a3b8' },
      hat: { id: 'none', color: '#1b2a35', accentColor: '#f2f3f3' },
      face: { id: 'smile', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'none', color: '#a3a2a5', accentColor: '#f5cd30' },
      back: { id: 'backpack', color: '#78350f', accentColor: '#f59e0b' },
      legs: { id: 'none', color: '#635f62', accentColor: '#f5cd30' },
    },
    hair: {
      styleId: 'wolfCut',
      primaryColor: '#3b2416',
      highlightColor: '#c28b59',
      highlightPattern: 'tips',
      volume: 1.05,
      bangsStyle: 'curtain',
      accessoryId: 'ribbonBow',
      accessoryColor: '#b91c1c',
      finish: 'silky',
    },
    clothing: {
      shirtId: 'turtleneck',
      shirtColor: '#f8fafc',
      shirtAccent: '#cbd5e1',
      sleeveMode: 'long',
      topFabric: 'knit',
      topPattern: 'solid',
      outerwearId: 'cardigan',
      outerwearColor: '#c28b59',
      outerwearAccent: '#57371d',
      outerwearFabric: 'knit',
      outerwearOpen: true,
      pantsId: 'pleatedSkirt',
      pantsColor: '#1e293b',
      pantsAccent: '#b91c1c',
      bottomFabric: 'cotton',
      bottomPattern: 'plaid',
      beltStyle: 'leather',
      footwearId: 'platformShoes',
      shoeColor: '#1c1917',
      shoeAccent: '#f8fafc',
    },
    faceConfig: {
      eyeStyle: 'expressive',
      browStyle: 'rounded',
      mouthStyle: 'openCavity',
      cheekStyle: 'blush',
      eyeColor: '#78350f',
      browColor: '#3b2416',
      mouthColor: '#1f2937',
      accentColor: '#fb7185',
      autoBlink: true,
      autoLipSync: true,
      gazeTarget: 'camera',
    },
    defaultHeldItems: {
      right: createEmptyHandState(),
      left: createEmptyHandState(),
    },
  },
  {
    id: 'streetPuffer',
    name: 'Street Puffer',
    description: 'Quilted puffer jacket over graphic tee, baggy cargos & high-tops',
    bodyColors: {
      head: '#cc8e69',
      torso: '#cc8e69',
      leftArm: '#cc8e69',
      rightArm: '#cc8e69',
      leftLeg: '#cc8e69',
      rightLeg: '#cc8e69',
    },
    ornaments: {
      head: { id: 'shades', color: '#0f172a', accentColor: '#38bdf8' },
      hat: { id: 'beanie', color: '#1e293b', accentColor: '#38bdf8' },
      face: { id: 'smirk', color: '#111827', accentColor: '#ffffff' },
      arm: { id: 'wristWatch', color: '#1e293b', accentColor: '#38bdf8' },
      back: { id: 'none', color: '#1e293b', accentColor: '#38bdf8' },
      legs: { id: 'none', color: '#635f62', accentColor: '#f5cd30' },
    },
    hair: {
      styleId: 'messyFluffy',
      primaryColor: '#181c24',
      highlightColor: '#38bdf8',
      highlightPattern: 'streaks',
      volume: 1.05,
      bangsStyle: 'wispy',
      accessoryId: 'none',
      finish: 'silky',
    },
    clothing: {
      shirtId: 'tshirt',
      shirtColor: '#f8fafc',
      shirtAccent: '#0284c7',
      sleeveMode: 'short',
      topFabric: 'cotton',
      topPattern: 'colorblock',
      outerwearId: 'pufferJacket',
      outerwearColor: '#0f172a',
      outerwearAccent: '#38bdf8',
      outerwearFabric: 'quilted',
      outerwearOpen: true,
      pantsId: 'baggyCargo',
      pantsColor: '#3f4a3c',
      pantsAccent: '#94a3b8',
      bottomFabric: 'cotton',
      bottomPattern: 'solid',
      beltStyle: 'chain',
      footwearId: 'highTops',
      shoeColor: '#b91c1c',
      shoeAccent: '#f8fafc',
    },
    faceConfig: {
      eyeStyle: 'hero',
      browStyle: 'bold',
      mouthStyle: 'smirk',
      cheekStyle: 'none',
      eyeColor: '#0284c7',
      browColor: '#181c24',
      mouthColor: '#181c24',
      accentColor: '#38bdf8',
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
    bangsStyle: 'auto',
    accessoryId: 'none',
    accessoryColor: '#f472b6',
    finish: 'silky',
    flowerAccessory: false,
  };
}

export function createDefaultClothingConfig(): ClothingConfig {
  return {
    shirtId: 'none',
    shirtColor: '#0d69ac',
    shirtAccent: '#f5cd30',
    sleeveMode: 'auto',
    topFabric: 'auto',
    topPattern: 'solid',
    outerwearId: 'none',
    outerwearColor: '#1e293b',
    outerwearAccent: '#f8fafc',
    outerwearFabric: 'auto',
    outerwearOpen: true,
    pantsId: 'none',
    pantsColor: '#1d4ed8',
    pantsAccent: '#f2f3f3',
    bottomFabric: 'auto',
    bottomPattern: 'solid',
    beltStyle: 'auto',
    footwearId: 'none',
    shoeColor: '#1e293b',
    shoeAccent: '#f8fafc',
  };
}

function normalizeHairConfig(raw: HairConfig): HairConfig {
  const accessoryId: HairAccessoryId =
    raw.accessoryId ?? (raw.flowerAccessory ? 'hibiscus' : 'none');
  const accessoryMeta = HAIR_ACCESSORY_CATALOG.find((a) => a.id === accessoryId);
  return {
    ...raw,
    bangsStyle: raw.bangsStyle ?? 'auto',
    accessoryId,
    accessoryColor: raw.accessoryColor ?? accessoryMeta?.defaultColor ?? '#f472b6',
    finish: raw.finish ?? 'silky',
    flowerAccessory: accessoryId === 'hibiscus',
  };
}

export function normalizeClothingConfig(raw: ClothingConfig): ClothingConfig {
  const fwMeta = FOOTWEAR_CATALOG.find((f) => f.id === raw.footwearId);
  const outerMeta = OUTERWEAR_CATALOG.find((o) => o.id === (raw.outerwearId ?? 'none'));
  return {
    ...raw,
    topFabric: raw.topFabric ?? 'auto',
    topPattern: raw.topPattern ?? 'solid',
    outerwearId: raw.outerwearId ?? 'none',
    outerwearColor: raw.outerwearColor ?? outerMeta?.defaultColor ?? '#1e293b',
    outerwearAccent: raw.outerwearAccent ?? outerMeta?.defaultAccent ?? '#f8fafc',
    outerwearFabric: raw.outerwearFabric ?? 'auto',
    outerwearOpen: raw.outerwearOpen ?? true,
    bottomFabric: raw.bottomFabric ?? 'auto',
    bottomPattern: raw.bottomPattern ?? 'solid',
    beltStyle: raw.beltStyle ?? 'auto',
    shoeColor: raw.shoeColor ?? fwMeta?.defaultColor ?? '#1e293b',
    shoeAccent: raw.shoeAccent ?? fwMeta?.defaultAccent ?? raw.pantsAccent ?? '#f8fafc',
  };
}

export function resolveActorHair(actor?: Partial<SceneActorConfig> | null): HairConfig {
  if (actor?.hair) {
    return normalizeHairConfig(actor.hair);
  }
  // Graceful legacy migration if an older project used hat === 'spiky'
  if (actor?.ornaments?.hat?.id === 'spiky') {
    return normalizeHairConfig({
      styleId: 'spiky',
      primaryColor: actor.ornaments.hat.color || '#4b2e1e',
      highlightColor: actor.ornaments.hat.accentColor || '#f59e0b',
      highlightPattern: 'none',
      volume: 1,
      flowerAccessory: false,
    });
  }
  const bundle = ROBLOX_AVATAR_BUNDLES.find((b) => b.id === actor?.bundleId);
  if (bundle) {
    return normalizeHairConfig(bundle.hair);
  }
  return createDefaultHairConfig();
}

export function resolveActorClothing(actor?: Partial<SceneActorConfig> | null): ClothingConfig {
  if (actor?.clothing) {
    return normalizeClothingConfig(actor.clothing);
  }
  const bundle = ROBLOX_AVATAR_BUNDLES.find((b) => b.id === actor?.bundleId);
  if (bundle) return normalizeClothingConfig(bundle.clothing);
  return createDefaultClothingConfig();
}

export const DEFAULT_ACCESSORY_FIT: AccessoryFit = {
  offsetY: 0,
  offsetZ: 0,
  tiltX: 0,
  tiltZ: 0,
  scale: 1,
};

export function normalizeAccessoryFit(fit?: Partial<AccessoryFit>): AccessoryFit {
  return {
    offsetY:
      typeof fit?.offsetY === 'number' && Number.isFinite(fit.offsetY)
        ? Math.max(-0.35, Math.min(0.35, fit.offsetY))
        : 0,
    offsetZ:
      typeof fit?.offsetZ === 'number' && Number.isFinite(fit.offsetZ)
        ? Math.max(-0.3, Math.min(0.3, fit.offsetZ))
        : 0,
    tiltX:
      typeof fit?.tiltX === 'number' && Number.isFinite(fit.tiltX)
        ? Math.max(-30, Math.min(30, fit.tiltX))
        : 0,
    tiltZ:
      typeof fit?.tiltZ === 'number' && Number.isFinite(fit.tiltZ)
        ? Math.max(-30, Math.min(30, fit.tiltZ))
        : 0,
    scale:
      typeof fit?.scale === 'number' && Number.isFinite(fit.scale)
        ? Math.max(0.75, Math.min(1.35, fit.scale))
        : 1,
  };
}

export function normalizeOrnaments(raw?: R6Ornaments | null): NormalizedR6Ornaments {
  const result = {} as NormalizedR6Ornaments;
  for (const slot of ORNAMENT_SLOTS) {
    const sel = raw?.[slot];
    const catalog = ORNAMENT_CATALOG[slot];
    const fallback = catalog[0];
    const id = typeof sel?.id === 'string' && sel.id ? sel.id : fallback.id;
    const meta = catalog.find((item) => item.id === id) ?? fallback;
    const hasCustomFit =
      sel?.fit &&
      ((sel.fit.offsetY ?? 0) !== 0 ||
        (sel.fit.offsetZ ?? 0) !== 0 ||
        (sel.fit.tiltX ?? 0) !== 0 ||
        (sel.fit.tiltZ ?? 0) !== 0 ||
        (sel.fit.scale ?? 1) !== 1);
    result[slot] = {
      id,
      color: typeof sel?.color === 'string' && sel.color ? sel.color : meta.defaultColor,
      accentColor:
        typeof sel?.accentColor === 'string' && sel.accentColor
          ? sel.accentColor
          : meta.defaultAccentColor,
      ...(hasCustomFit ? { fit: normalizeAccessoryFit(sel?.fit) } : {}),
    };
  }
  return result;
}

export function resolveActorOrnaments(
  actor?: Partial<SceneActorConfig> | null,
): NormalizedR6Ornaments {
  if (actor?.ornaments) {
    return normalizeOrnaments(actor.ornaments);
  }
  const bundle = ROBLOX_AVATAR_BUNDLES.find((b) => b.id === actor?.bundleId);
  if (bundle) {
    return normalizeOrnaments(bundle.ornaments);
  }
  return normalizeOrnaments(ROBLOX_AVATAR_BUNDLES[0].ornaments);
}

export function cloneBundle(bundleId: string): {
  bodyColors: R6BodyColors;
  ornaments: NormalizedR6Ornaments;
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
    ornaments: normalizeOrnaments(found.ornaments),
    hair: { ...found.hair },
    clothing: { ...found.clothing },
    faceConfig: { ...found.faceConfig },
    heldItems: cloneCharacterHeldItems(found.defaultHeldItems),
  };
}
