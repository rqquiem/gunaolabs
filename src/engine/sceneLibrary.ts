import {
  BEDROOM_SKIT_PROJECT,
  BLANK_BASEPLATE_PROJECT,
  BRICKIA_CHRONICLES_LONG_PROJECT,
  CROSSROADS_SHOWDOWN_PROJECT,
  DOJO_DUEL_PROJECT,
  LUNAR_RESCUE_PROJECT,
  R6_SHOWCASE_PROJECT,
  ROBLOXIAN_TOWN_PROJECT,
  TOWN_PLAZA_SKIT_PROJECT,
} from './presets';
import { parseProjectJson } from './timeline';
import {
  AnimationProject,
  SCENE_CATEGORIES,
  SceneCategory,
  SceneLibraryEntry,
} from './types';

const CUSTOM_SCENES_STORAGE_KEY = 'stagecraft3d.customScenes.v1';

export function cloneProject(project: AnimationProject): AnimationProject {
  return JSON.parse(JSON.stringify(project)) as AnimationProject;
}

export const BUILT_IN_SCENES: SceneLibraryEntry[] = [
  {
    id: 'scene_crossroads_showdown',
    name: CROSSROADS_SHOWDOWN_PROJECT.name,
    category: 'action',
    builtIn: true,
    description:
      'Two-character Brick Battle duel with Linked Sword slash, Bloxy banter, multi-shot camera shake, and dynamic sun keyframes.',
    project: CROSSROADS_SHOWDOWN_PROJECT,
  },
  {
    id: 'scene_brickia_chronicles_long',
    name: BRICKIA_CHRONICLES_LONG_PROJECT.name,
    category: 'showcase',
    builtIn: true,
    description:
      '4-minute (240s) multi-act feature demonstrating chapter markers, timeline zoom/minimap navigation, and mid-scene map switches across 4 worlds.',
    project: BRICKIA_CHRONICLES_LONG_PROJECT,
  },
  {
    id: 'scene_bedroom_hangout',
    name: BEDROOM_SKIT_PROJECT.name,
    category: 'comedy',
    builtIn: true,
    description:
      'Cozy gamer bedroom skit with Alex & Sam, RGB dual-monitor desk, pizza & Bloxy Cola prop swaps, and multi-angle dialogue cuts.',
    project: BEDROOM_SKIT_PROJECT,
  },
  {
    id: 'scene_robloxian_town',
    name: ROBLOXIAN_TOWN_PROJECT.name,
    category: 'comedy',
    builtIn: true,
    description:
      'Morning meetup along Maple Street in Robloxian Town with suburban homes, crosswalk, corner café, and parked Brick Speeder.',
    project: ROBLOXIAN_TOWN_PROJECT,
  },
  {
    id: 'scene_town_plaza',
    name: TOWN_PLAZA_SKIT_PROJECT.name,
    category: 'comedy',
    builtIn: true,
    description:
      'Sunset meetup at Blocky Town Plaza featuring Sky Explorer, Retro Guest, fountain landmarks, and a parked Brick Speeder.',
    project: TOWN_PLAZA_SKIT_PROJECT,
  },
  {
    id: 'scene_lunar_rescue',
    name: LUNAR_RESCUE_PROJECT.name,
    category: 'action',
    builtIn: true,
    description:
      'Midnight patrol across the Lunar Brick Outpost with cyan landing beacons, orbital cargo, and dramatic rim lighting.',
    project: LUNAR_RESCUE_PROJECT,
  },
  {
    id: 'scene_dojo_duel',
    name: DOJO_DUEL_PROJECT.name,
    category: 'action',
    builtIn: true,
    description:
      'Dusk sword sparring beneath the Crimson Gatehouse with koi reflection basin and close-up reaction framing.',
    project: DOJO_DUEL_PROJECT,
  },
  {
    id: 'scene_r6_showcase',
    name: R6_SHOWCASE_PROJECT.name,
    category: 'showcase',
    builtIn: true,
    description:
      'Single-character turntable spotlighting R6 joint articulation, 3D sculpted expressions, and orbiting hero angles.',
    project: R6_SHOWCASE_PROJECT,
  },
  {
    id: 'scene_blank_baseplate',
    name: BLANK_BASEPLATE_PROJECT.name,
    category: 'template',
    builtIn: true,
    description:
      'Clean starter baseplate with a single Noob R6 rig and wide establishing camera ready for custom staging.',
    project: BLANK_BASEPLATE_PROJECT,
  },
];

