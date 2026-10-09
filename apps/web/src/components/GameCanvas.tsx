import { useEffect, useRef } from 'react';
import type { FeedbackActions } from '../game/feedback';
import type { GameStore } from '../game/GameStore';
import type { SettingsStore } from '../game/settings';
import { GameRenderer } from '../render/GameRenderer';

interface GameCanvasProps {
  store: GameStore;
  settings: SettingsStore;
  feedback: FeedbackActions;
}

export function GameCanvas({ store, settings, feedback }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: GameRenderer | null = null;
    let disposed = false;

    // Pixi starts asynchronously; if React unmounts first, clean up once it is ready.
    GameRenderer.create(container, store, { settings, feedback })
      .then((r) => {
        if (disposed) r.destroy();
        else renderer = r;
      })
      .catch((error: unknown) => console.error('Gridzy could not start the renderer', error));

    return () => {
      disposed = true;
      renderer?.destroy();
    };
  }, [store, settings, feedback]);

  return <div ref={containerRef} className="game-canvas" />;
}
