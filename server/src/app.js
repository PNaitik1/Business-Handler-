const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route Imports
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const poRoutes = require('./routes/poRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

/**
 * 1. CORS Configuration
 * Allows frontend origins (Vite default localhost:5173, etc.)
 */
const allowedOrigins = [
    config.clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from any origin in dev or if origin matches
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

/**
 * 2. Request Parsers
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * 3. Base & Health Routes
 */
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to SupplySync API - Supplier, Procurement and Purchase Management System',
        status: 'online',
        documentation: '/api/health'
    });
});

// Mount routes to both /api and root to handle standalone and serverless environments
const mountRoutes = (prefix = '') => {
    app.use(`${prefix}/health`, healthRoutes);
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/dashboard`, dashboardRoutes);
    app.use(`${prefix}/suppliers`, supplierRoutes);
    app.use(`${prefix}/products`, productRoutes);
    app.use(`${prefix}/inventory`, inventoryRoutes);
    app.use(`${prefix}/quotations`, quotationRoutes);
    app.use(`${prefix}/purchase-orders`, poRoutes);
    app.use(`${prefix}/deliveries`, deliveryRoutes);
    app.use(`${prefix}/payments`, paymentRoutes);
    app.use(`${prefix}/reports`, reportRoutes);
};

mountRoutes('/api');
mountRoutes('');

/**
 * 4. Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
