import { AnimationProject, SfxCue, SfxKind, SubtitleCue } from './types';

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export class EpisodeAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private activeStoppables: Set<{ stop: (when?: number) => void }> = new Set();
  private firedSfxIds = new Set<string>();
  private spokenSubIds = new Set<string>();
  private lastTime = -1;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.78;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        nextMuted ? 0 : 0.78,
        this.ctx.currentTime,
      );
    }
    if (nextMuted) {
      this.stopAllSpeech();
      this.stopAllSfx();
    }
  }

  public resetPlayback(time = 0): void {
    this.firedSfxIds.clear();
    this.spokenSubIds.clear();
    this.lastTime = time;
    this.stopAllSfx();
    this.stopAllSpeech();
  }

  public stopAllSfx(): void {
    for (const node of this.activeStoppables) {
      try {
        node.stop();
      } catch {
        // Ignore already stopped nodes
      }
    }
    this.activeStoppables.clear();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(1, this.ctx.currentTime);
    }
  }

  public stopAllSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore restricted speech contexts
      }
    }
  }

  public dispose(): void {
    this.stopAllSfx();
    this.stopAllSpeech();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
    }
  }

  public sync(
    project: AnimationProject,
    time: number,
    isPlaying: boolean,
    playbackSpeed = 1,
  ): void {
    if (!isPlaying) {
      if (this.lastTime !== -1) {
        this.stopAllSpeech();
        this.stopAllSfx();
        this.spokenSubIds.clear();
        this.firedSfxIds.clear();
      }
      this.lastTime = time;
      return;
    }

    // Reset trigger history on seek, scrub, or loop wrap
    if (
      this.lastTime < 0 ||
      time < this.lastTime - 0.1 ||
      time - this.lastTime > 0.75
    ) {
      this.firedSfxIds.clear();
      this.spokenSubIds.clear();
      this.stopAllSfx();
      this.stopAllSpeech();
    }
    this.lastTime = time;

    if (this.muted) return;

    const sfxTrack = project.sfxTrack ?? [];
    for (const cue of sfxTrack) {
      if (this.firedSfxIds.has(cue.id)) continue;
      if (time >= cue.time && time - cue.time <= 0.45) {
        this.firedSfxIds.add(cue.id);
        this.triggerSfx(cue);
      }
    }

    for (const sub of project.subtitles) {
      if (this.spokenSubIds.has(sub.id)) continue;
      if (time >= sub.startTime && time < sub.endTime - 0.15) {
        this.spokenSubIds.add(sub.id);
        this.speakSubtitle(sub, playbackSpeed);
      }
    }
  }

  private speakSubtitle(sub: SubtitleCue, playbackSpeed: number): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utter = new SpeechSynthesisUtterance(sub.text);
      const isVo = sub.role === 'voiceover';
      const speakerLower = (sub.speaker ?? '').toLowerCase();
      const higherVoice =
        speakerLower.includes('woman') ||
        speakerLower.includes('gossiper') ||
        speakerLower.includes('bride') ||
        speakerLower.includes('waitress');

      utter.pitch = isVo ? 0.9 : higherVoice ? 1.18 : 0.98;
      utter.rate = Math.min(1.6, Math.max(0.75, (isVo ? 1.04 : 1.06) * Math.min(1.4, playbackSpeed)));
      utter.volume = isVo ? 0.92 : 0.88;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore environments without speech synthesis voices
    }
  }

  private trackSource<T extends AudioScheduledSourceNode>(node: T): T {
    this.activeStoppables.add(node);
    node.onended = () => {
      this.activeStoppables.delete(node);
    };
    return node;
  }

  private triggerSfx(cue: SfxCue): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;

    const ctx = this.ctx;
    const out = this.sfxGain;
    const now = ctx.currentTime;
    const vol = Math.max(0.05, Math.min(1, cue.volume ?? 0.75));
    const kind: SfxKind = cue.kind;

    if (kind === 'smashCutSilence') {
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0.0001, now + 0.04);
      for (const node of this.activeStoppables) {
        try {
          node.stop(now + 0.05);
        } catch {
          // Ignore
        }
      }
      this.activeStoppables.clear();
      return;
    }

    out.gain.setValueAtTime(1, now);

    switch (kind) {
      case 'thunder': {
        const noise = this.trackSource(ctx.createBufferSource());
        noise.buffer = createNoiseBuffer(ctx, 2.2);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240, now);
        filter.frequency.exponentialRampToValueAtTime(55, now + 2.0);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol * 0.95, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
        noise.connect(filter).connect(gain).connect(out);
        noise.start(now);
        noise.stop(now + 2.15);
        break;
      }

      case 'catsDogsRain': {
        // Patter + comic bark & meow synth hits
        const rain = this.trackSource(ctx.createBufferSource());
        rain.buffer = createNoiseBuffer(ctx, 2.5);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        const rGain = ctx.createGain();
        rGain.gain.setValueAtTime(0.001, now);
        rGain.gain.linearRampToValueAtTime(vol * 0.28, now + 0.3);
        rGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
        rain.connect(bp).connect(rGain).connect(out);
        rain.start(now);
        rain.stop(now + 2.45);

        // Bark pitch blip
        const bark = this.trackSource(ctx.createOscillator());
        bark.type = 'sawtooth';
        bark.frequency.setValueAtTime(290, now + 0.35);
        bark.frequency.exponentialRampToValueAtTime(150, now + 0.52);
        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.001, now + 0.34);
        bGain.gain.linearRampToValueAtTime(vol * 0.35, now + 0.37);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
        bark.connect(bGain).connect(out);
        bark.start(now + 0.34);
        bark.stop(now + 0.56);

        // Meow slide
        const meow = this.trackSource(ctx.createOscillator());
        meow.type = 'triangle';
        meow.frequency.setValueAtTime(620, now + 1.05);
        meow.frequency.linearRampToValueAtTime(860, now + 1.2);
        meow.frequency.exponentialRampToValueAtTime(480, now + 1.48);
        const mGain = ctx.createGain();
        mGain.gain.setValueAtTime(0.001, now + 1.04);
        mGain.gain.linearRampToValueAtTime(vol * 0.25, now + 1.12);
        mGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        meow.connect(mGain).connect(out);
        meow.start(now + 1.04);
        meow.stop(now + 1.52);
        break;
      }

      case 'umbrellaClang': {
        const freqs = [520, 785, 1180];
        freqs.forEach((f, idx) => {
          const osc = this.trackSource(ctx.createOscillator());
          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + 0.45);
          const g = ctx.createGain();
          g.gain.setValueAtTime(vol * (0.38 / (idx + 1)), now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc.connect(g).connect(out);
          osc.start(now);
          osc.stop(now + 0.58);
        });
        break;
      }

      case 'cafeChatter': {
        const hiss = this.trackSource(ctx.createBufferSource());
        hiss.buffer = createNoiseBuffer(ctx, 1.8);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol * 0.2, now + 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.75);
        hiss.connect(bp).connect(g).connect(out);
        hiss.start(now);
        hiss.stop(now + 1.8);
        break;
      }

      case 'beanCascade': {
        const noise = this.trackSource(ctx.createBufferSource());
        noise.buffer = createNoiseBuffer(ctx, 2.8);
        const hp = ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 2600;
        hp.Q.value = 0.7;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol * 0.65, now + 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.7);
        noise.connect(hp).connect(g).connect(out);
        noise.start(now);
        noise.stop(now + 2.75);
        break;
      }

      case 'officeSilence': {
        const hum = this.trackSource(ctx.createOscillator());
        hum.type = 'sine';
        hum.frequency.value = 60;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol * 0.14, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
        hum.connect(g).connect(out);
        hum.start(now);
        hum.stop(now + 2.25);
        break;
      }

      case 'staplerCrunch': {
        for (const tOff of [0, 0.22]) {
          const osc = this.trackSource(ctx.createOscillator());
          osc.type = 'square';
          osc.frequency.setValueAtTime(280, now + tOff);
          osc.frequency.exponentialRampToValueAtTime(90, now + tOff + 0.08);
          const g = ctx.createGain();
          g.gain.setValueAtTime(vol * 0.45, now + tOff);
          g.gain.exponentialRampToValueAtTime(0.001, now + tOff + 0.1);
          osc.connect(g).connect(out);
          osc.start(now + tOff);
          osc.stop(now + tOff + 0.12);
        }
        break;
      }

      case 'elephantTrumpet': {
        const osc = this.trackSource(ctx.createOscillator());
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(340, now + 1.05);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        f.Q.value = 2.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol * 0.72, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
        osc.connect(f).connect(g).connect(out);
        osc.start(now);
        osc.stop(now + 1.2);
        break;
      }

      case 'weddingOrganScratch': {
        const notes = [261.6, 329.6, 392.0];
        notes.forEach((freq) => {
          const osc = this.trackSource(ctx.createOscillator());
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.linearRampToValueAtTime(freq * 0.65, now + 0.72);
          const g = ctx.createGain();
          g.gain.setValueAtTime(vol * 0.22, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
          osc.connect(g).connect(out);
          osc.start(now);
          osc.stop(now + 0.8);
        });
        break;
      }

      case 'iceCrackWhir': {
        const crack = this.trackSource(ctx.createBufferSource());
        crack.buffer = createNoiseBuffer(ctx, 0.35);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2200;
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(vol * 0.75, now);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        crack.connect(hp).connect(cg).connect(out);
        crack.start(now);
        crack.stop(now + 0.35);

        // Hairdryer whir
        const whir = this.trackSource(ctx.createBufferSource());
        whir.buffer = createNoiseBuffer(ctx, 2.0);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 650;
        bp.Q.value = 3;
        const wg = ctx.createGain();
        wg.gain.setValueAtTime(0.001, now + 0.4);
        wg.gain.linearRampToValueAtTime(vol * 0.36, now + 0.7);
        wg.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
        whir.connect(bp).connect(wg).connect(out);
        whir.start(now + 0.4);
        whir.stop(now + 2.35);
        break;
      }

      case 'legSnap': {
        const snap = this.trackSource(ctx.createBufferSource());
        snap.buffer = createNoiseBuffer(ctx, 0.16);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.9, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        snap.connect(bp).connect(g).connect(out);
        snap.start(now);
        snap.stop(now + 0.16);
        break;
      }

      case 'ambulanceSiren': {
        const osc = this.trackSource(ctx.createOscillator());
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.linearRampToValueAtTime(920, now + 0.45);
        osc.frequency.linearRampToValueAtTime(620, now + 0.9);
        osc.frequency.linearRampToValueAtTime(920, now + 1.35);
        osc.frequency.linearRampToValueAtTime(620, now + 1.8);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol * 0.28, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.85);
        osc.connect(g).connect(out);
        osc.start(now);
        osc.stop(now + 1.9);
        break;
      }

      case 'dinerClatter': {
        for (let i = 0; i < 3; i++) {
          const osc = this.trackSource(ctx.createOscillator());
          osc.type = 'sine';
          osc.frequency.value = 1200 + i * 430;
          const g = ctx.createGain();
          g.gain.setValueAtTime(vol * 0.16, now + i * 0.16);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.25);
          osc.connect(g).connect(out);
          osc.start(now + i * 0.16);
          osc.stop(now + i * 0.16 + 0.28);
        }
        break;
      }

      case 'horseCartNeigh': {
        const osc = this.trackSource(ctx.createOscillator());
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.linearRampToValueAtTime(780, now + 0.18);
        osc.frequency.linearRampToValueAtTime(520, now + 0.45);
        osc.frequency.linearRampToValueAtTime(340, now + 0.9);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1100;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol * 0.5, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
        osc.connect(bp).connect(g).connect(out);
        osc.start(now);
        osc.stop(now + 1.0);
        break;
      }

      case 'crowdPanicScreech': {
        const screech = this.trackSource(ctx.createOscillator());
        screech.type = 'sawtooth';
        screech.frequency.setValueAtTime(920, now);
        screech.frequency.exponentialRampToValueAtTime(340, now + 0.65);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
        screech.connect(g).connect(out);
        screech.start(now);
        screech.stop(now + 0.75);
        break;
      }
    }
  }
}
