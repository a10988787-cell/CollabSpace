const express   = require('express');
const { body }  = require('express-validator');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');

const User     = require('../models/User');
const validate = require('../middleware/validate.middleware');
const { protect, signToken } = require('../middleware/auth.middleware');
const emailSvc = require('../services/email.service');

const router = express.Router();

/* ─── Rate Limiters ───────────────────────────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs:   15 * 60 * 1000,   // 15 minutes
  max:        10,                // 10 attempts per window
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const strictLimiter = rateLimit({
  windowMs:   60 * 60 * 1000,   // 1 hour
  max:        5,
  message: { success: false, message: 'Too many attempts. Please try again in 1 hour.' },
});

/* ─── Validation Rules ────────────────────────────────────────────────────── */
const signupRules = [
  body('firstName')
    .trim().notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters'),
  body('lastName')
    .trim().notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must include at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must include at least one number'),
  body('role')
    .isIn(['creator', 'brand']).withMessage('Role must be creator or brand'),
];

const loginRules = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const forgotRules = [
  body('email')
    .trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
];

const resetRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must include uppercase letter')
    .matches(/[0-9]/).withMessage('Must include a number'),
];

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/auth/signup
   ══════════════════════════════════════════════════════════════════════════════ */
router.post('/signup', authLimiter, signupRules, validate, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, platform, companyName } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      platform:    role === 'creator' ? (platform || '') : '',
      companyName: role === 'brand'   ? (companyName || '') : '',
    });

    // Generate email verification token
    const verifyToken = user.generateVerificationToken();
    await user.save();

    // Send verification email (non-blocking — don't fail signup if email fails)
    emailSvc.sendVerificationEmail(user, verifyToken).catch(e => {
      console.error('[Auth] Verification email failed:', e.message);
    });

    const token = signToken(user._id, false);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      token,
      user: user.toPublicJSON(),
    });

  } catch (err) {
    console.error('[Auth] Signup error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/auth/login
   ══════════════════════════════════════════════════════════════════════════════ */
router.post('/login', authLimiter, loginRules, validate, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minute(s).`,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'This account has been deactivated.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incFailedLogins();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Successful login — reset counters
    await user.resetFailedLogins();

    const token = signToken(user._id, rememberMe === true);

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: user.toPublicJSON(),
    });

  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/auth/me  — get current user (requires JWT)
   ══════════════════════════════════════════════════════════════════════════════ */
router.get('/me', protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toPublicJSON(),
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/auth/verify-email/:token
   ══════════════════════════════════════════════════════════════════════════════ */
router.get('/verify-email/:token', async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      verificationToken:        hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired.',
      });
    }

    user.isVerified               = true;
    user.verificationToken        = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
      token,
      user: user.toPublicJSON(),
    });

  } catch (err) {
    console.error('[Auth] Verify email error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/auth/forgot-password
   ══════════════════════════════════════════════════════════════════════════════ */
router.post('/forgot-password', strictLimiter, forgotRules, validate, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, you will receive a password reset link shortly.',
      });
    }

    const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 60;
    const resetToken    = user.generatePasswordResetToken(expiryMinutes);
    await user.save();

    // Send password reset email (non-blocking)
    emailSvc.sendPasswordResetEmail(user, resetToken).catch(e => {
      console.error('[Auth] Reset email failed:', e.message);
    });
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;
    console.log(`[Auth] Password reset URL for ${user.email}: ${resetUrl}`);

    return res.status(200).json({
      success: true,
      message: 'If that email exists, you will receive a password reset link shortly.',
    });

  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/auth/reset-password/:token
   ══════════════════════════════════════════════════════════════════════════════ */
router.post('/reset-password/:token', strictLimiter, resetRules, validate, async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    user.password             = req.body.password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    // Reset login lockout on successful password change
    user.failedLoginAttempts  = 0;
    user.lockUntil            = undefined;
    await user.save();

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
      token,
      user: user.toPublicJSON(),
    });

  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/auth/change-password  (protected)
   ══════════════════════════════════════════════════════════════════════════════ */
router.post('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must include uppercase letter')
    .matches(/[0-9]/).withMessage('Must include a number'),
], validate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = req.body.newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });

  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/auth/logout
   ══════════════════════════════════════════════════════════════════════════════ */
router.post('/logout', protect, (req, res) => {
  // JWT is stateless — client should delete token
  // If using httpOnly cookies, clear them here
  res.clearCookie('cs_token');
  return res.status(200).json({ success: true, message: 'Signed out successfully.' });
});

module.exports = router;