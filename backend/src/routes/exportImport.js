const express = require('express');
const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authMiddleware);

// GET /api/export/json — full vault export as JSON
router.get('/json', (req, res) => {
  const rows = db.prepare('SELECT * FROM vault_entries WHERE user_id = ?').all(req.user.id);
  const entries = rows.map(row => {
    let password = null, notes = null;
    try { password = row.password_enc ? decrypt(row.password_enc, req.user.vaultKey) : null; } catch {}
    try { notes = row.notes_enc ? decrypt(row.notes_enc, req.user.vaultKey) : null; } catch {}
    return { type: row.type, title: row.title, username: row.username, password, url: row.url, notes, category: row.category };
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="vaultify-export-${Date.now()}.json"`);
  res.json({ exported_at: new Date().toISOString(), entries });
});

// GET /api/export/csv — export as CSV
router.get('/csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM vault_entries WHERE user_id = ?').all(req.user.id);

  const escape = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
  const header = 'type,title,username,password,url,notes,category\n';
  const lines = rows.map(row => {
    let password = '', notes = '';
    try { password = row.password_enc ? decrypt(row.password_enc, req.user.vaultKey) : ''; } catch {}
    try { notes = row.notes_enc ? decrypt(row.notes_enc, req.user.vaultKey) : ''; } catch {}
    return [row.type, row.title, row.username, password, row.url, notes, row.category].map(escape).join(',');
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="vaultify-export-${Date.now()}.csv"`);
  res.send(header + lines.join('\n'));
});

// POST /api/import/json
router.post('/json', express.json({ limit: '5mb' }), (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Invalid JSON structure. Expected { entries: [...] }' });

  let imported = 0, skipped = 0;
  const insert = db.prepare(
    'INSERT INTO vault_entries (id, user_id, type, title, username, password_enc, url, notes_enc, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const importAll = db.transaction(() => {
    for (const e of entries) {
      if (!e.title) { skipped++; continue; }
      try {
        const password_enc = e.password ? encrypt(String(e.password), req.user.vaultKey) : null;
        const notes_enc = e.notes ? encrypt(String(e.notes), req.user.vaultKey) : null;
        insert.run(uuidv4(), req.user.id, e.type || 'password', e.title, e.username || null, password_enc, e.url || null, notes_enc, e.category || 'General');
        imported++;
      } catch { skipped++; }
    }
  });

  importAll();
  res.json({ imported, skipped });
});

// POST /api/import/csv  — raw CSV body, text/plain or text/csv
router.post('/csv', express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }), (req, res) => {
  const lines = req.body.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: 'CSV must have a header row and at least one data row.' });

  const parseRow = line => {
    const cols = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { cols.push(cur); cur = ''; }
      else { cur += c; }
    }
    cols.push(cur);
    return cols.map(c => c.replace(/""/g, '"'));
  };

  const header = parseRow(lines[0]).map(h => h.toLowerCase());
  const idx = f => header.indexOf(f);

  let imported = 0, skipped = 0;
  const insert = db.prepare(
    'INSERT INTO vault_entries (id, user_id, type, title, username, password_enc, url, notes_enc, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const importAll = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      const title = idx('title') >= 0 ? cols[idx('title')] : null;
      // also handle Bitwarden/1Password common export formats
      const effectiveTitle = title || (idx('name') >= 0 ? cols[idx('name')] : null);
      if (!effectiveTitle) { skipped++; continue; }
      try {
        const rawPass = idx('password') >= 0 ? cols[idx('password')] : '';
        const rawNotes = idx('notes') >= 0 ? cols[idx('notes')] : '';
        const password_enc = rawPass ? encrypt(rawPass, req.user.vaultKey) : null;
        const notes_enc = rawNotes ? encrypt(rawNotes, req.user.vaultKey) : null;
        insert.run(
          uuidv4(), req.user.id,
          idx('type') >= 0 ? (cols[idx('type')] || 'password') : 'password',
          effectiveTitle,
          idx('username') >= 0 ? (cols[idx('username')] || null) : null,
          password_enc,
          idx('url') >= 0 ? (cols[idx('url')] || null) : null,
          notes_enc,
          idx('category') >= 0 ? (cols[idx('category')] || 'General') : 'General'
        );
        imported++;
      } catch { skipped++; }
    }
  });

  importAll();
  res.json({ imported, skipped });
});

module.exports = router;
