// backend/routes/public.routes.js
const express  = require('express');
const router   = express.Router();
const Campaign = require('../models/Campaign');
const User     = require('../models/User');
const { protect, restrict } = require('../middleware/auth.middleware');
const creatorCtrl = require('../controllers/creator.controller');

router.use(protect);  // all routes require auth

/* ══════════════════════════════════════════════════════════════════════
   PUBLIC (any authenticated role)
   ══════════════════════════════════════════════════════════════════════ */


/* ── POST /api/creators/explore (legacy compat) + GET /api/creators/search ─ */
/* Both redirect to the same /api/users/creators logic so both old+new service work */
const exploreHandler = async (req, res) => {
  try {
    const User    = require('../models/User');
    const body    = { ...req.body, ...req.query };
    const { search, niche, platform, page = 1, limit = 12 } = body;
    const query   = { role: 'creator', isActive: true };
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
      const { CreatorProfile, SocialAccount } = require('../models/Creatormodels');
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
};
router.post('/creators/explore', exploreHandler);   // legacy POST
router.get ('/creators/search',  exploreHandler);   // new GET alias

/* GET /api/creators/:creatorId/profile  — brand views creator public profile */
router.get('/creators/:creatorId/profile',   creatorCtrl.getPublicProfile);
router.get('/creators/:creatorId/portfolio', creatorCtrl.getPublicPortfolio);

/* GET /api/campaigns/browse  — creator browses ALL active brand campaigns */
router.get('/campaigns/browse', async (req, res) => {
  try {
    const { search, platform, niche, page = 1, limit = 20 } = req.query;
    const q = { status: 'active', isDeleted: false };
    if (niche) q.niche = new RegExp(niche, 'i');
    if (platform) q.platforms = platform;

    let campaigns = await Campaign.find(q)
      .populate('brand', 'firstName lastName companyName avatar')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    if (search) {
      const re = new RegExp(search, 'i');
      campaigns = campaigns.filter(c =>
        re.test(c.title) || re.test(c.description) || re.test(c.niche) ||
        (c.brand?.companyName && re.test(c.brand.companyName))
      );
    }

    const total = await Campaign.countDocuments(q);
    res.json({ success: true, campaigns, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════
   BRAND-ONLY routes
   ══════════════════════════════════════════════════════════════════════ */
const brandOnly = restrict('brand', 'admin');

/* GET /api/collab-posts        — brand gets all creator submissions */
router.get('/collab-posts', brandOnly, creatorCtrl.getBrandCollabPosts);

/* PATCH /api/collab-posts/:id/review  — brand approves/rejects/revision */
router.patch('/collab-posts/:id/review', brandOnly, creatorCtrl.reviewCollabPost);

/* POST /api/collab-posts/:id/pay      — brand pays creator */
router.post('/collab-posts/:id/pay', brandOnly, creatorCtrl.payCollabPost);

/* POST /api/creators/:creatorId/invite  — brand invites creator */
router.post('/creators/:creatorId/invite', brandOnly, async (req, res) => {
  try {
    const { BrandInvitation, CreatorNotification } = require('../models/Creatormodels');
    const { CreatorProfile } = require('../models/Creatormodels');
    const { campaignId, collaborationId, invitationMessage, proposedAmount } = req.body;

    // Check creator exists and has a profile
    const creatorUser = await User.findOne({ _id: req.params.creatorId, role: 'creator', isActive: true });
    if (!creatorUser) return res.status(404).json({ success: false, message: 'Creator not found.' });

    const existing = await BrandInvitation.findOne({
      creator: req.params.creatorId, brand: req.user._id,
      campaign: campaignId || null, status: 'pending',
    });
    if (existing) return res.status(409).json({ success: false, message: 'Invitation already sent.' });

    const inv = await BrandInvitation.create({
      creator: req.params.creatorId, brand: req.user._id,
      campaign: campaignId || null, collaboration: collaborationId || null,
      invitationMessage: invitationMessage || '',
      proposedAmount: proposedAmount || 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await CreatorNotification.create({
      recipient: req.params.creatorId, type: 'campaign_invite',
      title: 'New Brand Invitation!',
      message: `${req.user.companyName || req.user.firstName} wants to collaborate with you! Proposed: $${proposedAmount || 0}.`,
      refId: inv._id, refModel: 'BrandInvitation',
      link: '/dashboard/creator',
    });

    res.status(201).json({ success: true, invitation: inv, message: 'Invitation sent!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;