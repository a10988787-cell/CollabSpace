// backend/routes/payment.routes.js
// Razorpay integration for brand → creator payments
//
// SETUP:
//   npm install razorpay
//   Add to .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_CURRENCY
//
// Routes:
//   POST /api/payments/create-order    — brand creates a Razorpay order
//   POST /api/payments/verify          — verify signature after payment
//   GET  /api/payments/receipt/:id     — get receipt for a payment
//   GET  /api/payments/history         — brand's payment history

require('dotenv').config();
const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const { protect } = require('../middleware/auth.middleware');
const User = require('../models/User');
const {
  CollabPost, RevenueEntry, CreatorNotification,
} = require('../models/CreatorModels');

/* ── Razorpay SDK — optional, gracefully disabled if not installed ── */
let Razorpay = null;
let razorpay = null;
try {
  Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
      !process.env.RAZORPAY_KEY_ID.includes('PASTE')) {
    razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('[Razorpay] SDK initialised ✅');
  } else {
    console.warn('[Razorpay] Keys not configured — payment routes will return 503.');
  }
} catch (_) {
  console.warn('[Razorpay] SDK not installed. Run: npm install razorpay');
}

const CURRENCY = process.env.RAZORPAY_CURRENCY || 'INR';

/* ── helper ── */
const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

/* ── all payment routes require auth ── */
router.use(protect);

/* ══════════════════════════════════════════════════════════════════════
   POST /api/payments/create-order
   Brand calls this when they click "Pay" on an approved collab post.
   Creates a Razorpay order and returns order details to frontend.
   ══════════════════════════════════════════════════════════════════════ */
