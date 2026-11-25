const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/db');

const PORT = config.port;

const startServer = async () => {
    console.log('----------------------------------------------------');
    console.log(' Starting SupplySync Backend Application Server...');
    console.log('----------------------------------------------------');

    // 1. Verify Database Connection
    await testConnection();

    // 2. Start HTTP Server
    const server = app.listen(PORT, () => {
        console.log(` Server running in [${config.nodeEnv}] mode on port ${PORT}`);
        console.log(` Health check available at: http://localhost:${PORT}/api/health`);
        console.log('----------------------------------------------------');
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
        console.error('UNHANDLED REJECTION! Shutting down gracefully...', err);
        server.close(() => {
            process.exit(1);
        });
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
        console.log(' SIGTERM received. Shutting down gracefully...');
        server.close(() => {
            console.log(' Process terminated.');
        });
    });
};

startServer();
