import { useState } from 'react';
import { EyeIcon, EyeOffIcon, KeyIcon, CloseIcon, RefreshIcon } from './Icons';
import { getStrength } from '../utils/password';
import PasswordGenerator from './PasswordGenerator';

const CATEGORIES = ['General', 'Work', 'Finance', 'Social', 'Shopping', 'Email', 'Other'];
const TYPES = [
  { value: 'password', label: '🔑 Login / Password' },
  { value: 'note',     label: '📝 Secure Note' },
];

export default function EntryModal({ initial, onSave, onClose, saving }) {
  const isNew = !initial?.id;
  const [form, setForm] = useState({
    type:     initial?.type     || 'password',
    title:    initial?.title    || '',
    username: initial?.username || '',
    password: initial?.password || '',
    url:      initial?.url      || '',
    notes:    initial?.notes    || '',
    category: initial?.category || 'General',
    isFavorite: initial?.isFavorite || false,
  });
  const [showPw, setShowPw] = useState(false);
  const [showGen, setShowGen] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const strength = getStrength(form.password);

  const submit = e => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 480 }}>
          <div className="modal-header">
            <h2>{isNew ? 'New Entry' : 'Edit Entry'}</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
          </div>

          <form onSubmit={submit}>
            {/* Type selector */}
            <div className="field">
              <label>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPES.map(t => (
                  <button
                    key={t.value} type="button"
                    className={`btn ${form.type === t.value ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                    onClick={() => setForm(p => ({ ...p, type: t.value }))}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Title *</label>
              <input className="input" type="text" placeholder="e.g. Gmail, Netflix, SSH Key…" value={form.title} onChange={set('title')} required autoFocus />
            </div>

            {form.type === 'password' && (
              <>
                <div className="field">
                  <label>Username / Email</label>
                  <input className="input" type="text" placeholder="user@example.com" autoComplete="off" value={form.username} onChange={set('username')} />
                </div>

                <div className="field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <input
                      className="input input-mono"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Enter or generate a password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={set('password')}
                    />
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
                      <button type="button" className="input-action" style={{ position: 'static', transform: 'none' }} onClick={() => setShowGen(true)} title="Generate password">
                        <KeyIcon size={14} />
                      </button>
                      <button type="button" className="input-action" style={{ position: 'static', transform: 'none' }} onClick={() => setShowPw(v => !v)}>
                        {showPw ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  {form.password && (
                    <div style={{ marginTop: 6 }}>
                      <div className="strength-bar">
                        <div className="strength-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
                      </div>
                      <div className="text-sm mt-1" style={{ color: strength.color }}>{strength.label}</div>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Website URL <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: "normal", color: "var(--text-muted)" }}>(optional)</span></label>
                  <input className="input" type="text" placeholder="https://example.com (optional)" value={form.url} onChange={set('url')} />
                </div>
              </>
            )}

            <div className="field">
              <label>Notes</label>
              <textarea
                className="input"
                rows={3}
                placeholder={form.type === 'note' ? 'Your secure note…' : 'Optional notes…'}
                value={form.notes}
                onChange={set('notes')}
                style={{ resize: 'vertical', minHeight: 72 }}
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Category</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex gap-2 mt-4" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
                {saving ? 'Saving…' : isNew ? 'Add to Vault' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showGen && (
        <PasswordGenerator
          onUse={pw => setForm(p => ({ ...p, password: pw }))}
          onClose={() => setShowGen(false)}
        />
      )}
    </>
  );
}
