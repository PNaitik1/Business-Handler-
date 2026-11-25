const express = require('express');
const {
  getAnalyticsOverview,
  getReportDetail
} = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Require authentication for all reports
router.use(authenticateToken);

// 1. Executive Analytics & Charts KPI dataset
router.get('/analytics', getAnalyticsOverview);

// 2. Tabular detailed report by category (monthly-expenses, supplier-purchases, etc.)
router.get('/detail/:type', getReportDetail);

module.exports = router;
