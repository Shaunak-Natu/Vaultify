import { useState } from 'react';
import { EyeIcon, EyeOffIcon, CopyIcon, EditIcon, TrashIcon, StarIcon, GlobeIcon } from './Icons';
import { useToast } from '../context/ToastContext';
import { getStrength } from '../utils/password';

function CopyField({ label, value, mono = false, secret = false }) {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  if (!value) return null;

  const fallbackCopy = () => {
    const el = document.createElement('textarea');
    el.value = value;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand('copy');
      toast(`${label} copied!`, 'success');
    } catch {
      toast('Could not copy — please copy manually.', 'error');
    }
    document.body.removeChild(el);
  };

  const copy = () => {
    // navigator.clipboard requires HTTPS or localhost.
    // Fall back to execCommand for plain HTTP (LAN IP access).
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value)
        .then(() => toast(`${label} copied!`, 'success'))
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
        <span style={{
          flex: 1,
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          fontSize: 13,
          letterSpacing: mono ? '0.02em' : 'normal',
          color: 'var(--text-primary)',
          wordBreak: 'break-all',
          filter: secret && !visible ? 'blur(4px)' : 'none',
          userSelect: secret && !visible ? 'none' : 'auto',
          transition: 'filter 0.2s',
        }}>
          {value}
        </span>
        {secret && (
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setVisible(v => !v)}
            title={visible ? 'Hide' : 'Reveal'}
            style={{ flexShrink: 0 }}
          >
            {visible ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
          </button>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={copy} title={`Copy ${label}`} style={{ flexShrink: 0 }}>
          <CopyIcon size={13} />
        </button>
      </div>
    </div>
  );
}

export default function EntryDetail({ entry, onEdit, onDelete, onToggleFav }) {
  const strength = getStrength(entry.password || '');

  if (!entry) return null;

  const initial = (entry.title || '?')[0].toUpperCase();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div className="entry-icon" style={{ width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{entry.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            <span className="badge">{entry.category}</span>
            {' '}
            <span className="badge" style={{ marginLeft: 4 }}>{entry.type === 'note' ? '📝 Note' : '🔑 Login'}</span>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          style={{ color: entry.isFavorite ? '#d29922' : 'var(--text-muted)', flexShrink: 0 }}
          onClick={onToggleFav}
          title={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon size={16} filled={entry.isFavorite} />
        </button>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflow: 'hidden auto' }}>
        <CopyField label="Username / Email" value={entry.username} />
        <CopyField label="Password" value={entry.password} mono secret />

        {entry.password && (
          <div style={{ marginBottom: 14 }}>
            <div className="strength-bar">
              <div className="strength-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
            </div>
            <div className="text-sm mt-1" style={{ color: strength.color }}>{strength.label} password</div>
          </div>
        )}

        {entry.url && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Website</div>
            <a
              href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 13, textDecoration: 'none', wordBreak: 'break-all' }}
            >
              <GlobeIcon size={13} />
              {entry.url}
            </a>
          </div>
        )}

        <CopyField label="Notes" value={entry.notes} secret={entry.type === 'note'} />
      </div>

      {/* Actions */}
      <div className="divider" />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onEdit}>
          <EditIcon /> Edit
        </button>
        <button className="btn btn-danger" style={{ justifyContent: 'center' }} onClick={onDelete} title="Delete entry">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
