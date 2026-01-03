const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setDefaultTargets() {
    console.log('Setting default target percentages...\n');

    const result = await prisma.programOutcome.updateMany({
        where: {
            targetPercent: null
        },
        data: {
            targetPercent: 60
        }
    });

    console.log(`✅ Updated ${result.count} Program Outcomes with 60% target\n`);

    // Verify
    const pos = await prisma.programOutcome.findMany({
        orderBy: { poNumber: 'asc' }
    });

    console.log('Current PO Targets:');
    for (const po of pos) {
        console.log(`  PO${po.poNumber}: ${po.targetPercent}%`);
    }

    await prisma.$disconnect();
}

setDefaultTargets();
