import {
  AnimationProject,
  BuiltInMapId,
  EnvironmentId,
  LightingMood,
  MAP_CATEGORIES,
  MapBaseplateConfig,
  MapCategory,
  MapDefinition,
  MapLightingPreset,
  MapModuleInstance,
  MapModuleKind,
  MapPathStyle,
  MapPerimeterStyle,
  Vec3Tuple,
} from './types';

const CUSTOM_MAPS_STORAGE_KEY = 'stagecraft3d.customMaps.v1';

export interface MapModuleCatalogEntry {
  kind: MapModuleKind;
  label: string;
  shortDesc: string;
  defaultPrimary: string;
  defaultAccent: string;
  defaultScale: number;
}

export const MAP_MODULE_CATALOG: MapModuleCatalogEntry[] = [
  {
    kind: 'tower',
    label: 'Watchtower',
    shortDesc: 'Stepped brick battlements & parapet',
    defaultPrimary: '#0d69ac',
    defaultAccent: '#a3a2a5',
    defaultScale: 1,
  },
  {
    kind: 'fortWall',
    label: 'Fort Wall',
    shortDesc: 'Crenellated bastion & corner rampart',
    defaultPrimary: '#c4281c',
    defaultAccent: '#635f62',
    defaultScale: 1,
  },
  {
    kind: 'archBridge',
    label: 'Arch Bridge',
    shortDesc: 'Twin stone pillars with deck span',
    defaultPrimary: '#635f62',
    defaultAccent: '#f5cd30',
    defaultScale: 1,
  },
  {
    kind: 'shopFront',
    label: 'Shop Building',
    shortDesc: 'Classic town facade, awning & glass',
    defaultPrimary: '#f5cd30',
    defaultAccent: '#c4281c',
    defaultScale: 1,
  },
  {
    kind: 'pillarGate',
    label: 'Torii / Gate',
    shortDesc: 'Twin ceremonial columns & lintel',
    defaultPrimary: '#b91c1c',
    defaultAccent: '#1e293b',
    defaultScale: 1,
  },
  {
    kind: 'rampStairs',
    label: 'Stepped Ramp',
    shortDesc: '4-tier brick ascent platform',
    defaultPrimary: '#da8541',
    defaultAccent: '#a3a2a5',
    defaultScale: 1,
  },
  {
    kind: 'spawnPad',
    label: 'Spawn Pad',
    shortDesc: 'Classic Roblox spawn decal pad',
    defaultPrimary: '#635f62',
    defaultAccent: '#00a2ff',
    defaultScale: 1,
  },
  {
    kind: 'treeGrove',
    label: 'Blocky Tree',
    shortDesc: 'Multi-tier studded canopy & trunk',
    defaultPrimary: '#3a7d34',
    defaultAccent: '#6b4226',
    defaultScale: 1,
  },
  {
    kind: 'waterPool',
    label: 'Fountain Pool',
    shortDesc: 'Stone basin with tiered water spout',
    defaultPrimary: '#635f62',
    defaultAccent: '#00a2ff',
    defaultScale: 1,
  },
  {
    kind: 'neonBeacon',
    label: 'Neon Beacon',
    shortDesc: 'Sci-fi pylon with emissive energy core',
    defaultPrimary: '#1e293b',
    defaultAccent: '#38bdf8',
    defaultScale: 1,
  },
  {
    kind: 'rockOutcrop',
    label: 'Rock Outcrop',
    shortDesc: 'Clustered faceted boulders & ridge',
    defaultPrimary: '#64748b',
    defaultAccent: '#475569',
    defaultScale: 1,
  },
  {
    kind: 'crateCluster',
    label: 'Crate Stack',
    shortDesc: 'Banded cargo crates & hazard trim',
    defaultPrimary: '#b45309',
    defaultAccent: '#f5cd30',
    defaultScale: 1,
  },
  {
    kind: 'gamerBed',
    label: 'Gamer Bed',
    shortDesc: 'Twin bed with duvet, pillows & RGB trim',
    defaultPrimary: '#1d4ed8',
    defaultAccent: '#38bdf8',
    defaultScale: 1,
  },
  {
    kind: 'pcDesk',
    label: 'RGB PC Desk',
    shortDesc: 'Dual-monitor setup, RGB tower & chair',
    defaultPrimary: '#2b2e35',
    defaultAccent: '#a855f7',
    defaultScale: 1,
  },
  {
    kind: 'areaRug',
    label: 'Area Rug',
    shortDesc: 'Woven geometric bedroom floor rug',
    defaultPrimary: '#312e81',
    defaultAccent: '#38bdf8',
    defaultScale: 1,
  },
  {
    kind: 'bookshelf',
    label: 'Bookshelf',
    shortDesc: '4-tier shelf with books, plant & cube lamp',
    defaultPrimary: '#7c4a2d',
    defaultAccent: '#38bdf8',
    defaultScale: 1,
  },
  {
    kind: 'suburbanHouse',
    label: 'Town House',
    shortDesc: 'Two-story home with porch & gable roof',
    defaultPrimary: '#e2e8f0',
    defaultAccent: '#b91c1c',
    defaultScale: 1,
  },
  {
    kind: 'picketFence',
    label: 'Picket Fence',
    shortDesc: 'Classic neighborhood white picket fence',
    defaultPrimary: '#f8fafc',
    defaultAccent: '#cbd5e1',
    defaultScale: 1,
  },
  {
    kind: 'streetLamp',
    label: 'Street Lamp',
    shortDesc: 'Cast-iron neighborhood globe lamp post',
    defaultPrimary: '#1b2a35',
    defaultAccent: '#fef08a',
    defaultScale: 1,
  },
];

