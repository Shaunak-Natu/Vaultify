import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import EntryModal from '../components/EntryModal';
import EntryDetail from '../components/EntryDetail';
import PasswordGenerator from '../components/PasswordGenerator';
import ImportExportModal from '../components/ImportExportModal';
import {
  LockIcon, PlusIcon, SearchIcon, StarIcon, KeyIcon, NoteIcon,
  ShieldIcon, LogOutIcon, DownloadIcon, FolderIcon, CloseIcon
} from '../components/Icons';

const TYPE_ICON = { password: '🔑', note: '📝' };

function Sidebar({ filter, setFilter, categories, counts, onNew, onExport, onLogout, lockMinutes, username, mobileOpen, onMobileClose }) {
  const items = [
    { id: 'all', label: 'All Entries', icon: <ShieldIcon size={14} /> },
    { id: 'fav', label: 'Favourites',  icon: <StarIcon size={14} /> },
    { id: 'password', label: 'Passwords', icon: <KeyIcon size={14} /> },
    { id: 'note', label: 'Secure Notes', icon: <NoteIcon size={14} /> },
  ];

  const sidebarContent = (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><LockIcon size={16} /></div>
        <span className="sidebar-logo-text">Vaultify</span>
      </div>

      <button className="btn btn-primary btn-sm" onClick={onNew} style={{ margin: '0 12px 12px', justifyContent: 'center' }}>
        <PlusIcon /> New Entry
      </button>

      <div className="sidebar-section">Library</div>
      {items.map(item => (
        <button
          key={item.id}
          className={`sidebar-item ${filter.view === item.id ? 'active' : ''}`}
          onClick={() => { setFilter({ view: item.id, category: null }); onMobileClose?.(); }}
        >
          {item.icon} {item.label}
          {counts[item.id] != null && <span className="count">{counts[item.id]}</span>}
        </button>
      ))}

      {categories.length > 0 && (
        <>
          <div className="sidebar-section">Categories</div>
          {categories.map(cat => (
            <button
              key={cat}
              className={`sidebar-item ${filter.category === cat ? 'active' : ''}`}
              onClick={() => { setFilter({ view: 'cat', category: cat }); onMobileClose?.(); }}
            >
              <FolderIcon size={13} /> {cat}
            </button>
          ))}
        </>
      )}

      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, padding: '0 4px' }}>
          👤 {username} · 🔒 auto-locks in {lockMinutes}m
        </div>
        <button className="sidebar-item" style={{ width: '100%', color: 'var(--text-secondary)' }} onClick={onExport}>
          <DownloadIcon size={13} /> Import / Export
        </button>
        <button className="sidebar-item" style={{ width: '100%', color: 'var(--danger)' }} onClick={onLogout}>
          <LogOutIcon size={13} /> Lock Vault
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar desktop-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay" onClick={onMobileClose}>
          <aside className="sidebar mobile-drawer" onClick={e => e.stopPropagation()}>
            <button className="btn btn-ghost btn-icon" onClick={onMobileClose} style={{ position: 'absolute', top: 14, right: 14 }}>
              <CloseIcon size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default function VaultPage() {
  const { user, logout, lockMinutes } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ view: 'all', category: null });
  const [selectedId, setSelectedId] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [showIE, setShowIE] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadEntries = useCallback(async () => {
    try {
      const data = await api.listEntries();
      setEntries(data);
    } catch (err) {
      toast('Failed to load vault: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const categories = useMemo(() => [...new Set(entries.map(e => e.category))].sort(), [entries]);

  const counts = useMemo(() => ({
    all: entries.length,
    fav: entries.filter(e => e.isFavorite).length,
    password: entries.filter(e => e.type === 'password').length,
    note: entries.filter(e => e.type === 'note').length,
  }), [entries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter.view === 'fav') list = list.filter(e => e.isFavorite);
    else if (filter.view === 'password') list = list.filter(e => e.type === 'password');
    else if (filter.view === 'note') list = list.filter(e => e.type === 'note');
    else if (filter.view === 'cat') list = list.filter(e => e.category === filter.category);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.username || '').toLowerCase().includes(q) ||
        (e.url || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, filter, search]);

  async function selectEntry(id) {
    if (selectedId === id) {
      setSelectedId(null);
      setDetailEntry(null);
      return;
    }
    setSelectedId(id);
    setDetailLoading(true);
    setMobileDetailOpen(true);
    try {
      const full = await api.getEntry(id);
      setDetailEntry(full);
    } catch (err) {
      toast('Failed to load entry: ' + err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveEntry(form) {
    setSaving(true);
    try {
      if (editEntry?.id) {
        await api.updateEntry(editEntry.id, form);
        toast('Entry updated.', 'success');
        // Refresh detail if currently selected
        if (selectedId === editEntry.id) {
          const full = await api.getEntry(editEntry.id);
          setDetailEntry(full);
        }
      } else {
        await api.createEntry(form);
        toast('Entry added to vault.', 'success');
      }
      await loadEntries();
      setShowModal(false);
      setEditEntry(null);
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id) {
    try {
      await api.deleteEntry(id);
      toast('Entry deleted.', 'success');
      setSelectedId(null);
      setDetailEntry(null);
      setMobileDetailOpen(false);
      await loadEntries();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    } finally {
      setDeleteConfirm(null);
    }
  }

  async function toggleFav(id) {
    try {
      const res = await api.toggleFavorite(id);
      setEntries(p => p.map(e => e.id === id ? { ...e, isFavorite: res.isFavorite } : e));
      if (detailEntry?.id === id) setDetailEntry(p => ({ ...p, isFavorite: res.isFavorite }));
    } catch {}
  }

  const openNew = () => { setEditEntry(null); setShowModal(true); };
  const openEdit = () => { setEditEntry(detailEntry); setShowModal(true); };

  return (
    <div className="app-layout">
      <Sidebar
        filter={filter} setFilter={setFilter}
        categories={categories} counts={counts}
        onNew={openNew}
        onExport={() => setShowIE(true)}
        onLogout={logout}
        lockMinutes={lockMinutes}
        username={user?.username}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        {/* Top bar */}
        <div className="topbar">
          {/* Hamburger for mobile */}
          <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="search-wrap">
            <span className="search-icon"><SearchIcon /></span>
            <input
              className="search-input"
              type="text"
              placeholder="Search vault…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => setShowGen(true)} title="Password Generator" style={{ flexShrink: 0 }}>
            <KeyIcon size={13} />
            <span className="hide-mobile">Generator</span>
          </button>
          <button className="btn btn-primary btn-sm mobile-new-btn" onClick={openNew} style={{ flexShrink: 0 }}>
            <PlusIcon size={13} />
            <span className="hide-mobile">New</span>
          </button>
        </div>

        {/* List + Detail split */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Entry list */}
          <div className="vault-list" style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div className="empty-state">
                <p style={{ color: 'var(--text-muted)' }}>Loading vault…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <LockIcon size={40} />
                <h3>{search ? 'No results found' : 'Your vault is empty'}</h3>
                <p>{search ? 'Try a different search term.' : 'Add your first entry with the New Entry button.'}</p>
                {!search && (
                  <button className="btn btn-primary" onClick={openNew}>
                    <PlusIcon /> Add Entry
                  </button>
                )}
              </div>
            ) : (
              filtered.map(entry => (
                <div
                  key={entry.id}
                  className={`entry-row ${selectedId === entry.id ? 'selected' : ''}`}
                  onClick={() => selectEntry(entry.id)}
                >
                  <div className="entry-icon">{(entry.title || '?')[0].toUpperCase()}</div>
                  <div className="entry-info">
                    <div className="entry-title">{entry.title}</div>
                    <div className="entry-subtitle">
                      {entry.username || entry.url || entry.category || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {entry.isFavorite && <StarIcon size={12} filled style={{ color: '#d29922' }} />}
                    <span style={{ fontSize: 16 }}>{TYPE_ICON[entry.type]}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail panel — desktop inline */}
          {selectedId && (
            <div className="detail-panel desktop-detail">
              {detailLoading ? (
                <div className="empty-state"><p>Loading…</p></div>
              ) : detailEntry ? (
                <EntryDetail
                  entry={detailEntry}
                  onEdit={openEdit}
                  onDelete={() => setDeleteConfirm(detailEntry.id)}
                  onToggleFav={() => toggleFav(detailEntry.id)}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail drawer */}
      {mobileDetailOpen && selectedId && (
        <div className="mobile-drawer-overlay" onClick={() => { setMobileDetailOpen(false); setSelectedId(null); }}>
          <div className="mobile-detail-drawer" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-ghost btn-icon" onClick={() => { setMobileDetailOpen(false); setSelectedId(null); }}>
                <CloseIcon />
              </button>
            </div>
            {detailLoading ? (
              <div className="empty-state"><p>Loading…</p></div>
            ) : detailEntry ? (
              <EntryDetail
                entry={detailEntry}
                onEdit={() => { setMobileDetailOpen(false); openEdit(); }}
                onDelete={() => setDeleteConfirm(detailEntry.id)}
                onToggleFav={() => toggleFav(detailEntry.id)}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 12 }}>Delete Entry?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
              This will permanently remove the entry from your vault. This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-4" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => deleteEntry(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <EntryModal
          initial={editEntry}
          onSave={saveEntry}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
          saving={saving}
        />
      )}

      {showGen && <PasswordGenerator onClose={() => setShowGen(false)} />}

      {showIE && (
        <ImportExportModal
          onClose={() => setShowIE(false)}
          onImported={loadEntries}
        />
      )}
    </div>
  );
}
