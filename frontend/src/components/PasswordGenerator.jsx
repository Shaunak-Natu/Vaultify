import { useState, useCallback } from 'react';
import { generatePassword, getStrength } from '../utils/password';
import { RefreshIcon, CopyIcon, CloseIcon } from './Icons';
import { useToast } from '../context/ToastContext';

export default function PasswordGenerator({ onUse, onClose }) {
  const { toast } = useToast();
  const [opts, setOpts] = useState({ length: 20, upper: true, lower: true, digits: true, symbols: true });
  const [password, setPassword] = useState(() => generatePassword({ length: 20, upper: true, lower: true, digits: true, symbols: true }));
  const strength = getStrength(password);

  const regen = useCallback((newOpts = opts) => {
    setPassword(generatePassword(newOpts));
  }, [opts]);

  const setOpt = (key, val) => {
    const next = { ...opts, [key]: val };
    setOpts(next);
    regen(next);
  };

  const copy = () => {
    navigator.clipboard.writeText(password);
    toast('Password copied!', 'success');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Password Generator</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="generator-output">{password}</div>

        <div className="strength-bar" style={{ marginTop: 10 }}>
          <div className="strength-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
        </div>
        <div className="text-sm mt-1" style={{ color: strength.color }}>{strength.label}</div>

        <div className="flex gap-2 mt-2" style={{ marginTop: 14 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => regen()}>
            <RefreshIcon /> Regenerate
          </button>
          <button className="btn btn-secondary" onClick={copy}>
            <CopyIcon /> Copy
          </button>
          {onUse && (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onUse(password); onClose(); }}>
              Use this
            </button>
          )}
        </div>

        <div className="divider" />

        <div className="field">
          <label>Length — {opts.length} characters</label>
          <input
            type="range" min={8} max={64}
            value={opts.length}
            onChange={e => setOpt('length', +e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['upper', 'Uppercase (A–Z)'],
            ['lower', 'Lowercase (a–z)'],
            ['digits', 'Numbers (0–9)'],
            ['symbols', 'Symbols (!@#…)'],
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
              <input
                type="checkbox"
                checked={opts[key]}
                onChange={e => setOpt(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
