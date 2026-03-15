// backend/routes/public.routes.js
// Brand-side routes: invite creators, review & pay collab posts
const express = require('express');
const router  = express.Router();

const { protect, restrict } = require('../middleware/auth.middleware');
const creatorCtrl = require('../controllers/creator.controller');

router.use(protect);

/* ── Any authenticated user: view public creator profile ────────────── */
router.get('/creators/:creatorId/profile',   creatorCtrl.getPublicProfile);
router.get('/creators/:creatorId/portfolio', creatorCtrl.getPublicPortfolio);

/* ── Brand-only routes below ────────────────────────────────────────── */
router.use(restrict('brand', 'admin'));

/* Send invitation to a creator */
router.post('/creators/:creatorId/invite', async (req, res) => {
  try {
    const { BrandInvitation, CreatorNotification } = require('../models/Creatormodels');
    const { campaignId, collaborationId, invitationMessage, proposedAmount } = req.body;

    const existing = await BrandInvitation.findOne({
      creator: req.params.creatorId,
      brand:   req.user._id,
      campaign: campaignId || null,
      status:  'pending',
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Invitation already sent to this creator.' });
    }

    const inv = await BrandInvitation.create({
      creator:           req.params.creatorId,
      brand:             req.user._id,
      campaign:          campaignId    || null,
      collaboration:     collaborationId || null,
      invitationMessage: invitationMessage || '',
      proposedAmount:    proposedAmount   || 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await CreatorNotification.create({
      recipient: req.params.creatorId,
      type:      'campaign_invite',
      title:     'New Brand Invitation!',
      message:   `${req.user.companyName || req.user.firstName} invited you to collaborate. Amount: $${proposedAmount || 0}.`,
      refId:     inv._id,
      refModel:  'BrandInvitation',
      link:      '/dashboard/creator',
    });

    res.status(201).json({ success: true, invitation: inv });
  } catch (e) {
    console.error('[public.routes] invite error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

/* Get all collab posts submitted to this brand */
router.get   ('/collab-posts',              creatorCtrl.getBrandCollabPosts);

/* Review a collab post (approve / request_revision / reject) */
router.patch ('/collab-posts/:id/review',   creatorCtrl.reviewCollabPost);

/* Pay creator for an approved collab post */
router.post  ('/collab-posts/:id/pay',      creatorCtrl.payCollabPost);

module.exports = router;