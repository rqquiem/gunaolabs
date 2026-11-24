import React, { useRef, useState } from 'react';
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
} from 'lucide-react';
import { clamp, formatTimecode } from '../../engine/timeline';
import {
  AnimationProject,
  CameraMode,
  EASING_OPTIONS,
  EasingType,
  EXPRESSION_PRESET_LABELS,
} from '../../engine/types';

type SelectedKeyRef =
  | { kind: 'camera'; keyframeId: string }
  | { kind: 'lighting'; keyframeId: string }
  | { kind: 'actor'; actorId: string; keyframeId: string }
  | { kind: 'face'; actorId: string; keyframeId: string };

interface TimelinePanelProps {
  project: AnimationProject;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  cameraMode: CameraMode;
  selectedActorId: string | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onChangeSpeed: (speed: number) => void;
  onToggleLoop: () => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onSelectActor: (actorId: string) => void;
  onKeyActorAtCurrentTime: () => void;
  onKeyFaceAtCurrentTime: () => void;
  onKeyCameraAtCurrentTime: () => void;
  onKeyLightingAtCurrentTime: () => void;
  onMoveActorKeyframe: (actorId: string, keyframeId: string, newTime: number) => void;
  onMoveFaceKeyframe: (actorId: string, keyframeId: string, newTime: number) => void;
  onMoveCameraKeyframe: (keyframeId: string, newTime: number) => void;
  onMoveLightingKeyframe: (keyframeId: string, newTime: number) => void;
  onUpdateKeyframeEasing: (ref: SelectedKeyRef, easing: EasingType) => void;
  onDeleteActorKeyframe: (actorId: string, keyframeId: string) => void;
  onDeleteFaceKeyframe: (actorId: string, keyframeId: string) => void;
  onDeleteCameraKeyframe: (keyframeId: string) => void;
  onDeleteLightingKeyframe: (keyframeId: string) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  project,
  currentTime,
  isPlaying,
  playbackSpeed,
  cameraMode,
  selectedActorId,
  onTogglePlay,
  onSeek,
  onChangeSpeed,
  onToggleLoop,
  onSetCameraMode,
  onSelectActor,
  onKeyActorAtCurrentTime,
  onKeyFaceAtCurrentTime,
  onKeyCameraAtCurrentTime,
  onKeyLightingAtCurrentTime,
  onMoveActorKeyframe,
  onMoveFaceKeyframe,
  onMoveCameraKeyframe,
  onMoveLightingKeyframe,
  onUpdateKeyframeEasing,
  onDeleteActorKeyframe,
  onDeleteFaceKeyframe,
  onDeleteCameraKeyframe,
  onDeleteLightingKeyframe,
}) => {
  const [selectedKey, setSelectedKey] = useState<SelectedKeyRef | null>(null);
  const [dragInfo, setDragInfo] = useState<{
    ref: SelectedKeyRef;
    time: number;
  } | null>(null);

  const dragStateRef = useRef<{
    ref: SelectedKeyRef;
    trackEl: HTMLElement;
    startX: number;
    didDrag: boolean;
  } | null>(null);

  const pct = project.duration > 0 ? (currentTime / project.duration) * 100 : 0;
  const lightingTrack = project.lightingTrack ?? [];
  const selectedActor = project.actors.find((a) => a.id === selectedActorId);

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
    if (ref.kind === 'actor' || ref.kind === 'face') {
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
    const snapped = Math.round(ratio * project.duration * 20) / 20;

    setDragInfo({ ref: state.ref, time: snapped });
    if (state.ref.kind === 'actor') {
      onMoveActorKeyframe(state.ref.actorId, state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'face') {
      onMoveFaceKeyframe(state.ref.actorId, state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'camera') {
      onMoveCameraKeyframe(state.ref.keyframeId, snapped);
    } else if (state.ref.kind === 'lighting') {
      onMoveLightingKeyframe(state.ref.keyframeId, snapped);
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

  // Resolve currently selected keyframe details for inline easing & delete controls
  const resolvedSelectedKey = (() => {
    if (!selectedKey) return null;
    if (selectedKey.kind === 'camera') {
      const kf = project.cameraTrack.find((k) => k.id === selectedKey.keyframeId);
      if (!kf) return null;
      return {
        label: `Camera · ${formatTimecode(kf.time)}`,
        easing: kf.easing,
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
        canDelete: true,
        onDelete: () => {
          onDeleteLightingKeyframe(kf.id);
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
        canDelete: true,
        onDelete: () => {
          onDeleteFaceKeyframe(actor.id, kf.id);
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
      (ref.kind === 'actor' || ref.kind === 'face') &&
      (selectedKey.kind === 'actor' || selectedKey.kind === 'face')
    ) {
      return selectedKey.actorId === ref.actorId;
    }
    return true;
  };

  return (
    <div className="space-y-2.5">
      {/* Transport & Quick Keying Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause Timeline' : 'Play Timeline'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] transition-colors whitespace-nowrap shrink-0"
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
            onClick={() => onSeek(0)}
            aria-label="Restart to 00:00.0"
            className="p-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-slate-200 hover:bg-[#363a43] transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div
            className="px-2.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs font-mono-tabular text-slate-200 whitespace-nowrap"
            aria-label="Current Timecode"
          >
            {formatTimecode(currentTime)}{' '}
            <span className="text-slate-500">/ {formatTimecode(project.duration)}</span>
          </div>

          <button
            type="button"
            onClick={onToggleLoop}
            aria-pressed={project.loop}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
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
            className="px-2 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-mono-tabular text-slate-200"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
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
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Key Pose</span>
          </button>

          <button
            type="button"
            onClick={onKeyFaceAtCurrentTime}
            disabled={!selectedActor || selectedActor.kind !== 'character'}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Smile className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Key Face</span>
          </button>

          <button
            type="button"
            onClick={onKeyCameraAtCurrentTime}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
            <span>Key Cam</span>
          </button>

          <button
            type="button"
            onClick={onKeyLightingAtCurrentTime}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
            <span>Key Light</span>
          </button>
        </div>
      </div>

      {/* Playhead Scrubber + Inline Selected Keyframe Inspector */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="timeline-scrubber" className="text-xs text-slate-400 w-24 shrink-0">
          Playhead
        </label>
        <input
          id="timeline-scrubber"
          type="range"
          min={0}
          max={project.duration}
          step={0.05}
          value={currentTime}
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
            <span className="text-slate-300 font-mono-tabular truncate max-w-[200px]">
              {resolvedSelectedKey.label}
            </span>
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
          <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
            Drag any diamond to retime
          </span>
        )}
      </div>

      {/* Draggable Multi-Track Lanes */}
      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
        {/* Camera Track */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#38bdf8] font-medium w-24 truncate shrink-0">
            Cutscene Cam
          </span>
          <div className="relative flex-1 h-6 rounded bg-[#14161a] border border-[#393d47]">
            <div
              className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
              style={{ left: `${pct}%` }}
            />
            {project.cameraTrack.map((kf) => {
              const left = (kf.time / project.duration) * 100;
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
          <div className="relative flex-1 h-6 rounded bg-[#14161a] border border-[#393d47]">
            <div
              className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
              style={{ left: `${pct}%` }}
            />
            {lightingTrack.map((kf) => {
              const left = (kf.time / project.duration) * 100;
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

        {/* Actor Pose + Dedicated Face/Expression Lanes */}
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
                  className={`relative flex-1 h-6 rounded bg-[#14161a] border ${
                    isSelected ? 'border-[#00a2ff]/60' : 'border-[#393d47]'
                  }`}
                >
                  <div
                    className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                    style={{ left: `${pct}%` }}
                  />
                  {actor.keyframes.map((kf) => {
                    const left = (kf.time / project.duration) * 100;
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
                  <div className="relative flex-1 h-5 rounded bg-[#14161a]/80 border border-[#393d47]/80">
                    {/* Subtitle Lip-Sync Windows */}
                    {actorSubs.map((sub) => {
                      const sLeft = (sub.startTime / project.duration) * 100;
                      const sWidth = Math.max(
                        1,
                        ((sub.endTime - sub.startTime) / project.duration) * 100,
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

                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#00a2ff] pointer-events-none"
                      style={{ left: `${pct}%` }}
                    />

                    {faceKfs.map((kf) => {
                      const left = (kf.time / project.duration) * 100;
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
