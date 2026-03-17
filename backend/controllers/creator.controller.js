// backend/controllers/creator.controller.js
const mongoose = require('mongoose');
const path = require('path');
const {
  CreatorProfile, SocialAccount, PortfolioItem, CampaignApplication,
  CollabPost, ContentLibrary, CreatorNotification, PerformanceAnalytics,
  AudienceInsight, RevenueEntry, BrandInvitation, AiSuggestion,
  GrowthMetric, CreatorContract, Message,
} = require('../models/CreatorModels');
const { Collaboration } = require('../models/BrandModels');

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, msg, status = 500)  => res.status(status).json({ success: false, message: msg });
const uid = (req) => req.user._id;

/* ─── Notification helper ────────────────────────────────────────────── */
const notify = async (recipient, type, title, message, refId = null, refModel = null, link = '') => {
  try {
    await CreatorNotification.create({ recipient, type, title, message, link, refId, refModel });
  } catch (e) { console.error('[Notify]', e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   1. CREATOR PROFILE
   ════════════════════════════════════════════════════════════════════════ */
exports.getProfile = async (req, res) => {
  try {
    let p = await CreatorProfile.findOne({ owner: uid(req) });
    if (!p) p = await CreatorProfile.create({ owner: uid(req), username: req.user.email.split('@')[0] });
    ok(res, { profile: p });
  } catch (e) { err(res, e.message); }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const p = await CreatorProfile.findOne({ owner: req.params.creatorId }).populate('owner', 'firstName lastName email avatar');
    if (!p) return err(res, 'Creator not found.', 404);
    ok(res, { profile: p });
  } catch (e) { err(res, e.message); }
};

exports.updateProfile = async (req, res) => {
  try {
    const fields = ['username','bio','niche','country','profilePicture','contactInfo'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    // contactInfo is sent as JSON string from FormData — parse it back to object
    if (set.contactInfo && typeof set.contactInfo === 'string') {
      try { set.contactInfo = JSON.parse(set.contactInfo); } catch (_) {}
    }
    if (req.file) set.profilePicture = `/uploads/assets/${req.file.filename}`;
    const profile = await CreatorProfile.findOneAndUpdate(
      { owner: uid(req) }, { $set: set },
      { new: true, upsert: true, runValidators: true }
    );
    ok(res, { profile });
  } catch (e) { err(res, e.message); }
};

exports.deleteProfile = async (req, res) => {
  try {
    await CreatorProfile.findOneAndUpdate({ owner: uid(req) }, { isArchived: true });
    ok(res, { message: 'Profile archived.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   2. SOCIAL ACCOUNTS
   ════════════════════════════════════════════════════════════════════════ */
exports.getSocialAccounts = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ creator: uid(req), isActive: true });
    ok(res, { accounts });
  } catch (e) { err(res, e.message); }
};

exports.addSocialAccount = async (req, res) => {
  try {
    const { platform, username, followersCount, engagementRate, accessToken, profileUrl } = req.body;
    const existing = await SocialAccount.findOne({ creator: uid(req), platform });
    if (existing) {
      existing.username = username; existing.followersCount = followersCount || 0;
      existing.engagementRate = engagementRate || 0; existing.isActive = true;
      if (accessToken) existing.accessToken = accessToken;
      await existing.save();
      return ok(res, { account: existing });
    }
    const account = await SocialAccount.create({ creator: uid(req), platform, username, followersCount: followersCount || 0, engagementRate: engagementRate || 0, accessToken: accessToken || '', profileUrl: profileUrl || '' });
    ok(res, { account }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateSocialAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req) },
      { $set: req.body }, { new: true, runValidators: true }
    );
    if (!account) return err(res, 'Account not found.', 404);
    ok(res, { account });
  } catch (e) { err(res, e.message); }
};

exports.deleteSocialAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req) }, { isActive: false }, { new: true }
    );
    if (!account) return err(res, 'Account not found.', 404);
    ok(res, { message: 'Social account disconnected.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   3. PORTFOLIO
   ════════════════════════════════════════════════════════════════════════ */
exports.getPortfolio = async (req, res) => {
  try {
    const items = await PortfolioItem.find({ creator: uid(req), isDeleted: false }).sort({ createdAt: -1 });
    ok(res, { items });
  } catch (e) { err(res, e.message); }
};

exports.getPublicPortfolio = async (req, res) => {
  try {
    const items = await PortfolioItem.find({ creator: req.params.creatorId, isDeleted: false, isPublic: true }).sort({ createdAt: -1 });
    ok(res, { items });
  } catch (e) { err(res, e.message); }
};

exports.addPortfolioItem = async (req, res) => {
  try {
    const { campaignTitle, mediaType, platform, brandName, contentUrl, description, metrics, isPublic } = req.body;
    let thumbnailUrl = '';
    if (req.file) thumbnailUrl = `/uploads/assets/${req.file.filename}`;
    const item = await PortfolioItem.create({
      creator: uid(req), campaignTitle, mediaType, platform, brandName: brandName || '',
      contentUrl: contentUrl || '', thumbnailUrl, description: description || '',
      metrics: metrics || {}, isPublic: isPublic !== false,
    });
    ok(res, { item }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updatePortfolioItem = async (req, res) => {
  try {
    const item = await PortfolioItem.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), isDeleted: false },
      { $set: req.body }, { new: true, runValidators: true }
    );
    if (!item) return err(res, 'Portfolio item not found.', 404);
    ok(res, { item });
  } catch (e) { err(res, e.message); }
};

exports.deletePortfolioItem = async (req, res) => {
  try {
    const item = await PortfolioItem.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req) }, { isDeleted: true }, { new: true }
    );
    if (!item) return err(res, 'Portfolio item not found.', 404);
    ok(res, { message: 'Portfolio item removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   4. CAMPAIGN APPLICATIONS
   ════════════════════════════════════════════════════════════════════════ */
exports.getApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { creator: uid(req), isDeleted: false };
    if (status) q.status = status;
    const applications = await CampaignApplication.find(q)
      .populate('campaign', 'title budget status startDate endDate platforms brand')
      .sort({ createdAt: -1 });
    ok(res, { applications });
  } catch (e) { err(res, e.message); }
};

exports.submitApplication = async (req, res) => {
  try {
    const { campaignId, proposalMessage, priceQuote } = req.body;
    const existing = await CampaignApplication.findOne({ campaign: campaignId, creator: uid(req), isDeleted: false });
    if (existing && existing.status !== 'withdrawn') return err(res, 'You have already applied for this campaign.', 409);
    const application = await CampaignApplication.create({
      campaign: campaignId, creator: uid(req), proposalMessage, priceQuote,
    });
    await application.populate('campaign', 'title brand');
    // Notify brand
    if (application.campaign?.brand) {
      await notify(application.campaign.brand, 'application_update',
        'New Campaign Application',
        `${req.user.firstName} applied to your campaign "${application.campaign.title}".`,
        application._id, 'CampaignApplication'
      );
    }
    ok(res, { application }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateApplication = async (req, res) => {
  try {
    const app = await CampaignApplication.findOne({ _id: req.params.id, creator: uid(req), isDeleted: false });
    if (!app) return err(res, 'Application not found.', 404);
    if (!['pending','reviewing'].includes(app.status)) return err(res, 'Cannot edit this application.', 400);
    const { proposalMessage, priceQuote } = req.body;
    if (proposalMessage !== undefined) app.proposalMessage = proposalMessage;
    if (priceQuote !== undefined) app.priceQuote = priceQuote;
    await app.save();
    ok(res, { application: app });
  } catch (e) { err(res, e.message); }
};

exports.withdrawApplication = async (req, res) => {
  try {
    const app = await CampaignApplication.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), isDeleted: false, status: { $in: ['pending','reviewing'] } },
      { status: 'withdrawn', isDeleted: true }, { new: true }
    );
    if (!app) return err(res, 'Application not found or cannot be withdrawn.', 404);
    ok(res, { message: 'Application withdrawn.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   5. COLLAB POSTS (creator posts content for accepted collaboration)
   ════════════════════════════════════════════════════════════════════════ */
exports.getCollabPosts = async (req, res) => {
  try {
    const posts = await CollabPost.find({ creator: uid(req), isDeleted: false })
      .populate('collaboration', 'status campaign')
      .sort({ createdAt: -1 });
    ok(res, { posts });
  } catch (e) { err(res, e.message); }
};

exports.createCollabPost = async (req, res) => {
  try {
    const { collaborationId, applicationId, title, caption, contentType, hashtags, platform } = req.body;
    let collab = null;

    if (collaborationId && collaborationId.length === 24) {
      // Direct collaboration ID provided
      collab = await Collaboration.findOne({ _id: collaborationId, creator: uid(req), status: 'active' });
    }

    if (!collab && applicationId) {
      // Look up collaboration via accepted application
      const app = await CampaignApplication.findOne({ _id: applicationId, creator: uid(req), status: 'accepted' })
        .populate('campaign', 'brand title');
      if (app) {
        // Find existing collab or auto-create one
        collab = await Collaboration.findOne({ creator: uid(req), campaign: app.campaign?._id, status: 'active' });
        if (!collab && app.campaign?.brand) {
          collab = await Collaboration.create({
            brand: app.campaign.brand,
            creator: uid(req),
            campaign: app.campaign._id,
            status: 'active',
            amount: app.priceQuote || 0,
            deliverables: app.proposalMessage || '',
          });
        }
      }
    }

    if (!collab) return err(res, 'No active collaboration found. Make sure your application was accepted.', 404);

    const mediaUrls = req.files ? req.files.map(f => `/uploads/assets/${f.filename}`) : (req.body.mediaUrls || []);

    const post = await CollabPost.create({
      collaboration: collaborationId, creator: uid(req), brand: collab.brand,
      title, caption: caption || '', contentType, mediaUrls,
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(h => h.trim())) : [],
      platform: platform || 'Other', status: 'draft',
    });

    ok(res, { post }, 201);
  } catch (e) { err(res, e.message); }
};

exports.submitCollabPost = async (req, res) => {
  try {
    const post = await CollabPost.findOne({ _id: req.params.id, creator: uid(req), isDeleted: false });
    if (!post) return err(res, 'Post not found.', 404);
    if (!['draft','revision_requested'].includes(post.status)) return err(res, 'Post cannot be submitted.', 400);
    post.status = 'submitted';
    post.submittedAt = new Date();
    await post.save();

    // Notify brand
    await notify(post.brand, 'content_approved',
      'Creator submitted content',
      `Your creator has submitted content for review. Please review and approve to release payment.`,
      post._id, 'CollabPost', '/dashboard/brand/collaborations'
    );

    ok(res, { post });
  } catch (e) { err(res, e.message); }
};

exports.updateCollabPost = async (req, res) => {
  try {
    const post = await CollabPost.findOne({ _id: req.params.id, creator: uid(req), isDeleted: false });
    if (!post) return err(res, 'Post not found.', 404);
    if (!['draft','revision_requested'].includes(post.status)) return err(res, 'Cannot edit submitted post.', 400);
    const fields = ['title','caption','contentType','mediaUrls','hashtags','platform'];
    fields.forEach(f => { if (req.body[f] !== undefined) post[f] = req.body[f]; });
    await post.save();
    ok(res, { post });
  } catch (e) { err(res, e.message); }
};

exports.deleteCollabPost = async (req, res) => {
  try {
    const post = await CollabPost.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), status: 'draft' },
      { isDeleted: true }, { new: true }
    );
    if (!post) return err(res, 'Post not found or cannot be deleted.', 404);
    ok(res, { message: 'Post deleted.' });
  } catch (e) { err(res, e.message); }
};

/* Brand reviews collab post */
exports.reviewCollabPost = async (req, res) => {
  try {
    const { action, brandNotes, paymentAmount } = req.body; // action: approve | reject | request_revision
    const post = await CollabPost.findOne({ _id: req.params.id, brand: uid(req), status: 'submitted' });
    if (!post) return err(res, 'Post not found.', 404);

    if (action === 'approve') {
      post.status = 'approved'; post.approvedAt = new Date();
      post.paymentAmount = paymentAmount || 0;
      await post.save();
      // Notify creator
      await notify(post.creator, 'content_approved', 'Content Approved!',
        `Your content has been approved! Payment of $${paymentAmount || 0} will be processed.`,
        post._id, 'CollabPost'
      );
      // Auto-create revenue entry
      if (paymentAmount > 0) {
        const collab = await Collaboration.findById(post.collaboration).populate('brand','companyName firstName');
        await RevenueEntry.create({
          creator: post.creator, collaboration: post.collaboration, collabPost: post._id,
          campaignName: post.title, brandName: collab?.brand?.companyName || '',
          amount: paymentAmount, status: 'pending',
        });
      }
    } else if (action === 'request_revision') {
      post.status = 'revision_requested'; post.brandNotes = brandNotes || '';
      await post.save();
      await notify(post.creator, 'content_revision', 'Revision Requested',
        `The brand requested revisions on your content. Notes: ${brandNotes || 'Please check the brand notes.'}`,
        post._id, 'CollabPost'
      );
    } else if (action === 'reject') {
      post.status = 'rejected'; post.brandNotes = brandNotes || '';
      await post.save();
      await notify(post.creator, 'content_revision', 'Content Rejected',
        `Your content was rejected. Reason: ${brandNotes || 'No reason provided.'}`,
        post._id, 'CollabPost'
      );
    } else { return err(res, 'Invalid action.', 400); }

    ok(res, { post });
  } catch (e) { err(res, e.message); }
};

/* Brand pays creator for approved post */
exports.payCollabPost = async (req, res) => {
  try {
    const post = await CollabPost.findOne({ _id: req.params.id, brand: uid(req), status: 'approved' });
    if (!post) return err(res, 'Approved post not found.', 404);
    post.status = 'paid'; post.isPaid = true; post.paidAt = new Date();
    await post.save();
    // Update revenue entry
    await RevenueEntry.findOneAndUpdate(
      { collabPost: post._id, creator: post.creator },
      { status: 'received', paymentDate: new Date() }
    );
    await notify(post.creator, 'payment', 'Payment Received!',
      `You've been paid $${post.paymentAmount} for your content. Check your earnings dashboard.`,
      post._id, 'CollabPost'
    );
    ok(res, { post, message: 'Payment processed successfully.' });
  } catch (e) { err(res, e.message); }
};

/* Get collab posts for brand review */
exports.getBrandCollabPosts = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { brand: uid(req), isDeleted: false };
    if (status) q.status = status;
    const posts = await CollabPost.find(q)
      .populate('creator', 'firstName lastName avatar email')
      .populate('collaboration', 'campaign')
      .sort({ createdAt: -1 });
    ok(res, { posts });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   6. CONTENT LIBRARY
   ════════════════════════════════════════════════════════════════════════ */
exports.getContentLibrary = async (req, res) => {
  try {
    const { fileType } = req.query;
    const q = { creator: uid(req), isDeleted: false };
    if (fileType) q.fileType = fileType;
    const files = await ContentLibrary.find(q).sort({ createdAt: -1 });
    ok(res, { files });
  } catch (e) { err(res, e.message); }
};

exports.uploadContent = async (req, res) => {
  try {
    if (!req.file) return err(res, 'No file provided.', 400);
    const { fileName, fileType, caption, hashtags } = req.body;
    const file = await ContentLibrary.create({
      creator: uid(req),
      fileName: fileName || req.file.originalname,
      fileType: fileType || 'image',
      fileUrl: `/uploads/assets/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      caption: caption || '',
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(h => h.trim())) : [],
    });
    ok(res, { file }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateContent = async (req, res) => {
  try {
    const fields = ['caption','hashtags','tags','fileName'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    const file = await ContentLibrary.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), isDeleted: false },
      { $set: set }, { new: true }
    );
    if (!file) return err(res, 'Content not found.', 404);
    ok(res, { file });
  } catch (e) { err(res, e.message); }
};

exports.deleteContent = async (req, res) => {
  try {
    const file = await ContentLibrary.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req) }, { isDeleted: true }, { new: true }
    );
    if (!file) return err(res, 'Content not found.', 404);
    ok(res, { message: 'Content removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   7. NOTIFICATIONS
   ════════════════════════════════════════════════════════════════════════ */
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const q = { recipient: uid(req), isDeleted: false };
    if (unread === 'true') q.isRead = false;
    const [notifications, total, unreadCount] = await Promise.all([
      CreatorNotification.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      CreatorNotification.countDocuments(q),
      CreatorNotification.countDocuments({ recipient: uid(req), isRead: false, isDeleted: false }),
    ]);
    ok(res, { notifications, total, unreadCount });
  } catch (e) { err(res, e.message); }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await CreatorNotification.findOneAndUpdate(
      { _id: req.params.id, recipient: uid(req) }, { isRead: true }
    );
    ok(res, { message: 'Marked as read.' });
  } catch (e) { err(res, e.message); }
};

exports.markAllRead = async (req, res) => {
  try {
    await CreatorNotification.updateMany({ recipient: uid(req), isRead: false }, { isRead: true });
    ok(res, { message: 'All notifications marked as read.' });
  } catch (e) { err(res, e.message); }
};

exports.deleteNotification = async (req, res) => {
  try {
    await CreatorNotification.findOneAndUpdate(
      { _id: req.params.id, recipient: uid(req) }, { isDeleted: true }
    );
    ok(res, { message: 'Notification removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   8. PERFORMANCE ANALYTICS
   ════════════════════════════════════════════════════════════════════════ */
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30d', platform = 'All' } = req.query;
    let analytics = await PerformanceAnalytics.findOne({ creator: uid(req), period, platform });
    if (!analytics) {
      analytics = await PerformanceAnalytics.create({ creator: uid(req), period, platform });
    }
    ok(res, { analytics });
  } catch (e) { err(res, e.message); }
};

exports.updateAnalytics = async (req, res) => {
  try {
    const { period = '30d', platform = 'All' } = req.body;
    const fields = ['followers','engagementRate','avgLikes','avgComments','reach','impressions','profileVisits'];
    const set = { period, platform, generatedAt: new Date() };
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    const analytics = await PerformanceAnalytics.findOneAndUpdate(
      { creator: uid(req), period, platform }, { $set: set }, { new: true, upsert: true }
    );
    ok(res, { analytics });
  } catch (e) { err(res, e.message); }
};

exports.deleteAnalyticsReport = async (req, res) => {
  try {
    await PerformanceAnalytics.findOneAndUpdate({ _id: req.params.id, creator: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Analytics report removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   9. AUDIENCE INSIGHTS
   ════════════════════════════════════════════════════════════════════════ */
exports.getAudienceInsights = async (req, res) => {
  try {
    const { platform = 'All' } = req.query;
    let insight = await AudienceInsight.findOne({ creator: uid(req), platform, isDeleted: false });
    if (!insight) insight = await AudienceInsight.create({ creator: uid(req), platform });
    ok(res, { insight });
  } catch (e) { err(res, e.message); }
};

exports.updateAudienceInsights = async (req, res) => {
  try {
    const { platform = 'All', ageGroups, genderDistribution, topCountries, interests } = req.body;
    const set = { platform, generatedAt: new Date() };
    if (ageGroups) set.ageGroups = ageGroups;
    if (genderDistribution) set.genderDistribution = genderDistribution;
    if (topCountries) set.topCountries = topCountries;
    if (interests) set.interests = interests;
    const insight = await AudienceInsight.findOneAndUpdate(
      { creator: uid(req), platform }, { $set: set }, { new: true, upsert: true }
    );
    ok(res, { insight });
  } catch (e) { err(res, e.message); }
};

exports.deleteAudienceInsight = async (req, res) => {
  try {
    await AudienceInsight.findOneAndUpdate({ _id: req.params.id, creator: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Insight report removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   10. REVENUE TRACKING
   ════════════════════════════════════════════════════════════════════════ */
exports.getRevenue = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { creator: uid(req), isDeleted: false };
    if (status) q.status = status;
    const [entries, totalReceived, totalPending] = await Promise.all([
      RevenueEntry.find(q).sort({ createdAt: -1 }),
      RevenueEntry.aggregate([{ $match: { creator: uid(req), status: 'received' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      RevenueEntry.aggregate([{ $match: { creator: uid(req), status: { $in: ['pending','processing'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    ok(res, { entries, totalReceived: totalReceived[0]?.total || 0, totalPending: totalPending[0]?.total || 0 });
  } catch (e) { err(res, e.message); }
};

exports.addRevenueEntry = async (req, res) => {
  try {
    const entry = await RevenueEntry.create({ creator: uid(req), ...req.body });
    ok(res, { entry }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateRevenueEntry = async (req, res) => {
  try {
    const entry = await RevenueEntry.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), isDeleted: false },
      { $set: req.body }, { new: true }
    );
    if (!entry) return err(res, 'Revenue entry not found.', 404);
    ok(res, { entry });
  } catch (e) { err(res, e.message); }
};

exports.deleteRevenueEntry = async (req, res) => {
  try {
    await RevenueEntry.findOneAndUpdate({ _id: req.params.id, creator: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Revenue entry removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   11. BRAND INVITATIONS
   ════════════════════════════════════════════════════════════════════════ */
exports.getInvitations = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { creator: uid(req), isDeleted: false };
    if (status) q.status = status;
    const invitations = await BrandInvitation.find(q)
      .populate('brand', 'firstName lastName companyName avatar')
      .populate('campaign', 'title budget platforms startDate endDate')
      .sort({ createdAt: -1 });
    ok(res, { invitations });
  } catch (e) { err(res, e.message); }
};

exports.respondToInvitation = async (req, res) => {
  try {
    const { action, creatorResponse } = req.body; // action: accept | reject
    const inv = await BrandInvitation.findOne({ _id: req.params.id, creator: uid(req), status: 'pending' });
    if (!inv) return err(res, 'Invitation not found.', 404);
    inv.status = action === 'accept' ? 'accepted' : 'rejected';
    inv.respondedAt = new Date();
    inv.creatorResponse = creatorResponse || '';
    await inv.save();
    // Notify brand
    await notify(inv.brand, 'application_update',
      action === 'accept' ? 'Invitation Accepted!' : 'Invitation Declined',
      `${req.user.firstName} ${action === 'accept' ? 'accepted' : 'declined'} your collaboration invite.`,
      inv._id, 'BrandInvitation'
    );
    // When accepted: ensure an active Collaboration exists so creator can post content
    if (action === 'accept') {
      if (inv.collaboration) {
        await Collaboration.findByIdAndUpdate(inv.collaboration, { status: 'active' });
      } else {
        // Auto-create a Collaboration linked to this invitation
        try {
          const collab = await Collaboration.create({
            brand:    inv.brand,
            creator:  uid(req),
            campaign: inv.campaign || null,
            status:   'active',
            amount:   inv.proposedAmount || 0,
            deliverables: inv.invitationMessage || '',
          });
          inv.collaboration = collab._id;
          await inv.save();
        } catch (collabErr) {
          console.warn('[invite accept] collab create failed:', collabErr.message);
        }
      }
    }
    ok(res, { invitation: inv });
  } catch (e) { err(res, e.message); }
};

exports.deleteInvitation = async (req, res) => {
  try {
    await BrandInvitation.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req) }, { isDeleted: true }
    );
    ok(res, { message: 'Invitation removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   12. AI CONTENT TOOLS
   ════════════════════════════════════════════════════════════════════════ */
exports.getAiSuggestions = async (req, res) => {
  try {
    const suggestions = await AiSuggestion.find({ creator: uid(req), isDeleted: false }).sort({ createdAt: -1 });
    ok(res, { suggestions });
  } catch (e) { err(res, e.message); }
};

exports.generateAiSuggestion = async (req, res) => {
  try {
    const { type, prompt, platform, niche } = req.body;
    // Simulate AI generation (in production, call OpenAI/Anthropic API here)
    const niches = { Fashion: 'stylish', Tech: 'innovative', Fitness: 'energetic', Beauty: 'glowing', Food: 'delicious' };
    const adj = niches[niche] || 'amazing';
    const generated = {
      generatedCaption: `✨ Discover this ${adj} ${niche || 'lifestyle'} moment! ${prompt || 'Experience the magic firsthand.'}`,
      hashtags: [`#${niche || 'lifestyle'}`, `#${platform || 'content'}`, '#creator', '#collab', '#trending', `#${adj}`],
      contentIdea: `Create a ${platform || 'social media'} post showcasing the ${adj} side of ${niche || 'your niche'}. Focus on authentic storytelling and audience engagement. Include a call-to-action in the caption.`,
    };
    const suggestion = await AiSuggestion.create({
      creator: uid(req), type, prompt: prompt || '', platform: platform || '', niche: niche || '',
      generatedCaption: type !== 'hashtags' ? generated.generatedCaption : '',
      hashtags: generated.hashtags,
      contentIdea: type !== 'caption' ? generated.contentIdea : '',
    });
    ok(res, { suggestion }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateAiSuggestion = async (req, res) => {
  try {
    const { editedContent, isSaved } = req.body;
    const suggestion = await AiSuggestion.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), isDeleted: false },
      { $set: { editedContent: editedContent || '', isSaved: isSaved !== undefined ? isSaved : true } },
      { new: true }
    );
    if (!suggestion) return err(res, 'Suggestion not found.', 404);
    ok(res, { suggestion });
  } catch (e) { err(res, e.message); }
};

exports.deleteAiSuggestion = async (req, res) => {
  try {
    await AiSuggestion.findOneAndUpdate({ _id: req.params.id, creator: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Suggestion removed.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   13. GROWTH METRICS
   ════════════════════════════════════════════════════════════════════════ */
exports.getGrowthMetrics = async (req, res) => {
  try {
    const { period = '30d', platform = 'All' } = req.query;
    let metric = await GrowthMetric.findOne({ creator: uid(req), period, platform, isDeleted: false });
    if (!metric) metric = await GrowthMetric.create({ creator: uid(req), period, platform });
    ok(res, { metric });
  } catch (e) { err(res, e.message); }
};

exports.updateGrowthMetrics = async (req, res) => {
  try {
    const { period, platform, dailyFollowers, monthlyGrowth, weeklyGrowth, engagementTrend } = req.body;
    const set = { period, platform, generatedAt: new Date() };
    if (dailyFollowers) set.dailyFollowers = dailyFollowers;
    if (monthlyGrowth !== undefined) set.monthlyGrowth = monthlyGrowth;
    if (weeklyGrowth !== undefined) set.weeklyGrowth = weeklyGrowth;
    if (engagementTrend !== undefined) set.engagementTrend = engagementTrend;
    const metric = await GrowthMetric.findOneAndUpdate(
      { creator: uid(req), period, platform }, { $set: set }, { new: true, upsert: true }
    );
    ok(res, { metric });
  } catch (e) { err(res, e.message); }
};

exports.deleteGrowthMetric = async (req, res) => {
  try {
    await GrowthMetric.findOneAndUpdate({ _id: req.params.id, creator: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Growth record deleted.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   14. CONTRACTS (creator side)
   ════════════════════════════════════════════════════════════════════════ */
exports.getContracts = async (req, res) => {
  try {
    const contracts = await CreatorContract.find({ creator: uid(req), isDeleted: false })
      .populate('brand', 'firstName lastName companyName')
      .sort({ createdAt: -1 });
    ok(res, { contracts });
  } catch (e) { err(res, e.message); }
};

exports.uploadContract = async (req, res) => {
  try {
    const { title, brandId, collaborationId, content, expiresAt } = req.body;
    const fileUrl = req.file ? `/uploads/assets/${req.file.filename}` : (req.body.fileUrl || '');
    const contract = await CreatorContract.create({
      creator: uid(req), brand: brandId || null, collaboration: collaborationId || null,
      title, content: content || '', fileUrl, expiresAt: expiresAt || null,
    });
    ok(res, { contract }, 201);
  } catch (e) { err(res, e.message); }
};

exports.signContract = async (req, res) => {
  try {
    const contract = await CreatorContract.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), status: 'pending' },
      { status: 'signed', signedAt: new Date() }, { new: true }
    );
    if (!contract) return err(res, 'Contract not found or already signed.', 404);
    if (contract.brand) {
      await notify(contract.brand, 'system', 'Contract Signed',
        `${req.user.firstName} has signed the contract: "${contract.title}".`
      );
    }
    ok(res, { contract });
  } catch (e) { err(res, e.message); }
};

exports.updateContract = async (req, res) => {
  try {
    const contract = await CreatorContract.findOneAndUpdate(
      { _id: req.params.id, creator: uid(req), isDeleted: false, status: 'pending' },
      { $set: req.body }, { new: true }
    );
    if (!contract) return err(res, 'Contract not found.', 404);
    ok(res, { contract });
  } catch (e) { err(res, e.message); }
};

exports.archiveContract = async (req, res) => {
  try {
    await CreatorContract.findOneAndUpdate({ _id: req.params.id, creator: uid(req) }, { status: 'archived', isDeleted: true });
    ok(res, { message: 'Contract archived.' });
  } catch (e) { err(res, e.message); }
};

/* ════════════════════════════════════════════════════════════════════════
   15. MESSAGING
   ════════════════════════════════════════════════════════════════════════ */
exports.getConversations = async (req, res) => {
  try {
    const userId = uid(req).toString();
    const threads = await Message.aggregate([
      { $match: { $or: [{ sender: uid(req) }, { receiver: uid(req) }], isDeleted: false } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$threadId', lastMessage: { $first: '$$ROOT' }, unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$receiver', uid(req)] }, { $eq: ['$isRead', false] }] }, 1, 0] } } } },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);
    // Populate users
    const User = require('../models/User');
    const enriched = await Promise.all(threads.map(async t => {
      const other = t.lastMessage.sender.toString() === userId
        ? t.lastMessage.receiver : t.lastMessage.sender;
      const user = await User.findById(other).select('firstName lastName avatar companyName');
      return { ...t, participant: user };
    }));
    ok(res, { conversations: enriched });
  } catch (e) { err(res, e.message); }
};

