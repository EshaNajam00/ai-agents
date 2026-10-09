import { describe, expect, it, vi } from 'vitest';
import { defaultSettings, parseSettings, SettingsStore } from '../src/game/settings';
import { loadBest, loadJson } from '../src/platform/storage';
import { memoryStore } from './memoryStore';

const defaults = { sound: true, music: true, vibration: true, reduceMotion: false };

describe('settings', () => {
  it('defaults to everything on, without crashing outside a browser', () => {
    expect(defaultSettings()).toMatchObject({ sound: true, music: true, vibration: true });
  });

  it('keeps only valid boolean fields from stored data', () => {
    expect(parseSettings({ sound: false, music: 'no', evil: 1 }, defaults)).toEqual({
      ...defaults,
      sound: false,
    });
    expect(parseSettings(null, defaults)).toEqual(defaults);
    expect(parseSettings('x', defaults)).toEqual(defaults);
  });

  it('persists updates and notifies listeners', () => {
    const storage = memoryStore();
    const store = new SettingsStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ music: false });
    expect(store.get().music).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
    expect(new SettingsStore(storage).get().music).toBe(false);
  });
});

describe('storage helpers', () => {
  it('returns undefined for malformed JSON', () => {
    expect(loadJson(memoryStore({ x: '{oops' }), 'x')).toBeUndefined();
    expect(loadJson(memoryStore(), 'x')).toBeUndefined();
  });

  it('rejects nonsense best scores', () => {
    for (const bad of ['-5', 'abc', '1.5', '1e20']) {
      expect(loadBest(memoryStore({ best: bad }))).toBe(0);
    }
    expect(loadBest(memoryStore({ best: '42' }))).toBe(42);
  });
});
