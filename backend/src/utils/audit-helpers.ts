import { Request } from 'express';

/**
 * Audit Helper Utilities
 * 
 * Provides helper functions for extracting audit-relevant data from requests.
 */

/**
 * Extract client IP address from request.
 * Handles proxies and load balancers correctly.
 */
export function getClientIp(req: Request): string {
    // Check X-Forwarded-For header (from proxies/load balancers)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // X-Forwarded-For can be comma-separated list of IPs
        const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
        return ips[0].trim();
    }

    // Check X-Real-IP header (from nginx)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return typeof realIp === 'string' ? realIp : realIp[0];
    }

    // Fallback to connection remote address
    return req.socket.remoteAddress || 'unknown';
}

/**
 * Extract user agent from request headers.
 */
export function getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
}

/**
 * Build complete audit data object from request and action details.
 * Automatically captures IP and user agent.
 */
export function buildAuditData(
    req: Request,
    action: string,
    entityType: string,
    entityId: string,
    options?: {
        userId?: string;
        oldValue?: any;
        newValue?: any;
        description?: string;
    }
): {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    description?: string;
    ipAddress: string;
    userAgent: string;
} {
    const user = (req as any).user; // AuthRequest

    return {
        userId: options?.userId || user?.userId || 'SYSTEM',
        action,
        entityType,
        entityId,
        oldValue: options?.oldValue,
        newValue: options?.newValue,
        description: options?.description || `${action} on ${entityType}`,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req)
    };
}
