// Enhanced API error types to match backend responses

export interface ApiErrorResponse {
    success: false;
    code: string;
    message: string;
    errors?: Array<{
        field: string;
        message: string;
        code?: string;
    }>;
}

export interface RateLimitError extends ApiErrorResponse {
    code: 'RATE_LIMIT_EXCEEDED' | 'AUTH_RATE_LIMIT' | 'CALC_RATE_LIMIT' | 'UPLOAD_RATE_LIMIT';
    retryAfter?: number; // seconds to wait before retry
}

export interface ValidationError extends ApiErrorResponse {
    code: 'VALIDATION_ERROR';
    errors: Array<{
        field: string;
        message: string;
    }>;
}

export interface AuthError extends ApiErrorResponse {
    code: 'AUTH_REQUIRED' | 'FORBIDDEN' | 'INVALID_CREDENTIALS';
}

// Helper function to check error type
export function isRateLimitError(error: any): error is RateLimitError {
    return error?.code?.includes('RATE_LIMIT') || error?.code?.includes('_LIMIT');
}

export function isValidationError(error: any): error is ValidationError {
    return error?.code === 'VALIDATION_ERROR' && Array.isArray(error?.errors);
}

export function isAuthError(error: any): error is AuthError {
    return error?.code === 'AUTH_REQUIRED' || error?.code === 'FORBIDDEN';
}

// Extract retry-after header value (in seconds)
export function getRetryAfter(headers: any): number | null {
    const retryAfter = headers?.['retry-after'] || headers?.['Retry-After'];
    if (!retryAfter) return null;

    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? null : seconds;
}
