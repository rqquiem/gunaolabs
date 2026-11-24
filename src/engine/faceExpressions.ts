import {
  EasingType,
  EvaluatedFaceState,
  ExpressionParams,
  ExpressionPresetId,
  FaceBrowStyle,
  FaceCheekStyle,
  FaceEyeStyle,
  FaceKeyframe,
  FaceMouthStyle,
  FaceRigConfig,
  SceneActorConfig,
  SubtitleCue,
} from './types';

export const FACE_EYE_STYLES: { id: FaceEyeStyle; label: string }[] = [
  { id: 'expressive', label: 'Expressive 3D' },
  { id: 'classic', label: 'Classic Glossy' },
  { id: 'hero', label: 'Hero Slanted' },
  { id: 'starry', label: 'Starry Sparkle' },
  { id: 'cyber', label: 'Cyber Visor' },
];

export const FACE_BROW_STYLES: { id: FaceBrowStyle; label: string }[] = [
  { id: 'rounded', label: 'Soft Capsule' },
  { id: 'bold', label: 'Bold Brick' },
  { id: 'sharp', label: 'Hero Angled' },
  { id: 'arched', label: 'Arched Curve' },
  { id: 'none', label: 'None' },
];

export const FACE_MOUTH_STYLES: { id: FaceMouthStyle; label: string }[] = [
  { id: 'sculpted', label: 'Sculpted 3D' },
  { id: 'openCavity', label: 'Cartoon Cavity' },
  { id: 'smirk', label: 'Stylized Smirk' },
  { id: 'cyber', label: 'Cyber Vocoder' },
];

export const FACE_CHEEK_STYLES: { id: FaceCheekStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'blush', label: 'Rosy Blush' },
  { id: 'freckles', label: '3D Freckles' },
  { id: 'bandage', label: 'Cheek Bandage' },
  { id: 'scar', label: 'Battle Scar' },
];

export const EXPRESSION_PRESETS: Record<ExpressionPresetId, ExpressionParams> = {
  neutral: {
    smile: 0.12,
    browRaise: 0,
    browFurrow: 0,
    eyeWide: 0,
    blinkL: 0,
    blinkR: 0,
    jawOpen: 0,
    mouthWidth: 0,
    mouthSkew: 0,
    gazeX: 0,
    gazeY: 0,
    blush: 0.1,
  },
  happy: {
    smile: 0.78,
    browRaise: 0.25,
    browFurrow: 0,
    eyeWide: 0.12,
    blinkL: 0,
    blinkR: 0,
    jawOpen: 0.22,
    mouthWidth: 0.35,
    mouthSkew: 0,
    gazeX: 0,
    gazeY: 0,
    blush: 0.45,
  },
  excited: {
    smile: 0.95,
    browRaise: 0.65,
    browFurrow: 0,
    eyeWide: 0.55,
    blinkL: 0,
    blinkR: 0,
    jawOpen: 0.68,
    mouthWidth: 0.55,
    mouthSkew: 0,
    gazeX: 0,
    gazeY: 0.08,
    blush: 0.7,
  },
  angry: {
    smile: -0.68,
    browRaise: -0.45,
    browFurrow: 0.92,
    eyeWide: -0.25,
    blinkL: 0.12,
    blinkR: 0.12,
    jawOpen: 0.34,
    mouthWidth: 0.15,
    mouthSkew: -0.15,
    gazeX: 0,
    gazeY: 0,
    blush: 0.25,
  },
  sad: {
    smile: -0.75,
    browRaise: 0.35,
    browFurrow: -0.65,
    eyeWide: -0.2,
    blinkL: 0.22,
    blinkR: 0.22,
    jawOpen: 0.06,
    mouthWidth: -0.25,
    mouthSkew: 0,
    gazeX: 0,
    gazeY: -0.35,
    blush: 0.15,
  },
  surprised: {
    smile: 0.05,
    browRaise: 0.92,
    browFurrow: 0,
    eyeWide: 0.92,
    blinkL: 0,
    blinkR: 0,
    jawOpen: 0.82,
    mouthWidth: -0.58,
    mouthSkew: 0,
    gazeX: 0,
    gazeY: 0.1,
    blush: 0.2,
  },
  smug: {
    smile: 0.52,
    browRaise: 0.18,
    browFurrow: 0.22,
    eyeWide: -0.28,
    blinkL: 0.18,
    blinkR: 0.05,
    jawOpen: 0.04,
    mouthWidth: 0.22,
    mouthSkew: 0.72,
    gazeX: 0.22,
    gazeY: 0.05,
    blush: 0.1,
  },
  wink: {
    smile: 0.72,
    browRaise: 0.3,
    browFurrow: 0,
    eyeWide: 0.15,
    blinkL: 0,
    blinkR: 0.98,
    jawOpen: 0.18,
    mouthWidth: 0.3,
    mouthSkew: 0.28,
    gazeX: 0,
    gazeY: 0,
    blush: 0.55,
  },
  determined: {
    smile: 0.28,
    browRaise: -0.25,
    browFurrow: 0.75,
    eyeWide: -0.1,
    blinkL: 0.08,
    blinkR: 0.08,
    jawOpen: 0.08,
    mouthWidth: 0.18,
    mouthSkew: 0.2,
    gazeX: 0,
    gazeY: 0,
    blush: 0.1,
  },
  focused: {
    smile: -0.05,
    browRaise: -0.18,
    browFurrow: 0.45,
    eyeWide: -0.22,
    blinkL: 0.15,
    blinkR: 0.15,
    jawOpen: 0,
    mouthWidth: -0.1,
    mouthSkew: 0,
    gazeX: 0,
    gazeY: 0,
    blush: 0,
  },
};

