import {
  resolveNarratorSettings,
  stripCaptionMarkup,
} from './captionEngine';
import {
  extractCustomVoiceoverDuckIntervals,
  extractWaveformPeaks,
} from './narrationTranscript';
import {
  appendVoiceoverAssetToTrack,
  computeTrackDuckIntervals,
  ensureMultiClipVoiceoverTrack,
  getClipDuration,
} from './voiceoverCutter';
import {
  AnimationProject,
  CustomVoiceoverTrack,
  NARRATOR_VOICE_IDS,
  NarratorSettings,
  NarratorVoiceId,
  SfxCue,
  SfxKind,
  SubtitleCue,
  VoiceoverClip,
  VoiceoverSourceAsset,
} from './types';

function createNoiseBuffer(
  ctx: BaseAudioContext,
  durationSec: number,
  seed = 1337,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  // Deterministic PRNG so offline renders & live playback sound consistent
  let state = seed >>> 0 || 1;
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[i] = (state / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// 1. AI Studio Narrator TTS Client & Decoded AudioBuffer Cache
// ---------------------------------------------------------------------------

export interface NarratorServerStatus {
  aiAvailable: boolean;
  model: string;
  voices: NarratorVoiceId[];
}

export interface VoicePreGenProgress {
  completed: number;
  total: number;
  failed: number;
  lastError: string | null;
}

const decodedVoiceCache = new Map<string, AudioBuffer>();
const inflightVoiceRequests = new Map<string, Promise<AudioBuffer | null>>();
let sharedDecodeCtx: AudioContext | null = null;

function getDecodeContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedDecodeCtx && sharedDecodeCtx.state !== 'closed') {
    return sharedDecodeCtx;
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    sharedDecodeCtx = new AudioCtx();
    return sharedDecodeCtx;
  } catch {
    return null;
  }
}

export const MAX_CUSTOM_VOICEOVER_BYTES = 40 * 1024 * 1024; // 40 MB

