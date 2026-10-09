import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { GameStore } from './game/GameStore';
import { browserStore } from './platform/storage';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const store = new GameStore(browserStore);

// Lets automated browser tests drive the game in development. Stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { __gridzyStore: store });

createRoot(root).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);
