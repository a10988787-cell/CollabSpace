// backend/controllers/admin.controller.js
// Complete CRUD controllers for all 15 admin modules

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Campaign = require('../models/Campaign');
const xlsx = require('xlsx');
const {
  AdminUser, Report, AdminNotification, Role,
  Setting, Category, AuditLog, Plan, FeatureFlag, ContentReview,
} = require('../models/AdminModels');

let Payment, Collaboration;
try {
  ({ Payment, Collaboration } = require('../models/Brandmodels'));
} catch (_) {}

// ── Response helpers ────────────────────────────────────────────────────────
const ok   = (res, data, code = 200) => res.status(code).json({ success: true,  ...data });
const fail = (res, msg,  code = 400) => res.status(code).json({ success: false, message: msg });

// ── Pagination helper ───────────────────────────────────────────────────────
const paginate = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);
  return { page, limit, skip: (page - 1) * limit };
};

// ── Audit helper — auto-log writes ─────────────────────────────────────────
const audit = async (req, action, module, entityId = '', changes = {}) => {
  try {
    await AuditLog.create({
      admin:     req.user?._id || req.user?.id,
      action,
      module,
      entityId:  String(entityId),
      changes,
      ip:        req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      status:    'success',
    });
  } catch (_) { /* never block response on audit failure */ }
};

