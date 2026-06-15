import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
// @ts-ignore
import timeout from 'express-timeout-handler';
import { apiLimiter, authLimiter, calculationLimiter } from './middleware/rate-limit.middleware';
import prisma from './services/db';
import { logger } from './utils/logger';


const app = express();

function validateEnvironment() {
    const missing: string[] = [];
    if (!process.env.DATABASE_URL) {
        missing.push('DATABASE_URL');
    }
    if (!process.env.JWT_SECRET) {
        missing.push('JWT_SECRET');
    }

    if (missing.length > 0) {
        console.error('❌ CRITICAL: Missing required environment variables:');
        console.error(missing.map(v => `   - ${v}`).join('\n'));
        console.error('Application cannot start. Please configure .env file.');
        process.exit(1);
    }

    console.log('✅ Environment validation passed');
}

// Validate environment before starting
validateEnvironment();

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Response compression (gzip)
app.use(compression({
    filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Balance between speed and compression ratio
}));

// Request timeout (30 seconds)
app.use(timeout.handler({
    timeout: 30000,
    onTimeout: (req: Request, res: Response) => {
        res.status(503).json({
            message: 'Request timeout - operation took too long',
            error: 'SERVICE_TIMEOUT'
        });
    },
    disable: ['write', 'setHeaders', 'send', 'json', 'end']
}));

// Security Headers - Helmet.js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
}));

// CORS Configuration - Hardened for production
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // Allow any localhost origin
        if (/^http:\/\/localhost:\d+$/.test(origin)) {
            return callback(null, true);
        }
        // Allow specific domains if needed
        if (origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Security headers
app.use(helmet());

import requestLogger from './middleware/request-logger.middleware';
import { databaseErrorHandler } from './middleware/database-error.middleware';

// Logging - Structured (Winston)
app.use(requestLogger);

// (Optional) Keep Morgan for dev console output if preferred, or remove it entirely.
// For now, we keep Morgan for quick dev feedback but Winston handles production logging.
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Rate limiters are imported from ./middleware/rate-limit.middleware
// (apiLimiter, authLimiter, calculationLimiter)

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API health check (with /api prefix for consistency)
app.get('/api/health', async (req, res) => {
    try {
        // Test database connectivity
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: 'disconnected',
            error: 'Database connection failed'
        });
    }
});

// Apply rate limiting
app.use('/api', apiLimiter);

// Routes
import authRoutes from './routes/auth.routes';
import examRoutes from './routes/exams.routes';
import markRoutes from './routes/marks.routes';
import assignmentRoutes from './routes/assignments.routes';
import enrollmentRoutes from './routes/enrollments.routes';
import gradingRoutes from './routes/grading.routes';
import analyticsRoutes from './routes/analytics.routes';
import approvalRoutes from './routes/approvals.routes';

import messagingRoutes from './routes/messaging.routes';
import healthRoutes from './routes/health.routes';
import departmentRoutes from './routes/departments.routes';
import programRoutes from './routes/programs.routes';
import subjectRoutes from './routes/subjects.routes';
import userRoutes from './routes/users.routes';
import cohortRoutes from './routes/cohorts.routes';
import courseOutcomeRoutes from './routes/course-outcomes.routes';
import auditLogRoutes from './routes/audit-logs.routes';
import resultsRoutes from './routes/results.routes';
import curriculumVersionRoutes from './routes/curriculum-versions.routes';
import systemRoutes from './routes/system.routes';
import attainmentRoutes from './routes/attainment.routes';
import poAttainmentRoutes from './routes/po-attainment.routes';
import marksUnlockRoutes from './routes/marks-unlock.routes';
import programOutcomeRoutes from './routes/program-outcomes.routes';
import feedbackTemplateRoutes from './routes/feedback-template.routes';
import teacherFeedbackRoutes from './routes/teacher-feedback.routes';
import feedbackAnalyticsRoutes from './routes/feedback-analytics.routes';
import coPoTraceabilityRoutes from './routes/co-po-traceability.routes';
import attendanceRoutes from './routes/attendance.routes';
import reportingRoutes from './routes/reporting.routes';

// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// Standard API routes
app.use('/api/exams', examRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/approvals', approvalRoutes);

app.use('/api/messaging', messagingRoutes);

// Health check routes (always accessible, even without database)
app.use('/api', healthRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/course-outcomes', courseOutcomeRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/curriculum-versions', curriculumVersionRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/attainment', attainmentRoutes);
app.use('/api/po-attainment', poAttainmentRoutes);
app.use('/api/marks-unlock', marksUnlockRoutes);
app.use('/api/program-outcomes', programOutcomeRoutes);
app.use('/api/feedback-templates', feedbackTemplateRoutes);
app.use('/api/teacher-feedback', teacherFeedbackRoutes);
app.use('/api/feedback-analytics', feedbackAnalyticsRoutes);
app.use('/api/co-po-traceability', coPoTraceabilityRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportingRoutes);

// Bulk operations routes
import bulkRoutes from './routes/bulk.routes';
app.use('/api/bulk', bulkRoutes);

// Activity timeline routes
import timelineRoutes from './routes/timeline.routes';
app.use('/api/timeline', timelineRoutes);

// Swagger API Documentation
import swaggerUi from 'swagger-ui-express';
import { specs } from './utils/swagger';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'OBE Management System API is running',
        version: '1.0.0',
        docs: '/health'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// Database error handler (must be before global error handler)
app.use(databaseErrorHandler);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err.stack || err.message);
    // Also log to file
    logger.error(`${err.message}\n${err.stack}`);

    res.status(500).json({
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

export default app;