export function createDefaultFaceConfig(): FaceRigConfig {
  return {
    eyeStyle: 'expressive',
    browStyle: 'rounded',
    mouthStyle: 'sculpted',
    cheekStyle: 'blush',
    eyeColor: '#1d4ed8',
    browColor: '#1f2937',
    mouthColor: '#1f2937',
    accentColor: '#f472b6',
    autoBlink: true,
    autoLipSync: true,
    gazeTarget: 'camera',
  };
}

export function defaultFaceConfigFromLegacy(
  legacyFaceId?: string,
  legacyColor?: string,
): FaceRigConfig {
  const base = createDefaultFaceConfig();
  switch (legacyFaceId) {
    case 'visorEyes':
      return {
        ...base,
        eyeStyle: 'cyber',
        browStyle: 'sharp',
        mouthStyle: 'cyber',
        cheekStyle: 'none',
        eyeColor: legacyColor && legacyColor !== '#111827' ? legacyColor : '#00a2ff',
        browColor: '#0f172a',
        mouthColor: legacyColor && legacyColor !== '#111827' ? legacyColor : '#00a2ff',
        accentColor: '#38bdf8',
      };
    case 'determined':
      return {
        ...base,
        eyeStyle: 'hero',
        browStyle: 'sharp',
        mouthStyle: 'sculpted',
        cheekStyle: 'scar',
        eyeColor: '#2563eb',
        browColor: '#1e293b',
        mouthColor: '#1e293b',
        accentColor: '#d97706',
      };
    case 'epic':
      return {
        ...base,
        eyeStyle: 'starry',
        browStyle: 'arched',
        mouthStyle: 'openCavity',
        cheekStyle: 'bandage',
        eyeColor: '#0284c7',
        browColor: '#3b2416',
        mouthColor: '#1f2937',
        accentColor: '#f59e0b',
      };
    case 'smirk':
      return {
        ...base,
        eyeStyle: 'expressive',
        browStyle: 'bold',
        mouthStyle: 'smirk',
        cheekStyle: 'none',
        eyeColor: '#0f766e',
        browColor: '#111827',
        mouthColor: '#111827',
        accentColor: '#38bdf8',
      };
    case 'shocked':
      return {
        ...base,
        eyeStyle: 'expressive',
        browStyle: 'arched',
        mouthStyle: 'openCavity',
        cheekStyle: 'blush',
        eyeColor: '#1e3a8a',
      };
    case 'smile':
    default:
      return {
        ...base,
        eyeStyle: 'classic',
        browStyle: 'rounded',
        mouthStyle: 'openCavity',
        cheekStyle: 'blush',
        eyeColor: '#111827',
        browColor: '#1e293b',
        mouthColor: '#1f2937',
        accentColor: '#fb7185',
      };
  }
}

export function resolveActorFaceConfig(actor: SceneActorConfig): FaceRigConfig {
  if (actor.faceConfig) {
    return actor.faceConfig;
  }
  return defaultFaceConfigFromLegacy(
    actor.ornaments?.face?.id,
    actor.ornaments?.face?.color,
  );
}

