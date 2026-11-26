import {
  AppendOnlyStreamTarget,
  AudioBufferSource,
  AudioCodec,
  BufferTarget,
  CanvasSource,
  MkvOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  OutputFormat,
  Quality,
  VideoCodec,
  WebMOutputFormat,
  canEncodeVideo,
  getFirstEncodableAudioCodec,
} from 'mediabunny';
import { drawWordPopCaptionOnCanvas } from './captionEngine';
import { trimAudioBuffer } from './episodeAudio';
import {
  CaptionSettings,
  SubtitleCue,
  VideoAspectRatio,
  VideoEncoderBackend,
  VideoExportFormat,
  VideoExportOptions,
  VideoResolution,
} from './types';

export interface VideoFormatMeta {
  id: VideoExportFormat;
  label: string;
  extension: VideoExportFormat;
  mimeType: string;
  shortDesc: string;
  preferredVideoCodecs: VideoCodec[];
  preferredAudioCodecs: AudioCodec[];
  supportsInlinePreview: boolean;
  supportsStreaming: boolean;
}

export const VIDEO_FORMAT_CATALOG: Record<VideoExportFormat, VideoFormatMeta> = {
  mp4: {
    id: 'mp4',
    label: 'MP4',
    extension: 'mp4',
    mimeType: 'video/mp4',
    shortDesc: 'H.264 / VP9 · Universal',
    preferredVideoCodecs: ['avc', 'vp9', 'av1'],
    preferredAudioCodecs: ['aac', 'opus'],
    supportsInlinePreview: true,
    supportsStreaming: true,
  },
  webm: {
    id: 'webm',
    label: 'WebM',
    extension: 'webm',
    mimeType: 'video/webm',
    shortDesc: 'VP9 / VP8 · Fast Web',
    preferredVideoCodecs: ['vp9', 'vp8', 'av1'],
    preferredAudioCodecs: ['opus'],
    supportsInlinePreview: true,
    supportsStreaming: true,
  },
  mov: {
    id: 'mov',
    label: 'MOV',
    extension: 'mov',
    mimeType: 'video/quicktime',
    shortDesc: 'QuickTime · Editing',
    preferredVideoCodecs: ['avc', 'vp9', 'hevc'],
    preferredAudioCodecs: ['aac', 'pcm-s16'],
    supportsInlinePreview: false,
    supportsStreaming: true,
  },
  mkv: {
    id: 'mkv',
    label: 'MKV',
    extension: 'mkv',
    mimeType: 'video/x-matroska',
    shortDesc: 'Matroska · Flexible',
    preferredVideoCodecs: ['avc', 'vp9', 'vp8', 'av1'],
    preferredAudioCodecs: ['opus', 'aac', 'pcm-s16'],
    supportsInlinePreview: false,
    supportsStreaming: true,
  },
};

export interface VideoRecordedResult {
  blobUrl: string;
  mimeType: string;
  fileExtension: VideoExportFormat;
  format: VideoExportFormat;
  requestedFormat: VideoExportFormat;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  videoCodec: string;
  audioCodec: string | null;
  hasAudio: boolean;
  width: number;
  height: number;
  aspectRatio: VideoAspectRatio;
  fileSizeBytes: number;
  encoderBackend: VideoEncoderBackend;
  isFragmentedStream?: boolean;
}

export interface ExportDimensions {
  width: number;
  height: number;
}

interface WebCodecsEncoderProfile {
  codec: VideoCodec;
  fullCodecString?: string;
  quality: Quality;
  latencyMode?: 'quality' | 'realtime';
  hardwareAcceleration: 'no-preference' | 'prefer-software';
}

export function resolveExportDimensions(
  sourceCanvas: HTMLCanvasElement,
  resolution: VideoResolution,
  aspectRatio: VideoAspectRatio = '16:9',
): ExportDimensions {
  const align16 = (v: number) => Math.max(64, Math.round(v / 16) * 16);

  if (resolution === '720p') {
    if (aspectRatio === '9:16') return { width: 720, height: 1280 };
    if (aspectRatio === '1:1') return { width: 720, height: 720 };
    return { width: 1280, height: 720 };
  }
  if (resolution === '1080p') {
    if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
    if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
    return { width: 1920, height: 1080 };
  }

  const srcW = Math.max(
    64,
    sourceCanvas.clientWidth || sourceCanvas.width || 1280,
  );
  const srcH = Math.max(
    64,
    sourceCanvas.clientHeight || sourceCanvas.height || 720,
  );

  if (aspectRatio === '9:16') {
    const h = align16(Math.max(srcH, 960));
    return { width: align16((h * 9) / 16), height: h };
  }
  if (aspectRatio === '1:1') {
    const side = align16(Math.max(Math.min(srcW, srcH), 720));
    return { width: side, height: side };
  }

  // Align native dimensions to 16px macroblocks for H.264 / VP9 / hardware encoders
  return {
    width: align16(srcW),
    height: align16(srcH),
  };
}

