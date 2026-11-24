import React, { useEffect, useState } from 'react';
import { Camera, Trash2, Eye, EyeOff, MessageSquarePlus } from 'lucide-react';
import { formatTimecode } from '../../engine/timeline';
import {
  AnimationProject,
  CameraFramingPreset,
  CameraKeyframe,
  CameraMode,
  CameraPathMode,
  EASING_OPTIONS,
  EasingType,
  SubtitleCue,
} from '../../engine/types';

interface CutscenePanelProps {
  project: AnimationProject;
  currentTime: number;
  cameraMode: CameraMode;
  showCameraRig: boolean;
  onSetCameraMode: (mode: CameraMode) => void;
  onToggleCameraRig: () => void;
  onSnapOrbitToDirector: () => void;
  onApplyFramingPreset: (preset: CameraFramingPreset) => void;
  onCaptureOrbitAsCameraKeyframe: () => void;
  onUpdateCameraKeyframe: (kf: CameraKeyframe) => void;
  onDeleteCameraKeyframe: (kfId: string) => void;
  onSeek: (time: number) => void;
  onAddSubtitle: (cue: SubtitleCue) => void;
  onDeleteSubtitle: (cueId: string) => void;
}

const FRAMING_PRESETS: { id: CameraFramingPreset; label: string }[] = [
  { id: 'wide', label: 'Wide' },
  { id: 'twoShot', label: 'Two-Shot' },
  { id: 'closeUp', label: 'Close-Up' },
  { id: 'lowAngle', label: 'Low Angle' },
];

