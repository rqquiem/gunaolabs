import React, { useEffect, useRef, useState } from 'react';
import { Camera, Film, Download, Upload, Square, X, Trash2 } from 'lucide-react';
import { formatTimecode } from '../../engine/timeline';
import {
  AnimationProject,
  VideoExportOptions,
  VideoRecordingState,
  VideoResolution,
} from '../../engine/types';

interface ExportPanelProps {
  project: AnimationProject;
  exportOptions: VideoExportOptions;
  recordingState: VideoRecordingState;
  onChangeExportOptions: (opts: VideoExportOptions) => void;
  onCapturePng: () => void;
  onStartExport: () => void;
  onStopExport: () => void;
  onCancelExport: () => void;
  onDiscardExport: () => void;
  onExportJson: () => void;
  onImportJson: (raw: string) => string | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackendLabel(backend: VideoRecordingState['encoderBackend']): string {
  if (backend === 'webcodecs') return 'WebCodecs H.264';
  if (backend === 'mediarecorder') return 'MediaRecorder MP4';
  return 'H.264 MP4';
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  project,
  exportOptions,
  recordingState,
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            MP4 Cutscene Recorder
          </span>
          <span className="text-[11px] font-mono-tabular text-slate-500">
            {exportOptions.resolution} · {exportOptions.fps}fps · {exportOptions.bitrateMbps} Mbps · H.264 MP4
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
            <span>Resolution</span>
            <select
              aria-label="MP4 Resolution"
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
              aria-label="MP4 Frame Rate"
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
              aria-label="MP4 Bitrate"
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

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
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
            <span>Burn-in Subtitles</span>
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
            <span>Cinema Letterbox Bars</span>
          </label>
        </div>

        {isExporting ? (
          <div className="p-2.5 rounded bg-[#14161a] border border-[#00a2ff]/50 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#38bdf8]">
                {isFinalizing ? 'Finalizing MP4...' : 'Rendering Cutscene MP4...'}
              </span>
              <span className="font-mono-tabular text-slate-200">
                Frame {recordingState.currentFrame} / {recordingState.totalFrames} ·{' '}
                {formatTimecode(recordingState.elapsedSec)} /{' '}
                {formatTimecode(recordingState.durationSec)} ·{' '}
                {Math.round(recordingState.progress * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded bg-[#2b2e35] overflow-hidden">
              <div
                className="h-full bg-[#00a2ff] transition-all duration-100"
                style={{ width: `${Math.min(100, Math.round(recordingState.progress * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFinalizing}
                  onClick={onStopExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] disabled:opacity-50 whitespace-nowrap"
                >
                  <Square className="w-3 h-3" aria-hidden="true" />
                  <span>Stop Early & Finalize</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelExport}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-300 hover:bg-[#363a43] whitespace-nowrap"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  <span>Cancel</span>
                </button>
              </div>
              {recordingState.encoderBackend && (
                <span className="text-[11px] font-mono-tabular text-slate-500 whitespace-nowrap">
                  {formatBackendLabel(recordingState.encoderBackend)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCapturePng();
                setStatusNote('PNG frame downloaded.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Snapshot PNG</span>
            </button>

            <button
              type="button"
              onClick={onStartExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] transition-colors whitespace-nowrap"
            >
              <Film className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Record Cutscene MP4</span>
            </button>
          </div>
        )}

        {recordingState.error && (
          <p role="alert" className="text-xs text-red-400">
            {recordingState.error}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        {recordingState.blobUrl ? (
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-emerald-400">
                Recorded MP4 Ready ({formatBytes(recordingState.fileSizeBytes)})
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-500 truncate max-w-48">
                {formatBackendLabel(recordingState.encoderBackend)} · {recordingState.mimeType}
              </span>
            </div>
            <video
              key={recordingState.blobUrl}
              src={recordingState.blobUrl}
              controls
              loop
              playsInline
              preload="auto"
              onError={() =>
                setVideoError(
                  'Browser preview could not decode this MP4 stream. Download the MP4 file or try re-exporting at 720p.',
                )
              }
              aria-label="Recorded Cutscene MP4 Preview"
              className="w-full aspect-video max-h-44 object-contain rounded bg-black border border-[#393d47]"
            />
            {videoError && (
              <p role="alert" className="text-xs text-amber-400">
                {videoError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <a
                href={recordingState.blobUrl}
                download={`${project.id}-cutscene.mp4`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download MP4</span>
              </a>
              <button
                type="button"
                onClick={onDiscardExport}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-300 hover:bg-[#363a43] whitespace-nowrap"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                <span>Discard</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              Project File ({project.name})
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onExportJson();
                  setStatusNote('Project JSON exported.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
                <span>Save Project JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                <span>Load Project JSON</span>
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

            {importError && (
              <p role="alert" className="text-xs text-red-400">
                {importError}
              </p>
            )}
            {statusNote && !importError && (
              <p className="text-xs text-emerald-400">{statusNote}</p>
            )}
            <p className="text-xs text-slate-500">
              Offline export renders 00:00.0 to {formatTimecode(project.duration)} from the Director camera at target resolution with helpers hidden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
