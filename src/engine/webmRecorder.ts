import { WebmExportOptions } from './types';

export interface WebmRecordedResult {
  blobUrl: string;
  mimeType: string;
  fileSizeBytes: number;
}

export function pickSupportedWebmMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  const candidates = [
    'video/webm',
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'video/webm';
}

interface CaptureTrack extends MediaStreamTrack {
  requestFrame?: () => void;
}

export class WebmCutsceneRecorder {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private options: WebmExportOptions;
  private mimeType: string;
  private cancelled = false;
  private stream: MediaStream | null = null;
  private videoTrack: CaptureTrack | null = null;

  constructor(
    sourceCanvas: HTMLCanvasElement,
    options: WebmExportOptions,
    onComplete: (result: WebmRecordedResult) => void,
    onError: (msg: string) => void,
  ) {
    this.options = options;
    this.mimeType = pickSupportedWebmMimeType();

    const srcW = Math.max(16, sourceCanvas.width || sourceCanvas.clientWidth || 1280);
    const srcH = Math.max(16, sourceCanvas.height || sourceCanvas.clientHeight || 720);

    let outW: number;
    let outH: number;
    if (options.resolution === '720p') {
      outW = 1280;
      outH = 720;
    } else if (options.resolution === '1080p') {
      outW = 1920;
      outH = 1080;
    } else {
      // Align native dimensions to 16px macroblocks for WebM encoders
      outW = Math.max(64, Math.round(srcW / 16) * 16);
      outH = Math.max(64, Math.round(srcH / 16) * 16);
    }

    this.canvas = document.createElement('canvas');
    this.canvas.width = outW;
    this.canvas.height = outH;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not initialize 2D compositing context for WebM export.');
    }
    this.ctx = ctx;

    // Pre-paint initial frame before captureStream attaches to the backing store
    this.drawSourceContained(sourceCanvas);

    if (typeof MediaRecorder === 'undefined' || !this.canvas.captureStream) {
      throw new Error('WebM recording is not supported in this browser.');
    }

    this.stream = this.canvas.captureStream(0);
    this.videoTrack = (this.stream.getVideoTracks()[0] as CaptureTrack) ?? null;
    const recOpts: MediaRecorderOptions = {
      mimeType: this.mimeType,
    };
    if (options.bitrateMbps !== 8) {
      recOpts.videoBitsPerSecond = options.bitrateMbps * 1_000_000;
    }
    this.recorder = new MediaRecorder(this.stream, recOpts);

    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.recorder.onerror = () => {
      this.cleanupStream();
      onError('MediaRecorder encountered an encoding error.');
    };

    this.recorder.onstop = () => {
      this.cleanupStream();
      if (this.cancelled) {
        this.chunks = [];
        return;
      }
      const blob = new Blob(this.chunks, { type: this.mimeType });
      this.chunks = [];
      if (blob.size === 0) {
        onError('WebM encoder produced an empty clip. Please record for at least 1 second.');
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      onComplete({
        blobUrl,
        mimeType: this.mimeType,
        fileSizeBytes: blob.size,
      });
    };
  }

  public start() {
    this.cancelled = false;
    this.chunks = [];
    this.recorder?.start(250);
    this.videoTrack?.requestFrame?.();
  }

  private drawSourceContained(webglCanvas: HTMLCanvasElement) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, w, h);

    const sw = Math.max(1, webglCanvas.width || w);
    const sh = Math.max(1, webglCanvas.height || h);
    const scale = Math.min(w / sw, h / sh);
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    const dx = Math.round((w - dw) / 2);
    const dy = Math.round((h - dh) / 2);
    ctx.drawImage(webglCanvas, dx, dy, dw, dh);
  }

  public compositeFrame(
    webglCanvas: HTMLCanvasElement,
    subtitle: { speaker: string | null; text: string } | null,
  ) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    this.drawSourceContained(webglCanvas);

    // Optional cinema letterbox bars
    const barH = this.options.burnLetterbox ? Math.round(h * 0.055) : 0;
    if (barH > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
    }

    // Optional burned-in cutscene subtitles
    if (this.options.burnSubtitles && subtitle && subtitle.text) {
      const fontSize = Math.max(16, Math.round(h * 0.026));
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
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

      ctx.strokeStyle = 'rgba(57, 61, 71, 0.95)';
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
          ctx.fillStyle = '#00a2ff';
          ctx.fillText(speakerPrefix, startX, cy);
          ctx.fillStyle = '#f1f5f9';
          ctx.fillText(rest, startX + prefixW, cy);
          ctx.textAlign = 'center';
        } else {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillText(line, w / 2, cy);
        }
      });
    }

    // Flush 2D backing store so captureStream samples the newly drawn WebGL + subtitle frame
    this.ctx.getImageData(0, 0, 1, 1);
    this.videoTrack?.requestFrame?.();
  }

  public stop() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
  }

  public cancel() {
    this.cancelled = true;
    this.stop();
  }

  private cleanupStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.videoTrack = null;
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
