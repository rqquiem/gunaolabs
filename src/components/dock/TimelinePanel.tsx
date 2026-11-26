import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Repeat,
  Video,
  Move3d,
  Smile,
  Swords,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  Pencil,
  Check,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  Scissors,
  Mic,
} from 'lucide-react';
import { CHARACTER_STATE_META } from '../../engine/characterStates';
import { CHARACTER_ACTION_META } from '../../engine/characterActions';
import { formatHeldItemsSummary } from '../../engine/itemCatalog';
import {
  getClipDuration,
  sliceClipWaveformPeaks,
} from '../../engine/voiceoverCutter';
import {
  clamp,
  formatTimecode,
  getChapterAtTime,
  getChapterBounds,
} from '../../engine/timeline';
import {
  AnimationProject,
  CameraMode,
  CHAPTER_COLORS,
  ChapterMarker,
  CustomVoiceoverTrack,
  EASING_OPTIONS,
  EasingType,
  EXPRESSION_PRESET_LABELS,
  ItemEasingMode,
  MapDefinition,
  VoiceoverClip,
} from '../../engine/types';

export type SelectedKeyRef =
  | { kind: 'camera'; keyframeId: string }
  | { kind: 'lighting'; keyframeId: string }
  | { kind: 'map'; keyframeId: string }
  | { kind: 'actor'; actorId: string; keyframeId: string }
  | { kind: 'face'; actorId: string; keyframeId: string }
  | { kind: 'item'; actorId: string; keyframeId: string }
  | { kind: 'state'; actorId: string; keyframeId: string }
  | { kind: 'action'; actorId: string; keyframeId: string };

