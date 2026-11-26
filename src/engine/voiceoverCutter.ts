import {
  CustomVoiceoverTrack,
  VoiceoverClip,
  VoiceoverSourceAsset,
} from './types';

export const MIN_VOICEOVER_CLIP_DURATION = 0.1;
export const MAX_VOICEOVER_FADE_SEC = 2.0;

function roundSec(val: number): number {
  return Math.round(val * 1000) / 1000;
}

export function getClipDuration(clip: VoiceoverClip): number {
  return Math.max(
    MIN_VOICEOVER_CLIP_DURATION,
    roundSec(clip.sourceEndSec - clip.sourceStartSec),
  );
}

export function getClipEndTime(clip: VoiceoverClip): number {
  return roundSec(clip.startSec + getClipDuration(clip));
}

export function normalizeClipFades(clip: VoiceoverClip): VoiceoverClip {
  const dur = getClipDuration(clip);
  const maxFade = Math.min(MAX_VOICEOVER_FADE_SEC, dur * 0.48);
  return {
    ...clip,
    fadeInSec: roundSec(Math.max(0, Math.min(maxFade, clip.fadeInSec || 0))),
    fadeOutSec: roundSec(Math.max(0, Math.min(maxFade, clip.fadeOutSec || 0))),
    volume: roundSec(Math.max(0.2, Math.min(1.5, clip.volume ?? 1.0))),
  };
}

export function sortVoiceoverClips(clips: VoiceoverClip[]): VoiceoverClip[] {
  return [...clips].sort(
    (a, b) => a.startSec - b.startSec || a.id.localeCompare(b.id),
  );
}

/**
 * Ensures any legacy single-buffer CustomVoiceoverTrack has populated `assets` and `clips`
 * and recomputes summary properties (`durationSec`, `fileName`, `duckIntervals`, `offsetSec`).
 */
export function ensureMultiClipVoiceoverTrack(
  track: CustomVoiceoverTrack,
): CustomVoiceoverTrack {
  const existingAssets = track.assets ? { ...track.assets } : {};
  let clips: VoiceoverClip[] = track.clips
    ? track.clips.map((c) => ({ ...c }))
    : [];

  if (Object.keys(existingAssets).length === 0 && track.audioBuffer) {
    const defaultAssetId = 'vo_asset_primary';
    existingAssets[defaultAssetId] = {
      id: defaultAssetId,
      fileName: track.fileName || 'custom-voiceover.wav',
      mimeType: track.mimeType || 'audio/wav',
      durationSec: track.durationSec,
      audioBuffer: track.audioBuffer,
      waveformPeaks: track.waveformPeaks ?? [],
      duckIntervals: track.duckIntervals ?? [],
    };
    if (clips.length === 0) {
      clips = [
        {
          id: 'vo_clip_1',
          assetId: defaultAssetId,
          name: (track.fileName || 'Clip 1').replace(/\.[^.]+$/, ''),
          startSec: Math.max(0, track.offsetSec || 0),
          sourceStartSec:
            track.offsetSec < 0
              ? Math.min(track.durationSec - MIN_VOICEOVER_CLIP_DURATION, -track.offsetSec)
              : 0,
          sourceEndSec: track.durationSec,
          volume: track.volume ?? 1.0,
          fadeInSec: 0,
          fadeOutSec: 0,
          muted: false,
        },
      ];
    }
  }

  return syncVoiceoverTrackSummary({
    ...track,
    assets: existingAssets,
    clips: sortVoiceoverClips(clips.map(normalizeClipFades)),
    rippleMode: track.rippleMode ?? true,
  });
}

/**
 * Recomputes top-level summary fields (`durationSec`, `offsetSec`, `duckIntervals`, `fileName`)
 * from the active non-muted clips so ExportPanel and EpisodeAudioEngine stay in sync.
 */
