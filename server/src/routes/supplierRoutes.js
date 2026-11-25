const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const supplierController = require('../controllers/supplierController');
const { validate } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

/**
 * Validation rules for supplier creation / update
 */
const supplierValidation = [
  body('company_name')
    .trim()
    .notEmpty().withMessage('Supplier / Company name is required.')
    .isLength({ min: 2, max: 150 }).withMessage('Company name must be between 2 and 150 characters.'),
  body('contact_person')
    .trim()
    .notEmpty().withMessage('Contact person name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Contact person must be between 2 and 100 characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.'),
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required.'),
  body('tax_id')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('GSTIN format is invalid. Example: 27AAACA1234A1Z5 (15 characters)'),
  body('payment_terms')
    .optional()
    .isIn(['immediate', 'net15', 'net30', 'net45', 'net60', 'advance'])
    .withMessage('Invalid payment terms specified.'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'under_review', 'blacklisted'])
    .withMessage('Invalid supplier status.')
];

// Routes
router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.get('/:id/purchase-orders', supplierController.getSupplierPurchaseHistory);
router.post('/', supplierValidation, validate, supplierController.createSupplier);
router.put('/:id', supplierValidation, validate, supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
