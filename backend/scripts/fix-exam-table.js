const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExamTable() {
    try {
        console.log('Fixing Exam table updatedAt column...');

        // Run raw SQL to alter the table
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Exam" 
            ALTER COLUMN "updatedAt" DROP NOT NULL;
        `);

        console.log('✅ Removed NOT NULL constraint');

        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Exam" 
            ALTER COLUMN "updatedAt" SET DEFAULT NOW();
        `);

        console.log('✅ Set default value to NOW()');

        console.log('🎉 Exam table fixed successfully!');
    } catch (error) {
        console.error('❌ Error fixing table:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixExamTable();
