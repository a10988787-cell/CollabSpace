// backend/models/AdminModels.js
// All admin-specific Mongoose models in one place
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

function model(name, schema) {
  try   { return mongoose.model(name); }
  catch { return mongoose.model(name, schema); }
}

/* ════════════════════════════════════════════════════════════════════
   1. ADMIN USER
   ════════════════════════════════════════════════════════════════════ */
const AdminUserSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, select: false },
  role:        { type: String, enum: ['super_admin','admin','moderator','support','analyst'], default: 'moderator' },
  permissions: { type: [String], default: [] },
  avatar:      { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  lastLogin:   { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

AdminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
AdminUserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};
AdminUserSchema.index({ email: 1 });
AdminUserSchema.index({ role: 1 });
const AdminUser = model('AdminUser', AdminUserSchema);

/* ════════════════════════════════════════════════════════════════════
   2. REPORT / COMPLAINT
   ════════════════════════════════════════════════════════════════════ */
const ReportSchema = new mongoose.Schema({
  reporter:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedCampaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  type:         { type: String, enum: ['spam','harassment','fraud','copyright','inappropriate','other'], required: true },
  description:  { type: String, required: true, maxlength: 2000 },
  evidence:     { type: String, default: '' },
  status:       { type: String, enum: ['pending','under_review','resolved','dismissed'], default: 'pending' },
  priority:     { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:   { type: Date },
  resolution:   { type: String, default: '' },
}, { timestamps: true, versionKey: false });

ReportSchema.index({ status: 1 });
ReportSchema.index({ reporter: 1 });
ReportSchema.index({ createdAt: -1 });
const Report = model('Report', ReportSchema);

/* ════════════════════════════════════════════════════════════════════
   3. NOTIFICATION
   ════════════════════════════════════════════════════════════════════ */
const AdminNotificationSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true, maxlength: 200 },
  message:  { type: String, required: true, maxlength: 2000 },
  type:     { type: String, enum: ['info','warning','success','error','promo','system'], default: 'info' },
  audience: { type: String, enum: ['all','creators','brands','admins'], default: 'all' },
  icon:     { type: String, default: '' },
  link:     { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sentCount: { type: Number, default: 0 },
  readCount: { type: Number, default: 0 },
  scheduledAt: { type: Date },
  sentAt:   { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

AdminNotificationSchema.index({ audience: 1 });
AdminNotificationSchema.index({ createdAt: -1 });
const AdminNotification = model('AdminNotification', AdminNotificationSchema);

/* ════════════════════════════════════════════════════════════════════
   4. ROLE & PERMISSIONS
   ════════════════════════════════════════════════════════════════════ */
const RoleSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  label:       { type: String, required: true, trim: true },
  description: { type: String, default: '', maxlength: 500 },
  permissions: { type: [String], default: [] },
  color:       { type: String, default: '#3B82F6' },
  isSystem:    { type: Boolean, default: false },
  userCount:   { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

RoleSchema.index({ name: 1 });
const Role = model('Role', RoleSchema);

/* ════════════════════════════════════════════════════════════════════
   5. PLATFORM SETTING
   ════════════════════════════════════════════════════════════════════ */
const SettingSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true, trim: true },
  value:       { type: mongoose.Schema.Types.Mixed, required: true },
  type:        { type: String, enum: ['string','number','boolean','json','secret'], default: 'string' },
  group:       { type: String, enum: ['general','email','payment','security','limits','api','feature','branding'], default: 'general' },
  label:       { type: String, trim: true, default: '' },
  description: { type: String, default: '', maxlength: 500 },
  isPublic:    { type: Boolean, default: false },
  isReadOnly:  { type: Boolean, default: false },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

SettingSchema.index({ group: 1 });
SettingSchema.index({ key: 1 });
const Setting = model('Setting', SettingSchema);

/* ════════════════════════════════════════════════════════════════════
   6. CATEGORY / NICHE
   ════════════════════════════════════════════════════════════════════ */
const CategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '', maxlength: 500 },
  icon:        { type: String, default: '📁' },
  color:       { type: String, default: '#3B82F6' },
  parentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  sortOrder:   { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  creatorCount:  { type: Number, default: 0 },
  campaignCount: { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

CategorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  next();
});
CategorySchema.index({ slug: 1 });
CategorySchema.index({ isActive: 1 });
const Category = model('Category', CategorySchema);

/* ════════════════════════════════════════════════════════════════════
   7. AUDIT LOG
   ════════════════════════════════════════════════════════════════════ */
const AuditLogSchema = new mongoose.Schema({
  admin:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, required: true, trim: true },
  module:     { type: String, trim: true, default: 'system' },
  entity:     { type: String, trim: true, default: '' },
  entityId:   { type: String, default: '' },
  changes:    { type: mongoose.Schema.Types.Mixed, default: {} },
  details:    { type: String, default: '' },
  ip:         { type: String, default: '' },
  userAgent:  { type: String, default: '' },
  status:     { type: String, enum: ['success','failure','warning'], default: 'success' },
}, { timestamps: true, versionKey: false });

AuditLogSchema.index({ admin: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ action: 1 });
const AuditLog = model('AuditLog', AuditLogSchema);

/* ════════════════════════════════════════════════════════════════════
   8. SUBSCRIPTION PLAN
   ════════════════════════════════════════════════════════════════════ */
const PlanSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  slug:         { type: String, unique: true, trim: true, lowercase: true },
  description:  { type: String, default: '', maxlength: 1000 },
  price:        { type: Number, required: true, min: 0 },
  yearlyPrice:  { type: Number, default: 0 },
  currency:     { type: String, default: 'USD' },
  billingCycle: { type: String, enum: ['monthly','yearly','lifetime','free'], default: 'monthly' },
  trialDays:    { type: Number, default: 0 },
  features:     { type: [String], default: [] },
  limits:       { type: mongoose.Schema.Types.Mixed, default: {} },
  badge:        { type: String, default: '' },
  color:        { type: String, default: '#3B82F6' },
  isActive:     { type: Boolean, default: true },
  isHighlighted:{ type: Boolean, default: false },
  sortOrder:    { type: Number, default: 0 },
  subscriberCount: { type: Number, default: 0 },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

PlanSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  next();
});
PlanSchema.index({ isActive: 1 });
const Plan = model('Plan', PlanSchema);

