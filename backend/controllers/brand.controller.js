// backend/controllers/brand.controller.js
const crypto        = require('crypto');
const BrandProfile  = require('../models/Brandprofile');
const Campaign      = require('../models/Campaign');
const { Collaboration, Budget, Asset, TeamMember, Contract, Payment } = require('../models/BrandModels');

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg, status = 500)  => res.status(status).json({ success: false, message: msg });
const uid = (req) => req.user._id;

/* ── 1. BRAND PROFILE ──────────────────────────────────────────────────── */
exports.getProfile = async (req, res) => {
  try {
    let p = await BrandProfile.findOne({ owner: uid(req) });
    if (!p) p = await BrandProfile.create({ owner: uid(req), brandName: req.user.companyName || `${req.user.firstName} Brand` });
    ok(res, { profile: p });
  } catch (e) { err(res, e.message); }
};

exports.updateProfile = async (req, res) => {
  try {
    const fields = ['brandName','industry','logo','website','description','contactName','contactEmail','contactPhone','socialLinks'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    const profile = await BrandProfile.findOneAndUpdate({ owner: uid(req) }, { $set: set }, { new: true, upsert: true, runValidators: true });
    ok(res, { profile });
  } catch (e) { err(res, e.message); }
};

exports.deleteProfile = async (req, res) => {
  try {
    await BrandProfile.findOneAndUpdate({ owner: uid(req) }, { isArchived: true });
    ok(res, { message: 'Profile archived.' });
  } catch (e) { err(res, e.message); }
};

/* ── 2. CAMPAIGNS ──────────────────────────────────────────────────────── */
exports.getCampaigns = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const q = { brand: uid(req), isDeleted: false };
    if (status) q.status = status;
    const [campaigns, total] = await Promise.all([
      Campaign.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Campaign.countDocuments(q),
    ]);
    ok(res, { campaigns, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) { err(res, e.message); }
};

exports.getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, brand: uid(req), isDeleted: false });
    if (!campaign) return err(res, 'Campaign not found.', 404);
    ok(res, { campaign });
  } catch (e) { err(res, e.message); }
};

exports.createCampaign = async (req, res) => {
  try {
    const { title, description, budget, startDate, endDate, platforms, contentReqs, niche, slots, status } = req.body;
    const campaign = await Campaign.create({
      brand: uid(req), title, description: description || '', budget, startDate, endDate,
      platforms: platforms || [], contentReqs: contentReqs || '', niche: niche || '',
      slots: slots || 1, status: status || 'draft',
    });
    ok(res, { campaign }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateCampaign = async (req, res) => {
  try {
    const fields = ['title','description','budget','startDate','endDate','platforms','contentReqs','niche','slots','status'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    const campaign = await Campaign.findOneAndUpdate({ _id: req.params.id, brand: uid(req), isDeleted: false }, { $set: set }, { new: true, runValidators: true });
    if (!campaign) return err(res, 'Campaign not found.', 404);
    ok(res, { campaign });
  } catch (e) { err(res, e.message); }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { isDeleted: true, status: 'cancelled' }, { new: true });
    if (!campaign) return err(res, 'Campaign not found.', 404);
    ok(res, { message: 'Campaign cancelled.' });
  } catch (e) { err(res, e.message); }
};

/* ── 3. COLLABORATIONS ─────────────────────────────────────────────────── */
exports.getCollaborations = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { brand: uid(req), isDeleted: false };
    if (status) q.status = status;
    const collaborations = await Collaboration.find(q)
      .populate('creator', 'firstName lastName email avatar platform')
      .populate('campaign', 'title budget status')
      .sort({ createdAt: -1 });
    ok(res, { collaborations });
  } catch (e) { err(res, e.message); }
};

exports.createCollaboration = async (req, res) => {
  try {
    const { creator, campaign, deliverables, paymentTerms, amount, message } = req.body;
    if (!creator) return err(res, 'Creator ID is required.', 422);
    const collab = await Collaboration.create({
      brand: uid(req), creator, campaign: campaign || undefined,
      deliverables: deliverables || '', paymentTerms: paymentTerms || '',
      amount: amount || 0, message: message || '',
    });
    ok(res, { collaboration: collab }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateCollaboration = async (req, res) => {
  try {
    const fields = ['deliverables','paymentTerms','amount','status','message'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    const collab = await Collaboration.findOneAndUpdate({ _id: req.params.id, brand: uid(req), isDeleted: false }, { $set: set }, { new: true });
    if (!collab) return err(res, 'Collaboration not found.', 404);
    ok(res, { collaboration: collab });
  } catch (e) { err(res, e.message); }
};

exports.deleteCollaboration = async (req, res) => {
  try {
    await Collaboration.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { isDeleted: true, status: 'cancelled' });
    ok(res, { message: 'Collaboration cancelled.' });
  } catch (e) { err(res, e.message); }
};

/* ── 4. BUDGET ─────────────────────────────────────────────────────────── */
exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ brand: uid(req), isDeleted: false })
      .populate('campaign', 'title status').sort({ createdAt: -1 });
    ok(res, { budgets });
  } catch (e) { err(res, e.message); }
};

