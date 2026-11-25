const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'supplysync',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'dev_fallback_secret_change_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    }
};

module.exports = config;
