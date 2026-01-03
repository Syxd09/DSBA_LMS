const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTargetColumn() {
    try {
        console.log('Adding targetPercent column...\n');

        await prisma.$executeRawUnsafe(`
      ALTER TABLE "ProgramOutcome" 
      ADD COLUMN IF NOT EXISTS "targetPercent" DOUBLE PRECISION NOT NULL DEFAULT 60
    `);

        console.log('✅ Column added successfully!');
        console.log('\nRefresh the Program Outcomes page to see the targets!\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

addTargetColumn();