export const BUILT_IN_MAPS: MapDefinition[] = [
  {
    id: 'map_crossroads',
    name: 'Crossroads Baseplate',
    category: 'arena',
    builtIn: true,
    builtInSourceId: 'crossroads',
    description:
      'Classic Brick Battle crossroads with red battlements, blue watchtower, archway bridge, and spawn pads.',
    recommendedLighting: {
      mood: 'noon',
      sunAzimuth: 44,
      sunElevation: 56,
      keyIntensity: 2.4,
      rimIntensity: 1.1,
      ambientIntensity: 0.95,
      exposure: 1.06,
    },
    baseplate: {
      size: 36,
      groundColor: '#4b974b',
      trimColor: '#a3a2a5',
      pathStyle: 'cross',
      studDensity: 1.45,
      perimeter: 'trees',
    },
    modules: [
      {
        id: 'cr_fort',
        kind: 'fortWall',
        label: 'Red Team Fort',
        position: [-7.2, 0, -6.8],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#c4281c',
        accentColor: '#635f62',
      },
      {
        id: 'cr_tower',
        kind: 'tower',
        label: 'Blue Watchtower',
        position: [7.4, 0, -6.8],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#0d69ac',
        accentColor: '#a3a2a5',
      },
      {
        id: 'cr_arch',
        kind: 'archBridge',
        label: 'Truss Archway',
        position: [0, 0, -9.8],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#635f62',
        accentColor: '#f5cd30',
      },
      {
        id: 'cr_ramp',
        kind: 'rampStairs',
        label: 'Brick Ramp',
        position: [-7.0, 0, 5.5],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#da8541',
        accentColor: '#a3a2a5',
      },
    ],
    suggestedCamera: {
      position: [-5.2, 3.2, 6.0],
      target: [0, 1.3, 0],
      fov: 45,
    },
  },
  {
    id: 'map_town',
    name: 'Blocky Town Plaza',
    category: 'town',
    builtIn: true,
    builtInSourceId: 'town',
    description:
      'Cobblestone town square framed by shop fronts, a tiered fountain, benches, and warm street lanterns.',
    recommendedLighting: {
      mood: 'sunset',
      sunAzimuth: 72,
      sunElevation: 32,
      keyIntensity: 2.5,
      rimIntensity: 1.2,
      ambientIntensity: 0.9,
      exposure: 1.08,
    },
    baseplate: {
      size: 36,
      groundColor: '#5b9e4b',
      trimColor: '#d4d4d8',
      pathStyle: 'plaza',
      studDensity: 1.3,
      perimeter: 'trees',
    },
    modules: [
      {
        id: 'tw_fountain',
        kind: 'waterPool',
        label: 'Plaza Fountain',
        position: [0, 0, -4.4],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#635f62',
        accentColor: '#00a2ff',
      },
      {
        id: 'tw_shop_l',
        kind: 'shopFront',
        label: 'Corner Bakery',
        position: [-7.6, 0, -4.5],
        rotationYDeg: 10,
        scale: 1,
        primaryColor: '#f5cd30',
        accentColor: '#c4281c',
      },
      {
        id: 'tw_shop_r',
        kind: 'shopFront',
        label: 'Brick Bank',
        position: [7.8, 0, -4.2],
        rotationYDeg: -10,
        scale: 1.05,
        primaryColor: '#0d69ac',
        accentColor: '#f2f3f3',
      },
    ],
    suggestedCamera: {
      position: [0.4, 2.2, 5.8],
      target: [0.1, 1.3, 0.4],
      fov: 45,
    },
  },
  {
    id: 'map_robloxian_town',
    name: 'Robloxian Town',
    category: 'town',
    builtIn: true,
    builtInSourceId: 'robloxianTown',
    description:
      'Classic Robloxian residential block with pitched-roof homes, main street crosswalk, picket fences, corner café, and street lamps.',
    recommendedLighting: {
      mood: 'noon',
      sunAzimuth: 48,
      sunElevation: 52,
      keyIntensity: 2.45,
      rimIntensity: 1.15,
      ambientIntensity: 0.98,
      exposure: 1.06,
    },
    baseplate: {
      size: 44,
      groundColor: '#569c46',
      trimColor: '#e2e8f0',
      pathStyle: 'street',
      studDensity: 1.35,
      perimeter: 'picketFence',
    },
    modules: [
      {
        id: 'rt_house_l',
        kind: 'suburbanHouse',
        label: 'Red Roof Home',
        position: [-9.2, 0, -5.8],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#f1f5f9',
        accentColor: '#c4281c',
      },
      {
        id: 'rt_house_c',
        kind: 'suburbanHouse',
        label: 'Sunny Manor',
        position: [-1.4, 0, -6.2],
        rotationYDeg: 0,
        scale: 1.04,
        primaryColor: '#fde68a',
        accentColor: '#1d4ed8',
      },
      {
        id: 'rt_cafe_r',
        kind: 'shopFront',
        label: 'Neighborhood Cafe',
        position: [7.6, 0, -5.8],
        rotationYDeg: -6,
        scale: 1,
        primaryColor: '#f5cd30',
        accentColor: '#c4281c',
      },
      {
        id: 'rt_house_south',
        kind: 'suburbanHouse',
        label: 'Teal Cottage',
        position: [10.4, 0, 8.8],
        rotationYDeg: 180,
        scale: 0.96,
        primaryColor: '#bae6fd',
        accentColor: '#334155',
      },
      {
        id: 'rt_fence_l',
        kind: 'picketFence',
        label: 'West Yard Fence',
        position: [-9.2, 0, -1.6],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#f8fafc',
        accentColor: '#cbd5e1',
      },
      {
        id: 'rt_fence_c',
        kind: 'picketFence',
        label: 'Center Yard Fence',
        position: [-4.6, 0, -1.6],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#f8fafc',
        accentColor: '#cbd5e1',
      },
      {
        id: 'rt_lamp_l',
        kind: 'streetLamp',
        label: 'West Street Lamp',
        position: [-5.4, 0, 0.1],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#1b2a35',
        accentColor: '#fef08a',
      },
      {
        id: 'rt_lamp_r',
        kind: 'streetLamp',
        label: 'East Street Lamp',
        position: [5.4, 0, 0.1],
        rotationYDeg: 0,
        scale: 1,
        primaryColor: '#1b2a35',
        accentColor: '#fef08a',
      },
      {
        id: 'rt_tree_park',
        kind: 'treeGrove',
        label: 'Corner Oak',
        position: [-14.2, 0, 6.2],
        rotationYDeg: 0,
        scale: 1.15,
        primaryColor: '#3a7d34',
        accentColor: '#6b4226',
      },
    ],
    suggestedCamera: {
      position: [1.6, 2.7, 7.6],
      target: [0, 1.35, -0.5],
      fov: 45,
    },
  },
  {
    id: 'map_cozy_bedroom',
    name: 'Cozy Gamer Bedroom',
    category: 'interior',
    builtIn: true,
    builtInSourceId: 'cozyBedroom',
    description:
      'Open-corner cutaway gamer bedroom with hardwood planks, RGB dual-monitor PC desk, twin gamer bed, bookshelf, and woven rug.',
    recommendedLighting: {
      mood: 'sunset',
      sunAzimuth: 42,
      sunElevation: 48,
      keyIntensity: 2.25,
      rimIntensity: 1.35,
      ambientIntensity: 1.05,
      exposure: 1.08,
    },
    baseplate: {
      size: 14,
      groundColor: '#8b5a3c',
      trimColor: '#312e81',
      pathStyle: 'hardwood',
      studDensity: 1.25,
      perimeter: 'bedroomCorner',
    },
    modules: [
      {
        id: 'br_bed',
        kind: 'gamerBed',
        label: 'Gamer Bed',
        position: [-4.1, 0, -2.8],
        rotationYDeg: 90,
        scale: 1.0,
        primaryColor: '#1d4ed8',
        accentColor: '#38bdf8',
      },
      {
        id: 'br_desk',
        kind: 'pcDesk',
        label: 'RGB PC Desk',
        position: [2.8, 0, -3.9],
        rotationYDeg: 0,
        scale: 1.0,
        primaryColor: '#2b2e35',
        accentColor: '#a855f7',
      },
      {
        id: 'br_shelf',
        kind: 'bookshelf',
        label: 'Collectible Shelf',
        position: [-5.6, 0, 1.8],
        rotationYDeg: 90,
        scale: 1.0,
        primaryColor: '#7c4a2d',
        accentColor: '#38bdf8',
      },
      {
        id: 'br_rug',
        kind: 'areaRug',
        label: 'Center Area Rug',
        position: [-0.2, 0, 0.7],
        rotationYDeg: 0,
        scale: 1.25,
        primaryColor: '#312e81',
        accentColor: '#38bdf8',
      },
    ],
    suggestedCamera: {
      position: [4.2, 2.5, 5.2],
      target: [-0.3, 1.2, -0.8],
      fov: 45,
    },
  },
  {
    id: 'map_sky_obby',
    name: 'Skyward Obby Citadel',
    category: 'arena',
    builtIn: true,
    builtInSourceId: 'skyObby',
    description:
      'Floating high-altitude brick course with rainbow checkpoint arches, neon jump pads, and stepped towers.',
    recommendedLighting: {
      mood: 'noon',
      sunAzimuth: 28,
      sunElevation: 62,
      keyIntensity: 2.6,
      rimIntensity: 1.35,
      ambientIntensity: 1.0,
      exposure: 1.08,
    },
    baseplate: {
      size: 34,
      groundColor: '#e2e8f0',
      trimColor: '#38bdf8',
      pathStyle: 'runway',
      studDensity: 1.35,
      perimeter: 'neonRim',
    },
    modules: [
      {
        id: 'ob_pad',
        kind: 'spawnPad',
        label: 'Start Pad',
        position: [-5.5, 0, 2.2],
        rotationYDeg: 0,
        scale: 1.1,
        primaryColor: '#334155',
        accentColor: '#22c55e',
      },
      {
        id: 'ob_ramp_1',
        kind: 'rampStairs',
        label: 'Sky Ascent',
        position: [-2.2, 0, -4.2],
        rotationYDeg: 90,
        scale: 1.05,
        primaryColor: '#f59e0b',
        accentColor: '#fef08a',
      },
      {
        id: 'ob_arch',
        kind: 'archBridge',
        label: 'Goal Gate',
        position: [4.8, 0, -5.6],
        rotationYDeg: 0,
        scale: 1.05,
        primaryColor: '#3b82f6',
        accentColor: '#f43f5e',
      },
      {
        id: 'ob_tower',
        kind: 'tower',
        label: 'Summit Spire',
        position: [8.4, 0, -7.2],
        rotationYDeg: 0,
        scale: 0.95,
        primaryColor: '#f8fafc',
        accentColor: '#00a2ff',
      },
    ],
    suggestedCamera: {
      position: [-4.6, 3.0, 6.2],
      target: [0.5, 1.4, -1.2],
      fov: 46,
    },
  },
  {
    id: 'map_lunar_outpost',
    name: 'Lunar Brick Outpost',
    category: 'scifi',
    builtIn: true,
    builtInSourceId: 'lunarOutpost',
    description:
      'Cratered basalt frontier lit by cyan plasma beacons, cargo stacks, and an orbital landing pad.',
    recommendedLighting: {
      mood: 'midnight',
      sunAzimuth: 120,
      sunElevation: 38,
      keyIntensity: 2.1,
      rimIntensity: 1.65,
      ambientIntensity: 0.82,
      exposure: 1.12,
    },
    baseplate: {
      size: 40,
      groundColor: '#334155',
      trimColor: '#0ea5e9',
      pathStyle: 'runway',
      studDensity: 1.4,
      perimeter: 'rocks',
    },
    modules: [
      {
        id: 'ln_beacon_l',
        kind: 'neonBeacon',
        label: 'Alpha Beacon',
        position: [-5.4, 0, -4.4],
        rotationYDeg: 0,
        scale: 1.1,
        primaryColor: '#1e293b',
        accentColor: '#38bdf8',
      },
      {
        id: 'ln_beacon_r',
        kind: 'neonBeacon',
        label: 'Beta Beacon',
        position: [5.4, 0, -4.4],
        rotationYDeg: 0,
        scale: 1.1,
        primaryColor: '#1e293b',
        accentColor: '#a855f7',
      },
      {
        id: 'ln_crates',
        kind: 'crateCluster',
        label: 'Supply Cargo',
        position: [-3.8, 0, 2.4],
        rotationYDeg: 25,
        scale: 1.0,
        primaryColor: '#475569',
        accentColor: '#38bdf8',
      },
      {
        id: 'ln_rocks',
        kind: 'rockOutcrop',
        label: 'Basalt Ridge',
        position: [6.8, 0, -1.5],
        rotationYDeg: -30,
        scale: 1.25,
        primaryColor: '#475569',
        accentColor: '#1e293b',
      },
    ],
    suggestedCamera: {
      position: [4.8, 2.5, 6.0],
      target: [0, 1.35, -0.5],
      fov: 44,
    },
  },
  {
    id: 'map_dojo_courtyard',
    name: 'Bamboo Dojo Courtyard',
    category: 'nature',
    builtIn: true,
    builtInSourceId: 'dojoCourtyard',
    description:
      'Serene crimson gatehouse and stone training court bordered by koi reflection water and terraced groves.',
    recommendedLighting: {
      mood: 'sunset',
      sunAzimuth: 52,
      sunElevation: 26,
      keyIntensity: 2.3,
      rimIntensity: 1.25,
      ambientIntensity: 0.92,
      exposure: 1.06,
    },
    baseplate: {
      size: 38,
      groundColor: '#567d46',
      trimColor: '#d6c7a9',
      pathStyle: 'plaza',
      studDensity: 1.35,
      perimeter: 'trees',
    },
    modules: [
      {
        id: 'dj_gate',
        kind: 'pillarGate',
        label: 'Crimson Gate',
        position: [0, 0, -6.2],
        rotationYDeg: 0,
        scale: 1.15,
        primaryColor: '#b91c1c',
        accentColor: '#1e293b',
      },
      {
        id: 'dj_pool',
        kind: 'waterPool',
        label: 'Koi Basin',
        position: [-5.6, 0, -3.5],
        rotationYDeg: 0,
        scale: 0.9,
        primaryColor: '#78716c',
        accentColor: '#0284c7',
      },
      {
        id: 'dj_rocks',
        kind: 'rockOutcrop',
        label: 'Zen Stones',
        position: [5.8, 0, -3.4],
        rotationYDeg: 18,
        scale: 1.05,
        primaryColor: '#78716c',
        accentColor: '#57534e',
      },
      {
        id: 'dj_tree',
        kind: 'treeGrove',
        label: 'Courtyard Pine',
        position: [7.6, 0, 2.8],
        rotationYDeg: 0,
        scale: 1.15,
        primaryColor: '#2d6a4f',
        accentColor: '#5c3a21',
      },
    ],
    suggestedCamera: {
      position: [0.2, 2.1, 6.2],
      target: [0, 1.3, -0.5],
      fov: 43,
    },
  },
];