export function syncVoiceoverTrackSummary(
  track: CustomVoiceoverTrack,
): CustomVoiceoverTrack {
  const assets = track.assets ?? {};
  const clips = sortVoiceoverClips((track.clips ?? []).map(normalizeClipFades));
  const activeClips = clips.filter((c) => !c.muted && assets[c.assetId]);

  const firstClip = activeClips[0] ?? clips[0];
  const firstAsset = firstClip ? assets[firstClip.assetId] : undefined;

  let maxEndSec = 0;
  let totalActiveDuration = 0;
  for (const c of activeClips) {
    const dur = getClipDuration(c);
    totalActiveDuration += dur;
    const end = c.startSec + dur;
    if (end > maxEndSec) maxEndSec = end;
  }

  const duckIntervals = computeTrackDuckIntervals(assets, clips);
  const clipCount = clips.length;
  const primaryName =
    firstAsset?.fileName ?? track.fileName ?? 'custom-voiceover.wav';
  const summaryFileName =
    clipCount > 1 ? `${primaryName} (+${clipCount - 1} more)` : primaryName;

  return {
    ...track,
    fileName: summaryFileName,
    mimeType: firstAsset?.mimeType ?? track.mimeType ?? 'audio/wav',
    durationSec:
      activeClips.length > 0
        ? roundSec(totalActiveDuration)
        : firstAsset?.durationSec ?? track.durationSec ?? 0,
    audioBuffer: firstAsset?.audioBuffer ?? track.audioBuffer,
    waveformPeaks:
      firstClip && firstAsset
        ? sliceClipWaveformPeaks(
            firstAsset.waveformPeaks,
            firstAsset.durationSec,
            firstClip.sourceStartSec,
            firstClip.sourceEndSec,
            56,
          )
        : track.waveformPeaks,
    offsetSec: firstClip ? firstClip.startSec : track.offsetSec ?? 0,
    duckIntervals,
    assets,
    clips,
  };
}

/**
 * Appends a newly decoded VoiceoverSourceAsset as a clip on the Voiceover Track
 * right after the last existing clip (or at defaultStartSec when empty).
 */
export function appendVoiceoverAssetToTrack(
  existingTrack: CustomVoiceoverTrack | null,
  asset: VoiceoverSourceAsset,
  defaultStartSec = 0,
): CustomVoiceoverTrack {
  const base: CustomVoiceoverTrack = existingTrack
    ? ensureMultiClipVoiceoverTrack(existingTrack)
    : {
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        durationSec: asset.durationSec,
        audioBuffer: asset.audioBuffer,
        waveformPeaks: asset.waveformPeaks.slice(0, 56),
        offsetSec: Math.max(0, roundSec(defaultStartSec)),
        volume: 1.0,
        autoDuckSfx: true,
        duckIntervals: [],
        assets: {},
        clips: [],
        rippleMode: true,
      };

  const assets: Record<string, VoiceoverSourceAsset> = {
    ...(base.assets ?? {}),
    [asset.id]: asset,
  };
  const prevClips = sortVoiceoverClips(base.clips ?? []);
  const lastClip = prevClips[prevClips.length - 1];
  const nextStartSec = lastClip
    ? roundSec(getClipEndTime(lastClip) + 0.1)
    : Math.max(0, roundSec(defaultStartSec));

  const cleanLabel =
    asset.fileName.replace(/\.[^.]+$/, '').trim() ||
    `Voice Clip ${prevClips.length + 1}`;
  const newClip: VoiceoverClip = normalizeClipFades({
    id: `vo_clip_${Date.now()}_${prevClips.length + 1}`,
    assetId: asset.id,
    name: cleanLabel,
    startSec: nextStartSec,
    sourceStartSec: 0,
    sourceEndSec: roundSec(asset.durationSec),
    volume: 1.0,
    fadeInSec: 0,
    fadeOutSec: 0,
    muted: false,
  });

  return syncVoiceoverTrackSummary({
    ...base,
    assets,
    clips: [...prevClips, newClip],
  });
}

/**
 * Splits a clip at `timelineSplitSec` into two contiguous non-destructive clips.
 * If `timelineSplitSec` falls outside the clip (with `MIN_VOICEOVER_CLIP_DURATION` margin),
 * returns the original clips array unchanged.
 */