export function resolveExpressionParams(
  preset: ExpressionPresetId,
  overrides?: Partial<ExpressionParams>,
): ExpressionParams {
  const base = EXPRESSION_PRESETS[preset] ?? EXPRESSION_PRESETS.neutral;
  if (!overrides) return { ...base };
  return {
    smile: overrides.smile ?? base.smile,
    browRaise: overrides.browRaise ?? base.browRaise,
    browFurrow: overrides.browFurrow ?? base.browFurrow,
    eyeWide: overrides.eyeWide ?? base.eyeWide,
    blinkL: overrides.blinkL ?? base.blinkL,
    blinkR: overrides.blinkR ?? base.blinkR,
    jawOpen: overrides.jawOpen ?? base.jawOpen,
    mouthWidth: overrides.mouthWidth ?? base.mouthWidth,
    mouthSkew: overrides.mouthSkew ?? base.mouthSkew,
    gazeX: overrides.gazeX ?? base.gazeX,
    gazeY: overrides.gazeY ?? base.gazeY,
    blush: overrides.blush ?? base.blush,
  };
}

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function blendExpressionParams(
  a: ExpressionParams,
  b: ExpressionParams,
  t: number,
): ExpressionParams {
  return {
    smile: clampVal(lerpNum(a.smile, b.smile, t), -1, 1),
    browRaise: clampVal(lerpNum(a.browRaise, b.browRaise, t), -1, 1),
    browFurrow: clampVal(lerpNum(a.browFurrow, b.browFurrow, t), -1, 1),
    eyeWide: clampVal(lerpNum(a.eyeWide, b.eyeWide, t), -1, 1),
    blinkL: clampVal(lerpNum(a.blinkL, b.blinkL, t), 0, 1),
    blinkR: clampVal(lerpNum(a.blinkR, b.blinkR, t), 0, 1),
    jawOpen: clampVal(lerpNum(a.jawOpen, b.jawOpen, t), 0, 1),
    mouthWidth: clampVal(lerpNum(a.mouthWidth, b.mouthWidth, t), -1, 1),
    mouthSkew: clampVal(lerpNum(a.mouthSkew, b.mouthSkew, t), -1, 1),
    gazeX: clampVal(lerpNum(a.gazeX, b.gazeX, t), -1, 1),
    gazeY: clampVal(lerpNum(a.gazeY, b.gazeY, t), -1, 1),
    blush: clampVal(lerpNum(a.blush, b.blush, t), 0, 1),
  };
}

