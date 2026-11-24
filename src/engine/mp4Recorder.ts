import {
  AppendOnlyStreamTarget,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeVideo,
} from 'mediabunny';
import {
  VideoEncoderBackend,
  VideoExportOptions,
  VideoResolution,
} from './types';

export interface VideoRecordedResult {
  blobUrl: string;
  mimeType: string;
  fileExtension: 'mp4';
  fileSizeBytes: number;
  encoderBackend: VideoEncoderBackend;
  isFragmentedStream?: boolean;
}

export interface ExportDimensions {
  width: number;
  height: number;
}

interface WebCodecsEncoderProfile {
  fullCodecString: string;
  quality: Quality;
  latencyMode?: 'quality' | 'realtime';
  hardwareAcceleration: 'no-preference' | 'prefer-software';
}

export function resolveExportDimensions(
  sourceCanvas: HTMLCanvasElement,
  resolution: VideoResolution,
): ExportDimensions {
  if (resolution === '720p') {
    return { width: 1280, height: 720 };
  }
  if (resolution === '1080p') {
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
  // Align native dimensions to 16px macroblocks for H.264 / hardware encoders
  return {
    width: Math.max(64, Math.round(srcW / 16) * 16),
    height: Math.max(64, Math.round(srcH / 16) * 16),
  };
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

async function smokeTestVideoEncoder(
  codecString: string,
  width: number,
  height: number,
  fps: number,
  bitrateBps: number,
  bitrateMode: 'variable' | 'constant' | 'quantizer',
  latencyMode: 'quality' | 'realtime' | undefined,
  hardwareAcceleration: 'no-preference' | 'prefer-software',
): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return false;
  }

  let chunkCount = 0;
  let hasDescription = false;
  let errored = false;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (chunk.byteLength > 0) {
        chunkCount++;
      }
      if (meta?.decoderConfig?.description && meta.decoderConfig.description.byteLength > 0) {
        hasDescription = true;
      }
    },
    error: () => {
      errored = true;
    },
  });

  try {
    const config: VideoEncoderConfig = {
      codec: codecString,
      width,
      height,
      framerate: fps,
      hardwareAcceleration,
      avc: { format: 'avc' },
      ...(latencyMode ? { latencyMode } : {}),
      ...(bitrateMode === 'quantizer'
        ? { bitrateMode: 'quantizer' }
        : { bitrate: bitrateBps, bitrateMode }),
    };

    const support = await VideoEncoder.isConfigSupported(config);
    if (!support.supported) {
      return false;
    }

    encoder.configure(config);

    // Encode 2 small frames at target dimensions to verify real chunk emission + SPS/PPS header
    const frameDurUs = Math.max(1, Math.round(1_000_000 / fps));
    const buffer = new Uint8Array(width * height * 4);
    buffer.fill(48);
    const frame0 = new VideoFrame(buffer, {
      format: 'RGBA',
      codedWidth: width,
      codedHeight: height,
      timestamp: 0,
      duration: frameDurUs,
    });
    const quantizerOpt =
      bitrateMode === 'quantizer' ? ({ avc: { quantizer: 22 } } as VideoEncoderEncodeOptions) : {};
    encoder.encode(frame0, { keyFrame: true, ...quantizerOpt });
    frame0.close();

    buffer.fill(180);
    const frame1 = new VideoFrame(buffer, {
      format: 'RGBA',
      codedWidth: width,
      codedHeight: height,
      timestamp: frameDurUs,
      duration: frameDurUs,
    });
    encoder.encode(frame1, { keyFrame: false, ...quantizerOpt });
    frame1.close();

    await encoder.flush();
    return !errored && chunkCount >= 2 && hasDescription;
  } catch {
    return false;
  } finally {
    if (encoder.state !== 'closed') {
      try {
        encoder.close();
      } catch {
        // Ignore close errors during probing
      }
    }
  }
}

