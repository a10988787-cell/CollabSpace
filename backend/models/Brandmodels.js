// backend/models/BrandModels.js
// All brand-related sub-models in one file for clean organization
const mongoose = require('mongoose');

/* ════════════════════════════════════════════════════════════════════════════
   COLLABORATION — brand sends invite to creator for a campaign
   ════════════════════════════════════════════════════════════════════════════ */
const CollaborationSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Brand is required'],
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
  },
  campaign:     { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  deliverables: { type: String, maxlength: 2000, default: '' },
  paymentTerms: { type: String, maxlength: 1000, default: '' },
  amount:       { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['pending','accepted','rejected','active','completed','cancelled'],
    default: 'pending',
  },
  message:   { type: String, maxlength: 1000, default: '' },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

CollaborationSchema.index({ brand: 1, status: 1 });
CollaborationSchema.index({ creator: 1 });

/* ════════════════════════════════════════════════════════════════════════════
   BUDGET — marketing budget pool, optionally linked to a campaign
   ════════════════════════════════════════════════════════════════════════════ */
const BudgetSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Brand is required'],
  },
  campaign:    { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  title:       { type: String, required: [true, 'Budget title is required'], trim: true, maxlength: 200 },
  totalAmount: { type: Number, required: [true, 'Total amount is required'], min: [0, 'Amount cannot be negative'] },
  allocated:   { type: Number, default: 0, min: 0 },
  allocations: [{
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount:  { type: Number, default: 0 },
    label:   { type: String, default: '' },
  }],
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

BudgetSchema.index({ brand: 1 });

/* ════════════════════════════════════════════════════════════════════════════
   ASSET — brand media library (logos, guidelines, product images, videos)
   ════════════════════════════════════════════════════════════════════════════ */
const AssetSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Brand is required'],
  },
  name: { type: String, required: [true, 'Asset name is required'], trim: true, maxlength: 200 },
  type: {
    type: String,
    enum: ['logo','guideline','product_image','promo_video','other'],
    default: 'other',
  },
  url:      { type: String, required: [true, 'Asset URL is required'] },
  size:     { type: Number, default: 0 },
  mimeType: { type: String, default: '' },
  isDeleted:{ type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

AssetSchema.index({ brand: 1, type: 1 });

/* ════════════════════════════════════════════════════════════════════════════
   TEAM MEMBER — brand team contact management
   ════════════════════════════════════════════════════════════════════════════ */
const TeamMemberSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Brand is required'],
  },
  name:  { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  role: {
    type: String,
    enum: ['Marketing Manager','Campaign Manager','Content Strategist','Finance','Other'],
    default: 'Other',
  },
  phone:    { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

TeamMemberSchema.index({ brand: 1 });
TeamMemberSchema.index({ brand: 1, email: 1 });

/* ════════════════════════════════════════════════════════════════════════════
   CONTRACT — legal agreement between brand and creator
   ════════════════════════════════════════════════════════════════════════════ */
const ContractSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Brand is required'],
  },
  creator:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaboration: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration' },
  title:   { type: String, required: [true, 'Contract title is required'], trim: true, maxlength: 200 },
  content: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft','sent','signed','archived'],
    default: 'draft',
  },
  signedAt:  { type: Date },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

ContractSchema.index({ brand: 1, status: 1 });

/* ════════════════════════════════════════════════════════════════════════════
   PAYMENT — creator invoice and payout tracking
   ════════════════════════════════════════════════════════════════════════════ */
const PaymentSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Brand is required'],
  },
  creator:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaboration: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration' },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  currency:      { type: String, default: 'USD', uppercase: true, maxlength: 3 },
  status: {
    type: String,
    enum: ['pending','processing','paid','failed','cancelled'],
    default: 'pending',
  },
  invoiceNumber: { type: String, unique: true, sparse: true },
  dueDate:       { type: Date },
  paidAt:        { type: Date },
  notes:         { type: String, maxlength: 500, default: '' },
  isDeleted:     { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

PaymentSchema.index({ brand: 1, status: 1 });
PaymentSchema.index({ invoiceNumber: 1 });

/* ── Exports ─────────────────────────────────────────────────────────────── */
module.exports = {
  Collaboration: mongoose.model('Collaboration', CollaborationSchema),
  Budget:        mongoose.model('Budget',        BudgetSchema),
  Asset:         mongoose.model('Asset',         AssetSchema),
  TeamMember:    mongoose.model('TeamMember',    TeamMemberSchema),
  Contract:      mongoose.model('Contract',      ContractSchema),
  Payment:       mongoose.model('Payment',       PaymentSchema),
};