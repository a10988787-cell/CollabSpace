// backend/routes/users.routes.js
const express   = require('express');
const { body }  = require('express-validator');
const User      = require('../models/User');
// Loaded at module level to prevent "cannot overwrite model" errors
let CreatorProfile, SocialAccount, PortfolioItem, PerformanceAnalytics;
try {
  ({ CreatorProfile, SocialAccount, PortfolioItem, PerformanceAnalytics } = require('../models/CreatorModels'));
} catch(_) {}
const validate  = require('../middleware/validate.middleware');
const { protect, restrict } = require('../middleware/auth.middleware');
const router = express.Router();
router.use(protect);

/* ── GET /api/users/profile ─────────────────────────────────────────── */
router.get('/profile', (req, res) =>
  res.json({ success: true, user: req.user.toPublicJSON() })
);

/* ── PUT /api/users/profile ─────────────────────────────────────────── */
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('bio').optional().isLength({ max: 500 }),
], validate, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'bio', 'avatar', 'platform', 'companyName'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to update profile.' }); }
});

/* ── DELETE /api/users/me ───────────────────────────────────────────── */
router.delete('/me', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to deactivate.' }); }
});

/* ── GET /api/users/creators — browse creators (brand + admin) ──────── */
router.get('/creators', restrict('brand', 'admin'), async (req, res) => {
  try {
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

/* ── GET /api/users/creators/:id — single creator detail ───────────── */
router.get('/creators/:id', restrict('brand', 'admin'), async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'creator', isActive: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Creator not found.' });
    let extra = { profile: null, socials: [], portfolio: [], analytics: null };
    try {
      const [profile, socials, portfolio, analytics] = await Promise.all([
        CreatorProfile.findOne({ owner: req.params.id }),
        SocialAccount.find({ creator: req.params.id, isActive: true }),
        PortfolioItem.find({ creator: req.params.id, isDeleted: false, isPublic: true }).sort({ createdAt: -1 }).limit(6),
        PerformanceAnalytics.findOne({ creator: req.params.id }).sort({ createdAt: -1 }),
      ]);
      extra = { profile, socials, portfolio, analytics };
    } catch (_) {}
    res.json({ success: true, creator: { ...user.toPublicJSON(), ...extra } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ── GET /api/users (admin only) ────────────────────────────────────── */
router.get('/', restrict('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = { isActive: true };
    if (role)   query.role   = role;
    if (search) query.$or    = [
      { firstName: new RegExp(search, 'i') },
      { lastName:  new RegExp(search, 'i') },
      { email:     new RegExp(search, 'i') },
    ];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-password').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);
    res.json({ success: true, users: users.map(u => u.toPublicJSON()), pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch users.' }); }
});

module.exports = router;