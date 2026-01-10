import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Enhanced Prisma client with connection retry and error handling
const prisma = new PrismaClient({
    log: ['warn', 'error'],
    errorFormat: 'minimal',
});

// Database connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

/**
 * Test database connectivity with retry logic
 * This prevents the backend from crashing if DB is temporarily unavailable
 */
export async function connectDatabase(): Promise<boolean> {
    connectionAttempts++;

    try {
        // Test connection with a simple query
        await prisma.$queryRaw`SELECT 1`;
        isConnected = true;
        connectionAttempts = 0; // Reset on success

        const dbUrl = process.env.DATABASE_URL || 'undefined';
        logger.info(`✅ Database connected: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);
        return true;
    } catch (error: any) {
        isConnected = false;
        logger.error(`❌ Database connection failed (attempt ${connectionAttempts}/${MAX_RETRIES}): ${error.message}`);

        // Retry logic
        if (connectionAttempts < MAX_RETRIES) {
            logger.info(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return connectDatabase(); // Recursive retry
        } else {
            logger.error(`🚨 Database connection failed after ${MAX_RETRIES} attempts`);
            logger.error(`🔧 Tip: Check if Docker is running and database is accessible on port 5438`);
            return false;
        }
    }
}

/**
 * Check if database is currently connected
 */
export function isDatabaseConnected(): boolean {
    return isConnected;
}

/**
 * Health check - test current database connection
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { healthy: true, message: 'Database connection OK' };
    } catch (error: any) {
        return { healthy: false, message: `Database unreachable: ${error.message}` };
    }
}

/**
 * Graceful shutdown - disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
    try {
        await prisma.$disconnect();
        isConnected = false;
        logger.info('🔌 Database disconnected gracefully');
    } catch (error: any) {
        logger.error(`Error disconnecting database: ${error.message}`);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
});

export default prisma;