export function computeVerticalFovForAspect(
  baseFovDeg: number,
  aspectRatio: VideoAspectRatio = '16:9',
): number {
  if (aspectRatio === '9:16') {
    return Math.min(86, Math.round(baseFovDeg * 1.32 * 10) / 10);
  }
  if (aspectRatio === '1:1') {
    return Math.min(78, Math.round(baseFovDeg * 1.14 * 10) / 10);
  }
  return baseFovDeg;
}

export function getH264CodecCandidates(
  width: number,
  height: number,
  fps: number,
  bitrateBps: number,
): string[] {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  const needsHighRate = fps > 30 || bitrateBps > 14_000_000;

  // Prefer Constrained Baseline (42e0) and Baseline (4200) first: zero B-frames,
  // monotonic DTS=PTS, universal playback in <video>, QuickTime, iOS, Android, and OpenH264.
  if (macroblocks > 8192) {
    return ['avc1.42e032', 'avc1.420032', 'avc1.4d0032', 'avc1.640032'];
  }
  if (macroblocks > 3600) {
    return needsHighRate
      ? ['avc1.42e02a', 'avc1.42002a', 'avc1.4d002a', 'avc1.64002a', 'avc1.42e028', 'avc1.4d0028']
      : ['avc1.42e028', 'avc1.420028', 'avc1.4d0028', 'avc1.42e02a', 'avc1.4d002a', 'avc1.64002a'];
  }
  return needsHighRate
    ? ['avc1.42e020', 'avc1.420020', 'avc1.4d0020', 'avc1.42e02a', 'avc1.640020']
    : ['avc1.42e01f', 'avc1.42001f', 'avc1.4d001f', 'avc1.42e028', 'avc1.4d002a', 'avc1.64001f'];
}

function formatVideoCodecLabel(codec: string): string {
  const c = codec.toLowerCase();
  if (c.startsWith('avc') || c.includes('h264')) return 'H.264';
  if (c.startsWith('hevc') || c.startsWith('hvc') || c.includes('h265')) return 'H.265';
  if (c.startsWith('vp9') || c.startsWith('vp09')) return 'VP9';
  if (c.startsWith('vp8')) return 'VP8';
  if (c.startsWith('av1') || c.startsWith('av01')) return 'AV1';
  return codec.toUpperCase();
}

function formatAudioCodecLabel(codec: string | null): string | null {
  if (!codec) return null;
  const c = codec.toLowerCase();
  if (c.includes('aac') || c.includes('mp4a')) return 'AAC';
  if (c.includes('opus')) return 'Opus';
  if (c.includes('pcm')) return 'PCM';
  return codec.toUpperCase();
}

async function resolveWebCodecsProfileForFormat(
  format: VideoExportFormat,
  width: number,
  height: number,
  fps: number,
  bitrateBps: number,
): Promise<WebCodecsEncoderProfile | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }

  const meta = VIDEO_FORMAT_CATALOG[format];
  const attempts: Array<{
    bitrateMode: 'variable' | 'constant' | 'quantizer';
    latencyMode?: 'quality' | 'realtime';
    hardwareAcceleration: 'no-preference' | 'prefer-software';
  }> = [
    { bitrateMode: 'variable', latencyMode: 'realtime', hardwareAcceleration: 'no-preference' },
    { bitrateMode: 'constant', latencyMode: 'realtime', hardwareAcceleration: 'no-preference' },
    { bitrateMode: 'variable', hardwareAcceleration: 'no-preference' },
    { bitrateMode: 'variable', latencyMode: 'realtime', hardwareAcceleration: 'prefer-software' },
    { bitrateMode: 'constant', hardwareAcceleration: 'prefer-software' },
    { bitrateMode: 'quantizer', latencyMode: 'realtime', hardwareAcceleration: 'no-preference' },
    { bitrateMode: 'quantizer', hardwareAcceleration: 'prefer-software' },
  ];

  for (const codec of meta.preferredVideoCodecs) {
    const codecStrings: Array<string | undefined> =
      codec === 'avc'
        ? [...getH264CodecCandidates(width, height, fps, bitrateBps), undefined]
        : [undefined];

    for (const fullCodecString of codecStrings) {
      for (const attempt of attempts) {
        const quality =
          attempt.bitrateMode === 'quantizer'
            ? new Quality('high')
            : new Quality({
                bitrate: bitrateBps,
                bitrateMode: attempt.bitrateMode,
              });

        try {
          const supported = await canEncodeVideo(codec, {
            width,
            height,
            quality,
            frameRate: fps,
            hardwareAcceleration: attempt.hardwareAcceleration,
            ...(fullCodecString ? { fullCodecString } : {}),
            ...(attempt.latencyMode ? { latencyMode: attempt.latencyMode } : {}),
          });
          if (!supported) continue;

          return {
            codec,
            fullCodecString,
            quality,
            latencyMode: attempt.latencyMode,
            hardwareAcceleration: attempt.hardwareAcceleration,
          };
        } catch {
          // Try next profile combination
        }
      }
    }
  }

  return null;
}

