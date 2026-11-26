import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Trash2,
  Eye,
  EyeOff,
  MessageSquarePlus,
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  Captions,
  Pencil,
  Check,
  X,
  Film,
  FileText,
  Undo2,
  Redo2,
  Copy,
  Download,
  RotateCcw,
  Lock,
  Upload,
  Play,
  Square,
  ArrowRight,
  Scissors,
  MousePointer,
  Plus,
} from 'lucide-react';
import { clamp, formatTimecode } from '../../engine/timeline';
import {
  CAPTION_HIGHLIGHT_SWATCHES,
  NARRATOR_STYLE_CATALOG,
  NARRATOR_VOICE_CATALOG,
  resolveCaptionSettings,
  resolveNarratorSettings,
} from '../../engine/captionEngine';
import {
  NarratorServerStatus,
  VoicePreGenProgress,
  resolveCueVoice,
} from '../../engine/episodeAudio';
import { CINEMATIC_PRESETS } from '../../engine/cinematicPresets';
import {
  buildNarrationTranscript,
  formatTranscriptDocument,
} from '../../engine/narrationTranscript';
import {
  getClipDuration,
  getClipEndTime,
  MAX_VOICEOVER_FADE_SEC,
  MIN_VOICEOVER_CLIP_DURATION,
  sliceClipWaveformPeaks,
} from '../../engine/voiceoverCutter';
import {
  AnimationProject,
  CameraFramingPreset,
  CameraKeyframe,
  CameraMode,
  CameraPathMode,
  CaptionBackdrop,
  CaptionMode,
  CaptionPosition,
  CaptionSettings,
  CaptionSize,
  CinematicPresetId,
  CustomVoiceoverTrack,
  EASING_OPTIONS,
  EasingType,
  NarratorEngineMode,
  NarratorSettings,
  NarratorStyleId,
  NarratorVoiceId,
  SubtitleCue,
  SubtitleRole,
  VoiceoverClip,
  VoiceoverCutterToolId,
} from '../../engine/types';

export type CutsceneSubTab = 'captions' | 'presets' | 'transcript' | 'cutter' | 'camera';

