// backend/routes/creator.routes.js
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const { protect, restrict } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/creator.controller');

/* ── Multer setup ────────────────────────────────────────────────────── */
let upload = null;
try {
  const multer     = require('multer');
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'assets');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename:    (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|webp|svg|pdf|mp4|mov|avi|mkv|mp3|wav|zip|doc|docx/;
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      cb(null, allowed.test(ext));
    },
  });
} catch (_) {
  console.warn('[creator.routes] multer not installed — file uploads disabled.');
}

const single   = (field) => upload ? upload.single(field)      : (_req, _res, next) => next();
const multiple = (field, max) => upload ? upload.array(field, max) : (_req, _res, next) => next();

/* ── All creator routes require auth + creator/admin role ───────────── */
router.use(protect);
router.use(restrict('creator', 'admin'));

/* 1. PROFILE */
router.get   ('/profile',               ctrl.getProfile);
router.put   ('/profile', single('avatar'), ctrl.updateProfile);
router.delete('/profile',               ctrl.deleteProfile);

/* 2. SOCIAL ACCOUNTS */
router.get   ('/social',      ctrl.getSocialAccounts);
router.post  ('/social',      ctrl.addSocialAccount);
router.put   ('/social/:id',  ctrl.updateSocialAccount);
router.delete('/social/:id',  ctrl.deleteSocialAccount);

/* 3. PORTFOLIO */
router.get   ('/portfolio',                    ctrl.getPortfolio);
router.post  ('/portfolio', single('thumbnail'), ctrl.addPortfolioItem);
router.put   ('/portfolio/:id',                ctrl.updatePortfolioItem);
router.delete('/portfolio/:id',                ctrl.deletePortfolioItem);

/* 4. CAMPAIGN APPLICATIONS */
router.get   ('/applications',      ctrl.getApplications);
router.post  ('/applications',      ctrl.submitApplication);
router.put   ('/applications/:id',  ctrl.updateApplication);
router.delete('/applications/:id',  ctrl.withdrawApplication);

/* 5. COLLAB POSTS */
router.get   ('/collab-posts',                          ctrl.getCollabPosts);
router.post  ('/collab-posts', multiple('media', 10),   ctrl.createCollabPost);
router.post  ('/collab-posts/:id/submit',               ctrl.submitCollabPost);
router.put   ('/collab-posts/:id',                      ctrl.updateCollabPost);
router.delete('/collab-posts/:id',                      ctrl.deleteCollabPost);

/* 6. CONTENT LIBRARY */
router.get   ('/content',               ctrl.getContentLibrary);
router.post  ('/content', single('file'), ctrl.uploadContent);
router.put   ('/content/:id',           ctrl.updateContent);
router.delete('/content/:id',           ctrl.deleteContent);

/* 7. NOTIFICATIONS */
router.get   ('/notifications',               ctrl.getNotifications);
router.patch ('/notifications/mark-all-read', ctrl.markAllRead);
router.patch ('/notifications/:id/read',      ctrl.markNotificationRead);
router.delete('/notifications/:id',           ctrl.deleteNotification);

/* 8. PERFORMANCE ANALYTICS */
router.get   ('/analytics',      ctrl.getAnalytics);
router.put   ('/analytics',      ctrl.updateAnalytics);
router.delete('/analytics/:id',  ctrl.deleteAnalyticsReport);

/* 9. AUDIENCE INSIGHTS */
router.get   ('/audience',      ctrl.getAudienceInsights);
router.put   ('/audience',      ctrl.updateAudienceInsights);
router.delete('/audience/:id',  ctrl.deleteAudienceInsight);

/* 10. REVENUE */
router.get   ('/revenue',      ctrl.getRevenue);
router.post  ('/revenue',      ctrl.addRevenueEntry);
router.put   ('/revenue/:id',  ctrl.updateRevenueEntry);
router.delete('/revenue/:id',  ctrl.deleteRevenueEntry);

/* 11. BRAND INVITATIONS */
router.get   ('/invitations',                  ctrl.getInvitations);
router.post  ('/invitations/:id/respond',      ctrl.respondToInvitation);
router.delete('/invitations/:id',              ctrl.deleteInvitation);

/* 12. AI CONTENT TOOLS */
router.get   ('/ai',           ctrl.getAiSuggestions);
router.post  ('/ai/generate',  ctrl.generateAiSuggestion);
router.put   ('/ai/:id',       ctrl.updateAiSuggestion);
router.delete('/ai/:id',       ctrl.deleteAiSuggestion);

/* 13. GROWTH METRICS */
router.get   ('/growth',      ctrl.getGrowthMetrics);
router.put   ('/growth',      ctrl.updateGrowthMetrics);
router.delete('/growth/:id',  ctrl.deleteGrowthMetric);

/* 14. CONTRACTS */
router.get   ('/contracts',                  ctrl.getContracts);
router.post  ('/contracts', single('contract'), ctrl.uploadContract);
router.post  ('/contracts/:id/sign',         ctrl.signContract);
router.put   ('/contracts/:id',              ctrl.updateContract);
router.delete('/contracts/:id',              ctrl.archiveContract);

/* 15. MESSAGING */
router.get   ('/messages',          ctrl.getConversations);
router.get   ('/messages/:userId',  ctrl.getMessages);
router.post  ('/messages',          ctrl.sendMessage);
router.put   ('/messages/:id',      ctrl.updateMessage);
router.delete('/messages/:id',      ctrl.deleteMessage);
router.post("/creators/explore", async (req, res) => {

  try {

    const { search, niche, platform, page = 1, limit = 12 } = req.body;

    const query = {
      role: "creator"
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } }
      ];
    }

    if (niche) query.niche = niche;
    if (platform) query.platform = platform;

    const creators = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      creators,
      pagination: {
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Failed to load creators"
    });

  }

});
module.exports = router;