export async function decodeVoiceoverSourceAsset(
  file: File,
): Promise<VoiceoverSourceAsset> {
  if (file.size === 0) {
    throw new Error('Selected audio file is empty.');
  }
  if (file.size > MAX_CUSTOM_VOICEOVER_BYTES) {
    throw new Error('Audio file exceeds the 40 MB limit. Please upload a smaller clip.');
  }

  const ctx = getDecodeContext();
  if (!ctx) {
    throw new Error('Web Audio API is unavailable in this browser.');
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    throw new Error('Unable to read the selected audio file.');
  }

  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw new Error(
      'Unsupported or corrupted audio format. Please upload MP3, WAV, M4A, OGG, or WebM audio.',
    );
  }

  if (!decoded || decoded.duration < 0.05) {
    throw new Error('Audio clip is too short to merge.');
  }

  return {
    id: `vo_asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fileName: file.name || 'custom-voiceover.wav',
    mimeType: file.type || 'audio/wav',
    durationSec: decoded.duration,
    audioBuffer: decoded,
    waveformPeaks: extractWaveformPeaks(decoded, 160),
    duckIntervals: extractCustomVoiceoverDuckIntervals(decoded, 0),
  };
}

export async function decodeCustomVoiceoverFile(
  file: File,
  existingTrack: CustomVoiceoverTrack | null = null,
  defaultStartSec = 0,
): Promise<CustomVoiceoverTrack> {
  const asset = await decodeVoiceoverSourceAsset(file);
  return appendVoiceoverAssetToTrack(existingTrack, asset, defaultStartSec);
}

export function resolveCueVoice(
  cue: SubtitleCue,
  settings: NarratorSettings,
): NarratorVoiceId {
  if (cue.voiceOverride && NARRATOR_VOICE_IDS.includes(cue.voiceOverride)) {
    return cue.voiceOverride;
  }
  const isVo =
    cue.role === 'voiceover' ||
    (cue.speaker ?? '').trim().toLowerCase() === 'narrator';
  if (isVo) {
    return settings.voice;
  }

  const speakerLower = (cue.speaker ?? '').toLowerCase();
  if (
    speakerLower.includes('woman') ||
    speakerLower.includes('gossiper') ||
    speakerLower.includes('bride') ||
    speakerLower.includes('waitress') ||
    speakerLower.includes('maya')
  ) {
    return settings.voice === 'Kore' ? 'Zephyr' : 'Kore';
  }
  if (
    speakerLower.includes('noob') ||
    speakerLower.includes('tourist') ||
    speakerLower.includes('gamer') ||
    speakerLower.includes('groomsman')
  ) {
    return settings.voice === 'Puck' ? 'Zephyr' : 'Puck';
  }
  if (
    speakerLower.includes('knight') ||
    speakerLower.includes('chef') ||
    speakerLower.includes('exec') ||
    speakerLower.includes('shakespeare')
  ) {
    return settings.voice === 'Fenrir' ? 'Charon' : 'Fenrir';
  }
  // Deterministic fallback hash across voices
  let hash = 0;
  for (let i = 0; i < speakerLower.length; i++) {
    hash = (hash * 31 + speakerLower.charCodeAt(i)) >>> 0;
  }
  const pool = NARRATOR_VOICE_IDS.filter((v) => v !== settings.voice);
  return pool[hash % pool.length] ?? 'Puck';
}

export function getNarratorCacheKey(
  cue: SubtitleCue,
  rawSettings?: Partial<NarratorSettings> | null,
): string {
  const settings = resolveNarratorSettings(rawSettings);
  const voice = resolveCueVoice(cue, settings);
  const role = cue.role === 'voiceover' ? 'voiceover' : 'dialogue';
  const cleanText = stripCaptionMarkup(cue.text);
  return `${voice}|${role}|${role === 'voiceover' ? settings.style : 'dialogue'}|${cleanText}`;
}

export function getCachedCueAudio(
  cue: SubtitleCue,
  rawSettings?: Partial<NarratorSettings> | null,
): AudioBuffer | null {
  return decodedVoiceCache.get(getNarratorCacheKey(cue, rawSettings)) ?? null;
}

export function getCachedCueDuration(
  cue: SubtitleCue,
  rawSettings?: Partial<NarratorSettings> | null,
): number | undefined {
  const settings = resolveNarratorSettings(rawSettings);
  const buf = getCachedCueAudio(cue, settings);
  if (!buf) return undefined;
  return buf.duration / Math.max(0.5, settings.speed);
}

export function countVoiceCuesInRange(
  project: AnimationProject,
  startSec: number,
  endSec: number,
): number {
  let count = 0;
  for (const cue of project.subtitles) {
    if (!cue.text.trim()) continue;
    if (cue.endTime > startSec + 0.05 && cue.startTime < endSec - 0.05) {
      count++;
    }
  }
  return count;
}

export function countCachedProjectVoices(
  project: AnimationProject,
  range?: { start: number; end: number },
): { cached: number; total: number } {
  const settings = resolveNarratorSettings(project.narratorSettings);
  const cues = project.subtitles.filter((c) => {
    if (!c.text.trim()) return false;
    if (!range) return true;
    return c.endTime > range.start + 0.05 && c.startTime < range.end - 0.05;
  });
  let cached = 0;
  for (const cue of cues) {
    if (decodedVoiceCache.has(getNarratorCacheKey(cue, settings))) {
      cached++;
    }
  }
  return { cached, total: cues.length };
}

export async function fetchNarratorStatus(): Promise<NarratorServerStatus> {
  try {
    const res = await fetch('/api/narrator/status');
    if (!res.ok) {
      return {
        aiAvailable: false,
        model: 'gemini-3.8-flash-lite-tts',
        voices: [...NARRATOR_VOICE_IDS],
      };
    }
    const data = (await res.json()) as Partial<NarratorServerStatus>;
    return {
      aiAvailable: Boolean(data.aiAvailable),
      model: typeof data.model === 'string' ? data.model : 'gemini-3.8-flash-lite-tts',
      voices: Array.isArray(data.voices) ? data.voices : [...NARRATOR_VOICE_IDS],
    };
  } catch {
    return {
      aiAvailable: false,
      model: 'gemini-3.8-flash-lite-tts',
      voices: [...NARRATOR_VOICE_IDS],
    };
  }
}

export async function synthesizeCueAiAudio(
  cue: SubtitleCue,
  rawSettings?: Partial<NarratorSettings> | null,
  decodeCtx?: AudioContext | null,
): Promise<{ buffer: AudioBuffer | null; error: string | null }> {
  const settings = resolveNarratorSettings(rawSettings);
  const key = getNarratorCacheKey(cue, settings);
  const existing = decodedVoiceCache.get(key);
  if (existing) {
    return { buffer: existing, error: null };
  }

  const inflight = inflightVoiceRequests.get(key);
  if (inflight) {
    const buf = await inflight;
    return { buffer: buf, error: buf ? null : 'Unable to generate AI voice clip.' };
  }

  const voice = resolveCueVoice(cue, settings);
  const role = cue.role === 'voiceover' ? 'voiceover' : 'dialogue';
  const cleanText = stripCaptionMarkup(cue.text);
  if (!cleanText) {
    return { buffer: null, error: 'Subtitle text is empty.' };
  }

  let capturedError: string | null = null;
  const promise = (async (): Promise<AudioBuffer | null> => {
    try {
      const response = await fetch('/api/narrator/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice,
          style: settings.style,
          role,
        }),
      });

      if (!response.ok) {
        let msg = `AI voice request failed (${response.status}).`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) msg = payload.error;
        } catch {
          // Non-JSON error body
        }
        capturedError = msg;
        return null;
      }

      const wavBytes = await response.arrayBuffer();
      const ctx = decodeCtx ?? getDecodeContext();
      if (!ctx) {
        capturedError = 'Web Audio decoder is unavailable in this browser.';
        return null;
      }

      const decoded = await ctx.decodeAudioData(wavBytes.slice(0));
      decodedVoiceCache.set(key, decoded);
      return decoded;
    } catch (err) {
      capturedError =
        err instanceof Error ? err.message : 'Network error generating narrator audio.';
      return null;
    } finally {
      inflightVoiceRequests.delete(key);
    }
  })();

  inflightVoiceRequests.set(key, promise);
  const buffer = await promise;
  return { buffer, error: capturedError };
}

export async function pregenerateProjectVoices(
  project: AnimationProject,
  range?: { start: number; end: number },
  onProgress?: (progress: VoicePreGenProgress) => void,
): Promise<VoicePreGenProgress> {
  const settings = resolveNarratorSettings(project.narratorSettings);
  const cues = project.subtitles.filter((c) => {
    if (!c.text.trim()) return false;
    if (!range) return true;
    return c.endTime > range.start + 0.05 && c.startTime < range.end - 0.05;
  });

  const progress: VoicePreGenProgress = {
    completed: 0,
    total: cues.length,
    failed: 0,
    lastError: null,
  };
  onProgress?.({ ...progress });

  if (cues.length === 0) return progress;

  // Deduplicate identical cue cache keys so shared lines only synthesize once
  const uniqueByKey = new Map<string, SubtitleCue[]>();
  for (const cue of cues) {
    const key = getNarratorCacheKey(cue, settings);
    const list = uniqueByKey.get(key) ?? [];
    list.push(cue);
    uniqueByKey.set(key, list);
  }

  const workItems = Array.from(uniqueByKey.values());
  let cursor = 0;

  const worker = async () => {
    while (cursor < workItems.length) {
      const idx = cursor++;
      const group = workItems[idx];
      const rep = group[0];
      const { buffer, error } = await synthesizeCueAiAudio(rep, settings);
      if (buffer) {
        progress.completed += group.length;
      } else {
        progress.failed += group.length;
        if (error) progress.lastError = error;
      }
      onProgress?.({ ...progress });
    }
  };

  const concurrency = Math.min(2, workItems.length);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return progress;
}

// ---------------------------------------------------------------------------
// 2. Procedural SFX Synthesizer
// ---------------------------------------------------------------------------

export function scheduleSfxCue(
  ctx: BaseAudioContext,
  out: GainNode,
  cue: SfxCue,
  atTime: number,
  trackNode?: <T extends AudioScheduledSourceNode>(node: T) => T,
): void {
  const track = <T extends AudioScheduledSourceNode>(node: T): T =>
    trackNode ? trackNode(node) : node;

  const now = Math.max(0, atTime);
  const vol = Math.max(0.05, Math.min(1, cue.volume ?? 0.75));
  const kind: SfxKind = cue.kind;
  const seed = Math.abs(Math.round((cue.time + 1) * 9973)) + kind.length * 31;

  if (kind === 'smashCutSilence') {
    out.gain.setValueAtTime(1, Math.max(0, now - 0.005));
    out.gain.linearRampToValueAtTime(0.0001, now + 0.04);
    return;
  }

  out.gain.setValueAtTime(1, now);

  switch (kind) {
    case 'thunder': {
      const noise = track(ctx.createBufferSource());
      noise.buffer = createNoiseBuffer(ctx, 2.2, seed);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, now);
      filter.frequency.exponentialRampToValueAtTime(55, now + 2.0);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.95, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
      noise.connect(filter).connect(gain).connect(out);
      noise.start(now);
      noise.stop(now + 2.15);
      break;
    }

    case 'catsDogsRain': {
      const rain = track(ctx.createBufferSource());
      rain.buffer = createNoiseBuffer(ctx, 2.5, seed);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      const rGain = ctx.createGain();
      rGain.gain.setValueAtTime(0.001, now);
      rGain.gain.linearRampToValueAtTime(vol * 0.28, now + 0.3);
      rGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
      rain.connect(bp).connect(rGain).connect(out);
      rain.start(now);
      rain.stop(now + 2.45);

      const bark = track(ctx.createOscillator());
      bark.type = 'sawtooth';
      bark.frequency.setValueAtTime(290, now + 0.35);
      bark.frequency.exponentialRampToValueAtTime(150, now + 0.52);
      const bGain = ctx.createGain();
      bGain.gain.setValueAtTime(0.001, now + 0.34);
      bGain.gain.linearRampToValueAtTime(vol * 0.35, now + 0.37);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
      bark.connect(bGain).connect(out);
      bark.start(now + 0.34);
      bark.stop(now + 0.56);

      const meow = track(ctx.createOscillator());
      meow.type = 'triangle';
      meow.frequency.setValueAtTime(620, now + 1.05);
      meow.frequency.linearRampToValueAtTime(860, now + 1.2);
      meow.frequency.exponentialRampToValueAtTime(480, now + 1.48);
      const mGain = ctx.createGain();
      mGain.gain.setValueAtTime(0.001, now + 1.04);
      mGain.gain.linearRampToValueAtTime(vol * 0.25, now + 1.12);
      mGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      meow.connect(mGain).connect(out);
      meow.start(now + 1.04);
      meow.stop(now + 1.52);
      break;
    }

    case 'umbrellaClang': {
      const freqs = [520, 785, 1180];
      freqs.forEach((f, idx) => {
        const osc = track(ctx.createOscillator());
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + 0.45);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * (0.38 / (idx + 1)), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(g).connect(out);
        osc.start(now);
        osc.stop(now + 0.58);
      });
      break;
    }

    case 'cafeChatter': {
      const hiss = track(ctx.createBufferSource());
      hiss.buffer = createNoiseBuffer(ctx, 1.8, seed);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol * 0.2, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.75);
      hiss.connect(bp).connect(g).connect(out);
      hiss.start(now);
      hiss.stop(now + 1.8);
      break;
    }

    case 'beanCascade': {
      const noise = track(ctx.createBufferSource());
      noise.buffer = createNoiseBuffer(ctx, 2.8, seed);
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 2600;
      hp.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol * 0.65, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.7);
      noise.connect(hp).connect(g).connect(out);
      noise.start(now);
      noise.stop(now + 2.75);
      break;
    }

    case 'officeSilence': {
      const hum = track(ctx.createOscillator());
      hum.type = 'sine';
      hum.frequency.value = 60;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol * 0.14, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      hum.connect(g).connect(out);
      hum.start(now);
      hum.stop(now + 2.25);
      break;
    }

    case 'staplerCrunch': {
      for (const tOff of [0, 0.22]) {
        const osc = track(ctx.createOscillator());
        osc.type = 'square';
        osc.frequency.setValueAtTime(280, now + tOff);
        osc.frequency.exponentialRampToValueAtTime(90, now + tOff + 0.08);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.45, now + tOff);
        g.gain.exponentialRampToValueAtTime(0.001, now + tOff + 0.1);
        osc.connect(g).connect(out);
        osc.start(now + tOff);
        osc.stop(now + tOff + 0.12);
      }
      break;
    }

    case 'elephantTrumpet': {
      const osc = track(ctx.createOscillator());
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(340, now + 1.05);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 2.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol * 0.72, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
      osc.connect(f).connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 1.2);
      break;
    }

    case 'weddingOrganScratch': {
      const notes = [261.6, 329.6, 392.0];
      notes.forEach((freq) => {
        const osc = track(ctx.createOscillator());
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.65, now + 0.72);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
        osc.connect(g).connect(out);
        osc.start(now);
        osc.stop(now + 0.8);
      });
      break;
    }

    case 'iceCrackWhir': {
      const crack = track(ctx.createBufferSource());
      crack.buffer = createNoiseBuffer(ctx, 0.35, seed);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2200;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(vol * 0.75, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      crack.connect(hp).connect(cg).connect(out);
      crack.start(now);
      crack.stop(now + 0.35);

      const whir = track(ctx.createBufferSource());
      whir.buffer = createNoiseBuffer(ctx, 2.0, seed + 19);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 650;
      bp.Q.value = 3;
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.001, now + 0.4);
      wg.gain.linearRampToValueAtTime(vol * 0.36, now + 0.7);
      wg.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
      whir.connect(bp).connect(wg).connect(out);
      whir.start(now + 0.4);
      whir.stop(now + 2.35);
      break;
    }

    case 'legSnap': {
      const snap = track(ctx.createBufferSource());
      snap.buffer = createNoiseBuffer(ctx, 0.16, seed);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.9, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      snap.connect(bp).connect(g).connect(out);
      snap.start(now);
      snap.stop(now + 0.16);
      break;
    }

    case 'ambulanceSiren': {
      const osc = track(ctx.createOscillator());
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(920, now + 0.45);
      osc.frequency.linearRampToValueAtTime(620, now + 0.9);
      osc.frequency.linearRampToValueAtTime(920, now + 1.35);
      osc.frequency.linearRampToValueAtTime(620, now + 1.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol * 0.28, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.85);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 1.9);
      break;
    }

    case 'dinerClatter': {
      for (let i = 0; i < 3; i++) {
        const osc = track(ctx.createOscillator());
        osc.type = 'sine';
        osc.frequency.value = 1200 + i * 430;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.16, now + i * 0.16);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.25);
        osc.connect(g).connect(out);
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.28);
      }
      break;
    }

    case 'horseCartNeigh': {
      const osc = track(ctx.createOscillator());
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.18);
      osc.frequency.linearRampToValueAtTime(520, now + 0.45);
      osc.frequency.linearRampToValueAtTime(340, now + 0.9);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol * 0.5, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc.connect(bp).connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 1.0);
      break;
    }

    case 'crowdPanicScreech': {
      const screech = track(ctx.createOscillator());
      screech.type = 'sawtooth';
      screech.frequency.setValueAtTime(920, now);
      screech.frequency.exponentialRampToValueAtTime(340, now + 0.65);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      screech.connect(g).connect(out);
      screech.start(now);
      screech.stop(now + 0.75);
      break;
    }
  }
}

export function countSfxCuesInRange(
  project: AnimationProject,
  startSec: number,
  endSec: number,
): number {
  const sfxTrack = project.sfxTrack ?? [];
  let count = 0;
  for (const cue of sfxTrack) {
    if (cue.time >= startSec - 0.05 && cue.time < endSec) {
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 3. Offline Export Audio Mixer (AI Narrator Voices + Auto-Ducked SFX)
// ---------------------------------------------------------------------------

export async function renderProjectAudioOffline(
  project: AnimationProject,
  startSec: number,
  endSec: number,
  sampleRate = 48000,
  customVoiceover?: CustomVoiceoverTrack | null,
): Promise<AudioBuffer | null> {
  if (typeof window === 'undefined') return null;
  const durationSec = Math.max(0.1, endSec - startSec);
  const narratorSettings = resolveNarratorSettings(project.narratorSettings);

  const sfxTrack = (project.sfxTrack ?? [])
    .filter((cue) => cue.time >= startSec - 0.05 && cue.time < endSec)
    .sort((a, b) => a.time - b.time);

  const normalizedCustomVo =
    customVoiceover && (customVoiceover.audioBuffer || customVoiceover.clips?.length)
      ? ensureMultiClipVoiceoverTrack(customVoiceover)
      : null;
  const activeCustomClips = normalizedCustomVo
    ? (normalizedCustomVo.clips ?? []).filter(
        (c) => !c.muted && normalizedCustomVo.assets?.[c.assetId]?.audioBuffer,
      )
    : [];
  const hasCustomVo = activeCustomClips.length > 0;

  const voiceClips: { cue: SubtitleCue; buffer: AudioBuffer }[] = [];
  if (!hasCustomVo) {
    for (const sub of project.subtitles) {
      if (sub.endTime <= startSec + 0.05 || sub.startTime >= endSec - 0.05) continue;
      const buf = getCachedCueAudio(sub, narratorSettings);
      if (buf) {
        voiceClips.push({ cue: sub, buffer: buf });
      }
    }
  }

  if (sfxTrack.length === 0 && voiceClips.length === 0 && !hasCustomVo) {
    return null;
  }

  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (!OfflineCtx) {
    return null;
  }

  try {
    const totalSamples = Math.max(1, Math.ceil(durationSec * sampleRate));
    const offlineCtx = new OfflineCtx(2, totalSamples, sampleRate);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.86;

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -8;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.14;

    const sfxGain = offlineCtx.createGain();
    sfxGain.gain.value = 1;

    const sfxDuckGain = offlineCtx.createGain();
    sfxDuckGain.gain.value = 1;

    const voiceGain = offlineCtx.createGain();
    voiceGain.gain.value = hasCustomVo
      ? Math.max(0.2, Math.min(1.5, normalizedCustomVo!.volume))
      : narratorSettings.volume;

    sfxGain.connect(sfxDuckGain);
    sfxDuckGain.connect(compressor);
    voiceGain.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    // Schedule SFX cues
    for (const cue of sfxTrack) {
      const localTime = Math.max(0, cue.time - startSec);
      scheduleSfxCue(offlineCtx, sfxGain, cue, localTime);
    }

    const duckIntervals: { start: number; end: number }[] = [];
    const shouldDuckSfx = hasCustomVo
      ? normalizedCustomVo!.autoDuckSfx
      : narratorSettings.autoDuckSfx;

    if (hasCustomVo && normalizedCustomVo) {
      const assets = normalizedCustomVo.assets ?? {};

      // Schedule every non-muted trimmed/split VoiceoverClip with per-clip gain & fade-in/out ramps
      for (const clip of activeCustomClips) {
        const asset = assets[clip.assetId];
        if (!asset?.audioBuffer) continue;
        const clipDur = getClipDuration(clip);
        const clipStart = clip.startSec;
        const clipEnd = clipStart + clipDur;

        if (clipEnd <= startSec + 0.01 || clipStart >= endSec - 0.01) continue;

        const intersectStart = Math.max(startSec, clipStart);
        const intersectEnd = Math.min(endSec, clipEnd);
        const playLen = intersectEnd - intersectStart;
        if (playLen <= 0.01) continue;

        const localWhen = Math.max(0, intersectStart - startSec);
        const clipOffset = Math.max(0, intersectStart - clipStart);
        const sourceOffset = Math.min(
          asset.audioBuffer.duration - 0.01,
          Math.max(0, clip.sourceStartSec + clipOffset),
        );

        const voSrc = offlineCtx.createBufferSource();
        voSrc.buffer = asset.audioBuffer;

        const clipGainNode = offlineCtx.createGain();
        const peakGain = Math.max(0.2, Math.min(1.5, clip.volume ?? 1.0));
        const fadeInEndInClip = clip.fadeInSec;
        const fadeOutStartInClip = Math.max(0, clipDur - clip.fadeOutSec);

        // Automate smooth fade-in and fade-out ramps across the exported intersection window
        let startGain = peakGain;
        if (clip.fadeInSec > 0.01 && clipOffset < fadeInEndInClip) {
          startGain = peakGain * (clipOffset / clip.fadeInSec);
        }
        if (clip.fadeOutSec > 0.01 && clipOffset > fadeOutStartInClip) {
          startGain =
            peakGain * Math.max(0, (clipDur - clipOffset) / clip.fadeOutSec);
        }
        clipGainNode.gain.setValueAtTime(Math.max(0.0001, startGain), localWhen);

        if (clip.fadeInSec > 0.01 && clipOffset < fadeInEndInClip) {
          const rampReach = Math.min(
            localWhen + playLen,
            localWhen + (fadeInEndInClip - clipOffset),
          );
          clipGainNode.gain.linearRampToValueAtTime(peakGain, rampReach);
        }

        const clipEndOffset = clipOffset + playLen;
        if (clip.fadeOutSec > 0.01 && clipEndOffset > fadeOutStartInClip) {
          const rampStartLocal = Math.max(
            localWhen,
            localWhen + (fadeOutStartInClip - clipOffset),
          );
          const endGain =
            peakGain *
            Math.max(0, (clipDur - clipEndOffset) / clip.fadeOutSec);
          clipGainNode.gain.setValueAtTime(peakGain, rampStartLocal);
          clipGainNode.gain.linearRampToValueAtTime(
            Math.max(0.0001, endGain),
            localWhen + playLen,
          );
        }

        voSrc.connect(clipGainNode).connect(voiceGain);
        voSrc.start(localWhen, sourceOffset, playLen);
      }

      // Project vocal-activity intervals across all active clips into local export window [0, durationSec]
      const trackIntervals = computeTrackDuckIntervals(
        assets,
        activeCustomClips,
      );
      for (const iv of trackIntervals) {
        const s = iv.start - startSec;
        const e = iv.end - startSec;
        if (e <= 0 || s >= durationSec) continue;
        duckIntervals.push({
          start: Math.max(0, s),
          end: Math.min(durationSec, e),
        });
      }
    } else {
      // Schedule AI narrator & character voice buffers + SFX auto-ducking envelopes
      const rate = Math.max(0.75, Math.min(1.4, narratorSettings.speed));
      const detuneCents = narratorSettings.pitchSemitones * 100;

      for (const { cue, buffer } of voiceClips) {
        const localStart = cue.startTime - startSec;
        const maxWindow = Math.max(
          0.15,
          Math.min(endSec, cue.endTime + 0.35) - Math.max(startSec, cue.startTime),
        );
        const clipPlayDuration = Math.min(maxWindow, buffer.duration / rate);

        const src = offlineCtx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        if (typeof src.detune?.value === 'number') {
          src.detune.value = detuneCents;
        }

        const clipGain = offlineCtx.createGain();
        clipGain.gain.value = cue.role === 'voiceover' ? 1.0 : 0.92;
        src.connect(clipGain).connect(voiceGain);

        if (localStart >= 0) {
          src.start(localStart, 0, clipPlayDuration * rate);
          duckIntervals.push({ start: localStart, end: localStart + clipPlayDuration });
        } else {
          const offsetSec = -localStart * rate;
          if (offsetSec < buffer.duration) {
            const remaining = Math.min(maxWindow, (buffer.duration - offsetSec) / rate);
            src.start(0, offsetSec, remaining * rate);
            duckIntervals.push({ start: 0, end: remaining });
          }
        }
      }
    }

    // Merge overlapping duck intervals and automate smooth SFX ducking
    if (shouldDuckSfx && duckIntervals.length > 0 && sfxTrack.length > 0) {
      duckIntervals.sort((a, b) => a.start - b.start);
      const merged: { start: number; end: number }[] = [];
      for (const iv of duckIntervals) {
        const last = merged[merged.length - 1];
        if (last && iv.start <= last.end + 0.18) {
          last.end = Math.max(last.end, iv.end);
        } else {
          merged.push({ ...iv });
        }
      }
      const duckedGain = Math.max(0.18, 1 - narratorSettings.duckAmount);
      sfxDuckGain.gain.setValueAtTime(1, 0);
      for (const iv of merged) {
        const downStart = Math.max(0, iv.start - 0.08);
        const downReach = Math.max(downStart + 0.02, iv.start);
        const upStart = Math.min(durationSec, iv.end);
        const upReach = Math.min(durationSec, iv.end + 0.22);
        sfxDuckGain.gain.setValueAtTime(1, downStart);
        sfxDuckGain.gain.linearRampToValueAtTime(duckedGain, downReach);
        sfxDuckGain.gain.setValueAtTime(duckedGain, upStart);
        sfxDuckGain.gain.linearRampToValueAtTime(1, upReach);
      }
    }

    return await offlineCtx.startRendering();
  } catch {
    return null;
  }
}

export function trimAudioBuffer(
  source: AudioBuffer,
  maxDurationSec: number,
): AudioBuffer {
  const maxSamples = Math.max(
    1,
    Math.min(source.length, Math.ceil(maxDurationSec * source.sampleRate)),
  );
  if (maxSamples >= source.length) {
    return source;
  }
  if (typeof AudioBuffer === 'undefined') {
    return source;
  }
  try {
    const trimmed = new AudioBuffer({
      length: maxSamples,
      numberOfChannels: source.numberOfChannels,
      sampleRate: source.sampleRate,
    });
    for (let ch = 0; ch < source.numberOfChannels; ch++) {
      const srcData = source.getChannelData(ch);
      trimmed.copyToChannel(srcData.subarray(0, maxSamples), ch);
    }
    return trimmed;
  } catch {
    return source;
  }
}

// ---------------------------------------------------------------------------
// 4. Smart Browser SpeechSynthesis Voice Matcher (Fallback & Instant Preview)
// ---------------------------------------------------------------------------

function pickBrowserVoice(
  preferredVoiceId: NarratorVoiceId,
  isVoiceover: boolean,
  speakerLower: string,
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = english.length > 0 ? english : voices;

  const preferFem =
    preferredVoiceId === 'Kore' ||
    preferredVoiceId === 'Zephyr' ||
    (!isVoiceover &&
      (speakerLower.includes('woman') ||
        speakerLower.includes('gossiper') ||
        speakerLower.includes('bride') ||
        speakerLower.includes('waitress')));

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase();
    let score = 0;
    if (/natural|neural|google|enhanced|premium|samantha|daniel|alex|aria|guy/i.test(name)) {
      score += 4;
    }
    if (preferFem && /female|samantha|victoria|karen|aria|jenny|zira|google us english/i.test(name)) {
      score += 3;
    }
    if (!preferFem && /male|daniel|alex|david|guy|mark|google uk english male/i.test(name)) {
      score += 3;
    }
    if (v.localService) score += 1;
    return score;
  };

  let best = pool[0];
  let bestScore = -1;
  for (const v of pool) {
    const s = scoreVoice(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best ?? null;
}

// ---------------------------------------------------------------------------
// 5. Real-Time Live Playback Audio Engine (AI Studio Voice + Auto-Ducking)
// ---------------------------------------------------------------------------

export class EpisodeAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private sfxDuckGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;

  private activeStoppables: Set<{ stop: (when?: number) => void }> = new Set();
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private activeCustomVoSources = new Map<string, AudioBufferSourceNode>();
  private customVoiceover: CustomVoiceoverTrack | null = null;
  private startedCustomClipIds = new Set<string>();
  private customVoDucked = false;
  private firedSfxIds = new Set<string>();
  private spokenSubIds = new Set<string>();
  private lastTime = -1;
  private muted = false;
  private activeDuckCount = 0;

  public setCustomVoiceover(track: CustomVoiceoverTrack | null): void {
    this.customVoiceover = track ? ensureMultiClipVoiceoverTrack(track) : null;
    this.stopCustomVoiceover();
  }

  public stopCustomVoiceover(): void {
    for (const src of this.activeCustomVoSources.values()) {
      try {
        src.onended = null;
        src.stop();
      } catch {
        // Ignore already stopped source
      }
    }
    this.activeCustomVoSources.clear();
    this.startedCustomClipIds.clear();
    if (this.customVoDucked) {
      this.customVoDucked = false;
      this.endSfxDuck();
    }
  }

  public auditionCustomVoiceover(
    track: CustomVoiceoverTrack,
    onEnded?: () => void,
    clipId?: string | null,
  ): void {
    this.unlock();
    this.stopAllSpeech();
    if (!this.ctx || !this.voiceGain) return;

    const normalized = ensureMultiClipVoiceoverTrack(track);
    const assets = normalized.assets ?? {};
    const targetClips: VoiceoverClip[] = clipId
      ? (normalized.clips ?? []).filter((c) => c.id === clipId && assets[c.assetId])
      : (normalized.clips ?? []).filter((c) => !c.muted && assets[c.assetId]);

    if (targetClips.length === 0) {
      onEnded?.();
      return;
    }

    const minStart = Math.min(...targetClips.map((c) => c.startSec));
    let remainingCount = targetClips.length;
    const now = this.ctx.currentTime;

    for (const clip of targetClips) {
      const asset = assets[clip.assetId];
      if (!asset?.audioBuffer) {
        remainingCount--;
        continue;
      }
      const clipDur = getClipDuration(clip);
      const delaySec = Math.max(0, clip.startSec - minStart);
      const startAt = now + delaySec;

      const src = this.ctx.createBufferSource();
      src.buffer = asset.audioBuffer;
      const gain = this.ctx.createGain();
      const peakGain = Math.max(
        0.05,
        Math.min(2.0, normalized.volume * (clip.volume ?? 1.0)),
      );

      if (clip.fadeInSec > 0.01) {
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.linearRampToValueAtTime(
          peakGain,
          startAt + Math.min(clipDur * 0.48, clip.fadeInSec),
        );
      } else {
        gain.gain.setValueAtTime(peakGain, startAt);
      }
      if (clip.fadeOutSec > 0.01) {
        const fadeOutDuration = Math.min(clipDur * 0.48, clip.fadeOutSec);
        gain.gain.setValueAtTime(
          peakGain,
          startAt + Math.max(0, clipDur - fadeOutDuration),
        );
        gain.gain.linearRampToValueAtTime(0.0001, startAt + clipDur);
      }

      src.connect(gain).connect(this.voiceGain);
      this.activeCustomVoSources.set(clip.id, src);
      src.onended = () => {
        this.activeCustomVoSources.delete(clip.id);
        remainingCount--;
        if (remainingCount <= 0) {
          onEnded?.();
        }
      };
      try {
        src.start(startAt, clip.sourceStartSec, clipDur);
      } catch {
        this.activeCustomVoSources.delete(clip.id);
        remainingCount--;
        if (remainingCount <= 0) {
          onEnded?.();
        }
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.84;
      this.masterGain.connect(this.ctx.destination);

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -10;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 3.5;
      this.compressor.connect(this.masterGain);

      this.sfxDuckGain = this.ctx.createGain();
      this.sfxDuckGain.gain.value = 1;
      this.sfxDuckGain.connect(this.compressor);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.sfxDuckGain);

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = 0.92;
      this.voiceGain.connect(this.compressor);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  private beginSfxDuck(settings: NarratorSettings): void {
    if (!settings.autoDuckSfx || !this.ctx || !this.sfxDuckGain) return;
    this.activeDuckCount++;
    const now = this.ctx.currentTime;
    const target = Math.max(0.18, 1 - settings.duckAmount);
    this.sfxDuckGain.gain.cancelScheduledValues(now);
    this.sfxDuckGain.gain.setValueAtTime(this.sfxDuckGain.gain.value, now);
    this.sfxDuckGain.gain.linearRampToValueAtTime(target, now + 0.08);
  }

  private endSfxDuck(): void {
    if (this.activeDuckCount > 0) this.activeDuckCount--;
    if (this.activeDuckCount > 0 || !this.ctx || !this.sfxDuckGain) return;
    const now = this.ctx.currentTime;
    this.sfxDuckGain.gain.cancelScheduledValues(now);
    this.sfxDuckGain.gain.setValueAtTime(this.sfxDuckGain.gain.value, now);
    this.sfxDuckGain.gain.linearRampToValueAtTime(1, now + 0.24);
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        nextMuted ? 0 : 0.84,
        this.ctx.currentTime,
      );
    }
    if (nextMuted) {
      this.stopAllSpeech();
      this.stopAllSfx();
    }
  }

  public resetPlayback(time = 0): void {
    this.firedSfxIds.clear();
    this.spokenSubIds.clear();
    this.lastTime = time;
    this.stopAllSfx();
    this.stopAllSpeech();
  }

  public stopAllSfx(): void {
    for (const node of this.activeStoppables) {
      try {
        node.stop();
      } catch {
        // Ignore already stopped nodes
      }
    }
    this.activeStoppables.clear();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(1, this.ctx.currentTime);
    }
  }

  public stopAllSpeech(): void {
    this.stopCustomVoiceover();
    if (this.activeVoiceSource) {
      try {
        this.activeVoiceSource.onended = null;
        this.activeVoiceSource.stop();
      } catch {
        // Ignore already stopped source
      }
      this.activeVoiceSource = null;
    }
    this.activeDuckCount = 0;
    if (this.sfxDuckGain && this.ctx) {
      this.sfxDuckGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxDuckGain.gain.setValueAtTime(1, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore restricted speech contexts
      }
    }
  }

  public dispose(): void {
    this.stopAllSfx();
    this.stopAllSpeech();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
      this.compressor = null;
      this.sfxGain = null;
      this.sfxDuckGain = null;
      this.voiceGain = null;
    }
  }

  public sync(
    project: AnimationProject,
    time: number,
    isPlaying: boolean,
    playbackSpeed = 1,
  ): void {
    if (!isPlaying) {
      if (this.lastTime !== -1) {
        this.stopAllSpeech();
        this.stopAllSfx();
        this.spokenSubIds.clear();
        this.firedSfxIds.clear();
      }
      this.lastTime = time;
      return;
    }

    if (
      this.lastTime < 0 ||
      time < this.lastTime - 0.1 ||
      time - this.lastTime > 0.75
    ) {
      this.firedSfxIds.clear();
      this.spokenSubIds.clear();
      this.stopAllSfx();
      this.stopAllSpeech();
    }
    this.lastTime = time;

    if (this.muted) return;

    const narratorSettings = resolveNarratorSettings(project.narratorSettings);

    const sfxTrack = project.sfxTrack ?? [];
    for (const cue of sfxTrack) {
      if (this.firedSfxIds.has(cue.id)) continue;
      if (time >= cue.time && time - cue.time <= 0.45) {
        this.firedSfxIds.add(cue.id);
        this.triggerSfx(cue);
      }
    }

    if (this.customVoiceover) {
      this.syncCustomVoiceoverPlayback(
        this.customVoiceover,
        narratorSettings,
        time,
        playbackSpeed,
      );
      return;
    }

    for (const sub of project.subtitles) {
      if (this.spokenSubIds.has(sub.id)) continue;
      if (time >= sub.startTime && time < sub.endTime - 0.15) {
        this.spokenSubIds.add(sub.id);
        this.speakSubtitle(sub, narratorSettings, playbackSpeed);
      }
    }
  }

  private syncCustomVoiceoverPlayback(
    track: CustomVoiceoverTrack,
    narratorSettings: NarratorSettings,
    time: number,
    playbackSpeed: number,
  ): void {
    const assets = track.assets ?? {};
    const clips = (track.clips ?? []).filter(
      (c) => !c.muted && assets[c.assetId]?.audioBuffer,
    );
    const rate = Math.max(0.5, Math.min(2, playbackSpeed));

    for (const clip of clips) {
      if (this.startedCustomClipIds.has(clip.id)) continue;
      const asset = assets[clip.assetId];
      if (!asset?.audioBuffer) continue;

      const clipDur = getClipDuration(clip);
      const offsetIntoClip = time - clip.startSec;
      if (offsetIntoClip >= 0 && offsetIntoClip < clipDur - 0.04) {
        this.unlock();
        if (this.ctx && this.voiceGain) {
          const remainingClipDur = clipDur - offsetIntoClip;
          const wallPlayDur = remainingClipDur / rate;
          const sourceOffset = Math.min(
            asset.audioBuffer.duration - 0.01,
            Math.max(0, clip.sourceStartSec + offsetIntoClip),
          );

          const src = this.ctx.createBufferSource();
          src.buffer = asset.audioBuffer;
          src.playbackRate.value = rate;

          const gain = this.ctx.createGain();
          const peakGain = Math.max(
            0.05,
            Math.min(2.0, track.volume * (clip.volume ?? 1.0)),
          );
          const now = this.ctx.currentTime;

          let initialGain = peakGain;
          if (clip.fadeInSec > 0.01 && offsetIntoClip < clip.fadeInSec) {
            initialGain = peakGain * (offsetIntoClip / clip.fadeInSec);
          }
          if (
            clip.fadeOutSec > 0.01 &&
            offsetIntoClip > clipDur - clip.fadeOutSec
          ) {
            initialGain =
              peakGain *
              Math.max(0, (clipDur - offsetIntoClip) / clip.fadeOutSec);
          }
          gain.gain.setValueAtTime(Math.max(0.0001, initialGain), now);

          if (clip.fadeInSec > 0.01 && offsetIntoClip < clip.fadeInSec) {
            const fadeRemWall = (clip.fadeInSec - offsetIntoClip) / rate;
            gain.gain.linearRampToValueAtTime(peakGain, now + fadeRemWall);
          }
          if (clip.fadeOutSec > 0.01) {
            const fadeOutStartInClip = Math.max(0, clipDur - clip.fadeOutSec);
            const fadeOutTriggerWall =
              now + Math.max(0, (fadeOutStartInClip - offsetIntoClip) / rate);
            gain.gain.setValueAtTime(peakGain, fadeOutTriggerWall);
            gain.gain.linearRampToValueAtTime(0.0001, now + wallPlayDur);
          }

          src.connect(gain).connect(this.voiceGain);
          this.activeCustomVoSources.set(clip.id, src);
          this.startedCustomClipIds.add(clip.id);

          src.onended = () => {
            this.activeCustomVoSources.delete(clip.id);
            if (this.activeCustomVoSources.size === 0 && this.customVoDucked) {
              this.customVoDucked = false;
              this.endSfxDuck();
            }
          };

          try {
            src.start(now, sourceOffset, remainingClipDur);
          } catch {
            this.activeCustomVoSources.delete(clip.id);
            this.startedCustomClipIds.delete(clip.id);
          }
        }
      }
    }

    // Live RMS envelope-based SFX auto-ducking across all active voiceover clips
    if (track.autoDuckSfx && this.activeCustomVoSources.size > 0) {
      const inSpeech = track.duckIntervals.some(
        (iv) => time >= iv.start - 0.05 && time <= iv.end + 0.08,
      );
      if (inSpeech && !this.customVoDucked) {
        this.customVoDucked = true;
        this.beginSfxDuck({ ...narratorSettings, autoDuckSfx: true });
      } else if (!inSpeech && this.customVoDucked) {
        this.customVoDucked = false;
        this.endSfxDuck();
      }
    } else if (this.customVoDucked) {
      this.customVoDucked = false;
      this.endSfxDuck();
    }
  }

  public async auditionVoice(
    cue: SubtitleCue,
    rawSettings?: Partial<NarratorSettings> | null,
    options?: { skipAiFetch?: boolean },
  ): Promise<{ usedEngine: 'ai' | 'browser'; error: string | null }> {
    this.unlock();
    this.stopAllSpeech();
    const settings = resolveNarratorSettings(rawSettings);

    if (settings.engine === 'ai') {
      const cached = getCachedCueAudio(cue, settings);
      if (cached) {
        this.playVoiceBuffer(cached, cue, settings, 1);
        return { usedEngine: 'ai', error: null };
      }
      if (!options?.skipAiFetch) {
        const { buffer, error } = await synthesizeCueAiAudio(cue, settings, this.ctx);
        if (buffer) {
          this.playVoiceBuffer(buffer, cue, settings, 1);
          return { usedEngine: 'ai', error: null };
        }
        // Graceful browser fallback while surfacing the real AI error
        this.speakWithBrowserSynthesis(cue, settings, 1);
        return { usedEngine: 'browser', error };
      }
      this.speakWithBrowserSynthesis(cue, settings, 1);
      return { usedEngine: 'browser', error: null };
    }

    this.speakWithBrowserSynthesis(cue, settings, 1);
    return { usedEngine: 'browser', error: null };
  }

  private playVoiceBuffer(
    buffer: AudioBuffer,
    cue: SubtitleCue,
    settings: NarratorSettings,
    playbackSpeed: number,
  ): void {
    this.unlock();
    if (!this.ctx || !this.voiceGain) return;

    if (this.activeVoiceSource) {
      try {
        this.activeVoiceSource.onended = null;
        this.activeVoiceSource.stop();
      } catch {
        // Ignore
      }
      this.activeVoiceSource = null;
      this.endSfxDuck();
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const rate = Math.max(
      0.65,
      Math.min(1.8, settings.speed * Math.min(1.4, playbackSpeed)),
    );
    src.playbackRate.value = rate;
    if (typeof src.detune?.value === 'number') {
      src.detune.value = settings.pitchSemitones * 100;
    }

    const clipGain = this.ctx.createGain();
    clipGain.gain.value =
      settings.volume * (cue.role === 'voiceover' ? 1.0 : 0.92);
    src.connect(clipGain).connect(this.voiceGain);

    this.activeVoiceSource = src;
    this.beginSfxDuck(settings);

    src.onended = () => {
      if (this.activeVoiceSource === src) {
        this.activeVoiceSource = null;
      }
      this.endSfxDuck();
    };

    try {
      src.start(this.ctx.currentTime);
    } catch {
      this.endSfxDuck();
    }
  }

  private speakSubtitle(
    sub: SubtitleCue,
    settings: NarratorSettings,
    playbackSpeed: number,
  ): void {
    if (settings.engine === 'ai') {
      const cached = getCachedCueAudio(sub, settings);
      if (cached) {
        this.playVoiceBuffer(cached, sub, settings, playbackSpeed);
        return;
      }
      // Warm cache asynchronously for next loop/export while speaking immediately via fallback
      void synthesizeCueAiAudio(sub, settings, this.ctx);
    }

    this.speakWithBrowserSynthesis(sub, settings, playbackSpeed);
  }

  private speakWithBrowserSynthesis(
    sub: SubtitleCue,
    settings: NarratorSettings,
    playbackSpeed: number,
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const cleanText = stripCaptionMarkup(sub.text);
      if (!cleanText) return;

      const utter = new SpeechSynthesisUtterance(cleanText);
      const isVo = sub.role === 'voiceover';
      const speakerLower = (sub.speaker ?? '').toLowerCase();
      const targetVoiceId = resolveCueVoice(sub, settings);
      const matchedVoice = pickBrowserVoice(targetVoiceId, isVo, speakerLower);
      if (matchedVoice) {
        utter.voice = matchedVoice;
      }

      const higherVoice =
        speakerLower.includes('woman') ||
        speakerLower.includes('gossiper') ||
        speakerLower.includes('bride') ||
        speakerLower.includes('waitress');

      const basePitch = isVo ? 0.94 : higherVoice ? 1.15 : 0.99;
      const semitoneOffset = settings.pitchSemitones * 0.06;
      utter.pitch = Math.max(0.55, Math.min(1.65, basePitch + semitoneOffset));
      utter.rate = Math.min(
        1.75,
        Math.max(0.7, settings.speed * Math.min(1.4, playbackSpeed)),
      );
      utter.volume = Math.max(0.15, Math.min(1, settings.volume));

      let ducked = false;
      utter.onstart = () => {
        ducked = true;
        this.beginSfxDuck(settings);
      };
      const release = () => {
        if (ducked) {
          ducked = false;
          this.endSfxDuck();
        }
      };
      utter.onend = release;
      utter.onerror = release;

      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore environments without speech synthesis voices
    }
  }

  private trackSource<T extends AudioScheduledSourceNode>(node: T): T {
    this.activeStoppables.add(node);
    node.onended = () => {
      this.activeStoppables.delete(node);
    };
    return node;
  }

  private triggerSfx(cue: SfxCue): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    if (cue.kind === 'smashCutSilence') {
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
      this.sfxGain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
      for (const node of this.activeStoppables) {
        try {
          node.stop(now + 0.05);
        } catch {
          // Ignore
        }
      }
      this.activeStoppables.clear();
      return;
    }

    scheduleSfxCue(this.ctx, this.sfxGain, cue, now, (node) =>
      this.trackSource(node),
    );
  }
}