export function pickMediaRecorderMp4MimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  const mp4Candidates = [
    'video/mp4;codecs=avc1.42e01f',
    'video/mp4;codecs=avc1.42001f',
    'video/mp4;codecs=avc1.4d002a',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];

  for (const mime of mp4Candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return null;
}

export interface MediaRecorderSelection {
  mimeType: string;
  actualFormat: VideoExportFormat;
  videoCodec: string;
  audioCodec: string | null;
  fallbackUsed: boolean;
}

export function pickMediaRecorderMimeType(
  requestedFormat: VideoExportFormat,
  includeAudio: boolean,
  allowCrossFormatRescue = true,
): MediaRecorderSelection | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  const mp4Candidates: Array<{ mime: string; v: string; a: string | null }> = includeAudio
    ? [
        { mime: 'video/mp4;codecs=avc1.42e01f,mp4a.40.2', v: 'H.264', a: 'AAC' },
        { mime: 'video/mp4;codecs=avc1,mp4a.40.2', v: 'H.264', a: 'AAC' },
        { mime: 'video/mp4;codecs=avc1.42e01f', v: 'H.264', a: null },
        { mime: 'video/mp4;codecs=avc1', v: 'H.264', a: null },
        { mime: 'video/mp4', v: 'H.264', a: null },
      ]
    : [
        { mime: 'video/mp4;codecs=avc1.42e01f', v: 'H.264', a: null },
        { mime: 'video/mp4;codecs=avc1.42001f', v: 'H.264', a: null },
        { mime: 'video/mp4;codecs=avc1.4d002a', v: 'H.264', a: null },
        { mime: 'video/mp4;codecs=avc1', v: 'H.264', a: null },
        { mime: 'video/mp4', v: 'H.264', a: null },
      ];

  const webmCandidates: Array<{ mime: string; v: string; a: string | null }> = includeAudio
    ? [
        { mime: 'video/webm;codecs=vp9,opus', v: 'VP9', a: 'Opus' },
        { mime: 'video/webm;codecs=vp8,opus', v: 'VP8', a: 'Opus' },
        { mime: 'video/webm;codecs=vp9', v: 'VP9', a: null },
        { mime: 'video/webm;codecs=vp8', v: 'VP8', a: null },
        { mime: 'video/webm', v: 'VP8/VP9', a: null },
      ]
    : [
        { mime: 'video/webm;codecs=vp9', v: 'VP9', a: null },
        { mime: 'video/webm;codecs=vp8', v: 'VP8', a: null },
        { mime: 'video/webm', v: 'VP8/VP9', a: null },
      ];

  const mkvCandidates: Array<{ mime: string; v: string; a: string | null }> = includeAudio
    ? [
        { mime: 'video/x-matroska;codecs=avc1,opus', v: 'H.264', a: 'Opus' },
        { mime: 'video/x-matroska;codecs=vp9,opus', v: 'VP9', a: 'Opus' },
        { mime: 'video/x-matroska', v: 'H.264/VP9', a: null },
      ]
    : [
        { mime: 'video/x-matroska;codecs=avc1', v: 'H.264', a: null },
        { mime: 'video/x-matroska;codecs=vp9', v: 'VP9', a: null },
        { mime: 'video/x-matroska', v: 'H.264/VP9', a: null },
      ];

  const tryList = (
    list: Array<{ mime: string; v: string; a: string | null }>,
    actualFormat: VideoExportFormat,
    fallbackUsed: boolean,
  ): MediaRecorderSelection | null => {
    for (const entry of list) {
      try {
        if (MediaRecorder.isTypeSupported(entry.mime)) {
          return {
            mimeType: entry.mime,
            actualFormat,
            videoCodec: entry.v,
            audioCodec: entry.a,
            fallbackUsed,
          };
        }
      } catch {
        // Ignore unsupported query errors
      }
    }
    return null;
  };

  if (requestedFormat === 'mp4') {
    const direct = tryList(mp4Candidates, 'mp4', false);
    if (direct) return direct;
  } else if (requestedFormat === 'webm') {
    const direct = tryList(webmCandidates, 'webm', false);
    if (direct) return direct;
  } else if (requestedFormat === 'mkv') {
    const direct = tryList(mkvCandidates, 'mkv', false);
    if (direct) return direct;
  }

  if (!allowCrossFormatRescue) {
    return null;
  }

  // Tier 3 Cross-Format Auto-Rescue: try WebM first, then MP4, then browser default
  const webmRescue = tryList(webmCandidates, 'webm', requestedFormat !== 'webm');
  if (webmRescue) return webmRescue;

  const mp4Rescue = tryList(mp4Candidates, 'mp4', requestedFormat !== 'mp4');
  if (mp4Rescue) return mp4Rescue;

  return {
    mimeType: '',
    actualFormat: 'webm',
    videoCodec: 'Browser Default',
    audioCodec: null,
    fallbackUsed: requestedFormat !== 'webm',
  };
}

