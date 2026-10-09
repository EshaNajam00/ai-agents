import { midiToHz, playTone } from './synth';

const BPM = 78;
const STEP = 60 / BPM / 2; // eighth notes
const STEPS_PER_BAR = 8;
const LOOKAHEAD_S = 0.5;
const TICK_MS = 120;

/** I – vi – IV – V in C major, as MIDI chord tones. A gentle, endlessly loopable cycle. */
const CHORDS: readonly (readonly number[])[] = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];

/** Which chord tone the arpeggio plays on each eighth note (-1 = rest). */
const ARP_A = [0, 2, 1, 2, 0, 2, 1, -1];
const ARP_B = [2, 1, 0, 1, 2, -1, 1, 0];

/**
 * Original, calm background loop synthesized in real time: a soft pad, a light bass
 * and a plucked arpeggio. Notes are scheduled slightly ahead for stable timing.
 */
export class MusicPlayer {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  get playing(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.15;
    this.timer = window.setInterval(this.schedule, TICK_MS);
    this.schedule();
  }

  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule = (): void => {
    // After a long suspension, skip ahead instead of firing a burst of old notes.
    if (this.nextTime < this.ctx.currentTime - 1) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_S) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % (STEPS_PER_BAR * CHORDS.length * 2);
    }
  };

  private playStep(step: number, at: number): void {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const beat = step % STEPS_PER_BAR;
    const chord = CHORDS[bar % CHORDS.length] ?? CHORDS[0] ?? [];
    const { ctx, out } = this;

    if (beat === 0) {
      for (const note of chord) {
        for (const detune of [-5, 5]) {
          playTone(ctx, out, at, {
            freq: midiToHz(note),
            type: 'triangle',
            duration: STEP * STEPS_PER_BAR * 1.1,
            attack: 0.6,
            gain: 0.018,
            detune,
            lowpass: 900,
          });
        }
      }
    }

    if (beat === 0 || beat === 4) {
      playTone(ctx, out, at, {
        freq: midiToHz((chord[0] ?? 60) - 12),
        type: 'sine',
        duration: STEP * 3.5,
        attack: 0.02,
        gain: 0.07,
      });
    }

    const pattern = bar % 2 === 0 ? ARP_A : ARP_B;
    const toneIndex = pattern[beat] ?? -1;
    const note = chord[toneIndex];
    if (toneIndex >= 0 && note !== undefined) {
      playTone(ctx, out, at, {
        freq: midiToHz(note + 12),
        type: 'sine',
        duration: 0.45,
        attack: 0.005,
        gain: 0.045,
      });
    }
  }
}
