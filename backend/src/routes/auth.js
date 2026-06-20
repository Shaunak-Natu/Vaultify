const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { deriveKey, generateSalt } = require('../utils/crypto');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_HOURS = parseInt(process.env.SESSION_HOURS || '8');

function issueToken(user, vaultKey) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      vaultKey: vaultKey.toString('base64'),
    },
    JWT_SECRET,
    { expiresIn: `${SESSION_HOURS}h` }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
  if (password.length < 12) return res.status(400).json({ error: 'Master password must be at least 12 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already taken.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const vaultSalt = generateSalt();
  const id = uuidv4();

  db.prepare('INSERT INTO users (id, username, password_hash, vault_salt) VALUES (?, ?, ?, ?)')
    .run(id, username, passwordHash, vaultSalt);

  const vaultKey = deriveKey(password, vaultSalt);
  const token = issueToken({ id, username }, vaultKey);

  res.status(201).json({ token, username });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  db.prepare('UPDATE users SET last_login = strftime(\'%s\',\'now\') WHERE id = ?').run(user.id);

  const vaultKey = deriveKey(password, user.vault_salt);
  const token = issueToken(user, vaultKey);

  res.json({ token, username: user.username });
});

// POST /api/auth/verify — lightweight check that current token is still valid
router.post('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ valid: false });
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    res.json({ valid: true, username: payload.username });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
