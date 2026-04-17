const express = require('express');
const router = express.Router();
const {
  getVersion,
  getVersionHistory,
  getHealthAndVersion,
  checkCompatibility,
} = require('../controllers/versionController');

// Get current version info
router.get('/api/version', getVersion);

// Get version history
router.get('/api/version/history', getVersionHistory);

// Combined health check with version
router.get('/api/health', getHealthAndVersion);

// Check version compatibility
router.get('/api/version/compatibility', checkCompatibility);

module.exports = router;
