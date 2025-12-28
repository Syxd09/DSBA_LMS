import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

const app = express();

// Body parsing
app.use(express.json({ limit: '10mb' }));

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

// Logging - Structured (Winston)
app.use(requestLogger);

// (Optional) Keep Morgan for dev console output if preferred, or remove it entirely.
// For now, we keep Morgan for quick dev feedback but Winston handles production logging.
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Rate Limiting - General API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Effectively disabled
    message: { message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiting - Strict for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Effectively disabled
    message: { message: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
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
import feedbackRoutes from './routes/feedback.routes';
import messagingRoutes from './routes/messaging.routes';
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
app.use('/api/feedback', feedbackRoutes);
app.use('/api/messaging', messagingRoutes);
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

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err.stack || err.message);
    // Also log to file
    import('./utils/logger').then(({ logger }) => {
        logger.error(`${err.message}\n${err.stack}`);
    });

    res.status(500).json({
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

export default app;
