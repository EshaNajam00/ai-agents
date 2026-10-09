import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Background } from './components/Background';
import { GameCanvas } from './components/GameCanvas';
import { GameOverModal } from './components/GameOverModal';
import { HomeScreen } from './components/HomeScreen';
import { Hud } from './components/Hud';
import { SettingsModal } from './components/SettingsModal';
import { TutorialBanner, TutorialDone } from './components/Tutorial';
import type { GameState } from '@gridzy/core';
import type { FeedbackActions } from './game/feedback';
import type { GameStore } from './game/GameStore';
import type { Settings, SettingsStore } from './game/settings';
import { useSettings } from './hooks';
import { isNativeApp } from './platform/native';

/** Lets the gray-out animation finish before the game-over popup appears. */
const GAME_OVER_DELAY_MS = 1200;
/** Lets the tutorial's line blast play before "You're ready!". */
const TUTORIAL_DONE_DELAY_MS = 1100;

type Screen = 'home' | 'game';

interface AppProps {
  store: GameStore;
  settings: SettingsStore;
  feedback: FeedbackActions;
}

export function App({ store, settings, feedback }: AppProps) {
  const { game, mode } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const prefs = useSettings(settings);
  const [screen, setScreen] = useState<Screen>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(store.tutorialSeen);
  // Popups wait a moment so the final blast or gray-out can be seen. The state they are
  // due for is compared by identity, so any newer state hides them automatically.
  const [popupDueFor, setPopupDueFor] = useState<GameState | null>(null);
  const gameOverPending = game.gameOver && mode === 'play';
  const tutorialDonePending = mode === 'tutorialDone';
  const popupReady = popupDueFor === game;

  useEffect(() => {
    if (!gameOverPending && !tutorialDonePending) return;
    const delay = gameOverPending ? GAME_OVER_DELAY_MS : TUTORIAL_DONE_DELAY_MS;
    const timer = window.setTimeout(() => setPopupDueFor(game), delay);
    return () => window.clearTimeout(timer);
  }, [game, gameOverPending, tutorialDonePending]);

  /** Wraps a UI action with a click sound. */
  const tap = useCallback(
    (action: () => void) => () => {
      feedback.tap();
      action();
    },
    [feedback],
  );

  const startPlaying = () => {
    if (!tutorialSeen) store.startTutorial();
    else if (game.gameOver || mode !== 'play') store.restart();
    setScreen('game');
  };

  const newGame = () => {
    store.restart();
    setScreen('game');
  };

  const finishTutorial = () => {
    store.finishTutorial();
    setTutorialSeen(true);
  };

  const howToPlay = () => {
    setSettingsOpen(false);
    store.startTutorial();
    setScreen('game');
  };

  const goHome = () => {
    setSettingsOpen(false);
    if (mode !== 'play') finishTutorial();
    setScreen('home');
  };

  const updateSettings = (patch: Partial<Settings>) => {
    settings.update(patch);
    feedback.tap();
  };

  return (
    <main className={`app ${prefs.reduceMotion ? 'reduce-motion' : ''}`}>
      <Background />

      {screen === 'home' ? (
        <HomeScreen
          best={game.best}
          canContinue={store.hasProgress()}
          showAppDownload={!isNativeApp}
          onPlay={tap(startPlaying)}
          onNewGame={tap(newGame)}
          onSettings={tap(() => setSettingsOpen(true))}
        />
      ) : (
        <div className="game-screen">
          <Hud
            score={game.score}
            best={mode === 'play' ? game.best : game.previousBest}
            combo={mode === 'play' && !game.gameOver ? game.combo : 0}
            animate={!prefs.reduceMotion}
            onSettings={tap(() => setSettingsOpen(true))}
          />
          {mode === 'tutorial' && <TutorialBanner onSkip={tap(finishTutorial)} />}
          <GameCanvas store={store} settings={settings} feedback={feedback} />
        </div>
      )}

      {screen === 'game' && tutorialDonePending && popupReady && (
        <TutorialDone onPlay={tap(finishTutorial)} />
      )}

      {screen === 'game' && gameOverPending && popupReady && (
        <GameOverModal
          score={game.score}
          best={game.best}
          isNewBest={game.score > game.previousBest}
          onPlayAgain={tap(newGame)}
          onHome={tap(() => setScreen('home'))}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={prefs}
          inGame={screen === 'game'}
          onChange={updateSettings}
          onHowToPlay={tap(howToPlay)}
          onRestart={tap(() => {
            setSettingsOpen(false);
            newGame();
          })}
          onHome={tap(goHome)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
