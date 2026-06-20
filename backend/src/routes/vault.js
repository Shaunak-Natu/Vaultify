const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function encryptEntry(entry, key) {
  return {
    password_enc: entry.password ? encrypt(entry.password, key) : null,
    notes_enc: entry.notes ? encrypt(entry.notes, key) : null,
  };
}

function decryptEntry(row, key) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    username: row.username,
    password: row.password_enc ? decrypt(row.password_enc, key) : null,
    url: row.url,
    notes: row.notes_enc ? decrypt(row.notes_enc, key) : null,
    category: row.category,
    isFavorite: !!row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/vault — list all entries (passwords stay encrypted, not returned)
router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT id, type, title, username, url, category, is_favorite, created_at, updated_at FROM vault_entries WHERE user_id = ? ORDER BY title COLLATE NOCASE'
  ).all(req.user.id);

  const entries = rows.map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    username: r.username,
    url: r.url,
    category: r.category,
    isFavorite: !!r.is_favorite,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  res.json(entries);
});

// GET /api/vault/:id — fetch single entry with decrypted secrets
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM vault_entries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Entry not found.' });
  try {
    res.json(decryptEntry(row, req.user.vaultKey));
  } catch {
    res.status(500).json({ error: 'Failed to decrypt entry. Vault key mismatch.' });
  }
});

// POST /api/vault — create entry
router.post('/', (req, res) => {
  const { type = 'password', title, username, password, url, notes, category = 'General', isFavorite = false } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const { password_enc, notes_enc } = encryptEntry({ password, notes }, req.user.vaultKey);
  const id = uuidv4();

  db.prepare(
    'INSERT INTO vault_entries (id, user_id, type, title, username, password_enc, url, notes_enc, category, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, type, title, username || null, password_enc, url || null, notes_enc, category, isFavorite ? 1 : 0);

  res.status(201).json({ id });
});

// PUT /api/vault/:id — update entry
router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM vault_entries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Entry not found.' });

  const { type, title, username, password, url, notes, category, isFavorite } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const { password_enc, notes_enc } = encryptEntry({ password, notes }, req.user.vaultKey);

  db.prepare(
    `UPDATE vault_entries SET type=?, title=?, username=?, password_enc=?, url=?, notes_enc=?, category=?, is_favorite=?, updated_at=strftime('%s','now') WHERE id=? AND user_id=?`
  ).run(type, title, username || null, password_enc, url || null, notes_enc, category || 'General', isFavorite ? 1 : 0, req.params.id, req.user.id);

  res.json({ success: true });
});

// PATCH /api/vault/:id/favorite — toggle favorite
router.patch('/:id/favorite', (req, res) => {
  const row = db.prepare('SELECT is_favorite FROM vault_entries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Entry not found.' });
  const next = row.is_favorite ? 0 : 1;
  db.prepare('UPDATE vault_entries SET is_favorite=? WHERE id=? AND user_id=?').run(next, req.params.id, req.user.id);
  res.json({ isFavorite: !!next });
});

// DELETE /api/vault/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM vault_entries WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found.' });
  res.json({ success: true });
});

// GET /api/vault/meta/categories — list distinct categories
router.get('/meta/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM vault_entries WHERE user_id = ? ORDER BY category').all(req.user.id);
  res.json(rows.map(r => r.category));
});

module.exports = router;
