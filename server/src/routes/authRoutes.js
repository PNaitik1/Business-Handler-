const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validator');

/**
 * Validation rules for login
 */
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required.')
        .isEmail().withMessage('Please provide a valid email address.')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required.')
];

/**
 * Validation rules for changing password
 */
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required.'),
    body('newPassword')
        .notEmpty().withMessage('New password is required.')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.')
];

// Public Authentication Routes
router.post('/login', loginValidation, validate, authController.login);

// Protected Routes (Requires valid JWT Bearer token)
router.get('/me', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, changePasswordValidation, validate, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);

// Example Admin-Only Route
router.get('/admin-check', authenticateToken, authorizeRoles('admin'), (req, res) => {
    res.json({
        success: true,
        message: 'Admin authorization verified.',
        user: req.user
    });
});

module.exports = router;
