import {
  CharacterHeldItems,
  GripPreset,
  HandSlot,
  HeldHandItemState,
  ItemCategory,
  ItemId,
  PropCategory,
  PropKind,
  Vec3Tuple,
} from './types';

export const ITEM_CATEGORIES: ItemCategory[] = ['gear', 'scifiFantasy', 'props'];

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  gear: 'Classic Gears',
  scifiFantasy: 'Sci-Fi & Fantasy',
  props: 'Handheld Props',
};

export const GRIP_PRESET_LABELS: Record<GripPreset, string> = {
  standard: 'Standard',
  reverse: 'Reverse',
  forearm: 'Forearm',
  carry: 'Carry',
};

export const PROP_CATEGORIES: PropCategory[] = [
  'bedroom',
  'town',
  'furniture',
  'battle',
  'classic',
];

export const PROP_CATEGORY_LABELS: Record<PropCategory, string> = {
  bedroom: 'Bedroom & Indoor',
  town: 'Town & Street',
  furniture: 'Furniture & Set',
  battle: 'Battle & Adventure',
  classic: 'Classic Props',
};

export interface ItemCatalogEntry {
  id: ItemId;
  name: string;
  category: ItemCategory;
  description: string;
  defaultPrimaryColor: string;
  defaultAccentColor: string;
  defaultGripPreset: GripPreset;
  defaultScale: number;
  defaultRightOffset: Vec3Tuple;
  defaultRightRotDeg: Vec3Tuple;
  defaultLeftOffset: Vec3Tuple;
  defaultLeftRotDeg: Vec3Tuple;
}

