import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Grid,
  Maximize2,
  Minimize2,
  Orbit,
  Pause,
  Play,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  evaluateCameraAt,
  evaluateLightingAt,
  evaluateStageAt,
  formatTimecode,
  getChapterAtTime,
  getChapterBounds,
} from '../engine/timeline';
import {
  AnimationProject,
  CameraMode,
  ChapterMarker,
  LightingMood,
} from '../engine/types';

interface CinemaViewportHudProps {
  project: AnimationProject;
  currentTime: number;
  isPlaying: boolean;
  cameraMode: CameraMode;
  audioMuted: boolean;
  isZenMode: boolean;
  showRuleOfThirds: boolean;
  forceLetterbox: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onToggleAudio: () => void;
  onToggleZenMode: () => void;
  onToggleRuleOfThirds: () => void;
  onToggleLetterbox: () => void;
}

const MOOD_LABELS: Record<LightingMood, { label: string; dotColor: string }> = {
  noon: { label: 'Daylight Noon', dotColor: '#38bdf8' },
  sunset: { label: 'Golden Sunset', dotColor: '#f59e0b' },
  midnight: { label: 'Midnight Spotlight', dotColor: '#818cf8' },
  overcast: { label: 'Stormy Overcast', dotColor: '#94a3b8' },
};