export function isBuiltInMapId(val: unknown): val is BuiltInMapId {
  return (
    val === 'crossroads' ||
    val === 'town' ||
    val === 'robloxianTown' ||
    val === 'cozyBedroom' ||
    val === 'skyObby' ||
    val === 'lunarOutpost' ||
    val === 'dojoCourtyard'
  );
}

export function getBuiltInMapByEnv(env: BuiltInMapId): MapDefinition {
  return (
    BUILT_IN_MAPS.find((m) => m.builtInSourceId === env) ?? BUILT_IN_MAPS[0]
  );
}

export function getActiveMapLabel(project: AnimationProject): string {
  if (project.environment === 'custom' && project.customMap) {
    return project.customMap.name;
  }
  if (project.environment !== 'custom') {
    return getBuiltInMapByEnv(project.environment).name;
  }
  return 'Custom Map';
}

export function getActiveMapSignature(
  env: EnvironmentId,
  customMap?: MapDefinition,
): string {
  if (env !== 'custom') {
    return `builtin:${env}`;
  }
  if (!customMap) {
    return 'builtin:crossroads';
  }
  return `custom:${JSON.stringify({
    baseplate: customMap.baseplate,
    modules: customMap.modules,
  })}`;
}

export function cloneMapForBuilder(source: MapDefinition): MapDefinition {
  return {
    id: `map_custom_${Date.now()}`,
    name: source.builtIn ? `${source.name} Remix` : `${source.name} Copy`,
    category: source.builtIn ? 'custom' : source.category,
    builtIn: false,
    description: source.description,
    recommendedLighting: { ...source.recommendedLighting },
    baseplate: { ...source.baseplate },
    modules: source.modules.map((m, idx) => ({
      ...m,
      id: `mod_${Date.now()}_${idx}`,
      position: [...m.position] as Vec3Tuple,
    })),
    suggestedCamera: source.suggestedCamera
      ? {
          position: [...source.suggestedCamera.position] as Vec3Tuple,
          target: [...source.suggestedCamera.target] as Vec3Tuple,
          fov: source.suggestedCamera.fov,
        }
      : undefined,
  };
}