export function hashActorSeed(actorId: string): number {
  let h = 2166136261;
  for (let i = 0; i < actorId.length; i++) {
    h ^= actorId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000;
}

/**
 * Deterministic natural auto-blink curve (0 = open, 1 = closed).
 * Uses period ~3.8s with actor phase offset and occasional quick double-blink.
 */
export function evaluateAutoBlink(time: number, actorSeed: number): number {
  const period = 3.5 + (actorSeed % 13) * 0.11;
  const offset = (actorSeed % 37) * 0.13;
  const shifted = Math.max(0, time + offset);
  const cycleIndex = Math.floor(shifted / period);
  const localT = shifted - cycleIndex * period;

  // Primary blink at start of cycle (~0.18s total: 0.07s close, 0.11s open)
  const primary = blinkPulse(localT, 0.25, 0.065, 0.115);
  // Occasional natural double-blink every 4th cycle
  const secondary =
    cycleIndex % 4 === 2 ? blinkPulse(localT, 0.56, 0.06, 0.105) : 0;
  return Math.max(primary, secondary);
}

function blinkPulse(
  t: number,
  center: number,
  closeDur: number,
  openDur: number,
): number {
  const start = center - closeDur;
  const end = center + openDur;
  if (t <= start || t >= end) return 0;
  if (t < center) {
    const u = (t - start) / closeDur;
    return u * u;
  }
  const u = (t - center) / openDur;
  return (1 - u) * (1 - u);
}

export interface LipSyncViseme {
  active: boolean;
  jawOpen: number;
  mouthWidth: number;
  smileDelta: number;
}

function classifyCharViseme(ch: string): { jaw: number; width: number } {
  const c = ch.toLowerCase();
  if (c === 'a' || c === 'i') return { jaw: 0.72, width: 0.28 };
  if (c === 'e') return { jaw: 0.52, width: 0.45 };
  if (c === 'o') return { jaw: 0.78, width: -0.52 };
  if (c === 'u' || c === 'w') return { jaw: 0.44, width: -0.62 };
  if (c === 'm' || c === 'b' || c === 'p') return { jaw: 0.04, width: -0.15 };
  if (c === 'f' || c === 'v') return { jaw: 0.18, width: 0.18 };
  if (c >= 'a' && c <= 'z') return { jaw: 0.34, width: 0.06 };
  // Spaces or punctuation create brief natural speech pauses
  return { jaw: 0.05, width: 0 };
}

/**
 * Deterministic phoneme/viseme lip-sync evaluator driven directly by SubtitleCue text.
 */
export function evaluateSubtitleLipSync(
  actor: SceneActorConfig,
  subtitles: SubtitleCue[],
  time: number,
): LipSyncViseme {
  const normalizedActorName = actor.name.trim().toLowerCase();
  const cue = subtitles.find((s) => {
    if (time < s.startTime || time > s.endTime) return false;
    if (s.actorId && s.actorId === actor.id) return true;
    const spk = s.speaker.trim().toLowerCase();
    return spk.length > 0 && spk === normalizedActorName;
  });

  if (!cue || !cue.text.trim()) {
    return { active: false, jawOpen: 0, mouthWidth: 0, smileDelta: 0 };
  }

  const text = cue.text.trim();
  const duration = Math.max(0.25, cue.endTime - cue.startTime);
  const localT = clampVal(time - cue.startTime, 0, duration);
  const progress = localT / duration;

  // Smooth fade envelope at start & end of line
  const fadeIn = clampVal(localT / 0.12, 0, 1);
  const fadeOut = clampVal((duration - localT) / 0.14, 0, 1);
  const envelope = Math.min(fadeIn, fadeOut);

  // Sample character stream smoothly across cue duration
  const charPos = progress * Math.max(1, text.length - 1);
  const idxA = clampVal(Math.floor(charPos), 0, text.length - 1);
  const idxB = clampVal(idxA + 1, 0, text.length - 1);
  const frac = charPos - idxA;

  const visA = classifyCharViseme(text[idxA]);
  const visB = classifyCharViseme(text[idxB]);
  const smoothFrac = frac * frac * (3 - 2 * frac);

  // Subtle syllable modulation so long vowels pulse naturally
  const syllablePulse = 0.84 + 0.16 * Math.sin(localT * 17.5);
  const jawOpen = clampVal(
    lerpNum(visA.jaw, visB.jaw, smoothFrac) * syllablePulse * envelope,
    0,
    0.92,
  );
  const mouthWidth = clampVal(
    lerpNum(visA.width, visB.width, smoothFrac) * envelope,
    -0.75,
    0.65,
  );

  return {
    active: true,
    jawOpen,
    mouthWidth,
    smileDelta: 0.08 * envelope,
  };
}

export function evaluateActorFaceAt(
  actor: SceneActorConfig,
  time: number,
  subtitles: SubtitleCue[],
  easingFn: (t: number, easing: EasingType) => number,
): EvaluatedFaceState {
  const cfg = resolveActorFaceConfig(actor);
  const keys: FaceKeyframe[] = actor.faceKeyframes
    ? [...actor.faceKeyframes].sort((a, b) => a.time - b.time)
    : [];

  let preset: ExpressionPresetId = 'neutral';
  let params: ExpressionParams;

  if (keys.length === 0) {
    // Derive subtle default preset from legacy ornament face if no face keyframes yet
    const legacy = actor.ornaments?.face?.id;
    if (legacy === 'determined') preset = 'determined';
    else if (legacy === 'epic') preset = 'excited';
    else if (legacy === 'smirk') preset = 'smug';
    else if (legacy === 'shocked') preset = 'surprised';
    else if (legacy === 'smile') preset = 'happy';
    else preset = 'neutral';
    params = resolveExpressionParams(preset);
  } else if (time <= keys[0].time) {
    preset = keys[0].preset;
    params = resolveExpressionParams(keys[0].preset, keys[0].overrides);
  } else if (time >= keys[keys.length - 1].time) {
    const last = keys[keys.length - 1];
    preset = last.preset;
    params = resolveExpressionParams(last.preset, last.overrides);
  } else {
    let prev = keys[0];
    let next = keys[1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (time >= keys[i].time && time <= keys[i + 1].time) {
        prev = keys[i];
        next = keys[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, next.time - prev.time);
    const rawT = (time - prev.time) / span;
    const easedT = easingFn(rawT, prev.easing);
    const pA = resolveExpressionParams(prev.preset, prev.overrides);
    const pB = resolveExpressionParams(next.preset, next.overrides);
    params = blendExpressionParams(pA, pB, easedT);
    preset = rawT < 0.5 ? prev.preset : next.preset;
  }

  // Deterministic Auto-Blink layered cleanly
  if (cfg.autoBlink) {
    const blinkAmt = evaluateAutoBlink(time, hashActorSeed(actor.id));
    params = {
      ...params,
      blinkL: Math.max(params.blinkL, blinkAmt),
      blinkR: Math.max(params.blinkR, blinkAmt),
    };
  }

  // Deterministic Subtitle Lip-Sync layered cleanly
  let isSpeaking = false;
  if (cfg.autoLipSync && subtitles.length > 0) {
    const lip = evaluateSubtitleLipSync(actor, subtitles, time);
    if (lip.active) {
      isSpeaking = true;
      params = {
        ...params,
        jawOpen: clampVal(Math.max(params.jawOpen * 0.35, lip.jawOpen), 0, 1),
        mouthWidth: clampVal(params.mouthWidth * 0.45 + lip.mouthWidth * 0.75, -1, 1),
        smile: clampVal(params.smile + lip.smileDelta, -1, 1),
      };
    }
  }

  return {
    preset,
    params,
    isSpeaking,
  };
}
