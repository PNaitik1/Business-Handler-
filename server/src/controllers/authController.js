const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const config = require('../config/env');

const inMemoryUsers = [
  {
    id: 1,
    name: 'Aarav Sharma',
    email: 'admin@supplysync.com',
    password_hash: '$2b$10$9h2BIWj3xOWF7z9WMVoZp.u9McdmqoSSYJGYMOvAMtpdJj2Qsdtjm',
    role: 'admin',
    phone: '+91 98765 43210',
    is_active: 1,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 2,
    name: 'Priya Patel',
    email: 'procurement@supplysync.com',
    password_hash: '$2b$10$9h2BIWj3xOWF7z9WMVoZp.u9McdmqoSSYJGYMOvAMtpdJj2Qsdtjm',
    role: 'procurement_manager',
    phone: '+91 98765 43211',
    is_active: 1,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 3,
    name: 'Rohan Verma',
    email: 'store@supplysync.com',
    password_hash: '$2b$10$9h2BIWj3xOWF7z9WMVoZp.u9McdmqoSSYJGYMOvAMtpdJj2Qsdtjm',
    role: 'inventory_manager',
    phone: '+91 98765 43212',
    is_active: 1,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 4,
    name: 'Ananya Iyer',
    email: 'finance@supplysync.com',
    password_hash: '$2b$10$9h2BIWj3xOWF7z9WMVoZp.u9McdmqoSSYJGYMOvAMtpdJj2Qsdtjm',
    role: 'finance_manager',
    phone: '+91 98765 43213',
    is_active: 1,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  }
];

/**
 * User Login Controller
 * Authenticates user credentials and generates a signed JWT token.
 * Route: POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        let user;
        try {
            const [users] = await pool.query(
                'SELECT id, name, email, password_hash, role, phone, is_active FROM users WHERE email = ?',
                [email]
            );
            user = users[0];
        } catch (dbErr) {
            user = inMemoryUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: 'Invalid email or password.'
            });
        }

        // 2. Check if user account is deactivated
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                status: 403,
                message: 'Your account has been deactivated. Contact your administrator.'
            });
        }

        // 3. Verify password hash using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: 'Invalid email or password.'
            });
        }

        // 4. Generate signed JWT token containing user ID and role
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        };

        const token = jwt.sign(tokenPayload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn
        });

        // 5. Send successful response with token and sanitized user details
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Login successful.',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Current User Profile Controller
 * Returns the profile of the currently authenticated user.
 * Route: GET /api/auth/me
 */
const getProfile = async (req, res, next) => {
    try {
        let user;
        try {
            const [rows] = await pool.query(
                'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE id = ?',
                [req.user.id]
            );
            user = rows[0];
        } catch (dbErr) {
            user = inMemoryUsers.find(u => u.id === req.user.id);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'User profile not found.'
            });
        }

        const sanitized = { ...user };
        delete sanitized.password_hash;

        res.status(200).json({
            success: true,
            status: 200,
            message: 'User profile retrieved successfully.',
            data: {
                user: sanitized
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change Password Controller
 * Verifies the old password and sets a newly hashed password.
 * Route: POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        let currentHash;
        let isMysql = true;
        try {
            const [rows] = await pool.query(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ success: false, status: 404, message: 'User not found.' });
            }
            currentHash = rows[0].password_hash;
        } catch (dbErr) {
            isMysql = false;
            const memUser = inMemoryUsers.find(u => u.id === userId);
            if (!memUser) {
                return res.status(404).json({ success: false, status: 404, message: 'User not found.' });
            }
            currentHash = memUser.password_hash;
        }

        // 2. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, currentHash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Current password provided is incorrect.'
            });
        }

        // Prevent setting identical password
        const isSamePassword = await bcrypt.compare(newPassword, currentHash);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'New password cannot be the same as your existing password.'
            });
        }

        // 3. Hash the new password with 10 salt rounds
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. Update the user record
        if (isMysql) {
            await pool.query(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newPasswordHash, userId]
            );
        } else {
            const memUser = inMemoryUsers.find(u => u.id === userId);
            if (memUser) memUser.password_hash = newPasswordHash;
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Password updated successfully. Please use your new password on your next login.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout Controller
 * Handles logout request. With stateless JWTs, the client discards the token.
 * Route: POST /api/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Logged out successfully. Please remove your stored authentication token from the client.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    getProfile,
    changePassword,
    logout,
    inMemoryUsers
};
