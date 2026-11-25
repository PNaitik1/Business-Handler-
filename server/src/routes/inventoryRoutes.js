const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const inventoryController = require('../controllers/inventoryController');
const { validate } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

const adjustmentValidation = [
  body('product_id').isInt().withMessage('Valid product ID is required.'),
  body('adjustment_type')
    .isIn(['STOCK_ADJUSTMENT', 'DAMAGED_LOSS', 'PURCHASE_RETURN'])
    .withMessage('Adjustment type must be STOCK_ADJUSTMENT, DAMAGED_LOSS, or PURCHASE_RETURN.'),
  body('quantity').isInt().withMessage('Quantity must be an integer.'),
  body('remarks').trim().notEmpty().withMessage('Remarks/reason for adjustment is mandatory for audit trail.')
];

router.get('/status', inventoryController.getInventoryStatus);
router.get('/transactions', inventoryController.getInventoryTransactions);
router.post('/adjust', adjustmentValidation, validate, inventoryController.adjustStock);
router.get('/business-rule', inventoryController.verifyBusinessRule);

module.exports = router;
