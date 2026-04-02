// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const UserSchema = new mongoose.Schema({
  firstName:   { type: String, required: [true, 'First name is required'], trim: true, maxlength: 50 },
  lastName:    { type: String, required: [true, 'Last name is required'],  trim: true, maxlength: 50 },
  email:       {
    type: String, required: [true, 'Email is required'],
    unique: true, trim: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password:    { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  role:        { type: String, enum: ['creator', 'brand', 'admin'], default: 'creator' },
  platform:    { type: String, trim: true, default: '' },   // creator: Instagram, YouTube…
  companyName: { type: String, trim: true, default: '' },   // brand: company name
  avatar:      { type: String, default: '' },
  bio:         { type: String, maxlength: 500, default: '' },

  // Email verification
  isVerified:          { type: Boolean, default: false },
  verificationToken:   { type: String, select: false },
  verificationExpires: { type: Date,   select: false },

  // Password reset
  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpires: { type: Date,   select: false },

  // Account status
  isActive:    { type: Boolean, default: true },
  /* ── Instagram OAuth ──────────────────────────────────────────────────── */
  instagramId:     { type: String, sparse: true, index: true, default: null },
  profilePicture:  { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },


  // Login tracking
  lastLogin:           { type: Date },
  loginCount:          { type: Number, default: 0 },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil:           { type: Date },

}, { timestamps: true, versionKey: false });

/* ── Virtuals ────────────────────────────────────────────────────────────── */
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('initials').get(function () {
  return (this.firstName[0] + this.lastName[0]).toUpperCase();
});

UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

/* ── Indexes ─────────────────────────────────────────────────────────────── */
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

/* ── Pre-save: hash password ─────────────────────────────────────────────── */
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

/* ── Methods ─────────────────────────────────────────────────────────────── */
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken   = crypto.createHash('sha256').update(token).digest('hex');
  const hours = parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS) || 24;
  this.verificationExpires = new Date(Date.now() + hours * 60 * 60 * 1000);
  return token; // return raw (unhashed) token to email
};

UserSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken   = crypto.createHash('sha256').update(token).digest('hex');
  const minutes = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 60;
  this.resetPasswordExpires = new Date(Date.now() + minutes * 60 * 1000);
  return token;
};

UserSchema.methods.incFailedLogins = async function () {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // lock 30 min
  }
  await this.save({ validateBeforeSave: false });
};

UserSchema.methods.resetFailedLogins = async function () {
  this.failedLoginAttempts = 0;
  this.lockUntil           = undefined;
  await this.save({ validateBeforeSave: false });
};

UserSchema.methods.toPublicJSON = function () {
  return {
    id:          this._id,
    firstName:   this.firstName,
    lastName:    this.lastName,
    fullName:    this.fullName,
    initials:    this.initials,
    email:       this.email,
    role:        this.role,
    platform:    this.platform,
    companyName: this.companyName,
    avatar:      this.avatar,
    bio:         this.bio,
    isVerified:  this.isVerified,
    isActive:    this.isActive,
    createdAt:   this.createdAt,
    lastLogin:   this.lastLogin,
  };
};

module.exports = mongoose.model('User', UserSchema);