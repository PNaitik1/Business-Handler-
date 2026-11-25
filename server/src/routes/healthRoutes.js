const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * @route   GET /api/health
 * @desc    Basic system & database health check
 * @access  Public
 */
router.get('/', healthController.getHealthStatus);

module.exports = router;
