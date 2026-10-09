import { useState } from 'react';
import type { Settings } from '../game/settings';
import { APP_VERSION } from '../version';
import { CloseIcon } from './icons';
import { Modal } from './Modal';

interface SettingsModalProps {
  settings: Settings;
  inGame: boolean;
  onChange: (patch: Partial<Settings>) => void;
  onHowToPlay: () => void;
  onRestart: () => void;
  onHome: () => void;
  onClose: () => void;
}

const TOGGLES: { key: keyof Settings; label: string }[] = [
  { key: 'sound', label: 'Sound effects' },
  { key: 'music', label: 'Music' },
  { key: 'vibration', label: 'Vibration' },
  { key: 'reduceMotion', label: 'Reduce motion' },
];

export function SettingsModal(props: SettingsModalProps) {
  const { settings, inGame, onChange, onHowToPlay, onRestart, onHome, onClose } = props;
  const [confirmRestart, setConfirmRestart] = useState(false);

  return (
    <Modal labelledBy="settings-title" onClose={onClose} className="settings">
      <div className="modal-header">
        <h2 id="settings-title">Settings</h2>
        <button type="button" className="icon-button small" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <ul className="toggle-list">
        {TOGGLES.map(({ key, label }) => (
          <li key={key}>
            <span id={`toggle-${key}`}>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[key]}
              aria-labelledby={`toggle-${key}`}
              className="switch"
              onClick={() => onChange({ [key]: !settings[key] })}
            >
              <span className="switch-knob" />
            </button>
          </li>
        ))}
      </ul>

      <div className="settings-actions">
        <button type="button" className="secondary-button" onClick={onHowToPlay}>
          How to play
        </button>
        {inGame && (
          <>
            <button
              type="button"
              className={`secondary-button ${confirmRestart ? 'danger' : ''}`}
              onClick={() => (confirmRestart ? onRestart() : setConfirmRestart(true))}
            >
              {confirmRestart ? 'Tap again to restart' : 'Restart game'}
            </button>
            <button type="button" className="secondary-button" onClick={onHome}>
              Home
            </button>
          </>
        )}
      </div>

      <p className="fine-print">
        Gridzy collects no data: no ads, no accounts, no tracking. Everything stays on this device.
        <br />
        Version {APP_VERSION}
      </p>
    </Modal>
  );
}
