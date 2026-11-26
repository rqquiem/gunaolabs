import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Film,
  Download,
  Upload,
  Square,
  X,
  Trash2,
  Volume2,
  VolumeX,
  AlertTriangle,
} from 'lucide-react';
import { clamp, formatTimecode, getChapterBounds } from '../../engine/timeline';
import {
  countSfxCuesInRange,
  countVoiceCuesInRange,
} from '../../engine/episodeAudio';
import { VIDEO_FORMAT_CATALOG } from '../../engine/mp4Recorder';
import {
  AnimationProject,
  CustomVoiceoverTrack,
  VIDEO_ASPECT_RATIOS,
  VIDEO_EXPORT_FORMATS,
  VideoAspectRatio,
  VideoExportFormat,
  VideoExportOptions,
  VideoExportRangeMode,
  VideoRecordingState,
  VideoResolution,
} from '../../engine/types';

interface ExportPanelProps {
  project: AnimationProject;
  exportOptions: VideoExportOptions;
  recordingState: VideoRecordingState;
  customVoiceover?: CustomVoiceoverTrack | null;
  onChangeExportOptions: (opts: VideoExportOptions) => void;
  onCapturePng: () => void;
  onStartExport: () => void;
  onStopExport: () => void;
  onCancelExport: () => void;
  onDiscardExport: () => void;
  onExportJson: () => void;
  onImportJson: (raw: string) => string | null;
}

const ASPECT_LABELS: Record<VideoAspectRatio, string> = {
  '16:9': '16:9 Wide',
  '9:16': '9:16 Vertical',
  '1:1': '1:1 Square',
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEta(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return null;
  }
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `~${s}s left`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `~${m}m ${rem}s left`;
}

function previewDimensionsLabel(
  resolution: VideoResolution,
  aspectRatio: VideoAspectRatio,
): string {
  if (resolution === '720p') {
    if (aspectRatio === '9:16') return '720×1280';
    if (aspectRatio === '1:1') return '720×720';
    return '1280×720';
  }
  if (resolution === '1080p') {
    if (aspectRatio === '9:16') return '1080×1920';
    if (aspectRatio === '1:1') return '1080×1080';
    return '1920×1080';
  }
  return `Native (${aspectRatio})`;
}