interface CutscenePanelProps {
  project: AnimationProject;
  currentTime: number;
  cameraMode: CameraMode;
  showCameraRig: boolean;
  narratorStatus: NarratorServerStatus | null;
  cachedVoiceStats: { cached: number; total: number };
  isGeneratingVoices: boolean;
  voiceGenProgress: VoicePreGenProgress | null;
  voiceNotice: string | null;
  canUndoCinematicPreset: boolean;
  transcriptConfirmed: boolean;
  customVoiceover: CustomVoiceoverTrack | null;
  isDecodingVoiceover: boolean;
  voiceoverError: string | null;
  isAuditioningCustomVo: boolean;
  selectedVoClipId: string | null;
  canUndoVoEdit: boolean;
  canRedoVoEdit: boolean;
  requestedSubTab?: CutsceneSubTab | null;
  onSubTabHandled?: () => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onToggleCameraRig: () => void;
  onSnapOrbitToDirector: () => void;
  onApplyFramingPreset: (preset: CameraFramingPreset) => void;
  onCaptureOrbitAsCameraKeyframe: () => void;
  onUpdateCameraKeyframe: (kf: CameraKeyframe) => void;
  onDeleteCameraKeyframe: (kfId: string) => void;
  onSeek: (time: number) => void;
  onAddSubtitle: (cue: SubtitleCue) => void;
  onUpdateSubtitle: (cue: SubtitleCue) => void;
  onDeleteSubtitle: (cueId: string) => void;
  onUpdateCaptionSettings: (next: CaptionSettings) => void;
  onUpdateNarratorSettings: (next: NarratorSettings) => void;
  onAuditionCue: (cue: SubtitleCue) => void;
  onPregenerateVoices: () => void;
  onApplyCinematicPreset: (presetId: CinematicPresetId) => void;
  onUndoCinematicPreset: () => void;
  onUpdateCustomTranscriptText: (text: string | null) => void;
  onToggleTranscriptConfirmed: (confirmed: boolean) => void;
  onUploadCustomVoiceover: (file: File) => void;
  onUploadCustomVoiceoverFiles: (files: FileList | File[]) => void;
  onUpdateCustomVoiceover: (
    patch: Partial<Pick<CustomVoiceoverTrack, 'offsetSec' | 'volume' | 'autoDuckSfx'>>,
  ) => void;
  onRemoveCustomVoiceover: () => void;
  onToggleAuditionCustomVoiceover: (clipId?: string) => void;
  onSelectVoClip: (clipId: string | null) => void;
  onSplitVoClipAtTime: (clipId: string, splitTimeSec: number) => void;
  onSplitVoAtPlayhead: () => void;
  onTrimVoClip: (clipId: string, edge: 'start' | 'end', deltaSec: number) => void;
  onMoveVoClip: (clipId: string, newStartSec: number) => void;
  onDeleteVoClip: (clipId: string, rippleDelete?: boolean) => void;
  onUpdateVoClipSettings: (
    clipId: string,
    patch: Partial<
      Pick<
        VoiceoverClip,
        'name' | 'startSec' | 'volume' | 'fadeInSec' | 'fadeOutSec' | 'muted'
      >
    >,
  ) => void;
  onToggleVoRippleMode: () => void;
  onUndoVoEdit: () => void;
  onRedoVoEdit: () => void;
  onGoToExport: () => void;
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
  narratorStatus,
  cachedVoiceStats,
  isGeneratingVoices,
  voiceGenProgress,
  voiceNotice,
  canUndoCinematicPreset,
  transcriptConfirmed,
  customVoiceover,
  isDecodingVoiceover,
  voiceoverError,
  isAuditioningCustomVo,
  selectedVoClipId,
  canUndoVoEdit,
  canRedoVoEdit,
  requestedSubTab = null,
  onSubTabHandled,
  onSetCameraMode,
  onToggleCameraRig,
  onSnapOrbitToDirector,
  onApplyFramingPreset,
  onCaptureOrbitAsCameraKeyframe,
  onUpdateCameraKeyframe,
  onDeleteCameraKeyframe,
  onSeek,
  onAddSubtitle,
  onUpdateSubtitle,
  onDeleteSubtitle,
  onUpdateCaptionSettings,
  onUpdateNarratorSettings,
  onAuditionCue,
  onPregenerateVoices,
  onApplyCinematicPreset,
  onUndoCinematicPreset,
  onUpdateCustomTranscriptText,
  onToggleTranscriptConfirmed,
  onUploadCustomVoiceover,
  onUploadCustomVoiceoverFiles,
  onUpdateCustomVoiceover,
  onRemoveCustomVoiceover,
  onToggleAuditionCustomVoiceover,
  onSelectVoClip,
  onSplitVoClipAtTime,
  onSplitVoAtPlayhead,
  onTrimVoClip,
  onMoveVoClip,
  onDeleteVoClip,
  onUpdateVoClipSettings,
  onToggleVoRippleMode,
  onUndoVoEdit,
  onRedoVoEdit,
  onGoToExport,
}) => {
  const [subTab, setSubTab] = useState<CutsceneSubTab>('captions');
  const [transcriptViewMode, setTranscriptViewMode] = useState<'read' | 'edit'>('read');
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [cutterTool, setCutterTool] = useState<VoiceoverCutterToolId>('select');
  const [cutterZoom, setCutterZoom] = useState<number>(1);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const cutterFileInputRef = useRef<HTMLInputElement>(null);
  const cutterLaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (requestedSubTab) {
      setSubTab(requestedSubTab);
      onSubTabHandled?.();
    }
  }, [requestedSubTab, onSubTabHandled]);

  const captionSettings = useMemo(
    () => resolveCaptionSettings(project.captionSettings),
    [project.captionSettings],
  );
  const narratorSettings = useMemo(
    () => resolveNarratorSettings(project.narratorSettings),
    [project.narratorSettings],
  );

  const characterActors = project.actors.filter((a) => a.kind === 'character');
  const [speakerActorId, setSpeakerActorId] = useState<string>('');
  const [speaker, setSpeaker] = useState('Narrator');
  const [role, setRole] = useState<SubtitleRole>('voiceover');
  const [voiceOverride, setVoiceOverride] = useState<string>('');
  const [text, setText] = useState('');

  // Inline editing state for existing subtitle cues
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [editDraftSpeaker, setEditDraftSpeaker] = useState('');
  const [editDraftRole, setEditDraftRole] = useState<SubtitleRole>('dialogue');
  const [editDraftStart, setEditDraftStart] = useState(0);
  const [editDraftEnd, setEditDraftEnd] = useState(2);

  const [selectedShotId, setSelectedShotId] = useState<string>(
    () => project.cameraTrack[0]?.id ?? '',
  );

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
    const start = Math.round(currentTime * 10) / 10;
    const end = Math.min(
      project.duration,
      Math.max(start + 0.6, Math.round((start + 2.8) * 10) / 10),
    );
    onAddSubtitle({
      id: `sub_${Date.now()}`,
      startTime: start,
      endTime: end,
      speaker: speaker.trim() || (role === 'voiceover' ? 'Narrator' : 'Speaker'),
      actorId: role === 'voiceover' ? null : speakerActorId || null,
      role,
      voiceOverride: voiceOverride ? (voiceOverride as NarratorVoiceId) : null,
      text: trimmed,
    });
    setText('');
  };

  const startEditCue = (cue: SubtitleCue) => {
    setEditingCueId(cue.id);
    setEditDraftText(cue.text);
    setEditDraftSpeaker(cue.speaker);
    setEditDraftRole(cue.role ?? 'dialogue');
    setEditDraftStart(cue.startTime);
    setEditDraftEnd(cue.endTime);
  };

  const commitEditCue = (original: SubtitleCue) => {
    const trimmed = editDraftText.trim();
    if (!trimmed) {
      setEditingCueId(null);
      return;
    }
    const clampedStart = Math.max(0, Math.min(project.duration - 0.2, editDraftStart));
    const clampedEnd = Math.max(
      clampedStart + 0.2,
      Math.min(project.duration, editDraftEnd),
    );
    onUpdateSubtitle({
      ...original,
      speaker: editDraftSpeaker.trim() || original.speaker,
      role: editDraftRole,
      startTime: Math.round(clampedStart * 10) / 10,
      endTime: Math.round(clampedEnd * 10) / 10,
      text: trimmed,
    });
    setEditingCueId(null);
  };

  const handleTestNarrator = () => {
    const sampleCue: SubtitleCue = {
      id: '__audition__',
      startTime: 0,
      endTime: 3.5,
      speaker: 'Narrator',
      role: 'voiceover',
      text: 'In this town, every single figure of speech happens *literally!*',
    };
    onAuditionCue(sampleCue);
  };

  const updateCaption = (patch: Partial<CaptionSettings>) => {
    onUpdateCaptionSettings({ ...captionSettings, ...patch });
  };

  const updateNarrator = (patch: Partial<NarratorSettings>) => {
    onUpdateNarratorSettings({ ...narratorSettings, ...patch });
  };

  const activeCueAtPlayhead = useMemo(
    () =>
      project.subtitles.find(
        (c) => currentTime >= c.startTime && currentTime <= c.endTime,
      ) ?? null,
    [project.subtitles, currentTime],
  );

  const transcriptEntries = useMemo(
    () => buildNarrationTranscript(project),
    [project],
  );

  const generatedTranscriptDoc = useMemo(
    () => formatTranscriptDocument(project, transcriptEntries),
    [project, transcriptEntries],
  );

  const activeTranscriptDoc = project.customTranscriptText ?? generatedTranscriptDoc;
  const hasCustomTranscriptEdits =
    typeof project.customTranscriptText === 'string' &&
    project.customTranscriptText.trim().length > 0;

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(activeTranscriptDoc);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 1800);
    } catch {
      // Fallback ignored in headless environments without clipboard write permission
    }
  };

  const handleDownloadTranscript = () => {
    const blob = new Blob([activeTranscriptDoc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.id || 'scene'}-transcript.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleVoiceoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1 && !customVoiceover) {
        onUploadCustomVoiceover(files[0]);
      } else {
        onUploadCustomVoiceoverFiles(files);
      }
    }
    e.target.value = '';
  };

  const handleCutterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadCustomVoiceoverFiles(files);
    }
    e.target.value = '';
  };

  const voClips = useMemo(
    () => customVoiceover?.clips ?? [],
    [customVoiceover?.clips],
  );
  const voAssets = useMemo(
    () => customVoiceover?.assets ?? {},
    [customVoiceover?.assets],
  );
  const selectedVoClip = useMemo(
    () =>
      voClips.find((c) => c.id === selectedVoClipId) ??
      voClips[0] ??
      null,
    [voClips, selectedVoClipId],
  );
  const selectedVoAsset = selectedVoClip
    ? voAssets[selectedVoClip.assetId]
    : undefined;
  const rippleMode = customVoiceover?.rippleMode ?? true;

  // Compute cutter timeline span and zoom window
  const cutterTotalSpan = useMemo(() => {
    let maxEnd = Math.max(4, project.duration);
    for (const c of voClips) {
      const end = getClipEndTime(c);
      if (end + 0.5 > maxEnd) maxEnd = end + 0.5;
    }
    return maxEnd;
  }, [project.duration, voClips]);

  const [cutterViewStart, cutterViewEnd] = useMemo(() => {
    const windowSpan = Math.max(2, cutterTotalSpan / Math.max(1, cutterZoom));
    if (cutterZoom <= 1.01) return [0, cutterTotalSpan];
    const anchor = selectedVoClip
      ? selectedVoClip.startSec + getClipDuration(selectedVoClip) * 0.5
      : currentTime;
    const start = clamp(
      anchor - windowSpan * 0.5,
      0,
      Math.max(0, cutterTotalSpan - windowSpan),
    );
    return [start, start + windowSpan];
  }, [cutterTotalSpan, cutterZoom, selectedVoClip, currentTime]);

  const cutterWindowSpan = Math.max(0.5, cutterViewEnd - cutterViewStart);

  // Drag state for moving a clip or trimming left/right edge in the Voiceover Cutter lane
  const voDragRef = useRef<{
    mode: 'move' | 'trim-start' | 'trim-end';
    clipId: string;
    startX: number;
    lastAppliedDeltaSec: number;
    initStartSec: number;
    didDrag: boolean;
  } | null>(null);

  const beginVoClipDrag = (
    e: React.PointerEvent<HTMLElement>,
    mode: 'move' | 'trim-start' | 'trim-end',
    clip: VoiceoverClip,
  ) => {
    e.stopPropagation();
    onSelectVoClip(clip.id);

    if (mode === 'move' && cutterTool === 'razor') {
      const laneEl = cutterLaneRef.current;
      if (!laneEl) return;
      const rect = laneEl.getBoundingClientRect();
      const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const clickSec =
        Math.round((cutterViewStart + ratio * cutterWindowSpan) * 20) / 20;
      onSplitVoClipAtTime(clip.id, clickSec);
      onSeek(clickSec);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    voDragRef.current = {
      mode,
      clipId: clip.id,
      startX: e.clientX,
      lastAppliedDeltaSec: 0,
      initStartSec: clip.startSec,
      didDrag: false,
    };
  };

  const handleVoClipPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const st = voDragRef.current;
    const laneEl = cutterLaneRef.current;
    if (!st || !laneEl) return;
    if (!st.didDrag && Math.abs(e.clientX - st.startX) < 3) return;
    st.didDrag = true;

    const rect = laneEl.getBoundingClientRect();
    const rawDeltaSec =
      ((e.clientX - st.startX) / Math.max(1, rect.width)) * cutterWindowSpan;
    const snappedDeltaSec = Math.round(rawDeltaSec * 20) / 20;

    if (st.mode === 'move') {
      const nextStart = Math.max(
        0,
        Math.round((st.initStartSec + snappedDeltaSec) * 20) / 20,
      );
      onMoveVoClip(st.clipId, nextStart);
    } else {
      const stepDelta =
        Math.round((snappedDeltaSec - st.lastAppliedDeltaSec) * 20) / 20;
      if (Math.abs(stepDelta) >= 0.05) {
        st.lastAppliedDeltaSec = snappedDeltaSec;
        onTrimVoClip(
          st.clipId,
          st.mode === 'trim-start' ? 'start' : 'end',
          stepDelta,
        );
      }
    }
  };

  const endVoClipDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    voDragRef.current = null;
  };

  const handleCutterRulerPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const targetSec =
      Math.round((cutterViewStart + ratio * cutterWindowSpan) * 20) / 20;
    onSeek(clamp(targetSec, 0, Math.max(project.duration, cutterTotalSpan)));
  };

  const activePresetDef = useMemo(
    () =>
      project.activeCinematicPreset
        ? CINEMATIC_PRESETS.find((p) => p.id === project.activeCinematicPreset) ?? null
        : null,
    [project.activeCinematicPreset],
  );

  return (
    <div className="space-y-3">
      {/* Sub-tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#393d47]/70">
        <div
          role="tablist"
          aria-label="Cutscene Studio Sections"
          className="inline-flex flex-wrap items-center gap-1 p-0.5 rounded bg-[#14161a] border border-[#393d47]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'captions'}
            onClick={() => setSubTab('captions')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'captions'
                ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-[#2b2e35] hover:text-white'
            }`}
          >
            <Captions className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Captions &amp; Narrator</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'presets'}
            onClick={() => setSubTab('presets')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'presets'
                ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-[#2b2e35] hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cinematic Presets</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'transcript'}
            onClick={() => setSubTab('transcript')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'transcript'
                ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-[#2b2e35] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Transcript &amp; Voiceover</span>
          </button>
          <button
            type="button"
            role="tab"
            data-testid="cutscene-tab-cutter"
            aria-selected={subTab === 'cutter'}
            onClick={() => setSubTab('cutter')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'cutter'
                ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-[#2b2e35] hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              Voiceover Cutter{voClips.length > 0 ? ` (${voClips.length})` : ''}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'camera'}
            onClick={() => setSubTab('camera')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'camera'
                ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-[#2b2e35] hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Camera Rig ({project.cameraTrack.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          {subTab === 'captions' ? (
            <span className="font-mono-tabular">
              {project.subtitles.length} cues · {captionSettings.mode === 'wordPop' ? 'Word-Pop' : 'Classic'} ·{' '}
              {customVoiceover
                ? `Custom VO (${voClips.length > 1 ? `${voClips.length} clips` : customVoiceover.fileName})`
                : narratorSettings.engine === 'ai'
                  ? `AI (${narratorSettings.voice})`
                  : 'Browser TTS'}
            </span>
          ) : subTab === 'presets' ? (
            <span className="font-mono-tabular">
              {activePresetDef ? `Active: ${activePresetDef.label}` : 'Custom Studio Look'}
            </span>
          ) : subTab === 'transcript' ? (
            <span className="font-mono-tabular">
              {transcriptEntries.length} lines ·{' '}
              {customVoiceover
                ? `Custom VO ready (${voClips.length} clip${voClips.length === 1 ? '' : 's'} · ${formatTimecode(customVoiceover.durationSec)})`
                : transcriptConfirmed
                  ? 'Upload unlocked'
                  : 'Step 1: Read transcript'}
            </span>
          ) : subTab === 'cutter' ? (
            <span className="font-mono-tabular">
              {voClips.length} clip{voClips.length === 1 ? '' : 's'} ·Tool: {cutterTool === 'razor' ? 'Razor Cut' : 'Select / Move'} · Ripple {rippleMode ? 'On' : 'Off'}
            </span>
          ) : (
            <span className="font-mono-tabular">
              Playhead {formatTimecode(currentTime)} · {cameraMode === 'director' ? 'Director Cam' : 'Orbit Cam'}
            </span>
          )}
        </div>
      </div>

      {subTab === 'captions' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Column 1: Word-Pop Captions Controls */}
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Word-Pop Captions
              </span>
              <div className="inline-flex rounded bg-[#1e2024] border border-[#393d47] p-0.5">
                {(
                  [
                    { id: 'wordPop', label: 'Word-Pop' },
                    { id: 'classic', label: 'Classic' },
                  ] as { id: CaptionMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateCaption({ mode: m.id })}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      captionSettings.mode === m.id
                        ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[1.35fr_1fr] gap-2">
              <div className="space-y-1">
                <span className="block text-[11px] text-slate-400">Position</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['bottom', 'center', 'top'] as CaptionPosition[]).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => updateCaption({ position: pos })}
                      className={`px-1 py-1 rounded text-[11px] font-medium border capitalize transition-colors whitespace-nowrap shrink-0 ${
                        captionSettings.position === pos
                          ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] text-slate-400">Size</span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'compact', label: 'Sm' },
                      { id: 'medium', label: 'Md' },
                      { id: 'large', label: 'Lg' },
                    ] as { id: CaptionSize; label: string }[]
                  ).map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => updateCaption({ size: sz.id })}
                      className={`px-1.5 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        captionSettings.size === sz.id
                          ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="block text-[11px] text-slate-400">Highlight Color</span>
                <div className="flex items-center gap-1.5">
                  {CAPTION_HIGHLIGHT_SWATCHES.map((sw) => {
                    const active =
                      captionSettings.highlightColor.toLowerCase() ===
                      sw.color.toLowerCase();
                    return (
                      <button
                        key={sw.id}
                        type="button"
                        aria-label={`Highlight ${sw.label}`}
                        title={sw.label}
                        onClick={() =>
                          updateCaption({
                            highlightColor: sw.color,
                            emphasisColor: sw.emphasisColor,
                          })
                        }
                        className={`w-6 h-6 rounded border-2 transition-transform shrink-0 ${
                          active
                            ? 'border-white scale-110'
                            : 'border-[#393d47] hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.color }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] text-slate-400">Words / Chunk</span>
                <div className="grid grid-cols-4 gap-1">
                  {[2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      disabled={captionSettings.mode !== 'wordPop'}
                      onClick={() => updateCaption({ wordsPerChunk: count })}
                      className={`py-1 rounded text-[11px] font-mono-tabular font-medium border transition-colors disabled:opacity-40 ${
                        captionSettings.wordsPerChunk === count
                          ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="inline-flex items-center gap-1">
                <span className="text-[11px] text-slate-400 mr-0.5">Backdrop:</span>
                {(['outline', 'scrim', 'card'] as CaptionBackdrop[]).map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => updateCaption({ backdrop: bg })}
                    className={`px-1.5 py-0.5 rounded text-[11px] capitalize border transition-colors whitespace-nowrap shrink-0 ${
                      captionSettings.backdrop === bg
                        ? 'bg-[#2b2e35] border-[#00a2ff] text-white'
                        : 'bg-[#1e2024] border-[#393d47] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={captionSettings.showSpeaker}
                  onChange={(e) => updateCaption({ showSpeaker: e.target.checked })}
                  className="accent-[#00a2ff]"
                />
                <span>Speaker Label</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={captionSettings.emphasisPop}
                  onChange={(e) => updateCaption({ emphasisPop: e.target.checked })}
                  className="accent-[#00a2ff]"
                />
                <span>Emphasis Pop (*word*, !)</span>
              </label>
            </div>
          </div>

          {/* Column 2: Narrator Voice Studio */}
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Mic className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
                <span>Narrator Voice</span>
              </span>
              <div className="inline-flex rounded bg-[#1e2024] border border-[#393d47] p-0.5">
                {(
                  [
                    { id: 'ai', label: 'AI Studio' },
                    { id: 'browser', label: 'Browser' },
                  ] as { id: NarratorEngineMode; label: string }[]
                ).map((eng) => (
                  <button
                    key={eng.id}
                    type="button"
                    onClick={() => updateNarrator({ engine: eng.id })}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      narratorSettings.engine === eng.id
                        ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {eng.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <span>Voice Persona</span>
                <select
                  aria-label="Narrator Voice Persona"
                  value={narratorSettings.voice}
                  onChange={(e) =>
                    updateNarrator({ voice: e.target.value as NarratorVoiceId })
                  }
                  className="px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-100"
                >
                  {NARRATOR_VOICE_CATALOG.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} · {v.tagline}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <span>Delivery Style</span>
                <select
                  aria-label="Narrator Delivery Style"
                  value={narratorSettings.style}
                  onChange={(e) =>
                    updateNarrator({ style: e.target.value as NarratorStyleId })
                  }
                  className="px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-100"
                >
                  {NARRATOR_STYLE_CATALOG.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortLabel}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Speed</span>
                  <span className="font-mono-tabular text-slate-200">
                    {narratorSettings.speed.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Narrator Speed"
                  min={0.75}
                  max={1.4}
                  step={0.05}
                  value={narratorSettings.speed}
                  onChange={(e) => updateNarrator({ speed: Number(e.target.value) })}
                  className="studio-slider w-full"
                />
              </label>

              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Pitch</span>
                  <span className="font-mono-tabular text-slate-200">
                    {narratorSettings.pitchSemitones > 0
                      ? `+${narratorSettings.pitchSemitones}`
                      : narratorSettings.pitchSemitones}
                    st
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Narrator Pitch Semitones"
                  min={-4}
                  max={4}
                  step={0.5}
                  value={narratorSettings.pitchSemitones}
                  onChange={(e) =>
                    updateNarrator({ pitchSemitones: Number(e.target.value) })
                  }
                  className="studio-slider w-full"
                />
              </label>

              <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Volume</span>
                  <span className="font-mono-tabular text-slate-200">
                    {Math.round(narratorSettings.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Narrator Volume"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={narratorSettings.volume}
                  onChange={(e) => updateNarrator({ volume: Number(e.target.value) })}
                  className="studio-slider w-full"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
              <label className="inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={narratorSettings.autoDuckSfx}
                  onChange={(e) => updateNarrator({ autoDuckSfx: e.target.checked })}
                  className="accent-[#00a2ff]"
                />
                <span>Auto-Duck SFX</span>
              </label>
              <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                <input
                  type="range"
                  aria-label="SFX Auto-Duck Depth"
                  disabled={!narratorSettings.autoDuckSfx}
                  min={0.2}
                  max={0.75}
                  step={0.05}
                  value={narratorSettings.duckAmount}
                  onChange={(e) => updateNarrator({ duckAmount: Number(e.target.value) })}
                  className="studio-slider flex-1 min-w-0 disabled:opacity-40"
                />
                <span className="font-mono-tabular text-slate-400 w-9 text-right shrink-0">
                  -{Math.round(narratorSettings.duckAmount * 100)}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleTestNarrator}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
                <span>Test Voice</span>
              </button>

              <button
                type="button"
                disabled={
                  isGeneratingVoices ||
                  narratorSettings.engine !== 'ai' ||
                  project.subtitles.length === 0
                }
                onClick={onPregenerateVoices}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] disabled:opacity-45 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isGeneratingVoices && voiceGenProgress
                    ? `Generating ${voiceGenProgress.completed}/${voiceGenProgress.total}...`
                    : `Generate Voices (${cachedVoiceStats.cached}/${cachedVoiceStats.total})`}
                </span>
              </button>
            </div>

            {voiceNotice ? (
              <p className="text-[11px] text-amber-300/95 leading-snug">{voiceNotice}</p>
            ) : narratorSettings.engine === 'ai' &&
              narratorStatus &&
              !narratorStatus.aiAvailable ? (
              <p className="text-[11px] text-slate-400 leading-snug">
                Server AI voice unavailable — using browser voice fallback.
              </p>
            ) : null}
          </div>

          {/* Column 3: Dialogue & Narration Cue Editor */}
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Dialogue &amp; Narration Cues
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                Wrap *word* to pop
              </span>
            </div>

            <form onSubmit={handleCreateSubtitle} className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  aria-label="Cue Role or Actor"
                  value={role === 'voiceover' ? '__vo__' : speakerActorId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__vo__') {
                      setRole('voiceover');
                      setSpeakerActorId('');
                      setSpeaker('Narrator');
                    } else {
                      setRole('dialogue');
                      setSpeakerActorId(val);
                      const found = characterActors.find((a) => a.id === val);
                      if (found) setSpeaker(found.name);
                    }
                  }}
                  className="px-1.5 py-1 rounded bg-[#1e2024] border border-[#393d47] text-[11px] text-slate-200"
                >
                  <option value="__vo__">Narrator VO</option>
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
                  className="px-2 py-1 rounded bg-[#1e2024] border border-[#393d47] text-[11px] text-slate-100 placeholder:text-slate-500"
                />

                <select
                  aria-label="Cue Voice Override"
                  value={voiceOverride}
                  onChange={(e) => setVoiceOverride(e.target.value)}
                  className="px-1.5 py-1 rounded bg-[#1e2024] border border-[#393d47] text-[11px] text-slate-200"
                >
                  <option value="">Auto Voice</option>
                  {NARRATOR_VOICE_CATALOG.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  aria-label="Subtitle Line"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Line at ${formatTimecode(currentTime)} (use *emphasis*)...`}
                  className="flex-1 min-w-0 px-2 py-1 rounded bg-[#1e2024] border border-[#393d47] text-xs text-slate-100 placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  aria-label="Add Subtitle Cue"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
              {project.subtitles.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No cues yet. Scrub the playhead and add a narrator or dialogue line above.
                </p>
              ) : (
                project.subtitles.map((cue) => {
                  const isActiveCue = activeCueAtPlayhead?.id === cue.id;
                  const isEditing = editingCueId === cue.id;
                  const cueVoice = resolveCueVoice(cue, narratorSettings);

                  if (isEditing) {
                    return (
                      <div
                        key={cue.id}
                        className="p-1.5 rounded bg-[#1e2024] border border-[#00a2ff] space-y-1 text-xs"
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            aria-label="Edit Speaker"
                            value={editDraftSpeaker}
                            onChange={(e) => setEditDraftSpeaker(e.target.value)}
                            className="w-24 px-1.5 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-100"
                          />
                          <select
                            aria-label="Edit Role"
                            value={editDraftRole}
                            onChange={(e) =>
                              setEditDraftRole(e.target.value as SubtitleRole)
                            }
                            className="px-1 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                          >
                            <option value="voiceover">VO</option>
                            <option value="dialogue">Dialogue</option>
                          </select>
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={project.duration}
                            aria-label="Edit Start Time"
                            value={editDraftStart}
                            onChange={(e) =>
                              setEditDraftStart(Number(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] font-mono-tabular text-slate-200"
                          />
                          <input
                            type="number"
                            step={0.1}
                            min={0.2}
                            max={project.duration}
                            aria-label="Edit End Time"
                            value={editDraftEnd}
                            onChange={(e) =>
                              setEditDraftEnd(Number(e.target.value) || 0)
                            }
                            className="w-12 px-1 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] font-mono-tabular text-slate-200"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            aria-label="Edit Caption Text"
                            value={editDraftText}
                            onChange={(e) => setEditDraftText(e.target.value)}
                            className="flex-1 min-w-0 px-1.5 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => commitEditCue(cue)}
                            aria-label="Save Cue Edit"
                            className="p-1 rounded bg-[#00a2ff] text-slate-950 shrink-0"
                          >
                            <Check className="w-3 h-3" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCueId(null)}
                            aria-label="Cancel Cue Edit"
                            className="p-1 rounded bg-[#2b2e35] text-slate-300 shrink-0"
                          >
                            <X className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cue.id}
                      className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded border text-xs ${
                        isActiveCue
                          ? 'bg-[#252a34] border-[#00a2ff]'
                          : 'bg-[#1e2024] border-[#393d47]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onSeek(Math.min(cue.endTime - 0.1, cue.startTime + 0.35))
                        }
                        className="text-left min-w-0 flex-1 truncate text-slate-200 hover:text-[#38bdf8]"
                        title={`${cue.speaker} (${cueVoice}): ${cue.text}`}
                      >
                        <span className="font-mono-tabular text-amber-400 mr-1.5">
                          {formatTimecode(cue.startTime).slice(0, 5)}
                        </span>
                        <span
                          className={`font-semibold mr-1 ${
                            cue.role === 'voiceover'
                              ? 'text-amber-200'
                              : 'text-sky-300'
                          }`}
                        >
                          {cue.speaker}:
                        </span>
                        <span className="text-slate-300">{cue.text}</span>
                      </button>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onAuditionCue(cue)}
                          aria-label={`Preview voice for ${cue.speaker}`}
                          title={`Preview (${cueVoice})`}
                          className="p-1 text-slate-400 hover:text-[#00a2ff]"
                        >
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditCue(cue)}
                          aria-label={`Edit subtitle "${cue.text}"`}
                          className="p-1 text-slate-400 hover:text-slate-100"
                        >
                          <Pencil className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSubtitle(cue.id)}
                          aria-label={`Delete subtitle "${cue.text}"`}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : subTab === 'presets' ? (
        /* Cinematic Presets Tab */
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-200">
                One-Click Cinematic Look Presets
              </span>
              <span className="ml-2 text-[11px] text-slate-400">
                Applies lighting, camera lens &amp; motion, cinema bars, word-pop captions, and matching voice persona.
              </span>
            </div>
            <button
              type="button"
              disabled={!canUndoCinematicPreset}
              onClick={onUndoCinematicPreset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-200 hover:bg-[#363a43] disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
              <span>Undo Preset</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {CINEMATIC_PRESETS.map((preset) => {
              const isActive = project.activeCinematicPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`cinematic-preset-${preset.id}`}
                  onClick={() => onApplyCinematicPreset(preset.id)}
                  className={`text-left p-2.5 rounded border transition-colors ${
                    isActive
                      ? 'bg-[#222731] border-[#00a2ff] text-white'
                      : 'bg-[#14161a] border-[#393d47] text-slate-200 hover:bg-[#1e222a] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: preset.swatchColor }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold truncate">
                        {preset.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-tabular text-slate-400 uppercase shrink-0">
                      {preset.lightingMood}
                      {preset.enableLetterbox ? ' · 2.39:1' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {preset.tagline}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : subTab === 'transcript' ? (
        /* Expression-Tagged Narration Transcript & Read-First Custom Voiceover Tab */
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-3.5">
          {/* Step 1: Expression-Tagged Narration Transcript */}
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-200">
                  Step 1 · Narration &amp; Expression Transcript
                </span>
                {hasCustomTranscriptEdits && (
                  <span className="text-[10px] text-amber-300 font-mono-tabular">
                    Edited
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <div className="inline-flex rounded bg-[#1e2024] border border-[#393d47] p-0.5 mr-1">
                  <button
                    type="button"
                    onClick={() => setTranscriptViewMode('read')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 ${
                      transcriptViewMode === 'read'
                        ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Read View
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranscriptViewMode('edit')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 ${
                      transcriptViewMode === 'edit'
                        ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Edit Script
                  </button>
                </div>

                {hasCustomTranscriptEdits && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomTranscriptText(null)}
                    title="Rebuild transcript from timeline"
                    className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-300 hover:text-white whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>Rebuild</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-300 hover:text-white whitespace-nowrap shrink-0"
                >
                  {copiedTranscript ? (
                    <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTranscript}
                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-300 hover:text-white whitespace-nowrap shrink-0"
                >
                  <Download className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                  <span>.TXT</span>
                </button>
              </div>
            </div>

            {transcriptViewMode === 'read' ? (
              <div
                data-testid="narration-transcript-list"
                className="max-h-40 overflow-y-auto space-y-1 pr-0.5"
              >
                {transcriptEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    No dialogue or narration cues in this scene yet. Add cues in Captions &amp; Narrator to build an expression-tagged transcript.
                  </p>
                ) : (
                  transcriptEntries.map((entry) => {
                    const isActive = activeCueAtPlayhead?.id === entry.cueId;
                    return (
                      <button
                        key={entry.cueId}
                        type="button"
                        onClick={() =>
                          onSeek(Math.min(entry.endTime - 0.1, entry.startTime + 0.15))
                        }
                        className={`w-full text-left px-2 py-1.5 rounded border text-xs leading-snug transition-colors ${
                          isActive
                            ? 'bg-[#252a34] border-[#00a2ff]'
                            : 'bg-[#1e2024] border-[#393d47] hover:border-slate-500'
                        }`}
                      >
                        <span className="font-mono-tabular text-[11px] text-slate-400 mr-1.5">
                          [{formatTimecode(entry.startTime).slice(0, 5)}]
                        </span>
                        <span
                          className={`font-semibold mr-1.5 ${
                            entry.role === 'voiceover'
                              ? 'text-amber-200'
                              : 'text-sky-300'
                          }`}
                        >
                          {entry.speaker}
                          {entry.role === 'voiceover' ? ' (VO)' : ''}
                        </span>
                        {entry.expressionTags.map((tag) => (
                          <span
                            key={`expr-${tag}`}
                            className="font-mono-tabular text-[11px] font-semibold text-amber-400 mr-1"
                          >
                            [{tag}]
                          </span>
                        ))}
                        {entry.actionTags.map((tag) => (
                          <span
                            key={`act-${tag}`}
                            className="font-mono-tabular text-[11px] font-semibold text-sky-400 mr-1"
                          >
                            [{tag}]
                          </span>
                        ))}
                        <span className="text-slate-200">: {entry.cleanText}</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <textarea
                aria-label="Editable Narration Transcript"
                value={activeTranscriptDoc}
                onChange={(e) => onUpdateCustomTranscriptText(e.target.value)}
                rows={7}
                className="w-full max-h-40 px-2.5 py-2 rounded bg-[#1e2024] border border-[#393d47] text-xs font-mono text-slate-100 leading-relaxed resize-none focus:outline-none focus:border-[#00a2ff]"
              />
            )}

            {/* Mandatory Step 1 Read-Confirmation Gate */}
            <div className="pt-1.5 border-t border-[#393d47]/70 flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="confirm-transcript-read"
                  checked={transcriptConfirmed}
                  onChange={(e) => onToggleTranscriptConfirmed(e.target.checked)}
                  className="accent-[#00a2ff] w-3.5 h-3.5"
                />
                <span>I have read the transcript &amp; expression cues</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono-tabular shrink-0">
                {transcriptConfirmed ? 'Step 2 unlocked' : 'Required to upload'}
              </span>
            </div>
          </div>

          {/* Step 2: Custom Voiceover Upload & Export Merge Controls */}
          <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] flex flex-col justify-between gap-2.5 min-w-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  Step 2 · Custom Voiceover Audio
                </span>
                {customVoiceover && (
                  <button
                    type="button"
                    onClick={onRemoveCustomVoiceover}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <input
                ref={voiceFileInputRef}
                type="file"
                multiple
                data-testid="custom-voiceover-file-input"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                onChange={handleVoiceoverFileChange}
                className="hidden"
              />

              {!transcriptConfirmed && !customVoiceover ? (
                <div
                  data-testid="voiceover-locked"
                  className="p-3 rounded bg-[#1e2024] border border-dashed border-[#393d47] text-center space-y-2"
                >
                  <Lock className="w-4 h-4 text-slate-400 mx-auto" aria-hidden="true" />
                  <p className="text-xs text-slate-300 leading-snug">
                    Read the expression-tagged transcript on the left and check the confirmation box to unlock custom voiceover upload.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-500 cursor-not-allowed"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Upload Voiceover Locked</span>
                  </button>
                </div>
              ) : !customVoiceover ? (
                <div className="p-3 rounded bg-[#1e2024] border border-dashed border-[#00a2ff]/60 text-center space-y-2">
                  <p className="text-xs text-slate-300 leading-snug">
                    Upload one or multiple recorded voiceover files (MP3, WAV, M4A, OGG, or WebM · max 40 MB). Cut and arrange clips in Voiceover Cutter, then merge on export.
                  </p>
                  <button
                    type="button"
                    disabled={isDecodingVoiceover}
                    onClick={() => voiceFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] disabled:opacity-50 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {isDecodingVoiceover ? 'Decoding Audio...' : 'Upload Voiceover Audio'}
                    </span>
                  </button>
                </div>
              ) : (
                <div data-testid="custom-voiceover-loaded" className="space-y-2">
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[#1e2024] border border-[#393d47]">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100 truncate">
                        {customVoiceover.fileName}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-slate-400">
                        {voClips.length} clip{voClips.length === 1 ? '' : 's'} · Duration {formatTimecode(customVoiceover.durationSec)} · Replaces AI Narrator
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isDecodingVoiceover}
                        onClick={() => voiceFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-200 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                        <span>Add Clip</span>
                      </button>
                      <button
                        type="button"
                        data-testid="open-voiceover-cutter-btn"
                        onClick={() => setSubTab('cutter')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#00a2ff]/60 text-[11px] text-[#38bdf8] hover:bg-[#363a43] whitespace-nowrap shrink-0"
                      >
                        <Scissors className="w-3 h-3" aria-hidden="true" />
                        <span>Cut Voice</span>
                      </button>
                    </div>
                  </div>

                  {/* Waveform Peak Preview */}
                  <div
                    aria-label="Custom Voiceover Waveform"
                    className="h-9 px-2 py-1 rounded bg-[#1a1c22] border border-[#393d47] flex items-end gap-[2px]"
                  >
                    {customVoiceover.waveformPeaks.map((peak, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-[#00a2ff]/80 rounded-t-[1px]"
                        style={{ height: `${Math.max(10, Math.round(peak * 100))}%` }}
                      />
                    ))}
                  </div>

                  {/* Start Offset & Volume Controls */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Start Offset</span>
                        <span className="font-mono-tabular text-slate-200">
                          {customVoiceover.offsetSec >= 0 ? '+' : ''}
                          {customVoiceover.offsetSec.toFixed(1)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Voiceover Start Offset Seconds"
                        min={-5}
                        max={15}
                        step={0.1}
                        value={customVoiceover.offsetSec}
                        onChange={(e) =>
                          onUpdateCustomVoiceover({ offsetSec: Number(e.target.value) })
                        }
                        className="studio-slider w-full"
                      />
                    </label>

                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>VO Volume</span>
                        <span className="font-mono-tabular text-slate-200">
                          {Math.round(customVoiceover.volume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Custom Voiceover Volume"
                        min={0.2}
                        max={1.5}
                        step={0.05}
                        value={customVoiceover.volume}
                        onChange={(e) =>
                          onUpdateCustomVoiceover({ volume: Number(e.target.value) })
                        }
                        className="studio-slider w-full"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customVoiceover.autoDuckSfx}
                        onChange={(e) =>
                          onUpdateCustomVoiceover({ autoDuckSfx: e.target.checked })
                        }
                        className="accent-[#00a2ff]"
                      />
                      <span>Auto-Duck Scene SFX</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleAuditionCustomVoiceover()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                      >
                        {isAuditioningCustomVo ? (
                          <Square className="w-3 h-3 text-amber-400" aria-hidden="true" />
                        ) : (
                          <Play className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                        )}
                        <span>{isAuditioningCustomVo ? 'Stop' : 'Preview VO'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={onGoToExport}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] whitespace-nowrap shrink-0"
                      >
                        <span>Export Merge</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {voiceoverError && (
                <p role="alert" className="text-[11px] text-red-400 leading-snug">
                  {voiceoverError}
                </p>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-snug border-t border-[#393d47]/70 pt-1.5">
              Export merges your uploaded voiceover with auto-ducked scene SFX into the final video.
            </p>
          </div>
        </div>
      ) : subTab === 'cutter' ? (
        /* Dedicated Voiceover Cutter Workspace */
        <div
          data-testid="voiceover-cutter-workspace"
          className="p-2.5 rounded bg-[#14161a] border border-[#393d47] space-y-2.5"
        >
          <input
            ref={cutterFileInputRef}
            type="file"
            multiple
            data-testid="cutter-audio-file-input"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            onChange={handleCutterFileChange}
            className="hidden"
          />

          {/* Top Cutter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#393d47]/70">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="cutter-add-audio-btn"
                disabled={isDecodingVoiceover}
                onClick={() => cutterFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isDecodingVoiceover
                    ? 'Decoding...'
                    : voClips.length > 0
                      ? 'Add Audio Clip(s)'
                      : 'Upload Voiceover Audio'}
                </span>
              </button>

              {/* Tool Mode Selector: Select/Move vs Razor Cut */}
              <div
                role="group"
                aria-label="Voiceover Cutting Tool Mode"
                className="inline-flex items-center p-0.5 rounded bg-[#1e2024] border border-[#393d47]"
              >
                <button
                  type="button"
                  data-testid="cutter-tool-select"
                  onClick={() => setCutterTool('select')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    cutterTool === 'select'
                      ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <MousePointer className="w-3 h-3" aria-hidden="true" />
                  <span>Select / Move</span>
                </button>
                <button
                  type="button"
                  data-testid="cutter-tool-razor"
                  onClick={() => setCutterTool('razor')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    cutterTool === 'razor'
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3 h-3" aria-hidden="true" />
                  <span>Razor Split</span>
                </button>
              </div>

              {/* Split at Playhead */}
              <button
                type="button"
                data-testid="cutter-split-playhead-btn"
                disabled={voClips.length === 0}
                onClick={onSplitVoAtPlayhead}
                title="Split clip at current playhead (or split selected clip in half)"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>Split at Playhead</span>
              </button>

              {/* Delete & Ripple Delete */}
              <button
                type="button"
                data-testid="cutter-delete-clip-btn"
                disabled={!selectedVoClip}
                onClick={() => selectedVoClip && onDeleteVoClip(selectedVoClip.id, false)}
                title="Delete selected clip (leave timeline gap)"
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200 hover:bg-[#363a43] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                data-testid="cutter-ripple-delete-btn"
                disabled={!selectedVoClip}
                onClick={() => selectedVoClip && onDeleteVoClip(selectedVoClip.id, true)}
                title="Ripple Delete selected clip and shift following clips left"
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200 hover:bg-[#363a43] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>Ripple Delete</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Ripple Move / Trim Toggle */}
              <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#1e2024] border border-[#393d47] text-[11px] text-slate-200 cursor-pointer select-none whitespace-nowrap shrink-0">
                <input
                  type="checkbox"
                  data-testid="cutter-ripple-toggle"
                  checked={rippleMode}
                  onChange={onToggleVoRippleMode}
                  className="accent-[#00a2ff]"
                />
                <span>Ripple Move</span>
              </label>

              {/* Undo / Redo */}
              <button
                type="button"
                data-testid="cutter-undo-btn"
                disabled={!canUndoVoEdit}
                onClick={onUndoVoEdit}
                aria-label="Undo Voiceover Cut"
                title="Undo last voiceover cut"
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200 hover:bg-[#363a43] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                data-testid="cutter-redo-btn"
                disabled={!canRedoVoEdit}
                onClick={onRedoVoEdit}
                aria-label="Redo Voiceover Cut"
                title="Redo voiceover cut"
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200 hover:bg-[#363a43] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Redo2 className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
                <span>Redo</span>
              </button>

              {/* Zoom Selector */}
              <div className="inline-flex items-center p-0.5 rounded bg-[#1e2024] border border-[#393d47]">
                {[1, 2, 4].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setCutterZoom(z)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono-tabular whitespace-nowrap shrink-0 ${
                      cutterZoom === z
                        ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              {/* Preview Full VO Track */}
              {voClips.length > 0 && (
                <button
                  type="button"
                  data-testid="cutter-preview-track-btn"
                  onClick={() => onToggleAuditionCustomVoiceover()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                >
                  {isAuditioningCustomVo ? (
                    <Square className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  ) : (
                    <Play className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                  )}
                  <span>{isAuditioningCustomVo ? 'Stop VO' : 'Play Track'}</span>
                </button>
              )}
            </div>
          </div>

          {voiceoverError && (
            <p role="alert" className="text-[11px] text-red-400">
              {voiceoverError}
            </p>
          )}

          {voClips.length === 0 ? (
            <div className="p-4 rounded bg-[#1e2024] border border-dashed border-[#393d47] text-center space-y-2">
              <Scissors className="w-5 h-5 text-[#00a2ff] mx-auto" aria-hidden="true" />
              <p className="text-xs text-slate-300 max-w-xl mx-auto">
                Upload one or multiple voiceover files (MP3, WAV, M4A, OGG, or WebM) to trim in/out handles, split with the Razor tool, delete unwanted pauses, shape fade-in/out envelopes, and arrange clips along your scene timeline.
              </p>
              <div className="flex items-center justify-center gap-2">
                {!transcriptConfirmed && (
                  <button
                    type="button"
                    onClick={() => setSubTab('transcript')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs text-slate-200 hover:bg-[#363a43]"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>Review Transcript First</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isDecodingVoiceover}
                  onClick={() => cutterFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00a2ff] text-slate-950 font-semibold text-xs hover:bg-[#33b5ff] disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Upload Voiceover Audio</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Timecode Ruler + Multi-Clip Waveform Lane */}
              <div className="space-y-1">
                {/* Clickable Timecode Ruler */}
                <div
                  onPointerDown={handleCutterRulerPointerDown}
                  className="relative h-5 rounded-t bg-[#1a1d23] border border-b-0 border-[#393d47] px-1 flex items-center justify-between text-[10px] font-mono-tabular text-slate-400 cursor-pointer select-none"
                  title="Click ruler to seek playhead"
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const t = cutterViewStart + frac * cutterWindowSpan;
                    return (
                      <span key={frac} className="pointer-events-none">
                        {formatTimecode(t).slice(0, 7)}
                      </span>
                    );
                  })}
                  {currentTime >= cutterViewStart && currentTime <= cutterViewEnd && (
                    <div
                      style={{
                        left: `${clamp(((currentTime - cutterViewStart) / cutterWindowSpan) * 100, 0, 100)}%`,
                      }}
                      className="absolute top-0 bottom-0 w-0.5 bg-[#00a2ff] pointer-events-none"
                    />
                  )}
                </div>

                {/* Multi-Clip Waveform Lane */}
                <div
                  ref={cutterLaneRef}
                  data-testid="cutter-waveform-lane"
                  onPointerDown={handleCutterRulerPointerDown}
                  className={`relative h-16 rounded-b bg-[#101216] border border-[#393d47] overflow-hidden select-none ${
                    cutterTool === 'razor' ? 'cursor-crosshair' : 'cursor-pointer'
                  }`}
                >
                  {/* Subtle grid lines */}
                  {[0.25, 0.5, 0.75].map((g) => (
                    <div
                      key={g}
                      style={{ left: `${g * 100}%` }}
                      className="absolute top-0 bottom-0 w-px bg-[#2b2e35]/70 pointer-events-none"
                    />
                  ))}

                  {/* Voiceover Clips */}
                  {voClips.map((clip, clipIdx) => {
                    const clipDur = getClipDuration(clip);
                    const clipEnd = clip.startSec + clipDur;
                    if (clipEnd < cutterViewStart || clip.startSec > cutterViewEnd) {
                      return null;
                    }
                    const asset = voAssets[clip.assetId];
                    const peaks = sliceClipWaveformPeaks(
                      asset?.waveformPeaks ?? customVoiceover?.waveformPeaks ?? [],
                      asset?.durationSec ?? clip.sourceEndSec,
                      clip.sourceStartSec,
                      clip.sourceEndSec,
                      40,
                    );
                    const isSelected = selectedVoClip?.id === clip.id;
                    const leftPct = ((clip.startSec - cutterViewStart) / cutterWindowSpan) * 100;
                    const widthPct = Math.max(
                      1.8,
                      (clipDur / cutterWindowSpan) * 100,
                    );
                    const fadeInPct =
                      clipDur > 0 ? Math.min(48, (clip.fadeInSec / clipDur) * 100) : 0;
                    const fadeOutPct =
                      clipDur > 0 ? Math.min(48, (clip.fadeOutSec / clipDur) * 100) : 0;

                    return (
                      <div
                        key={clip.id}
                        data-testid={`vo-cutter-clip-${clipIdx}`}
                        data-clip-id={clip.id}
                        onPointerDown={(e) => beginVoClipDrag(e, 'move', clip)}
                        onPointerMove={handleVoClipPointerMove}
                        onPointerUp={endVoClipDrag}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        className={`absolute top-1.5 bottom-1.5 rounded border transition-shadow overflow-hidden flex flex-col justify-between ${
                          clip.muted
                            ? 'bg-slate-800/60 border-slate-600 opacity-60'
                            : isSelected
                              ? 'bg-[#172a3a] border-[#00a2ff] ring-1 ring-[#00a2ff]'
                              : 'bg-[#18222d] border-[#38bdf8]/60 hover:border-[#00a2ff]'
                        } ${cutterTool === 'razor' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
                      >
                        {/* Fade-In / Fade-Out Envelope Overlays */}
                        {fadeInPct > 0.5 && (
                          <div
                            style={{ width: `${fadeInPct}%` }}
                            className="pointer-events-none absolute left-0 top-0 bottom-0 bg-gradient-to-r from-black/65 to-transparent border-r border-amber-400/40 z-10"
                          />
                        )}
                        {fadeOutPct > 0.5 && (
                          <div
                            style={{ width: `${fadeOutPct}%` }}
                            className="pointer-events-none absolute right-0 top-0 bottom-0 bg-gradient-to-l from-black/65 to-transparent border-l border-amber-400/40 z-10"
                          />
                        )}

                        {/* Clip Header Badge */}
                        <div className="px-2 pt-0.5 flex items-center justify-between gap-1 text-[10px] font-mono-tabular text-slate-200 z-10 pointer-events-none">
                          <span className="font-semibold truncate text-sky-200">
                            {clip.name}
                            {clip.muted ? ' (Muted)' : ''}
                          </span>
                          <span className="text-slate-400 shrink-0">
                            {clipDur.toFixed(2)}s
                          </span>
                        </div>

                        {/* Waveform Bars */}
                        <div className="px-2 pb-1 h-8 flex items-end gap-[1.5px] pointer-events-none">
                          {peaks.map((p, idx) => (
                            <div
                              key={idx}
                              className={`flex-1 rounded-t-[1px] ${
                                clip.muted
                                  ? 'bg-slate-500/60'
                                  : isSelected
                                    ? 'bg-[#38bdf8]'
                                    : 'bg-[#00a2ff]/75'
                              }`}
                              style={{
                                height: `${Math.max(12, Math.round(p * Math.min(1.25, clip.volume) * 100))}%`,
                              }}
                            />
                          ))}
                        </div>

                        {/* Left Trim Handle */}
                        <div
                          role="slider"
                          aria-label={`Trim start of ${clip.name}`}
                          aria-valuemin={0}
                          aria-valuemax={clip.sourceEndSec}
                          aria-valuenow={Number(clip.sourceStartSec.toFixed(2))}
                          data-testid={`cutter-trim-start-${clipIdx}`}
                          onPointerDown={(e) => beginVoClipDrag(e, 'trim-start', clip)}
                          onPointerMove={handleVoClipPointerMove}
                          onPointerUp={endVoClipDrag}
                          title="Drag left edge to trim clip In-Point"
                          className="absolute left-0 top-0 bottom-0 w-2 bg-[#00a2ff]/80 hover:bg-amber-400 cursor-ew-resize z-20 flex items-center justify-center"
                        >
                          <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
                        </div>

                        {/* Right Trim Handle */}
                        <div
                          role="slider"
                          aria-label={`Trim end of ${clip.name}`}
                          aria-valuemin={clip.sourceStartSec}
                          aria-valuemax={asset?.durationSec ?? clip.sourceEndSec}
                          aria-valuenow={Number(clip.sourceEndSec.toFixed(2))}
                          data-testid={`cutter-trim-end-${clipIdx}`}
                          onPointerDown={(e) => beginVoClipDrag(e, 'trim-end', clip)}
                          onPointerMove={handleVoClipPointerMove}
                          onPointerUp={endVoClipDrag}
                          title="Drag right edge to trim clip Out-Point"
                          className="absolute right-0 top-0 bottom-0 w-2 bg-[#00a2ff]/80 hover:bg-amber-400 cursor-ew-resize z-20 flex items-center justify-center"
                        >
                          <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Playhead Line */}
                  {currentTime >= cutterViewStart && currentTime <= cutterViewEnd && (
                    <div
                      style={{
                        left: `${clamp(((currentTime - cutterViewStart) / cutterWindowSpan) * 100, 0, 100)}%`,
                      }}
                      className="absolute top-0 bottom-0 w-0.5 bg-[#00a2ff] pointer-events-none z-30"
                    />
                  )}
                </div>
              </div>

              {/* Selected Clip Inspector & Precision Trim/Fade Controls */}
              {selectedVoClip && (
                <div
                  data-testid="selected-vo-clip-inspector"
                  className="p-2 rounded bg-[#1e2024] border border-[#393d47] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-sky-300 truncate">
                        {selectedVoClip.name}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-400">
                        Timeline {selectedVoClip.startSec.toFixed(2)}s–{getClipEndTime(selectedVoClip).toFixed(2)}s · Source In {selectedVoClip.sourceStartSec.toFixed(2)}s / Out {selectedVoClip.sourceEndSec.toFixed(2)}s
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Precision Nudge Trim Buttons */}
                      <button
                        type="button"
                        data-testid="cutter-trim-in-plus"
                        onClick={() => onTrimVoClip(selectedVoClip.id, 'start', 0.2)}
                        title="Trim 0.2s off clip start"
                        className="px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-mono-tabular text-slate-200 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                      >
                        Trim In +0.2s
                      </button>
                      <button
                        type="button"
                        data-testid="cutter-trim-out-minus"
                        onClick={() => onTrimVoClip(selectedVoClip.id, 'end', -0.2)}
                        title="Trim 0.2s off clip end"
                        className="px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-mono-tabular text-slate-200 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                      >
                        Trim Out -0.2s
                      </button>

                      {/* Mute Clip Toggle */}
                      <button
                        type="button"
                        data-testid="cutter-mute-clip-toggle"
                        onClick={() =>
                          onUpdateVoClipSettings(selectedVoClip.id, {
                            muted: !selectedVoClip.muted,
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap shrink-0 ${
                          selectedVoClip.muted
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-[#2b2e35] border-[#393d47] text-slate-200 hover:bg-[#363a43]'
                        }`}
                      >
                        {selectedVoClip.muted ? (
                          <VolumeX className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                        )}
                        <span>{selectedVoClip.muted ? 'Muted' : 'Active'}</span>
                      </button>

                      {/* Audition Selected Clip */}
                      <button
                        type="button"
                        data-testid="cutter-audition-clip-btn"
                        onClick={() => onToggleAuditionCustomVoiceover(selectedVoClip.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
                      >
                        <Play className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                        <span>Audition Clip</span>
                      </button>
                    </div>
                  </div>

                  {/* Sliders for Start Time, Trim Out, Fade In, Fade Out, Clip Volume */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-0.5">
                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Timeline Start</span>
                        <span className="font-mono-tabular text-slate-200">
                          {selectedVoClip.startSec.toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Clip Timeline Start Seconds"
                        min={0}
                        max={Math.max(5, project.duration)}
                        step={0.05}
                        value={selectedVoClip.startSec}
                        onChange={(e) =>
                          onMoveVoClip(selectedVoClip.id, Number(e.target.value))
                        }
                        className="studio-slider w-full"
                      />
                    </label>

                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Source Out</span>
                        <span className="font-mono-tabular text-slate-200">
                          {selectedVoClip.sourceEndSec.toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Clip Trim Out Seconds"
                        min={Number(
                          (
                            selectedVoClip.sourceStartSec +
                            MIN_VOICEOVER_CLIP_DURATION
                          ).toFixed(2),
                        )}
                        max={Number(
                          (
                            selectedVoAsset?.durationSec ??
                            selectedVoClip.sourceEndSec
                          ).toFixed(2),
                        )}
                        step={0.05}
                        value={selectedVoClip.sourceEndSec}
                        onChange={(e) =>
                          onTrimVoClip(
                            selectedVoClip.id,
                            'end',
                            Number(e.target.value) - selectedVoClip.sourceEndSec,
                          )
                        }
                        className="studio-slider w-full"
                      />
                    </label>

                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Fade In</span>
                        <span className="font-mono-tabular text-slate-200">
                          {selectedVoClip.fadeInSec.toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Clip Fade In"
                        min={0}
                        max={Math.min(
                          MAX_VOICEOVER_FADE_SEC,
                          Number((getClipDuration(selectedVoClip) * 0.48).toFixed(2)),
                        )}
                        step={0.05}
                        value={selectedVoClip.fadeInSec}
                        onChange={(e) =>
                          onUpdateVoClipSettings(selectedVoClip.id, {
                            fadeInSec: Number(e.target.value),
                          })
                        }
                        className="studio-slider w-full"
                      />
                    </label>

                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Fade Out</span>
                        <span className="font-mono-tabular text-slate-200">
                          {selectedVoClip.fadeOutSec.toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Clip Fade Out"
                        min={0}
                        max={Math.min(
                          MAX_VOICEOVER_FADE_SEC,
                          Number((getClipDuration(selectedVoClip) * 0.48).toFixed(2)),
                        )}
                        step={0.05}
                        value={selectedVoClip.fadeOutSec}
                        onChange={(e) =>
                          onUpdateVoClipSettings(selectedVoClip.id, {
                            fadeOutSec: Number(e.target.value),
                          })
                        }
                        className="studio-slider w-full"
                      />
                    </label>

                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Clip Gain</span>
                        <span className="font-mono-tabular text-slate-200">
                          {Math.round(selectedVoClip.volume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Clip Volume"
                        min={0.2}
                        max={1.5}
                        step={0.05}
                        value={selectedVoClip.volume}
                        onChange={(e) =>
                          onUpdateVoClipSettings(selectedVoClip.id, {
                            volume: Number(e.target.value),
                          })
                        }
                        className="studio-slider w-full"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Camera Rig Tab */
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
                  {cameraMode === 'director'
                    ? 'Viewing Director Cam'
                    : 'Preview Director Cam'}
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
              {activeShot && (
                <button
                  type="button"
                  onClick={() => {
                    const dx = activeShot.position[0] - activeShot.target[0];
                    const dy = activeShot.position[1] - activeShot.target[1];
                    const dz = activeShot.position[2] - activeShot.target[2];
                    const dist = Math.hypot(dx, dy, dz);
                    const scale = dist > 0.2 ? 1.25 : 1;
                    const nextPos: [number, number, number] = [
                      Math.round((activeShot.target[0] + dx * scale) * 100) / 100,
                      Math.round(Math.max(0.6, activeShot.target[1] + dy * scale) * 100) /
                        100,
                      Math.round((activeShot.target[2] + dz * scale) * 100) / 100,
                    ];
                    onUpdateCameraKeyframe({
                      ...activeShot,
                      position: nextPos,
                    });
                  }}
                  className="px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-[#38bdf8] hover:border-[#00a2ff] hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Zoom Out +25%
                </button>
              )}
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
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              Selected Shot Properties
            </span>
            {activeShot ? (
              <div className="p-2.5 rounded bg-[#14161a] border border-[#393d47] space-y-2 text-xs">
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
                      max={90}
                      aria-label={`Shot ${activeShotIndex + 1} FOV`}
                      value={activeShot.fov}
                      onChange={(e) =>
                        onUpdateCameraKeyframe({
                          ...activeShot,
                          fov: Math.max(20, Math.min(90, Number(e.target.value) || 52)),
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
            ) : (
              <p className="text-xs text-slate-500">
                Capture a camera shot to customize framing and motion.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