function createMediabunnyFormat(
  format: VideoExportFormat,
  useStreaming: boolean,
): OutputFormat {
  if (format === 'webm') {
    return new WebMOutputFormat(
      useStreaming
        ? { appendOnly: true, minimumClusterDuration: 2 }
        : undefined,
    );
  }
  if (format === 'mkv') {
    return new MkvOutputFormat(
      useStreaming
        ? { appendOnly: true, minimumClusterDuration: 2 }
        : undefined,
    );
  }
  if (format === 'mov') {
    return new MovOutputFormat(
      useStreaming
        ? { fastStart: 'fragmented', minimumFragmentDuration: 2 }
        : { fastStart: 'in-memory' },
    );
  }
  return new Mp4OutputFormat(
    useStreaming
      ? { fastStart: 'fragmented', minimumFragmentDuration: 2 }
      : { fastStart: 'in-memory' },
  );
}

interface CaptureTrack extends MediaStreamTrack {
  requestFrame?: () => void;
}

export class Mp4CutsceneRecorder {
  public readonly width: number;
  public readonly height: number;
  public readonly aspectRatio: VideoAspectRatio;
  public readonly format: VideoExportFormat;
  public readonly requestedFormat: VideoExportFormat;
  public readonly fallbackUsed: boolean;
  public readonly fallbackReason: string | null;
  public readonly videoCodecLabel: string;
  public readonly audioCodecLabel: string | null;
  public readonly hasAudio: boolean;
  public readonly backend: VideoEncoderBackend;
  public readonly isStreamingFragmented: boolean;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: VideoExportOptions;
  private disposed = false;
  private submittedFrames = 0;
  private encodedPackets = 0;
  private streamedBytes = 0;
  private streamedParts: Uint8Array<ArrayBuffer>[] = [];

  // Primary: Mediabunny WebCodecs pipeline
  private output: Output<OutputFormat, BufferTarget | AppendOnlyStreamTarget> | null = null;
  private canvasSource: CanvasSource | null = null;
  private audioSource: AudioBufferSource | null = null;
  private pendingAudioBuffer: AudioBuffer | null = null;
  private audioAdded = false;

  // Fallback: MediaRecorder pipeline
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private videoTrack: CaptureTrack | null = null;
  private audioPlaybackCtx: AudioContext | null = null;
  private audioPlaybackNode: AudioBufferSourceNode | null = null;
  private chunks: BlobPart[] = [];
  private fallbackMimeType = 'video/webm';
  private fallbackError: string | null = null;
  private fallbackStopPromise: Promise<VideoRecordedResult> | null = null;

  private constructor(params: {
    width: number;
    height: number;
    aspectRatio: VideoAspectRatio;
    format: VideoExportFormat;
    requestedFormat: VideoExportFormat;
    fallbackUsed: boolean;
    fallbackReason: string | null;
    videoCodecLabel: string;
    audioCodecLabel: string | null;
    hasAudio: boolean;
    backend: VideoEncoderBackend;
    options: VideoExportOptions;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    isStreamingFragmented: boolean;
    audioBuffer: AudioBuffer | null;
  }) {
    this.width = params.width;
    this.height = params.height;
    this.aspectRatio = params.aspectRatio;
    this.format = params.format;
    this.requestedFormat = params.requestedFormat;
    this.fallbackUsed = params.fallbackUsed;
    this.fallbackReason = params.fallbackReason;
    this.videoCodecLabel = params.videoCodecLabel;
    this.audioCodecLabel = params.audioCodecLabel;
    this.hasAudio = params.hasAudio;
    this.backend = params.backend;
    this.options = params.options;
    this.canvas = params.canvas;
    this.ctx = params.ctx;
    this.isStreamingFragmented = params.isStreamingFragmented;
    this.pendingAudioBuffer = params.audioBuffer;
  }

  public getStreamedBytes(): number {
    return this.streamedBytes;
  }

