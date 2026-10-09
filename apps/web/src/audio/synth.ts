/** Small Web Audio building blocks shared by sound effects and music. */

export function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export interface ToneOptions {
  readonly freq: number;
  /** Glide to this frequency over the tone's duration. */
  readonly to?: number;
  readonly type?: OscillatorType;
  /** Seconds from `at`. */
  readonly delay?: number;
  readonly duration: number;
  readonly gain: number;
  readonly attack?: number;
  readonly detune?: number;
  /** Optional low-pass cutoff, for softer timbres. */
  readonly lowpass?: number;
}

const SILENT = 0.0001;

/** Plays one enveloped oscillator note starting at audio time `at`. */
export function playTone(ctx: AudioContext, out: AudioNode, at: number, o: ToneOptions): void {
  const start = at + (o.delay ?? 0);
  const end = start + o.duration;
  const attack = Math.min(o.attack ?? 0.005, o.duration / 2);

  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, end);
  if (o.detune) osc.detune.setValueAtTime(o.detune, start);

  const env = ctx.createGain();
  env.gain.setValueAtTime(SILENT, start);
  env.gain.exponentialRampToValueAtTime(o.gain, start + attack);
  env.gain.exponentialRampToValueAtTime(SILENT, end);

  let node: AudioNode = osc;
  if (o.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(o.lowpass, start);
    node = osc.connect(filter);
  }
  node.connect(env).connect(out);
  osc.start(start);
  osc.stop(end + 0.05);
}

let noiseBuffer: AudioBuffer | null = null;

/** Short filtered noise burst, used for soft "thunk" and "pop" textures. */
export function playNoise(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  o: { delay?: number; duration: number; gain: number; lowpass: number },
): void {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = at + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(o.lowpass, start);
  const env = ctx.createGain();
  env.gain.setValueAtTime(o.gain, start);
  env.gain.exponentialRampToValueAtTime(SILENT, start + o.duration);
  src.connect(filter).connect(env).connect(out);
  src.start(start);
  src.stop(start + o.duration + 0.05);
}
