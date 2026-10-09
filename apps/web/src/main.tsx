import '@fontsource-variable/fredoka';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AudioEngine } from './audio/AudioEngine';
import { Feedback } from './game/feedback';
import { GameStore } from './game/GameStore';
import { SettingsStore } from './game/settings';
import { browserHaptics } from './platform/haptics';
import { browserStore } from './platform/storage';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const store = new GameStore(browserStore);
const settings = new SettingsStore(browserStore);
const audio = new AudioEngine();
const feedback = new Feedback(store, settings, audio, browserHaptics);

// Browsers only start audio after a user gesture.
document.addEventListener('pointerdown', audio.unlock, { capture: true });
document.addEventListener('keydown', audio.unlock, { capture: true });

// Lets automated browser tests drive the game in development. Stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { __gridzyStore: store });

createRoot(root).render(
  <StrictMode>
    <App store={store} settings={settings} feedback={feedback} />
  </StrictMode>,
);