export function createSceneEntryFromProject(
  project: AnimationProject,
  name: string,
  category: SceneCategory = 'custom',
  description?: string,
): SceneLibraryEntry {
  const cleanName = name.trim().slice(0, 64) || 'Untitled Scene';
  const cloned = cloneProject(project);
  cloned.id = `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  cloned.name = cleanName;

  const actorCount = cloned.actors.length;
  const shotCount = cloned.cameraTrack.length;
  const fallbackDesc = `${actorCount} actor${actorCount === 1 ? '' : 's'}, ${shotCount} camera shot${shotCount === 1 ? '' : 's'}, ${cloned.duration}s cutscene.`;

  return {
    id: `scene_custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: cleanName,
    category,
    builtIn: false,
    description: description?.trim() || fallbackDesc,
    savedAt: new Date().toISOString(),
    project: cloned,
  };
}

function sanitizeSceneEntry(raw: unknown): SceneLibraryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<SceneLibraryEntry>;

  try {
    // Support either a SceneLibraryEntry wrapper or a raw AnimationProject object
    const rawProject = obj.project ? obj.project : raw;
    const validProject = parseProjectJson(JSON.stringify(rawProject));
    const entryName =
      typeof obj.name === 'string' && obj.name.trim()
        ? obj.name.trim().slice(0, 64)
        : validProject.name;
    const category: SceneCategory = SCENE_CATEGORIES.includes(
      obj.category as SceneCategory,
    )
      ? (obj.category as SceneCategory)
      : 'custom';

    return {
      id:
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : `scene_custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: entryName,
      category,
      builtIn: false,
      description:
        typeof obj.description === 'string' && obj.description.trim()
          ? obj.description.trim().slice(0, 180)
          : `${validProject.actors.length} actor(s) · ${validProject.duration}s`,
      savedAt:
        typeof obj.savedAt === 'string' ? obj.savedAt : new Date().toISOString(),
      project: { ...validProject, name: entryName },
    };
  } catch {
    return null;
  }
}

export function loadCustomScenes(): SceneLibraryEntry[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(CUSTOM_SCENES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizeSceneEntry(item))
      .filter((s): s is SceneLibraryEntry => s !== null);
  } catch {
    return [];
  }
}

export function saveCustomScenes(scenes: SceneLibraryEntry[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CUSTOM_SCENES_STORAGE_KEY, JSON.stringify(scenes));
  } catch {
    // Ignore storage quota / restricted context errors
  }
}

export function serializeSceneLibrary(scenes: SceneLibraryEntry[]): string {
  return JSON.stringify(
    {
      version: 1,
      scenes: scenes.map((s) => ({ ...s, builtIn: false })),
    },
    null,
    2,
  );
}

export function serializeSingleSceneEntry(scene: SceneLibraryEntry): string {
  return JSON.stringify(
    {
      ...scene,
      builtIn: false,
    },
    null,
    2,
  );
}

export function parseSceneLibraryJson(raw: string): SceneLibraryEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file. Please select a valid Stagecraft 3D scene file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Scene file must contain a JSON object.');
  }

  const obj = parsed as { scenes?: unknown };
  if (Array.isArray(obj.scenes)) {
    const valid = obj.scenes
      .map((item) => sanitizeSceneEntry(item))
      .filter((s): s is SceneLibraryEntry => s !== null);
    if (valid.length === 0) {
      throw new Error('No valid scenes found inside "scenes" array.');
    }
    return valid;
  }

  const single = sanitizeSceneEntry(parsed);
  if (single) {
    return [single];
  }

  throw new Error(
    'Unrecognized scene JSON structure. Expected a SceneLibraryEntry, AnimationProject, or { "scenes": [...] } bundle.',
  );
}
