// backend/server.js
// This is the COMPLETE updated file.
// Changes from your existing file (1776604002611_server.js):
//   1. Added contract:signed socket event (creator → brand real-time notification)
//   2. Added contract:new socket event (brand → creator real-time notification)
//   3. Added signed-contracts static directory creation
//   All previous code is preserved exactly.

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');
const http      = require('http');

const connectDB      = require('./config/db');
const authRoutes     = require('./routes/auth.routes');
const adminRoutes    = require('./routes/admin.routes');
const usersRoutes    = require('./routes/users.routes');
const brandRoutes    = require('./routes/brand.routes');
const creatorRoutes  = require('./routes/creator.routes');
const publicRoutes   = require('./routes/public.routes');
const paymentRoutes  = require('./routes/payment.routes');
const contractRoutes = require('./routes/contract.routes');
const { statsRouter } = require('./routes/public.routes');

connectDB();

const app    = express();
const server = http.createServer(app);

/* ════════════════════════════════════════════════════════════════════
   SOCKET.IO — Real-time messaging + contract notifications
   ════════════════════════════════════════════════════════════════════ */
let io = null;
try {
  const { Server } = require('socket.io');
  const jwt        = require('jsonwebtoken');
  const User       = require('./models/User');

  io = new Server(server, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:4200',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware — attach user to socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id || decoded._id)
                                .select('_id firstName lastName role');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (e) { next(new Error('Auth failed')); }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    socket.join(`user:${userId}`);
    console.log(`[Socket.IO] ${socket.user.firstName} connected`);

    // ── Join a thread room ──────────────────────────────────────────
    socket.on('join:thread', (threadId) => {
      socket.join(`thread:${threadId}`);
    });

    // ── Send a real-time message ────────────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content, tempId } = data;
        if (!receiverId || !content?.trim()) return;

        const { Message, CreatorNotification } = require('./models/CreatorModels');
        const tId = [userId, receiverId].sort().join('_');

        const msg = await Message.create({
          sender:   socket.user._id,
          receiver: receiverId,
          threadId: tId,
          content:  content.trim(),
        });
        await msg.populate('sender', 'firstName lastName avatar');
        const payload = { ...msg.toObject(), threadId: tId };

        io.to(`user:${userId}`).emit('message:new', payload);
        io.to(`user:${receiverId}`).emit('message:new', payload);
        io.to(`thread:${tId}`).emit('message:new', payload);

        CreatorNotification.create({
          recipient: receiverId,
          type:      'message',
          title:     'New Message',
          message:   `${socket.user.firstName} sent you a message.`,
          refId:     msg._id,
          refModel:  'Message',
        }).catch(() => {});

        socket.emit('message:sent', { tempId, message: payload });
      } catch (e) { socket.emit('message:error', { error: e.message }); }
    });

    // ── Typing indicators ──────────────────────────────────────────
    socket.on('typing:start', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:start', {
        userId, name: socket.user.firstName,
      });
    });
    socket.on('typing:stop', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:stop', { userId });
    });

    // ── Mark messages read ─────────────────────────────────────────
    socket.on('messages:read', async ({ threadId }) => {
      try {
        const { Message } = require('./models/CreatorModels');
        await Message.updateMany(
          { threadId, receiver: socket.user._id, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        socket.to(`thread:${threadId}`).emit('messages:read', { threadId, readBy: userId });
      } catch (_) {}
    });

    // ── Contract: creator notifies brand after signing ─────────────
    // Also handled server-side in contract.routes.js via req.app.get('io').
    // This socket event is a client-side fallback / supplement.
    socket.on('contract:signed', async ({ contractId }) => {
      try {
        const { CreatorContract, CreatorNotification } = require('./models/CreatorModels');
        const contract = await CreatorContract.findById(contractId);
        if (!contract?.brand) return;

        const brandId     = contract.brand.toString();
        const creatorName = `${socket.user.firstName} ${socket.user.lastName}`;

        io.to(`user:${brandId}`).emit('contract:signed', {
          contractId,
          title:       contract.title,
          creatorName,
          signedAt:    contract.signedAt,
          signedFileUrl: contract.signedFileUrl,
        });

        CreatorNotification.create({
          recipient: brandId,
          type:      'system',
          title:     '✍️ Contract Signed!',
          message:   `${creatorName} signed "${contract.title}".`,
          refId:     contract._id,
          refModel:  'CreatorContract',
          link:      '/dashboard/brand/contracts',
        }).catch(() => {});
      } catch (_) {}
    });

    // ── Contract: brand sends contract → notify creator ────────────
    // Triggered after POST /api/contracts/generate by the brand's component.
    socket.on('contract:send', async ({ contractId }) => {
      try {
        const { CreatorContract, CreatorNotification } = require('./models/CreatorModels');
        const contract = await CreatorContract.findById(contractId);
        if (!contract?.creator) return;

        const creatorId = contract.creator.toString();
        const brandName = socket.user.companyName ||
                          `${socket.user.firstName} ${socket.user.lastName}`;

        io.to(`user:${creatorId}`).emit('contract:new', {
          contractId,
          title:    contract.title,
          brandName,
          fileUrl:  contract.fileUrl,
        });

        CreatorNotification.create({
          recipient: creatorId,
          type:      'system',
          title:     '📄 New Contract to Sign',
          message:   `${brandName} sent you a contract: "${contract.title}".`,
          refId:     contract._id,
          refModel:  'CreatorContract',
          link:      '/dashboard/creator/contracts',
        }).catch(() => {});
      } catch (_) {}
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] ${socket.user.firstName} disconnected`);
    });
  });

  app.set('io', io);
  console.log('[Socket.IO] ✅  Real-time messaging + contracts enabled');
} catch (e) {
  console.warn('[Socket.IO] Not available:', e.message, '— Run: npm install socket.io');
}

/* ── Security ────────────────────────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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

/* ── Body parsing ─────────────────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Logging ──────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

/* ── Static uploads ───────────────────────────────────────────────────── */
const uploadsDir          = path.join(__dirname, 'uploads');
const contractsDir        = path.join(uploadsDir, 'contracts');
const signedContractsDir  = path.join(uploadsDir, 'signed-contracts');

if (!fs.existsSync(uploadsDir))         fs.mkdirSync(uploadsDir,         { recursive: true });
if (!fs.existsSync(contractsDir))       fs.mkdirSync(contractsDir,       { recursive: true });
if (!fs.existsSync(signedContractsDir)) fs.mkdirSync(signedContractsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

/* ── Health check ─────────────────────────────────────────────────────── */
app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'healthy', service: 'CollabSpace API', version: '2.0.0' })
);

/* ════════════════════════════════════════════════════════════════════
   ROUTES
   ════════════════════════════════════════════════════════════════════ */
app.use('/api/auth',      authRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/brand',     brandRoutes);
app.use('/api/creator',   creatorRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api',           publicRoutes);
app.use('/api/stats',     statsRouter);

/* ── 404 ──────────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ── Global error handler ─────────────────────────────────────────────── */
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

/* ── Start ────────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀  CollabSpace API  → http://localhost:${PORT}`);
  console.log(`🌍  Env             : ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦  Routes          : /api/auth | /api/users | /api/brand | /api/creator | /api/contracts`);
  console.log(`📁  Uploads         : http://localhost:${PORT}/uploads/`);
  console.log(`💚  Health          : http://localhost:${PORT}/health\n`);
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

console.log('KEY_ID:',     process.env.RAZORPAY_KEY_ID);
console.log('KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET);

module.exports = app;