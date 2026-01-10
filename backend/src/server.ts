import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { initializeWebSocket } from './websocket/socket';
import { connectDatabase } from './services/db';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

/**
 * Start server with graceful database handling
 * Server will start even if database is unavailable (for health checks)
 */
async function startServer() {
    try {
        // Start HTTP server first (non-blocking)
        server.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📡 WebSocket ready at ws://localhost:${PORT}`);
            logger.info(`🏥 Health check available at http://localhost:${PORT}/api/health`);
        });

        // Attempt database connection (non-blocking, with retries)
        logger.info('🔌 Attempting database connection...');
        const dbConnected = await connectDatabase();

        if (!dbConnected) {
            logger.warn('⚠️  Server started WITHOUT database connection');
            logger.warn('⚠️  Database-dependent endpoints will return 503 Service Unavailable');
            logger.warn('⚠️  Use /api/health to check database status');
        } else {
            logger.info('✅ Server fully operational with database');
        }
    } catch (error: any) {
        logger.error(`❌ Server startup error: ${error.message}`);
        process.exit(1);
    }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
    logger.info('\n🛑 Shutting down gracefully...');
    server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM received, shutting down...');
    server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions (prevents crashes)
process.on('uncaughtException', (error) => {
    logger.error(`🚨 Uncaught Exception: ${error.message}`);
    logger.error(error.stack || '');
    // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - log and continue
});

// Start the server
startServer();
