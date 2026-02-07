const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLabels() {
    const subQs = await prisma.subQuestion.findMany({ take: 20 });

    console.log('\n📋 Sample Sub-Question Labels from Database:\n');

    if (subQs.length === 0) {
        console.log('No sub-questions found in database');
    } else {
        subQs.forEach((sq, idx) => {
            console.log(`${idx + 1}. ID: ${sq.id.substring(0, 12)}... Label: "${sq.label}" Max: ${sq.maxMarks}`);
        });
    }

    await prisma.$disconnect();
}

checkLabels();