export const BUILT_IN_ITEMS: ItemCatalogEntry[] = [
  {
    id: 'linkedSword',
    name: 'Linked Sword',
    category: 'gear',
    description: 'Classic steel Roblox dueling blade with chamfered crossguard.',
    defaultPrimaryColor: '#cbd5e1',
    defaultAccentColor: '#635f62',
    defaultGripPreset: 'standard',
    defaultScale: 1,
    defaultRightOffset: [0, 0, 0],
    defaultRightRotDeg: [0, 0, 0],
    defaultLeftOffset: [0, 0, 0],
    defaultLeftRotDeg: [0, 0, 0],
  },
  {
    id: 'laserBlaster',
    name: 'Laser Blaster',
    category: 'gear',
    description: 'Sci-fi stud blaster with plasma barrel and top reflex sight.',
    defaultPrimaryColor: '#0d69ac',
    defaultAccentColor: '#38bdf8',
    defaultGripPreset: 'standard',
    defaultScale: 1,
    defaultRightOffset: [0, 0.02, 0.06],
    defaultRightRotDeg: [0, 0, 0],
    defaultLeftOffset: [0, 0.02, 0.06],
    defaultLeftRotDeg: [0, 0, 0],
  },
  {
    id: 'speedCoil',
    name: 'Speed Coil',
    category: 'gear',
    description: 'Glowing electric sprint coil worn around the wrist and hand.',
    defaultPrimaryColor: '#0d69ac',
    defaultAccentColor: '#38bdf8',
    defaultGripPreset: 'carry',
    defaultScale: 1,
    defaultRightOffset: [0, 0.24, -0.18],
    defaultRightRotDeg: [90, 0, 0],
    defaultLeftOffset: [0, 0.24, -0.18],
    defaultLeftRotDeg: [90, 0, 0],
  },
  {
    id: 'gravityHammer',
    name: 'Gravity Hammer',
    category: 'gear',
    description: 'Heavy battle mallet with twin grav-plates and violet core.',
    defaultPrimaryColor: '#635f62',
    defaultAccentColor: '#a855f7',
    defaultGripPreset: 'standard',
    defaultScale: 1.05,
    defaultRightOffset: [0, 0, 0.04],
    defaultRightRotDeg: [0, 0, 0],
    defaultLeftOffset: [0, 0, 0.04],
    defaultLeftRotDeg: [0, 0, 0],
  },
  {
    id: 'heaterShield',
    name: 'Heater Shield',
    category: 'scifiFantasy',
    description: 'Beveled knight heater shield with embossed crest boss.',
    defaultPrimaryColor: '#0d69ac',
    defaultAccentColor: '#f5cd30',
    defaultGripPreset: 'forearm',
    defaultScale: 1,
    defaultRightOffset: [-0.24, 0.26, -0.18],
    defaultRightRotDeg: [0, -90, 0],
    defaultLeftOffset: [0.24, 0.26, -0.18],
    defaultLeftRotDeg: [0, 90, 0],
  },
  {
    id: 'arcaneStaff',
    name: 'Arcane Staff',
    category: 'scifiFantasy',
    description: 'Crowned wizard staff topped with a glowing crystal orb.',
    defaultPrimaryColor: '#6b327c',
    defaultAccentColor: '#38bdf8',
    defaultGripPreset: 'carry',
    defaultScale: 1,
    defaultRightOffset: [0, 0, 0.04],
    defaultRightRotDeg: [0, 0, 0],
    defaultLeftOffset: [0, 0, 0.04],
    defaultLeftRotDeg: [0, 0, 0],
  },
  {
    id: 'glowLantern',
    name: 'Glow Lantern',
    category: 'scifiFantasy',
    description: 'Wrought-iron lantern with warm amber flame core.',
    defaultPrimaryColor: '#475569',
    defaultAccentColor: '#fbbf24',
    defaultGripPreset: 'carry',
    defaultScale: 1,
    defaultRightOffset: [0, -0.04, 0.06],
    defaultRightRotDeg: [0, 0, 0],
    defaultLeftOffset: [0, -0.04, 0.06],
    defaultLeftRotDeg: [0, 0, 0],
  },
  {
    id: 'energyBlade',
    name: 'Energy Blade',
    category: 'scifiFantasy',
    description: 'Tech hilt projecting a bright dual-core plasma saber.',
    defaultPrimaryColor: '#1b2a35',
    defaultAccentColor: '#22d3ee',
    defaultGripPreset: 'standard',
    defaultScale: 1,
    defaultRightOffset: [0, 0, 0],
    defaultRightRotDeg: [0, 0, 0],
    defaultLeftOffset: [0, 0, 0],
    defaultLeftRotDeg: [0, 0, 0],
  },
  {
    id: 'holoScanner',
    name: 'Holo Scanner',
    category: 'scifiFantasy',
    description: 'Handheld reconnaissance scanner with glowing holo screen.',
    defaultPrimaryColor: '#a3a2a5',
    defaultAccentColor: '#10b981',
    defaultGripPreset: 'carry',
    defaultScale: 1,
    defaultRightOffset: [0, 0.04, 0.08],
    defaultRightRotDeg: [-18, 0, 0],
    defaultLeftOffset: [0, 0.04, 0.08],
    defaultLeftRotDeg: [-18, 0, 0],
  },
  {
    id: 'bloxyCola',
    name: 'Bloxy Cola',
    category: 'props',
    description: 'Classic refreshing Roblox cola can with silver rim.',
    defaultPrimaryColor: '#c4281c',
    defaultAccentColor: '#f5cd30',
    defaultGripPreset: 'carry',
    defaultScale: 1,
    defaultRightOffset: [0, 0.03, 0.02],
    defaultRightRotDeg: [0, 0, 0],
    defaultLeftOffset: [0, 0.03, 0.02],
    defaultLeftRotDeg: [0, 0, 0],
  },
  {
    id: 'pizzaSlice',
    name: 'Pizza Slice',
    category: 'props',
    description: 'Cheesy pepperoni slice with golden crust.',
    defaultPrimaryColor: '#f5cd30',
    defaultAccentColor: '#c4281c',
    defaultGripPreset: 'carry',
    defaultScale: 1,
    defaultRightOffset: [0, 0.02, 0.06],
    defaultRightRotDeg: [-8, 0, 0],
    defaultLeftOffset: [0, 0.02, 0.06],
    defaultLeftRotDeg: [-8, 0, 0],
  },
  {
    id: 'teamFlag',
    name: 'Team Banner',
    category: 'props',
    description: 'Handheld pennant flag on a brass-tipped pole.',
    defaultPrimaryColor: '#c4281c',
    defaultAccentColor: '#f5cd30',
    defaultGripPreset: 'carry',
    defaultScale: 1,
    defaultRightOffset: [0, 0, 0.04],
    defaultRightRotDeg: [10, 0, 0],
    defaultLeftOffset: [0, 0, 0.04],
    defaultLeftRotDeg: [10, 0, 0],
  },
];

