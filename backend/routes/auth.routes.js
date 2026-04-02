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


/* ══════════════════════════════════════════════════════════════════════════
   INSTAGRAM GRAPH API — OAuth 2.0 (Basic Display API)
   ══════════════════════════════════════════════════════════════════════════
   Flow:
     1. User clicks "Continue with Instagram"
     2. Frontend  →  GET /api/auth/instagram?role=creator|brand
     3. Backend   →  redirects to Instagram auth page
     4. Instagram →  GET /api/auth/instagram/callback?code=AUTH_CODE
     5. Backend exchanges code for access_token, fetches full profile
     6. Upserts User + SocialAccount in MongoDB
     7. Redirects frontend with JWT token

   Required .env vars:
     INSTAGRAM_APP_ID       = your Meta App ID (from developers.facebook.com)
     INSTAGRAM_APP_SECRET   = your Meta App Secret
     INSTAGRAM_REDIRECT_URI = http://localhost:5000/api/auth/instagram/callback
     CLIENT_URL             = http://localhost:4200
   ════════════════════════════════════════════════════════════════════════ */

const HTTPS = require('https');
const QS    = require('querystring');

/* ── Safely load optional models ── */
let SocialAccount  = null;
let CreatorProfile = null;
try {
  const cm = require('../models/CreatorModels');
  SocialAccount  = cm.SocialAccount;
  CreatorProfile = cm.CreatorProfile;
} catch (_) {}

/* ── HTTPS GET helper ── */
function igFetch(url) {
  return new Promise((resolve, reject) => {
    HTTPS.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('IG API returned non-JSON: ' + raw.slice(0, 120))); }
      });
    }).on('error', reject);
  });
}