router.post('/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
        code: 'RAZORPAY_NOT_CONFIGURED',
      });
    }

    const { collabPostId } = req.body;
    if (!collabPostId) return err(res, 'collabPostId is required.');

    // Fetch the approved post
    const post = await CollabPost
      .findOne({ _id: collabPostId, brand: req.user._id, status: 'approved', isPaid: false })
      .populate('creator', 'firstName lastName email');

    if (!post) return err(res, 'Approved unpaid post not found.', 404);
    if (!post.paymentAmount || post.paymentAmount <= 0) {
      return err(res, 'Payment amount not set. Please set payment amount when approving content.');
    }

    // Razorpay amount is in smallest currency unit (paise for INR)
    const amountInPaise = Math.round(post.paymentAmount * 100);

    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: CURRENCY,
      receipt:  `rcpt_${post._id.toString().slice(-8)}_${Date.now()}`,
      notes: {
        collabPostId:  post._id.toString(),
        creatorId:     post.creator._id.toString(),
        creatorName:   `${post.creator.firstName} ${post.creator.lastName}`,
        brandId:       req.user._id.toString(),
        brandName:     req.user.companyName || req.user.firstName,
        contentTitle:  post.title,
      },
    });

    // Store order ID on post for verification later
    post.razorpayOrderId = order.id;
    await post.save();

    return ok(res, {
      orderId:       order.id,
      amount:        order.amount,
      currency:      order.currency,
      keyId:         process.env.RAZORPAY_KEY_ID,
      collabPostId:  post._id,
      contentTitle:  post.title,
      creatorName:   `${post.creator.firstName} ${post.creator.lastName}`,
      creatorEmail:  post.creator.email,
      brandName:     req.user.companyName || req.user.firstName,
      paymentAmount: post.paymentAmount,
    });
  } catch (e) {
    console.error('[Razorpay create-order]', e);
    return err(res, e.message, 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/payments/verify
   Called by frontend after Razorpay checkout success.
   Verifies the payment signature (prevents fraud), marks post as paid,
   notifies creator, updates RevenueEntry.
   ══════════════════════════════════════════════════════════════════════ */
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      collabPostId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return err(res, 'Missing payment verification fields.');
    }

    /* ── Verify HMAC SHA256 signature ── */
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      console.error('[Razorpay verify] Signature mismatch!', { razorpay_order_id });
      return err(res, 'Payment verification failed — invalid signature.', 400);
    }

    /* ── Mark post as paid ── */
    const post = await CollabPost
      .findOne({ _id: collabPostId, brand: req.user._id, status: 'approved' })
      .populate('creator', 'firstName lastName email');

    if (!post) return err(res, 'Post not found.', 404);

    post.status             = 'paid';
    post.isPaid             = true;
    post.paidAt             = new Date();
    post.razorpayOrderId    = razorpay_order_id;
    post.razorpayPaymentId  = razorpay_payment_id;
    await post.save();

    /* ── Update / create RevenueEntry ── */
    const collab = post.collaboration
      ? await require('mongoose').model('Collaboration').findById(post.collaboration).populate('brand', 'companyName firstName').lean()
      : null;

    await RevenueEntry.findOneAndUpdate(
      { collabPost: post._id, creator: post.creator._id },
      {
        $set: {
          status:           'received',
          paymentDate:      new Date(),
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId:   razorpay_order_id,
          brandName:        req.user.companyName || req.user.firstName,
          campaignName:     post.title,
          amount:           post.paymentAmount,
          currency:         CURRENCY,
        },
      },
      { upsert: true, new: true }
    );

    /* ── Notify creator ── */
    const brandName = req.user.companyName || req.user.firstName;
    const amount    = post.paymentAmount;
    const currency  = CURRENCY;

    await CreatorNotification.create({
      user:     post.creator._id,
      type:     'payment',
      title:    '💸 Payment Received!',
      message:  `${brandName} has paid you ${currency} ${amount.toLocaleString()} for "${post.title}". Check your Revenue dashboard.`,
      refModel: 'CollabPost',
      refId:    post._id,
      data: {
        amount,
        currency,
        brandName,
        razorpayPaymentId: razorpay_payment_id,
        contentTitle: post.title,
      },
    });

    /* ── Build receipt ── */
    const receipt = {
      receiptId:         `RCP-${razorpay_payment_id.slice(-8).toUpperCase()}`,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId:   razorpay_order_id,
      amount,
      currency,
      contentTitle:      post.title,
      creatorName:       `${post.creator.firstName} ${post.creator.lastName}`,
      creatorEmail:      post.creator.email,
      brandName,
      paidAt:            post.paidAt,
      status:            'paid',
    };

    return ok(res, {
      message: `Payment of ${currency} ${amount} to ${post.creator.firstName} verified and recorded!`,
      receipt,
      post: { _id: post._id, status: post.status, isPaid: post.isPaid, paidAt: post.paidAt },
    }, 200);

  } catch (e) {
    console.error('[Razorpay verify]', e);
    return err(res, e.message, 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   GET /api/payments/receipt/:paymentId
   Returns receipt data for a specific Razorpay payment ID
   ══════════════════════════════════════════════════════════════════════ */
router.get('/receipt/:paymentId', async (req, res) => {
  try {
    const post = await CollabPost
      .findOne({
        razorpayPaymentId: req.params.paymentId,
        $or: [{ brand: req.user._id }, { creator: req.user._id }],
      })
      .populate('creator', 'firstName lastName email')
      .populate('brand',   'firstName lastName companyName email');

    if (!post) return err(res, 'Receipt not found.', 404);

    const receipt = {
      receiptId:         `RCP-${post.razorpayPaymentId.slice(-8).toUpperCase()}`,
      razorpayPaymentId: post.razorpayPaymentId,
      razorpayOrderId:   post.razorpayOrderId,
      amount:            post.paymentAmount,
      currency:          CURRENCY,
      contentTitle:      post.title,
      creatorName:       `${post.creator.firstName} ${post.creator.lastName}`,
      creatorEmail:      post.creator.email,
      brandName:         post.brand?.companyName || post.brand?.firstName,
      brandEmail:        post.brand?.email,
      paidAt:            post.paidAt,
      status:            'paid',
    };

    return ok(res, { receipt });
  } catch (e) {
    return err(res, e.message, 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   GET /api/payments/history
   Returns payment history for the logged-in user (brand or creator)
   ══════════════════════════════════════════════════════════════════════ */
router.get('/history', async (req, res) => {
  try {
    const role  = req.user.role;
    const query = role === 'brand'
      ? { brand: req.user._id, isPaid: true }
      : { creator: req.user._id, isPaid: true };

    const posts = await CollabPost.find(query)
      .populate('creator', 'firstName lastName email')
      .populate('brand',   'firstName lastName companyName')
      .sort({ paidAt: -1 })
      .limit(50)
      .lean();

    const history = posts.map(p => ({
      receiptId:         p.razorpayPaymentId ? `RCP-${p.razorpayPaymentId.slice(-8).toUpperCase()}` : `INT-${p._id.toString().slice(-8).toUpperCase()}`,
      razorpayPaymentId: p.razorpayPaymentId || null,
      amount:            p.paymentAmount,
      currency:          CURRENCY,
      contentTitle:      p.title,
      creatorName:       `${p.creator?.firstName} ${p.creator?.lastName}`,
      brandName:         p.brand?.companyName || p.brand?.firstName,
      paidAt:            p.paidAt,
      status:            'paid',
    }));

    return ok(res, { history, total: history.length });
  } catch (e) {
    return err(res, e.message, 500);
  }
});

module.exports = router;