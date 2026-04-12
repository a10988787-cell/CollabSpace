// backend/routes/public.routes.js
const express  = require('express');
const router   = express.Router();
const Campaign = require('../models/Campaign');
/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/campaigns/browse
   Creator browses active brand campaigns (authenticated creators only).
   Supports: search, platform, niche, page, limit
   ───────────────────────────────────────────────────────────────────────────── */
const { protect: _protectBrowse } = (() => {
  try { return require('../middleware/auth.middleware'); } catch { return { protect: (_r,_s,n)=>n() }; }
})();

router.get('/campaigns/browse', _protectBrowse, async (req, res) => {
  try {
    const { search, platform, niche, page = 1, limit = 50 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);

    // Only show active, non-deleted campaigns
    const query = { status: 'active', isDeleted: false };

    if (niche)  query.niche = niche;
    if (platform) query.platforms = platform; // campaigns have a platforms array

    // Text search on title / description
    if (search) {
      query.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('brand', 'firstName lastName companyName isVerified profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Campaign.countDocuments(query),
    ]);

    res.json({
      success: true,
      campaigns,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});



// ── Public collab-posts browse ───────────────────────────────────────────────
const { CollabPost } = (() => { try { return require('../models/CreatorModels'); } catch { return {}; } })();

if (CollabPost) {
  router.get('/collab-posts', async (req, res) => {
    try {
      const posts = await CollabPost.find({ status: 'approved' })
        .populate('creator', 'firstName lastName').sort({ createdAt: -1 }).limit(20);
      res.json({ success: true, data: posts });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}

router.get('/campaigns/:id', async (req, res) => {
  try {
    const c = await Campaign.findById(req.params.id).populate('brand', 'firstName lastName companyName');
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: c });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// STATS ROUTER — public, no auth required
// ════════════════════════════════════════════════════════════════════════════
const statsRouter = require('express').Router();

const User          = require('../models/User');
const { Collaboration } = (() => { try { return require('../models/Brandmodels'); } catch { return {}; } })();
let RevenueEntry = null;
try { ({ RevenueEntry } = require('../models/CreatorModels')); } catch (_) {}

// ── GET /api/stats — platform KPIs + 6-month monthly ────────────────────────
statsRouter.get('/', async (req, res) => {
  try {
    const [totalCreators, totalBrands, activeCampaigns, totalCampaigns, collabCount] = await Promise.all([
      User.countDocuments({ role: 'creator', isActive: true }),
      User.countDocuments({ role: 'brand',   isActive: true }),
      Campaign.countDocuments({ status: 'active', isDeleted: false }),
      Campaign.countDocuments({ isDeleted: false }),
      Collaboration ? Collaboration.countDocuments({ isDeleted: false }) : 0,
    ]);

    let totalRevenue = 0;
    if (RevenueEntry) {
      const agg = await RevenueEntry.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
      totalRevenue = agg[0]?.total || 0;
    }

    const now = new Date();
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const range = { $gte: start, $lte: end };
      const [creators, brands, campaigns, collabs] = await Promise.all([
        User.countDocuments({ role: 'creator', createdAt: range }),
        User.countDocuments({ role: 'brand',   createdAt: range }),
        Campaign.countDocuments({ createdAt: range, isDeleted: false }),
        Collaboration ? Collaboration.countDocuments({ createdAt: range, isDeleted: false }) : 0,
      ]);
      let rev = 0;
      if (RevenueEntry) {
        const ra = await RevenueEntry.aggregate([
          { $match: { createdAt: range } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        rev = ra[0]?.total || 0;
      }
      monthly.push({
        month: start.toLocaleString('en', { month: 'short' }),
        year:  start.getFullYear(),
        creators, brands, campaigns, collabs, revenue: rev,
      });
    }

    res.json({
      success: true,
      stats: { totalCreators, totalBrands, activeCampaigns, totalCampaigns, totalRevenue, totalCollaborations: collabCount },
      monthly,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /api/stats/monthly — 12-month full trend ─────────────────────────────
statsRouter.get('/monthly', async (req, res) => {
  try {
    const now = new Date();
    const monthly = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const range = { $gte: start, $lte: end };
      const [creators, brands, campaigns, collabs] = await Promise.all([
        User.countDocuments({ role: 'creator', createdAt: range }),
        User.countDocuments({ role: 'brand',   createdAt: range }),
        Campaign.countDocuments({ isDeleted: false, createdAt: range }),
        Collaboration ? Collaboration.countDocuments({ createdAt: range }) : 0,
      ]);
      monthly.push({
        month: start.toLocaleString('en', { month: 'short' }),
        year:  start.getFullYear(),
        creators, brands, campaigns, collabs,
      });
    }
    res.json({ success: true, monthly });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /api/stats/creators — creator roster with social data ─────────────────
statsRouter.get('/creators', async (req, res) => {
  try {
    let CreatorProfile = null, SocialAccount = null;
    try { ({ CreatorProfile, SocialAccount } = require('../models/CreatorModels')); } catch (_) {}

    const users = await User.find({ role: 'creator', isActive: true })
      .select('firstName lastName platform bio createdAt isVerified')
      .sort({ createdAt: -1 }).limit(20);

    const ids = users.map(u => u._id);
    const profiles = CreatorProfile ? await CreatorProfile.find({ owner: { $in: ids } }) : [];
    const socials  = SocialAccount  ? await SocialAccount.find({ creator: { $in: ids }, isActive: true }) : [];

    const pm = {}; profiles.forEach(p => { pm[p.owner.toString()] = p; });
    const sm = {}; socials.forEach(s => {
      const k = s.creator.toString();
      if (!sm[k]) sm[k] = [];
      sm[k].push(s);
    });

    const creators = users.map(u => ({
      id:        u._id,
      name:      (u.firstName + ' ' + u.lastName).trim(),
      handle:    pm[u._id.toString()]?.username || u.firstName.toLowerCase(),
      niche:     pm[u._id.toString()]?.niche || 'Creator',
      platform:  (sm[u._id.toString()] || [])[0]?.platform || u.platform || 'Instagram',
      followers: (sm[u._id.toString()] || []).reduce((s, a) => s + (a.followersCount || 0), 0),
      engRate:   +((sm[u._id.toString()] || [])[0]?.engagementRate || 0).toFixed(1),
      avgDeal:   pm[u._id.toString()]?.avgDealValue || 0,
      isVerified: u.isVerified,
      status:    'active',
      rating:    pm[u._id.toString()]?.rating || 4.5,
      initials:  ((u.firstName || '?')[0] + (u.lastName || '?')[0]).toUpperCase(),
      createdAt: u.createdAt,
    }));

    res.json({ success: true, creators });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /api/stats/brands — brand list with campaign stats ────────────────────
statsRouter.get('/brands', async (req, res) => {
  try {
    const brands = await User.find({ role: 'brand', isActive: true })
      .select('firstName lastName companyName bio createdAt isVerified')
      .sort({ createdAt: -1 }).limit(12);

    const brandIds = brands.map(b => b._id);
    const campAgg  = await Campaign.aggregate([
      { $match: { brand: { $in: brandIds }, isDeleted: false } },
      { $group: { _id: '$brand', count: { $sum: 1 }, totalBudget: { $sum: '$budget' } } },
    ]);
    const campMap = {};
    campAgg.forEach(c => { campMap[c._id.toString()] = c; });

    let collabMap = {};
    if (Collaboration) {
      const collabAgg = await Collaboration.aggregate([
        { $match: { brand: { $in: brandIds } } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
      ]);
      collabAgg.forEach(c => { collabMap[c._id.toString()] = c.count; });
    }

    const result = brands.map(b => {
      const cm = campMap[b._id.toString()];
      return {
        id:         b._id,
        name:       b.companyName || (b.firstName + ' ' + b.lastName).trim(),
        niche:      b.bio || 'Brand',
        campaigns:  cm?.count || 0,
        totalBudget:cm?.totalBudget || 0,
        spent:      cm?.totalBudget ? '$' + Math.round(cm.totalBudget / 1000) + 'K' : '$0K',
        creators:   collabMap[b._id.toString()] || 0,
        isVerified: b.isVerified,
        createdAt:  b.createdAt,
      };
    });

    res.json({ success: true, brands: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /api/stats/campaigns — active campaigns with brand info ───────────────
statsRouter.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ isDeleted: false })
      .populate('brand', 'firstName lastName companyName')
      .sort({ createdAt: -1 }).limit(12);
    res.json({ success: true, campaigns });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


// ── POST /api/creators/:id/invite — alias (frontend calls this URL) ───────────
// Requires auth — forward to brand invite logic
const { protect } = require('../middleware/auth.middleware');
const { BrandInvitation, CreatorNotification } = (() => {
  try { return require('../models/CreatorModels'); } catch { return {}; }
})();

router.post('/creators/:id/invite', protect, async (req, res) => {
  try {
    const creatorId = req.params.id;
    const { campaignId, invitationMessage, proposedAmount } = req.body;

    if (!invitationMessage?.trim()) {
      return res.status(400).json({ success: false, message: 'Invitation message is required' });
    }

    const creator = await User.findOne({ _id: creatorId, role: 'creator', isActive: true });
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    // Prevent duplicate pending invites
    const existing = BrandInvitation ? await BrandInvitation.findOne({
      brand: req.user._id, creator: creatorId, status: 'pending', isDeleted: false,
    }) : null;
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a pending invitation to this creator' });
    }

    const inviteData = {
      brand:             req.user._id,
      creator:           creatorId,
      invitationMessage: invitationMessage.trim(),
      proposedAmount:    proposedAmount || 0,
      expiresAt:         new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    if (campaignId) inviteData.campaign = campaignId;

    const invitation = BrandInvitation
      ? await BrandInvitation.create(inviteData)
      : inviteData;

    // Notify creator
    if (CreatorNotification) {
      try {
        await CreatorNotification.create({
          user:    creatorId, type: 'brand_invite',
          title:   'New Collaboration Invite',
          message: `${req.user.companyName || req.user.firstName} invited you to collaborate!`,
          refModel:'BrandInvitation', refId: invitation._id,
          data:    { brandName: req.user.companyName || req.user.firstName, proposedAmount },
        });
      } catch (_) {}
    }

    res.status(201).json({ success: true, invitation, message: 'Invitation sent successfully!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// main export
module.exports = router;
module.exports.statsRouter = statsRouter;

// ── GET /api/stats/all — ONE round-trip, everything in parallel ──────────────
statsRouter.get('/all', async (req, res) => {
  try {
    const now   = new Date();
    const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ALL queries fire simultaneously — no sequential awaits
    const [
      totalCreators, totalBrands, activeCampaigns, totalCampaigns, collabCount,
      rawUsers, rawCampaigns, rawBrands,
      creatorMonthly, brandMonthly, campMonthly, collabMonthly,
      campBudgetAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'creator', isActive: true }),
      User.countDocuments({ role: 'brand',   isActive: true }),
      Campaign.countDocuments({ status: 'active', isDeleted: false }),
      Campaign.countDocuments({ isDeleted: false }),
      Collaboration ? Collaboration.countDocuments({ isDeleted: false }) : Promise.resolve(0),

      User.find({ role: 'creator', isActive: true })
        .select('firstName lastName platform bio createdAt isVerified').sort({ createdAt: -1 }).limit(20).lean(),

      Campaign.find({ isDeleted: false })
        .populate('brand', 'firstName lastName companyName').sort({ createdAt: -1 }).limit(12).lean(),

      User.find({ role: 'brand', isActive: true })
        .select('firstName lastName companyName bio createdAt isVerified').sort({ createdAt: -1 }).limit(12).lean(),

      // Monthly aggregations via $group — single query each instead of 6 countDocuments loops
      User.aggregate([
        { $match: { role: 'creator', createdAt: { $gte: sixAgo } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { role: 'brand', createdAt: { $gte: sixAgo } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Campaign.aggregate([
        { $match: { isDeleted: false, createdAt: { $gte: sixAgo } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Collaboration ? Collaboration.aggregate([
        { $match: { createdAt: { $gte: sixAgo } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]) : Promise.resolve([]),

      Campaign.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$brand', count: { $sum: 1 }, totalBudget: { $sum: '$budget' } } },
      ]),
    ]);

    // Build lookup maps
    const toMap = arr => { const m = {}; arr.forEach(x => { m[`${x._id.y}-${x._id.m}`] = x.count; }); return m; };
    const cm = toMap(creatorMonthly), bm = toMap(brandMonthly);
    const pm = toMap(campMonthly),    lm = toMap(collabMonthly);

    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthly.push({ month: d.toLocaleString('en', { month: 'short' }), creators: cm[k]||0, brands: bm[k]||0, campaigns: pm[k]||0, collabs: lm[k]||0 });
    }

    const campMap = {};
    campBudgetAgg.forEach(c => { campMap[c._id?.toString()] = c; });

    const brands = rawBrands.map(b => {
      const ag = campMap[b._id.toString()];
      return { id: b._id, name: b.companyName || (b.firstName + ' ' + b.lastName).trim(),
        niche: b.bio || 'Brand', campaigns: ag?.count || 0,
        spent: ag?.totalBudget ? '$' + Math.round(ag.totalBudget / 1000) + 'K' : '$0K',
        creators: 0, isVerified: b.isVerified };
    });

    const creators = rawUsers.map(u => ({
      id: u._id, name: (u.firstName + ' ' + u.lastName).trim(),
      handle: u.firstName?.toLowerCase() || '', niche: u.bio || 'Creator',
      platform: u.platform || 'Instagram', followers: 0, engRate: 0, avgDeal: 0,
      isVerified: u.isVerified, status: 'active', rating: 4.5,
      initials: ((u.firstName||'?')[0] + (u.lastName||'?')[0]).toUpperCase(), createdAt: u.createdAt,
    }));

    res.json({
      success: true,
      stats: { totalCreators, totalBrands, activeCampaigns, totalCampaigns, totalCollaborations: collabCount },
      monthly, creators, brands, campaigns: rawCampaigns,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});