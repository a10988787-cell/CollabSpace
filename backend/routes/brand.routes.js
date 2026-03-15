// backend/routes/brand.routes.js
const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const { protect, restrict } = require('../middleware/auth.middleware');
const validate              = require('../middleware/validate.middleware');
const ctrl                  = require('../controllers/brand.controller');

// Optional email service — won't crash if services/ folder doesn't exist yet
let emailSvc = null;
let User     = null;
try {
  emailSvc = require('../services/email.service');
  User     = require('../models/User');
} catch (_) {
  console.warn('[brand.routes] email.service not found — collaboration invite emails disabled.');
}

/* ── All brand routes require: authenticated + brand or admin role ──────── */
router.use(protect);
router.use(restrict('brand', 'admin'));

/* ════════════════════════════════════════════════════════════════════════════
   BRAND PROFILE
   GET    /api/brand/profile
   PUT    /api/brand/profile
   DELETE /api/brand/profile
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/profile', ctrl.getProfile);
router.put   ('/profile', ctrl.updateProfile);
router.delete('/profile', ctrl.deleteProfile);

/* ════════════════════════════════════════════════════════════════════════════
   CAMPAIGNS
   GET    /api/brand/campaigns          — list (status filter + pagination)
   GET    /api/brand/campaigns/:id      — single
   POST   /api/brand/campaigns          — create
   PUT    /api/brand/campaigns/:id      — update
   DELETE /api/brand/campaigns/:id      — soft delete
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/campaigns',     ctrl.getCampaigns);
router.get   ('/campaigns/:id', ctrl.getCampaign);
router.post  ('/campaigns', [
  body('title')    .trim().notEmpty().withMessage('Campaign title is required'),
  body('budget')   .isNumeric()      .withMessage('Budget must be a number'),
  body('startDate').isISO8601()      .withMessage('Valid start date required'),
  body('endDate')  .isISO8601()      .withMessage('Valid end date required'),
], validate, ctrl.createCampaign);
router.put   ('/campaigns/:id', ctrl.updateCampaign);
router.delete('/campaigns/:id', ctrl.deleteCampaign);

/* ════════════════════════════════════════════════════════════════════════════
   COLLABORATIONS
   GET    /api/brand/collaborations
   POST   /api/brand/collaborations     — also triggers invite email if available
   PUT    /api/brand/collaborations/:id
   DELETE /api/brand/collaborations/:id
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/collaborations',     ctrl.getCollaborations);

router.post  ('/collaborations', async (req, res, next) => {
  // Intercept response to fire invitation email after successful creation
  if (!emailSvc || !User) {
    return ctrl.createCollaboration(req, res, next);
  }

  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    res.json = originalJson;
    if (body?.success && body?.collaboration) {
      try {
        const creator = await User.findById(body.collaboration.creator)
          .select('firstName email');
        if (creator) {
          emailSvc
            .sendCollaborationInvite(creator, req.user, body.collaboration)
            .catch(() => {});
        }
      } catch (_) { /* email failure must never break the response */ }
    }
    return originalJson(body);
  };

  return ctrl.createCollaboration(req, res, next);
});

router.put   ('/collaborations/:id', ctrl.updateCollaboration);
router.delete('/collaborations/:id', ctrl.deleteCollaboration);

/* ════════════════════════════════════════════════════════════════════════════
   BUDGET
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/budgets',     ctrl.getBudgets);
router.post  ('/budgets',     ctrl.createBudget);
router.put   ('/budgets/:id', ctrl.updateBudget);
router.delete('/budgets/:id', ctrl.deleteBudget);

/* ════════════════════════════════════════════════════════════════════════════
   ASSETS  (URL-based storage — see /api/brand/assets/upload for file upload)
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/assets',     ctrl.getAssets);
router.post  ('/assets',     ctrl.createAsset);
router.put   ('/assets/:id', ctrl.updateAsset);
router.delete('/assets/:id', ctrl.deleteAsset);

/* ── File upload via Multer ─────────────────────────────────────────────── */
// Multer is optional — only mounted if multer is installed
try {
  const multer = require('multer');
  const path   = require('path');
  const fs     = require('fs');

  // Store files in backend/uploads/assets/
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'assets');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename:    (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  const upload = multer({
    storage,
    limits:      { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter:  (_req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|webp|svg|pdf|mp4|mov|avi|zip|doc|docx/;
      const ext     = path.extname(file.originalname).toLowerCase().replace('.', '');
      cb(null, allowed.test(ext));
    },
  });

  /* POST /api/brand/assets/upload — multipart file upload */
  router.post('/assets/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided.' });
      }

      // Build public URL — assumes server serves /uploads statically
      const fileUrl  = `/uploads/assets/${req.file.filename}`;
      const name     = req.body.name     || req.file.originalname;
      const type     = req.body.type     || 'other';
      const mimeType = req.file.mimetype;
      const size     = req.file.size;

      // Save asset record to database via controller logic
      req.body = { name, type, url: fileUrl, mimeType, size };

      return ctrl.createAsset(req, res);
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  console.log('[brand.routes] Multer file upload enabled at POST /api/brand/assets/upload');
} catch (_) {
  console.warn('[brand.routes] multer not installed — run: npm install multer');
  console.warn('[brand.routes] File upload route POST /api/brand/assets/upload is disabled.');
}

/* ════════════════════════════════════════════════════════════════════════════
   TEAM MEMBERS
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/team',        ctrl.getTeam);
router.post  ('/team',        ctrl.addTeamMember);
router.put   ('/team/:id',    ctrl.updateTeamMember);
router.delete('/team/:id',    ctrl.removeTeamMember);

/* ════════════════════════════════════════════════════════════════════════════
   ANALYTICS
   ════════════════════════════════════════════════════════════════════════════ */
router.get('/analytics', ctrl.getAnalytics);

/* ════════════════════════════════════════════════════════════════════════════
   CONTRACTS
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/contracts',     ctrl.getContracts);
router.post  ('/contracts',     ctrl.createContract);
router.put   ('/contracts/:id', ctrl.updateContract);
router.delete('/contracts/:id', ctrl.deleteContract);

/* ════════════════════════════════════════════════════════════════════════════
   PAYMENTS / INVOICES
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/payments',     ctrl.getPayments);
router.post  ('/payments',     ctrl.createPayment);
router.put   ('/payments/:id', ctrl.updatePayment);
router.delete('/payments/:id', ctrl.deletePayment);

module.exports = router;