import { stripCaptionMarkup } from './captionEngine';
import { evaluateCharacterActionAt } from './characterActions';
import { evaluateCharacterStateAt } from './characterStates';
import { evaluateActorFaceAt } from './faceExpressions';
import {
  AnimationProject,
  CharacterActionId,
  CharacterStateId,
  ExpressionPresetId,
  SceneActorConfig,
  SubtitleCue,
  SubtitleRole,
} from './types';

export const EXPRESSION_TAG_LABELS: Record<ExpressionPresetId, string | null> = {
  neutral: null,
  happy: 'happy',
  excited: 'excited',
  angry: 'angry',
  sad: 'sad',
  surprised: 'shock',
  smug: 'smug',
  wink: 'wink',
  determined: 'determined',
  focused: 'focused',
};

export const ACTION_TAG_LABELS: Record<CharacterActionId, string | null> = {
  none: null,
  spewBeans: 'spew beans',
  cryTears: 'cry tears',
  breatheFire: 'breathe fire',
  confettiBurst: 'confetti burst',
  sweatColdBreath: 'cold sweat',
};

export const STATE_TAG_LABELS: Record<CharacterStateId, string | null> = {
  normal: null,
  brokenLeg: 'broken leg',
  mindBlown: 'mind blown',
  frozenFeet: 'frozen feet',
  dizzy: 'dizzy',
  steamingMad: 'steaming mad',
};

export interface TranscriptEntry {
  cueId: string;
  startTime: number;
  endTime: number;
  speaker: string;
  role: SubtitleRole;
  expressionTags: string[];
  actionTags: string[];
  cleanText: string;
  formattedLine: string;
}

function formatTranscriptTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

function matchCueActor(
  cue: SubtitleCue,
  actors: SceneActorConfig[],
): SceneActorConfig | null {
  if (cue.actorId) {
    const byId = actors.find((a) => a.id === cue.actorId);
    if (byId) return byId;
  }
  const speakerNorm = (cue.speaker ?? '').trim().toLowerCase();
  if (!speakerNorm || speakerNorm === 'narrator') return null;

  const exact = actors.find(
    (a) => a.kind === 'character' && a.name.trim().toLowerCase() === speakerNorm,
  );
  if (exact) return exact;

  return (
    actors.find(
      (a) =>
        a.kind === 'character' &&
        (a.name.toLowerCase().includes(speakerNorm) ||
          speakerNorm.includes(a.name.toLowerCase())),
    ) ?? null
  );
}

function inspectActorExpressionTags(
  actor: SceneActorConfig,
  sampleTimes: number[],
): string[] {
  const tags = new Set<string>();
  const faceKfs = actor.faceKeyframes ?? [];

  for (const t of sampleTimes) {
    // Check explicit face keyframe presets active at t
    if (faceKfs.length > 0) {
      const sorted = [...faceKfs].sort((a, b) => a.time - b.time);
      let activeKf = sorted[0];
      for (const kf of sorted) {
        if (kf.time <= t + 0.05) {
          activeKf = kf;
        } else {
          break;
        }
      }
      const presetTag = EXPRESSION_TAG_LABELS[activeKf.preset];
      if (presetTag) {
        tags.add(presetTag);
      }
    }

    // Also inspect evaluated parameters to catch custom wide-eye/jaw-drop [shock] or intense frown
    const evalFace = evaluateActorFaceAt(actor, t, [], (u) => u);
    if (evalFace.params.eyeWide >= 0.5 && evalFace.params.jawOpen >= 0.45) {
      tags.add('shock');
    } else if (evalFace.params.browFurrow >= 0.78 && evalFace.params.smile <= -0.45) {
      tags.add('angry');
    } else if (evalFace.params.smile <= -0.58 && evalFace.params.browFurrow <= -0.35) {
      tags.add('sad');
    }
  }

  // Legacy shocked face ornament fallback when no explicit keyframes exist
  if (tags.size === 0 && actor.ornaments?.face?.id === 'shocked') {
    tags.add('shock');
  }

  return Array.from(tags);
}