interface TimelinePanelProps {
  project: AnimationProject;
  currentTime: number;
  isPlaying: boolean;
  audioMuted?: boolean;
  playbackSpeed: number;
  cameraMode: CameraMode;
  selectedActorId: string | null;
  builtInMaps: MapDefinition[];
  customMaps: MapDefinition[];
  customVoiceover?: CustomVoiceoverTrack | null;
  selectedVoClipId?: string | null;
  onSelectVoClip?: (clipId: string) => void;
  onMoveVoClip?: (clipId: string, newStartSec: number) => void;
  onSplitVoAtPlayhead?: () => void;
  onOpenVoiceoverCutter?: () => void;
  onTogglePlay: () => void;
  onToggleAudio?: () => void;
  onSeek: (time: number) => void;
  onChangeSpeed: (speed: number) => void;
  onToggleLoop: () => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onSelectActor: (actorId: string) => void;
  onKeyActorAtCurrentTime: () => void;
  onKeyFaceAtCurrentTime: () => void;
  onKeyItemAtCurrentTime: () => void;
  onKeyStateAtCurrentTime: () => void;
  onKeyActionAtCurrentTime: () => void;
  onKeyCameraAtCurrentTime: () => void;
  onKeyLightingAtCurrentTime: () => void;
  onKeyMapAtCurrentTime: (map: MapDefinition, applyAtmosphere: boolean) => void;
  onMoveActorKeyframe: (actorId: string, keyframeId: string, newTime: number) => void;
  onMoveFaceKeyframe: (actorId: string, keyframeId: string, newTime: number) => void;
  onMoveItemKeyframe: (actorId: string, keyframeId: string, newTime: number) => void;
  onMoveStateKeyframe: (actorId: string, keyframeId: string, newTime: number) => void;
  onMoveActionKeyframe: (actorId: string, keyframeId: string, newTime: number) => void;
  onMoveCameraKeyframe: (keyframeId: string, newTime: number) => void;
  onMoveLightingKeyframe: (keyframeId: string, newTime: number) => void;
  onMoveMapKeyframe: (keyframeId: string, newTime: number) => void;
  onUpdateKeyframeEasing: (ref: SelectedKeyRef, easing: EasingType) => void;
  onUpdateItemKeyframeCurve: (
    actorId: string,
    keyframeId: string,
    easing: ItemEasingMode,
  ) => void;
  onDeleteActorKeyframe: (actorId: string, keyframeId: string) => void;
  onDeleteFaceKeyframe: (actorId: string, keyframeId: string) => void;
  onDeleteItemKeyframe: (actorId: string, keyframeId: string) => void;
  onDeleteStateKeyframe: (actorId: string, keyframeId: string) => void;
  onDeleteActionKeyframe: (actorId: string, keyframeId: string) => void;
  onDeleteCameraKeyframe: (keyframeId: string) => void;
  onDeleteLightingKeyframe: (keyframeId: string) => void;
  onDeleteMapKeyframe: (keyframeId: string) => void;
  onUpsertChapter: (chapter: ChapterMarker) => void;
  onDeleteChapter: (chapterId: string) => void;
  onRippleShiftFrom: (fromTime: number, deltaSec: number) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  project,
  currentTime,
  isPlaying,
  audioMuted = false,
  playbackSpeed,
  cameraMode,
  selectedActorId,
  builtInMaps,
  customMaps,
  customVoiceover = null,
  selectedVoClipId = null,
  onSelectVoClip,
  onMoveVoClip,
  onSplitVoAtPlayhead,
  onOpenVoiceoverCutter,
  onTogglePlay,
  onToggleAudio,
  onSeek,
  onChangeSpeed,
  onToggleLoop,
  onSetCameraMode,
  onSelectActor,
  onKeyActorAtCurrentTime,
  onKeyFaceAtCurrentTime,
  onKeyItemAtCurrentTime,
  onKeyStateAtCurrentTime,
  onKeyActionAtCurrentTime,
  onKeyCameraAtCurrentTime,
  onKeyLightingAtCurrentTime,
  onKeyMapAtCurrentTime,
  onMoveActorKeyframe,
  onMoveFaceKeyframe,
  onMoveItemKeyframe,
  onMoveStateKeyframe,
  onMoveActionKeyframe,
  onMoveCameraKeyframe,
  onMoveLightingKeyframe,
  onMoveMapKeyframe,
  onUpdateKeyframeEasing,
  onUpdateItemKeyframeCurve,
  onDeleteActorKeyframe,
  onDeleteFaceKeyframe,
  onDeleteItemKeyframe,
  onDeleteStateKeyframe,
  onDeleteActionKeyframe,
  onDeleteCameraKeyframe,
  onDeleteLightingKeyframe,
  onDeleteMapKeyframe,
  onUpsertChapter,
  onDeleteChapter,
  onRippleShiftFrom,
}) => {
  const [selectedKey, setSelectedKey] = useState<SelectedKeyRef | null>(null);
  const [dragInfo, setDragInfo] = useState<{
    ref: SelectedKeyRef;
    time: number;
  } | null>(null);

  const [viewWindow, setViewWindow] = useState<[number, number]>([
    0,
    Math.max(2, project.duration),
  ]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterTitleDraft, setChapterTitleDraft] = useState('');
  const [cueMapId, setCueMapId] = useState<string>(
    () => builtInMaps[0]?.id ?? 'map_crossroads',
  );

  const allMaps = useMemo(
    () => [...customMaps, ...builtInMaps],
    [customMaps, builtInMaps],
  );

  const dragStateRef = useRef<{
    ref: SelectedKeyRef;
    trackEl: HTMLElement;
    startX: number;
    didDrag: boolean;
  } | null>(null);

  const voTrackDragRef = useRef<{
    clipId: string;
    trackEl: HTMLElement;
    startX: number;
    initStartSec: number;
    didDrag: boolean;
  } | null>(null);

  const minimapDragRef = useRef<{
    mode: 'pan' | 'left' | 'right';
    barEl: HTMLElement;
    startX: number;
    initStart: number;
    initEnd: number;
  } | null>(null);

  const minWindowSpan = Math.min(project.duration, 4);

  // Reset viewport window when switching scenes/projects
  useEffect(() => {
    setViewWindow([0, Math.max(2, project.duration)]);
    setSelectedKey(null);
    setEditingChapterId(null);
  }, [project.id]);

  // Keep viewport window valid when duration changes
  useEffect(() => {
    setViewWindow(([s, e]) => {
      const dur = Math.max(2, project.duration);
      const minSpan = Math.min(dur, 4);
      const prevSpan = Math.max(minSpan, e - s);
      if (prevSpan >= dur - 0.05) {
        return [0, dur];
      }
      const nextEnd = Math.min(dur, Math.max(minSpan, e));
      const nextStart = Math.max(0, Math.min(s, nextEnd - minSpan));
      return [nextStart, nextEnd];
    });
  }, [project.duration]);

  // Auto-follow playhead while playing
  useEffect(() => {
    if (!isPlaying) return;
    setViewWindow(([s, e]) => {
      const dur = Math.max(2, project.duration);
      const span = e - s;
      if (span >= dur - 0.05) return [0, dur];
      if (currentTime >= s && currentTime <= e) return [s, e];
      if (currentTime < s) {
        const nextStart = clamp(currentTime - span * 0.1, 0, Math.max(0, dur - span));
        return [nextStart, nextStart + span];
      }
      const nextStart = clamp(currentTime - span * 0.15, 0, Math.max(0, dur - span));
      return [nextStart, nextStart + span];
    });
  }, [isPlaying, currentTime, project.duration]);

  const [viewStart, viewEnd] = viewWindow;
  const viewSpan = Math.max(0.1, viewEnd - viewStart);
  const zoomFactor = project.duration > 0 ? project.duration / viewSpan : 1;

  const toWindowPct = (time: number) => ((time - viewStart) / viewSpan) * 100;
  const isInWindow = (time: number, padSec = 0.25) =>
    time >= viewStart - padSec && time <= viewEnd + padSec;

  const playheadPct = clamp(toWindowPct(currentTime), 0, 100);
  const playheadVisible = currentTime >= viewStart - 0.05 && currentTime <= viewEnd + 0.05;

  const lightingTrack = project.lightingTrack ?? [];
  const mapTrack = project.mapTrack ?? [];
  const chapters = useMemo(
    () => [...(project.chapters ?? [])].sort((a, b) => a.time - b.time),
    [project.chapters],
  );
  const activeChapter = useMemo(
    () => getChapterAtTime(chapters, currentTime),
    [chapters, currentTime],
  );
  const selectedActor = project.actors.find((a) => a.id === selectedActorId);

  const applyZoom = (nextZoom: number, anchorTime = currentTime) => {
    const dur = Math.max(2, project.duration);
    const clampedZoom = clamp(nextZoom, 1, 32);
    const nextSpan = clamp(dur / clampedZoom, minWindowSpan, dur);
    const ratio = clamp((anchorTime - viewStart) / viewSpan, 0.15, 0.85);
    const nextStart = clamp(anchorTime - ratio * nextSpan, 0, Math.max(0, dur - nextSpan));
    setViewWindow([nextStart, nextStart + nextSpan]);
  };

  const zoomToFit = () => {
    setViewWindow([0, Math.max(2, project.duration)]);
  };

  const ensureTimeVisible = (time: number) => {
    if (time >= viewStart && time <= viewEnd) return;
    const dur = Math.max(2, project.duration);
    const nextStart = clamp(time - viewSpan * 0.2, 0, Math.max(0, dur - viewSpan));
    setViewWindow([nextStart, nextStart + viewSpan]);
  };

  const handleJumpToChapter = (chapterId: string, focusZoom = false) => {
    const bounds = getChapterBounds(chapters, chapterId, project.duration);
    if (!bounds) return;
    onSeek(bounds.startSec);
    if (focusZoom) {
      const pad = Math.max(1, (bounds.endSec - bounds.startSec) * 0.05);
      const start = Math.max(0, bounds.startSec - pad);
      const end = Math.min(project.duration, Math.max(start + minWindowSpan, bounds.endSec + pad));
      setViewWindow([start, end]);
    } else {
      ensureTimeVisible(bounds.startSec);
    }
  };

  const handlePrevNextChapter = (dir: -1 | 1) => {
    if (chapters.length === 0) return;
    if (dir < 0) {
      const prev = [...chapters]
        .reverse()
        .find((c) => c.time < currentTime - 0.15);
      handleJumpToChapter((prev ?? chapters[0]).id);
    } else {
      const next = chapters.find((c) => c.time > currentTime + 0.15);
      handleJumpToChapter((next ?? chapters[chapters.length - 1]).id);
    }
  };

  const handleAddChapterAtPlayhead = () => {
    const idx = chapters.length + 1;
    const newCh: ChapterMarker = {
      id: `ch_${Date.now()}`,
      time: Math.round(currentTime * 20) / 20,
      title: `Chapter ${idx}`,
      color: CHAPTER_COLORS[(idx - 1) % CHAPTER_COLORS.length],
    };
    onUpsertChapter(newCh);
    setEditingChapterId(newCh.id);
    setChapterTitleDraft(newCh.title);
  };

  const beginKeyDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    ref: SelectedKeyRef,
    initialTime: number,
  ) => {
    e.stopPropagation();
    const trackEl = e.currentTarget.parentElement;
    if (!trackEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedKey(ref);
    if (
      ref.kind === 'actor' ||
      ref.kind === 'face' ||
      ref.kind === 'item' ||
      ref.kind === 'state' ||
      ref.kind === 'action'
    ) {
      onSelectActor(ref.actorId);
    }
    dragStateRef.current = {
      ref,
      trackEl,
      startX: e.clientX,
      didDrag: false,
    };
    setDragInfo({ ref, time: initialTime });
  };

  const handleKeyPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    if (!state.didDrag && Math.abs(e.clientX - state.startX) < 3) return;
    state.didDrag = true;

    const rect = state.trackEl.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const targetTime = clamp(viewStart + ratio * viewSpan, 0, project.duration);
    const snapped = Math.round(targetTime * 20) / 20;

    setDragInfo({ ref: state.ref, time: snapped });
    if (state.ref.kind === 'actor') {
      onMoveActorKeyframe(state.ref.actorId, state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'face') {
      onMoveFaceKeyframe(state.ref.actorId, state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'item') {
      onMoveItemKeyframe(state.ref.actorId, state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'state') {
      onMoveStateKeyframe(state.ref.actorId, state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'action') {
      onMoveActionKeyframe(state.ref.actorId, state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'camera') {
      onMoveCameraKeyframe(state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'lighting') {
      onMoveLightingKeyframe(state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'map') {
      onMoveMapKeyframe(state.ref.keyframeId, snapped);
    }
    onSeek(snapped);
  };

  const endKeyDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    fallbackTime: number,
  ) => {
    const state = dragStateRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (state && !state.didDrag) {
      onSeek(fallbackTime);
    }
    dragStateRef.current = null;
    setDragInfo(null);
  };

  // Minimap pointer interactions (pan window or resize left/right edges)
  const beginMinimapDrag = (
    e: React.PointerEvent<HTMLElement>,
    mode: 'pan' | 'left' | 'right',
    barEl: HTMLElement | null,
  ) => {
    if (!barEl) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    minimapDragRef.current = {
      mode,
      barEl,
      startX: e.clientX,
      initStart: viewStart,
      initEnd: viewEnd,
    };
  };

  const handleMinimapMove = (e: React.PointerEvent<HTMLElement>) => {
    const st = minimapDragRef.current;
    if (!st) return;
    const rect = st.barEl.getBoundingClientRect();
    const dxSec = ((e.clientX - st.startX) / Math.max(1, rect.width)) * project.duration;
    const dur = Math.max(2, project.duration);

    if (st.mode === 'pan') {
      const span = st.initEnd - st.initStart;
      const nextStart = clamp(st.initStart + dxSec, 0, Math.max(0, dur - span));
      setViewWindow([nextStart, nextStart + span]);
    } else if (st.mode === 'left') {
      const nextStart = clamp(st.initStart + dxSec, 0, st.initEnd - minWindowSpan);
      setViewWindow([nextStart, st.initEnd]);
    } else {
      const nextEnd = clamp(st.initEnd + dxSec, st.initStart + minWindowSpan, dur);
      setViewWindow([st.initStart, nextEnd]);
    }
  };

  const endMinimapDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    minimapDragRef.current = null;
  };

  const handleMinimapBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const clickTime = ratio * project.duration;
    const dur = Math.max(2, project.duration);
    const nextStart = clamp(clickTime - viewSpan * 0.5, 0, Math.max(0, dur - viewSpan));
    setViewWindow([nextStart, nextStart + viewSpan]);
    onSeek(Math.round(clickTime * 20) / 20);
  };

  // Keyframe density ticks on minimap (deduplicated to 0.5% buckets)
  const minimapTicks = useMemo(() => {
    const dur = Math.max(0.1, project.duration);
    const buckets = new Set<number>();
    const addTick = (t: number) => {
      const pct = Math.round((clamp(t, 0, dur) / dur) * 200) / 2;
      buckets.add(pct);
    };
    project.cameraTrack.forEach((k) => addTick(k.time));
    lightingTrack.forEach((k) => addTick(k.time));
    mapTrack.forEach((k) => addTick(k.time));
    project.actors.forEach((a) => {
      a.keyframes.forEach((k) => addTick(k.time));
      a.faceKeyframes?.forEach((k) => addTick(k.time));
      a.heldItemKeyframes?.forEach((k) => addTick(k.time));
      a.stateKeyframes?.forEach((k) => addTick(k.time));
      a.actionKeyframes?.forEach((k) => addTick(k.time));
    });
    return Array.from(buckets);
  }, [project, lightingTrack, mapTrack]);

  // Resolve currently selected keyframe details for inline easing & delete controls
  const resolvedSelectedKey = (() => {
    if (!selectedKey) return null;
    if (selectedKey.kind === 'camera') {
      const kf = project.cameraTrack.find((k) => k.id === selectedKey.keyframeId);
      if (!kf) return null;
      return {
        label: `Camera · ${formatTimecode(kf.time)}`,
        easing: kf.easing,
        mode: 'easing' as const,
        canDelete: project.cameraTrack.length > 1,
        onDelete: () => {
          onDeleteCameraKeyframe(kf.id);
          setSelectedKey(null);
        },
      };
    }
    if (selectedKey.kind === 'lighting') {
      const kf = lightingTrack.find((k) => k.id === selectedKey.keyframeId);
      if (!kf) return null;
      return {
        label: `Lighting · ${formatTimecode(kf.time)}`,
        easing: kf.easing,
        mode: 'easing' as const,
        canDelete: true,
        onDelete: () => {
          onDeleteLightingKeyframe(kf.id);
          setSelectedKey(null);
        },
      };
    }
    if (selectedKey.kind === 'map') {
      const kf = mapTrack.find((k) => k.id === selectedKey.keyframeId);
      if (!kf) return null;
      return {
        label: `Stage: ${kf.label} · ${formatTimecode(kf.time)}`,
        mode: 'map' as const,
        canDelete: true,
        onDelete: () => {
          onDeleteMapKeyframe(kf.id);
          setSelectedKey(null);
        },
      };
    }
    if (selectedKey.kind === 'actor') {
      const actor = project.actors.find((a) => a.id === selectedKey.actorId);
      const kf = actor?.keyframes.find((k) => k.id === selectedKey.keyframeId);
      if (!actor || !kf) return null;
      return {
        label: `${actor.name} Pose (${kf.clip}) · ${formatTimecode(kf.time)}`,
        easing: kf.easing,
        mode: 'easing' as const,
        canDelete: actor.keyframes.length > 1,
        onDelete: () => {
          onDeleteActorKeyframe(actor.id, kf.id);
          setSelectedKey(null);
        },
      };
    }
    if (selectedKey.kind === 'face') {
      const actor = project.actors.find((a) => a.id === selectedKey.actorId);
      const kf = actor?.faceKeyframes?.find((k) => k.id === selectedKey.keyframeId);
      if (!actor || !kf) return null;
      return {
        label: `${actor.name} Face (${EXPRESSION_PRESET_LABELS[kf.preset]}) · ${formatTimecode(kf.time)}`,
        easing: kf.easing,
        mode: 'easing' as const,
        canDelete: true,
        onDelete: () => {
          onDeleteFaceKeyframe(actor.id, kf.id);
          setSelectedKey(null);
        },
      };
    }
    if (selectedKey.kind === 'item') {
      const actor = project.actors.find((a) => a.id === selectedKey.actorId);
      const kf = actor?.heldItemKeyframes?.find(
        (k) => k.id === selectedKey.keyframeId,
      );
      if (!actor || !kf) return null;
      return {
        label: `${actor.name} Items (${formatHeldItemsSummary({ right: kf.right, left: kf.left })}) · ${formatTimecode(kf.time)}`,
        itemEasing: kf.easing,
        actorId: actor.id,
        keyframeId: kf.id,
        mode: 'item' as const,
        canDelete: true,
        onDelete: () => {
          onDeleteItemKeyframe(actor.id, kf.id);
          setSelectedKey(null);
        },
      };
    }
    if (selectedKey.kind === 'state') {
      const actor = project.actors.find((a) => a.id === selectedKey.actorId);
      const kf = actor?.stateKeyframes?.find((k) => k.id === selectedKey.keyframeId);
      if (!actor || !kf) return null;
      const meta = CHARACTER_STATE_META[kf.stateId];
      return {
        label: `${actor.name} State (${meta.label}) · ${formatTimecode(kf.time)}`,
        mode: 'map' as const,
        canDelete: true,
        onDelete: () => {
          onDeleteStateKeyframe(actor.id, kf.id);
          setSelectedKey(null);
        },
      };
    }
    if (selectedKey.kind === 'action') {
      const actor = project.actors.find((a) => a.id === selectedKey.actorId);
      const kf = actor?.actionKeyframes?.find((k) => k.id === selectedKey.keyframeId);
      if (!actor || !kf) return null;
      const meta = CHARACTER_ACTION_META[kf.actionId];
      return {
        label: `${actor.name} Action (${meta.label}) · ${formatTimecode(kf.time)}`,
        mode: 'map' as const,
        canDelete: true,
        onDelete: () => {
          onDeleteActionKeyframe(actor.id, kf.id);
          setSelectedKey(null);
        },
      };
    }
    return null;
  })();

  const isKeySelected = (ref: SelectedKeyRef) => {
    if (!selectedKey || selectedKey.kind !== ref.kind) return false;
    if (selectedKey.keyframeId !== ref.keyframeId) return false;
    if (
      (ref.kind === 'actor' ||
        ref.kind === 'face' ||
        ref.kind === 'item' ||
        ref.kind === 'state' ||
        ref.kind === 'action') &&
      (selectedKey.kind === 'actor' ||
        selectedKey.kind === 'face' ||
        selectedKey.kind === 'item' ||
        selectedKey.kind === 'state' ||
        selectedKey.kind === 'action')
    ) {
      return selectedKey.actorId === ref.actorId;
    }
    return true;
  };

  const selectedCueMap =
    allMaps.find((m) => m.id === cueMapId) ?? builtInMaps[0];

  const minimapBracketLeft =
    project.duration > 0 ? (viewStart / project.duration) * 100 : 0;
  const minimapBracketWidth =
    project.duration > 0
      ? Math.max(3, (viewSpan / project.duration) * 100)
      : 100;

  return (
    <div className="space-y-2">
      {/* Transport & Quick Keying Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause Timeline' : 'Play Timeline'}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSeek(0);
              ensureTimeVisible(0);
            }}
            aria-label="Restart to 00:00.0"
            className="p-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-slate-200 hover:bg-[#363a43] transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div
            className="px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs font-mono-tabular text-slate-200 whitespace-nowrap"
            aria-label="Current Timecode"
          >
            {formatTimecode(currentTime)}{' '}
            <span className="text-slate-500">/ {formatTimecode(project.duration)}</span>
          </div>

          <button
            type="button"
            onClick={onToggleLoop}
            aria-pressed={project.loop}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              project.loop
                ? 'bg-[#2b2e35] border-[#00a2ff]/60 text-[#38bdf8]'
                : 'bg-[#2b2e35] border-[#393d47] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3 h-3" aria-hidden="true" />
            <span>Loop</span>
          </button>

          <label className="sr-only" htmlFor="playback-speed-select">
            Playback Speed
          </label>
          <select
            id="playback-speed-select"
            value={playbackSpeed}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            className="px-1.5 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-mono-tabular text-slate-200"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>

          {onToggleAudio && (
            <button
              type="button"
              onClick={onToggleAudio}
              aria-pressed={!audioMuted}
              aria-label={audioMuted ? 'Unmute Episode Audio' : 'Mute Episode Audio'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                !audioMuted
                  ? 'bg-[#2b2e35] border-[#393d47] text-slate-200 hover:bg-[#363a43]'
                  : 'bg-[#14161a] border-[#393d47] text-slate-500 hover:text-slate-300'
              }`}
            >
              {audioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
              )}
              <span>{audioMuted ? 'Muted' : 'Audio'}</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-[#393d47]">
            <button
              type="button"
              onClick={() => applyZoom(zoomFactor / 1.6)}
              disabled={zoomFactor <= 1.05}
              aria-label="Zoom out timeline"
              title="Zoom out timeline"
              className="p-1 rounded bg-[#2b2e35] border border-[#393d47] text-slate-200 hover:bg-[#363a43] disabled:opacity-40 shrink-0"
            >
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span className="px-1.5 text-[11px] font-mono-tabular text-slate-300 whitespace-nowrap">
              {zoomFactor.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => applyZoom(zoomFactor * 1.6)}
              disabled={viewSpan <= minWindowSpan + 0.05}
              aria-label="Zoom in timeline"
              title="Zoom in around playhead"
              className="p-1 rounded bg-[#2b2e35] border border-[#393d47] text-slate-200 hover:bg-[#363a43] disabled:opacity-40 shrink-0"
            >
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={zoomToFit}
              disabled={zoomFactor <= 1.05}
              aria-label="Fit entire timeline"
              title="Fit full scene duration"
              className="p-1 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:bg-[#363a43] disabled:opacity-40 shrink-0"
            >
              <Maximize2 className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-md bg-[#14161a] border border-[#393d47]">
            <button
              type="button"
              onClick={() => onSetCameraMode('orbit')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                cameraMode === 'orbit'
                  ? 'bg-[#2b2e35] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Move3d className="w-3 h-3" aria-hidden="true" />
              <span>Orbit</span>
            </button>
            <button
              type="button"
              onClick={() => onSetCameraMode('director')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                cameraMode === 'director'
                  ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3 h-3" aria-hidden="true" />
              <span>Director</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onKeyActorAtCurrentTime}
            disabled={!selectedActorId}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Key Pose</span>
          </button>

          <button
            type="button"
            onClick={onKeyFaceAtCurrentTime}
            disabled={!selectedActor || selectedActor.kind !== 'character'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Smile className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Key Face</span>
          </button>

          <button
            type="button"
            onClick={onKeyItemAtCurrentTime}
            disabled={!selectedActor || selectedActor.kind !== 'character'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Swords className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
            <span>Key Item</span>
          </button>

          <button
            type="button"
            onClick={onKeyStateAtCurrentTime}
            disabled={!selectedActor || selectedActor.kind !== 'character'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" aria-hidden="true" />
            <span>Key State</span>
          </button>

          <button
            type="button"
            onClick={onKeyActionAtCurrentTime}
            disabled={!selectedActor || selectedActor.kind !== 'character'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Key Action</span>
          </button>

          <button
            type="button"
            onClick={onKeyCameraAtCurrentTime}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
            <span>Key Cam</span>
          </button>

          <button
            type="button"
            onClick={onKeyLightingAtCurrentTime}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
            <span>Key Light</span>
          </button>
        </div>
      </div>

      {/* Chapters Strip + Overview Minimap + Ripple Shift */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
            <button
              type="button"
              onClick={() => handlePrevNextChapter(-1)}
              disabled={chapters.length === 0}
              aria-label="Previous chapter"
              className="p-1 rounded bg-[#14161a] border border-[#393d47] text-slate-300 hover:bg-[#2b2e35] disabled:opacity-40 shrink-0"
            >
              <ChevronLeft className="w-3 h-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handlePrevNextChapter(1)}
              disabled={chapters.length === 0}
              aria-label="Next chapter"
              className="p-1 rounded bg-[#14161a] border border-[#393d47] text-slate-300 hover:bg-[#2b2e35] disabled:opacity-40 shrink-0"
            >
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleAddChapterAtPlayhead}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-medium text-slate-200 hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
              <span>+ Chapter</span>
            </button>

            {chapters.length === 0 ? (
              <span className="text-[11px] text-slate-500 px-1 whitespace-nowrap">
                No chapters yet — add beats to jump & export sections
              </span>
            ) : (
              chapters.map((ch) => {
                const isActive = activeChapter?.id === ch.id;
                if (editingChapterId === ch.id) {
                  return (
                    <form
                      key={ch.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        onUpsertChapter({
                          ...ch,
                          title: chapterTitleDraft.trim() || ch.title,
                        });
                        setEditingChapterId(null);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#14161a] border border-[#00a2ff] shrink-0"
                    >
                      <input
                        type="text"
                        aria-label="Chapter Title"
                        value={chapterTitleDraft}
                        onChange={(e) => setChapterTitleDraft(e.target.value)}
                        className="w-28 bg-transparent text-[11px] text-slate-100 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        aria-label="Save chapter title"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteChapter(ch.id);
                          setEditingChapterId(null);
                        }}
                        aria-label="Delete chapter"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </form>
                  );
                }

                return (
                  <div
                    key={ch.id}
                    className={`inline-flex items-center gap-1 rounded border text-[11px] transition-colors shrink-0 ${
                      isActive
                        ? 'bg-[#2b2e35] border-[#00a2ff] text-white font-medium'
                        : 'bg-[#14161a] border-[#393d47] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleJumpToChapter(ch.id)}
                      onDoubleClick={() => handleJumpToChapter(ch.id, true)}
                      title={`Jump to ${ch.title} (${formatTimecode(ch.time)}) · Double-click to zoom chapter`}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 whitespace-nowrap"
                    >
                      <span
                        className="w-2 h-2 rounded-xs shrink-0"
                        style={{ backgroundColor: ch.color }}
                      />
                      <span>{ch.title}</span>
                      <span className="font-mono-tabular text-[10px] text-slate-500">
                        {formatTimecode(ch.time).slice(0, 5)}
                      </span>
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingChapterId(ch.id);
                          setChapterTitleDraft(ch.title);
                        }}
                        aria-label={`Rename ${ch.title}`}
                        className="pr-1.5 text-slate-400 hover:text-white"
                      >
                        <Pencil className="w-2.5 h-2.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeChapter && (
              <button
                type="button"
                onClick={() => handleJumpToChapter(activeChapter.id, true)}
                className="px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-[#38bdf8] hover:bg-[#2b2e35] whitespace-nowrap shrink-0"
              >
                Focus Ch
              </button>
            )}
            <button
              type="button"
              onClick={() => onRippleShiftFrom(currentTime, -2)}
              title="Ripple-shift keyframes, chapters, and dialogue from playhead earlier by 2s"
              className="px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] font-mono-tabular text-slate-300 hover:bg-[#2b2e35] whitespace-nowrap shrink-0"
            >
              Ripple -2s
            </button>
            <button
              type="button"
              onClick={() => onRippleShiftFrom(currentTime, 2)}
              title="Ripple-shift keyframes, chapters, and dialogue from playhead later by 2s"
              className="px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] font-mono-tabular text-slate-300 hover:bg-[#2b2e35] whitespace-nowrap shrink-0"
            >
              Ripple +2s
            </button>
          </div>
        </div>

        {/* Full-Duration Overview Minimap */}
        <div
          onPointerDown={handleMinimapBarPointerDown}
          aria-label="Timeline Overview Minimap"
          className="relative h-5 w-full rounded bg-[#14161a] border border-[#393d47] overflow-hidden cursor-pointer select-none"
        >
          {/* Chapter Spans */}
          {chapters.map((ch, idx) => {
            const nextTime =
              idx + 1 < chapters.length ? chapters[idx + 1].time : project.duration;
            const left = (ch.time / Math.max(0.1, project.duration)) * 100;
            const width = Math.max(
              0.5,
              ((nextTime - ch.time) / Math.max(0.1, project.duration)) * 100,
            );
            return (
              <div
                key={ch.id}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: `${ch.color}28`,
                  borderLeft: `2px solid ${ch.color}`,
                }}
                className="absolute top-0 bottom-0 pointer-events-none"
              />
            );
          })}

          {/* Keyframe Density Ticks */}
          {minimapTicks.map((pctTick) => (
            <div
              key={pctTick}
              style={{ left: `${pctTick}%` }}
              className="absolute top-1 bottom-1 w-px bg-slate-400/35 pointer-events-none"
            />
          ))}

          {/* Playhead Position */}
          <div
            style={{
              left: `${(currentTime / Math.max(0.1, project.duration)) * 100}%`,
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-[#00a2ff] pointer-events-none z-10"
          />

          {/* Draggable / Resizable Zoom Viewport Bracket */}
          <div
            role="slider"
            aria-label="Zoom Viewport Window"
            aria-valuemin={0}
            aria-valuemax={project.duration}
            aria-valuenow={Math.round(viewStart)}
            onPointerDown={(e) =>
              beginMinimapDrag(e, 'pan', e.currentTarget.parentElement)
            }
            onPointerMove={handleMinimapMove}
            onPointerUp={endMinimapDrag}
            style={{
              left: `${minimapBracketLeft}%`,
              width: `${minimapBracketWidth}%`,
            }}
            className="absolute top-0 bottom-0 bg-[#00a2ff]/16 border border-[#00a2ff] rounded-xs cursor-grab active:cursor-grabbing z-20"
          >
            <div
              onPointerDown={(e) =>
                beginMinimapDrag(
                  e,
                  'left',
                  e.currentTarget.parentElement?.parentElement ?? null,
                )
              }
              onPointerMove={handleMinimapMove}
              onPointerUp={endMinimapDrag}
              className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00a2ff]/60 hover:bg-[#00a2ff] cursor-ew-resize"
            />
            <div
              onPointerDown={(e) =>
                beginMinimapDrag(
                  e,
                  'right',
                  e.currentTarget.parentElement?.parentElement ?? null,
                )
              }
              onPointerMove={handleMinimapMove}
              onPointerUp={endMinimapDrag}
              className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#00a2ff]/60 hover:bg-[#00a2ff] cursor-ew-resize"
            />
          </div>
        </div>
      </div>

      {/* Playhead Scrubber + Inline Selected Keyframe Inspector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-24 shrink-0 flex items-center justify-between text-xs text-slate-400">
          <label htmlFor="timeline-scrubber">Playhead</label>
          <span className="font-mono-tabular text-[10px] text-slate-500">
            {formatTimecode(viewStart).slice(0, 5)}
          </span>
        </div>
        <input
          id="timeline-scrubber"
          type="range"
          min={viewStart}
          max={viewEnd}
          step={0.05}
          value={clamp(currentTime, viewStart, viewEnd)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="studio-slider flex-1 min-w-[160px]"
          aria-label="Timeline Scrubber"
        />

        {dragInfo ? (
          <span className="text-xs font-mono-tabular text-[#38bdf8] whitespace-nowrap shrink-0">
            Moving Key · {formatTimecode(dragInfo.time)}
          </span>
        ) : resolvedSelectedKey && selectedKey ? (
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-slate-300 font-mono-tabular truncate max-w-[230px]">
              {resolvedSelectedKey.label}
            </span>
            {resolvedSelectedKey.mode === 'item' ? (
              <select
                aria-label="Selected Item Keyframe Transition"
                value={resolvedSelectedKey.itemEasing}
                onChange={(e) =>
                  onUpdateItemKeyframeCurve(
                    resolvedSelectedKey.actorId,
                    resolvedSelectedKey.keyframeId,
                    e.target.value as ItemEasingMode,
                  )
                }
                className="px-1.5 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
              >
                <option value="equipPop">Equip Pop</option>
                <option value="step">Instant Cut</option>
              </select>
            ) : resolvedSelectedKey.mode === 'easing' ? (
              <select
                aria-label="Selected Keyframe Easing"
                value={resolvedSelectedKey.easing}
                onChange={(e) =>
                  onUpdateKeyframeEasing(selectedKey, e.target.value as EasingType)
                }
                className="px-1.5 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
              >
                {EASING_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : null}
            {resolvedSelectedKey.canDelete && (
              <button
                type="button"
                onClick={resolvedSelectedKey.onDelete}
                aria-label="Delete selected keyframe"
                className="p-1 rounded bg-[#2b2e35] text-red-400 hover:text-red-300 hover:bg-[#363a43]"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[11px] font-mono-tabular text-slate-500 whitespace-nowrap shrink-0">
            Window {formatTimecode(viewStart).slice(0, 5)}–{formatTimecode(viewEnd).slice(0, 5)}
          </span>
        )}
      </div>

      {/* Draggable Multi-Track Lanes */}
      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
        {/* Camera Track */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#38bdf8] font-medium w-24 truncate shrink-0">
            Cutscene Cam
          </span>
          <div className="relative flex-1 h-6 rounded bg-[#14161a] border border-[#393d47] overflow-hidden">
            {playheadVisible && (
              <div
                className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                style={{ left: `${playheadPct}%` }}
              />
            )}
            {project.cameraTrack
              .filter((kf) => isInWindow(kf.time))
              .map((kf) => {
                const left = toWindowPct(kf.time);
                const ref: SelectedKeyRef = { kind: 'camera', keyframeId: kf.id };
                const sel = isKeySelected(ref);
                return (
                  <button
                    key={kf.id}
                    type="button"
                    onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                    onPointerMove={handleKeyPointerMove}
                    onPointerUp={(e) => endKeyDrag(e, kf.time)}
                    title={`Drag or click · Camera at ${formatTimecode(kf.time)} (${kf.easing})`}
                    aria-label={`Camera keyframe at ${formatTimecode(kf.time)}`}
                    style={{ left: `${left}%` }}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                      sel
                        ? 'bg-white ring-2 ring-[#00a2ff]'
                        : 'bg-[#00a2ff] hover:bg-sky-200'
                    }`}
                  />
                );
              })}
          </div>
        </div>

        {/* Lighting Track */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-violet-400 font-medium w-24 truncate shrink-0">
            Lighting
          </span>
          <div className="relative flex-1 h-6 rounded bg-[#14161a] border border-[#393d47] overflow-hidden">
            {playheadVisible && (
              <div
                className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                style={{ left: `${playheadPct}%` }}
              />
            )}
            {lightingTrack
              .filter((kf) => isInWindow(kf.time))
              .map((kf) => {
                const left = toWindowPct(kf.time);
                const ref: SelectedKeyRef = { kind: 'lighting', keyframeId: kf.id };
                const sel = isKeySelected(ref);
                return (
                  <button
                    key={kf.id}
                    type="button"
                    onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                    onPointerMove={handleKeyPointerMove}
                    onPointerUp={(e) => endKeyDrag(e, kf.time)}
                    title={`Drag or click · Lighting at ${formatTimecode(kf.time)} (${kf.easing})`}
                    aria-label={`Lighting keyframe at ${formatTimecode(kf.time)}`}
                    style={{ left: `${left}%` }}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                      sel
                        ? 'bg-white ring-2 ring-violet-400'
                        : 'bg-violet-400 hover:bg-violet-200'
                    }`}
                  />
                );
              })}
          </div>
        </div>

        {/* Stage / Map Switch Track */}
        <div className="flex items-center gap-2">
          <div className="w-24 shrink-0 flex items-center justify-between gap-1">
            <span className="text-xs text-orange-400 font-medium truncate">
              Stage / Map
            </span>
          </div>
          <div className="relative flex-1 h-6 rounded bg-[#14161a] border border-[#393d47] overflow-hidden">
            {playheadVisible && (
              <div
                className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                style={{ left: `${playheadPct}%` }}
              />
            )}
            {mapTrack
              .filter((kf) => isInWindow(kf.time))
              .map((kf) => {
                const left = toWindowPct(kf.time);
                const ref: SelectedKeyRef = { kind: 'map', keyframeId: kf.id };
                const sel = isKeySelected(ref);
                return (
                  <button
                    key={kf.id}
                    type="button"
                    onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                    onPointerMove={handleKeyPointerMove}
                    onPointerUp={(e) => endKeyDrag(e, kf.time)}
                    title={`Drag or click · Map Switch to ${kf.label} at ${formatTimecode(kf.time)}`}
                    aria-label={`Stage map keyframe ${kf.label} at ${formatTimecode(kf.time)}`}
                    style={{ left: `${left}%` }}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                      sel
                        ? 'bg-white ring-2 ring-orange-400'
                        : 'bg-orange-400 hover:bg-orange-200'
                    }`}
                  />
                );
              })}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <select
              aria-label="Cue Map at Playhead"
              value={cueMapId}
              onChange={(e) => setCueMapId(e.target.value)}
              className="w-28 px-1.5 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
            >
              {allMaps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => selectedCueMap && onKeyMapAtCurrentTime(selectedCueMap, true)}
              title="Cue selected map switch at current playhead"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-orange-300 hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3 h-3" aria-hidden="true" />
              <span>Cue</span>
            </button>
          </div>
        </div>

        {/* Synchronized Voiceover Audio Track */}
        <div data-testid="timeline-vo-track" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenVoiceoverCutter?.()}
            className="w-24 shrink-0 flex items-center gap-1 text-left text-xs text-sky-300 hover:text-white font-medium truncate"
            title="Open Voiceover Cutter workspace"
          >
            <Mic className="w-3 h-3 text-[#00a2ff] shrink-0" aria-hidden="true" />
            <span className="truncate">Voiceover VO</span>
          </button>
          <div className="relative flex-1 h-6 rounded bg-[#14161a] border border-[#393d47] overflow-hidden">
            {playheadVisible && (
              <div
                className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none z-20"
                style={{ left: `${playheadPct}%` }}
              />
            )}
            {(customVoiceover?.clips ?? []).length === 0 ? (
              <div className="h-full px-2 flex items-center text-[10px] text-slate-500 pointer-events-none">
                No uploaded VO clips — upload &amp; cut audio in Voiceover Cutter
              </div>
            ) : (
              (customVoiceover?.clips ?? []).map((clip: VoiceoverClip, idx: number) => {
                const dur = getClipDuration(clip);
                const end = clip.startSec + dur;
                if (end < viewStart || clip.startSec > viewEnd) return null;
                const asset = customVoiceover?.assets?.[clip.assetId];
                const peaks = sliceClipWaveformPeaks(
                  asset?.waveformPeaks ?? customVoiceover?.waveformPeaks ?? [],
                  asset?.durationSec ?? clip.sourceEndSec,
                  clip.sourceStartSec,
                  clip.sourceEndSec,
                  18,
                );
                const leftPct = toWindowPct(clip.startSec);
                const widthPct = Math.max(1.8, (dur / viewSpan) * 100);
                const isSelected = selectedVoClipId === clip.id;

                return (
                  <button
                    key={clip.id}
                    type="button"
                    data-testid={`timeline-vo-clip-${idx}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const trackEl = e.currentTarget.parentElement;
                      if (!trackEl) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      onSelectVoClip?.(clip.id);
                      voTrackDragRef.current = {
                        clipId: clip.id,
                        trackEl,
                        startX: e.clientX,
                        initStartSec: clip.startSec,
                        didDrag: false,
                      };
                    }}
                    onPointerMove={(e) => {
                      const st = voTrackDragRef.current;
                      if (!st) return;
                      if (!st.didDrag && Math.abs(e.clientX - st.startX) < 3) return;
                      st.didDrag = true;
                      const rect = st.trackEl.getBoundingClientRect();
                      const dxSec =
                        ((e.clientX - st.startX) / Math.max(1, rect.width)) * viewSpan;
                      const nextStart = Math.max(
                        0,
                        Math.round((st.initStartSec + dxSec) * 20) / 20,
                      );
                      onMoveVoClip?.(st.clipId, nextStart);
                    }}
                    onPointerUp={(e) => {
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }
                      voTrackDragRef.current = null;
                    }}
                    title={`Drag to move · ${clip.name} (${dur.toFixed(2)}s)`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute top-0.5 bottom-0.5 rounded-xs border px-1 flex items-center gap-1 overflow-hidden cursor-grab active:cursor-grabbing ${
                      clip.muted
                        ? 'bg-slate-800/70 border-slate-600 opacity-60'
                        : isSelected
                          ? 'bg-[#172a3a] border-[#00a2ff] ring-1 ring-[#00a2ff]'
                          : 'bg-[#18222d] border-[#38bdf8]/60 hover:border-[#00a2ff]'
                    }`}
                  >
                    <span className="text-[10px] font-mono-tabular font-semibold text-sky-200 truncate pointer-events-none">
                      {clip.name}
                    </span>
                    <div className="flex-1 h-3 flex items-end gap-[1px] pointer-events-none">
                      {peaks.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex-1 bg-[#38bdf8]/80 rounded-t-[0.5px]"
                          style={{ height: `${Math.max(20, Math.round(p * 100))}%` }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(customVoiceover?.clips ?? []).length > 0 && onSplitVoAtPlayhead && (
              <button
                type="button"
                data-testid="timeline-split-vo-btn"
                onClick={onSplitVoAtPlayhead}
                title="Split voiceover clip at playhead"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-amber-300 hover:bg-[#363a43] whitespace-nowrap shrink-0"
              >
                <Scissors className="w-3 h-3" aria-hidden="true" />
                <span>Split</span>
              </button>
            )}
            <button
              type="button"
              data-testid="timeline-open-cutter-btn"
              onClick={() => onOpenVoiceoverCutter?.()}
              title="Open Voiceover Cutter workspace"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-sky-300 hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <Scissors className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
              <span>Cutter</span>
            </button>
          </div>
        </div>

        {/* Actor Pose + Dedicated Face/Expression + Held Items Lanes */}
        {project.actors.map((actor) => {
          const isSelected = actor.id === selectedActorId;
          const faceKfs = actor.faceKeyframes ?? [];
          const actorNameLower = actor.name.trim().toLowerCase();
          const actorSubs =
            actor.kind === 'character'
              ? project.subtitles.filter(
                  (s) =>
                    s.actorId === actor.id ||
                    s.speaker.trim().toLowerCase() === actorNameLower,
                )
              : [];

          return (
            <div key={actor.id} className="space-y-1">
              {/* Pose & Transform Track */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectActor(actor.id)}
                  className={`text-left text-xs w-24 truncate shrink-0 transition-colors ${
                    isSelected ? 'text-[#00a2ff] font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {actor.name}
                </button>
                <div
                  className={`relative flex-1 h-6 rounded bg-[#14161a] border overflow-hidden ${
                    isSelected ? 'border-[#00a2ff]/60' : 'border-[#393d47]'
                  }`}
                >
                  {playheadVisible && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                      style={{ left: `${playheadPct}%` }}
                    />
                  )}
                  {actor.keyframes
                    .filter((kf) => isInWindow(kf.time))
                    .map((kf) => {
                      const left = toWindowPct(kf.time);
                      const ref: SelectedKeyRef = {
                        kind: 'actor',
                        actorId: actor.id,
                        keyframeId: kf.id,
                      };
                      const sel = isKeySelected(ref);
                      const layerSuffix =
                        kf.upperBodyClip && kf.upperBodyClip !== 'none'
                          ? ` + ${kf.upperBodyClip}`
                          : '';
                      return (
                        <button
                          key={kf.id}
                          type="button"
                          onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                          onPointerMove={handleKeyPointerMove}
                          onPointerUp={(e) => endKeyDrag(e, kf.time)}
                          title={`Drag or click · ${actor.name} (${kf.clip}${layerSuffix}, ${kf.easing}) at ${formatTimecode(kf.time)}`}
                          aria-label={`${actor.name} pose keyframe at ${formatTimecode(kf.time)}`}
                          style={{ left: `${left}%` }}
                          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                            sel
                              ? 'bg-white ring-2 ring-amber-400'
                              : 'bg-amber-400 hover:bg-amber-200'
                          }`}
                        />
                      );
                    })}
                </div>
              </div>

              {/* Dedicated 3D Face / Expression & Lip-Sync Track */}
              {actor.kind === 'character' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectActor(actor.id)}
                    className="text-left text-[11px] text-emerald-400/90 hover:text-emerald-300 w-24 truncate shrink-0 pl-2"
                  >
                    Face & Lip-Sync
                  </button>
                  <div className="relative flex-1 h-5 rounded bg-[#14161a]/80 border border-[#393d47]/80 overflow-hidden">
                    {actorSubs
                      .filter((sub) => sub.endTime >= viewStart && sub.startTime <= viewEnd)
                      .map((sub) => {
                        const clampedS = Math.max(viewStart, sub.startTime);
                        const clampedE = Math.min(viewEnd, sub.endTime);
                        const sLeft = toWindowPct(clampedS);
                        const sWidth = Math.max(
                          0.8,
                          ((clampedE - clampedS) / viewSpan) * 100,
                        );
                        return (
                          <div
                            key={sub.id}
                            title={`Lip-Sync: "${sub.text}"`}
                            style={{ left: `${sLeft}%`, width: `${sWidth}%` }}
                            className="absolute top-1 bottom-1 rounded-sm bg-emerald-500/20 border border-emerald-500/40 pointer-events-none"
                          />
                        );
                      })}

                    {playheadVisible && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                        style={{ left: `${playheadPct}%` }}
                      />
                    )}

                    {faceKfs
                      .filter((kf) => isInWindow(kf.time))
                      .map((kf) => {
                        const left = toWindowPct(kf.time);
                        const ref: SelectedKeyRef = {
                          kind: 'face',
                          actorId: actor.id,
                          keyframeId: kf.id,
                        };
                        const sel = isKeySelected(ref);
                        return (
                          <button
                            key={kf.id}
                            type="button"
                            onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                            onPointerMove={handleKeyPointerMove}
                            onPointerUp={(e) => endKeyDrag(e, kf.time)}
                            title={`Drag or click · ${actor.name} Face (${EXPRESSION_PRESET_LABELS[kf.preset]}, ${kf.easing}) at ${formatTimecode(kf.time)}`}
                            aria-label={`${actor.name} expression keyframe at ${formatTimecode(kf.time)}`}
                            style={{ left: `${left}%` }}
                            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                              sel
                                ? 'bg-white ring-2 ring-emerald-400'
                                : 'bg-emerald-400 hover:bg-emerald-200'
                            }`}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Dedicated Held Items & Gear Track */}
              {actor.kind === 'character' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectActor(actor.id)}
                    className="text-left text-[11px] text-cyan-400/90 hover:text-cyan-300 w-24 truncate shrink-0 pl-2"
                  >
                    Items & Hands
                  </button>
                  <div className="relative flex-1 h-5 rounded bg-[#14161a]/80 border border-[#393d47]/80 overflow-hidden">
                    {playheadVisible && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                        style={{ left: `${playheadPct}%` }}
                      />
                    )}

                    {(actor.heldItemKeyframes ?? [])
                      .filter((kf) => isInWindow(kf.time))
                      .map((kf) => {
                        const left = toWindowPct(kf.time);
                        const ref: SelectedKeyRef = {
                          kind: 'item',
                          actorId: actor.id,
                          keyframeId: kf.id,
                        };
                        const sel = isKeySelected(ref);
                        const summary = formatHeldItemsSummary({
                          right: kf.right,
                          left: kf.left,
                        });
                        return (
                          <button
                            key={kf.id}
                            type="button"
                            onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                            onPointerMove={handleKeyPointerMove}
                            onPointerUp={(e) => endKeyDrag(e, kf.time)}
                            title={`Drag or click · ${actor.name} Items (${summary}, ${kf.easing}) at ${formatTimecode(kf.time)}`}
                            aria-label={`${actor.name} item keyframe at ${formatTimecode(kf.time)}`}
                            style={{ left: `${left}%` }}
                            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                              sel
                                ? 'bg-white ring-2 ring-cyan-400'
                                : 'bg-cyan-400 hover:bg-cyan-200'
                            }`}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Dedicated Character States & FX Track */}
              {actor.kind === 'character' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectActor(actor.id)}
                    className="text-left text-[11px] text-fuchsia-400/90 hover:text-fuchsia-300 w-24 truncate shrink-0 pl-2"
                  >
                    State FX
                  </button>
                  <div className="relative flex-1 h-5 rounded bg-[#14161a]/80 border border-[#393d47]/80 overflow-hidden">
                    {playheadVisible && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                        style={{ left: `${playheadPct}%` }}
                      />
                    )}

                    {(actor.stateKeyframes ?? [])
                      .filter((kf) => isInWindow(kf.time))
                      .map((kf) => {
                        const left = toWindowPct(kf.time);
                        const ref: SelectedKeyRef = {
                          kind: 'state',
                          actorId: actor.id,
                          keyframeId: kf.id,
                        };
                        const sel = isKeySelected(ref);
                        const meta = CHARACTER_STATE_META[kf.stateId];
                        return (
                          <button
                            key={kf.id}
                            type="button"
                            onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                            onPointerMove={handleKeyPointerMove}
                            onPointerUp={(e) => endKeyDrag(e, kf.time)}
                            title={`Drag or click · ${actor.name} State (${meta.label}) at ${formatTimecode(kf.time)}`}
                            aria-label={`${actor.name} state keyframe ${meta.label} at ${formatTimecode(kf.time)}`}
                            style={{
                              left: `${left}%`,
                              backgroundColor: sel ? '#ffffff' : meta.accentColor,
                            }}
                            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                              sel ? 'ring-2 ring-fuchsia-400' : ''
                            }`}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Dedicated Character Action Functions Track */}
              {actor.kind === 'character' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectActor(actor.id)}
                    className="text-left text-[11px] text-amber-400/90 hover:text-amber-300 w-24 truncate shrink-0 pl-2"
                  >
                    Action FX
                  </button>
                  <div className="relative flex-1 h-5 rounded bg-[#14161a]/80 border border-[#393d47]/80 overflow-hidden">
                    {playheadVisible && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                        style={{ left: `${playheadPct}%` }}
                      />
                    )}

                    {(actor.actionKeyframes ?? [])
                      .filter((kf) => isInWindow(kf.time))
                      .map((kf) => {
                        const left = toWindowPct(kf.time);
                        const ref: SelectedKeyRef = {
                          kind: 'action',
                          actorId: actor.id,
                          keyframeId: kf.id,
                        };
                        const sel = isKeySelected(ref);
                        const meta = CHARACTER_ACTION_META[kf.actionId];
                        return (
                          <button
                            key={kf.id}
                            type="button"
                            onPointerDown={(e) => beginKeyDrag(e, ref, kf.time)}
                            onPointerMove={handleKeyPointerMove}
                            onPointerUp={(e) => endKeyDrag(e, kf.time)}
                            title={`Drag or click · ${actor.name} Action (${meta.label}) at ${formatTimecode(kf.time)}`}
                            aria-label={`${actor.name} action keyframe ${meta.label} at ${formatTimecode(kf.time)}`}
                            style={{
                              left: `${left}%`,
                              backgroundColor: sel ? '#ffffff' : meta.accentColor,
                            }}
                            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border border-[#14161a] cursor-ew-resize transition-transform hover:scale-125 ${
                              sel ? 'ring-2 ring-amber-400' : ''
                            }`}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
