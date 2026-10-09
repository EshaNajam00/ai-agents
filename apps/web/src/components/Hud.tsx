import type { CSSProperties } from 'react';
import { useCountUp } from '../hooks';
import { Crown } from './Crown';
import { GearIcon } from './icons';

interface HudProps {
  score: number;
  best: number;
  combo: number;
  animate: boolean;
  onSettings: () => void;
}

export function Hud({ score, best, combo, animate, onSettings }: HudProps) {
  const shownScore = useCountUp(score, animate);
  const shownBest = useCountUp(best, animate);

  return (
    <header className="hud">
      <div className="hud-best" aria-label={`Best score ${best}`}>
        <Crown size={26} />
        <span>{shownBest}</span>
      </div>
      <div className="hud-center">
        <div className="hud-score" aria-live="polite" aria-label={`Score ${score}`}>
          {shownScore}
        </div>
        <div className="combo-slot" aria-live="polite">
          {combo >= 2 && (
            <span
              key={combo}
              className="combo-badge"
              style={{ '--heat': Math.min(combo, 8) } as CSSProperties}
            >
              Combo x{combo}
            </span>
          )}
        </div>
      </div>
      <button type="button" className="icon-button" onClick={onSettings} aria-label="Settings">
        <GearIcon />
      </button>
    </header>
  );
}
