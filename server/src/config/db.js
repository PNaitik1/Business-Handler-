const mysql = require('mysql2/promise');
const config = require('./env');

/**
 * Reusable MySQL Connection Pool
 * Uses mysql2/promise for async/await execution, transaction safety, and high-performance pooling.
 */
const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Return dates as strings to avoid timezone shift surprises in financial records
    dateStrings: true
});

/**
 * Helper to test the database connectivity on startup
 */
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log(` MySQL Database Connected Successfully to "${config.db.name}" on ${config.db.host}:${config.db.port}`);
        connection.release();
        return true;
    } catch (error) {
        console.error(' MySQL Connection Failed:', error.message);
        console.error('   Please ensure MySQL server is running and check your .env credentials.');
        return false;
    }
};

module.exports = {
    pool,
    testConnection
};
