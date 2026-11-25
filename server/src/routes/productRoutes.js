const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const productController = require('../controllers/productController');
const { validate } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

const productValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required.')
    .isLength({ min: 2, max: 150 }).withMessage('Product name must be between 2 and 150 characters.'),
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU code is required.')
    .isLength({ min: 2, max: 50 }).withMessage('SKU code must be between 2 and 50 characters.'),
  body('category_id')
    .notEmpty().withMessage('Category is required.'),
  body('uom')
    .trim()
    .notEmpty().withMessage('Unit of Measure (UOM) is required.'),
  body('unit_cost')
    .isFloat({ min: 0 }).withMessage('Unit purchase price must be a positive decimal.'),
  body('reorder_level')
    .isInt({ min: 0 }).withMessage('Minimum stock reorder level must be a non-negative integer.')
];

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required.'),
  body('code').trim().notEmpty().withMessage('Category code is required.')
];

// Category subroutes
router.get('/categories', productController.getCategories);
router.post('/categories', categoryValidation, validate, productController.createCategory);

// Product CRUD routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', productValidation, validate, productController.createProduct);
router.put('/:id', productValidation, validate, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
