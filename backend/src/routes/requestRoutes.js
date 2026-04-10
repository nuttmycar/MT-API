const express = require('express');
const {
  createRequest,
  listRequests,
  getStats,
  getDailySummary,
  importBatchUsers,
  approveRequest,
  cancelApproval,
  disableRequestUser,
  enableRequestUser,
  updateRequest,
  deleteRequest,
  getProfiles,
  testMikrotik,
} = require('../controllers/requestController');
const { protect, requireRole, requireSectionAccess, requireAnySectionAccess } = require('../middleware/authMiddleware');
const { auditAction } = require('../middleware/auditMiddleware');

const router = express.Router();

router.post('/', auditAction({ action: 'REQUEST_CREATE', entityType: 'user_request' }), createRequest);
router.get('/', protect, requireSectionAccess('users'), listRequests);
router.get('/stats', protect, requireAnySectionAccess('users', 'reports'), getStats);
router.get('/daily-summary', protect, requireAnySectionAccess('users', 'reports'), getDailySummary);
router.get('/profiles', protect, requireSectionAccess('users'), getProfiles);
router.get('/test/mikrotik', protect, requireSectionAccess('mikrotik'), testMikrotik);
router.post('/batch-import', protect, requireSectionAccess('users'), requireRole('super_admin', 'admin'), auditAction({ action: 'BATCH_IMPORT_USERS', entityType: 'hotspot_user' }), importBatchUsers);
router.post('/:id/approve', protect, requireSectionAccess('users'), requireRole('super_admin', 'admin'), auditAction({ action: 'REQUEST_APPROVE', entityType: 'user_request' }), approveRequest);
router.post('/:id/cancel-approval', protect, requireSectionAccess('users'), requireRole('super_admin', 'admin'), auditAction({ action: 'REQUEST_CANCEL_APPROVAL', entityType: 'user_request' }), cancelApproval);
router.post('/:id/disable-user', protect, requireSectionAccess('users'), requireRole('super_admin', 'admin'), auditAction({ action: 'REQUEST_DISABLE_USER', entityType: 'hotspot_user' }), disableRequestUser);
router.post('/:id/enable-user', protect, requireSectionAccess('users'), requireRole('super_admin', 'admin'), auditAction({ action: 'REQUEST_ENABLE_USER', entityType: 'hotspot_user' }), enableRequestUser);
router.put('/:id', protect, requireSectionAccess('users'), requireRole('super_admin', 'admin'), auditAction({ action: 'REQUEST_UPDATE', entityType: 'user_request' }), updateRequest);
router.delete('/:id', protect, requireSectionAccess('users'), requireRole('super_admin', 'admin'), auditAction({ action: 'REQUEST_DELETE', entityType: 'user_request' }), deleteRequest);

module.exports = router;
