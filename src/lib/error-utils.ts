import { toast } from '@/hooks/use-toast';
import type { ValidationError, RateLimitError, ApiErrorResponse } from '@/types/api.types';

/**
 * Centralized error handling utilities for API responses
 */

export function handleApiError(error: any) {
    const errorData: ApiErrorResponse = error.response?.data;
    const status = error.response?.status;

    // Already handled by axios interceptor, but available for custom handling
    if (status === 429) {
        return {
            type: 'rate_limit' as const,
            retryAfter: error.retryAfter,
            message: errorData?.message || 'Rate limit exceeded'
        };
    }

    if (status === 400 && errorData?.code === 'VALIDATION_ERROR') {
        return {
            type: 'validation' as const,
            errors: (errorData as ValidationError).errors || [],
            message: errorData?.message || 'Validation failed'
        };
    }

    if (status === 401 || status === 403) {
        return {
            type: 'auth' as const,
            message: errorData?.message || 'Authentication failed'
        };
    }

    if (status >= 500) {
        return {
            type: 'server' as const,
            message: 'Server error occurred'
        };
    }

    return {
        type: 'unknown' as const,
        message: errorData?.message || error.message || 'An error occurred'
    };
}

/**
 * Show error toast with appropriate styling
 */
export function showErrorToast(error: any) {
    const errorInfo = handleApiError(error);

    toast({
        variant: 'destructive',
        title: getErrorTitle(errorInfo.type),
        description: errorInfo.message,
        duration: getErrorDuration(errorInfo.type),
    });
}

function getErrorTitle(type: string): string {
    const titles: Record<string, string> = {
        rate_limit: 'Rate Limit Exceeded',
        validation: 'Invalid Input',
        auth: 'Authentication Error',
        server: 'Server Error',
        unknown: 'Error'
    };
    return titles[type] || 'Error';
}

function getErrorDuration(type: string): number {
    // Rate limit errors shown longer
    if (type === 'rate_limit') return 8000;
    if (type === 'validation') return 6000;
    return 5000;
}

/**
 * Extract field errors from validation error response
 */
export function getFieldErrors(error: any): Record<string, string> {
    const errorData = error.response?.data;

    if (errorData?.code !== 'VALIDATION_ERROR' || !Array.isArray(errorData.errors)) {
        return {};
    }

    return errorData.errors.reduce((acc: Record<string, string>, err: any) => {
        acc[err.field] = err.message;
        return acc;
    }, {});
}