export interface DualWieldComboPreset {
  id: string;
  label: string;
  rightItem: ItemId | 'none';
  leftItem: ItemId | 'none';
}

export const DUAL_WIELD_COMBOS: DualWieldComboPreset[] = [
  {
    id: 'knight-duel',
    label: 'Sword & Shield',
    rightItem: 'linkedSword',
    leftItem: 'heaterShield',
  },
  {
    id: 'dual-blasters',
    label: 'Dual Blasters',
    rightItem: 'laserBlaster',
    leftItem: 'laserBlaster',
  },
  {
    id: 'mage-explorer',
    label: 'Staff & Lantern',
    rightItem: 'arcaneStaff',
    leftItem: 'glowLantern',
  },
  {
    id: 'dual-sabers',
    label: 'Dual Energy Blades',
    rightItem: 'energyBlade',
    leftItem: 'energyBlade',
  },
  {
    id: 'lunch-break',
    label: 'Cola & Pizza',
    rightItem: 'bloxyCola',
    leftItem: 'pizzaSlice',
  },
  {
    id: 'scout-recon',
    label: 'Scanner & Coil',
    rightItem: 'holoScanner',
    leftItem: 'speedCoil',
  },
];

export interface PropCatalogEntry {
  kind: Exclude<PropKind, 'heldItem'>;
  name: string;
  category: PropCategory;
  description: string;
  defaultPrimaryColor: string;
  defaultAccentColor: string;
}