function inspectActorActionAndStateTags(
  actor: SceneActorConfig,
  sampleTimes: number[],
): string[] {
  const tags = new Set<string>();
  for (const t of sampleTimes) {
    const action = evaluateCharacterActionAt(actor.actionKeyframes, t);
    const actionLabel = ACTION_TAG_LABELS[action.actionId];
    if (actionLabel) {
      tags.add(actionLabel);
    }

    const state = evaluateCharacterStateAt(actor.stateKeyframes, t);
    const stateLabel = STATE_TAG_LABELS[state.stateId];
    if (stateLabel) {
      tags.add(stateLabel);
    }
  }
  return Array.from(tags);
}

/**
 * Deterministically inspects every subtitle cue alongside character facial expressions,
 * character action functions, and FX states to build an actor-ready narration transcript
 * with inline performance cues like [shock], [angry], [spew beans], [mind blown].
 */
export function buildNarrationTranscript(
  project: AnimationProject,
): TranscriptEntry[] {
  const characterActors = project.actors.filter((a) => a.kind === 'character');
  const sortedSubs = [...project.subtitles].sort(
    (a, b) => a.startTime - b.startTime,
  );

  return sortedSubs.map((cue) => {
    const mid = (cue.startTime + cue.endTime) / 2;
    const sampleTimes = [
      cue.startTime + 0.05,
      mid,
      Math.max(cue.startTime + 0.05, cue.endTime - 0.1),
    ];

    const role: SubtitleRole =
      cue.role === 'voiceover' ||
      (cue.speaker ?? '').trim().toLowerCase() === 'narrator'
        ? 'voiceover'
        : 'dialogue';

    const matchedActor = matchCueActor(cue, characterActors);
    const expressionSet = new Set<string>();
    const actionSet = new Set<string>();

    if (matchedActor) {
      inspectActorExpressionTags(matchedActor, sampleTimes).forEach((tag) =>
        expressionSet.add(tag),
      );
      inspectActorActionAndStateTags(matchedActor, sampleTimes).forEach((tag) =>
        actionSet.add(tag),
      );
    } else if (role === 'voiceover') {
      // For narrator voiceovers, surface dramatic on-screen character reactions & actions occurring during the line
      for (const actor of characterActors) {
        const acts = inspectActorActionAndStateTags(actor, sampleTimes);
        acts.forEach((tag) => actionSet.add(tag));

        const exprs = inspectActorExpressionTags(actor, sampleTimes);
        for (const tag of exprs) {
          if (
            tag === 'shock' ||
            tag === 'angry' ||
            tag === 'excited' ||
            tag === 'sad'
          ) {
            expressionSet.add(tag);
          }
        }
      }
    }

    // Keep tag list focused and readable (max 2 expression tags + 2 action tags per line)
    const expressionTags = Array.from(expressionSet).slice(0, 2);
    const actionTags = Array.from(actionSet).slice(0, 2);

    // Heuristic punctuation fallback: if an exclamation line has no tags yet, check tone cues
    const cleanText = stripCaptionMarkup(cue.text);
    const allTagTokens = [...expressionTags, ...actionTags].map((t) => `[${t}]`);
    const tagSegment = allTagTokens.length > 0 ? ` ${allTagTokens.join(' ')}` : '';
    const speakerLabel =
      role === 'voiceover'
        ? `${cue.speaker || 'Narrator'} (VO)`
        : cue.speaker || 'Speaker';

    const formattedLine = `[${formatTranscriptTime(cue.startTime)} - ${formatTranscriptTime(cue.endTime)}] ${speakerLabel}${tagSegment}: ${cleanText}`;

    return {
      cueId: cue.id,
      startTime: cue.startTime,
      endTime: cue.endTime,
      speaker: cue.speaker || (role === 'voiceover' ? 'Narrator' : 'Speaker'),
      role,
      expressionTags,
      actionTags,
      cleanText,
      formattedLine,
    };
  });
}

