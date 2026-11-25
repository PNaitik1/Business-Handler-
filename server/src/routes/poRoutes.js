const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const poController = require('../controllers/poController');
const { validate } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

const poValidation = [
  body('supplier_id').notEmpty().withMessage('Supplier is required.'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one product line item is required.')
];

router.get('/', poController.getPurchaseOrders);
router.get('/:id', poController.getPurchaseOrderById);
router.post('/', poValidation, validate, poController.createPurchaseOrder);
router.patch('/:id/status', poController.updatePurchaseOrderStatus);
router.delete('/:id', poController.deletePurchaseOrder);

module.exports = router;
