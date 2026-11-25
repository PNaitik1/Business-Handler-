const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get complete real-time dashboard analytics, charts, recent POs, and stock alerts
 * @access  Public / Authenticated
 */
router.get('/overview', dashboardController.getDashboardOverview);

module.exports = router;