exports.getMessages = async (req, res) => {
  try {
    const threadId = Message.getOrCreateThreadId || ((a, b) => [a,b].sort().join('_'));
    const otherUserId = req.params.userId;
    const tId = [uid(req).toString(), otherUserId].sort().join('_');
    const messages = await Message.find({ threadId: tId, isDeleted: false })
      .populate('sender', 'firstName lastName avatar')
      .sort({ createdAt: 1 });
    // Mark received messages as read
    await Message.updateMany(
      { threadId: tId, receiver: uid(req), isRead: false }, { isRead: true, readAt: new Date() }
    );
    ok(res, { messages, threadId: tId });
  } catch (e) { err(res, e.message); }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, attachments } = req.body;
    const threadId = [uid(req).toString(), receiverId].sort().join('_');
    const message = await Message.create({
      sender: uid(req), receiver: receiverId, threadId, content,
      attachments: attachments || [],
    });
    await message.populate('sender', 'firstName lastName avatar');
    await notify(receiverId, 'message', 'New Message',
      `${req.user.firstName} sent you a message.`, message._id, 'Message'
    );
    ok(res, { message }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateMessage = async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, sender: uid(req), isDraft: true },
      { $set: { content: req.body.content } }, { new: true }
    );
    if (!message) return err(res, 'Draft message not found.', 404);
    ok(res, { message });
  } catch (e) { err(res, e.message); }
};

exports.deleteMessage = async (req, res) => {
  try {
    await Message.findOneAndUpdate({ _id: req.params.id, sender: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Message deleted.' });
  } catch (e) { err(res, e.message); }
};