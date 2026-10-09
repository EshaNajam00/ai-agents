import { praiseFor } from '@gridzy/core';
import type { AudioEngine, SoundName } from '../audio/AudioEngine';
import type { HapticStrength, Haptics } from '../platform/haptics';
import type { GameStore, StoreEvent } from './GameStore';
import type { SettingsStore } from './settings';

/** Sound and vibration reactions. Renderer and UI call these for input-only moments. */
export interface FeedbackActions {
  pickup(): void;
  invalidDrop(): void;
  tap(): void;
}

/**
 * Turns game events into sound and vibration, respecting the player's settings.
 * Visual effects live in the renderer; this class only handles audio and haptics.
 */
export class Feedback implements FeedbackActions {
  constructor(
    store: GameStore,
    private readonly settings: SettingsStore,
    private readonly audio: AudioEngine,
    private readonly haptics: Haptics,
  ) {
    store.subscribe(this.onEvents);
    settings.subscribe(this.applySettings);
    this.applySettings();
  }

  pickup(): void {
    this.sound('pickup');
  }

  invalidDrop(): void {
    this.sound('invalid');
  }

  tap(): void {
    this.sound('tap');
  }

  private applySettings = (): void => {
    const { sound, music } = this.settings.get();
    this.audio.setSfxEnabled(sound);
    this.audio.setMusicEnabled(music);
  };

  private sound(name: SoundName): void {
    this.audio.play(name);
  }

  private vibrate(strength: HapticStrength): void {
    if (this.settings.get().vibration) this.haptics.impact(strength);
  }

  private onEvents = (events: readonly StoreEvent[]): void => {
    let strongest: HapticStrength | null = null;
    const bump = (s: HapticStrength) => {
      const rank = { light: 0, medium: 1, heavy: 2 };
      if (strongest === null || rank[s] > rank[strongest]) strongest = s;
    };

    for (const e of events) {
      switch (e.type) {
        case 'placed':
          this.sound('place');
          bump('light');
          break;
        case 'linesCleared':
          this.audio.playClear(e.lineCount, e.combo);
          if (praiseFor(e.lineCount)) this.sound('praise');
          bump(e.lineCount >= 3 || e.combo >= 3 ? 'heavy' : 'medium');
          break;
        case 'perfectClear':
          this.sound('perfect');
          bump('heavy');
          break;
        case 'newBest':
          this.sound('newBest');
          break;
        case 'gameOver':
          this.sound('gameOver');
          bump('medium');
          break;
        default:
          break;
      }
    }
    if (strongest) this.vibrate(strongest);
  };
}
