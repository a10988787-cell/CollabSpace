const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const { protect, restrict } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl     = require('../controllers/brand.controller');
const emailSvc = require('../services/email.service');
const User     = require('../models/User');

// All brand routes require auth + brand role
router.use(protect);
router.use(restrict('brand', 'admin'));

/* ── Profile ─────────────────────────────────────────────────────────── */
router.get   ('/profile',         ctrl.getProfile);
router.put   ('/profile',         ctrl.updateProfile);
router.delete('/profile',         ctrl.deleteProfile);

/* ── Campaigns ───────────────────────────────────────────────────────── */
router.get   ('/campaigns',       ctrl.getCampaigns);
router.get   ('/campaigns/:id',   ctrl.getCampaign);
router.post  ('/campaigns',       [
  body('title').trim().notEmpty().withMessage('Campaign title is required'),
  body('budget').isNumeric().withMessage('Budget must be a number'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
], validate, ctrl.createCampaign);
router.put   ('/campaigns/:id',   ctrl.updateCampaign);
router.delete('/campaigns/:id',   ctrl.deleteCampaign);

/* ── Collaborations ──────────────────────────────────────────────────── */
router.get   ('/collaborations',      ctrl.getCollaborations);
router.post  ('/collaborations', async (req, res, next) => {
  // Store original json method so we can intercept the response
  const origJson = res.json.bind(res);
  res.json = async (body) => {
    res.json = origJson; // restore
    if (body?.success && body?.collaboration) {
      try {
        const creator = await User.findById(body.collaboration.creator).select('firstName email');
        if (creator) {
          emailSvc.sendCollaborationInvite(creator, req.user, body.collaboration).catch(() => {});
        }
      } catch (_) { /* email fail must not break response */ }
    }
    return origJson(body);
  };
  return ctrl.createCollaboration(req, res, next);
});
router.put   ('/collaborations/:id',  ctrl.updateCollaboration);
router.delete('/collaborations/:id',  ctrl.deleteCollaboration);

/* ── Budget ──────────────────────────────────────────────────────────── */
router.get   ('/budgets',      ctrl.getBudgets);
router.post  ('/budgets',      ctrl.createBudget);
router.put   ('/budgets/:id',  ctrl.updateBudget);
router.delete('/budgets/:id',  ctrl.deleteBudget);

/* ── Assets ──────────────────────────────────────────────────────────── */
router.get   ('/assets',      ctrl.getAssets);
router.post  ('/assets',      ctrl.createAsset);
router.put   ('/assets/:id',  ctrl.updateAsset);
router.delete('/assets/:id',  ctrl.deleteAsset);

/* ── Team ────────────────────────────────────────────────────────────── */
router.get   ('/team',        ctrl.getTeam);
router.post  ('/team',        ctrl.addTeamMember);
router.put   ('/team/:id',    ctrl.updateTeamMember);
router.delete('/team/:id',    ctrl.removeTeamMember);

/* ── Analytics ───────────────────────────────────────────────────────── */
router.get   ('/analytics',   ctrl.getAnalytics);

/* ── Contracts ───────────────────────────────────────────────────────── */
router.get   ('/contracts',      ctrl.getContracts);
router.post  ('/contracts',      ctrl.createContract);
router.put   ('/contracts/:id',  ctrl.updateContract);
router.delete('/contracts/:id',  ctrl.deleteContract);

/* ── Payments ────────────────────────────────────────────────────────── */
router.get   ('/payments',      ctrl.getPayments);
router.post  ('/payments',      ctrl.createPayment);
router.put   ('/payments/:id',  ctrl.updatePayment);
router.delete('/payments/:id',  ctrl.deletePayment);

module.exports = router;