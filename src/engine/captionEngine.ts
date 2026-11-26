import {
  CaptionBackdrop,
  CaptionMode,
  CaptionPosition,
  CaptionSettings,
  CaptionSize,
  NARRATOR_STYLE_IDS,
  NARRATOR_VOICE_IDS,
  NarratorEngineMode,
  NarratorSettings,
  NarratorStyleId,
  NarratorVoiceId,
  SubtitleCue,
  VideoAspectRatio,
} from './types';

export interface NarratorVoiceMeta {
  id: NarratorVoiceId;
  label: string;
  tagline: string;
  tone: 'deep' | 'warm' | 'bright' | 'playful' | 'crisp';
}

export const NARRATOR_VOICE_CATALOG: NarratorVoiceMeta[] = [
  {
    id: 'Charon',
    label: 'Charon',
    tagline: 'Warm Storyteller',
    tone: 'warm',
  },
  {
    id: 'Fenrir',
    label: 'Fenrir',
    tagline: 'Dramatic Trailer',
    tone: 'deep',
  },
  {
    id: 'Kore',
    label: 'Kore',
    tagline: 'Crisp Documentary',
    tone: 'crisp',
  },
  {
    id: 'Puck',
    label: 'Puck',
    tagline: 'Playful Comedian',
    tone: 'playful',
  },
  {
    id: 'Zephyr',
    label: 'Zephyr',
    tagline: 'Bright Host',
    tone: 'bright',
  },
];

export interface NarratorStyleMeta {
  id: NarratorStyleId;
  label: string;
  shortLabel: string;
}

export const NARRATOR_STYLE_CATALOG: NarratorStyleMeta[] = [
  { id: 'warmStoryteller', label: 'Warm Storyteller', shortLabel: 'Storyteller' },
  { id: 'cinematicTrailer', label: 'Cinematic Trailer', shortLabel: 'Trailer' },
  { id: 'snappyComedy', label: 'Snappy Comedy', shortLabel: 'Comedy' },
  { id: 'documentary', label: 'Studio Documentary', shortLabel: 'Documentary' },
  { id: 'energeticHost', label: 'Energetic Shorts Host', shortLabel: 'Shorts Host' },
];

export interface CaptionColorSwatch {
  id: string;
  label: string;
  color: string;
  emphasisColor: string;
}

export const CAPTION_HIGHLIGHT_SWATCHES: CaptionColorSwatch[] = [
  { id: 'amber', label: 'Amber Gold', color: '#fbbf24', emphasisColor: '#ff5d73' },
  { id: 'cyan', label: 'Electric Cyan', color: '#38bdf8', emphasisColor: '#fbbf24' },
  { id: 'lime', label: 'Neon Lime', color: '#a3e635', emphasisColor: '#fb7185' },
  { id: 'coral', label: 'Hot Coral', color: '#fb7185', emphasisColor: '#fde047' },
  { id: 'white', label: 'Pure White', color: '#ffffff', emphasisColor: '#38bdf8' },
];

export const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  mode: 'wordPop',
  position: 'bottom',
  size: 'medium',
  wordsPerChunk: 3,
  highlightColor: '#fbbf24',
  emphasisColor: '#ff5d73',
  backdrop: 'scrim',
  showSpeaker: true,
  emphasisPop: true,
};

export const DEFAULT_NARRATOR_SETTINGS: NarratorSettings = {
  engine: 'ai',
  voice: 'Charon',
  style: 'warmStoryteller',
  speed: 1.0,
  pitchSemitones: 0,
  volume: 0.92,
  autoDuckSfx: true,
  duckAmount: 0.68,
};

const VALID_MODES = new Set<CaptionMode>(['wordPop', 'classic']);
const VALID_POSITIONS = new Set<CaptionPosition>(['bottom', 'center', 'top']);
const VALID_SIZES = new Set<CaptionSize>(['compact', 'medium', 'large']);
const VALID_BACKDROPS = new Set<CaptionBackdrop>(['outline', 'scrim', 'card']);
const VALID_ENGINES = new Set<NarratorEngineMode>(['ai', 'browser']);
const VALID_VOICES = new Set<NarratorVoiceId>(NARRATOR_VOICE_IDS);
const VALID_STYLES = new Set<NarratorStyleId>(NARRATOR_STYLE_IDS);

function clampNum(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function isValidHexColor(val: unknown): val is string {
  return typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val.trim());
}