async function resolveWebCodecsH264Profile(
  width: number,
  height: number,
  fps: number,
  bitrateBps: number,
): Promise<WebCodecsEncoderProfile | null> {
  if (typeof VideoEncoder === 'undefined') {
    return null;
  }

  const codecCandidates = getH264CodecCandidates(width, height, fps, bitrateBps);
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

  for (const codecStr of codecCandidates) {
    for (const attempt of attempts) {
      const quality =
        attempt.bitrateMode === 'quantizer'
          ? new Quality('high')
          : new Quality({
              bitrate: bitrateBps,
              bitrateMode: attempt.bitrateMode,
            });

      try {
        const supportedByMediabunny = await canEncodeVideo('avc', {
          width,
          height,
          quality,
          frameRate: fps,
          fullCodecString: codecStr,
          hardwareAcceleration: attempt.hardwareAcceleration,
          ...(attempt.latencyMode ? { latencyMode: attempt.latencyMode } : {}),
        });
        if (!supportedByMediabunny) {
          continue;
        }

        const verified = await smokeTestVideoEncoder(
          codecStr,
          width,
          height,
          fps,
          bitrateBps,
          attempt.bitrateMode,
          attempt.latencyMode,
          attempt.hardwareAcceleration,
        );
        if (verified) {
          return {
            fullCodecString: codecStr,
            quality,
            latencyMode: attempt.latencyMode,
            hardwareAcceleration: attempt.hardwareAcceleration,
          };
        }
      } catch {
        // Try next profile/option combination
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

interface CaptureTrack extends MediaStreamTrack {
  requestFrame?: () => void;
}

export class Mp4CutsceneRecorder {
  public readonly width: number;
  public readonly height: number;
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
  private output: Output<Mp4OutputFormat, BufferTarget | AppendOnlyStreamTarget> | null = null;
  private canvasSource: CanvasSource | null = null;

  // Fallback: MediaRecorder MP4-only pipeline
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private videoTrack: CaptureTrack | null = null;
  private chunks: BlobPart[] = [];
  private fallbackMimeType = 'video/mp4';
  private fallbackError: string | null = null;
  private fallbackStopPromise: Promise<VideoRecordedResult> | null = null;

  private constructor(
    width: number,
    height: number,
    backend: VideoEncoderBackend,
    options: VideoExportOptions,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    isStreamingFragmented: boolean,
  ) {
    this.width = width;
    this.height = height;
    this.backend = backend;
    this.options = options;
    this.canvas = canvas;
    this.ctx = ctx;
    this.isStreamingFragmented = isStreamingFragmented;
  }

  public getStreamedBytes(): number {
    return this.streamedBytes;
  }

  public static async create(
    sourceCanvas: HTMLCanvasElement,
    options: VideoExportOptions,
    estimatedDurationSec = 0,
  ): Promise<Mp4CutsceneRecorder> {
    const { width, height } = resolveExportDimensions(
      sourceCanvas,
      options.resolution,
    );
    const bitrateBps = options.bitrateMbps * 1_000_000;
    const useStreaming =
      typeof options.streamingMode === 'boolean'
        ? options.streamingMode
        : estimatedDurationSec > 45;

    // Attach hidden compositing canvas inside viewport bounds so Chromium compositor & captureStream never occlude updates
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '2px';
    canvas.style.height = '2px';
    canvas.style.opacity = '0.001';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    if (!ctx) {
      canvas.remove();
      throw new Error('Could not initialize 2D compositing context for MP4 export.');
    }

    const profile = await resolveWebCodecsH264Profile(
      width,
      height,
      options.fps,
      bitrateBps,
    );

    if (profile) {
      const recorder = new Mp4CutsceneRecorder(
        width,
        height,
        'webcodecs',
        options,
        canvas,
        ctx,
        useStreaming,
      );
      try {
        await recorder.initWebCodecsPipeline(profile);
        return recorder;
      } catch (err) {
        recorder.detachCanvas();
        throw err;
      }
    }

    const mp4Mime = pickMediaRecorderMp4MimeType();
    if (
      !mp4Mime ||
      typeof MediaRecorder === 'undefined' ||
      typeof canvas.captureStream !== 'function'
    ) {
      canvas.remove();
      throw new Error(
        'MP4 (H.264) encoding is not supported in this browser. Please use Chrome, Edge, or Safari with WebCodecs H.264 or MP4 MediaRecorder support.',
      );
    }

    const recorder = new Mp4CutsceneRecorder(
      width,
      height,
      'mediarecorder',
      options,
      canvas,
      ctx,
      false,
    );
    try {
      recorder.initMediaRecorderMp4Fallback(mp4Mime, bitrateBps);
      return recorder;
    } catch (err) {
      recorder.detachCanvas();
      throw err;
    }
  }

  private async initWebCodecsPipeline(profile: WebCodecsEncoderProfile) {
    this.streamedBytes = 0;
    this.streamedParts = [];

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
      const format = new Mp4OutputFormat({
        fastStart: 'fragmented',
        minimumFragmentDuration: 2,
      });
      this.output = new Output({ format, target });
    } else {
      const target = new BufferTarget();
      const format = new Mp4OutputFormat({ fastStart: 'in-memory' });
      this.output = new Output({ format, target });
    }

    this.canvasSource = new CanvasSource(this.canvas, {
      codec: 'avc',
      quality: profile.quality,
      keyFrameInterval: 2,
      fullCodecString: profile.fullCodecString,
      hardwareAcceleration: profile.hardwareAcceleration,
      ...(profile.latencyMode ? { latencyMode: profile.latencyMode } : {}),
      onEncodedPacket: () => {
        this.encodedPackets++;
      },
    });

    this.output.addVideoTrack(this.canvasSource, {
      frameRate: this.options.fps,
    });

    await this.output.start();
  }

  private initMediaRecorderMp4Fallback(mp4Mime: string, bitrateBps: number) {
    this.fallbackMimeType = mp4Mime;
    this.stream = this.canvas.captureStream(this.options.fps);
    this.videoTrack = (this.stream.getVideoTracks()[0] as CaptureTrack) ?? null;

    const recOpts: MediaRecorderOptions = {
      mimeType: mp4Mime,
      videoBitsPerSecond: bitrateBps,
    };

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, recOpts);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: mp4Mime });
    }

    const actualMime = (this.mediaRecorder.mimeType || mp4Mime).toLowerCase();
    if (actualMime.includes('webm')) {
      throw new Error(
        'Browser MediaRecorder does not support MP4 output. Please use a browser with WebCodecs H.264 support.',
      );
    }

    this.chunks = [];
    this.fallbackError = null;

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onerror = () => {
      this.fallbackError = 'MediaRecorder encountered an MP4 encoding error.';
    };

    this.fallbackStopPromise = new Promise<VideoRecordedResult>(
      (resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new Error('MediaRecorder failed to initialize.'));
          return;
        }
        this.mediaRecorder.onstop = () => {
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
            this.mediaRecorder?.mimeType || this.fallbackMimeType;
          if (finalType.toLowerCase().includes('webm')) {
            this.chunks = [];
            reject(new Error('Non-MP4 output rejected.'));
            return;
          }
          const blob = new Blob(this.chunks, { type: 'video/mp4' });
          this.chunks = [];
          if (blob.size === 0) {
            reject(
              new Error(
                'MP4 encoder produced an empty clip. Please export at least 1 second.',
              ),
            );
            return;
          }
          resolve({
            blobUrl: URL.createObjectURL(blob),
            mimeType: finalType || 'video/mp4',
            fileExtension: 'mp4',
            fileSizeBytes: blob.size,
            encoderBackend: 'mediarecorder',
          });
        };
      },
    );

    // Start without timeslice so the browser emits a complete single-moov MP4 on stop()
    this.mediaRecorder.start();
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
    subtitle: { speaker: string | null; text: string; role?: 'dialogue' | 'voiceover' } | null,
    screenBlackout = 0,
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

    // Optional cinema letterbox bars
    const barH = this.options.burnLetterbox ? Math.round(h * 0.055) : 0;
    if (barH > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
    }

    // Optional burned-in cutscene subtitles
    if (this.options.burnSubtitles && subtitle && subtitle.text) {
      const isVoiceover = subtitle.role === 'voiceover';
      const fontSize = Math.max(16, Math.round(h * 0.026));
      ctx.font = `${isVoiceover ? 'italic ' : ''}600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      const speakerPrefix = subtitle.speaker ? `${subtitle.speaker}: ` : '';
      const fullText = `${speakerPrefix}${subtitle.text}`;

      const maxBoxW = Math.min(w * 0.84, Math.round(h * 1.15));
      const lines = wrapText(ctx, fullText, maxBoxW - 44);
      const lineHeight = Math.round(fontSize * 1.38);
      const boxH = lines.length * lineHeight + 22;
      const boxW = Math.min(
        maxBoxW,
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + 48,
      );
      const boxX = Math.round((w - boxW) / 2);
      const boxY = Math.round(h - barH - boxH - Math.max(18, h * 0.03));

      ctx.fillStyle = 'rgba(20, 22, 26, 0.9)';
      roundRect(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.fill();

      ctx.strokeStyle = isVoiceover ? 'rgba(251, 191, 36, 0.45)' : 'rgba(57, 61, 71, 0.95)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.stroke();

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      lines.forEach((line, idx) => {
        const cy = boxY + 11 + lineHeight * (idx + 0.5);
        if (idx === 0 && speakerPrefix && line.startsWith(speakerPrefix)) {
          const rest = line.slice(speakerPrefix.length);
          const prefixW = ctx.measureText(speakerPrefix).width;
          const restW = ctx.measureText(rest).width;
          const totalW = prefixW + restW;
          const startX = w / 2 - totalW / 2;

          ctx.textAlign = 'left';
          ctx.fillStyle = isVoiceover ? '#fbbf24' : '#00a2ff';
          ctx.fillText(speakerPrefix, startX, cy);
          ctx.fillStyle = isVoiceover ? '#fef3c7' : '#f1f5f9';
          ctx.fillText(rest, startX + prefixW, cy);
          ctx.textAlign = 'center';
        } else {
          ctx.fillStyle = isVoiceover ? '#fef3c7' : '#f1f5f9';
          ctx.fillText(line, w / 2, cy);
        }
      });
    }
  }

  public async addFrame(
    webglCanvas: HTMLCanvasElement,
    subtitle: { speaker: string | null; text: string; role?: 'dialogue' | 'voiceover' } | null,
    timestampSec: number,
    frameDurationSec: number,
    isKeyFrame: boolean,
    screenBlackout = 0,
  ): Promise<void> {
    if (this.disposed) return;

    this.compositeToCanvas(webglCanvas, subtitle, screenBlackout);
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
    this.ctx.getImageData(0, 0, 1, 1);
    this.videoTrack?.requestFrame?.();
    const frameMs = Math.max(16, Math.round(frameDurationSec * 1000));
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, frameMs);
      });
    });
  }

  public async finalize(): Promise<VideoRecordedResult> {
    if (this.backend === 'webcodecs' && this.output) {
      try {
        this.canvasSource?.close();
        await this.output.finalize();

        if (this.submittedFrames > 1 && this.encodedPackets < 2) {
          throw new Error(
            'H.264 encoder stalled after the first frame. Try lowering resolution or quality and export again.',
          );
        }

        const mimeType = await this.output
          .getMimeType()
          .catch(() => 'video/mp4');

        let blob: Blob;
        if (this.isStreamingFragmented) {
          if (this.streamedParts.length === 0 || this.streamedBytes === 0) {
            throw new Error('Streaming fMP4 muxer produced zero bytes.');
          }
          blob = new Blob(this.streamedParts, { type: 'video/mp4' });
          this.streamedParts = [];
        } else {
          const target = this.output.target as BufferTarget;
          const buffer = target.buffer;
          if (!buffer || buffer.byteLength === 0) {
            throw new Error('MP4 muxer produced an empty buffer.');
          }
          blob = new Blob([buffer], { type: 'video/mp4' });
        }

        return {
          blobUrl: URL.createObjectURL(blob),
          mimeType: mimeType || 'video/mp4',
          fileExtension: 'mp4',
          fileSizeBytes: blob.size,
          encoderBackend: 'webcodecs',
          isFragmentedStream: this.isStreamingFragmented,
        };
      } finally {
        this.streamedParts = [];
        this.detachCanvas();
      }
    }

    if (this.mediaRecorder && this.fallbackStopPromise) {
      if (this.mediaRecorder.state !== 'inactive') {
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
    if (this.backend === 'webcodecs' && this.output) {
      try {
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
      this.detachCanvas();
      return;
    }

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