/* ── HTTPS POST helper ── */
function igPost(hostname, path, payload) {
  return new Promise((resolve, reject) => {
    const body = QS.stringify(payload);
    const req  = HTTPS.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('IG token endpoint returned non-JSON: ' + raw.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 1 — GET /api/auth/instagram?role=creator|brand
   Redirect the browser to Instagram's authorization page
   ════════════════════════════════════════════════════════════════════════ */
router.get('/instagram', (req, res) => {
  const CLIENT_URL  = process.env.CLIENT_URL  || 'http://localhost:4200';
  const APP_ID      = process.env.INSTAGRAM_APP_ID;
  const role        = (req.query.role === 'brand') ? 'brand' : 'creator';

  if (!APP_ID || APP_ID === 'PASTE_YOUR_INSTAGRAM_APP_ID_HERE' || APP_ID === 'your_instagram_app_id_here') {
    console.error('[Instagram OAuth] INSTAGRAM_APP_ID not configured in .env');
    return res.redirect(`${CLIENT_URL}/auth/login?error=instagram_not_configured`);
  }

  const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
  if (!APP_SECRET || APP_SECRET === 'PASTE_YOUR_INSTAGRAM_APP_SECRET_HERE' || APP_SECRET === 'your_instagram_app_secret_here') {
    console.error('[Instagram OAuth] INSTAGRAM_APP_SECRET not configured in .env');
    return res.redirect(`${CLIENT_URL}/auth/login?error=instagram_not_configured`);
  }

  const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI
    || 'http://localhost:5000/api/auth/instagram/callback';

  /* Encode role in state so we know it on callback */
  const state = Buffer.from(JSON.stringify({ role, ts: Date.now() })).toString('base64url');

  const params = new URLSearchParams({
    client_id:     APP_ID,
    redirect_uri:  REDIRECT_URI,
    scope:         'user_profile,user_media',
    response_type: 'code',
    state,
  });

  res.redirect(`https://api.instagram.com/oauth/authorize?${params}`);
});

/* ══════════════════════════════════════════════════════════════════════════
   STEP 2 — GET /api/auth/instagram/callback?code=...&state=...
   Instagram redirects here after user approves.
   We exchange the code for tokens, fetch profile, save to DB, issue JWT.
   ════════════════════════════════════════════════════════════════════════ */
router.get('/instagram/callback', async (req, res) => {
  const CLIENT_URL   = process.env.CLIENT_URL   || 'http://localhost:4200';
  const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI
    || 'http://localhost:5000/api/auth/instagram/callback';

  /* ── User denied or Instagram returned an error ── */
  if (req.query.error || !req.query.code) {
    console.warn('[Instagram OAuth] Auth denied:', req.query.error_description || req.query.error);
    return res.redirect(`${CLIENT_URL}/auth/login?error=instagram_denied`);
  }

  try {
    const code = req.query.code;

    /* ── Decode role from state ── */
    let role = 'creator';
    try {
      const s = JSON.parse(Buffer.from(req.query.state, 'base64url').toString());
      role = s.role === 'brand' ? 'brand' : 'creator';
    } catch (_) {}

    /* ── Exchange authorization code → short-lived access token ── */
    const tokenData = await igPost('api.instagram.com', '/oauth/access_token', {
      client_id:     process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      grant_type:    'authorization_code',
      redirect_uri:  REDIRECT_URI,
      code,
    });

    if (!tokenData.access_token) {
      console.error('[Instagram OAuth] Token exchange failed:', JSON.stringify(tokenData));
      return res.redirect(`${CLIENT_URL}/auth/login?error=instagram_token_failed`);
    }

    const shortToken = tokenData.access_token;
    const igUserId   = String(tokenData.user_id || '');

    /* ── Exchange short-lived → long-lived token (valid 60 days) ── */
    let accessToken = shortToken;
    try {
      const longData = await igFetch(
        `https://graph.instagram.com/access_token`
        + `?grant_type=ig_exchange_token`
        + `&client_secret=${encodeURIComponent(process.env.INSTAGRAM_APP_SECRET)}`
        + `&access_token=${shortToken}`
      );
      if (longData.access_token) {
        accessToken = longData.access_token;
        console.log('[Instagram OAuth] Long-lived token obtained, expires in', longData.expires_in, 's');
      }
    } catch (e) {
      console.warn('[Instagram OAuth] Long-lived token exchange failed (using short):', e.message);
    }

    /* ── Fetch Instagram profile ── */
    const profile = await igFetch(
      `https://graph.instagram.com/me`
      + `?fields=id,username,name,biography,website,profile_picture_url`
      + `,followers_count,follows_count,media_count,account_type`
      + `&access_token=${accessToken}`
    );

    if (profile.error || !profile.id) {
      console.error('[Instagram OAuth] Profile fetch failed:', JSON.stringify(profile.error || profile));
      return res.redirect(`${CLIENT_URL}/auth/login?error=instagram_profile_failed`);
    }

    const igId    = String(profile.id);
    const igUser  = profile.username || igId;

    /* ── Calculate engagement rate from recent media ── */
    let engagementRate    = 0;
    let recentPostsCount  = 0;
    try {
      const mediaData = await igFetch(
        `https://graph.instagram.com/me/media`
        + `?fields=id,like_count,comments_count,media_type,timestamp,thumbnail_url,media_url`
        + `&limit=12`
        + `&access_token=${accessToken}`
      );
      const posts = mediaData.data || [];
      recentPostsCount = posts.length;
      if (posts.length > 0 && profile.followers_count > 0) {
        const totalInteractions = posts.reduce(
          (sum, p) => sum + (p.like_count || 0) + (p.comments_count || 0), 0
        );
        engagementRate = parseFloat(
          ((totalInteractions / posts.length / profile.followers_count) * 100).toFixed(2)
        );
      }
    } catch (e) {
      console.warn('[Instagram OAuth] Media fetch failed:', e.message);
    }

    /* ── Parse name ── */
    const nameParts = (profile.name || profile.username || 'Instagram User').trim().split(' ');
    const firstName = nameParts[0]              || 'Instagram';
    const lastName  = nameParts.slice(1).join(' ') || 'User';

    /* ── Upsert User in MongoDB ── */
    let user = await User.findOne({ instagramId: igId });

    if (!user) {
      /* New user — create account */
      user = await User.create({
        firstName,
        lastName,
        /* Placeholder email — Instagram Basic Display API doesn't give email */
        email:           `ig_${igId}@collabspace.internal`,
        password:        require('crypto').randomBytes(32).toString('hex'),
        role,
        platform:        'Instagram',
        instagramId:     igId,
        profilePicture:  profile.profile_picture_url || '',
        isEmailVerified: false,
        isActive:        true,
      });
      console.log(`[Instagram OAuth] New ${role} created: @${igUser} (${user._id})`);
    } else {
      /* Existing user — refresh name + picture */
      user.firstName     = firstName;
      user.lastName      = lastName;
      user.profilePicture = profile.profile_picture_url || user.profilePicture;
      if (role && user.role !== role) user.role = role;
      await user.save();
      console.log(`[Instagram OAuth] Existing user signed in: @${igUser} (${user._id})`);
    }

    /* ── Upsert SocialAccount with full Instagram stats ── */
    if (SocialAccount) {
      await SocialAccount.findOneAndUpdate(
        { creator: user._id, platform: 'Instagram' },
        {
          $set: {
            creator:          user._id,
            platform:         'Instagram',
            username:         profile.username,
            followersCount:   profile.followers_count  || 0,
            followingCount:   profile.follows_count    || 0,
            postsCount:       profile.media_count       || 0,
            engagementRate,
            accessToken,                                       // stored encrypted in future
            profileUrl:       `https://www.instagram.com/${profile.username}/`,
            profilePicture:   profile.profile_picture_url || '',
            bio:              profile.biography           || '',
            website:          profile.website             || '',
            accountType:      profile.account_type        || 'PERSONAL',
            recentMediaCount: recentPostsCount,
            isActive:         true,
            lastSyncedAt:     new Date(),
          },
        },
        { upsert: true, new: true }
      );
    }

    /* ── Upsert CreatorProfile (for creator role) ── */
    if (CreatorProfile && role === 'creator') {
      await CreatorProfile.findOneAndUpdate(
        { owner: user._id },
        {
          $setOnInsert: { owner: user._id },
          $set: {
            username:       profile.username,
            bio:            profile.biography || '',
            profilePicture: profile.profile_picture_url || '',
            'contactInfo.website': profile.website || '',
          },
        },
        { upsert: true, new: true }
      );
    }

    /* ── Issue JWT ── */
    const token = signToken(user._id, false);

    /* ── Redirect frontend with token + summary data ── */
    const redirectParams = new URLSearchParams({
      token,
      userId:    String(user._id),
      role:      user.role,
      username:  profile.username  || '',
      name:      profile.name      || profile.username || '',
      followers: String(profile.followers_count  || 0),
      following: String(profile.follows_count    || 0),
      posts:     String(profile.media_count       || 0),
      engRate:   String(engagementRate),
      pic:       profile.profile_picture_url || '',
      bio:       profile.biography           || '',
    });

    res.redirect(`${CLIENT_URL}/auth/instagram/success?${redirectParams}`);

  } catch (err) {
    console.error('[Instagram OAuth] Unexpected error:', err);
    res.redirect(`${CLIENT_URL}/auth/login?error=instagram_server_error&msg=${encodeURIComponent(err.message)}`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   GET /api/auth/instagram/refresh  (protected — requires JWT)
   Re-fetch fresh Instagram stats for the logged-in user
   ════════════════════════════════════════════════════════════════════════ */
router.get('/instagram/refresh', protect, async (req, res) => {
  try {
    if (!SocialAccount) {
      return res.status(400).json({ success: false, message: 'Social account model not available.' });
    }

    /* Must select accessToken explicitly (select: false on schema) */
    const social = await SocialAccount
      .findOne({ creator: req.user._id, platform: 'Instagram' })
      .select('+accessToken');

    if (!social?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'No Instagram account connected. Please sign in with Instagram first.',
        code: 'NOT_CONNECTED',
      });
    }

    /* ── Re-fetch profile ── */
    const profile = await igFetch(
      `https://graph.instagram.com/me`
      + `?fields=id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count`
      + `&access_token=${social.accessToken}`
    );

    if (profile.error) {
      const expired = profile.error.code === 190;
      return res.status(400).json({
        success: false,
        message: expired
          ? 'Instagram token expired. Please log in with Instagram again.'
          : `Instagram API error: ${profile.error.message}`,
        code: expired ? 'TOKEN_EXPIRED' : 'IG_API_ERROR',
      });
    }

    /* ── Recalculate engagement rate ── */
    let engagementRate = social.engagementRate;
    try {
      const mediaData = await igFetch(
        `https://graph.instagram.com/me/media?fields=id,like_count,comments_count&limit=12&access_token=${social.accessToken}`
      );
      const posts = mediaData.data || [];
      if (posts.length && profile.followers_count > 0) {
        const totalEng = posts.reduce((s, p) => s + (p.like_count || 0) + (p.comments_count || 0), 0);
        engagementRate = parseFloat(((totalEng / posts.length / profile.followers_count) * 100).toFixed(2));
      }
    } catch (_) {}

    /* ── Save updated stats ── */
    await SocialAccount.findOneAndUpdate(
      { creator: req.user._id, platform: 'Instagram' },
      {
        $set: {
          username:       profile.username,
          followersCount: profile.followers_count || 0,
          followingCount: profile.follows_count   || 0,
          postsCount:     profile.media_count      || 0,
          engagementRate,
          profilePicture: profile.profile_picture_url || '',
          bio:            profile.biography           || '',
          website:        profile.website             || '',
          lastSyncedAt:   new Date(),
        },
      }
    );

    return res.json({
      success: true,
      message: `@${profile.username}'s Instagram profile refreshed!`,
      instagram: {
        username:       profile.username,
        name:           profile.name,
        followersCount: profile.followers_count || 0,
        followingCount: profile.follows_count   || 0,
        postsCount:     profile.media_count      || 0,
        engagementRate,
        profilePicture: profile.profile_picture_url || '',
        bio:            profile.biography           || '',
        website:        profile.website             || '',
        profileUrl:     `https://www.instagram.com/${profile.username}/`,
        lastSyncedAt:   new Date(),
      },
    });

  } catch (err) {
    console.error('[Instagram refresh]', err.message);
    res.status(500).json({ success: false, message: 'Server error refreshing Instagram data.' });
  }
});

module.exports = router;