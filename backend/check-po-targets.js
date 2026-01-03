const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPOTargets() {
    const pos = await prisma.programOutcome.findMany({
        orderBy: { poNumber: 'asc' }
    });

    console.log('Program Outcomes:');
    console.log('=================\n');

    for (const po of pos) {
        console.log(`PO${po.poNumber}: ${po.description}`);
        console.log(`  Target: ${po.targetPercent}%`);
        console.log(`  Program ID: ${po.programId}\n`);
    }

    await prisma.$disconnect();
}

checkPOTargets();