export function createBlankCustomMap(name = 'Untitled Brick Stage'): MapDefinition {
  return {
    id: `map_custom_${Date.now()}`,
    name,
    category: 'custom',
    builtIn: false,
    description: 'Custom modular brick stage built in Stagecraft 3D.',
    recommendedLighting: {
      mood: 'noon',
      sunAzimuth: 44,
      sunElevation: 56,
      keyIntensity: 2.4,
      rimIntensity: 1.1,
      ambientIntensity: 0.95,
      exposure: 1.06,
    },
    baseplate: {
      size: 36,
      groundColor: '#4b974b',
      trimColor: '#a3a2a5',
      pathStyle: 'plaza',
      studDensity: 1.4,
      perimeter: 'trees',
    },
    modules: [
      createModuleInstance('spawnPad', 0),
    ],
    suggestedCamera: {
      position: [4.2, 2.6, 5.6],
      target: [0, 1.3, 0],
      fov: 45,
    },
  };
}

export function createModuleInstance(
  kind: MapModuleKind,
  indexHint = 0,
): MapModuleInstance {
  const spec =
    MAP_MODULE_CATALOG.find((e) => e.kind === kind) ?? MAP_MODULE_CATALOG[0];
  const ringAngle = (indexHint * 1.15) % (Math.PI * 2);
  const dist = indexHint === 0 ? 0 : 4.2 + (indexHint % 3) * 2.2;
  const x = indexHint === 0 ? 0 : Math.round(Math.cos(ringAngle) * dist * 2) / 2;
  const z = indexHint === 0 ? -4.5 : Math.round(Math.sin(ringAngle) * dist * 2) / 2 - 2;
  return {
    id: `mod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    kind: spec.kind,
    label: `${spec.label} ${indexHint + 1}`,
    position: [x, 0, z],
    rotationYDeg: 0,
    scale: spec.defaultScale,
    primaryColor: spec.defaultPrimary,
    accentColor: spec.defaultAccent,
  };
}

export function applyMapToProject(
  project: AnimationProject,
  map: MapDefinition,
  applyAtmosphere: boolean,
): AnimationProject {
  const isCustom = !map.builtIn || !map.builtInSourceId;
  const nextEnv: EnvironmentId = isCustom
    ? 'custom'
    : (map.builtInSourceId as BuiltInMapId);

  const nextCustomMap: MapDefinition | undefined = isCustom
    ? {
        ...map,
        builtIn: false,
        baseplate: { ...map.baseplate },
        recommendedLighting: { ...map.recommendedLighting },
        modules: map.modules.map((m) => ({
          ...m,
          position: [...m.position] as Vec3Tuple,
        })),
      }
    : undefined;

  if (!applyAtmosphere) {
    return {
      ...project,
      environment: nextEnv,
      mapId: map.id,
      customMap: nextCustomMap,
    };
  }

  const rec = map.recommendedLighting;
  const existingTrack = project.lightingTrack ?? [];
  const nextTrack =
    existingTrack.length > 0
      ? existingTrack.map((kf, idx) =>
          idx === 0
            ? {
                ...kf,
                sunAzimuth: rec.sunAzimuth,
                sunElevation: rec.sunElevation,
                keyIntensity: rec.keyIntensity,
                rimIntensity: rec.rimIntensity,
                ambientIntensity: rec.ambientIntensity,
                exposure: rec.exposure,
              }
            : kf,
        )
      : undefined;

  return {
    ...project,
    environment: nextEnv,
    mapId: map.id,
    customMap: nextCustomMap,
    lightingMood: rec.mood,
    sunAzimuth: rec.sunAzimuth,
    sunElevation: rec.sunElevation,
    keyIntensity: rec.keyIntensity,
    rimIntensity: rec.rimIntensity,
    ambientIntensity: rec.ambientIntensity,
    exposure: rec.exposure,
    lightingTrack: nextTrack,
  };
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function sanitizeColor(v: unknown, fallback: string): string {
  if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim())) {
    return v.trim();
  }
  return fallback;
}

function sanitizeVec3(v: unknown, fallback: Vec3Tuple): Vec3Tuple {
  if (
    Array.isArray(v) &&
    v.length === 3 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n))
  ) {
    return [
      clampNum(v[0], -40, 40, fallback[0]),
      clampNum(v[1], -10, 30, fallback[1]),
      clampNum(v[2], -40, 40, fallback[2]),
    ];
  }
  return fallback;
}

const VALID_MODULE_KINDS = new Set<MapModuleKind>(
  MAP_MODULE_CATALOG.map((m) => m.kind),
);

function sanitizeBaseplate(raw: unknown): MapBaseplateConfig {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Partial<MapBaseplateConfig>;
  const pathStyle: MapPathStyle =
    b.pathStyle === 'cross' ||
    b.pathStyle === 'plaza' ||
    b.pathStyle === 'runway' ||
    b.pathStyle === 'street' ||
    b.pathStyle === 'hardwood' ||
    b.pathStyle === 'none'
      ? b.pathStyle
      : 'plaza';
  const perimeter: MapPerimeterStyle =
    b.perimeter === 'open' ||
    b.perimeter === 'trees' ||
    b.perimeter === 'rocks' ||
    b.perimeter === 'neonRim' ||
    b.perimeter === 'picketFence' ||
    b.perimeter === 'bedroomCorner'
      ? b.perimeter
      : 'trees';

  return {
    size: clampNum(b.size, 12, 64, 36),
    groundColor: sanitizeColor(b.groundColor, '#4b974b'),
    trimColor: sanitizeColor(b.trimColor, '#a3a2a5'),
    pathStyle,
    studDensity: clampNum(b.studDensity, 0.8, 2.2, 1.4),
    perimeter,
  };
}

function sanitizeLightingPreset(raw: unknown): MapLightingPreset {
  const l = (raw && typeof raw === 'object' ? raw : {}) as Partial<MapLightingPreset>;
  const mood: LightingMood =
    l.mood === 'sunset' ||
    l.mood === 'midnight' ||
    l.mood === 'overcast' ||
    l.mood === 'noon'
      ? l.mood
      : 'noon';

  return {
    mood,
    sunAzimuth: clampNum(l.sunAzimuth, 0, 360, 44),
    sunElevation: clampNum(l.sunElevation, 5, 89, 56),
    keyIntensity: clampNum(l.keyIntensity, 0.2, 5, 2.4),
    rimIntensity: clampNum(l.rimIntensity, 0, 4, 1.1),
    ambientIntensity: clampNum(l.ambientIntensity, 0.1, 3, 0.95),
    exposure: clampNum(l.exposure, 0.5, 2, 1.06),
  };
}

export function sanitizeMapDefinition(
  raw: unknown,
  forceCustom = false,
): MapDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<MapDefinition>;
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    return null;
  }
  const category: MapCategory = MAP_CATEGORIES.includes(obj.category as MapCategory)
    ? (obj.category as MapCategory)
    : 'custom';

  const rawModules = Array.isArray(obj.modules) ? obj.modules : [];
  const modules: MapModuleInstance[] = [];
  rawModules.forEach((m, idx) => {
    if (!m || typeof m !== 'object') return;
    const mod = m as Partial<MapModuleInstance>;
    const kind: MapModuleKind = VALID_MODULE_KINDS.has(mod.kind as MapModuleKind)
      ? (mod.kind as MapModuleKind)
      : 'crateCluster';
    const cat = MAP_MODULE_CATALOG.find((c) => c.kind === kind)!;
    modules.push({
      id: typeof mod.id === 'string' && mod.id ? mod.id : `mod_${Date.now()}_${idx}`,
      kind,
      label:
        typeof mod.label === 'string' && mod.label.trim()
          ? mod.label.trim().slice(0, 40)
          : cat.label,
      position: sanitizeVec3(mod.position, [0, 0, 0]),
      rotationYDeg: clampNum(mod.rotationYDeg, -360, 360, 0),
      scale: clampNum(mod.scale, 0.35, 3, 1),
      primaryColor: sanitizeColor(mod.primaryColor, cat.defaultPrimary),
      accentColor: sanitizeColor(mod.accentColor, cat.defaultAccent),
    });
  });

  const builtInSourceId =
    !forceCustom && isBuiltInMapId(obj.builtInSourceId)
      ? obj.builtInSourceId
      : undefined;

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : `map_custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: obj.name.trim().slice(0, 64),
    category,
    builtIn: false,
    ...(builtInSourceId ? { builtInSourceId } : {}),
    description:
      typeof obj.description === 'string'
        ? obj.description.trim().slice(0, 160)
        : 'Custom modular Stagecraft 3D map.',
    recommendedLighting: sanitizeLightingPreset(obj.recommendedLighting),
    baseplate: sanitizeBaseplate(obj.baseplate),
    modules,
    suggestedCamera:
      obj.suggestedCamera && typeof obj.suggestedCamera === 'object'
        ? {
            position: sanitizeVec3(obj.suggestedCamera.position, [4.2, 2.6, 5.6]),
            target: sanitizeVec3(obj.suggestedCamera.target, [0, 1.3, 0]),
            fov: clampNum(obj.suggestedCamera.fov, 20, 85, 45),
          }
        : undefined,
  };
}