export function resolveCaptionSettings(
  partial?: Partial<CaptionSettings> | null,
): CaptionSettings {
  if (!partial) return { ...DEFAULT_CAPTION_SETTINGS };
  return {
    mode:
      partial.mode && VALID_MODES.has(partial.mode)
        ? partial.mode
        : DEFAULT_CAPTION_SETTINGS.mode,
    position:
      partial.position && VALID_POSITIONS.has(partial.position)
        ? partial.position
        : DEFAULT_CAPTION_SETTINGS.position,
    size:
      partial.size && VALID_SIZES.has(partial.size)
        ? partial.size
        : DEFAULT_CAPTION_SETTINGS.size,
    wordsPerChunk:
      typeof partial.wordsPerChunk === 'number' && Number.isFinite(partial.wordsPerChunk)
        ? Math.round(clampNum(partial.wordsPerChunk, 2, 5))
        : DEFAULT_CAPTION_SETTINGS.wordsPerChunk,
    highlightColor: isValidHexColor(partial.highlightColor)
      ? partial.highlightColor
      : DEFAULT_CAPTION_SETTINGS.highlightColor,
    emphasisColor: isValidHexColor(partial.emphasisColor)
      ? partial.emphasisColor
      : DEFAULT_CAPTION_SETTINGS.emphasisColor,
    backdrop:
      partial.backdrop && VALID_BACKDROPS.has(partial.backdrop)
        ? partial.backdrop
        : DEFAULT_CAPTION_SETTINGS.backdrop,
    showSpeaker:
      typeof partial.showSpeaker === 'boolean'
        ? partial.showSpeaker
        : DEFAULT_CAPTION_SETTINGS.showSpeaker,
    emphasisPop:
      typeof partial.emphasisPop === 'boolean'
        ? partial.emphasisPop
        : DEFAULT_CAPTION_SETTINGS.emphasisPop,
  };
}

export function resolveNarratorSettings(
  partial?: Partial<NarratorSettings> | null,
): NarratorSettings {
  if (!partial) return { ...DEFAULT_NARRATOR_SETTINGS };
  return {
    engine:
      partial.engine && VALID_ENGINES.has(partial.engine)
        ? partial.engine
        : DEFAULT_NARRATOR_SETTINGS.engine,
    voice:
      partial.voice && VALID_VOICES.has(partial.voice)
        ? partial.voice
        : DEFAULT_NARRATOR_SETTINGS.voice,
    style:
      partial.style && VALID_STYLES.has(partial.style)
        ? partial.style
        : DEFAULT_NARRATOR_SETTINGS.style,
    speed:
      typeof partial.speed === 'number' && Number.isFinite(partial.speed)
        ? Math.round(clampNum(partial.speed, 0.75, 1.4) * 100) / 100
        : DEFAULT_NARRATOR_SETTINGS.speed,
    pitchSemitones:
      typeof partial.pitchSemitones === 'number' && Number.isFinite(partial.pitchSemitones)
        ? Math.round(clampNum(partial.pitchSemitones, -4, 4) * 2) / 2
        : DEFAULT_NARRATOR_SETTINGS.pitchSemitones,
    volume:
      typeof partial.volume === 'number' && Number.isFinite(partial.volume)
        ? Math.round(clampNum(partial.volume, 0.2, 1.0) * 100) / 100
        : DEFAULT_NARRATOR_SETTINGS.volume,
    autoDuckSfx:
      typeof partial.autoDuckSfx === 'boolean'
        ? partial.autoDuckSfx
        : DEFAULT_NARRATOR_SETTINGS.autoDuckSfx,
    duckAmount:
      typeof partial.duckAmount === 'number' && Number.isFinite(partial.duckAmount)
        ? Math.round(clampNum(partial.duckAmount, 0.2, 0.75) * 100) / 100
        : DEFAULT_NARRATOR_SETTINGS.duckAmount,
  };
}

export function stripCaptionMarkup(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1').replace(/\s+/g, ' ').trim();
}

export interface ParsedCaptionWord {
  index: number;
  text: string;
  isEmphasis: boolean;
  isPunctuationPop: boolean;
  isSentenceBreak: boolean;
  weight: number;
}

