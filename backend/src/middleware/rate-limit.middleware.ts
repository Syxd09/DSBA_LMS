import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Enterprise-grade rate limiting middleware
 * Protects against DoS attacks and abuse
 * 
 * DEVELOPMENT MODE: Rate limiting is DISABLED (unlimited requests)
 * PRODUCTION MODE: Rate limiting is ENABLED with strict limits
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// General API rate limiter - UNLIMITED in dev, 100 requests per 15 minutes in production
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 0 : 100, // 0 = unlimited in development
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: () => isDevelopment // Skip rate limiting entirely in development
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 0 : 5, // UNLIMITED in dev, 5 attempts per 15 minutes in production
    skipSuccessfulRequests: true, // Don't count successful logins
    message: {
        success: false,
        code: 'AUTH_RATE_LIMIT',
        message: 'Too many login attempts, please try again in 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDevelopment
});

// Rate limiter for expensive calculation operations
export const calculationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: isDevelopment ? 0 : 10, // UNLIMITED in dev, 10 calculations per 5 minutes in production
    message: {
        success: false,
        code: 'CALC_RATE_LIMIT',
        message: 'Calculation rate limit exceeded, please wait before requesting again'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDevelopment
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isDevelopment ? 0 : 10, // UNLIMITED in dev, 10 uploads per minute in production
    message: {
        success: false,
        code: 'UPLOAD_RATE_LIMIT',
        message: 'Too many file uploads, please slow down'
    },
    skip: () => isDevelopment
});
