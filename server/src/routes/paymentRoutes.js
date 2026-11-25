const express = require('express');
const {
  getPayments,
  getPaymentSummary,
  getPayablePOs,
  getPaymentById,
  recordPayment
} = require('../controllers/paymentController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Require authentication for all payment operations
router.use(authenticateToken);

// 1. Financial KPI Summary
router.get('/summary', getPaymentSummary);

// 2. Payable POs with Outstanding Balance
router.get('/payable-pos', getPayablePOs);

// 3. List all payments
router.get('/', getPayments);

// 4. Get specific payment voucher
router.get('/:id', getPaymentById);

// 5. Record new payment (Admin, Finance Manager, Procurement)
router.post(
  '/',
  authorizeRoles('admin', 'finance_manager', 'procurement_manager'),
  recordPayment
);

module.exports = router;
