import '@fontsource-variable/fredoka';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AudioEngine } from './audio/AudioEngine';
import { Feedback } from './game/feedback';
import { GameStore } from './game/GameStore';
import { SettingsStore } from './game/settings';
import { browserHaptics } from './platform/haptics';
import {
  createNativeStore,
  hideSplash,
  isNativeApp,
  nativeHaptics,
  onAppPauseResume,
} from './platform/native';
import { browserStore } from './platform/storage';
import './styles.css';

async function start(): Promise<void> {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');

  // Same game everywhere; only storage and vibration differ between browser and app.
  const storage = isNativeApp ? await createNativeStore() : browserStore;
  const haptics = isNativeApp ? nativeHaptics : browserHaptics;

  const store = new GameStore(storage);
  const settings = new SettingsStore(storage);
  const audio = new AudioEngine();
  const feedback = new Feedback(store, settings, audio, haptics);

  // Browsers only start audio after a user gesture.
  document.addEventListener('pointerdown', audio.unlock, { capture: true });
  document.addEventListener('keydown', audio.unlock, { capture: true });

  if (isNativeApp) {
    onAppPauseResume(
      () => audio.setAppInBackground(true),
      () => audio.setAppInBackground(false),
    );
  }

  // Lets automated browser tests drive the game in development. Stripped from production builds.
  if (import.meta.env.DEV) Object.assign(window, { __gridzyStore: store });

  createRoot(root).render(
    <StrictMode>
      <App store={store} settings={settings} feedback={feedback} />
    </StrictMode>,
  );

  if (isNativeApp) requestAnimationFrame(() => requestAnimationFrame(hideSplash));
}

void start();
