import { ZodError } from 'zod';
import { config } from '../config/env.js';
export function errorHandler(err, _req, res, _next) {
    // Handle Zod Validation Errors
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation Error',
            code: 'ERR_VALIDATION_FAILED',
            issues: err.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
            })),
        });
        return;
    }
    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode === 500 && config.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message || 'An unexpected error occurred';
    const response = {
        error: message,
        code: err.code || 'ERR_INTERNAL_SERVER',
    };
    if (err.details) {
        response.details = err.details;
    }
    if (config.NODE_ENV !== 'production' && err.stack) {
        response.stack = err.stack;
    }
    res.status(statusCode).json(response);
}
