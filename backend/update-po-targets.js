const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTargets() {
    console.log('Fixing PO target percentages...\n');

    // Get all POs
    const pos = await prisma.programOutcome.findMany();

    console.log(`Found ${pos.length} Program Outcomes\n`);

    let updated = 0;
    for (const po of pos) {
        if (!po.targetPercent || po.targetPercent === 0) {
            await prisma.programOutcome.update({
                where: { id: po.id },
                data: { targetPercent: 60 }
            });
            console.log(`✓ Updated PO${po.poNumber} to 60%`);
            updated++;
        }
    }

    console.log(`\n✅ Updated ${updated} Program Outcomes\n`);
    console.log('Refresh the page to see the changes!');

    await prisma.$disconnect();
}

fixTargets();
