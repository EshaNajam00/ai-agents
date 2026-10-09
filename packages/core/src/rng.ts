/**
 * Small, fast, seedable PRNG (mulberry32). The state is a plain 32-bit integer so it
 * can live inside immutable game state and be saved and restored exactly.
 */
export function nextRandom(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Returns an integer in [0, max) and the next state. */
export function nextInt(state: number, max: number): [value: number, nextState: number] {
  const [value, nextState] = nextRandom(state);
  return [Math.floor(value * max), nextState];
}

/** A non-deterministic seed for real games. Tests pass explicit seeds instead. */
export function randomSeed(): number {
  return (Math.random() * 4294967296) | 0;
}
