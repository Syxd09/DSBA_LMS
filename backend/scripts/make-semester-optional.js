const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeSemesterOptional() {
    try {
        console.log('Making semester column optional...');

        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Exam" 
            ALTER COLUMN "semester" DROP NOT NULL;
        `);

        console.log('✅ Semester column is now optional');
        console.log('🎉 You can now create exams!');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

makeSemesterOptional();
