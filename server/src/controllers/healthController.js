const { pool } = require('../config/db');

/**
 * Health Check Controller
 * Verifies server uptime, system status, and database connectivity.
 */
const getHealthStatus = async (req, res, next) => {
    try {
        let dbStatus = 'disconnected';
        let dbLatencyMs = null;

        try {
            const start = Date.now();
            const [rows] = await pool.query('SELECT 1 AS ping, CURRENT_TIMESTAMP AS server_time');
            dbLatencyMs = Date.now() - start;
            if (rows && rows[0]?.ping === 1) {
                dbStatus = 'connected';
            }
        } catch (dbError) {
            dbStatus = `error: ${dbError.message}`;
        }

        res.status(200).json({
            success: true,
            status: 200,
            service: 'SupplySync Backend API',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
            database: {
                status: dbStatus,
                latency_ms: dbLatencyMs
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getHealthStatus
};