export function parseCaptionWords(rawText: string): ParsedCaptionWord[] {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  // Tokenize preserving *multi word emphasis* spans cleanly
  const segments: { text: string; explicitEmphasis: boolean }[] = [];
  const starPattern = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = starPattern.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: normalized.slice(lastIndex, match.index),
        explicitEmphasis: false,
      });
    }
    segments.push({
      text: match[1],
      explicitEmphasis: true,
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < normalized.length) {
    segments.push({
      text: normalized.slice(lastIndex),
      explicitEmphasis: false,
    });
  }

  const words: ParsedCaptionWord[] = [];
  let wordIdx = 0;

  for (const seg of segments) {
    const tokens = seg.text.trim().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const lettersOnly = token.replace(/[^a-zA-Z]/g, '');
      const isAllCaps =
        lettersOnly.length >= 2 && lettersOnly === lettersOnly.toUpperCase();
      const hasBangOrQuestion = /[!?]+["'”’)\]]*$/.test(token);
      const isQuoted = /^["'“‘].+["'”’]$/.test(token);
      const endsPeriod = /[.!?]["'”’)\]]*$/.test(token);
      const endsComma = /[,;:]["'”’)\]]*$/.test(token);
      const hasDashOrEllipsis = /—|\.\.\.$/.test(token);

      const charWeight = Math.max(0.7, Math.min(2.6, 0.55 + lettersOnly.length * 0.14));
      let pauseWeight = 0;
      if (endsPeriod) pauseWeight = 0.62;
      else if (hasDashOrEllipsis) pauseWeight = 0.48;
      else if (endsComma) pauseWeight = 0.34;

      words.push({
        index: wordIdx++,
        text: token,
        isEmphasis: seg.explicitEmphasis || isAllCaps || isQuoted,
        isPunctuationPop: hasBangOrQuestion,
        isSentenceBreak: endsPeriod || hasDashOrEllipsis,
        weight: charWeight + pauseWeight,
      });
    }
  }

  return words;
}

export interface TimedCaptionWord extends ParsedCaptionWord {
  startTime: number;
  endTime: number;
  chunkIndex: number;
}

export function buildTimedCaptionWords(
  cue: SubtitleCue,
  wordsPerChunk: number,
  overrideDurationSec?: number,
): TimedCaptionWord[] {
  const parsed = parseCaptionWords(cue.text);
  if (parsed.length === 0) return [];

  const maxChunk = Math.round(clampNum(wordsPerChunk, 2, 5));
  const cueDuration = Math.max(0.35, cue.endTime - cue.startTime);
  // If AI audio duration is known, pace words to match natural speech end while staying inside cue window
  const speechDuration =
    overrideDurationSec && overrideDurationSec > 0.25
      ? Math.min(cueDuration, Math.max(cueDuration * 0.65, overrideDurationSec))
      : cueDuration * 0.94;

  const totalWeight = parsed.reduce((acc, w) => acc + w.weight, 0) || 1;
  const timed: TimedCaptionWord[] = [];

  let cursor = cue.startTime;
  let chunkIndex = 0;
  let wordsInCurrentChunk = 0;

  for (let i = 0; i < parsed.length; i++) {
    const w = parsed[i];
    const span = (w.weight / totalWeight) * speechDuration;
    const startTime = cursor;
    const endTime = i === parsed.length - 1 ? cue.endTime : cursor + span;
    cursor += span;

    timed.push({
      ...w,
      startTime,
      endTime,
      chunkIndex,
    });

    wordsInCurrentChunk++;
    const nextExists = i < parsed.length - 1;
    if (
      nextExists &&
      (wordsInCurrentChunk >= maxChunk ||
        (w.isSentenceBreak && wordsInCurrentChunk >= 2))
    ) {
      chunkIndex++;
      wordsInCurrentChunk = 0;
    }
  }

  return timed;
}

export type WordRenderState = 'hidden' | 'active' | 'spoken';

export interface EvaluatedCaptionWord {
  index: number;
  text: string;
  state: WordRenderState;
  isEmphasis: boolean;
  isPunctuationPop: boolean;
  popProgress: number; // 0..1 right after word suddenly appears
  scale: number;
  translateY: number; // px offset
  tiltDeg: number;
  opacity: number;
}

export interface EvaluatedWordPopCaption {
  cue: SubtitleCue;
  plainText: string;
  isVoiceover: boolean;
  chunkIndex: number;
  totalChunks: number;
  activeWordIndex: number;
  words: EvaluatedCaptionWord[];
}

/**
 * Deterministic sudden-appearing word-pop evaluator shared by both the live DOM
 * CaptionOverlay and the Canvas2D video exporter.
 */
export function evaluateWordPopCaption(
  cue: SubtitleCue | null,
  time: number,
  rawSettings?: Partial<CaptionSettings> | null,
  overrideDurationSec?: number,
): EvaluatedWordPopCaption | null {
  if (!cue || !cue.text.trim()) return null;
  if (time < cue.startTime - 0.001 || time > cue.endTime + 0.001) return null;

  const settings = resolveCaptionSettings(rawSettings);
  const timed = buildTimedCaptionWords(cue, settings.wordsPerChunk, overrideDurationSec);
  if (timed.length === 0) return null;

  // Find the latest word whose startTime <= time (defaulting to word 0 at cue start)
  let activeWordIdx = 0;
  for (let i = 0; i < timed.length; i++) {
    if (time >= timed[i].startTime - 0.001) {
      activeWordIdx = i;
    } else {
      break;
    }
  }

  const activeWord = timed[activeWordIdx];
  const chunkIndex = activeWord.chunkIndex;
  const totalChunks = timed[timed.length - 1].chunkIndex + 1;
  const chunkWords = timed.filter((w) => w.chunkIndex === chunkIndex);

  const evaluatedWords: EvaluatedCaptionWord[] = chunkWords.map((w) => {
    const isVisible = time >= w.startTime - 0.001 || w.index === activeWordIdx;
    if (!isVisible) {
      return {
        index: w.index,
        text: w.text,
        state: 'hidden',
        isEmphasis: w.isEmphasis,
        isPunctuationPop: w.isPunctuationPop,
        popProgress: 0,
        scale: 0.72,
        translateY: 8,
        tiltDeg: 0,
        opacity: 0,
      };
    }

    const isActive = w.index === activeWordIdx;
    const elapsed = Math.max(0, time - w.startTime);
    const popWindow = 0.13;
    const popProgress = clampNum(elapsed / popWindow, 0, 1);

    const punchy =
      settings.emphasisPop && (w.isEmphasis || w.isPunctuationPop);

    // Overshoot spring pop curve: snaps abruptly from 0.72 -> peak -> resting active/spoken scale
    let scale: number;
    if (popProgress < 0.48) {
      const k = popProgress / 0.48;
      const eased = 1 - Math.pow(1 - k, 3);
      const startScale = punchy ? 0.62 : 0.74;
      const peakScale = punchy ? 1.28 : 1.15;
      scale = startScale + (peakScale - startScale) * eased;
    } else {
      const k = (popProgress - 0.48) / 0.52;
      const eased = 1 - Math.pow(1 - k, 2);
      const peakScale = punchy ? 1.28 : 1.15;
      const restScale = isActive
        ? punchy
          ? 1.12
          : 1.06
        : punchy
          ? 1.03
          : 1.0;
      scale = peakScale + (restScale - peakScale) * eased;
    }

    const translateY = (1 - Math.min(1, popProgress * 1.4)) * (punchy ? 10 : 6);
    const tiltDeg =
      punchy && isActive
        ? (w.index % 2 === 0 ? -2.2 : 2.2) * (0.65 + 0.35 * (1 - popProgress))
        : 0;
    const opacity = Math.min(1, 0.35 + popProgress * 2.4);

    return {
      index: w.index,
      text: w.text,
      state: isActive ? 'active' : 'spoken',
      isEmphasis: w.isEmphasis,
      isPunctuationPop: w.isPunctuationPop,
      popProgress,
      scale,
      translateY,
      tiltDeg,
      opacity,
    };
  });

  return {
    cue,
    plainText: stripCaptionMarkup(cue.text),
    isVoiceover: cue.role === 'voiceover',
    chunkIndex,
    totalChunks,
    activeWordIndex: activeWordIdx,
    words: evaluatedWords,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Shared Canvas2D caption burner used by Mp4CutsceneRecorder so exported videos
 * render the exact same sudden-appearing highlighted word-pop captions as the live viewport.
 */
export function drawWordPopCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  barH: number,
  aspectRatio: VideoAspectRatio,
  cue: SubtitleCue | null,
  currentTime: number,
  rawSettings?: Partial<CaptionSettings> | null,
  overrideDurationSec?: number,
): void {
  if (!cue || !cue.text.trim()) return;

  const settings = resolveCaptionSettings(rawSettings);
  const refDim = Math.min(width, height);
  const sizeScale =
    settings.size === 'compact' ? 0.84 : settings.size === 'large' ? 1.24 : 1.0;

  const isVoiceover = cue.role === 'voiceover';
  const verticalSafeBottom =
    aspectRatio === '9:16' ? Math.max(64, height * 0.1) : Math.max(24, height * 0.045);
  const verticalSafeTop =
    aspectRatio === '9:16' ? Math.max(64, height * 0.1) : Math.max(24, height * 0.055);

  if (settings.mode === 'classic') {
    const plain = stripCaptionMarkup(cue.text);
    const fontSize = Math.max(16, Math.round(refDim * 0.032 * sizeScale));
    ctx.save();
    ctx.font = `${isVoiceover ? 'italic ' : ''}600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    const speakerPrefix =
      settings.showSpeaker && cue.speaker ? `${cue.speaker}: ` : '';
    const fullText = `${speakerPrefix}${plain}`;
    const maxBoxW = Math.min(width * 0.88, Math.round(refDim * 1.3));
    const lines = wrapCanvasLines(ctx, fullText, maxBoxW - 44);
    const lineHeight = Math.round(fontSize * 1.36);
    const boxH = lines.length * lineHeight + 22;
    const boxW = Math.min(
      maxBoxW,
      Math.max(...lines.map((l) => ctx.measureText(l).width)) + 48,
    );
    const boxX = Math.round((width - boxW) / 2);
    const boxY =
      settings.position === 'top'
        ? Math.round(barH + verticalSafeTop)
        : settings.position === 'center'
          ? Math.round((height - boxH) / 2)
          : Math.round(height - barH - boxH - verticalSafeBottom);

    if (settings.backdrop !== 'outline') {
      ctx.fillStyle =
        settings.backdrop === 'card'
          ? 'rgba(20, 22, 26, 0.92)'
          : 'rgba(10, 12, 16, 0.68)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.fill();
      if (settings.backdrop === 'card') {
        ctx.strokeStyle = isVoiceover
          ? `${settings.highlightColor}88`
          : 'rgba(57, 61, 71, 0.95)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 10);
        ctx.stroke();
      }
    }

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    lines.forEach((line, idx) => {
      const cy = boxY + 11 + lineHeight * (idx + 0.5);
      ctx.lineWidth = Math.max(3, fontSize * 0.14);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.lineJoin = 'round';
      if (idx === 0 && speakerPrefix && line.startsWith(speakerPrefix)) {
        const rest = line.slice(speakerPrefix.length);
        const prefixW = ctx.measureText(speakerPrefix).width;
        const restW = ctx.measureText(rest).width;
        const startX = width / 2 - (prefixW + restW) / 2;
        ctx.textAlign = 'left';
        ctx.strokeText(speakerPrefix, startX, cy);
        ctx.fillStyle = settings.highlightColor;
        ctx.fillText(speakerPrefix, startX, cy);
        ctx.strokeText(rest, startX + prefixW, cy);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(rest, startX + prefixW, cy);
        ctx.textAlign = 'center';
      } else {
        ctx.strokeText(line, width / 2, cy);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(line, width / 2, cy);
      }
    });
    ctx.restore();
    return;
  }

  // Word-pop kinetic captions
  const evaluated = evaluateWordPopCaption(cue, currentTime, settings, overrideDurationSec);
  if (!evaluated) return;

  const visibleWords = evaluated.words.filter((w) => w.state !== 'hidden');
  if (visibleWords.length === 0) return;

  const baseFontSize = Math.max(22, Math.round(refDim * 0.048 * sizeScale));
  const speakerFontSize = Math.max(12, Math.round(baseFontSize * 0.38));
  const wordGap = Math.round(baseFontSize * 0.32);

  ctx.save();
  ctx.font = `900 ${baseFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';

  // Measure visible words & wrap onto 1-2 balanced rows if needed (for 9:16 portrait safety)
  const maxRowW = width * 0.86;
  const rows: { words: EvaluatedCaptionWord[]; widths: number[]; totalW: number }[] = [];
  let curWords: EvaluatedCaptionWord[] = [];
  let curWidths: number[] = [];
  let curTotal = 0;

  for (const w of visibleWords) {
    const ww = ctx.measureText(w.text).width;
    const needed = curWords.length > 0 ? curTotal + wordGap + ww : ww;
    if (curWords.length > 0 && needed > maxRowW) {
      rows.push({ words: curWords, widths: curWidths, totalW: curTotal });
      curWords = [w];
      curWidths = [ww];
      curTotal = ww;
    } else {
      curWords.push(w);
      curWidths.push(ww);
      curTotal = needed;
    }
  }
  if (curWords.length > 0) {
    rows.push({ words: curWords, widths: curWidths, totalW: curTotal });
  }

  const rowHeight = Math.round(baseFontSize * 1.28);
  const speakerH = settings.showSpeaker && cue.speaker ? speakerFontSize + 10 : 0;
  const blockH = speakerH + rows.length * rowHeight + 18;
  const maxMeasuredW = Math.max(120, ...rows.map((r) => r.totalW));
  const blockW = Math.min(width * 0.92, maxMeasuredW + 46);

  const blockY =
    settings.position === 'top'
      ? Math.round(barH + verticalSafeTop)
      : settings.position === 'center'
        ? Math.round((height - blockH) / 2)
        : Math.round(height - barH - blockH - verticalSafeBottom);

  // Backdrop layer
  if (settings.backdrop === 'card' || settings.backdrop === 'scrim') {
    const bx = Math.round((width - blockW) / 2);
    ctx.fillStyle =
      settings.backdrop === 'card'
        ? 'rgba(16, 18, 24, 0.86)'
        : 'rgba(8, 10, 14, 0.46)';
    drawRoundedRect(ctx, bx, blockY, blockW, blockH, 14);
    ctx.fill();
    if (settings.backdrop === 'card') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, bx, blockY, blockW, blockH, 14);
      ctx.stroke();
    }
  }

  // Optional crisp speaker header
  if (settings.showSpeaker && cue.speaker) {
    ctx.save();
    ctx.font = `700 ${speakerFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    const speakerLabel = isVoiceover ? `${cue.speaker} · VO` : cue.speaker;
    const sy = blockY + 9 + speakerFontSize * 0.5;
    ctx.lineWidth = Math.max(3, speakerFontSize * 0.22);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.strokeText(speakerLabel, width / 2, sy);
    ctx.fillStyle = isVoiceover ? settings.highlightColor : '#93c5fd';
    ctx.fillText(speakerLabel, width / 2, sy);
    ctx.restore();
  }

  // Draw each visible word with active highlight & sudden-pop scale/tilt
  rows.forEach((row, rIdx) => {
    const rowCy = blockY + 9 + speakerH + rowHeight * (rIdx + 0.5);
    let cursorX = width / 2 - row.totalW / 2;

    row.words.forEach((w, wIdx) => {
      const wordW = row.widths[wIdx];
      const cx = cursorX + wordW / 2;
      cursorX += wordW + wordGap;

      const isActive = w.state === 'active';
      const useEmphasisColor =
        settings.emphasisPop && (w.isEmphasis || w.isPunctuationPop);

      ctx.save();
      ctx.globalAlpha = w.opacity;
      ctx.translate(cx, rowCy + w.translateY);
      if (Math.abs(w.tiltDeg) > 0.01) {
        ctx.rotate((w.tiltDeg * Math.PI) / 180);
      }
      ctx.scale(w.scale, w.scale);

      // Active highlight box behind the currently spoken word
      if (isActive) {
        const padX = Math.round(baseFontSize * 0.24);
        const padY = Math.round(baseFontSize * 0.14);
        const bgW = wordW + padX * 2;
        const bgH = baseFontSize + padY * 2;
        ctx.fillStyle = useEmphasisColor
          ? settings.emphasisColor
          : settings.highlightColor;
        drawRoundedRect(ctx, -bgW / 2, -bgH / 2, bgW, bgH, Math.round(baseFontSize * 0.22));
        ctx.fill();
      }

      // Crisp thick stroke + shadow for readability over bright 3D backdrops
      ctx.font = `900 ${baseFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      if (isActive) {
        ctx.fillStyle = '#0f172a';
        ctx.fillText(w.text, 0, 1);
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
        ctx.shadowBlur = Math.round(baseFontSize * 0.22);
        ctx.shadowOffsetY = Math.round(baseFontSize * 0.08);
        ctx.lineWidth = Math.max(4, Math.round(baseFontSize * 0.18));
        ctx.strokeStyle = '#090b10';
        ctx.strokeText(w.text, 0, 0);

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = useEmphasisColor ? settings.emphasisColor : '#ffffff';
        ctx.fillText(w.text, 0, 0);
      }

      ctx.restore();
    });
  });

  ctx.restore();
}
