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
const { protect, requireActionAccess, requireAnySectionAccess } = require('../middleware/authMiddleware');
const { auditAction } = require('../middleware/auditMiddleware');

const router = express.Router();

router.post('/', auditAction({ action: 'REQUEST_CREATE', entityType: 'user_request' }), createRequest);
router.get('/', protect, requireActionAccess('users', 'view'), listRequests);
router.get('/stats', protect, requireAnySectionAccess('users', 'reports'), getStats);
router.get('/daily-summary', protect, requireAnySectionAccess('users', 'reports'), getDailySummary);
router.get('/profiles', protect, requireActionAccess('users', 'view'), getProfiles);
router.get('/test/mikrotik', protect, requireActionAccess('mikrotik', 'view'), testMikrotik);
router.post('/batch-import', protect, requireActionAccess('users', 'import'), auditAction({ action: 'BATCH_IMPORT_USERS', entityType: 'hotspot_user' }), importBatchUsers);
router.post('/:id/approve', protect, requireActionAccess('users', 'approve'), auditAction({ action: 'REQUEST_APPROVE', entityType: 'user_request' }), approveRequest);
router.post('/:id/cancel-approval', protect, requireActionAccess('users', 'approve'), auditAction({ action: 'REQUEST_CANCEL_APPROVAL', entityType: 'user_request' }), cancelApproval);
router.post('/:id/disable-user', protect, requireActionAccess('users', 'edit'), auditAction({ action: 'REQUEST_DISABLE_USER', entityType: 'hotspot_user' }), disableRequestUser);
router.post('/:id/enable-user', protect, requireActionAccess('users', 'edit'), auditAction({ action: 'REQUEST_ENABLE_USER', entityType: 'hotspot_user' }), enableRequestUser);
router.put('/:id', protect, requireActionAccess('users', 'edit'), auditAction({ action: 'REQUEST_UPDATE', entityType: 'user_request' }), updateRequest);
router.delete('/:id', protect, requireActionAccess('users', 'delete'), auditAction({ action: 'REQUEST_DELETE', entityType: 'user_request' }), deleteRequest);

module.exports = router;
