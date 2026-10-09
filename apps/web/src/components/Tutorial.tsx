import { Modal } from './Modal';

/** Instruction banner shown above the board during the tutorial. */
export function TutorialBanner({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="tutorial-banner" role="status">
      <p>
        <strong>Drag the piece</strong> onto the board.
        <br />
        Fill a row to <strong>blast it!</strong>
      </p>
      <button type="button" className="text-button" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}

export function TutorialDone({ onPlay }: { onPlay: () => void }) {
  return (
    <Modal labelledBy="tutorial-done-title" onClose={onPlay}>
      <h2 id="tutorial-done-title">You&apos;re ready!</h2>
      <p className="modal-text">
        Place all three pieces to get new ones. Clear lines in a row for <strong>combos</strong>.
        The game ends when nothing fits.
      </p>
      <button type="button" className="primary-button" onClick={onPlay} data-autofocus>
        Let&apos;s play!
      </button>
    </Modal>
  );
}
