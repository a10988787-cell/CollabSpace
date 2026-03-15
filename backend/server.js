/* ═══════════════════════════════════════════════════════════════════════════
   CollabSpace — Express + MongoDB Backend
   server.js | Entry Point
   ═══════════════════════════════════════════════════════════════════════════ */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

/* ─── Local modules ──────────────────────────────────────────────────────────
   Folder structure expected:
   backend/
   ├── server.js           ← YOU ARE HERE
   ├── .env
   ├── package.json
   ├── config/
   │   └── db.js
   ├── models/
   │   └── User.js
   ├── middleware/
   │   ├── auth.js
   │   └── validate.js
   └── routes/
       ├── auth.routes.js
       └── users.routes.js
   ─────────────────────────────────────────────────────────────────────────── */
const connectDB   = require('./config/db');
const authRoutes  = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');

/* ─── Connect to MongoDB ─────────────────────────────────────────────────── */
connectDB();

/* ─── App Setup ──────────────────────────────────────────────────────────── */
const app = express();

/* ─── Security Middleware ────────────────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
}));

/* ─── Body Parsing ───────────────────────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

/* ─── Request Logging ────────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/* ─── Health Check ───────────────────────────────────────────────────────── */
app.get('/health', (req, res) => {
  res.status(200).json({
    success:   true,
    status:    'healthy',
    service:   'CollabSpace API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
});

/* ─── API Routes ─────────────────────────────────────────────────────────── */
app.use('/api/auth',      authRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/campaigns', (req, res) => res.json({ message: 'Campaigns route — coming soon' }));
app.use('/api/brands',    (req, res) => res.json({ message: 'Brands route — coming soon' }));
app.use('/api/content',   (req, res) => res.json({ message: 'Content route — coming soon' }));

/* ─── 404 Handler ────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ─── Global Error Handler ───────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(422).json({ success: false, message: messages[0], errors: messages });
  }
  if (err.name === 'CastError')         return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token.' });
  if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired.' });
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message || 'Internal server error',
  });
});

/* ─── Start Server ───────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀  CollabSpace API running on http://localhost:${PORT}`);
  console.log(`📦  Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️   MongoDB URI  : ${process.env.MONGO_URI}\n`);
});

/* ─── Graceful Shutdown ──────────────────────────────────────────────────── */
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅  MongoDB connection closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;