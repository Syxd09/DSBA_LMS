import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Debug: Check which DB we are connecting to
const dbUrl = process.env.DATABASE_URL || 'undefined';
import('../utils/logger').then(({ logger }) => {
    logger.info(`🔌 Prisma connecting to: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);
});

export default prisma;