/* ════════════════════════════════════════════════════════════════════
   9. FEATURE FLAG
   ════════════════════════════════════════════════════════════════════ */
const FeatureFlagSchema = new mongoose.Schema({
  key:            { type: String, required: true, unique: true, trim: true, lowercase: true },
  label:          { type: String, required: true, trim: true },
  description:    { type: String, default: '', maxlength: 500 },
  enabled:        { type: Boolean, default: false },
  audience:       { type: String, enum: ['all','admins','beta','creators','brands','none'], default: 'all' },
  rolloutPercent: { type: Number, default: 100, min: 0, max: 100 },
  metadata:       { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt:      { type: Date, default: null },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

FeatureFlagSchema.index({ key: 1 });
FeatureFlagSchema.index({ enabled: 1 });
const FeatureFlag = model('FeatureFlag', FeatureFlagSchema);

/* ════════════════════════════════════════════════════════════════════
   10. CONTENT REVIEW
   ════════════════════════════════════════════════════════════════════ */
const ContentReviewSchema = new mongoose.Schema({
  title:       { type: String, default: 'Untitled Content', trim: true },
  type:        { type: String, enum: ['video','photo','reel','story','blog','podcast'], default: 'video' },
  url:         { type: String, default: '' },
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campaign:    { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  collabPost:  { type: mongoose.Schema.Types.ObjectId, ref: 'CollabPost' },
  status:      { type: String, enum: ['pending','approved','rejected','flagged','under_review'], default: 'pending' },
  priority:    { type: String, enum: ['low','medium','high'], default: 'medium' },
  reviewer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:  { type: Date },
  reason:      { type: String, default: '' },
  notes:       { type: String, default: '', maxlength: 1000 },
  flagReason:  { type: String, default: '' },
  views:       { type: Number, default: 0 },
  likes:       { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

ContentReviewSchema.index({ status: 1 });
ContentReviewSchema.index({ creator: 1 });
ContentReviewSchema.index({ createdAt: -1 });
const ContentReview = model('ContentReview', ContentReviewSchema);

module.exports = {
  AdminUser, Report, AdminNotification, Role,
  Setting, Category, AuditLog, Plan, FeatureFlag, ContentReview,
};