export const BUILT_IN_PROPS: PropCatalogEntry[] = [
  {
    kind: 'chest',
    name: 'Treasure Chest',
    category: 'battle',
    description: 'Studded timber chest with brass straps and golden glint.',
    defaultPrimaryColor: '#8a5a36',
    defaultAccentColor: '#f5cd30',
  },
  {
    kind: 'barrel',
    name: 'Wooden Barrel',
    category: 'furniture',
    description: 'Ribbed oak barrel banded with iron hoops.',
    defaultPrimaryColor: '#925c37',
    defaultAccentColor: '#635f62',
  },
  {
    kind: 'flag',
    name: 'Team Flag Stand',
    category: 'battle',
    description: 'Pedestal banner pole with waving team pennant.',
    defaultPrimaryColor: '#c4281c',
    defaultAccentColor: '#f5cd30',
  },
  {
    kind: 'bench',
    name: 'Park Bench',
    category: 'furniture',
    description: 'Slatted timber park bench with dark iron legs.',
    defaultPrimaryColor: '#a66b3c',
    defaultAccentColor: '#1b2a35',
  },
  {
    kind: 'targetDummy',
    name: 'Target Dummy',
    category: 'battle',
    description: 'Blocky R6 sparring dummy with chest bullseye.',
    defaultPrimaryColor: '#d9c39e',
    defaultAccentColor: '#c4281c',
  },
  {
    kind: 'campfire',
    name: 'Campfire Ring',
    category: 'furniture',
    description: 'River stones, crossed logs, and flickering ember flames.',
    defaultPrimaryColor: '#6b4226',
    defaultAccentColor: '#fb923c',
  },
  {
    kind: 'pedestal',
    name: 'Display Pedestal',
    category: 'furniture',
    description: 'Stepped stone column plinth for staging artifacts.',
    defaultPrimaryColor: '#cbd5e1',
    defaultAccentColor: '#f5cd30',
  },
  {
    kind: 'lanternPost',
    name: 'Street Lantern',
    category: 'furniture',
    description: 'Iron street post with suspended warm amber lantern.',
    defaultPrimaryColor: '#1b2a35',
    defaultAccentColor: '#fbbf24',
  },
  {
    kind: 'spawnpad',
    name: 'SpawnLocation Pad',
    category: 'classic',
    description: 'Classic Roblox spawn pad with crisp decal emblem.',
    defaultPrimaryColor: '#635f62',
    defaultAccentColor: '#f2f3f3',
  },
  {
    kind: 'crate',
    name: 'Studded Crates',
    category: 'classic',
    description: 'Stacked studded supply crates.',
    defaultPrimaryColor: '#8a5a36',
    defaultAccentColor: '#da8541',
  },
  {
    kind: 'tree',
    name: 'Classic Roblox Tree',
    category: 'classic',
    description: 'Blocky trunk with layered foliage canopy.',
    defaultPrimaryColor: '#6b4226',
    defaultAccentColor: '#27462d',
  },
  {
    kind: 'speeder',
    name: 'Brick Speeder',
    category: 'classic',
    description: 'Hovering classic Roblox jet speeder.',
    defaultPrimaryColor: '#0d69ac',
    defaultAccentColor: '#f5cd30',
  },
  {
    kind: 'gamerBed',
    name: 'Gamer Bed',
    category: 'bedroom',
    description: 'Twin gamer bed with cozy duvet, pillows, and RGB underglow.',
    defaultPrimaryColor: '#1d4ed8',
    defaultAccentColor: '#38bdf8',
  },
  {
    kind: 'pcDesk',
    name: 'RGB PC Desk',
    category: 'bedroom',
    description: 'Dual-monitor gaming desk with RGB tower and racing chair.',
    defaultPrimaryColor: '#2b2e35',
    defaultAccentColor: '#a855f7',
  },
  {
    kind: 'areaRug',
    name: 'Area Rug',
    category: 'bedroom',
    description: 'Woven geometric bedroom floor rug.',
    defaultPrimaryColor: '#312e81',
    defaultAccentColor: '#38bdf8',
  },
  {
    kind: 'bookshelf',
    name: 'Bookshelf',
    category: 'bedroom',
    description: 'Four-tier wooden shelf stocked with books and collectibles.',
    defaultPrimaryColor: '#7c4a2d',
    defaultAccentColor: '#38bdf8',
  },
  {
    kind: 'suburbanHouse',
    name: 'Town House',
    category: 'town',
    description: 'Two-story Robloxian neighborhood house with porch and chimney.',
    defaultPrimaryColor: '#e2e8f0',
    defaultAccentColor: '#b91c1c',
  },
  {
    kind: 'picketFence',
    name: 'Picket Fence',
    category: 'town',
    description: 'Classic white neighborhood picket fence section.',
    defaultPrimaryColor: '#f8fafc',
    defaultAccentColor: '#cbd5e1',
  },
  {
    kind: 'streetLamp',
    name: 'Street Lamp',
    category: 'town',
    description: 'Neighborhood cast-iron pole with glowing frosted globe.',
    defaultPrimaryColor: '#1b2a35',
    defaultAccentColor: '#fef08a',
  },
  {
    kind: 'mailbox',
    name: 'Curb Mailbox',
    category: 'town',
    description: 'Classic roadside mailbox with raised signal flag.',
    defaultPrimaryColor: '#0d69ac',
    defaultAccentColor: '#c4281c',
  },
];

const VALID_ITEM_ID_SET = new Set<string>(BUILT_IN_ITEMS.map((i) => i.id));
const VALID_PROP_KIND_SET = new Set<string>([
  ...BUILT_IN_PROPS.map((p) => p.kind),
  'heldItem',
]);

export function isValidItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && VALID_ITEM_ID_SET.has(value);
}

export function isValidPropKind(value: unknown): value is PropKind {
  return typeof value === 'string' && VALID_PROP_KIND_SET.has(value);
}

export function getItemMeta(itemId: ItemId | 'none' | undefined): ItemCatalogEntry | null {
  if (!itemId || itemId === 'none') return null;
  return BUILT_IN_ITEMS.find((i) => i.id === itemId) ?? null;
}

