// backend/routes/brand.routes.js
const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const { protect, restrict } = require('../middleware/auth.middleware');
const validate              = require('../middleware/validate.middleware');
const ctrl                  = require('../controllers/brand.controller');

// Models — loaded once at module level (prevents "cannot overwrite model" errors)
const User = require('../models/User');
const {
  CampaignApplication, CreatorProfile, SocialAccount,
  BrandInvitation, CreatorNotification,
} = require('../models/CreatorModels');

const creatorCtrl = require('../controllers/creator.controller');

// Optional email service
let emailSvc = null;
try { emailSvc = require('../services/email.service'); } catch (_) {
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

/* ════════════════════════════════════════════════════════════════════════════
   CREATOR APPLICATIONS  — brand views and responds to creator applications
   GET  /api/brand/applications            — all applications to brand's campaigns
   PATCH /api/brand/applications/:id       — accept or reject an application
   ════════════════════════════════════════════════════════════════════════════ */
router.get('/applications', async (req, res) => {
  try {
    const { status, campaignId } = req.query;

    // Get all campaigns belonging to this brand
    const brandCampaigns = await Campaign.find({ brand: req.user._id, isDeleted: false }).select('_id title');
    const campaignIds = brandCampaigns.map(c => c._id);

    const q = { campaign: { $in: campaignIds }, isDeleted: false };
    if (status)     q.status     = status;
    if (campaignId) q.campaign   = campaignId;

    const applications = await CampaignApplication.find(q)
      .populate('creator', 'firstName lastName email avatar bio platform')
      .populate('campaign', 'title budget platforms niche startDate endDate')
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/applications/:id', async (req, res) => {
  try {
    const { action, brandResponse } = req.body; // action: 'accept' | 'reject'

    const app = await CampaignApplication.findById(req.params.id)
      .populate('campaign', 'title brand _id');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });

    // Verify this application belongs to one of the brand's campaigns
    if (app.campaign?.brand?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be accept or reject' });
    }

    app.status       = action === 'accept' ? 'accepted' : 'rejected';
    app.brandResponse = brandResponse || '';
    app.respondedAt  = new Date();
    await app.save();

    // If accepted — create a Collaboration record so the creator can submit collab posts
    let collab = null;
    if (action === 'accept') {
      try {
        collab = await Collaboration.create({
          brand:    req.user._id,
          creator:  app.creator,
          campaign: app.campaign._id,
          status:   'active',
          amount:   app.priceQuote,
          deliverables: app.proposalMessage || '',
        });
      } catch (collabErr) {
        console.warn('[brand/applications] Collaboration create failed:', collabErr.message);
      }
    }

    // Notify creator
    await CreatorNotification.create({
      recipient: app.creator,
      type:      action === 'accept' ? 'application_update' : 'application_update',
      title:     action === 'accept' ? '🎉 Application Accepted!' : 'Application Update',
      message:   action === 'accept'
        ? `Your application for "${app.campaign?.title}" was accepted! Head to Collab Posts to upload your content.`
        : `Your application for "${app.campaign?.title}" was not accepted this time. ${brandResponse || ''}`,
      refId:     app._id,
      refModel:  'CampaignApplication',
      link:      '/dashboard/creator',
    });

    res.json({ success: true, application: app, collaboration: collab });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   CONTENT REVIEW — brand reviews submitted collab posts + pays creator
   GET    /api/brand/content-review
   PATCH  /api/brand/content-review/:id/review
   POST   /api/brand/content-review/:id/pay
   ════════════════════════════════════════════════════════════════════════════ */
router.get  ('/content-review',           creatorCtrl.getBrandCollabPosts);
router.patch('/content-review/:id/review',creatorCtrl.reviewCollabPost);
router.post ('/content-review/:id/pay',   creatorCtrl.payCollabPost);

/* ═══════════════════════════════════════════════════════
   EXPLORE CREATORS  GET /api/brand/creators
   Brands browse creator profiles - guaranteed to work
   since brand routes are always mounted at /api/brand
   ═══════════════════════════════════════════════════════ */
router.get('/creators', async (req, res) => {
  try {
    const User = require('../models/User');
    const { search, niche, platform, page = 1, limit = 12 } = req.query;
    const query = { role: 'creator', isActive: true };
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName:  new RegExp(search, 'i') },
        { bio:       new RegExp(search, 'i') },
        { platform:  new RegExp(search, 'i') },
      ];
    }
    if (platform) query.platform = new RegExp(platform, 'i');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-password').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);
    let enriched = users.map(u => u.toPublicJSON());
    try {
      const ids = enriched.map(u => u.id);
      const [profiles, socials] = await Promise.all([
        CreatorProfile.find({ owner: { $in: ids } }),
        SocialAccount.find({ creator: { $in: ids }, isActive: true }),
      ]);
      const profileMap = {}; profiles.forEach(p => { profileMap[p.owner.toString()] = p; });
      const socialMap  = {}; socials.forEach(s => {
        if (!socialMap[s.creator.toString()]) socialMap[s.creator.toString()] = [];
        socialMap[s.creator.toString()].push(s);
      });
      enriched = enriched.map(u => ({
        ...u,
        profile:        profileMap[u.id] || null,
        socials:        socialMap[u.id]  || [],
        totalFollowers: (socialMap[u.id] || []).reduce((sum, s) => sum + (s.followersCount || 0), 0),
        avgEngagement:  (socialMap[u.id] || []).length
          ? ((socialMap[u.id] || []).reduce((sum, s) => sum + (s.engagementRate || 0), 0) / socialMap[u.id].length).toFixed(1)
          : '0',
      }));
      if (niche) enriched = enriched.filter(u => u.profile?.niche === niche);
    } catch (_) {}
    res.json({ success: true, creators: enriched, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ═══════════════════════════════════════════════════════════════════
   BRAND INVITATIONS  — GET /api/brand/invitations
   Brand views all invitations they have sent to creators
   ═══════════════════════════════════════════════════════════════════ */
router.get('/invitations', async (req, res) => {
  try {
    const { status } = req.query;
    const q = { brand: req.user._id, isDeleted: false };
    if (status) q.status = status;
    const invitations = await BrandInvitation.find(q)
      .populate('creator', 'firstName lastName email avatar bio platform')
      .populate('campaign', 'title budget platforms niche')
      .sort({ createdAt: -1 });
    res.json({ success: true, invitations });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


module.exports = router;