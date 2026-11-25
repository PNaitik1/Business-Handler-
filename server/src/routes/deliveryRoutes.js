const express = require('express');
const {
  getDeliveries,
  getDeliveryById,
  getReceivablePOs,
  recordDelivery
} = require('../controllers/deliveryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Require authentication for all delivery operations
router.use(authenticateToken);

// 1. Fetch eligible POs for receiving (must be before :id route)
router.get('/receivable-pos', getReceivablePOs);

// 2. Fetch list of all deliveries
router.get('/', getDeliveries);

// 3. Fetch single delivery details
router.get('/:id', getDeliveryById);

// 4. Record a new Goods Received Note (Admin, Inventory Manager, Procurement)
router.post(
  '/',
  authorizeRoles('admin', 'inventory_manager', 'procurement_manager'),
  recordDelivery
);

module.exports = router;
