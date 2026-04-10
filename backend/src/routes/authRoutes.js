const express = require('express');
const { loginAdmin, getCurrentProfile, getLoginHistory } = require('../controllers/authController');
const { protect, requireActionAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/login', loginAdmin);
router.get('/me', protect, getCurrentProfile);
router.get('/login-history', protect, requireActionAccess('access-control', 'history'), getLoginHistory);

module.exports = router;
