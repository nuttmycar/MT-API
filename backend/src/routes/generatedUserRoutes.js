const express = require('express');
const {
  listGeneratedUsers,
  listBatchLabels,
  saveBatchGeneratedUsers,
  updateGeneratedUser,
  deleteGeneratedUser,
  syncGeneratedUser,
  syncBatchGeneratedUsers,
  disableGeneratedUser,
  enableGeneratedUser,
  removeGeneratedUserFromMikrotik,
} = require('../controllers/generatedUserController');
const { protect, requireActionAccess } = require('../middleware/authMiddleware');
const { auditAction } = require('../middleware/auditMiddleware');

const router = express.Router();

router.get('/',         protect, requireActionAccess('users', 'view'),   listGeneratedUsers);
router.get('/batches',  protect, requireActionAccess('users', 'view'),   listBatchLabels);

router.post('/',
  protect,
  requireActionAccess('users', 'import'),
  auditAction({ action: 'GENERATED_USERS_SAVE', entityType: 'generated_user' }),
  saveBatchGeneratedUsers
);

router.put('/:id',
  protect,
  requireActionAccess('users', 'edit'),
  auditAction({ action: 'GENERATED_USER_UPDATE', entityType: 'generated_user' }),
  updateGeneratedUser
);

router.delete('/:id',
  protect,
  requireActionAccess('users', 'delete'),
  auditAction({ action: 'GENERATED_USER_DELETE', entityType: 'generated_user' }),
  deleteGeneratedUser
);

router.post('/sync-batch',
  protect,
  requireActionAccess('users', 'import'),
  auditAction({ action: 'GENERATED_USERS_SYNC_BATCH', entityType: 'generated_user' }),
  syncBatchGeneratedUsers
);

router.post('/:id/sync',
  protect,
  requireActionAccess('users', 'import'),
  auditAction({ action: 'GENERATED_USER_SYNC', entityType: 'generated_user' }),
  syncGeneratedUser
);

router.post('/:id/disable',
  protect,
  requireActionAccess('users', 'edit'),
  auditAction({ action: 'GENERATED_USER_DISABLE', entityType: 'generated_user' }),
  disableGeneratedUser
);

router.post('/:id/enable',
  protect,
  requireActionAccess('users', 'edit'),
  auditAction({ action: 'GENERATED_USER_ENABLE', entityType: 'generated_user' }),
  enableGeneratedUser
);

router.post('/:id/remove-mikrotik',
  protect,
  requireActionAccess('users', 'edit'),
  auditAction({ action: 'GENERATED_USER_REMOVE_MIKROTIK', entityType: 'generated_user' }),
  removeGeneratedUserFromMikrotik
);

module.exports = router;