function formatBackendLabel(
  backend: VideoRecordingState['encoderBackend'],
): string {
  if (backend === 'webcodecs') return 'WebCodecs';
  if (backend === 'mediarecorder') return 'MediaRecorder';
  return 'Video Engine';
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  project,
  exportOptions,
  recordingState,
  customVoiceover = null,
  onChangeExportOptions,
  onCapturePng,
  onStartExport,
  onStopExport,
  onCancelExport,
  onDiscardExport,
  onExportJson,
  onImportJson,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    setVideoError(null);
  }, [recordingState.blobUrl]);

  const chapters = useMemo(
    () => [...(project.chapters ?? [])].sort((a, b) => a.time - b.time),
    [project.chapters],
  );

  const rangeMode: VideoExportRangeMode = exportOptions.range?.mode ?? 'full';
  const resolvedRange = useMemo(() => {
    const dur = Math.max(0.2, project.duration);
    if (rangeMode === 'chapter' && chapters.length > 0) {
      const targetId = exportOptions.range?.chapterId ?? chapters[0].id;
      const bounds = getChapterBounds(chapters, targetId, dur);
      if (bounds) {
        return {
          startSec: bounds.startSec,
          endSec: bounds.endSec,
          label: bounds.chapter.title,
        };
      }
    }
    if (rangeMode === 'custom' && exportOptions.range) {
      const startSec = clamp(
        exportOptions.range.startSec,
        0,
        Math.max(0, dur - 0.1),
      );
      const endSec = clamp(exportOptions.range.endSec, startSec + 0.1, dur);
      return {
        startSec,
        endSec,
        label: `${formatTimecode(startSec).slice(0, 5)}-${formatTimecode(endSec).slice(0, 5)}`,
      };
    }
    return {
      startSec: 0,
      endSec: dur,
      label: 'Full Scene',
    };
  }, [project.duration, chapters, rangeMode, exportOptions.range]);

  const clipDuration = Math.max(
    0.1,
    resolvedRange.endSec - resolvedRange.startSec,
  );
  const estimatedFrames = Math.max(2, Math.round(clipDuration * exportOptions.fps));
  const sfxCueCount = useMemo(
    () => countSfxCuesInRange(project, resolvedRange.startSec, resolvedRange.endSec),
    [project, resolvedRange.startSec, resolvedRange.endSec],
  );
  const voiceCueCount = useMemo(
    () => countVoiceCuesInRange(project, resolvedRange.startSec, resolvedRange.endSec),
    [project, resolvedRange.startSec, resolvedRange.endSec],
  );
  const selectedFormat: VideoExportFormat = exportOptions.format ?? 'mp4';
  const selectedAspect: VideoAspectRatio = exportOptions.aspectRatio ?? '16:9';
  const formatMeta = VIDEO_FORMAT_CATALOG[selectedFormat];
  const streamingActive = exportOptions.streamingMode ?? clipDuration > 45;

  const setRangeMode = (mode: VideoExportRangeMode) => {
    if (mode === 'full') {
      onChangeExportOptions({
        ...exportOptions,
        range: undefined,
      });
      return;
    }
    if (mode === 'chapter') {
      const ch = chapters[0];
      if (!ch) return;
      const bounds = getChapterBounds(chapters, ch.id, project.duration);
      onChangeExportOptions({
        ...exportOptions,
        range: {
          mode: 'chapter',
          chapterId: ch.id,
          startSec: bounds?.startSec ?? 0,
          endSec: bounds?.endSec ?? project.duration,
        },
      });
      return;
    }
    onChangeExportOptions({
      ...exportOptions,
      range: {
        mode: 'custom',
        startSec: 0,
        endSec: project.duration,
      },
    });
  };

  const isExporting =
    recordingState.status === 'recording' ||
    recordingState.status === 'processing';
  const isFinalizing = recordingState.status === 'processing';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const err = onImportJson(String(reader.result ?? ''));
      if (err) {
        setImportError(err);
        setStatusNote(null);
      } else {
        setImportError(null);
        setStatusNote('Project loaded cleanly.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const readyExt: VideoExportFormat =
    recordingState.fileExtension ?? recordingState.format ?? selectedFormat;
  const readyAspect = recordingState.aspectRatio ?? selectedAspect;
  const aspectSlug =
    readyAspect === '9:16'
      ? '-vertical'
      : readyAspect === '1:1'
        ? '-square'
        : '';
  const downloadFilename =
    rangeMode === 'full'
      ? `${project.id}${aspectSlug}-cutscene.${readyExt}`
      : `${project.id}${aspectSlug}-${resolvedRange.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}.${readyExt}`;

  const activeFormatLabel = (
    recordingState.format ?? selectedFormat
  ).toUpperCase();
  const etaLabel = formatEta(recordingState.estimatedRemainingSec);
  const readyCodecSummary = [
    recordingState.videoCodec,
    recordingState.hasAudio
      ? recordingState.audioCodec ?? 'Audio'
      : 'Silent',
  ]
    .filter(Boolean)
    .join(' + ');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-300">
            Cutscene Video Exporter
          </span>
          <span className="text-[11px] font-mono-tabular text-slate-400 truncate">
            {previewDimensionsLabel(exportOptions.resolution, selectedAspect)} ·{' '}
            {exportOptions.fps} fps · {exportOptions.bitrateMbps} Mbps ·{' '}
            {exportOptions.includeAudio ? 'Audio On' : 'Muted'}
          </span>
        </div>

        {/* Output Format & Aspect Ratio Segmented Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Format</span>
              <span className="text-slate-500 truncate">{formatMeta.shortDesc}</span>
            </div>
            <div
              role="group"
              aria-label="Export Video Format"
              className="grid grid-cols-4 gap-1 p-1 rounded bg-[#14161a] border border-[#393d47]"
            >
              {VIDEO_EXPORT_FORMATS.map((fmt) => {
                const active = selectedFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    disabled={isExporting}
                    onClick={() =>
                      onChangeExportOptions({
                        ...exportOptions,
                        format: fmt,
                      })
                    }
                    className={`px-1.5 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                      active
                        ? 'bg-[#00a2ff] text-slate-950'
                        : 'text-slate-300 hover:bg-[#2b2e35]'
                    }`}
                  >
                    {VIDEO_FORMAT_CATALOG[fmt].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Aspect Ratio</span>
              <span className="font-mono-tabular text-slate-500">
                {previewDimensionsLabel(exportOptions.resolution, selectedAspect)}
              </span>
            </div>
            <div
              role="group"
              aria-label="Export Aspect Ratio"
              className="grid grid-cols-3 gap-1 p-1 rounded bg-[#14161a] border border-[#393d47]"
            >
              {VIDEO_ASPECT_RATIOS.map((ratio) => {
                const active = selectedAspect === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    disabled={isExporting}
                    onClick={() =>
                      onChangeExportOptions({
                        ...exportOptions,
                        aspectRatio: ratio,
                      })
                    }
                    className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                      active
                        ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-[#2b2e35]'
                    }`}
                  >
                    {ASPECT_LABELS[ratio]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resolution / FPS / Quality */}
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
            <span>Resolution</span>
            <select
              aria-label="Export Resolution"
              disabled={isExporting}
              value={exportOptions.resolution}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  resolution: e.target.value as VideoResolution,
                })
              }
              className="px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200 disabled:opacity-50"
            >
              <option value="720p">720p HD</option>
              <option value="1080p">1080p Full HD</option>
              <option value="native">Native Canvas</option>
            </select>
          </label>

          <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
            <span>Frame Rate</span>
            <select
              aria-label="Export Frame Rate"
              disabled={isExporting}
              value={exportOptions.fps}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  fps: Number(e.target.value) as 24 | 30 | 60,
                })
              }
              className="px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200 disabled:opacity-50"
            >
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </label>

          <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
            <span>Quality</span>
            <select
              aria-label="Export Bitrate"
              disabled={isExporting}
              value={exportOptions.bitrateMbps}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  bitrateMbps: Number(e.target.value) as 4 | 8 | 14,
                })
              }
              className="px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200 disabled:opacity-50"
            >
              <option value={4}>Standard (4 Mbps)</option>
              <option value={8}>High (8 Mbps)</option>
              <option value={14}>Master (14 Mbps)</option>
            </select>
          </label>
        </div>

        {/* Export Scope (Full Scene / Chapter / Custom Range) */}
        <div className="p-2 rounded bg-[#14161a] border border-[#393d47] space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'full', label: 'Full Scene' },
                  { id: 'chapter', label: 'Chapter' },
                  { id: 'custom', label: 'Custom Range' },
                ] as const
              ).map((item) => {
                const disabled = item.id === 'chapter' && chapters.length === 0;
                const active = rangeMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isExporting || disabled}
                    onClick={() => setRangeMode(item.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                      active
                        ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                        : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-mono-tabular text-slate-400 whitespace-nowrap">
              {formatTimecode(clipDuration)} · {estimatedFrames} frames
            </span>
          </div>

          {rangeMode === 'chapter' && chapters.length > 0 && (
            <select
              aria-label="Export Chapter"
              disabled={isExporting}
              value={exportOptions.range?.chapterId ?? chapters[0].id}
              onChange={(e) => {
                const chId = e.target.value;
                const bounds = getChapterBounds(chapters, chId, project.duration);
                onChangeExportOptions({
                  ...exportOptions,
                  range: {
                    mode: 'chapter',
                    chapterId: chId,
                    startSec: bounds?.startSec ?? 0,
                    endSec: bounds?.endSec ?? project.duration,
                  },
                });
              }}
              className="w-full px-2 py-1 rounded bg-[#1e2024] border border-[#393d47] text-xs text-slate-200"
            >
              {chapters.map((ch) => {
                const bounds = getChapterBounds(chapters, ch.id, project.duration);
                const spanLabel = bounds
                  ? `${formatTimecode(bounds.startSec).slice(0, 5)}–${formatTimecode(bounds.endSec).slice(0, 5)}`
                  : formatTimecode(ch.time).slice(0, 5);
                return (
                  <option key={ch.id} value={ch.id}>
                    {ch.title} ({spanLabel})
                  </option>
                );
              })}
            </select>
          )}

          {rangeMode === 'custom' && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <label className="flex items-center gap-1">
                <span>Start (s)</span>
                <input
                  type="number"
                  disabled={isExporting}
                  min={0}
                  max={Math.max(0, project.duration - 0.5)}
                  step={0.5}
                  value={Number(resolvedRange.startSec.toFixed(1))}
                  onChange={(e) => {
                    const start = clamp(
                      Number(e.target.value) || 0,
                      0,
                      Math.max(0, resolvedRange.endSec - 0.5),
                    );
                    onChangeExportOptions({
                      ...exportOptions,
                      range: {
                        mode: 'custom',
                        startSec: start,
                        endSec: resolvedRange.endSec,
                      },
                    });
                  }}
                  className="w-16 px-1.5 py-0.5 rounded bg-[#1e2024] border border-[#393d47] text-xs font-mono-tabular text-slate-100"
                />
              </label>
              <label className="flex items-center gap-1">
                <span>End (s)</span>
                <input
                  type="number"
                  disabled={isExporting}
                  min={Math.min(project.duration, resolvedRange.startSec + 0.5)}
                  max={project.duration}
                  step={0.5}
                  value={Number(resolvedRange.endSec.toFixed(1))}
                  onChange={(e) => {
                    const end = clamp(
                      Number(e.target.value) || project.duration,
                      resolvedRange.startSec + 0.5,
                      project.duration,
                    );
                    onChangeExportOptions({
                      ...exportOptions,
                      range: {
                        mode: 'custom',
                        startSec: resolvedRange.startSec,
                        endSec: end,
                      },
                    });
                  }}
                  className="w-16 px-1.5 py-0.5 rounded bg-[#1e2024] border border-[#393d47] text-xs font-mono-tabular text-slate-100"
                />
              </label>
            </div>
          )}
        </div>

        {/* Toggle Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={isExporting}
              checked={exportOptions.includeAudio}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  includeAudio: e.target.checked,
                })
              }
              className="accent-[#00a2ff]"
            />
            {exportOptions.includeAudio ? (
              <Volume2 className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            )}
            <span>
              Include Audio
              <span className="text-slate-500 ml-1">
                ({customVoiceover
                  ? [
                      customVoiceover.clips && customVoiceover.clips.length > 1
                        ? `Custom VO (${customVoiceover.clips.length} clips)`
                        : 'Custom VO',
                      sfxCueCount > 0 ? `${sfxCueCount} SFX` : null,
                    ]
                      .filter(Boolean)
                      .join(' + ')
                  : voiceCueCount > 0 || sfxCueCount > 0
                    ? [
                        voiceCueCount > 0 ? `${voiceCueCount} Voice` : null,
                        sfxCueCount > 0 ? `${sfxCueCount} SFX` : null,
                      ]
                        .filter(Boolean)
                        .join(' + ')
                    : 'no cues'}
                )
              </span>
            </span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={isExporting}
              checked={exportOptions.burnSubtitles}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  burnSubtitles: e.target.checked,
                })
              }
              className="accent-[#00a2ff]"
            />
            <span>Burn-in Word-Pop Captions</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={isExporting}
              checked={exportOptions.burnLetterbox}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  burnLetterbox: e.target.checked,
                })
              }
              className="accent-[#00a2ff]"
            />
            <span>Letterbox</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={isExporting}
              checked={streamingActive}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  streamingMode: e.target.checked,
                })
              }
              className="accent-[#00a2ff]"
            />
            <span>Stream Mode</span>
          </label>
        </div>

        {/* Export Progress or Primary Export CTA */}
        {isExporting ? (
          <div className="p-2.5 rounded bg-[#14161a] border border-[#00a2ff]/50 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#38bdf8] whitespace-nowrap">
                {isFinalizing
                  ? `Finalizing ${activeFormatLabel}...`
                  : `Rendering ${activeFormatLabel}...`}
              </span>
              <span className="font-mono-tabular text-slate-200 truncate">
                {recordingState.currentFrame}/{recordingState.totalFrames} ·{' '}
                {formatTimecode(recordingState.elapsedSec)}/{formatTimecode(recordingState.durationSec)} ·{' '}
                {Math.round(recordingState.progress * 100)}%
                {etaLabel ? ` · ${etaLabel}` : ''}
                {recordingState.streamedBytes
                  ? ` · ${formatBytes(recordingState.streamedBytes)}`
                  : ''}
              </span>
            </div>
            <div className="w-full h-1.5 rounded bg-[#2b2e35] overflow-hidden">
              <div
                className="h-full bg-[#00a2ff] transition-all duration-100"
                style={{
                  width: `${Math.min(100, Math.round(recordingState.progress * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFinalizing}
                  onClick={onStopExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Square className="w-3 h-3" aria-hidden="true" />
                  <span>Stop Early & Finalize</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelExport}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-300 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  <span>Cancel</span>
                </button>
              </div>
              {recordingState.encoderBackend && (
                <span className="text-[11px] font-mono-tabular text-slate-500 whitespace-nowrap truncate">
                  {formatBackendLabel(recordingState.encoderBackend)}
                  {recordingState.videoCodec ? ` · ${recordingState.videoCodec}` : ''}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onStartExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] transition-colors whitespace-nowrap shrink-0"
            >
              <Film className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {rangeMode === 'full'
                  ? `Export ${formatMeta.label}`
                  : `Export ${resolvedRange.label} (${formatMeta.label})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCapturePng();
                setStatusNote('PNG frame downloaded.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Snapshot PNG</span>
            </button>
          </div>
        )}

        {recordingState.error && (
          <p role="alert" className="text-xs text-red-400">
            {recordingState.error}
          </p>
        )}
      </div>

      {/* Right Column: Live Preview Player & Instant Download + Project Save/Load */}
      <div className="space-y-2.5 flex flex-col justify-between">
        {recordingState.blobUrl ? (
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-emerald-400 whitespace-nowrap">
                {readyExt.toUpperCase()} Ready · {formatBytes(recordingState.fileSizeBytes)}
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-400 truncate">
                {recordingState.width && recordingState.height
                  ? `${recordingState.width}×${recordingState.height}`
                  : previewDimensionsLabel(exportOptions.resolution, readyAspect)}{' '}
                · {readyAspect} · {readyCodecSummary} ·{' '}
                {formatBackendLabel(recordingState.encoderBackend)}
              </span>
            </div>

            {recordingState.fallbackUsed && recordingState.fallbackReason && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
                <span>{recordingState.fallbackReason}</span>
              </div>
            )}

            <video
              key={recordingState.blobUrl}
              src={recordingState.blobUrl}
              controls
              loop
              playsInline
              preload="auto"
              onError={() =>
                setVideoError(
                  `Browser inline preview cannot decode ${readyExt.toUpperCase()} directly. Click Download ${readyExt.toUpperCase()} to play in VLC, QuickTime, or your video editor.`,
                )
              }
              aria-label={`Recorded Cutscene ${readyExt.toUpperCase()} Preview`}
              className="w-full max-h-44 object-contain rounded bg-black border border-[#393d47]"
            />

            {videoError && (
              <p role="alert" className="text-[11px] text-amber-300">
                {videoError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={recordingState.blobUrl}
                  download={downloadFilename}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download {readyExt.toUpperCase()}</span>
                </a>
                <button
                  type="button"
                  onClick={onDiscardExport}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-300 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  <span>Discard</span>
                </button>
              </div>
              <span className="font-mono-tabular text-[11px] text-slate-500 truncate max-w-44">
                {downloadFilename}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] space-y-1.5">
            <div className="text-xs font-medium text-slate-300">
              Preview & Output Summary
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Renders {formatTimecode(resolvedRange.startSec)} to{' '}
              {formatTimecode(resolvedRange.endSec)} from the Director camera with
              studio helpers hidden. Supports MP4, WebM, MOV, and MKV with automatic
              multi-engine fallback so export always succeeds.
            </p>
            <div className="text-[11px] font-mono-tabular text-slate-500">
              Target: {formatMeta.label} · {ASPECT_LABELS[selectedAspect]} ·{' '}
              {previewDimensionsLabel(exportOptions.resolution, selectedAspect)} ·{' '}
              {exportOptions.includeAudio &&
              (customVoiceover || voiceCueCount > 0 || sfxCueCount > 0)
                ? `${[
                    customVoiceover
                      ? customVoiceover.clips && customVoiceover.clips.length > 1
                        ? `Custom VO (${customVoiceover.clips.length} clips · ${formatTimecode(customVoiceover.durationSec)})`
                        : `Custom VO (${customVoiceover.fileName})`
                      : voiceCueCount > 0
                        ? `${voiceCueCount} Voice`
                        : null,
                    sfxCueCount > 0 ? `${sfxCueCount} SFX` : null,
                  ]
                    .filter(Boolean)
                    .join(' + ')} merged`
                : 'Video only'}
            </div>
          </div>
        )}

        {/* Always-Accessible Project JSON Controls */}
        <div className="pt-2 border-t border-[#2b2e35] space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400 truncate">
              Project File · {project.name}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onExportJson();
                  setStatusNote('Project JSON exported.');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
                <span>Save JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                <span>Load JSON</span>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload Project JSON File"
              />
            </div>
          </div>

          {importError && (
            <p role="alert" className="text-xs text-red-400">
              {importError}
            </p>
          )}
          {statusNote && !importError && (
            <p className="text-xs text-emerald-400">{statusNote}</p>
          )}
        </div>
      </div>
    </div>
  );
};
