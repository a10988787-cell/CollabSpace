const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect route — verify JWT from Authorization header.
 * Attaches req.user (full document without password) on success.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Accept: "Bearer <token>" or cookie "cs_token"
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.cs_token) {
      token = req.cookies.cs_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please sign in to continue.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists. Please sign in again.',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    }
    return res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};

/**
 * Restrict access to specific roles.
 * Usage: restrict('admin', 'brand')
 */
const restrict = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

/**
 * Generate a signed JWT for a user.
 * @param {string} userId - MongoDB ObjectId as string
 * @param {boolean} rememberMe - extend expiry to 30 days
 */
const signToken = (userId, rememberMe = false) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: rememberMe
        ? process.env.JWT_REMEMBER_EXPIRES_IN || '30d'
        : process.env.JWT_EXPIRES_IN          || '7d',
    }
  );
};

module.exports = { protect, restrict, signToken };