const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const quotationController = require('../controllers/quotationController');
const { validate } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

const quoteValidation = [
  body('supplier_id').notEmpty().withMessage('Supplier selection is required.'),
  body('product_id').notEmpty().withMessage('Product selection is required.'),
  body('unit_price').isFloat({ min: 0.01 }).withMessage('Quoted price must be greater than zero.'),
  body('lead_time_days').isInt({ min: 0 }).withMessage('Delivery time in days must be a positive integer.')
];

router.get('/', quotationController.getQuotations);
router.get('/compare', quotationController.compareQuotations);
router.post('/', quoteValidation, validate, quotationController.createQuotation);
router.delete('/:id', quotationController.deleteQuotation);

module.exports = router;
