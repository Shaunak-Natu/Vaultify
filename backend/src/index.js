const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const vaultRoutes = require('./routes/vault');
const exportImportRoutes = require('./routes/exportImport');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS — only allow the frontend origin
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded.' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vault', apiLimiter, vaultRoutes);
app.use('/api/export', apiLimiter, exportImportRoutes);
app.use('/api/import', apiLimiter, exportImportRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// 404 for unknown API routes
app.use('/api', (_, res) => res.status(404).json({ error: 'Not found.' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vaultify API running on port ${PORT}`);
});

module.exports = app;
