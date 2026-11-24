import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Repeat,
  Video,
  Move3d,
} from 'lucide-react';
import { formatTimecode } from '../../engine/timeline';
import { AnimationProject, CameraMode } from '../../engine/types';

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
  onKeyCameraAtCurrentTime: () => void;
  onKeyLightingAtCurrentTime: () => void;
  onDeleteActorKeyframe: (actorId: string, keyframeId: string) => void;
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
  onKeyCameraAtCurrentTime,
  onKeyLightingAtCurrentTime,
  onDeleteActorKeyframe,
  onDeleteLightingKeyframe,
}) => {
  const pct = project.duration > 0 ? (currentTime / project.duration) * 100 : 0;
  const lightingTrack = project.lightingTrack ?? [];
  const activeLightKf = lightingTrack.find(
    (kf) => Math.abs(kf.time - currentTime) < 0.08,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
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
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                cameraMode === 'orbit'
                  ? 'bg-[#2b2e35] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Move3d className="w-3 h-3" aria-hidden="true" />
              <span>Orbit View</span>
            </button>
            <button
              type="button"
              onClick={() => onSetCameraMode('director')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                cameraMode === 'director'
                  ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3 h-3" aria-hidden="true" />
              <span>Director Cam</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onKeyActorAtCurrentTime}
            disabled={!selectedActorId}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Key Actor</span>
          </button>

          <button
            type="button"
            onClick={onKeyCameraAtCurrentTime}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
            <span>Key Camera</span>
          </button>

          <button
            type="button"
            onClick={onKeyLightingAtCurrentTime}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
            <span>Key Light</span>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
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
            className="studio-slider flex-1"
            aria-label="Timeline Scrubber"
          />
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
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
              return (
                <button
                  key={kf.id}
                  type="button"
                  onClick={() => onSeek(kf.time)}
                  title={`Camera at ${formatTimecode(kf.time)} (${kf.easing})`}
                  aria-label={`Jump to camera keyframe at ${formatTimecode(kf.time)}`}
                  style={{ left: `${left}%` }}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#00a2ff] hover:bg-sky-200 border border-[#14161a] transition-transform hover:scale-125"
                />
              );
            })}
          </div>
          <span className="w-5 shrink-0" aria-hidden="true" />
        </div>

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
              const nearPlayhead = Math.abs(kf.time - currentTime) < 0.08;
              return (
                <button
                  key={kf.id}
                  type="button"
                  onClick={() => onSeek(kf.time)}
                  title={`Lighting at ${formatTimecode(kf.time)} (Az ${Math.round(kf.sunAzimuth)}°, El ${Math.round(kf.sunElevation)}°)`}
                  aria-label={`Jump to lighting keyframe at ${formatTimecode(kf.time)}`}
                  style={{ left: `${left}%` }}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border border-[#14161a] transition-transform hover:scale-125 ${
                    nearPlayhead ? 'bg-white' : 'bg-violet-400 hover:bg-violet-200'
                  }`}
                />
              );
            })}
          </div>
          {activeLightKf ? (
            <button
              type="button"
              onClick={() => onDeleteLightingKeyframe(activeLightKf.id)}
              aria-label={`Delete lighting keyframe at ${formatTimecode(activeLightKf.time)}`}
              className="p-1 rounded bg-[#2b2e35] text-red-400 hover:text-red-300 hover:bg-[#363a43] shrink-0"
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
            </button>
          ) : (
            <span className="w-5 shrink-0" aria-hidden="true" />
          )}
        </div>

        {project.actors.map((actor) => {
          const isSelected = actor.id === selectedActorId;
          const activeKf = actor.keyframes.find(
            (kf) => Math.abs(kf.time - currentTime) < 0.08,
          );
          return (
            <div key={actor.id} className="flex items-center gap-2">
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
                  const nearPlayhead = Math.abs(kf.time - currentTime) < 0.08;
                  return (
                    <button
                      key={kf.id}
                      type="button"
                      onClick={() => {
                        onSelectActor(actor.id);
                        onSeek(kf.time);
                      }}
                      title={`${actor.name} (${kf.clip}) at ${formatTimecode(kf.time)}`}
                      aria-label={`Jump to ${actor.name} keyframe at ${formatTimecode(kf.time)}`}
                      style={{ left: `${left}%` }}
                      className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border border-[#14161a] transition-transform hover:scale-125 ${
                        nearPlayhead ? 'bg-white' : 'bg-amber-400 hover:bg-amber-200'
                      }`}
                    />
                  );
                })}
              </div>
              {activeKf && actor.keyframes.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onDeleteActorKeyframe(actor.id, activeKf.id)}
                  aria-label={`Delete ${actor.name} keyframe at ${formatTimecode(activeKf.time)}`}
                  className="p-1 rounded bg-[#2b2e35] text-red-400 hover:text-red-300 hover:bg-[#363a43] shrink-0"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                </button>
              ) : (
                <span className="w-5 shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
