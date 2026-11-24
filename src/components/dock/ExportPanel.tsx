import React, { useRef, useState } from 'react';
import { Camera, Film, Download, Upload, Square, X, Trash2 } from 'lucide-react';
import { formatTimecode } from '../../engine/timeline';
import {
  AnimationProject,
  WebmExportOptions,
  WebmRecordingState,
  WebmResolution,
} from '../../engine/types';

interface ExportPanelProps {
  project: AnimationProject;
  exportOptions: WebmExportOptions;
  recordingState: WebmRecordingState;
  onChangeExportOptions: (opts: WebmExportOptions) => void;
  onCapturePng: () => void;
  onStartWebm: () => void;
  onStopWebm: () => void;
  onCancelWebm: () => void;
  onDiscardWebm: () => void;
  onExportJson: () => void;
  onImportJson: (raw: string) => string | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  project,
  exportOptions,
  recordingState,
  onChangeExportOptions,
  onCapturePng,
  onStartWebm,
  onStopWebm,
  onCancelWebm,
  onDiscardWebm,
  onExportJson,
  onImportJson,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const isRecording = recordingState.status === 'recording';

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
            WebM Cutscene Recorder
          </span>
          <span className="text-[11px] font-mono-tabular text-slate-500">
            {exportOptions.resolution} · {exportOptions.fps}fps · {exportOptions.bitrateMbps} Mbps
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
            <span>Resolution</span>
            <select
              aria-label="WebM Resolution"
              disabled={isRecording}
              value={exportOptions.resolution}
              onChange={(e) =>
                onChangeExportOptions({
                  ...exportOptions,
                  resolution: e.target.value as WebmResolution,
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
              aria-label="WebM Frame Rate"
              disabled={isRecording}
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
              aria-label="WebM Bitrate"
              disabled={isRecording}
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
              disabled={isRecording}
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
              disabled={isRecording}
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

        {isRecording ? (
          <div className="p-2.5 rounded bg-[#14161a] border border-[#00a2ff]/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#38bdf8]">
                Recording Cutscene...
              </span>
              <span className="font-mono-tabular text-slate-200">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onStopWebm}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap"
              >
                <Square className="w-3 h-3" aria-hidden="true" />
                <span>Stop Early & Preview</span>
              </button>
              <button
                type="button"
                onClick={onCancelWebm}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-300 hover:bg-[#363a43] whitespace-nowrap"
              >
                <X className="w-3 h-3" aria-hidden="true" />
                <span>Cancel</span>
              </button>
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
              onClick={onStartWebm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] transition-colors whitespace-nowrap"
            >
              <Film className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Record Cutscene WebM</span>
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
                Recorded WebM Ready ({formatBytes(recordingState.fileSizeBytes)})
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-500 truncate max-w-40">
                {recordingState.mimeType}
              </span>
            </div>
            <video
              src={recordingState.blobUrl}
              controls
              loop
              playsInline
              aria-label="Recorded Cutscene WebM Preview"
              className="w-full max-h-24 rounded bg-black border border-[#393d47]"
            />
            <div className="flex items-center gap-2">
              <a
                href={recordingState.blobUrl}
                download={`${project.id}-cutscene.webm`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download WebM</span>
              </a>
              <button
                type="button"
                onClick={onDiscardWebm}
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
              Recordings capture from 00:00.0 to {formatTimecode(project.duration)} and open an inline WebM preview player here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