export function loadCustomMaps(): MapDefinition[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(CUSTOM_MAPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizeMapDefinition(item, true))
      .filter((m): m is MapDefinition => m !== null);
  } catch {
    return [];
  }
}

export function saveCustomMaps(maps: MapDefinition[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CUSTOM_MAPS_STORAGE_KEY, JSON.stringify(maps));
  } catch {
    // Ignore storage quota / restricted context errors
  }
}

export function serializeMapLibrary(maps: MapDefinition[]): string {
  return JSON.stringify(
    {
      version: 1,
      maps: maps.map((m) => ({ ...m, builtIn: false })),
    },
    null,
    2,
  );
}

export function serializeSingleMap(map: MapDefinition): string {
  return JSON.stringify(
    {
      ...map,
      builtIn: false,
    },
    null,
    2,
  );
}

export function parseMapLibraryJson(raw: string): MapDefinition[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file. Please select a valid Stagecraft 3D map file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Map file must contain a JSON object.');
  }

  const obj = parsed as { maps?: unknown; name?: unknown; baseplate?: unknown };
  if (Array.isArray(obj.maps)) {
    const valid = obj.maps
      .map((item) => sanitizeMapDefinition(item, true))
      .filter((m): m is MapDefinition => m !== null);
    if (valid.length === 0) {
      throw new Error('No valid map definitions found inside "maps" array.');
    }
    return valid;
  }

  if (typeof obj.name === 'string' && obj.baseplate) {
    const single = sanitizeMapDefinition(obj, true);
    if (single) return [single];
  }

  throw new Error(
    'Unrecognized map JSON structure. Expected a MapDefinition object or { "maps": [...] } bundle.',
  );
}