export const CutscenePanel: React.FC<CutscenePanelProps> = ({
  project,
  currentTime,
  cameraMode,
  showCameraRig,
  onSetCameraMode,
  onToggleCameraRig,
  onSnapOrbitToDirector,
  onApplyFramingPreset,
  onCaptureOrbitAsCameraKeyframe,
  onUpdateCameraKeyframe,
  onDeleteCameraKeyframe,
  onSeek,
  onAddSubtitle,
  onDeleteSubtitle,
}) => {
  const characterActors = project.actors.filter((a) => a.kind === 'character');
  const [speakerActorId, setSpeakerActorId] = useState<string>(
    () => characterActors[0]?.id ?? '',
  );
  const [speaker, setSpeaker] = useState(
    () => characterActors[0]?.name ?? 'Crossroads Knight',
  );
  const [text, setText] = useState('');
  const [selectedShotId, setSelectedShotId] = useState<string>(
    () => project.cameraTrack[0]?.id ?? '',
  );

  // Keep selectedShotId valid or auto-sync to nearest keyframe when playhead changes
  useEffect(() => {
    const near = project.cameraTrack.find(
      (kf) => Math.abs(kf.time - currentTime) < 0.12,
    );
    if (near) {
      setSelectedShotId(near.id);
    } else if (!project.cameraTrack.some((kf) => kf.id === selectedShotId)) {
      setSelectedShotId(project.cameraTrack[0]?.id ?? '');
    }
  }, [currentTime, project.cameraTrack, selectedShotId]);

  const activeShotIndex = Math.max(
    0,
    project.cameraTrack.findIndex((kf) => kf.id === selectedShotId),
  );
  const activeShot = project.cameraTrack[activeShotIndex] ?? project.cameraTrack[0];

  const handleCreateSubtitle = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddSubtitle({
      id: `sub_${Date.now()}`,
      startTime: Math.round(currentTime * 10) / 10,
      endTime: Math.min(project.duration, Math.round((currentTime + 2.5) * 10) / 10),
      speaker: speaker.trim() || 'Narrator',
      actorId: speakerActorId || null,
      text: trimmed,
    });
    setText('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Director Camera Rig
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onSetCameraMode(cameraMode === 'director' ? 'orbit' : 'director')
              }
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                cameraMode === 'director'
                  ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                  : 'bg-[#2b2e35] border-[#393d47] text-slate-200 hover:bg-[#363a43]'
              }`}
            >
              {cameraMode === 'director' ? 'Viewing Director Cam' : 'Preview Director Cam'}
            </button>

            <button
              type="button"
              onClick={onToggleCameraRig}
              aria-label={showCameraRig ? 'Hide Camera Path' : 'Show Camera Path'}
              className="p-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:bg-[#363a43] shrink-0"
            >
              {showCameraRig ? (
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onCaptureOrbitAsCameraKeyframe}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Capture Shot ({formatTimecode(currentTime)})</span>
          </button>

          <button
            type="button"
            onClick={onSnapOrbitToDirector}
            className="px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-300 hover:bg-[#363a43] whitespace-nowrap shrink-0"
          >
            Match Orbit
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-500 mr-1 shrink-0">Framing:</span>
          {FRAMING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyFramingPreset(preset.id)}
              className="px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-300 hover:border-[#00a2ff] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {project.cameraTrack.map((kf, index) => {
            const isSelected = activeShot?.id === kf.id;
            return (
              <div
                key={kf.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs shrink-0 ${
                  isSelected
                    ? 'bg-[#2b2e35] border-[#00a2ff] text-white'
                    : 'bg-[#14161a] border-[#393d47] text-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShotId(kf.id);
                    onSeek(kf.time);
                  }}
                  className="font-mono-tabular text-[#38bdf8] hover:text-sky-200 whitespace-nowrap"
                >
                  Shot {index + 1} · {formatTimecode(kf.time)}
                </button>
                {project.cameraTrack.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteCameraKeyframe(kf.id)}
                    aria-label={`Delete camera shot ${index + 1}`}
                    className="p-0.5 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {activeShot && (
          <div className="p-2 rounded bg-[#14161a] border border-[#393d47] space-y-1.5 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <span>Path Mode</span>
                <select
                  aria-label="Shot Path Mode"
                  value={activeShot.pathMode ?? 'spline'}
                  onChange={(e) =>
                    onUpdateCameraKeyframe({
                      ...activeShot,
                      pathMode: e.target.value as CameraPathMode,
                    })
                  }
                  className="px-1.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200"
                >
                  <option value="spline">Spline Curve</option>
                  <option value="linear">Linear Path</option>
                </select>
              </label>

              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <span>Track Actor</span>
                <select
                  aria-label="Shot Track Actor"
                  value={activeShot.trackActorId ?? ''}
                  onChange={(e) =>
                    onUpdateCameraKeyframe({
                      ...activeShot,
                      trackActorId: e.target.value || null,
                      trackOffset: activeShot.trackOffset ?? [0, 1.4, 0],
                    })
                  }
                  className="px-1.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200"
                >
                  <option value="">Manual Target</option>
                  {project.actors.map((actor) => (
                    <option key={actor.id} value={actor.id}>
                      {actor.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <span>Easing</span>
                <select
                  aria-label="Shot Easing"
                  value={activeShot.easing}
                  onChange={(e) =>
                    onUpdateCameraKeyframe({
                      ...activeShot,
                      easing: e.target.value as EasingType,
                    })
                  }
                  className="px-1.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200"
                >
                  {EASING_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="shrink-0">FOV</span>
                <input
                  type="number"
                  min={20}
                  max={85}
                  aria-label={`Shot ${activeShotIndex + 1} FOV`}
                  value={activeShot.fov}
                  onChange={(e) =>
                    onUpdateCameraKeyframe({
                      ...activeShot,
                      fov: Math.max(20, Math.min(85, Number(e.target.value) || 45)),
                    })
                  }
                  className="w-full px-1.5 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-200 font-mono-tabular"
                />
              </label>

              <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="shrink-0">Roll</span>
                <input
                  type="range"
                  min={-35}
                  max={35}
                  step={1}
                  aria-label="Shot Dutch Roll Degrees"
                  value={activeShot.rollDeg ?? 0}
                  onChange={(e) =>
                    onUpdateCameraKeyframe({
                      ...activeShot,
                      rollDeg: Number(e.target.value),
                    })
                  }
                  className="studio-slider flex-1 min-w-0"
                />
                <span className="font-mono-tabular text-slate-300 w-7 text-right shrink-0">
                  {activeShot.rollDeg ?? 0}°
                </span>
              </label>

              <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="shrink-0">Shake</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  aria-label="Shot Camera Shake"
                  value={activeShot.shakeIntensity ?? 0}
                  onChange={(e) =>
                    onUpdateCameraKeyframe({
                      ...activeShot,
                      shakeIntensity: Number(e.target.value),
                      shakeFrequency: activeShot.shakeFrequency ?? 10,
                    })
                  }
                  className="studio-slider flex-1 min-w-0"
                />
                <span className="font-mono-tabular text-slate-300 w-7 text-right shrink-0">
                  {(activeShot.shakeIntensity ?? 0).toFixed(2)}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-slate-400">
          Cutscene Dialogue & Subtitles
        </span>

        <form onSubmit={handleCreateSubtitle} className="flex flex-wrap items-center gap-1.5">
          <select
            aria-label="Lip-Sync Speaker Actor"
            value={speakerActorId}
            onChange={(e) => {
              const id = e.target.value;
              setSpeakerActorId(id);
              const found = characterActors.find((a) => a.id === id);
              if (found) setSpeaker(found.name);
            }}
            className="w-32 px-2 py-1.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
          >
            <option value="">Narrator / None</option>
            {characterActors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            aria-label="Speaker Name"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="Speaker"
            className="w-24 px-2 py-1.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100 placeholder:text-slate-500"
          />
          <input
            type="text"
            aria-label="Subtitle Line"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Add subtitle at ${formatTimecode(currentTime)}...`}
            className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100 placeholder:text-slate-500"
          />
          <button
            type="submit"
            aria-label="Add Subtitle Cue"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
            <span>Add</span>
          </button>
        </form>

        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
          {project.subtitles.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">
              No dialogue cues yet. Scrub to a timestamp and add a line above.
            </p>
          ) : (
            project.subtitles.map((cue) => (
              <div
                key={cue.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#14161a] border border-[#393d47] text-xs"
              >
                <button
                  type="button"
                  onClick={() => onSeek(cue.startTime)}
                  className="text-left min-w-0 flex-1 truncate text-slate-200 hover:text-[#38bdf8]"
                >
                  <span className="font-mono-tabular text-amber-400 mr-2">
                    {formatTimecode(cue.startTime)}
                  </span>
                  <span className="font-semibold text-slate-100 mr-1.5">
                    {cue.speaker}:
                  </span>
                  <span className="text-slate-300">{cue.text}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSubtitle(cue.id)}
                  aria-label={`Delete subtitle "${cue.text}"`}
                  className="p-1 text-slate-500 hover:text-red-400 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
