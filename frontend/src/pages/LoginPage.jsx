import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LockIcon } from '../components/Icons';
import { getStrength } from '../utils/password';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState('login');  // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const strength = getStrength(form.password);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'register') {
      if (form.password !== form.confirm) { toast('Passwords do not match.', 'error'); return; }
      if (form.password.length < 12) { toast('Master password must be at least 12 characters.', 'error'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(form.username, form.password);
      else await register(form.username, form.password);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-lock-icon">
            <LockIcon size={26} />
          </div>
          <div>
            <div className="login-title">Vaultify</div>
            <div className="login-subtitle" style={{ textAlign: 'center' }}>
              {mode === 'login' ? 'Sign in to your vault' : 'Create your vault'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. alex"
              autoComplete="username"
              value={form.username}
              onChange={set('username')}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label>Master Password</label>
            <div className="input-wrap">
              <input
                className="input input-mono"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'At least 12 characters' : '••••••••••••'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={set('password')}
                required
              />
              <button type="button" className="input-action" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
            {mode === 'register' && form.password && (
              <div style={{ marginTop: 8 }}>
                <div className="strength-bar">
                  <div className="strength-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
                </div>
                <div className="text-sm" style={{ color: strength.color, marginTop: 4 }}>{strength.label}</div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Confirm Password</label>
              <input
                className="input input-mono"
                type={showPw ? 'text' : 'password'}
                placeholder="Repeat your password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set('confirm')}
                required
              />
            </div>
          )}

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Unlock Vault' : 'Create Vault'}
          </button>
        </form>

        <div className="divider" />

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          {mode === 'login' ? "Don't have a vault? " : 'Already have a vault? '}
          <button
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', padding: '2px 6px', color: 'var(--accent)' }}
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setForm({ username: '', password: '', confirm: '' }); }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </div>

        {mode === 'login' && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            🔒 Your vault auto-locks after inactivity
          </div>
        )}
      </div>
    </div>
  );
}
