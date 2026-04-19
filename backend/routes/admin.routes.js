// backend/routes/admin.routes.js
// All 15 admin CRUD modules — fully wired to admin.controller.js

const express = require('express');
const router  = express.Router();
const { protect, restrict } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/admin.controller');

// ── Every admin route requires: authenticated + admin role ──────────────────
router.use(protect);
router.use(restrict('admin'));

// ════════════════════════════════════════════════════════════════════════════
// 1. ADMIN ACCOUNT MANAGEMENT  /api/admin/admin-users
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/admin-users',          ctrl.listAdminUsers);
router.post  ('/admin-users',          ctrl.createAdminUser);
router.get   ('/admin-users/:id',      ctrl.getAdminUser);
router.put   ('/admin-users/:id',      ctrl.updateAdminUser);
router.delete('/admin-users/:id',      ctrl.deleteAdminUser);

// ════════════════════════════════════════════════════════════════════════════
// 2. CREATOR MANAGEMENT  /api/admin/creators
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/creators',             ctrl.listCreators);
router.post  ('/creators',             ctrl.createCreator);
router.get   ('/creators/:id',         ctrl.getCreator);
router.put   ('/creators/:id',         ctrl.updateCreator);
router.delete('/creators/:id',         ctrl.deleteCreator);
router.patch ('/creators/:id/verify',  ctrl.verifyCreator);

// ════════════════════════════════════════════════════════════════════════════
// 3. BRAND MANAGEMENT  /api/admin/brands
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/brands',               ctrl.listBrands);
router.post  ('/brands',               ctrl.createBrand);
router.get   ('/brands/:id',           ctrl.getBrand);
router.put   ('/brands/:id',           ctrl.updateBrand);
router.delete('/brands/:id',           ctrl.deleteBrand);

// ════════════════════════════════════════════════════════════════════════════
// 4. CAMPAIGN MODERATION  /api/admin/campaigns
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/campaigns',                  ctrl.listCampaigns);
router.post  ('/campaigns',                  ctrl.createCampaign);
router.get   ('/campaigns/:id',              ctrl.getCampaign);
router.put   ('/campaigns/:id',              ctrl.updateCampaign);
router.delete('/campaigns/:id',              ctrl.deleteCampaign);
router.patch ('/campaigns/:id/approve',      ctrl.approveCampaign);
router.patch ('/campaigns/:id/reject',       ctrl.rejectCampaign);

// ════════════════════════════════════════════════════════════════════════════
// 5. CONTENT MODERATION  /api/admin/content
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/content',              ctrl.listContent);
router.post  ('/content',              ctrl.createContent);
router.get   ('/content/:id',          ctrl.getContent);
router.put   ('/content/:id',          ctrl.updateContent);
router.delete('/content/:id',          ctrl.deleteContent);

// ════════════════════════════════════════════════════════════════════════════
// 6. PLATFORM ANALYTICS  /api/admin/analytics
// ════════════════════════════════════════════════════════════════════════════
router.get('/analytics', ctrl.getAnalytics);

// ════════════════════════════════════════════════════════════════════════════
// 7. PAYMENTS & TRANSACTIONS  /api/admin/payments
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/payments',             ctrl.listPayments);
router.post  ('/payments',             ctrl.createPayment);
router.get   ('/payments/:id',         ctrl.getPayment);
router.put   ('/payments/:id',         ctrl.updatePayment);
router.delete('/payments/:id',         ctrl.deletePayment);

// ════════════════════════════════════════════════════════════════════════════
// 8. REPORTS & COMPLAINTS  /api/admin/reports
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/reports',              ctrl.listReports);
router.post  ('/reports',              ctrl.createReport);
router.get   ('/reports/:id',          ctrl.getReport);
router.put   ('/reports/:id',          ctrl.updateReport);
router.delete('/reports/:id',          ctrl.deleteReport);

// ════════════════════════════════════════════════════════════════════════════
// 9. NOTIFICATIONS  /api/admin/notifications
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/notifications',        ctrl.listNotifications);
router.post  ('/notifications',        ctrl.createNotification);
router.get   ('/notifications/:id',    ctrl.getNotification);
router.put   ('/notifications/:id',    ctrl.updateNotification);
router.delete('/notifications/:id',    ctrl.deleteNotification);

// ════════════════════════════════════════════════════════════════════════════
// 10. ROLES & PERMISSIONS  /api/admin/roles
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/roles',                ctrl.listRoles);
router.post  ('/roles',                ctrl.createRole);
router.get   ('/roles/:id',            ctrl.getRole);
router.put   ('/roles/:id',            ctrl.updateRole);
router.delete('/roles/:id',            ctrl.deleteRole);

// ════════════════════════════════════════════════════════════════════════════
// 11. PLATFORM SETTINGS  /api/admin/settings
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/settings',             ctrl.listSettings);
router.post  ('/settings',             ctrl.createSetting);
router.get   ('/settings/:id',         ctrl.getSetting);
router.put   ('/settings/:id',         ctrl.updateSetting);
router.delete('/settings/:id',         ctrl.deleteSetting);

// ════════════════════════════════════════════════════════════════════════════
// 12. CATEGORIES & NICHES  /api/admin/categories
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/categories',           ctrl.listCategories);
router.post  ('/categories',           ctrl.createCategory);
router.get   ('/categories/:id',       ctrl.getCategory);
router.put   ('/categories/:id',       ctrl.updateCategory);
router.delete('/categories/:id',       ctrl.deleteCategory);