export function getPropMeta(kind: PropKind | undefined): PropCatalogEntry | null {
  if (!kind || kind === 'heldItem') return null;
  return BUILT_IN_PROPS.find((p) => p.kind === kind) ?? null;
}

export function createEmptyHandState(): HeldHandItemState {
  return {
    itemId: 'none',
    primaryColor: '#cbd5e1',
    accentColor: '#635f62',
    positionOffset: [0, 0, 0],
    rotationDeg: [0, 0, 0],
    scale: 1,
    gripPreset: 'standard',
  };
}

export function createEmptyCharacterHeldItems(): CharacterHeldItems {
  return {
    right: createEmptyHandState(),
    left: createEmptyHandState(),
  };
}

export function cloneHandItemState(state: HeldHandItemState): HeldHandItemState {
  return {
    ...state,
    positionOffset: [...state.positionOffset] as Vec3Tuple,
    rotationDeg: [...state.rotationDeg] as Vec3Tuple,
  };
}

export function cloneCharacterHeldItems(items: CharacterHeldItems): CharacterHeldItems {
  return {
    right: cloneHandItemState(items.right),
    left: cloneHandItemState(items.left),
  };
}

export function createDefaultHandStateForItem(
  itemId: ItemId | 'none',
  hand: HandSlot,
  overrides?: Partial<Pick<HeldHandItemState, 'primaryColor' | 'accentColor' | 'scale'>>,
): HeldHandItemState {
  if (itemId === 'none') {
    return createEmptyHandState();
  }
  const meta = getItemMeta(itemId) ?? BUILT_IN_ITEMS[0];
  const offset = hand === 'right' ? meta.defaultRightOffset : meta.defaultLeftOffset;
  const rot = hand === 'right' ? meta.defaultRightRotDeg : meta.defaultLeftRotDeg;
  return {
    itemId: meta.id,
    primaryColor: overrides?.primaryColor ?? meta.defaultPrimaryColor,
    accentColor: overrides?.accentColor ?? meta.defaultAccentColor,
    positionOffset: [...offset] as Vec3Tuple,
    rotationDeg: [...rot] as Vec3Tuple,
    scale: overrides?.scale ?? meta.defaultScale,
    gripPreset: meta.defaultGripPreset,
  };
}

export function applyGripPresetToHandState(
  state: HeldHandItemState,
  preset: GripPreset,
  hand: HandSlot,
): HeldHandItemState {
  if (state.itemId === 'none') {
    return { ...cloneHandItemState(state), gripPreset: preset };
  }
  const base = createDefaultHandStateForItem(state.itemId, hand, {
    primaryColor: state.primaryColor,
    accentColor: state.accentColor,
    scale: state.scale,
  });

  if (preset === 'standard') {
    return {
      ...base,
      positionOffset: [0, 0, 0],
      rotationDeg: [0, 0, 0],
      gripPreset: 'standard',
    };
  }
  if (preset === 'reverse') {
    return {
      ...base,
      positionOffset: [0, 0.04, -0.04],
      rotationDeg: [180, 0, 0],
      gripPreset: 'reverse',
    };
  }
  if (preset === 'forearm') {
    const side = hand === 'right' ? -1 : 1;
    return {
      ...base,
      positionOffset: [side * 0.24, 0.26, -0.18],
      rotationDeg: [0, side * 90, 0],
      gripPreset: 'forearm',
    };
  }
  // 'carry'
  return {
    ...base,
    gripPreset: 'carry',
  };
}

export function formatHeldItemsSummary(items: CharacterHeldItems): string {
  const rMeta = getItemMeta(items.right.itemId);
  const lMeta = getItemMeta(items.left.itemId);
  if (rMeta && lMeta) {
    if (rMeta.id === lMeta.id) {
      return `Dual ${rMeta.name}`;
    }
    return `R: ${rMeta.name} · L: ${lMeta.name}`;
  }
  if (rMeta) return `R: ${rMeta.name}`;
  if (lMeta) return `L: ${lMeta.name}`;
  return 'Empty Hands';
}