export function splitVoiceoverClipAtTime(
  clips: VoiceoverClip[],
  clipId: string,
  timelineSplitSec: number,
  nextIdSuffix = `${Date.now()}`,
): { clips: VoiceoverClip[]; leftClipId: string | null; rightClipId: string | null } {
  const target = clips.find((c) => c.id === clipId);
  if (!target) {
    return { clips: sortVoiceoverClips(clips), leftClipId: null, rightClipId: null };
  }

  const clipDur = getClipDuration(target);
  const offsetIntoClip = roundSec(timelineSplitSec - target.startSec);
  if (
    offsetIntoClip < MIN_VOICEOVER_CLIP_DURATION ||
    clipDur - offsetIntoClip < MIN_VOICEOVER_CLIP_DURATION
  ) {
    return { clips: sortVoiceoverClips(clips), leftClipId: null, rightClipId: null };
  }

  const sourceSplitSec = roundSec(target.sourceStartSec + offsetIntoClip);
  const baseName = target.name.replace(/\s*\(Part\s+\d+\)$/i, '');

  const leftClip: VoiceoverClip = normalizeClipFades({
    ...target,
    name: `${baseName} (Part 1)`,
    sourceEndSec: sourceSplitSec,
    fadeOutSec: Math.min(target.fadeOutSec, 0.04),
  });

  const rightClipId = `${target.id}_split_${nextIdSuffix}`;
  const rightClip: VoiceoverClip = normalizeClipFades({
    ...target,
    id: rightClipId,
    name: `${baseName} (Part 2)`,
    startSec: roundSec(target.startSec + offsetIntoClip),
    sourceStartSec: sourceSplitSec,
    fadeInSec: Math.min(target.fadeInSec, 0.04),
  });

  const updated = clips.flatMap((c) =>
    c.id === clipId ? [leftClip, rightClip] : [c],
  );
  return {
    clips: sortVoiceoverClips(updated),
    leftClipId: leftClip.id,
    rightClipId: rightClip.id,
  };
}

/**
 * Splits whichever clip currently spans `playheadSec`. If `preferredClipId` is provided and spans
 * `playheadSec`, splits that clip first.
 */
export function splitVoiceoverTrackAtPlayhead(
  clips: VoiceoverClip[],
  playheadSec: number,
  preferredClipId?: string | null,
): { clips: VoiceoverClip[]; splitClipIds: [string, string] | null } {
  const sorted = sortVoiceoverClips(clips);
  const candidate =
    (preferredClipId
      ? sorted.find(
          (c) =>
            c.id === preferredClipId &&
            playheadSec >= c.startSec + MIN_VOICEOVER_CLIP_DURATION &&
            playheadSec <= getClipEndTime(c) - MIN_VOICEOVER_CLIP_DURATION,
        )
      : null) ??
    sorted.find(
      (c) =>
        playheadSec >= c.startSec + MIN_VOICEOVER_CLIP_DURATION &&
        playheadSec <= getClipEndTime(c) - MIN_VOICEOVER_CLIP_DURATION,
    );

  if (!candidate) {
    return { clips: sorted, splitClipIds: null };
  }

  const res = splitVoiceoverClipAtTime(sorted, candidate.id, playheadSec);
  if (!res.leftClipId || !res.rightClipId) {
    return { clips: sorted, splitClipIds: null };
  }
  return {
    clips: res.clips,
    splitClipIds: [res.leftClipId, res.rightClipId],
  };
}

/**
 * Trims the start (in-point) or end (out-point) of a clip non-destructively within `[0, assetDurationSec]`.
 * When `rippleMode` is true and trimming the right edge, downstream clips shift by the duration delta.
 */
export function trimVoiceoverClip(
  clips: VoiceoverClip[],
  clipId: string,
  edge: 'start' | 'end',
  deltaSec: number,
  assetDurationSec: number,
  rippleMode = false,
): VoiceoverClip[] {
  const sorted = sortVoiceoverClips(clips);
  const idx = sorted.findIndex((c) => c.id === clipId);
  if (idx < 0) return sorted;

  const target = sorted[idx];
  const safeAssetDur = Math.max(
    MIN_VOICEOVER_CLIP_DURATION,
    assetDurationSec || target.sourceEndSec,
  );

  if (edge === 'start') {
    const minSourceStart = Math.max(0, target.sourceStartSec - target.startSec);
    const maxSourceStart = Math.max(
      minSourceStart,
      target.sourceEndSec - MIN_VOICEOVER_CLIP_DURATION,
    );
    const nextSourceStart = roundSec(
      Math.max(
        minSourceStart,
        Math.min(maxSourceStart, target.sourceStartSec + deltaSec),
      ),
    );
    const appliedDelta = roundSec(nextSourceStart - target.sourceStartSec);
    const nextStartSec = roundSec(Math.max(0, target.startSec + appliedDelta));

    const updatedTarget = normalizeClipFades({
      ...target,
      startSec: nextStartSec,
      sourceStartSec: nextSourceStart,
    });

    return sortVoiceoverClips(
      sorted.map((c, i) => (i === idx ? updatedTarget : c)),
    );
  }

  // edge === 'end'
  const minSourceEnd = Math.min(
    safeAssetDur,
    target.sourceStartSec + MIN_VOICEOVER_CLIP_DURATION,
  );
  const nextSourceEnd = roundSec(
    Math.max(
      minSourceEnd,
      Math.min(safeAssetDur, target.sourceEndSec + deltaSec),
    ),
  );
  const appliedDelta = roundSec(nextSourceEnd - target.sourceEndSec);
  const origEnd = getClipEndTime(target);

  const updatedTarget = normalizeClipFades({
    ...target,
    sourceEndSec: nextSourceEnd,
  });

  return sortVoiceoverClips(
    sorted.map((c, i) => {
      if (i === idx) return updatedTarget;
      if (rippleMode && c.startSec >= origEnd - 0.02) {
        return {
          ...c,
          startSec: roundSec(Math.max(0, c.startSec + appliedDelta)),
        };
      }
      return c;
    }),
  );
}

