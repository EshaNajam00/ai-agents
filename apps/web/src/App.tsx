import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameOverModal } from './components/GameOverModal';
import { Hud } from './components/Hud';
import type { GameStore } from './game/GameStore';

/** Pause before the game-over popup so players can see the final board. */
const GAME_OVER_DELAY_MS = 700;

export function App({ store }: { store: GameStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [showGameOver, setShowGameOver] = useState(false);

  useEffect(() => {
    if (!state.gameOver) return;
    const timer = window.setTimeout(() => setShowGameOver(true), GAME_OVER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.gameOver]);

  const restart = () => {
    setShowGameOver(false);
    store.restart();
  };

  const confirmRestart = () => {
    if (state.score === 0 || state.gameOver || window.confirm('Start a new game?')) restart();
  };

  return (
    <main className="app">
      <Hud score={state.score} best={state.best} onRestart={confirmRestart} />
      <GameCanvas store={store} />
      {showGameOver && state.gameOver && (
        <GameOverModal
          score={state.score}
          best={state.best}
          isNewBest={state.score > state.previousBest}
          onPlayAgain={restart}
        />
      )}
    </main>
  );
}