// ════════════════════════════════════════════════════════════════════════════
// 1. ADMIN ACCOUNT MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
exports.listAdminUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search = '', role = '', isActive } = req.query;
    const q = {};
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role)   q.role = role;
    if (isActive !== undefined) q.isActive = isActive === 'true';
    const [data, total] = await Promise.all([
      AdminUser.find(q).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AdminUser.countDocuments(q),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, role, permissions, password } = req.body;
    if (!name)  return fail(res, 'Name is required');
    if (!email) return fail(res, 'Email is required');
    const exists = await AdminUser.findOne({ email: email.toLowerCase() });
    if (exists) return fail(res, 'Email already registered');
    const d = await AdminUser.create({
      name, email, role, permissions: permissions || [],
      password: password || 'Admin@12345',
      createdBy: req.user?._id,
    });
    await audit(req, 'admin_user.create', 'admin-users', d._id, { name, email, role });
    ok(res, { data: { ...d.toObject(), password: undefined } }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getAdminUser = async (req, res) => {
  try {
    const d = await AdminUser.findById(req.params.id).select('-password');
    if (!d) return fail(res, 'Admin user not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateAdminUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const update = { ...rest };
    if (password) update.password = await bcrypt.hash(password, 12);
    const d = await AdminUser.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select('-password');
    if (!d) return fail(res, 'Admin user not found', 404);
    await audit(req, 'admin_user.update', 'admin-users', d._id, rest);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteAdminUser = async (req, res) => {
  try {
    const d = await AdminUser.findByIdAndDelete(req.params.id);
    if (!d) return fail(res, 'Admin user not found', 404);
    await audit(req, 'admin_user.delete', 'admin-users', req.params.id, { email: d.email });
    ok(res, { message: 'Admin account deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 2. CREATOR MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
exports.listCreators = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search = '', isVerified, isActive } = req.query;
    const q = { role: 'creator' };
    if (search) q.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
    ];
    if (isVerified !== undefined) q.isVerified = isVerified === 'true';
    if (isActive   !== undefined) q.isActive   = isActive   === 'true';
    const [data, total] = await Promise.all([
      User.find(q).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(q),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createCreator = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return fail(res, 'Email is required');
    const exists = await User.findOne({ email });
    if (exists) return fail(res, 'Email already registered');
    const d = await User.create({ ...req.body, role: 'creator', isVerified: false });
    await audit(req, 'creator.create', 'creators', d._id, { email });
    ok(res, { data: d.toPublicJSON() }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getCreator = async (req, res) => {
  try {
    const d = await User.findOne({ _id: req.params.id, role: 'creator' }).select('-password');
    if (!d) return fail(res, 'Creator not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateCreator = async (req, res) => {
  try {
    const { password, role, ...rest } = req.body;
    const d = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true }).select('-password');
    if (!d) return fail(res, 'Creator not found', 404);
    await audit(req, 'creator.update', 'creators', d._id, rest);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteCreator = async (req, res) => {
  try {
    const { permanent } = req.query;
    if (permanent === 'true') {
      await User.findByIdAndDelete(req.params.id);
      await audit(req, 'creator.delete_permanent', 'creators', req.params.id);
      return ok(res, { message: 'Creator permanently deleted' });
    }
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    await audit(req, 'creator.suspend', 'creators', req.params.id);
    ok(res, { message: 'Creator suspended' });
  } catch (e) { fail(res, e.message, 500); }
};

exports.verifyCreator = async (req, res) => {
  try {
    const d = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }).select('-password');
    if (!d) return fail(res, 'Creator not found', 404);
    await audit(req, 'creator.verify', 'creators', d._id);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

// ════════════════════════════════════════════════════════════════════════════
// 3. BRAND MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
exports.listBrands = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search = '', isActive } = req.query;
    const q = { role: 'brand' };
    if (search) q.$or = [
      { firstName:   { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { email:       { $regex: search, $options: 'i' } },
    ];
    if (isActive !== undefined) q.isActive = isActive === 'true';
    const [data, total] = await Promise.all([
      User.find(q).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(q),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createBrand = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return fail(res, 'Email is required');
    const exists = await User.findOne({ email });
    if (exists) return fail(res, 'Email already registered');
    const d = await User.create({ ...req.body, role: 'brand' });
    await audit(req, 'brand.create', 'brands', d._id, { email });
    ok(res, { data: d.toPublicJSON() }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getBrand = async (req, res) => {
  try {
    const d = await User.findOne({ _id: req.params.id, role: 'brand' }).select('-password');
    if (!d) return fail(res, 'Brand not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateBrand = async (req, res) => {
  try {
    const { password, role, ...rest } = req.body;
    const d = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true }).select('-password');
    if (!d) return fail(res, 'Brand not found', 404);
    await audit(req, 'brand.update', 'brands', d._id, rest);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteBrand = async (req, res) => {
  try {
    const { permanent } = req.query;
    if (permanent === 'true') {
      await User.findByIdAndDelete(req.params.id);
      await audit(req, 'brand.delete_permanent', 'brands', req.params.id);
      return ok(res, { message: 'Brand permanently deleted' });
    }
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    await audit(req, 'brand.remove', 'brands', req.params.id);
    ok(res, { message: 'Brand removed' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 4. CAMPAIGN MODERATION
// ════════════════════════════════════════════════════════════════════════════
exports.listCampaigns = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search = '', status, niche } = req.query;
    const q = { isDeleted: false };
    if (status) q.status = status;
    if (niche)  q.niche  = niche;
    if (search) q.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    const [data, total] = await Promise.all([
      Campaign.find(q).populate('brand', 'firstName lastName companyName email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Campaign.countDocuments(q),
    ]);
    const stats = {
      total:    await Campaign.countDocuments({ isDeleted: false }),
      active:   await Campaign.countDocuments({ status: 'active',   isDeleted: false }),
      pending:  await Campaign.countDocuments({ status: 'draft',    isDeleted: false }),
      paused:   await Campaign.countDocuments({ status: 'paused',   isDeleted: false }),
      completed:await Campaign.countDocuments({ status: 'completed',isDeleted: false }),
    };
    ok(res, { data, total, page, pages: Math.ceil(total / limit), stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createCampaign = async (req, res) => {
  try {
    if (!req.body.title)  return fail(res, 'Title is required');
    if (!req.body.budget) return fail(res, 'Budget is required');
    const d = await Campaign.create(req.body);
    await audit(req, 'campaign.create', 'campaigns', d._id, { title: d.title });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getCampaign = async (req, res) => {
  try {
    const d = await Campaign.findById(req.params.id).populate('brand', 'firstName lastName companyName email');
    if (!d || d.isDeleted) return fail(res, 'Campaign not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateCampaign = async (req, res) => {
  try {
    const d = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!d) return fail(res, 'Campaign not found', 404);
    await audit(req, 'campaign.update', 'campaigns', d._id, { status: d.status });
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const { permanent } = req.query;
    if (permanent === 'true') {
      await Campaign.findByIdAndDelete(req.params.id);
      await audit(req, 'campaign.delete_permanent', 'campaigns', req.params.id);
      return ok(res, { message: 'Campaign permanently deleted' });
    }
    await Campaign.findByIdAndUpdate(req.params.id, { isDeleted: true, status: 'cancelled' });
    await audit(req, 'campaign.remove', 'campaigns', req.params.id);
    ok(res, { message: 'Campaign removed' });
  } catch (e) { fail(res, e.message, 500); }
};

exports.approveCampaign = async (req, res) => {
  try {
    const d = await Campaign.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
    if (!d) return fail(res, 'Campaign not found', 404);
    await audit(req, 'campaign.approve', 'campaigns', d._id);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.rejectCampaign = async (req, res) => {
  try {
    const d = await Campaign.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!d) return fail(res, 'Campaign not found', 404);
    await audit(req, 'campaign.reject', 'campaigns', d._id);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

// ════════════════════════════════════════════════════════════════════════════
// 5. CONTENT MODERATION
// ════════════════════════════════════════════════════════════════════════════
exports.listContent = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search = '', status, type } = req.query;
    const q = {};
    if (status) q.status = status;
    if (type)   q.type   = type;
    if (search) q.$or = [{ title: { $regex: search, $options: 'i' } }];
    const [data, total] = await Promise.all([
      ContentReview.find(q)
        .populate('creator',  'firstName lastName email')
        .populate('reviewer', 'firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      ContentReview.countDocuments(q),
    ]);
    const stats = {
      total:    await ContentReview.countDocuments(),
      pending:  await ContentReview.countDocuments({ status: 'pending' }),
      approved: await ContentReview.countDocuments({ status: 'approved' }),
      rejected: await ContentReview.countDocuments({ status: 'rejected' }),
      flagged:  await ContentReview.countDocuments({ status: 'flagged' }),
    };
    ok(res, { data, total, page, pages: Math.ceil(total / limit), stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createContent = async (req, res) => {
  try {
    if (!req.body.title) return fail(res, 'Title is required');
    const d = await ContentReview.create({ ...req.body, reviewer: req.user?._id });
    await audit(req, 'content.create', 'content', d._id);
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getContent = async (req, res) => {
  try {
    const d = await ContentReview.findById(req.params.id).populate('creator reviewer', 'firstName lastName email');
    if (!d) return fail(res, 'Content not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateContent = async (req, res) => {
  try {
    const update = { ...req.body };
    if (['approved','rejected','flagged'].includes(update.status)) {
      update.reviewer   = req.user?._id;
      update.reviewedAt = new Date();
    }
    const d = await ContentReview.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!d) return fail(res, 'Content not found', 404);
    await audit(req, `content.${update.status || 'update'}`, 'content', d._id);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteContent = async (req, res) => {
  try {
    await ContentReview.findByIdAndDelete(req.params.id);
    await audit(req, 'content.delete', 'content', req.params.id);
    ok(res, { message: 'Content review deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 6. PLATFORM ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
exports.getAnalytics = async (req, res) => {
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
        month: start.toLocaleString('en', { month: 'short' }) + ' ' + start.getFullYear(),
        creators, brands, campaigns, collabs,
      });
    }

    const [
      totalCreators, totalBrands, totalCampaigns, totalCollabs,
      activeCreators, activeBrands, activeCampaigns, pendingCampaigns,
      totalContent, pendingContent,
    ] = await Promise.all([
      User.countDocuments({ role: 'creator' }),
      User.countDocuments({ role: 'brand' }),
      Campaign.countDocuments({ isDeleted: false }),
      Collaboration ? Collaboration.countDocuments() : 0,
      User.countDocuments({ role: 'creator', isActive: true }),
      User.countDocuments({ role: 'brand',   isActive: true }),
      Campaign.countDocuments({ status: 'active',   isDeleted: false }),
      Campaign.countDocuments({ status: 'draft',    isDeleted: false }),
      ContentReview.countDocuments(),
      ContentReview.countDocuments({ status: 'pending' }),
    ]);

    ok(res, {
      kpis: {
        totalCreators, totalBrands, totalCampaigns, totalCollabs,
        activeCreators, activeBrands, activeCampaigns, pendingCampaigns,
        totalContent, pendingContent,
      },
      monthly,
      data: monthly, // alias so frontend generic loader works
    });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 7. PAYMENTS & TRANSACTIONS
// ════════════════════════════════════════════════════════════════════════════
exports.listPayments = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { status, search = '' } = req.query;
    const q = {};
    if (status) q.status = status;
    if (search && Payment) q.$or = [{ description: { $regex: search, $options: 'i' } }];
    if (!Payment) return ok(res, { data: [], total: 0 });
    const [data, total] = await Promise.all([
      Payment.find(q).populate('brand creator', 'firstName lastName companyName email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Payment.countDocuments(q),
    ]);
    const stats = {
      total:    await Payment.countDocuments(),
      paid:     await Payment.countDocuments({ status: 'paid' }),
      pending:  await Payment.countDocuments({ status: 'pending' }),
      failed:   await Payment.countDocuments({ status: 'failed' }),
      refunded: await Payment.countDocuments({ status: 'refunded' }),
    };
    ok(res, { data, total, page, pages: Math.ceil(total / limit), stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createPayment = async (req, res) => {
  try {
    if (!Payment) return fail(res, 'Payment model unavailable');
    if (!req.body.amount) return fail(res, 'Amount is required');
    const d = await Payment.create(req.body);
    await audit(req, 'payment.create', 'payments', d._id, { amount: d.amount });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getPayment = async (req, res) => {
  try {
    if (!Payment) return fail(res, 'Payment model unavailable');
    const d = await Payment.findById(req.params.id).populate('brand creator', 'firstName lastName');
    if (!d) return fail(res, 'Payment not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updatePayment = async (req, res) => {
  try {
    if (!Payment) return fail(res, 'Payment model unavailable');
    const d = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return fail(res, 'Payment not found', 404);
    await audit(req, 'payment.update', 'payments', d._id, { status: d.status });
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deletePayment = async (req, res) => {
  try {
    if (!Payment) return fail(res, 'Payment model unavailable');
    await Payment.findByIdAndDelete(req.params.id);
    await audit(req, 'payment.delete', 'payments', req.params.id);
    ok(res, { message: 'Transaction deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 8. REPORTS & COMPLAINTS
// ════════════════════════════════════════════════════════════════════════════
exports.listReports = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { status, type, priority, search = '' } = req.query;
    const q = {};
    if (status)   q.status   = status;
    if (type)     q.type     = type;
    if (priority) q.priority = priority;
    if (search)   q.description = { $regex: search, $options: 'i' };
    const [data, total] = await Promise.all([
      Report.find(q)
        .populate('reporter',     'firstName lastName email')
        .populate('reportedUser', 'firstName lastName email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Report.countDocuments(q),
    ]);
    const stats = {
      total:       await Report.countDocuments(),
      pending:     await Report.countDocuments({ status: 'pending' }),
      under_review:await Report.countDocuments({ status: 'under_review' }),
      resolved:    await Report.countDocuments({ status: 'resolved' }),
      dismissed:   await Report.countDocuments({ status: 'dismissed' }),
    };
    ok(res, { data, total, page, pages: Math.ceil(total / limit), stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createReport = async (req, res) => {
  try {
    if (!req.body.type)        return fail(res, 'Type is required');
    if (!req.body.description) return fail(res, 'Description is required');
    const d = await Report.create({ ...req.body, reporter: req.body.reporter || req.user?._id });
    await audit(req, 'report.create', 'reports', d._id, { type: d.type });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getReport = async (req, res) => {
  try {
    const d = await Report.findById(req.params.id).populate('reporter reportedUser resolvedBy', 'firstName lastName email');
    if (!d) return fail(res, 'Report not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateReport = async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === 'resolved') {
      update.resolvedBy = req.user?._id;
      update.resolvedAt = new Date();
    }
    const d = await Report.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!d) return fail(res, 'Report not found', 404);
    await audit(req, `report.${update.status || 'update'}`, 'reports', d._id);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteReport = async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    await audit(req, 'report.delete', 'reports', req.params.id);
    ok(res, { message: 'Report deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 9. NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════════
exports.listNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { type, audience, search = '' } = req.query;
    const q = {};
    if (type)     q.type     = type;
    if (audience) q.audience = audience;
    if (search)   q.$or = [{ title: { $regex: search, $options: 'i' } }, { message: { $regex: search, $options: 'i' } }];
    const [data, total] = await Promise.all([
      AdminNotification.find(q).populate('createdBy', 'firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AdminNotification.countDocuments(q),
    ]);
    const stats = {
      total:    await AdminNotification.countDocuments(),
      today:    await AdminNotification.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      active:   await AdminNotification.countDocuments({ isActive: true }),
      inactive: await AdminNotification.countDocuments({ isActive: false }),
    };
    ok(res, { data, total, page, pages: Math.ceil(total / limit), stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createNotification = async (req, res) => {
  try {
    if (!req.body.title)   return fail(res, 'Title is required');
    if (!req.body.message) return fail(res, 'Message is required');
    const d = await AdminNotification.create({
      ...req.body,
      createdBy: req.user?._id,
      sentAt: new Date(),
    });
    await audit(req, 'notification.send', 'notifications', d._id, { title: d.title, audience: d.audience });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getNotification = async (req, res) => {
  try {
    const d = await AdminNotification.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!d) return fail(res, 'Notification not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateNotification = async (req, res) => {
  try {
    const d = await AdminNotification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return fail(res, 'Notification not found', 404);
    await audit(req, 'notification.update', 'notifications', d._id);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteNotification = async (req, res) => {
  try {
    await AdminNotification.findByIdAndDelete(req.params.id);
    await audit(req, 'notification.delete', 'notifications', req.params.id);
    ok(res, { message: 'Notification deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 10. ROLES & PERMISSIONS
// ════════════════════════════════════════════════════════════════════════════
exports.listRoles = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const q = {};
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { label: { $regex: search, $options: 'i' } }];
    const data = await Role.find(q).populate('createdBy', 'firstName lastName').sort({ createdAt: -1 });
    const stats = {
      total: data.length,
      system: data.filter(r => r.isSystem).length,
      custom: data.filter(r => !r.isSystem).length,
      perms:  [...new Set(data.flatMap(r => r.permissions))].length,
    };
    ok(res, { data, stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createRole = async (req, res) => {
  try {
    if (!req.body.name)  return fail(res, 'Role name is required');
    if (!req.body.label) return fail(res, 'Display label is required');
    const exists = await Role.findOne({ name: req.body.name.toLowerCase() });
    if (exists) return fail(res, 'Role name already exists');
    const d = await Role.create({ ...req.body, createdBy: req.user?._id });
    await audit(req, 'role.create', 'roles', d._id, { name: d.name });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getRole = async (req, res) => {
  try {
    const d = await Role.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!d) return fail(res, 'Role not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateRole = async (req, res) => {
  try {
    const existing = await Role.findById(req.params.id);
    if (!existing) return fail(res, 'Role not found', 404);
    if (existing.isSystem && req.body.name) return fail(res, 'Cannot rename system roles');
    const d = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await audit(req, 'role.update', 'roles', d._id, { permissions: d.permissions });
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteRole = async (req, res) => {
  try {
    const existing = await Role.findById(req.params.id);
    if (!existing) return fail(res, 'Role not found', 404);
    if (existing.isSystem) return fail(res, 'Cannot delete system roles');
    await Role.findByIdAndDelete(req.params.id);
    await audit(req, 'role.delete', 'roles', req.params.id, { name: existing.name });
    ok(res, { message: 'Role deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 11. PLATFORM SETTINGS
// ════════════════════════════════════════════════════════════════════════════
exports.listSettings = async (req, res) => {
  try {
    const { group, search = '' } = req.query;
    const q = {};
    if (group)  q.group = group;
    if (search) q.$or = [{ key: { $regex: search, $options: 'i' } }, { label: { $regex: search, $options: 'i' } }];
    const data = await Setting.find(q).sort({ group: 1, key: 1 });
    const groups = [...new Set(data.map(s => s.group))];
    ok(res, { data, groups });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createSetting = async (req, res) => {
  try {
    if (!req.body.key)   return fail(res, 'Key is required');
    if (req.body.value === undefined) return fail(res, 'Value is required');
    const d = await Setting.findOneAndUpdate(
      { key: req.body.key },
      { ...req.body, updatedBy: req.user?._id, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true },
    );
    await audit(req, 'setting.upsert', 'settings', d._id, { key: d.key });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getSetting = async (req, res) => {
  try {
    const d = await Setting.findById(req.params.id);
    if (!d) return fail(res, 'Setting not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateSetting = async (req, res) => {
  try {
    if (req.body.key) delete req.body.key; // key is immutable after creation
    const d = await Setting.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id, updatedAt: new Date() },
      { new: true },
    );
    if (!d) return fail(res, 'Setting not found', 404);
    await audit(req, 'setting.update', 'settings', d._id, { key: d.key, value: d.value });
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteSetting = async (req, res) => {
  try {
    const d = await Setting.findById(req.params.id);
    if (!d) return fail(res, 'Setting not found', 404);
    if (d.isReadOnly) return fail(res, 'This setting is read-only');
    await Setting.findByIdAndDelete(req.params.id);
    await audit(req, 'setting.delete', 'settings', req.params.id, { key: d.key });
    ok(res, { message: 'Setting deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 12. CATEGORIES & NICHES
// ════════════════════════════════════════════════════════════════════════════
exports.listCategories = async (req, res) => {
  try {
    const { search = '', isActive } = req.query;
    const q = {};
    if (search)   q.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    if (isActive !== undefined) q.isActive = isActive === 'true';
    const data = await Category.find(q).sort({ sortOrder: 1, name: 1 });
    const stats = {
      total:    data.length,
      active:   data.filter(c => c.isActive).length,
      inactive: data.filter(c => !c.isActive).length,
    };
    ok(res, { data, stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createCategory = async (req, res) => {
  try {
    if (!req.body.name) return fail(res, 'Category name is required');
    const exists = await Category.findOne({ name: req.body.name.trim() });
    if (exists) return fail(res, 'Category already exists');
    const d = await Category.create({ ...req.body, createdBy: req.user?._id });
    await audit(req, 'category.create', 'categories', d._id, { name: d.name });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getCategory = async (req, res) => {
  try {
    const d = await Category.findById(req.params.id);
    if (!d) return fail(res, 'Category not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateCategory = async (req, res) => {
  try {
    if (req.body.name) {
      req.body.slug = req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    const d = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!d) return fail(res, 'Category not found', 404);
    await audit(req, 'category.update', 'categories', d._id);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteCategory = async (req, res) => {
  try {
    const d = await Category.findByIdAndDelete(req.params.id);
    if (!d) return fail(res, 'Category not found', 404);
    await audit(req, 'category.delete', 'categories', req.params.id, { name: d.name });
    ok(res, { message: 'Category deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 13. AUDIT LOGS
// ════════════════════════════════════════════════════════════════════════════
exports.listAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search = '', module, action, status, from, to } = req.query;
    const q = {};
    if (module) q.module = module;
    if (action) q.action = { $regex: action, $options: 'i' };
    if (status) q.status = status;
    if (search) q.$or = [
      { action:  { $regex: search, $options: 'i' } },
      { details: { $regex: search, $options: 'i' } },
      { entity:  { $regex: search, $options: 'i' } },
    ];
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to)   q.createdAt.$lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      AuditLog.find(q).populate('admin', 'firstName lastName email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(q),
    ]);
    const now = new Date();
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const stats = {
      total:   await AuditLog.countDocuments(),
      today:   await AuditLog.countDocuments({ createdAt: { $gte: todayStart } }),
      week:    await AuditLog.countDocuments({ createdAt: { $gte: weekStart  } }),
      failure: await AuditLog.countDocuments({ status: 'failure' }),
    };
    ok(res, { data, total, page, pages: Math.ceil(total / limit), stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createAuditLog = async (req, res) => {
  try {
    if (!req.body.action) return fail(res, 'Action is required');
    const d = await AuditLog.create({
      ...req.body,
      admin:     req.user?._id,
      ip:        req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getAuditLog = async (req, res) => {
  try {
    const d = await AuditLog.findById(req.params.id).populate('admin', 'firstName lastName email');
    if (!d) return fail(res, 'Audit log not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateAuditLog = async (req, res) => {
  try {
    const { details, status } = req.body; // only metadata is updatable
    const d = await AuditLog.findByIdAndUpdate(req.params.id, { details, status }, { new: true });
    if (!d) return fail(res, 'Audit log not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteAuditLog = async (req, res) => {
  try {
    await AuditLog.findByIdAndDelete(req.params.id);
    ok(res, { message: 'Audit log deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 14. SUBSCRIPTION PLANS
// ════════════════════════════════════════════════════════════════════════════
exports.listPlans = async (req, res) => {
  try {
    const { isActive } = req.query;
    const q = {};
    if (isActive !== undefined) q.isActive = isActive === 'true';
    const data = await Plan.find(q).sort({ sortOrder: 1, price: 1 });
    const stats = {
      total:    data.length,
      active:   data.filter(p => p.isActive).length,
      subs:     data.reduce((sum, p) => sum + (p.subscriberCount || 0), 0),
      revenue:  data.reduce((sum, p) => sum + (p.price * (p.subscriberCount || 0)), 0),
    };
    ok(res, { data, stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createPlan = async (req, res) => {
  try {
    if (!req.body.name)                 return fail(res, 'Plan name is required');
    if (req.body.price === undefined)   return fail(res, 'Price is required');
    const d = await Plan.create({ ...req.body, createdBy: req.user?._id });
    await audit(req, 'plan.create', 'subscriptions', d._id, { name: d.name, price: d.price });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getPlan = async (req, res) => {
  try {
    const d = await Plan.findById(req.params.id);
    if (!d) return fail(res, 'Plan not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updatePlan = async (req, res) => {
  try {
    const d = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!d) return fail(res, 'Plan not found', 404);
    await audit(req, 'plan.update', 'subscriptions', d._id, { price: d.price });
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deletePlan = async (req, res) => {
  try {
    const d = await Plan.findById(req.params.id);
    if (!d) return fail(res, 'Plan not found', 404);
    if (d.subscriberCount > 0) return fail(res, `Cannot delete plan with ${d.subscriberCount} active subscriber(s)`);
    await Plan.findByIdAndDelete(req.params.id);
    await audit(req, 'plan.delete', 'subscriptions', req.params.id, { name: d.name });
    ok(res, { message: 'Plan deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// 15. FEATURE FLAGS
// ════════════════════════════════════════════════════════════════════════════
exports.listFeatureFlags = async (req, res) => {
  try {
    const { search = '', enabled, audience } = req.query;
    const q = {};
    if (enabled !== undefined) q.enabled = enabled === 'true';
    if (audience) q.audience = audience;
    if (search)   q.$or = [{ key: { $regex: search, $options: 'i' } }, { label: { $regex: search, $options: 'i' } }];
    const data = await FeatureFlag.find(q).sort({ key: 1 });
    const stats = {
      total:    data.length,
      enabled:  data.filter(f => f.enabled).length,
      disabled: data.filter(f => !f.enabled).length,
    };
    ok(res, { data, stats });
  } catch (e) { fail(res, e.message, 500); }
};

exports.createFeatureFlag = async (req, res) => {
  try {
    if (!req.body.key)   return fail(res, 'Feature key is required');
    if (!req.body.label) return fail(res, 'Label is required');
    const exists = await FeatureFlag.findOne({ key: req.body.key.toLowerCase() });
    if (exists) return fail(res, 'Feature key already exists');
    const d = await FeatureFlag.create({ ...req.body, createdBy: req.user?._id, updatedBy: req.user?._id });
    await audit(req, 'feature_flag.create', 'feature-flags', d._id, { key: d.key });
    ok(res, { data: d }, 201);
  } catch (e) { fail(res, e.message); }
};

exports.getFeatureFlag = async (req, res) => {
  try {
    const d = await FeatureFlag.findById(req.params.id);
    if (!d) return fail(res, 'Feature flag not found', 404);
    ok(res, { data: d });
  } catch (e) { fail(res, e.message, 500); }
};

exports.updateFeatureFlag = async (req, res) => {
  try {
    if (req.body.key) delete req.body.key; // key is immutable
    const d = await FeatureFlag.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true },
    );
    if (!d) return fail(res, 'Feature flag not found', 404);
    await audit(req, d.enabled ? 'feature_flag.enable' : 'feature_flag.disable', 'feature-flags', d._id, { key: d.key, enabled: d.enabled });
    ok(res, { data: d });
  } catch (e) { fail(res, e.message); }
};

exports.deleteFeatureFlag = async (req, res) => {
  try {
    const d = await FeatureFlag.findByIdAndDelete(req.params.id);
    if (!d) return fail(res, 'Feature flag not found', 404);
    await audit(req, 'feature_flag.delete', 'feature-flags', req.params.id, { key: d.key });
    ok(res, { message: 'Feature flag deleted' });
  } catch (e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — COLLAB POSTS CRUD
// ════════════════════════════════════════════════════════════════════════════
let _CollabPost, _RevenueEntry, _BrandBudget;
try {
  const CM = require('../models/CreatorModels');
  _CollabPost   = CM.CollabPost;
  _RevenueEntry = CM.RevenueEntry;
} catch(_) {}
try {
  const BM = require('../models/Brandmodels');
  _BrandBudget = BM.Budget || BM.BrandBudget;
} catch(_) {}

// exports.listCollabPosts = async (req, res) => {
//   try {
//     if (!_CollabPost) return fail(res, 'CollabPost model not available', 503);
//     const { page, limit, skip } = paginate(req.query);
//     const { search = '', status = '' } = req.query;
//     const q = { isDeleted: false };
//     if (status) q.status = status;
//     if (search) q.title = { $regex: search, $options: 'i' };
//     const [data, total] = await Promise.all([
//       _CollabPost.find(q)
//         .populate('creator', 'firstName lastName email')
//         .populate('brand',   'firstName lastName companyName')
//         .populate('campaign','title')
//         .sort({ createdAt: -1 }).skip(skip).limit(limit),
//       _CollabPost.countDocuments(q),
//     ]);
//     ok(res, { data, total, page, pages: Math.ceil(total / limit) });
//   } catch(e) { fail(res, e.message, 500); }
// };

// exports.getCollabPost = async (req, res) => {
//   try {
//     if (!_CollabPost) return fail(res, 'Model not available', 503);
//     const d = await _CollabPost.findById(req.params.id)
//       .populate('creator','firstName lastName email')
//       .populate('brand','firstName lastName companyName')
//       .populate('campaign','title budget');
//     if (!d) return fail(res, 'Post not found', 404);
//     ok(res, { data: d });
//   } catch(e) { fail(res, e.message, 500); }
// };

// exports.updateCollabPost = async (req, res) => {
//   try {
//     if (!_CollabPost) return fail(res, 'Model not available', 503);
//     const allowed = ['status','brandNotes','paymentAmount','isPaid'];
//     const update  = {};
//     allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
//     const d = await _CollabPost.findByIdAndUpdate(req.params.id, update, { new: true });
//     if (!d) return fail(res, 'Post not found', 404);
//     await audit(req, 'collab_post.update', 'collab-posts', d._id, update);
//     ok(res, { data: d });
//   } catch(e) { fail(res, e.message, 500); }
// };

// exports.deleteCollabPost = async (req, res) => {
//   try {
//     if (!_CollabPost) return fail(res, 'Model not available', 503);
//     const d = await _CollabPost.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
//     if (!d) return fail(res, 'Post not found', 404);
//     await audit(req, 'collab_post.delete', 'collab-posts', req.params.id, {});
//     ok(res, { message: 'Collab post removed' });
//   } catch(e) { fail(res, e.message, 500); }
// };
/* 16. COLLAB POSTS CRUD  /api/admin/collab-posts */
let CollabPost;
try { ({ CollabPost } = require('../models/Creatormodels')); } catch (_) {}

exports.listCollabPosts = async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const q = { isDeleted: { $ne: true } };
    if (status && status !== 'all') q.status = status;
    if (search) q.$or = [
      { title:    { $regex: search, $options: 'i' } },
      { caption:  { $regex: search, $options: 'i' } },
      { platform: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page)-1)*Number(limit);
    const [data, total] = await Promise.all([
      CollabPost.find(q)
        .populate('creator','firstName lastName email')
        .populate('brand','firstName lastName companyName')
        .sort({ createdAt:-1 }).skip(skip).limit(Number(limit)),
      CollabPost.countDocuments(q),
    ]);
    ok(res, { data, total, page:Number(page), pages:Math.ceil(total/Number(limit)) });
  } catch(e) { fail(res, e.message); }
};

exports.getCollabPost = async (req, res) => {
  try {
    const d = await CollabPost.findById(req.params.id)
      .populate('creator','firstName lastName email')
      .populate('brand','firstName lastName companyName');
    if (!d) return fail(res,'Not found',404);
    ok(res,{ data:d });
  } catch(e) { fail(res, e.message); }
};

exports.updateCollabPost = async (req, res) => {
  try {
    const allowed = ['status','brandNotes','isPaid','paymentAmount'];
    const update  = Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k)));
    const d = await CollabPost.findByIdAndUpdate(req.params.id, update, { new:true });
    if (!d) return fail(res,'Not found',404);
    ok(res,{ data:d });
  } catch(e) { fail(res, e.message); }
};

exports.deleteCollabPost = async (req, res) => {
  try {
    const d = await CollabPost.findByIdAndUpdate(req.params.id,{ isDeleted:true },{ new:true });
    if (!d) return fail(res,'Not found',404);
    ok(res,{ message:'Deleted' });
  } catch(e) { fail(res, e.message); }
};
// ════════════════════════════════════════════════════════════════════════════
// ADMIN — COLLABORATIONS CRUD
// ════════════════════════════════════════════════════════════════════════════
exports.listCollaborations = async (req, res) => {
  try {
    if (!Collaboration) return fail(res, 'Collaboration model not available', 503);
    const { page, limit, skip } = paginate(req.query);
    const { status = '' } = req.query;
    const q = {};
    if (status) q.status = status;
    const [data, total] = await Promise.all([
      Collaboration.find(q)
        .populate('creator','firstName lastName email')
        .populate('brand','firstName lastName companyName')
        .populate('campaign','title')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Collaboration.countDocuments(q),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch(e) { fail(res, e.message, 500); }
};

exports.getCollaboration = async (req, res) => {
  try {
    if (!Collaboration) return fail(res, 'Model not available', 503);
    const d = await Collaboration.findById(req.params.id)
      .populate('creator','firstName lastName email')
      .populate('brand','firstName lastName companyName')
      .populate('campaign','title budget');
    if (!d) return fail(res, 'Collaboration not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.updateCollaboration = async (req, res) => {
  try {
    if (!Collaboration) return fail(res, 'Model not available', 503);
    const d = await Collaboration.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return fail(res, 'Collaboration not found', 404);
    await audit(req, 'collaboration.update', 'collaborations', d._id, req.body);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.deleteCollaboration = async (req, res) => {
  try {
    if (!Collaboration) return fail(res, 'Model not available', 503);
    const d = await Collaboration.findByIdAndDelete(req.params.id);
    if (!d) return fail(res, 'Collaboration not found', 404);
    await audit(req, 'collaboration.delete', 'collaborations', req.params.id, {});
    ok(res, { message: 'Collaboration deleted' });
  } catch(e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — BUDGETS CRUD
// ════════════════════════════════════════════════════════════════════════════
exports.listBudgets = async (req, res) => {
  try {
    if (!_BrandBudget) return fail(res, 'Budget model not available', 503);
    const { page, limit, skip } = paginate(req.query);
    const [data, total] = await Promise.all([
      _BrandBudget.find({ isDeleted: false })
        .populate('brand','firstName lastName companyName')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      _BrandBudget.countDocuments({ isDeleted: false }),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch(e) { fail(res, e.message, 500); }
};

exports.getBudget = async (req, res) => {
  try {
    if (!_BrandBudget) return fail(res, 'Model not available', 503);
    const d = await _BrandBudget.findById(req.params.id).populate('brand','firstName lastName companyName');
    if (!d) return fail(res, 'Budget not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.updateBudget = async (req, res) => {
  try {
    if (!_BrandBudget) return fail(res, 'Model not available', 503);
    const d = await _BrandBudget.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return fail(res, 'Budget not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.deleteBudget = async (req, res) => {
  try {
    if (!_BrandBudget) return fail(res, 'Model not available', 503);
    await _BrandBudget.findByIdAndUpdate(req.params.id, { isDeleted: true });
    ok(res, { message: 'Budget deleted' });
  } catch(e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — EXCEL REPORT EXPORT
// Uses xlsx (SheetJS) — npm install xlsx
// GET /api/admin/reports/export?type=users|creators|brands|campaigns|payments|collab-posts|collaborations
// ════════════════════════════════════════════════════════════════════════════
exports.exportExcelReport = async (req, res) => {
  let XLSX;
  try {
    // Try multiple require paths to handle different project structures
    try { XLSX = require('xlsx'); }
    catch(_) {
      try { XLSX = require(require.resolve('xlsx', { paths: [process.cwd(), __dirname, require.main?.path || ''] })); }
      catch(__) { XLSX = null; }
    }
    if (!XLSX) return fail(res, 'xlsx not found. Run: npm install xlsx  in your backend folder', 503);
  } catch(e) { return fail(res, 'xlsx load error: ' + e.message, 503); }

  const type = (req.query.type || 'users').toLowerCase().replace(/-/g,'').replace('_','');
  const now  = new Date();
  const dateStr = now.toISOString().slice(0,10);

  try {
    let rows = [];
    let sheetName = type;

    if (type === 'users') {
      const data = await User.find().select('-password -verificationToken -resetPasswordToken').lean();
      rows = data.map(u => ({
        ID:           u._id?.toString(),
        'First Name':  u.firstName,
        'Last Name':   u.lastName,
        Email:         u.email,
        Role:          u.role,
        Platform:      u.platform || '',
        'Company':     u.companyName || '',
        Verified:      u.isVerified ? 'Yes' : 'No',
        Active:        u.isActive   ? 'Yes' : 'No',
        'Created At':  u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
        'Last Login':  u.lastLogin  ? new Date(u.lastLogin).toLocaleDateString() : '',
      }));
      sheetName = 'Users';
    }

    else if (type === 'creators') {
      const data = await User.find({ role: 'creator' }).select('-password').lean();
      rows = data.map(u => ({
        ID:          u._id?.toString(),
        Name:        `${u.firstName} ${u.lastName}`,
        Email:       u.email,
        Platform:    u.platform || '',
        Verified:    u.isVerified ? 'Yes' : 'No',
        Active:      u.isActive   ? 'Yes' : 'No',
        'Created At':u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
      }));
      sheetName = 'Creators';
    }

    else if (type === 'brands') {
      const data = await User.find({ role: 'brand' }).select('-password').lean();
      rows = data.map(u => ({
        ID:           u._id?.toString(),
        Name:         `${u.firstName} ${u.lastName}`,
        Email:        u.email,
        'Company':    u.companyName || '',
        Verified:     u.isVerified ? 'Yes' : 'No',
        Active:       u.isActive   ? 'Yes' : 'No',
        'Created At': u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
      }));
      sheetName = 'Brands';
    }

    else if (type === 'campaigns') {
      const data = await Campaign.find({ isDeleted: false })
        .populate('brand','firstName lastName companyName').lean();
      rows = data.map(c => ({
        ID:           c._id?.toString(),
        Title:        c.title,
        Brand:        c.brand?.companyName || `${c.brand?.firstName||''} ${c.brand?.lastName||''}`,
        Status:       c.status,
        Budget:       c.budget || 0,
        Niche:        c.niche || '',
        Platforms:    (c.platforms || []).join(', '),
        Slots:        c.slots || '',
        'Start Date': c.startDate ? new Date(c.startDate).toLocaleDateString() : '',
        'End Date':   c.endDate   ? new Date(c.endDate).toLocaleDateString()   : '',
        'Created At': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      }));
      sheetName = 'Campaigns';
    }

    else if (type === 'payments') {
      if (!_CollabPost) return fail(res, 'CollabPost model not available', 503);
      const data = await _CollabPost.find({ isPaid: true })
        .populate('creator','firstName lastName email')
        .populate('brand','firstName lastName companyName').lean();
      rows = data.map(p => ({
        ID:              p._id?.toString(),
        'Content Title': p.title,
        Creator:         `${p.creator?.firstName||''} ${p.creator?.lastName||''}`,
        'Creator Email': p.creator?.email || '',
        Brand:           p.brand?.companyName || `${p.brand?.firstName||''} ${p.brand?.lastName||''}`,
        Amount:          p.paymentAmount || 0,
        Currency:        'INR',
        'Paid At':       p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '',
        'Razorpay ID':   p.razorpayPaymentId || '',
        'Order ID':      p.razorpayOrderId   || '',
        Status:          p.status,
      }));
      sheetName = 'Payments';
    }

    else if (type === 'collabposts') {
      if (!_CollabPost) return fail(res, 'CollabPost model not available', 503);
      const data = await _CollabPost.find({ isDeleted: false })
        .populate('creator','firstName lastName email')
        .populate('brand','firstName lastName companyName')
        .populate('campaign','title').lean();
      rows = data.map(p => ({
        ID:           p._id?.toString(),
        Title:        p.title,
        Creator:      `${p.creator?.firstName||''} ${p.creator?.lastName||''}`,
        Brand:        p.brand?.companyName || `${p.brand?.firstName||''} ${p.brand?.lastName||''}`,
        Campaign:     p.campaign?.title || '',
        Status:       p.status,
        'Content Type':p.contentType || '',
        Platform:     p.platform || '',
        'Payment Amt':p.paymentAmount || 0,
        Paid:         p.isPaid ? 'Yes' : 'No',
        'Created At': p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
      }));
      sheetName = 'CollabPosts';
    }

    else if (type === 'collaborations') {
      if (!Collaboration) return fail(res, 'Collaboration model not available', 503);
      const data = await Collaboration.find()
        .populate('creator','firstName lastName email')
        .populate('brand','firstName lastName companyName')
        .populate('campaign','title budget').lean();
      rows = data.map(c => ({
        ID:           c._id?.toString(),
        Creator:      `${c.creator?.firstName||''} ${c.creator?.lastName||''}`,
        Brand:        c.brand?.companyName || `${c.brand?.firstName||''} ${c.brand?.lastName||''}`,
        Campaign:     c.campaign?.title || '',
        Status:       c.status,
        'Agreed Amt': c.agreedAmount || 0,
        'Created At': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      }));
      sheetName = 'Collaborations';
    }

    else {
      return fail(res, 'Unknown report type. Available: users, creators, brands, campaigns, payments, collabposts, collaborations');
    }

    if (!rows.length) rows = [{ Note: 'No data found for this report.' }];

    // Build workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Style header row (bold) via column widths
    const cols = Object.keys(rows[0] || {});
    ws['!cols'] = cols.map(k => ({ wch: Math.max(k.length + 2, 14) }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Add summary sheet
    const summary = XLSX.utils.json_to_sheet([
      { Field: 'Report Type',   Value: sheetName },
      { Field: 'Total Records', Value: rows.length },
      { Field: 'Generated At',  Value: now.toLocaleString() },
      { Field: 'Generated By',  Value: req.user?.email || 'Admin' },
    ]);
    XLSX.utils.book_append_sheet(wb, summary, 'Summary');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `CollabSpace_${sheetName}_${dateStr}.xlsx`;

    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length',      buffer.length);
    res.send(buffer);

  } catch(e) {
    fail(res, e.message, 500);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — PERFORMANCE ANALYTICS CRUD
// ════════════════════════════════════════════════════════════════════════════
let _PerformanceAnalytics, _GrowthMetric, _CreatorProfile;
try {
  const CM = require('../models/CreatorModels');
  _PerformanceAnalytics = CM.PerformanceAnalytics;
  _GrowthMetric         = CM.GrowthMetric;
  _CreatorProfile       = CM.CreatorProfile;
} catch(_) {}

exports.listPerformanceAnalytics = async (req, res) => {
  try {
    if (!_PerformanceAnalytics) return fail(res, 'Model not available', 503);
    const { page, limit, skip } = paginate(req.query);
    const { search = '' } = req.query;
    const q = { isDeleted: false };
    const [data, total] = await Promise.all([
      _PerformanceAnalytics.find(q)
        .populate('creator', 'firstName lastName email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      _PerformanceAnalytics.countDocuments(q),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch(e) { fail(res, e.message, 500); }
};

exports.getPerformanceAnalytic = async (req, res) => {
  try {
    const d = await _PerformanceAnalytics.findById(req.params.id).populate('creator','firstName lastName email');
    if (!d) return fail(res, 'Not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.createPerformanceAnalytic = async (req, res) => {
  try {
    const d = await _PerformanceAnalytics.create(req.body);
    await audit(req, 'analytics.create', 'performance-analytics', d._id, req.body);
    ok(res, { data: d }, 201);
  } catch(e) { fail(res, e.message); }
};

exports.updatePerformanceAnalytic = async (req, res) => {
  try {
    const d = await _PerformanceAnalytics.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return fail(res, 'Not found', 404);
    await audit(req, 'analytics.update', 'performance-analytics', d._id, req.body);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message); }
};

exports.deletePerformanceAnalytic = async (req, res) => {
  try {
    await _PerformanceAnalytics.findByIdAndUpdate(req.params.id, { isDeleted: true });
    ok(res, { message: 'Deleted' });
  } catch(e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — GROWTH METRICS CRUD
// ════════════════════════════════════════════════════════════════════════════
exports.listGrowthMetrics = async (req, res) => {
  try {
    if (!_GrowthMetric) return fail(res, 'Model not available', 503);
    const { page, limit, skip } = paginate(req.query);
    const [data, total] = await Promise.all([
      _GrowthMetric.find({ isDeleted: false })
        .populate('creator', 'firstName lastName email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      _GrowthMetric.countDocuments({ isDeleted: false }),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch(e) { fail(res, e.message, 500); }
};

exports.getGrowthMetric = async (req, res) => {
  try {
    const d = await _GrowthMetric.findById(req.params.id).populate('creator','firstName lastName email');
    if (!d) return fail(res, 'Not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.createGrowthMetric = async (req, res) => {
  try {
    const d = await _GrowthMetric.create(req.body);
    ok(res, { data: d }, 201);
  } catch(e) { fail(res, e.message); }
};

exports.updateGrowthMetric = async (req, res) => {
  try {
    const d = await _GrowthMetric.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return fail(res, 'Not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message); }
};

exports.deleteGrowthMetric = async (req, res) => {
  try {
    await _GrowthMetric.findByIdAndUpdate(req.params.id, { isDeleted: true });
    ok(res, { message: 'Deleted' });
  } catch(e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — CREATOR PROFILES CRUD
// ════════════════════════════════════════════════════════════════════════════
exports.listCreatorProfiles = async (req, res) => {
  try {
    if (!_CreatorProfile) return fail(res, 'Model not available', 503);
    const { page, limit, skip } = paginate(req.query);
    const { search = '', niche = '' } = req.query;
    const q = { isArchived: false };
    if (niche)  q.niche = niche;
    if (search) q.$or = [{ username: { $regex: search, $options: 'i' } }, { bio: { $regex: search, $options: 'i' } }];
    const [data, total] = await Promise.all([
      _CreatorProfile.find(q)
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      _CreatorProfile.countDocuments(q),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch(e) { fail(res, e.message, 500); }
};

exports.getCreatorProfile = async (req, res) => {
  try {
    const d = await _CreatorProfile.findById(req.params.id).populate('owner','firstName lastName email');
    if (!d) return fail(res, 'Not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.updateCreatorProfile = async (req, res) => {
  try {
    const d = await _CreatorProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return fail(res, 'Not found', 404);
    await audit(req, 'creator_profile.update', 'creator-profiles', d._id, req.body);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message); }
};

exports.deleteCreatorProfile = async (req, res) => {
  try {
    await _CreatorProfile.findByIdAndUpdate(req.params.id, { isArchived: true });
    await audit(req, 'creator_profile.delete', 'creator-profiles', req.params.id, {});
    ok(res, { message: 'Archived' });
  } catch(e) { fail(res, e.message, 500); }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — BRAND PROFILES CRUD (via User model role=brand)
// ════════════════════════════════════════════════════════════════════════════
exports.listBrandProfiles = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search = '' } = req.query;
    const q = { role: 'brand' };
    if (search) q.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const [data, total] = await Promise.all([
      User.find(q).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(q),
    ]);
    ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch(e) { fail(res, e.message, 500); }
};

exports.getBrandProfile = async (req, res) => {
  try {
    const d = await User.findOne({ _id: req.params.id, role: 'brand' }).select('-password');
    if (!d) return fail(res, 'Brand not found', 404);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message, 500); }
};

exports.updateBrandProfile = async (req, res) => {
  try {
    const { password, role, ...rest } = req.body; // never update role/pw via this endpoint
    const d = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'brand' },
      rest,
      { new: true, runValidators: true }
    ).select('-password');
    if (!d) return fail(res, 'Brand not found', 404);
    await audit(req, 'brand_profile.update', 'brand-profiles', d._id, rest);
    ok(res, { data: d });
  } catch(e) { fail(res, e.message); }
};

exports.deleteBrandProfile = async (req, res) => {
  try {
    const d = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'brand' },
      { isActive: false },
      { new: true }
    );
    if (!d) return fail(res, 'Brand not found', 404);
    await audit(req, 'brand_profile.deactivate', 'brand-profiles', req.params.id, {});
    ok(res, { message: 'Brand deactivated' });
  } catch(e) { fail(res, e.message, 500); }
};
// ═══════════════════════════════════════════════════════════════════
// EXPORT EXCEL REPORT
// ═══════════════════════════════════════════════════════════════════
exports.exportExcelReport = async (req, res) => {
  try {
    const { type } = req.query;

    let data = [];
    let fileName = 'Report';

    switch (type) {
      case 'users':
        data = await User.find().lean();
        fileName = 'Users';
        break;

      case 'creators':
        data = await User.find({ role: 'creator' }).lean();
        fileName = 'Creators';
        break;

      case 'brands':
        data = await User.find({ role: 'brand' }).lean();
        fileName = 'Brands';
        break;

      case 'campaigns':
        data = await Campaign.find().lean();
        fileName = 'Campaigns';
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    if (!data.length) {
      return res.status(404).json({ message: 'No data found' });
    }

    // 🔥 CRITICAL FIX: sanitize Mongo data
    const cleanData = data.map(item => {
      const obj = {};

      for (let key in item) {
        let value = item[key];

        // convert ObjectId → string
        if (value && value._bsontype === 'ObjectID') {
          value = value.toString();
        }

        // convert Date → readable string
        if (value instanceof Date) {
          value = value.toISOString();
        }

        // remove nested objects (xlsx crashes on deep objects)
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }

        obj[key] = value;
      }

      return obj;
    });

    const worksheet = xlsx.utils.json_to_sheet(cleanData);
    const workbook = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(workbook, worksheet, fileName);

    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}_${Date.now()}.xlsx`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.send(buffer);

  } catch (error) {
  console.error("🔥 EXPORT ERROR FULL:", error);
  console.error("🔥 STACK:", error.stack);
  res.status(500).json({ message: error.message });
}
};