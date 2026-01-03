const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateExamSchema() {
    console.log('Migrating Exam schema...\n');

    try {
        // Add new columns to Exam table
        console.log('1. Adding customTypeName column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Exam" 
      ADD COLUMN IF NOT EXISTS "customTypeName" TEXT
    `);

        console.log('2. Adding passingMarks column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Exam" 
      ADD COLUMN IF NOT EXISTS "passingMarks" DOUBLE PRECISION
    `);

        console.log('3. Adding examDate column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Exam" 
      ADD COLUMN IF NOT EXISTS "examDate" TIMESTAMP(3)
    `);

        console.log('4. Adding duration column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Exam" 
      ADD COLUMN IF NOT EXISTS "duration" INTEGER
    `);

        console.log('5. Adding instructions column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Exam" 
      ADD COLUMN IF NOT EXISTS "instructions" TEXT
    `);

        console.log('6. Adding updatedAt column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Exam" 
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    `);

        // Update ExamStatus enum
        console.log('7. Updating ExamStatus enum with new values...');
        await prisma.$executeRawUnsafe(`
      ALTER TYPE "ExamStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED'
    `);

        await prisma.$executeRawUnsafe(`
      ALTER TYPE "ExamStatus" ADD VALUE IF NOT EXISTS 'COMPLETED'
    `);

        console.log('\n✅ Migration completed successfully!\n');
        console.log('Schema changes applied:');
        console.log('  - customTypeName (TEXT)');
        console.log('  - passingMarks (DOUBLE PRECISION)');
        console.log('  - examDate (TIMESTAMP)');
        console.log(' - duration (INTEGER)');
        console.log('  - instructions (TEXT)');
        console.log('  - updatedAt (TIMESTAMP)');
        console.log('  - ExamStatus: Added SCHEDULED, COMPLETED\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

migrateExamSchema();
