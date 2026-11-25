/**
 * Centralized Global Error Handling Middleware
 * Intercepts uncaught exceptions, operational errors, and DB constraints
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle common MySQL database errors gracefully
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'A record with this unique identifier already exists.';
    } else if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400;
        message = 'Operation violates referential integrity constraint. Cannot delete or link unreferenced record.';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Database service is currently unreachable.';
    }

    // Include stack trace only in development
    const response = {
        success: false,
        status: statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };

    if (statusCode >= 500) {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
    }

    res.status(statusCode).json(response);
};

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Resource Not Found - ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler
};
