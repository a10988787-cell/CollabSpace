// backend/routes/auth.routes.js
require('dotenv').config();
const express   = require('express');
const { body }  = require('express-validator');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');
const User      = require('../models/User');
const validate  = require('../middleware/validate.middleware');
const { protect, signToken } = require('../middleware/auth.middleware');
const emailSvc  = require('../services/email.service');
const router    = express.Router();

/* ── Rate limiters ──────────────────────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again in 15 minutes.' },
});
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { success: false, message: 'Too many attempts. Try again in 1 hour.' },
});

/* ── Validation rules ───────────────────────────────────────────────── */
const signupRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ min: 2, max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').trim().notEmpty().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('role').isIn(['creator', 'brand']).withMessage('Role must be creator or brand'),
];
const loginRules = [
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];
const forgotRules = [body('email').trim().isEmail().normalizeEmail()];
const resetRules  = [
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
];

/* ══════════════════════════════════════════════════════════════════════
   POST /api/auth/signup
   ══════════════════════════════════════════════════════════════════════ */
router.post('/signup', authLimiter, signupRules, validate, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, platform, companyName } = req.body;
    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const user = await User.create({
      firstName, lastName, email, password, role,
      platform:    role === 'creator' ? (platform || '') : '',
      companyName: role === 'brand'   ? (companyName || '') : '',
    });

    const verifyToken = user.generateVerificationToken();
    await user.save();

    emailSvc.sendVerificationEmail(user, verifyToken).catch(e =>
      console.error('[Auth] Verification email failed:', e.message)
    );

    return res.status(201).json({
      success: true,
      message: 'Account created! Please verify your email.',
      token: signToken(user._id, false),
      user: user.toPublicJSON(),
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email already in use.' });
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/auth/login
   ══════════════════════════════════════════════════════════════════════ */
router.post('/login', authLimiter, loginRules, validate, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    /* ── Static admin bypass ───────────────────────────────────────────── */
    if (
      email.trim().toLowerCase() === 'admin@collabspace.com' &&
      password === 'Admin@123'
    ) {
      // Return a synthetic admin token — create/upsert admin user in DB
      let adminUser = await User.findOne({ email: 'admin@collabspace.com' });
      if (!adminUser) {
        adminUser = await User.create({
          firstName: 'Admin',
          lastName:  'CollabSpace',
          email:     'admin@collabspace.com',
          password:  'Admin@123',
          role:      'admin',
          isActive:  true,
          isVerified: true,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Signed in as Admin.',
        token:   signToken(adminUser._id, true),
        user:    adminUser.toPublicJSON(),
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (user.isLocked) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${remaining} minute(s).` });
    }
    if (!user.isActive)
      return res.status(401).json({ success: false, message: 'This account has been deactivated.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incFailedLogins();
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    await user.resetFailedLogins();
    user.lastLogin  = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token: signToken(user._id, rememberMe === true),
      user: user.toPublicJSON(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════
   GET /api/auth/me
   ══════════════════════════════════════════════════════════════════════ */
router.get('/me', protect, (req, res) =>
  res.json({ success: true, user: req.user.toPublicJSON() })
);

/* ══════════════════════════════════════════════════════════════════════
   GET /api/auth/verify-email/:token
   ══════════════════════════════════════════════════════════════════════ */
router.get('/verify-email/:token', async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user   = await User.findOne({
      verificationToken: hashed,
      verificationExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Verification link is invalid or has expired.' });

    user.isVerified        = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    emailSvc.sendWelcomeEmail(user).catch(() => {});

    return res.json({
      success: true,
      message: 'Email verified successfully!',
      token: signToken(user._id),
      user: user.toPublicJSON(),
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/auth/forgot-password
   ══════════════════════════════════════════════════════════════════════ */
router.post('/forgot-password', strictLimiter, forgotRules, validate, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: true, message: 'If that email exists, you will receive a reset link shortly.' });

    const resetToken = user.generatePasswordResetToken();
    await user.save();
    emailSvc.sendPasswordResetEmail(user, resetToken).catch(e =>
      console.error('[Auth] Reset email failed:', e.message)
    );
    return res.json({ success: true, message: 'If that email exists, you will receive a reset link shortly.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/auth/reset-password/:token
   ══════════════════════════════════════════════════════════════════════ */
router.post('/reset-password/:token', strictLimiter, resetRules, validate, async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user   = await User.findOne({
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });

    user.password             = req.body.password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts  = 0;
    user.lockUntil            = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully.',
      token: signToken(user._id),
      user: user.toPublicJSON(),
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/auth/change-password  (protected)
   ══════════════════════════════════════════════════════════════════════ */
router.post('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
], validate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword)))
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/auth/logout  (protected)
   ══════════════════════════════════════════════════════════════════════ */
router.post('/logout', protect, (req, res) => {
  res.clearCookie('cs_token');
  res.json({ success: true, message: 'Signed out successfully.' });
});

module.exports = router;