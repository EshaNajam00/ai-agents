import { Crown } from './Crown';
import { Modal } from './Modal';

interface GameOverModalProps {
  score: number;
  best: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function GameOverModal({ score, best, isNewBest, onPlayAgain, onHome }: GameOverModalProps) {
  return (
    <Modal labelledBy="game-over-title">
      <h2 id="game-over-title">No more moves!</h2>
      {isNewBest && <div className="badge">New Best!</div>}
      <div className="modal-score">
        <span className="label">Score</span>
        <span className="value">{score}</span>
      </div>
      <div className="modal-best">
        <Crown size={22} /> <span>{best}</span>
      </div>
      <button type="button" className="primary-button" onClick={onPlayAgain} data-autofocus>
        Play again
      </button>
      <button type="button" className="text-button" onClick={onHome}>
        Home
      </button>
    </Modal>
  );
}