  public static async create(
    sourceCanvas: HTMLCanvasElement,
    options: VideoExportOptions,
    estimatedDurationSec = 0,
    audioBuffer: AudioBuffer | null = null,
  ): Promise<Mp4CutsceneRecorder> {
    const requestedFormat: VideoExportFormat = options.format ?? 'mp4';
    const aspectRatio: VideoAspectRatio = options.aspectRatio ?? '16:9';
    const { width, height } = resolveExportDimensions(
      sourceCanvas,
      options.resolution,
      aspectRatio,
    );
    const bitrateBps = options.bitrateMbps * 1_000_000;
    const effectiveAudio = options.includeAudio ? audioBuffer : null;

    // For WebCodecs with audio attached, BufferTarget guarantees clean interleave
    // even when audio is trimmed on early stop; streaming mode engages for long video-only renders.
    const useStreaming =
      !effectiveAudio &&
      (typeof options.streamingMode === 'boolean'
        ? options.streamingMode
        : estimatedDurationSec > 45);

    const createHiddenCanvas = (): {
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
    } => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.position = 'fixed';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '4px';
      canvas.style.height = '4px';
      canvas.style.opacity = '0.01';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '-1';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d', {
        alpha: false,
        willReadFrequently: false,
      });
      if (!ctx) {
        canvas.remove();
        throw new Error('Could not initialize 2D compositing context for video export.');
      }
      return { canvas, ctx };
    };

    const tryInitWebCodecs = async (
      targetFormat: VideoExportFormat,
      isFallback: boolean,
      fallbackReason: string | null,
    ): Promise<Mp4CutsceneRecorder | null> => {
      const profile = await resolveWebCodecsProfileForFormat(
        targetFormat,
        width,
        height,
        options.fps,
        bitrateBps,
      );
      if (!profile) return null;

      let chosenAudioCodec: AudioCodec | null = null;
      if (effectiveAudio) {
        const preferredAudio = VIDEO_FORMAT_CATALOG[targetFormat].preferredAudioCodecs;
        try {
          chosenAudioCodec = await getFirstEncodableAudioCodec(preferredAudio, {
            numberOfChannels: effectiveAudio.numberOfChannels,
            sampleRate: effectiveAudio.sampleRate,
            bitrate: 128_000,
          });
        } catch {
          chosenAudioCodec = null;
        }
      }

      const { canvas, ctx } = createHiddenCanvas();
      const recorder = new Mp4CutsceneRecorder({
        width,
        height,
        aspectRatio,
        format: targetFormat,
        requestedFormat,
        fallbackUsed: isFallback,
        fallbackReason,
        videoCodecLabel: formatVideoCodecLabel(profile.codec),
        audioCodecLabel: formatAudioCodecLabel(chosenAudioCodec),
        hasAudio: Boolean(effectiveAudio && chosenAudioCodec),
        backend: 'webcodecs',
        options,
        canvas,
        ctx,
        isStreamingFragmented: useStreaming,
        audioBuffer: chosenAudioCodec ? effectiveAudio : null,
      });

      try {
        await recorder.initWebCodecsPipeline(profile, chosenAudioCodec);
        return recorder;
      } catch {
        recorder.detachCanvas();
        return null;
      }
    };

    // Tier 1: Try WebCodecs directly for the requested container
    const directWebCodecs = await tryInitWebCodecs(requestedFormat, false, null);
    if (directWebCodecs) {
      return directWebCodecs;
    }

    // Tier 2: Try native MediaRecorder for the requested container (without cross-format rescue yet)
    const directMediaRec = pickMediaRecorderMimeType(
      requestedFormat,
      Boolean(effectiveAudio),
      false,
    );
    if (
      directMediaRec &&
      typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined'
    ) {
      const { canvas, ctx } = createHiddenCanvas();
      if (typeof canvas.captureStream === 'function') {
        const recorder = new Mp4CutsceneRecorder({
          width,
          height,
          aspectRatio,
          format: directMediaRec.actualFormat,
          requestedFormat,
          fallbackUsed: false,
          fallbackReason: null,
          videoCodecLabel: directMediaRec.videoCodec,
          audioCodecLabel: effectiveAudio ? directMediaRec.audioCodec ?? 'Audio' : null,
          hasAudio: Boolean(effectiveAudio),
          backend: 'mediarecorder',
          options,
          canvas,
          ctx,
          isStreamingFragmented: false,
          audioBuffer: effectiveAudio,
        });
        try {
          recorder.initMediaRecorderFallback(directMediaRec.mimeType, bitrateBps, effectiveAudio);
          return recorder;
        } catch {
          recorder.cleanupAudioPlayback();
          recorder.cleanupStream();
          recorder.detachCanvas();
        }
      } else {
        canvas.remove();
      }
    }

    // Tier 3A: Cross-Format Auto-Rescue via WebCodecs (try WebM or MP4)
    const rescueOrder: VideoExportFormat[] = (['webm', 'mp4', 'mkv'] as VideoExportFormat[]).filter(
      (f) => f !== requestedFormat,
    );
    for (const rescueFmt of rescueOrder) {
      const reason = `This browser does not natively encode ${requestedFormat.toUpperCase()} here; automatically exported as ${rescueFmt.toUpperCase()}.`;
      const rescuedWebCodecs = await tryInitWebCodecs(rescueFmt, true, reason);
      if (rescuedWebCodecs) {
        return rescuedWebCodecs;
      }
    }

    // Tier 3B: Cross-Format Auto-Rescue via MediaRecorder (WebM / MP4 / browser default)
    const rescueMediaRec = pickMediaRecorderMimeType(
      requestedFormat,
      Boolean(effectiveAudio),
      true,
    );
    if (rescueMediaRec && typeof MediaRecorder !== 'undefined') {
      const { canvas, ctx } = createHiddenCanvas();
      if (typeof canvas.captureStream === 'function') {
        const reason = rescueMediaRec.fallbackUsed
          ? `This browser does not natively encode ${requestedFormat.toUpperCase()} here; automatically exported as ${rescueMediaRec.actualFormat.toUpperCase()}.`
          : null;
        const recorder = new Mp4CutsceneRecorder({
          width,
          height,
          aspectRatio,
          format: rescueMediaRec.actualFormat,
          requestedFormat,
          fallbackUsed: rescueMediaRec.fallbackUsed,
          fallbackReason: reason,
          videoCodecLabel: rescueMediaRec.videoCodec,
          audioCodecLabel: effectiveAudio ? rescueMediaRec.audioCodec ?? 'Audio' : null,
          hasAudio: Boolean(effectiveAudio),
          backend: 'mediarecorder',
          options,
          canvas,
          ctx,
          isStreamingFragmented: false,
          audioBuffer: effectiveAudio,
        });
        try {
          recorder.initMediaRecorderFallback(rescueMediaRec.mimeType, bitrateBps, effectiveAudio);
          return recorder;
        } catch {
          recorder.cleanupAudioPlayback();
          recorder.cleanupStream();
          recorder.detachCanvas();
        }
      } else {
        canvas.remove();
      }
    }

    throw new Error(
      'Video recording is unavailable in this browser environment. Try Snapshot PNG or open in Chrome, Edge, Firefox, or Safari.',
    );
  }

  private async initWebCodecsPipeline(
    profile: WebCodecsEncoderProfile,
    audioCodec: AudioCodec | null,
  ) {
    this.streamedBytes = 0;
    this.streamedParts = [];

    const format = createMediabunnyFormat(this.format, this.isStreamingFragmented);

    if (this.isStreamingFragmented) {
      const writable = new WritableStream<Uint8Array>({
        write: (chunk) => {
          if (this.disposed || chunk.byteLength === 0) return;
          const copy = new Uint8Array(new ArrayBuffer(chunk.byteLength));
          copy.set(chunk);
          this.streamedParts.push(copy);
          this.streamedBytes += copy.byteLength;
        },
      });
      const target = new AppendOnlyStreamTarget(writable);
      this.output = new Output({ format, target });
    } else {
      const target = new BufferTarget();
      this.output = new Output({ format, target });
    }

    this.canvasSource = new CanvasSource(this.canvas, {
      codec: profile.codec,
      quality: profile.quality,
      keyFrameInterval: 2,
      hardwareAcceleration: profile.hardwareAcceleration,
      ...(profile.fullCodecString ? { fullCodecString: profile.fullCodecString } : {}),
      ...(profile.latencyMode ? { latencyMode: profile.latencyMode } : {}),
      onEncodedPacket: () => {
        this.encodedPackets++;
      },
    });

    this.output.addVideoTrack(this.canvasSource, {
      frameRate: this.options.fps,
    });

    if (this.pendingAudioBuffer && audioCodec) {
      const isPcm = audioCodec.startsWith('pcm');
      this.audioSource = new AudioBufferSource(
        isPcm
          ? { codec: audioCodec }
          : { codec: audioCodec, quality: new Quality({ bitrate: 128_000 }) },
      );
      this.output.addAudioTrack(this.audioSource);
    }

    await this.output.start();
  }

  private initMediaRecorderFallback(
    mimeType: string,
    bitrateBps: number,
    audioBuffer: AudioBuffer | null,
  ) {
    const defaultMime = VIDEO_FORMAT_CATALOG[this.format].mimeType;
    this.fallbackMimeType = mimeType || defaultMime;

    // Paint initial frame so captureStream initializes with valid dimensions immediately
    this.ctx.fillStyle = '#14161a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const videoStream = this.canvas.captureStream(this.options.fps);
    this.videoTrack = (videoStream.getVideoTracks()[0] as CaptureTrack) ?? null;

    const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

    // Route offline-synthesized audio into a MediaStreamAudioDestinationNode (silent to speakers)
    if (audioBuffer && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          const dest = ctx.createMediaStreamDestination();
          const src = ctx.createBufferSource();
          src.buffer = audioBuffer;
          src.connect(dest);
          src.start(0);
          this.audioPlaybackCtx = ctx;
          this.audioPlaybackNode = src;
          combinedTracks.push(...dest.stream.getAudioTracks());
        } catch {
          // Proceed video-only if AudioContext is restricted
        }
      }
    }

    this.stream = new MediaStream(combinedTracks);

    const recOpts: MediaRecorderOptions = {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: bitrateBps,
    };

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, recOpts);
    } catch {
      try {
        this.mediaRecorder = mimeType
          ? new MediaRecorder(this.stream, { mimeType })
          : new MediaRecorder(this.stream);
      } catch {
        this.mediaRecorder = new MediaRecorder(this.stream);
      }
    }

    const actualMime = (
      this.mediaRecorder.mimeType ||
      this.fallbackMimeType ||
      defaultMime
    ).toLowerCase();

    const actualExt: VideoExportFormat = actualMime.includes('mp4')
      ? 'mp4'
      : actualMime.includes('matroska') || actualMime.includes('mkv')
        ? 'mkv'
        : actualMime.includes('quicktime')
          ? 'mov'
          : 'webm';

    this.chunks = [];
    this.fallbackError = null;

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
        this.streamedBytes += e.data.size;
      }
    };

    this.mediaRecorder.onerror = () => {
      this.fallbackError = 'Browser MediaRecorder encountered an encoding error.';
    };

    this.fallbackStopPromise = new Promise<VideoRecordedResult>(
      (resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new Error('MediaRecorder failed to initialize.'));
          return;
        }
        this.mediaRecorder.onstop = () => {
          this.cleanupAudioPlayback();
          this.cleanupStream();
          this.detachCanvas();
          if (this.disposed) {
            this.chunks = [];
            reject(new Error('Recording cancelled.'));
            return;
          }
          if (this.fallbackError) {
            this.chunks = [];
            reject(new Error(this.fallbackError));
            return;
          }
          const finalType =
            this.mediaRecorder?.mimeType || this.fallbackMimeType || defaultMime;
          const blob = new Blob(this.chunks, {
            type: finalType || VIDEO_FORMAT_CATALOG[actualExt].mimeType,
          });
          this.chunks = [];
          if (blob.size === 0) {
            reject(
              new Error(
                'Video recorder produced an empty clip. Please export at least 0.5 seconds.',
              ),
            );
            return;
          }
          const usedFallback =
            this.fallbackUsed || actualExt !== this.requestedFormat;
          const fallbackNote =
            this.fallbackReason ??
            (usedFallback
              ? `This browser recorded ${actualExt.toUpperCase()} instead of ${this.requestedFormat.toUpperCase()}.`
              : null);
          resolve({
            blobUrl: URL.createObjectURL(blob),
            mimeType: finalType || VIDEO_FORMAT_CATALOG[actualExt].mimeType,
            fileExtension: actualExt,
            format: actualExt,
            requestedFormat: this.requestedFormat,
            fallbackUsed: usedFallback,
            fallbackReason: fallbackNote,
            videoCodec: this.videoCodecLabel,
            audioCodec: this.hasAudio ? this.audioCodecLabel : null,
            hasAudio: this.hasAudio,
            width: this.width,
            height: this.height,
            aspectRatio: this.aspectRatio,
            fileSizeBytes: blob.size,
            encoderBackend: 'mediarecorder',
          });
        };
      },
    );

    // Use 250ms timeslice so chunks flush continuously and never finish empty
    this.mediaRecorder.start(250);
  }

  private drawSource(webglCanvas: HTMLCanvasElement) {
    const gl = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl');
    gl?.flush?.();

    const w = this.width;
    const h = this.height;
    const ctx = this.ctx;
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, w, h);

    const sw = Math.max(1, webglCanvas.width || w);
    const sh = Math.max(1, webglCanvas.height || h);
    if (sw === w && sh === h) {
      ctx.drawImage(webglCanvas, 0, 0, w, h);
      return;
    }

    const scale = Math.min(w / sw, h / sh);
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    const dx = Math.round((w - dw) / 2);
    const dy = Math.round((h - dh) / 2);
    ctx.drawImage(webglCanvas, dx, dy, dw, dh);
  }

  private compositeToCanvas(
    webglCanvas: HTMLCanvasElement,
    subtitle: SubtitleCue | null,
    screenBlackout = 0,
    sceneTimeSec = 0,
    captionSettings?: CaptionSettings,
    overrideDurationSec?: number,
  ) {
    const w = this.width;
    const h = this.height;
    const ctx = this.ctx;

    this.drawSource(webglCanvas);

    // Optional smash-cut or fade to black overlay underneath letterbox & subtitles
    if (screenBlackout > 0.001) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(1, screenBlackout))})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Optional cinema letterbox bars (scaled proportionally for 16:9, 9:16, 1:1)
    const barRatio = this.aspectRatio === '9:16' ? 0.04 : 0.055;
    const barH = this.options.burnLetterbox ? Math.round(h * barRatio) : 0;
    if (barH > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
    }

    // Optional burned-in sudden-appearing word-pop (or classic) captions
    if (this.options.burnSubtitles && subtitle && subtitle.text) {
      drawWordPopCaptionOnCanvas(
        ctx,
        w,
        h,
        barH,
        this.aspectRatio,
        subtitle,
        sceneTimeSec,
        captionSettings,
        overrideDurationSec,
      );
    }
  }

  public async addFrame(
    webglCanvas: HTMLCanvasElement,
    subtitle: SubtitleCue | null,
    timestampSec: number,
    frameDurationSec: number,
    isKeyFrame: boolean,
    screenBlackout = 0,
    sceneTimeSec?: number,
    captionSettings?: CaptionSettings,
    overrideDurationSec?: number,
  ): Promise<void> {
    if (this.disposed) return;

    this.compositeToCanvas(
      webglCanvas,
      subtitle,
      screenBlackout,
      sceneTimeSec ?? timestampSec,
      captionSettings,
      overrideDurationSec,
    );
    this.submittedFrames++;

    if (this.backend === 'webcodecs' && this.canvasSource) {
      await this.canvasSource.add(
        timestampSec,
        frameDurationSec,
        isKeyFrame ? { keyFrame: true } : undefined,
      );
      return;
    }

    // Fallback MediaRecorder paced frame push on attached canvas
    if (this.fallbackError) {
      throw new Error(this.fallbackError);
    }
    this.videoTrack?.requestFrame?.();
    const frameMs = Math.max(16, Math.round(frameDurationSec * 1000));
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, frameMs);
    });
  }

  public async finalize(recordedDurationSec?: number): Promise<VideoRecordedResult> {
    if (this.backend === 'webcodecs' && this.output) {
      try {
        // Encode and attach offline-rendered audio track (trimmed cleanly if user stopped early)
        if (this.audioSource && this.pendingAudioBuffer && !this.audioAdded) {
          this.audioAdded = true;
          const trimmed =
            typeof recordedDurationSec === 'number' && recordedDurationSec > 0
              ? trimAudioBuffer(this.pendingAudioBuffer, recordedDurationSec)
              : this.pendingAudioBuffer;
          await this.audioSource.add(trimmed);
          this.audioSource.close();
        } else if (this.audioSource) {
          this.audioSource.close();
        }

        this.canvasSource?.close();
        await this.output.finalize();

        if (this.submittedFrames > 1 && this.encodedPackets < 1) {
          throw new Error(
            `${this.format.toUpperCase()} encoder stalled. Try switching format to WebM or lowering resolution.`,
          );
        }

        const defaultMime = VIDEO_FORMAT_CATALOG[this.format].mimeType;
        const mimeType = await this.output
          .getMimeType()
          .catch(() => defaultMime);

        let blob: Blob;
        if (this.isStreamingFragmented) {
          if (this.streamedParts.length === 0 || this.streamedBytes === 0) {
            throw new Error(`Streaming ${this.format.toUpperCase()} muxer produced zero bytes.`);
          }
          blob = new Blob(this.streamedParts, { type: defaultMime });
          this.streamedParts = [];
        } else {
          const target = this.output.target as BufferTarget;
          const buffer = target.buffer;
          if (!buffer || buffer.byteLength === 0) {
            throw new Error(`${this.format.toUpperCase()} muxer produced an empty buffer.`);
          }
          blob = new Blob([buffer], { type: defaultMime });
        }

        return {
          blobUrl: URL.createObjectURL(blob),
          mimeType: mimeType || defaultMime,
          fileExtension: this.format,
          format: this.format,
          requestedFormat: this.requestedFormat,
          fallbackUsed: this.fallbackUsed,
          fallbackReason: this.fallbackReason,
          videoCodec: this.videoCodecLabel,
          audioCodec: this.hasAudio ? this.audioCodecLabel : null,
          hasAudio: this.hasAudio,
          width: this.width,
          height: this.height,
          aspectRatio: this.aspectRatio,
          fileSizeBytes: blob.size,
          encoderBackend: 'webcodecs',
          isFragmentedStream: this.isStreamingFragmented,
        };
      } finally {
        this.streamedParts = [];
        this.pendingAudioBuffer = null;
        this.detachCanvas();
      }
    }

    if (this.mediaRecorder && this.fallbackStopPromise) {
      this.cleanupAudioPlayback();
      if (this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.requestData();
        } catch {
          // Ignore if requestData is unsupported
        }
        this.mediaRecorder.stop();
      }
      return this.fallbackStopPromise;
    }

    this.detachCanvas();
    throw new Error('Recorder is not active.');
  }

  public async cancel(): Promise<void> {
    this.disposed = true;
    this.streamedParts = [];
    this.pendingAudioBuffer = null;
    if (this.backend === 'webcodecs' && this.output) {
      try {
        this.audioSource?.close();
        this.canvasSource?.close();
        if (
          this.output.state === 'started' ||
          this.output.state === 'pending'
        ) {
          await this.output.cancel();
        }
      } catch {
        // Ignore cleanup errors on cancellation
      }
      this.output = null;
      this.canvasSource = null;
      this.audioSource = null;
      this.detachCanvas();
      return;
    }

    this.cleanupAudioPlayback();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore stop errors on cancellation
      }
    }
    this.cleanupStream();
    this.detachCanvas();
    this.chunks = [];
  }

  private cleanupAudioPlayback() {
    if (this.audioPlaybackNode) {
      try {
        this.audioPlaybackNode.stop();
      } catch {
        // Ignore already stopped source
      }
      this.audioPlaybackNode = null;
    }
    if (this.audioPlaybackCtx) {
      void this.audioPlaybackCtx.close().catch(() => {});
      this.audioPlaybackCtx = null;
    }
  }

  private cleanupStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.videoTrack = null;
  }

  private detachCanvas() {
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
