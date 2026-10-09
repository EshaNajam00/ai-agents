import { useEffect, useRef } from 'react';
import { Crown } from './Crown';

interface GameOverModalProps {
  score: number;
  best: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
}

export function GameOverModal({ score, best, isNewBest, onPlayAgain }: GameOverModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => buttonRef.current?.focus(), []);

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <h2 id="game-over-title">No more moves!</h2>
        {isNewBest && <div className="badge">New Best!</div>}
        <div className="modal-score">
          <span className="label">Score</span>
          <span className="value">{score}</span>
        </div>
        <div className="modal-best">
          <Crown size={22} /> <span>{best}</span>
        </div>
        <button ref={buttonRef} type="button" className="primary-button" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