// ════════════════════════════════════════════════════════════════════════════
// 13. AUDIT LOGS  /api/admin/audit-logs
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/audit-logs',           ctrl.listAuditLogs);
router.post  ('/audit-logs',           ctrl.createAuditLog);
router.get   ('/audit-logs/:id',       ctrl.getAuditLog);
router.put   ('/audit-logs/:id',       ctrl.updateAuditLog);
router.delete('/audit-logs/:id',       ctrl.deleteAuditLog);

// ════════════════════════════════════════════════════════════════════════════
// 14. SUBSCRIPTION PLANS  /api/admin/plans
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/plans',                ctrl.listPlans);
router.post  ('/plans',                ctrl.createPlan);
router.get   ('/plans/:id',            ctrl.getPlan);
router.put   ('/plans/:id',            ctrl.updatePlan);
router.delete('/plans/:id',            ctrl.deletePlan);

// ════════════════════════════════════════════════════════════════════════════
// 15. FEATURE FLAGS  /api/admin/feature-flags
// ════════════════════════════════════════════════════════════════════════════
router.get   ('/feature-flags',        ctrl.listFeatureFlags);
router.post  ('/feature-flags',        ctrl.createFeatureFlag);
router.get   ('/feature-flags/:id',    ctrl.getFeatureFlag);
router.put   ('/feature-flags/:id',    ctrl.updateFeatureFlag);
router.delete('/feature-flags/:id',    ctrl.deleteFeatureFlag);


/* ════════════════════════════════════════════════════════════════════════════
   COLLAB POSTS — admin can view, update status, delete
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/collab-posts',         ctrl.listCollabPosts);
router.get   ('/collab-posts/:id',     ctrl.getCollabPost);
router.put   ('/collab-posts/:id',     ctrl.updateCollabPost);
router.delete('/collab-posts/:id',     ctrl.deleteCollabPost);

/* ════════════════════════════════════════════════════════════════════════════
   COLLABORATIONS
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/collaborations',         ctrl.listCollaborations);
router.get   ('/collaborations/:id',     ctrl.getCollaboration);
router.put   ('/collaborations/:id',     ctrl.updateCollaboration);
router.delete('/collaborations/:id',     ctrl.deleteCollaboration);

/* ════════════════════════════════════════════════════════════════════════════
   BUDGETS
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/budgets',         ctrl.listBudgets);
router.get   ('/budgets/:id',     ctrl.getBudget);
router.put   ('/budgets/:id',     ctrl.updateBudget);
router.delete('/budgets/:id',     ctrl.deleteBudget);

/* ════════════════════════════════════════════════════════════════════════════
   EXCEL REPORT EXPORT
   GET /api/admin/reports/export?type=users|creators|brands|campaigns|payments|collabposts|collaborations
   ════════════════════════════════════════════════════════════════════════════ */
// router.get('/reports/export', ctrl.exportExcelReport);



/* ════════════════════════════════════════════════════════════════════════════
   PERFORMANCE ANALYTICS
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/performance-analytics',        ctrl.listPerformanceAnalytics);
router.get   ('/performance-analytics/:id',    ctrl.getPerformanceAnalytic);
router.post  ('/performance-analytics',        ctrl.createPerformanceAnalytic);
router.put   ('/performance-analytics/:id',    ctrl.updatePerformanceAnalytic);
router.delete('/performance-analytics/:id',    ctrl.deletePerformanceAnalytic);

/* ════════════════════════════════════════════════════════════════════════════
   GROWTH METRICS
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/growth-metrics',        ctrl.listGrowthMetrics);
router.get   ('/growth-metrics/:id',    ctrl.getGrowthMetric);
router.post  ('/growth-metrics',        ctrl.createGrowthMetric);
router.put   ('/growth-metrics/:id',    ctrl.updateGrowthMetric);
router.delete('/growth-metrics/:id',    ctrl.deleteGrowthMetric);

/* ════════════════════════════════════════════════════════════════════════════
   CREATOR PROFILES
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/creator-profiles',        ctrl.listCreatorProfiles);
router.get   ('/creator-profiles/:id',    ctrl.getCreatorProfile);
router.put   ('/creator-profiles/:id',    ctrl.updateCreatorProfile);
router.delete('/creator-profiles/:id',    ctrl.deleteCreatorProfile);

/* ════════════════════════════════════════════════════════════════════════════
   BRAND PROFILES
   ════════════════════════════════════════════════════════════════════════════ */
router.get   ('/brand-profiles',        ctrl.listBrandProfiles);
router.get   ('/brand-profiles/:id',    ctrl.getBrandProfile);
router.put   ('/brand-profiles/:id',    ctrl.updateBrandProfile);
router.delete('/brand-profiles/:id',    ctrl.deleteBrandProfile);
router.get   ('/collab-posts',     ctrl.listCollabPosts);
router.get   ('/collab-posts/:id', ctrl.getCollabPost);
router.put   ('/collab-posts/:id', ctrl.updateCollabPost);
router.delete('/collab-posts/:id', ctrl.deleteCollabPost);

// EXCEL EXPORT
// router.get('/export/excel', ctrl.exportExcel);
router.get('/reports/export', ctrl.exportExcelReport);
module.exports = router;