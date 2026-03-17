// backend/server.js
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');

const connectDB      = require('./config/db');
const authRoutes     = require('./routes/auth.routes');
const adminRoutes    = require('./routes/admin.routes');
const usersRoutes    = require('./routes/users.routes');
const brandRoutes    = require('./routes/brand.routes');
const creatorRoutes  = require('./routes/creator.routes');
const publicRoutes             = require('./routes/public.routes');
const { statsRouter }          = require('./routes/public.routes');

connectDB();

const app = express();

/* ── Security ───────────────────────────────────────────────────────── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin:         process.env.CLIENT_URL || 'http://localhost:4200',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

app.use(rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
}));

/* ── Body parsing ───────────────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Logging ────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

/* ── Static uploads ─────────────────────────────────────────────────── */
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

/* ── Health check ───────────────────────────────────────────────────── */
app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'healthy', service: 'CollabSpace API', version: '1.0.0' })
);

/* ════════════════════════════════════════════════════════════════════
   ROUTES
   ════════════════════════════════════════════════════════════════════ */
app.use('/api/auth',    authRoutes);
app.use('/api/admin',   adminRoutes);  // All 15 admin CRUD modules
app.use('/api/users',   usersRoutes);
app.use('/api/brand',   brandRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api',         publicRoutes);   // /api/creators/:id, /api/collab-posts
app.use('/api/stats',   statsRouter);     // /api/stats — public homepage data (no auth)

/* ── 404 ─────────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ── Global error handler ───────────────────────────────────────────── */
app.use((error, req, res, next) => {
  console.error('[Error]', error.message);

  if (error.name === 'ValidationError') {
    const msgs = Object.values(error.errors).map(e => e.message);
    return res.status(422).json({ success: false, message: msgs[0] });
  }
  if (error.name === 'CastError')
    return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists.` });
  }
  if (error.name === 'JsonWebTokenError')
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  if (error.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Session expired.' });
  if (error.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ success: false, message: 'File too large. Max 100MB.' });

  const status  = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred.' : error.message;
  res.status(status).json({ success: false, message });
});

/* ── Start ──────────────────────────────────────────────────────────── */
const PORT   = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀  CollabSpace API → http://localhost:${PORT}`);
  console.log(`🌍  Env      : ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦  Routes   : /api/auth | /api/users | /api/brand | /api/creator`);
  console.log(`📁  Uploads  : http://localhost:${PORT}/uploads/assets/<filename>`);
  console.log(`💚  Health   : http://localhost:${PORT}/health\n`);
});

const shutdown = async (sig) => {
  console.log(`\n${sig} — shutting down…`);
  server.close(async () => {
    await require('mongoose').connection.close();
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;