/**
 * Moves a clip to `newStartSec` (clamped >= 0). When `rippleMode` is true, all clips
 * starting at or after the moved clip's original `startSec` shift by the same delta.
 */
export function moveVoiceoverClip(
  clips: VoiceoverClip[],
  clipId: string,
  newStartSec: number,
  rippleMode = false,
): VoiceoverClip[] {
  const sorted = sortVoiceoverClips(clips);
  const target = sorted.find((c) => c.id === clipId);
  if (!target) return sorted;

  const clampedStart = roundSec(Math.max(0, newStartSec));
  const delta = roundSec(clampedStart - target.startSec);
  if (Math.abs(delta) < 1e-4) return sorted;

  const origStart = target.startSec;

  return sortVoiceoverClips(
    sorted.map((c) => {
      if (c.id === clipId) {
        return { ...c, startSec: clampedStart };
      }
      if (rippleMode && c.startSec >= origStart - 0.01) {
        return {
          ...c,
          startSec: roundSec(Math.max(0, c.startSec + delta)),
        };
      }
      return c;
    }),
  );
}

/**
 * Deletes a clip. When `rippleDelete` is true, all downstream clips shift left
 * to close the removed clip's duration (plus any immediate gap up to the next clip).
 */
export function deleteVoiceoverClip(
  clips: VoiceoverClip[],
  clipId: string,
  rippleDelete = false,
): VoiceoverClip[] {
  const sorted = sortVoiceoverClips(clips);
  const idx = sorted.findIndex((c) => c.id === clipId);
  if (idx < 0) return sorted;

  const removed = sorted[idx];
  const removedDuration = getClipDuration(removed);
  const removedStart = removed.startSec;
  const remaining = sorted.filter((c) => c.id !== clipId);

  if (!rippleDelete) {
    return remaining;
  }

  return sortVoiceoverClips(
    remaining.map((c) => {
      if (c.startSec >= removedStart - 0.01) {
        return {
          ...c,
          startSec: roundSec(Math.max(0, c.startSec - removedDuration)),
        };
      }
      return c;
    }),
  );
}

/**
 * Updates per-clip inspector settings (`volume`, `fadeInSec`, `fadeOutSec`, `muted`, `name`, `startSec`).
 */
export function updateVoiceoverClipSettings(
  clips: VoiceoverClip[],
  clipId: string,
  patch: Partial<
    Pick<
      VoiceoverClip,
      'name' | 'startSec' | 'volume' | 'fadeInSec' | 'fadeOutSec' | 'muted'
    >
  >,
): VoiceoverClip[] {
  return sortVoiceoverClips(
    clips.map((c) => {
      if (c.id !== clipId) return c;
      const next: VoiceoverClip = {
        ...c,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.startSec !== undefined
          ? { startSec: roundSec(Math.max(0, patch.startSec)) }
          : {}),
        ...(patch.volume !== undefined ? { volume: patch.volume } : {}),
        ...(patch.fadeInSec !== undefined ? { fadeInSec: patch.fadeInSec } : {}),
        ...(patch.fadeOutSec !== undefined
          ? { fadeOutSec: patch.fadeOutSec }
          : {}),
        ...(patch.muted !== undefined ? { muted: patch.muted } : {}),
      };
      return normalizeClipFades(next);
    }),
  );
}

