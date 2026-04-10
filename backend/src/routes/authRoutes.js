const express = require('express');
const { loginAdmin, getCurrentProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/login', loginAdmin);
router.get('/me', protect, getCurrentProfile);

module.exports = router;