exports.createBudget = async (req, res) => {
  try {
    const { title, totalAmount, campaign, allocations } = req.body;
    if (!title || !totalAmount) return err(res, 'Title and total amount are required.', 422);
    const allocated = (allocations || []).reduce((s, a) => s + (a.amount || 0), 0);
    const budget = await Budget.create({
      brand: uid(req), title, totalAmount, campaign: campaign || undefined,
      allocations: allocations || [], allocated,
    });
    ok(res, { budget }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateBudget = async (req, res) => {
  try {
    const fields = ['title','totalAmount','campaign','allocations'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    if (set.allocations) set.allocated = set.allocations.reduce((s, a) => s + (a.amount || 0), 0);
    const budget = await Budget.findOneAndUpdate({ _id: req.params.id, brand: uid(req), isDeleted: false }, { $set: set }, { new: true });
    if (!budget) return err(res, 'Budget not found.', 404);
    ok(res, { budget });
  } catch (e) { err(res, e.message); }
};

exports.deleteBudget = async (req, res) => {
  try {
    await Budget.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Budget removed.' });
  } catch (e) { err(res, e.message); }
};

/* ── 5. ASSETS ─────────────────────────────────────────────────────────── */
exports.getAssets = async (req, res) => {
  try {
    const { type } = req.query;
    const q = { brand: uid(req), isDeleted: false };
    if (type) q.type = type;
    const assets = await Asset.find(q).sort({ createdAt: -1 });
    ok(res, { assets });
  } catch (e) { err(res, e.message); }
};

exports.createAsset = async (req, res) => {
  try {
    const { name, type, url, size, mimeType } = req.body;
    if (!name || !url) return err(res, 'Name and URL are required.', 422);
    const asset = await Asset.create({ brand: uid(req), name, type: type || 'other', url, size: size || 0, mimeType: mimeType || '' });
    ok(res, { asset }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateAsset = async (req, res) => {
  try {
    const fields = ['name','type','url','size','mimeType'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    const asset = await Asset.findOneAndUpdate({ _id: req.params.id, brand: uid(req), isDeleted: false }, { $set: set }, { new: true });
    if (!asset) return err(res, 'Asset not found.', 404);
    ok(res, { asset });
  } catch (e) { err(res, e.message); }
};

exports.deleteAsset = async (req, res) => {
  try {
    await Asset.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { isDeleted: true });
    ok(res, { message: 'Asset removed.' });
  } catch (e) { err(res, e.message); }
};

/* ── 6. TEAM ───────────────────────────────────────────────────────────── */
exports.getTeam = async (req, res) => {
  try {
    const team = await TeamMember.find({ brand: uid(req), isActive: true }).sort({ createdAt: -1 });
    ok(res, { team });
  } catch (e) { err(res, e.message); }
};

exports.addTeamMember = async (req, res) => {
  try {
    const { name, email, role, phone } = req.body;
    if (!name || !email) return err(res, 'Name and email are required.', 422);
    const exists = await TeamMember.findOne({ brand: uid(req), email: email.toLowerCase(), isActive: true });
    if (exists) return err(res, 'A team member with this email already exists.', 409);
    const member = await TeamMember.create({ brand: uid(req), name, email, role: role || 'Other', phone: phone || '' });
    ok(res, { member }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateTeamMember = async (req, res) => {
  try {
    const fields = ['name','email','role','phone'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    const member = await TeamMember.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { $set: set }, { new: true, runValidators: true });
    if (!member) return err(res, 'Team member not found.', 404);
    ok(res, { member });
  } catch (e) { err(res, e.message); }
};

exports.removeTeamMember = async (req, res) => {
  try {
    await TeamMember.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { isActive: false });
    ok(res, { message: 'Team member removed.' });
  } catch (e) { err(res, e.message); }
};

/* ── 7. ANALYTICS ──────────────────────────────────────────────────────── */
exports.getAnalytics = async (req, res) => {
  try {
    const bid = uid(req);
    const [totalCampaigns, activeCampaigns, totalCollabs, completedCollabs, budgetAgg, paymentAgg] = await Promise.all([
      Campaign.countDocuments({ brand: bid, isDeleted: false }),
      Campaign.countDocuments({ brand: bid, isDeleted: false, status: 'active' }),
      Collaboration.countDocuments({ brand: bid, isDeleted: false }),
      Collaboration.countDocuments({ brand: bid, isDeleted: false, status: 'completed' }),
      Budget.aggregate([{ $match: { brand: bid, isDeleted: false } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, allocated: { $sum: '$allocated' } } }]),
      Payment.aggregate([{ $match: { brand: bid, isDeleted: false, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    ok(res, {
      analytics: {
        totalCampaigns, activeCampaigns,
        totalCollaborations: totalCollabs, completedCollaborations: completedCollabs,
        totalBudget:     budgetAgg[0]?.total     || 0,
        allocatedBudget: budgetAgg[0]?.allocated || 0,
        totalPaid:       paymentAgg[0]?.total    || 0,
      },
    });
  } catch (e) { err(res, e.message); }
};

/* ── 8. CONTRACTS ──────────────────────────────────────────────────────── */
exports.getContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({ brand: uid(req), isDeleted: false })
      .populate('creator', 'firstName lastName email avatar')
      .populate('collaboration', 'status amount')
      .sort({ createdAt: -1 });
    ok(res, { contracts });
  } catch (e) { err(res, e.message); }
};

exports.createContract = async (req, res) => {
  try {
    const { title, creator, collaboration, content, fileUrl, status } = req.body;
    if (!title) return err(res, 'Contract title is required.', 422);
    const contract = await Contract.create({
      brand: uid(req), title, creator: creator || undefined, collaboration: collaboration || undefined,
      content: content || '', fileUrl: fileUrl || '', status: status || 'draft',
    });
    ok(res, { contract }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updateContract = async (req, res) => {
  try {
    const fields = ['title','content','fileUrl','status','signedAt'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    if (set.status === 'signed' && !set.signedAt) set.signedAt = new Date();
    const contract = await Contract.findOneAndUpdate({ _id: req.params.id, brand: uid(req), isDeleted: false }, { $set: set }, { new: true });
    if (!contract) return err(res, 'Contract not found.', 404);
    ok(res, { contract });
  } catch (e) { err(res, e.message); }
};

exports.deleteContract = async (req, res) => {
  try {
    await Contract.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { isDeleted: true, status: 'archived' });
    ok(res, { message: 'Contract archived.' });
  } catch (e) { err(res, e.message); }
};

/* ── 9. PAYMENTS ───────────────────────────────────────────────────────── */
exports.getPayments = async (req, res) => {
  try {
    const { status } = req.query;
    const q = { brand: uid(req), isDeleted: false };
    if (status) q.status = status;
    const payments = await Payment.find(q)
      .populate('creator', 'firstName lastName email avatar')
      .populate('collaboration', 'status amount deliverables')
      .sort({ createdAt: -1 });
    ok(res, { payments });
  } catch (e) { err(res, e.message); }
};

exports.createPayment = async (req, res) => {
  try {
    const { creator, collaboration, amount, currency, dueDate, notes } = req.body;
    if (!creator || !amount) return err(res, 'Creator and amount are required.', 422);
    const invoiceNumber = `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payment = await Payment.create({
      brand: uid(req), creator, collaboration: collaboration || undefined,
      amount, currency: currency || 'USD', dueDate: dueDate || undefined,
      notes: notes || '', invoiceNumber,
    });
    ok(res, { payment }, 201);
  } catch (e) { err(res, e.message); }
};

exports.updatePayment = async (req, res) => {
  try {
    const fields = ['status','dueDate','notes','paidAt'];
    const set = {};
    fields.forEach(f => { if (req.body[f] !== undefined) set[f] = req.body[f]; });
    if (set.status === 'paid' && !set.paidAt) set.paidAt = new Date();
    const payment = await Payment.findOneAndUpdate({ _id: req.params.id, brand: uid(req), isDeleted: false }, { $set: set }, { new: true });
    if (!payment) return err(res, 'Payment not found.', 404);
    ok(res, { payment });
  } catch (e) { err(res, e.message); }
};

exports.deletePayment = async (req, res) => {
  try {
    await Payment.findOneAndUpdate({ _id: req.params.id, brand: uid(req) }, { isDeleted: true, status: 'cancelled' });
    ok(res, { message: 'Invoice cancelled.' });
  } catch (e) { err(res, e.message); }
};