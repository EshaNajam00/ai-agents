import { useEffect, useRef } from 'react';
import type { GameStore } from '../game/GameStore';
import { GameRenderer } from '../render/GameRenderer';

export function GameCanvas({ store }: { store: GameStore }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: GameRenderer | null = null;
    let disposed = false;

    // Pixi starts asynchronously; if React unmounts first, clean up once it is ready.
    GameRenderer.create(container, store)
      .then((r) => {
        if (disposed) r.destroy();
        else renderer = r;
      })
      .catch((error: unknown) => console.error('Gridzy could not start the renderer', error));

    return () => {
      disposed = true;
      renderer?.destroy();
    };
  }, [store]);

  return <div ref={containerRef} className="game-canvas" />;
}
