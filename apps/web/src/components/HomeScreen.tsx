import { Crown } from './Crown';
import { GearIcon } from './icons';
import { Logo } from './Logo';

interface HomeScreenProps {
  best: number;
  canContinue: boolean;
  onPlay: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}

export function HomeScreen({ best, canContinue, onPlay, onNewGame, onSettings }: HomeScreenProps) {
  return (
    <section className="home" aria-label="Home">
      <div className="home-top">
        <button type="button" className="icon-button" onClick={onSettings} aria-label="Settings">
          <GearIcon />
        </button>
      </div>
      <div className="home-center">
        <Logo />
        <p className="tagline">Fill a line. Watch it blast!</p>
        {best > 0 && (
          <div className="home-best" aria-label={`Best score ${best}`}>
            <Crown size={30} />
            <span>{best}</span>
          </div>
        )}
      </div>
      <div className="home-actions">
        <button type="button" className="primary-button big" onClick={onPlay}>
          {canContinue ? 'Continue' : 'Play'}
        </button>
        {canContinue && (
          <button type="button" className="text-button" onClick={onNewGame}>
            New game
          </button>
        )}
      </div>
    </section>
  );
}
