import React, { useMemo } from 'react';
import {
  evaluateWordPopCaption,
  resolveCaptionSettings,
  stripCaptionMarkup,
} from '../engine/captionEngine';
import { CaptionSettings, SubtitleCue } from '../engine/types';

interface CaptionOverlayProps {
  cue: SubtitleCue | null;
  currentTime: number;
  settings?: Partial<CaptionSettings> | null;
  overrideDurationSec?: number;
  hasLetterbox: boolean;
  isDockCollapsed: boolean;
}

const SIZE_CLASSES: Record<
  CaptionSettings['size'],
  { word: string; classic: string; speaker: string; pad: string }
> = {
  compact: {
    word: 'text-lg sm:text-xl md:text-2xl',
    classic: 'text-xs sm:text-sm',
    speaker: 'text-[10px]',
    pad: 'px-2 py-0.5',
  },
  medium: {
    word: 'text-xl sm:text-2xl md:text-[30px]',
    classic: 'text-sm sm:text-base',
    speaker: 'text-[11px]',
    pad: 'px-2.5 py-0.5',
  },
  large: {
    word: 'text-2xl sm:text-3xl md:text-[38px]',
    classic: 'text-base sm:text-lg',
    speaker: 'text-xs',
    pad: 'px-3 py-1',
  },
};

const WORD_OUTLINE_SHADOW =
  '-2px -2px 0 #090b10, 2px -2px 0 #090b10, -2px 2px 0 #090b10, 2px 2px 0 #090b10, 0 4px 14px rgba(0, 0, 0, 0.85)';

const SPEAKER_OUTLINE_SHADOW =
  '-1px -1px 0 #090b10, 1px -1px 0 #090b10, -1px 1px 0 #090b10, 1px 1px 0 #090b10, 0 2px 6px rgba(0, 0, 0, 0.85)';

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  cue,
  currentTime,
  settings: rawSettings,
  overrideDurationSec,
  hasLetterbox,
  isDockCollapsed,
}) => {
  const settings = useMemo(() => resolveCaptionSettings(rawSettings), [rawSettings]);

  const evaluated = useMemo(
    () =>
      settings.mode === 'wordPop'
        ? evaluateWordPopCaption(cue, currentTime, settings, overrideDurationSec)
        : null,
    [cue, currentTime, settings, overrideDurationSec],
  );

  if (!cue || !cue.text.trim()) return null;

  const sizeSpec = SIZE_CLASSES[settings.size];
  const isVoiceover = cue.role === 'voiceover';

  // Keep captions centered in the visible 3D stage above the floating StudioDock when open
  const positionClass =
    settings.position === 'top'
      ? hasLetterbox
        ? 'top-16'
        : 'top-12'
      : settings.position === 'center'
        ? isDockCollapsed
          ? 'top-1/2 -translate-y-1/2'
          : 'top-[28%] -translate-y-1/2'
        : isDockCollapsed
          ? hasLetterbox
            ? 'bottom-12'
            : 'bottom-10'
          : 'bottom-[376px]';

  const backdropClass =
    settings.backdrop === 'card'
      ? 'bg-[#101218]/88 border border-white/15 shadow-2xl'
      : settings.backdrop === 'scrim'
        ? 'bg-[#080a0e]/52 border border-transparent'
        : 'bg-transparent border border-transparent';

  if (settings.mode === 'classic') {
    const plain = stripCaptionMarkup(cue.text);
    return (
      <div
        data-testid="cutscene-subtitle"
        data-caption-mode="classic"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-25 max-w-2xl w-[min(680px,90%)] px-4 py-2 rounded-lg text-center ${positionClass} ${backdropClass}`}
      >
        {settings.showSpeaker && cue.speaker && (
          <span
            className="font-bold mr-2 tracking-wide"
            style={{
              color: isVoiceover ? settings.highlightColor : '#38bdf8',
              textShadow: SPEAKER_OUTLINE_SHADOW,
            }}
          >
            {cue.speaker}:
          </span>
        )}
        <span
          className={`${sizeSpec.classic} font-semibold ${
            isVoiceover ? 'italic text-amber-50' : 'text-slate-50'
          }`}
          style={{ textShadow: SPEAKER_OUTLINE_SHADOW }}
        >
          {plain}
        </span>
      </div>
    );
  }

  if (!evaluated) return null;
  const visibleWords = evaluated.words.filter((w) => w.state !== 'hidden');
  if (visibleWords.length === 0) return null;

  const activeWord = visibleWords.find((w) => w.state === 'active') ?? null;

  return (
    <div
      data-testid="cutscene-subtitle"
      data-caption-mode="wordPop"
      data-active-word={activeWord?.text ?? ''}
      data-visible-count={visibleWords.length}
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-25 max-w-[90%] w-fit flex flex-col items-center px-4 py-2 rounded-xl text-center select-none ${positionClass} ${backdropClass}`}
    >
      {settings.showSpeaker && cue.speaker && (
        <div
          className={`${sizeSpec.speaker} font-bold uppercase tracking-[0.14em] mb-1 leading-none`}
          style={{
            color: isVoiceover ? settings.highlightColor : '#93c5fd',
            textShadow: SPEAKER_OUTLINE_SHADOW,
          }}
        >
          {isVoiceover ? `${cue.speaker} · VO` : cue.speaker}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 leading-tight">
        {visibleWords.map((w) => {
          const isActive = w.state === 'active';
          const useEmphasisColor =
            settings.emphasisPop && (w.isEmphasis || w.isPunctuationPop);
          const activeBg = useEmphasisColor
            ? settings.emphasisColor
            : settings.highlightColor;

          return (
            <span
              key={`${cue.id}-${w.index}`}
              data-word-state={w.state}
              className={`inline-block font-black tracking-tight will-change-transform motion-reduce:transform-none ${sizeSpec.word} ${
                isActive ? `${sizeSpec.pad} rounded-md shadow-lg` : 'px-0.5 py-0.5'
              }`}
              style={{
                opacity: w.opacity,
                transform: `translate3d(0, ${w.translateY.toFixed(1)}px, 0) scale(${w.scale.toFixed(3)}) rotate(${w.tiltDeg.toFixed(2)}deg)`,
                backgroundColor: isActive ? activeBg : 'transparent',
                color: isActive
                  ? '#0f172a'
                  : useEmphasisColor
                    ? settings.emphasisColor
                    : '#ffffff',
                textShadow: isActive ? 'none' : WORD_OUTLINE_SHADOW,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
