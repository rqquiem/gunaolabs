import {
  resolveCaptionSettings,
  resolveNarratorSettings,
} from './captionEngine';
import {
  AnimationProject,
  CameraKeyframe,
  CaptionSettings,
  CinematicPresetId,
  EasingType,
  LightingKeyframe,
  LightingMood,
  NarratorSettings,
} from './types';

export interface CinematicPresetDefinition {
  id: CinematicPresetId;
  label: string;
  tagline: string;
  swatchColor: string;
  lightingMood: LightingMood;
  sunAzimuth: number;
  sunElevation: number;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
  exposure: number;
  enableLetterbox: boolean;
  camera: {
    fovDelta: number;
    rollDeg: number;
    shakeIntensity: number;
    shakeFrequency: number;
    easing?: EasingType;
  };
  captionPatch: Partial<CaptionSettings>;
  narratorPatch: Partial<NarratorSettings>;
}

export const CINEMATIC_PRESETS: CinematicPresetDefinition[] = [
  {
    id: 'blockbuster',
    label: 'Blockbuster Trailer',
    tagline: 'Dramatic rim · Tight lens · Bold gold pop',
    swatchColor: '#fbbf24',
    lightingMood: 'midnight',
    sunAzimuth: 54,
    sunElevation: 28,
    keyIntensity: 2.35,
    rimIntensity: 2.1,
    ambientIntensity: 0.45,
    exposure: 1.08,
    enableLetterbox: true,
    camera: {
      fovDelta: -5,
      rollDeg: 0,
      shakeIntensity: 0.06,
      shakeFrequency: 11,
      easing: 'easeInOut',
    },
    captionPatch: {
      mode: 'wordPop',
      position: 'bottom',
      size: 'large',
      wordsPerChunk: 3,
      highlightColor: '#fbbf24',
      emphasisColor: '#ff5d73',
      backdrop: 'scrim',
      showSpeaker: true,
      emphasisPop: true,
    },
    narratorPatch: {
      voice: 'Fenrir',
      style: 'cinematicTrailer',
      speed: 0.94,
      pitchSemitones: -1,
    },
  },
  {
    id: 'goldenHour',
    label: 'Golden Hour Drama',
    tagline: 'Warm sunset · Smooth glide · Cinema bars',
    swatchColor: '#f59e0b',
    lightingMood: 'sunset',
    sunAzimuth: 24,
    sunElevation: 19,
    keyIntensity: 2.65,
    rimIntensity: 1.75,
    ambientIntensity: 0.62,
    exposure: 1.06,
    enableLetterbox: true,
    camera: {
      fovDelta: -3,
      rollDeg: 0,
      shakeIntensity: 0.02,
      shakeFrequency: 7,
      easing: 'easeInOut',
    },
    captionPatch: {
      mode: 'wordPop',
      position: 'bottom',
      size: 'medium',
      wordsPerChunk: 3,
      highlightColor: '#fbbf24',
      emphasisColor: '#fb7185',
      backdrop: 'scrim',
      showSpeaker: true,
      emphasisPop: true,
    },
    narratorPatch: {
      voice: 'Charon',
      style: 'warmStoryteller',
      speed: 0.98,
      pitchSemitones: 0,
    },
  },
  {
    id: 'noir',
    label: 'Noir Mystery',
    tagline: 'Deep shadow · Dutch tilt · Crisp white',
    swatchColor: '#e2e8f0',
    lightingMood: 'midnight',
    sunAzimuth: 148,
    sunElevation: 22,
    keyIntensity: 1.85,
    rimIntensity: 2.35,
    ambientIntensity: 0.34,
    exposure: 0.94,
    enableLetterbox: true,
    camera: {
      fovDelta: -4,
      rollDeg: -3,
      shakeIntensity: 0.03,
      shakeFrequency: 6,
      easing: 'easeOutCubic',
    },
    captionPatch: {
      mode: 'wordPop',
      position: 'bottom',
      size: 'medium',
      wordsPerChunk: 3,
      highlightColor: '#ffffff',
      emphasisColor: '#38bdf8',
      backdrop: 'card',
      showSpeaker: true,
      emphasisPop: true,
    },
    narratorPatch: {
      voice: 'Fenrir',
      style: 'documentary',
      speed: 0.92,
      pitchSemitones: -1.5,
    },
  },
  {
    id: 'comedyShorts',
    label: 'Comedy Shorts',
    tagline: 'Punchy daylight · Cyan word-pop · Snappy VO',
    swatchColor: '#38bdf8',
    lightingMood: 'noon',
    sunAzimuth: 42,
    sunElevation: 58,
    keyIntensity: 2.55,
    rimIntensity: 1.25,
    ambientIntensity: 0.88,
    exposure: 1.08,
    enableLetterbox: false,
    camera: {
      fovDelta: 2,
      rollDeg: 0,
      shakeIntensity: 0.04,
      shakeFrequency: 14,
    },
    captionPatch: {
      mode: 'wordPop',
      position: 'center',
      size: 'large',
      wordsPerChunk: 3,
      highlightColor: '#38bdf8',
      emphasisColor: '#fbbf24',
      backdrop: 'outline',
      showSpeaker: true,
      emphasisPop: true,
    },
    narratorPatch: {
      voice: 'Puck',
      style: 'snappyComedy',
      speed: 1.08,
      pitchSemitones: 0.5,
    },
  },
  {
    id: 'documentary',
    label: 'Documentary Studio',
    tagline: 'Soft overcast · Subtle handheld · Crisp VO',
    swatchColor: '#a3e635',
    lightingMood: 'overcast',
    sunAzimuth: 66,
    sunElevation: 48,
    keyIntensity: 2.1,
    rimIntensity: 1.15,
    ambientIntensity: 0.94,
    exposure: 1.02,
    enableLetterbox: true,
    camera: {
      fovDelta: -1,
      rollDeg: 0,
      shakeIntensity: 0.03,
      shakeFrequency: 8,
    },
    captionPatch: {
      mode: 'wordPop',
      position: 'bottom',
      size: 'medium',
      wordsPerChunk: 4,
      highlightColor: '#a3e635',
      emphasisColor: '#fb7185',
      backdrop: 'scrim',
      showSpeaker: true,
      emphasisPop: true,
    },
    narratorPatch: {
      voice: 'Kore',
      style: 'documentary',
      speed: 1.0,
      pitchSemitones: 0,
    },
  },
  {
    id: 'cleanDaylight',
    label: 'Clean Daylight',
    tagline: 'Natural sun · Steady lens · Classic studio',
    swatchColor: '#34d399',
    lightingMood: 'noon',
    sunAzimuth: 38,
    sunElevation: 56,
    keyIntensity: 2.4,
    rimIntensity: 1.05,
    ambientIntensity: 0.92,
    exposure: 1.04,
    enableLetterbox: false,
    camera: {
      fovDelta: 0,
      rollDeg: 0,
      shakeIntensity: 0,
      shakeFrequency: 8,
    },
    captionPatch: {
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
    narratorPatch: {
      voice: 'Zephyr',
      style: 'energeticHost',
      speed: 1.0,
      pitchSemitones: 0,
    },
  },
];

export function getCinematicPresetById(
  id: CinematicPresetId,
): CinematicPresetDefinition {
  return CINEMATIC_PRESETS.find((p) => p.id === id) ?? CINEMATIC_PRESETS[0];
}

export interface CinematicLookSnapshot {
  lightingMood: LightingMood;
  sunAzimuth?: number;
  sunElevation?: number;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
  exposure?: number;
  lightingTrack?: LightingKeyframe[];
  cameraTrack: CameraKeyframe[];
  captionSettings?: CaptionSettings;
  narratorSettings?: NarratorSettings;
  activeCinematicPreset?: CinematicPresetId | null;
  forceLetterbox: boolean;
}

export function captureCinematicSnapshot(
  project: AnimationProject,
  forceLetterbox: boolean,
): CinematicLookSnapshot {
  return {
    lightingMood: project.lightingMood,
    sunAzimuth: project.sunAzimuth,
    sunElevation: project.sunElevation,
    keyIntensity: project.keyIntensity,
    rimIntensity: project.rimIntensity,
    ambientIntensity: project.ambientIntensity,
    exposure: project.exposure,
    lightingTrack: project.lightingTrack
      ? project.lightingTrack.map((k) => ({ ...k }))
      : undefined,
    cameraTrack: project.cameraTrack.map((c) => ({
      ...c,
      position: [...c.position] as [number, number, number],
      target: [...c.target] as [number, number, number],
      ...(c.trackOffset
        ? { trackOffset: [...c.trackOffset] as [number, number, number] }
        : {}),
    })),
    captionSettings: project.captionSettings
      ? { ...project.captionSettings }
      : undefined,
    narratorSettings: project.narratorSettings
      ? { ...project.narratorSettings }
      : undefined,
    activeCinematicPreset: project.activeCinematicPreset ?? null,
    forceLetterbox,
  };
}

export function applyCinematicPreset(
  project: AnimationProject,
  presetId: CinematicPresetId,
): { project: AnimationProject; enableLetterbox: boolean } {
  const preset = getCinematicPresetById(presetId);
  const currentCaption = resolveCaptionSettings(project.captionSettings);
  const currentNarrator = resolveNarratorSettings(project.narratorSettings);

  // Update lighting keyframes smoothly while respecting any multi-scene timeline structure
  const updatedLightingTrack =
    project.lightingTrack && project.lightingTrack.length > 0
      ? project.lightingTrack.map((kf) => ({
          ...kf,
          mood: preset.lightingMood,
          sunAzimuth: preset.sunAzimuth,
          sunElevation: preset.sunElevation,
          keyIntensity: preset.keyIntensity,
          rimIntensity: preset.rimIntensity,
          ambientIntensity: preset.ambientIntensity,
          exposure: preset.exposure,
        }))
      : project.lightingTrack;

  // Apply gentle bounded camera lens/motion styling without breaking character framing
  const updatedCameraTrack: CameraKeyframe[] = project.cameraTrack.map((kf) => {
    const nextFov = Math.max(
      28,
      Math.min(72, Math.round((kf.fov + preset.camera.fovDelta) * 10) / 10),
    );
    return {
      ...kf,
      fov: nextFov,
      rollDeg: preset.camera.rollDeg,
      shakeIntensity: Math.max(
        preset.camera.shakeIntensity,
        preset.id === 'cleanDaylight' ? 0 : kf.shakeIntensity ?? 0,
      ),
      shakeFrequency:
        preset.camera.shakeIntensity > 0
          ? preset.camera.shakeFrequency
          : kf.shakeFrequency,
      ...(preset.camera.easing && kf.easing !== 'step'
        ? { easing: preset.camera.easing }
        : {}),
    };
  });

  return {
    project: {
      ...project,
      lightingMood: preset.lightingMood,
      sunAzimuth: preset.sunAzimuth,
      sunElevation: preset.sunElevation,
      keyIntensity: preset.keyIntensity,
      rimIntensity: preset.rimIntensity,
      ambientIntensity: preset.ambientIntensity,
      exposure: preset.exposure,
      lightingTrack: updatedLightingTrack,
      cameraTrack: updatedCameraTrack,
      captionSettings: resolveCaptionSettings({
        ...currentCaption,
        ...preset.captionPatch,
      }),
      narratorSettings: resolveNarratorSettings({
        ...currentNarrator,
        ...preset.narratorPatch,
      }),
      activeCinematicPreset: preset.id,
    },
    enableLetterbox: preset.enableLetterbox,
  };
}

export function restoreCinematicSnapshot(
  project: AnimationProject,
  snapshot: CinematicLookSnapshot,
): { project: AnimationProject; forceLetterbox: boolean } {
  return {
    project: {
      ...project,
      lightingMood: snapshot.lightingMood,
      sunAzimuth: snapshot.sunAzimuth,
      sunElevation: snapshot.sunElevation,
      keyIntensity: snapshot.keyIntensity,
      rimIntensity: snapshot.rimIntensity,
      ambientIntensity: snapshot.ambientIntensity,
      exposure: snapshot.exposure,
      lightingTrack: snapshot.lightingTrack,
      cameraTrack: snapshot.cameraTrack,
      captionSettings: snapshot.captionSettings,
      narratorSettings: snapshot.narratorSettings,
      activeCinematicPreset: snapshot.activeCinematicPreset ?? null,
    },
    forceLetterbox: snapshot.forceLetterbox,
  };
}