export const CinemaViewportHud: React.FC<CinemaViewportHudProps> = ({
  project,
  currentTime,
  isPlaying,
  cameraMode,
  audioMuted,
  isZenMode,
  showRuleOfThirds,
  forceLetterbox,
  onTogglePlay,
  onSeek,
  onSetCameraMode,
  onToggleAudio,
  onToggleZenMode,
  onToggleRuleOfThirds,
  onToggleLetterbox,
}) => {
  const chapters = useMemo(
    () =>
      project.chapters && project.chapters.length > 0
        ? [...project.chapters].sort((a, b) => a.time - b.time)
        : [],
    [project.chapters],
  );

  const activeChapter = useMemo(
    () => getChapterAtTime(chapters, currentTime),
    [chapters, currentTime],
  );

  const activeChapterIndex = useMemo(() => {
    if (!activeChapter) return -1;
    return chapters.findIndex((c) => c.id === activeChapter.id);
  }, [chapters, activeChapter]);

  const evalStage = useMemo(
    () => evaluateStageAt(project, currentTime),
    [project, currentTime],
  );
  const evalLight = useMemo(
    () => evaluateLightingAt(project, currentTime, evalStage),
    [project, currentTime, evalStage],
  );
  const evalCamera = useMemo(
    () => evaluateCameraAt(project.cameraTrack, currentTime),
    [project.cameraTrack, currentTime],
  );

  const povActorName = useMemo(() => {
    if (!evalCamera.povActorId) return null;
    return (
      project.actors.find((a) => a.id === evalCamera.povActorId)?.name ?? null
    );
  }, [evalCamera.povActorId, project.actors]);

  const moodInfo = MOOD_LABELS[evalStage.lightingMood] ?? MOOD_LABELS.noon;

  // Brief chapter title card banner on chapter change
  const [bannerChapter, setBannerChapter] = useState<ChapterMarker | null>(null);
  useEffect(() => {
    if (!activeChapter) {
      setBannerChapter(null);
      return;
    }
    setBannerChapter(activeChapter);
    const timer = window.setTimeout(() => {
      setBannerChapter((curr) => (curr?.id === activeChapter.id ? null : curr));
    }, 2300);
    return () => window.clearTimeout(timer);
  }, [activeChapter?.id, project.id]);

  const handlePrevChapter = () => {
    if (chapters.length === 0) {
      onSeek(0);
      return;
    }
    if (activeChapterIndex <= 0) {
      onSeek(chapters[0].time);
      return;
    }
    const currBounds = getChapterBounds(
      chapters,
      chapters[activeChapterIndex].id,
      project.duration,
    );
    // If more than 1.2s into the current chapter, jump to start of current chapter; otherwise previous chapter
    if (currBounds && currentTime - currBounds.startSec > 1.2) {
      onSeek(currBounds.startSec);
    } else {
      onSeek(chapters[Math.max(0, activeChapterIndex - 1)].time);
    }
  };

  const handleNextChapter = () => {
    if (chapters.length === 0) return;
    const nextIdx = Math.min(chapters.length - 1, activeChapterIndex + 1);
    onSeek(chapters[nextIdx].time);
  };

  return (
    <>
      {/* Top Docked Cinema Viewport HUD Bar (Solid matte dark surface, zero backdrop-filter over WebGL) */}
      <div
        data-testid="cinema-viewport-hud"
        className="absolute top-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#14161a]/95 border-b border-[#393d47] text-xs"
      >
        {/* Left: Active Scene, Stage Set & Atmosphere Mood */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#23252b] border border-[#393d47] text-slate-100 font-semibold truncate max-w-[180px]">
            <Clapperboard className="w-3.5 h-3.5 text-[#00a2ff] shrink-0" aria-hidden="true" />
            <span className="truncate">{project.name}</span>
          </div>

          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1b1e24] border border-[#393d47] text-[11px] text-slate-300 truncate max-w-[165px]"
            title={`Active Stage: ${evalStage.label}`}
          >
            <span className="text-slate-400">Set:</span>
            <span className="font-medium text-slate-100 truncate">
              {evalStage.label}
            </span>
          </div>

          {povActorName && cameraMode === 'director' && (
            <div
              data-testid="hud-pov-actor"
              className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1b1e24] border border-[#00a2ff]/60 text-[11px] text-[#38bdf8] whitespace-nowrap"
              title={`First-Person Eye-Level POV: ${povActorName}`}
            >
              <span className="text-slate-400">POV:</span>
              <span className="font-semibold text-white">{povActorName}</span>
            </div>
          )}

          <div
            data-testid="hud-lighting-mood"
            className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1b1e24] border border-[#393d47] text-[11px] text-slate-200 whitespace-nowrap"
            title={`Atmosphere Mood: ${moodInfo.label} · Key ${evalLight.keyIntensity.toFixed(1)}`}
          >
            <Sun className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: evalLight.keyColor ?? moodInfo.dotColor }}
            />
            <span>{moodInfo.label}</span>
          </div>
        </div>

        {/* Center: Interactive Chapter Bar & Scrubber */}
        {chapters.length > 0 && (
          <div
            data-testid="cinema-chapter-bar"
            className="flex items-center gap-1 flex-1 max-w-3xl min-w-[240px] justify-center"
          >
            <button
              type="button"
              onClick={handlePrevChapter}
              title="Previous Scene / Chapter"
              aria-label="Previous Scene"
              className="p-1 rounded bg-[#23252b] border border-[#393d47] text-slate-300 hover:text-white hover:bg-[#2b2e35] shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto py-0.5">
              {chapters.map((ch, idx) => {
                const bounds = getChapterBounds(chapters, ch.id, project.duration);
                const startSec = bounds?.startSec ?? ch.time;
                const endSec = bounds?.endSec ?? project.duration;
                const span = Math.max(0.1, endSec - startSec);
                const isActive = activeChapter?.id === ch.id;
                const isPast = currentTime >= endSec;
                const fillPct = isActive
                  ? Math.min(100, Math.max(0, ((currentTime - startSec) / span) * 100))
                  : isPast
                    ? 100
                    : 0;
                const shortLabel = ch.title.replace(/^\d+\.\s*/, '');

                return (
                  <button
                    key={ch.id}
                    type="button"
                    data-testid={`hud-chapter-${idx + 1}`}
                    onClick={() => onSeek(ch.time)}
                    title={`${ch.title} (${formatTimecode(startSec)} – ${formatTimecode(endSec)})`}
                    className={`group relative flex-1 min-w-[52px] px-1.5 py-1 rounded border text-left overflow-hidden transition-colors ${
                      isActive
                        ? 'bg-[#252830] border-[#00a2ff] text-white'
                        : 'bg-[#1b1e24] border-[#393d47] text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {/* Bottom chapter progress bar */}
                    <span
                      className="pointer-events-none absolute bottom-0 left-0 h-0.5 transition-all"
                      style={{
                        width: `${fillPct}%`,
                        backgroundColor: ch.color || '#00a2ff',
                      }}
                    />
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: ch.color || '#00a2ff' }}
                      />
                      <span className="text-[10px] font-mono-tabular text-slate-400 shrink-0">
                        S{idx + 1}
                      </span>
                      <span className="text-[11px] font-medium truncate">
                        {shortLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextChapter}
              title="Next Scene / Chapter"
              aria-label="Next Scene"
              className="p-1 rounded bg-[#23252b] border border-[#393d47] text-slate-300 hover:text-white hover:bg-[#2b2e35] shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Right: Timecode, Camera Mode, Framing Guides, Audio & Cinema Fullscreen/Zen */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isZenMode && (
            <button
              type="button"
              onClick={onTogglePlay}
              data-testid="hud-zen-play"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#00a2ff] text-slate-950 text-[11px] font-semibold hover:bg-[#33b5ff]"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" aria-hidden="true" />
                  <span>Play</span>
                </>
              )}
            </button>
          )}

          <span
            data-testid="hud-timecode"
            className="px-2 py-0.5 rounded bg-[#1b1e24] border border-[#393d47] text-[11px] font-mono-tabular text-slate-200 whitespace-nowrap"
          >
            {formatTimecode(currentTime)}{' '}
            <span className="text-slate-500">/ {formatTimecode(project.duration)}</span>
          </span>

          <button
            type="button"
            data-testid="hud-camera-mode"
            onClick={() =>
              onSetCameraMode(cameraMode === 'director' ? 'orbit' : 'director')
            }
            title="Switch between Director Cutscene Camera and Free Orbit Camera (Shortcut: C)"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors whitespace-nowrap ${
              cameraMode === 'director'
                ? 'bg-amber-500/20 border-amber-400/70 text-amber-200'
                : 'bg-[#23252b] border-[#393d47] text-slate-200 hover:bg-[#2b2e35]'
            }`}
          >
            {cameraMode === 'director' ? (
              <>
                <Camera className="w-3 h-3 text-amber-400" aria-hidden="true" />
                <span className="hidden sm:inline">Director Cut</span>
              </>
            ) : (
              <>
                <Orbit className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                <span className="hidden sm:inline">Free Orbit</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleLetterbox}
            aria-pressed={forceLetterbox}
            title="Toggle Widescreen 2.35:1 Cinema Letterbox Bars"
            className={`p-1 rounded border transition-colors ${
              forceLetterbox
                ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                : 'bg-[#23252b] border-[#393d47] text-slate-300 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleRuleOfThirds}
            aria-pressed={showRuleOfThirds}
            title="Toggle Director Rule-of-Thirds Framing Grid"
            className={`p-1 rounded border transition-colors ${
              showRuleOfThirds
                ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                : 'bg-[#23252b] border-[#393d47] text-slate-300 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={!audioMuted}
            title={audioMuted ? 'Unmute Scene Audio' : 'Mute Scene Audio'}
            className={`p-1 rounded border transition-colors ${
              !audioMuted
                ? 'bg-[#23252b] border-[#393d47] text-slate-200 hover:text-white'
                : 'bg-red-950/60 border-red-700/60 text-red-300'
            }`}
          >
            {audioMuted ? (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-testid="hud-zen-toggle"
            onClick={onToggleZenMode}
            aria-pressed={isZenMode}
            title="Toggle Cinema Zen / Fullscreen Viewport Mode (Shortcut: F or H)"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors whitespace-nowrap ${
              isZenMode
                ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                : 'bg-[#23252b] border-[#393d47] text-slate-200 hover:bg-[#2b2e35]'
            }`}
          >
            {isZenMode ? (
              <>
                <Minimize2 className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">Exit Cinema</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">Cinema View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auto-fading Cinema Chapter Transition Title Card */}
      {bannerChapter && activeChapterIndex >= 0 && (
        <div
          data-testid="chapter-transition-card"
          className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-md bg-[#14161a]/92 border border-[#393d47] text-center transition-opacity"
        >
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: bannerChapter.color || '#00a2ff' }}
            />
            <span>
              Scene {String(activeChapterIndex + 1).padStart(2, '0')} of{' '}
              {String(chapters.length).padStart(2, '0')}
            </span>
            <span>·</span>
            <span>{evalStage.label}</span>
            <span>·</span>
            <span className="text-amber-300">{moodInfo.label}</span>
            {povActorName && (
              <>
                <span>·</span>
                <span className="text-[#38bdf8]">POV: {povActorName}</span>
              </>
            )}
          </div>
          <div className="text-xs font-semibold text-white mt-0.5">
            {bannerChapter.title}
          </div>
        </div>
      )}

      {/* Optional Rule-of-Thirds Composition Grid */}
      {showRuleOfThirds && (
        <div
          data-testid="rule-of-thirds-grid"
          className="pointer-events-none absolute inset-0 z-10"
        >
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/15" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/15" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/15" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/15" />
        </div>
      )}
    </>
  );
};
