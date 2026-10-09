import { Crown } from './Crown';

interface HudProps {
  score: number;
  best: number;
  onRestart: () => void;
}

export function Hud({ score, best, onRestart }: HudProps) {
  return (
    <header className="hud">
      <div className="hud-best" aria-label={`Best score ${best}`}>
        <Crown size={26} />
        <span>{best}</span>
      </div>
      <div className="hud-score" aria-live="polite" aria-label={`Score ${score}`}>
        {score}
      </div>
      <button type="button" className="icon-button" onClick={onRestart} aria-label="Restart game">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </header>
  );
}
