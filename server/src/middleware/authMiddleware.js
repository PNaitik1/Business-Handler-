const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { pool } = require('../config/db');

/**
 * Authentication Middleware
 * Validates the JWT Bearer token passed in the Authorization header.
 * Attaches the authenticated user's profile to req.user.
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        
        // Authorization header format: "Bearer <token>"
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: 'Access denied. No authentication token provided or invalid format (Bearer token required).'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT token signature and expiration
        let decoded;
        try {
            decoded = jwt.verify(token, config.jwt.secret);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    status: 401,
                    message: 'Your session has expired. Please log in again.'
                });
            }
            return res.status(403).json({
                success: false,
                status: 403,
                message: 'Invalid or tampered authentication token.'
            });
        }

        // Verify the user exists and is active (with seamless dual-mode fallback)
        let user;
        try {
            const [rows] = await pool.query(
                'SELECT id, name, email, role, phone, is_active FROM users WHERE id = ?',
                [decoded.id]
            );
            user = rows[0];
        } catch (dbErr) {
            const { inMemoryUsers } = require('../controllers/authController');
            user = inMemoryUsers ? inMemoryUsers.find(u => u.id === decoded.id) : null;
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: 'Authentication failed. The user account associated with this token no longer exists.'
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                status: 403,
                message: 'Account suspended. Please contact your system administrator.'
            });
        }

        // Attach safe user details to request object
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specific permitted roles.
 * Example: authorizeRoles('admin', 'procurement_manager')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                status: 403,
                message: `Forbidden. Your role (${req.user?.role || 'Guest'}) does not have permission to access this resource.`
            });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