export function formatTranscriptDocument(
  project: AnimationProject,
  entries: TranscriptEntry[],
): string {
  const header = [
    `${project.name} — Narration & Expression Transcript`,
    `Duration: ${formatTranscriptTime(project.duration)} · Lines: ${entries.length}`,
    'Performance cues in [brackets] reflect character expressions & actions on screen.',
    '------------------------------------------------------------------------',
  ];

  if (entries.length === 0) {
    return [...header, '(No dialogue or narration cues in this scene yet.)'].join(
      '\n',
    );
  }

  return [...header, ...entries.map((e) => e.formattedLine)].join('\n');
}

/**
 * Pure RMS vocal-activity detector over mono Float32 PCM samples.
 * Returns timeline-aligned [start, end] intervals (shifted by offsetSec) where
 * voice energy exceeds silence floor so SFX duck naturally during speech and
 * recover cleanly during pauses.
 */
export function detectVocalActivityIntervals(
  samples: Float32Array,
  sampleRate: number,
  offsetSec = 0,
  windowSec = 0.1,
  rmsThreshold = 0.018,
): { start: number; end: number }[] {
  if (!samples || samples.length === 0 || sampleRate <= 0) return [];
  const windowSize = Math.max(1, Math.floor(sampleRate * windowSec));
  const rawIntervals: { start: number; end: number }[] = [];

  let activeStart: number | null = null;
  const totalWindows = Math.ceil(samples.length / windowSize);

  for (let w = 0; w < totalWindows; w++) {
    const startIdx = w * windowSize;
    const endIdx = Math.min(samples.length, startIdx + windowSize);
    let sumSq = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const s = samples[i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, endIdx - startIdx));
    const winStartSec = startIdx / sampleRate + offsetSec;
    const winEndSec = endIdx / sampleRate + offsetSec;

    if (rms >= rmsThreshold) {
      if (activeStart === null) {
        activeStart = winStartSec;
      }
    } else if (activeStart !== null) {
      rawIntervals.push({ start: activeStart, end: winStartSec });
      activeStart = null;
    }

    if (w === totalWindows - 1 && activeStart !== null) {
      rawIntervals.push({ start: activeStart, end: winEndSec });
    }
  }

  // Merge intervals separated by short breath gaps (<= 0.35s)
  const merged: { start: number; end: number }[] = [];
  for (const iv of rawIntervals) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end + 0.35) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }

  return merged;
}

export function extractWaveformPeaks(
  buffer: AudioBuffer,
  barCount = 64,
): number[] {
  const count = Math.max(8, Math.min(128, Math.round(barCount)));
  const data = buffer.getChannelData(0);
  if (!data || data.length === 0) {
    return Array.from({ length: count }, () => 0.08);
  }
  const blockSize = Math.max(1, Math.floor(data.length / count));
  const peaks: number[] = [];
  let maxPeak = 0.001;

  for (let i = 0; i < count; i++) {
    const start = i * blockSize;
    const end = Math.min(data.length, start + blockSize);
    let peak = 0;
    const step = Math.max(1, Math.floor((end - start) / 64));
    for (let j = start; j < end; j += step) {
      const a = Math.abs(data[j]);
      if (a > peak) peak = a;
    }
    peaks.push(peak);
    if (peak > maxPeak) maxPeak = peak;
  }

  return peaks.map((p) => Math.max(0.08, Math.min(1, p / maxPeak)));
}

export function extractCustomVoiceoverDuckIntervals(
  buffer: AudioBuffer,
  offsetSec = 0,
): { start: number; end: number }[] {
  if (!buffer || buffer.length === 0) return [];
  return detectVocalActivityIntervals(
    buffer.getChannelData(0),
    buffer.sampleRate,
    offsetSec,
  );
}
