const express   = require('express');
const { body }  = require('express-validator');
const User      = require('../models/User');
const validate  = require('../middleware/validate.middleware');
const { protect, restrict } = require('../middleware/auth.middleware');

const router = express.Router();

// All user routes require authentication
router.use(protect);

/* ── GET /api/users/profile ─────────────────────────────────────────────── */
router.get('/profile', async (req, res) => {
  return res.status(200).json({ success: true, user: req.user.toPublicJSON() });
});

/* ── PUT /api/users/profile ─────────────────────────────────────────────── */
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters'),
  body('lastName').optional().trim().isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
], validate, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'bio', 'avatar', 'platform', 'companyName'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

/* ── DELETE /api/users/me ───────────────────────────────────────────────── */
router.delete('/me', async (req, res) => {
  try {
    // Soft delete — just deactivate
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    return res.status(200).json({ success: true, message: 'Account deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to deactivate account.' });
  }
});

/* ── GET /api/users (admin only) ────────────────────────────────────────── */
router.get('/', restrict('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = { isActive: true };
    if (role)   query.role = role;
    if (search) query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName:  new RegExp(search, 'i') },
      { email:     new RegExp(search, 'i') },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-password').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users: users.map(u => u.toPublicJSON()),
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});
router.get("/users/creators", async (req, res) => {
  try {

    const {
      search,
      niche,
      platform,
      page = 1,
      limit = 12
    } = req.query;

    const query = { role: "creator" };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } }
      ];
    }

    if (niche) query.niche = niche;
    if (platform) query.platform = platform;

    const creators = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      creators,
      pagination: {
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to load creators"
    });
  }
});

module.exports = router;