/**
 * Extracts a resampled waveform peak array for the sub-region `[sourceStartSec, sourceEndSec]`
 * of an asset's full waveform peak array so trimmed/split clips display accurate local peaks.
 */
export function sliceClipWaveformPeaks(
  assetPeaks: number[],
  assetDurationSec: number,
  sourceStartSec: number,
  sourceEndSec: number,
  targetBars = 48,
): number[] {
  const count = Math.max(6, Math.min(240, Math.round(targetBars)));
  if (!assetPeaks || assetPeaks.length === 0 || assetDurationSec <= 0) {
    return Array.from({ length: count }, () => 0.15);
  }
  const startRatio = Math.max(
    0,
    Math.min(1, sourceStartSec / Math.max(0.01, assetDurationSec)),
  );
  const endRatio = Math.max(
    startRatio + 0.001,
    Math.min(1, sourceEndSec / Math.max(0.01, assetDurationSec)),
  );
  const spanRatio = endRatio - startRatio;

  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const r0 = startRatio + (i / count) * spanRatio;
    const r1 = startRatio + ((i + 1) / count) * spanRatio;
    const idx0 = Math.max(
      0,
      Math.min(assetPeaks.length - 1, Math.floor(r0 * assetPeaks.length)),
    );
    const idx1 = Math.max(
      idx0,
      Math.min(assetPeaks.length - 1, Math.ceil(r1 * assetPeaks.length)),
    );
    let maxVal = 0.08;
    for (let j = idx0; j <= idx1; j++) {
      if (assetPeaks[j] > maxVal) maxVal = assetPeaks[j];
    }
    out.push(roundSec(Math.min(1, maxVal)));
  }
  return out;
}

/**
 * Projects each active (non-muted) clip's trimmed source vocal-activity intervals
 * onto the scene timeline and merges overlapping/adjacent speech windows for SFX auto-ducking.
 */
export function computeTrackDuckIntervals(
  assets: Record<string, VoiceoverSourceAsset>,
  clips: VoiceoverClip[],
): { start: number; end: number }[] {
  const raw: { start: number; end: number }[] = [];

  for (const clip of clips) {
    if (clip.muted) continue;
    const asset = assets[clip.assetId];
    const clipDur = getClipDuration(clip);
    if (!asset) {
      raw.push({
        start: roundSec(clip.startSec),
        end: roundSec(clip.startSec + clipDur),
      });
      continue;
    }

    const baseIntervals =
      asset.duckIntervals && asset.duckIntervals.length > 0
        ? asset.duckIntervals
        : [{ start: 0, end: asset.durationSec }];

    for (const iv of baseIntervals) {
      const clippedSourceStart = Math.max(clip.sourceStartSec, iv.start);
      const clippedSourceEnd = Math.min(clip.sourceEndSec, iv.end);
      if (clippedSourceEnd <= clippedSourceStart + 0.02) continue;

      const timelineStart =
        clip.startSec + (clippedSourceStart - clip.sourceStartSec);
      const timelineEnd =
        clip.startSec + (clippedSourceEnd - clip.sourceStartSec);
      raw.push({
        start: roundSec(Math.max(0, timelineStart)),
        end: roundSec(Math.max(0, timelineEnd)),
      });
    }
  }

  raw.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const iv of raw) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end + 0.22) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }
  return merged;
}

/**
 * Evaluates linear fade-in / fade-out envelope multiplier `[0..1]` at `clipLocalSec`
 * (`0 <= clipLocalSec <= clipDuration`).
 */
export function evaluateClipFadeGain(
  clip: VoiceoverClip,
  clipLocalSec: number,
): number {
  const dur = getClipDuration(clip);
  if (clipLocalSec < 0 || clipLocalSec > dur) return 0;
  let mult = 1;
  if (clip.fadeInSec > 0.005 && clipLocalSec < clip.fadeInSec) {
    mult = Math.min(mult, Math.max(0, clipLocalSec / clip.fadeInSec));
  }
  const rem = dur - clipLocalSec;
  if (clip.fadeOutSec > 0.005 && rem < clip.fadeOutSec) {
    mult = Math.min(mult, Math.max(0, rem / clip.fadeOutSec));
  }
  return mult;
}
