const { validationResult } = require('express-validator');

/**
 * Request Validation Middleware
 * Checks the results of express-validator rules and returns a structured 422 Unprocessable Entity response if validation fails.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            status: 422,
            message: 'Validation failed for one or more fields.',
            errors: errors.array().map(err => ({
                field: err.path || err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

module.exports = {
    validate
};
