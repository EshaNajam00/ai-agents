import { MusicPlayer } from './music';
import { midiToHz, playNoise, playTone } from './synth';

export type SoundName =
  'pickup' | 'place' | 'invalid' | 'praise' | 'newBest' | 'perfect' | 'gameOver' | 'tap';

/** C major pentatonic, two and a half octaves: always sounds pleasant together. */
const PENTATONIC = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];

/**
 * All of Gridzy's sound: effects and music, synthesized with the Web Audio API.
 * Browsers only allow audio after a user gesture, so nothing plays until `unlock()`
 * is called from a tap or click.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private music: MusicPlayer | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private appInBackground = false;

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** Call from any user gesture. Safe to call often. */
  unlock = (): void => {
    if (!this.ctx) {
      const Ctor = window.AudioContext as typeof AudioContext | undefined;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(master);
      const musicBus = ctx.createGain();
      musicBus.gain.value = 0.55;
      musicBus.connect(master);
      this.music = new MusicPlayer(ctx, musicBus);
      this.ctx = ctx;
    }
    if (this.ctx.state === 'suspended' && !this.isHidden()) void this.ctx.resume();
    this.syncMusic();
  };

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.syncMusic();
  }

  play(name: SoundName): void {
    const ready = this.ready();
    if (!ready) return;
    const [ctx, out, t] = ready;
    switch (name) {
      case 'pickup':
        playTone(ctx, out, t, { freq: 520, to: 820, duration: 0.08, gain: 0.08 });
        break;
      case 'place':
        playTone(ctx, out, t, { freq: 240, to: 110, type: 'triangle', duration: 0.13, gain: 0.3 });
        playNoise(ctx, out, t, { duration: 0.04, gain: 0.08, lowpass: 1800 });
        break;
      case 'invalid':
        playTone(ctx, out, t, { freq: 320, to: 220, type: 'triangle', duration: 0.1, gain: 0.12 });
        playTone(ctx, out, t, {
          freq: 230,
          to: 160,
          type: 'triangle',
          delay: 0.08,
          duration: 0.14,
          gain: 0.1,
        });
        break;
      case 'praise':
        [72, 76, 79, 84].forEach((n, i) =>
          playTone(ctx, out, t, {
            freq: midiToHz(n),
            type: 'triangle',
            delay: 0.12 + i * 0.03,
            duration: 0.6,
            gain: 0.07,
          }),
        );
        break;
      case 'newBest':
        [72, 76, 79, 84, 88].forEach((n, i) =>
          playTone(ctx, out, t, {
            freq: midiToHz(n),
            type: 'triangle',
            delay: i * 0.09,
            duration: i === 4 ? 0.8 : 0.25,
            gain: 0.12,
          }),
        );
        break;
      case 'perfect':
        PENTATONIC.forEach((n, i) =>
          playTone(ctx, out, t, {
            freq: midiToHz(n),
            type: 'sine',
            delay: i * 0.04,
            duration: 0.4,
            gain: 0.08,
          }),
        );
        [60, 64, 67, 72].forEach((n) =>
          playTone(ctx, out, t, {
            freq: midiToHz(n),
            type: 'triangle',
            delay: 0.45,
            duration: 1.2,
            gain: 0.06,
          }),
        );
        break;
      case 'gameOver':
        [76, 72, 67, 64, 60].forEach((n, i) =>
          playTone(ctx, out, t, {
            freq: midiToHz(n),
            type: 'sine',
            delay: i * 0.15,
            duration: 0.4,
            gain: 0.12,
          }),
        );
        break;
      case 'tap':
        playTone(ctx, out, t, { freq: 880, duration: 0.05, gain: 0.06 });
        break;
    }
  }

  /** A sparkling run of notes; longer for more lines, higher for bigger combos. */
  playClear(lineCount: number, combo: number): void {
    const ready = this.ready();
    if (!ready) return;
    const [ctx, out, t] = ready;
    const startIndex = Math.min(Math.max(combo - 1, 0), 5);
    const notes = 3 + Math.min(lineCount, 3);
    playNoise(ctx, out, t, { duration: 0.18, gain: 0.05, lowpass: 5000 });
    for (let i = 0; i < notes; i++) {
      const note = PENTATONIC[Math.min(startIndex + i, PENTATONIC.length - 1)] ?? 84;
      playTone(ctx, out, t, {
        freq: midiToHz(note),
        type: 'triangle',
        delay: i * 0.05,
        duration: 0.3,
        gain: 0.13,
      });
      playTone(ctx, out, t, {
        freq: midiToHz(note + 12),
        type: 'sine',
        delay: i * 0.05 + 0.01,
        duration: 0.25,
        gain: 0.035,
      });
    }
  }

  private ready(): [AudioContext, AudioNode, number] | null {
    if (!this.sfxEnabled || !this.ctx || !this.sfxBus || this.ctx.state !== 'running') return null;
    return [this.ctx, this.sfxBus, this.ctx.currentTime];
  }

  /** Called by the native app shell when the app is minimized or reopened. */
  setAppInBackground(background: boolean): void {
    this.appInBackground = background;
    this.onVisibilityChange();
  }

  private isHidden(): boolean {
    return document.hidden || this.appInBackground;
  }

  private syncMusic(): void {
    if (!this.music) return;
    if (this.musicEnabled && !this.isHidden()) this.music.start();
    else this.music.stop();
  }

  /** Go silent when the tab or app is in the background. */
  private onVisibilityChange = (): void => {
    if (!this.ctx) return;
    if (this.isHidden()) {
      this.music?.stop();
      void this.ctx.suspend();
    } else {
      void this.ctx.resume();
      this.syncMusic();
    }
  };
}
