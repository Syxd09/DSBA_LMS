const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient();

async function directRecalculate() {
    console.log('🔍 Finding Data Structures (CS23) exam...\n');

    const exam = await prisma.exam.findFirst({
        where: {
            status: 'PUBLISHED',
            subject: {
                code: 'CS23'
            }
        },
        include: {
            subject: true
        }
    });

    if (!exam) {
        console.log('❌ No published CS23 exam found!');
        await prisma.$disconnect();
        return;
    }

    console.log('✅ Found exam:');
    console.log(`   ID: ${exam.id}`);
    console.log(`   Subject: ${exam.subject.name} (${exam.subject.code})`);
    console.log(`   Type: ${exam.examType}\n`);

    // Check marks
    const marksCount = await prisma.studentMark.count({
        where: { examId: exam.id }
    });

    console.log(`📊 Student marks: ${marksCount} records\n`);

    if (marksCount === 0) {
        console.log('❌ No marks found!');
        await prisma.$disconnect();
        return;
    }

    console.log('🔄 Triggering CO attainment calculation...\n');

    // Import and run calculation
    const { calculateCOAttainmentForExam } = require('./src/services/co-attainment.service');
    const { calculatePOAttainmentForSubject } = require('./src/services/po-attainment.service');

    try {
        await calculateCOAttainmentForExam(exam.id);
        console.log('✅ CO calculation complete!\n');

        await calculatePOAttainmentForSubject(exam.subjectId, exam.cohortId);
        console.log('✅ PO calculation complete!\n');

        // Check results
        const coResults = await prisma.cOAttainment.findMany({
            where: { subjectId: exam.subjectId },
            include: { co: true }
        });

        console.log(`📈 Created ${coResults.length} CO attainment records:`);
        coResults.forEach(r => {
            console.log(`   ${r.co.code}: ${r.achievedPercent.toFixed(1)}% (${r.passCount}/${r.studentCount})`);
        });

        console.log('\n🎉 Done! Refresh your CO-PO Analytics page!');

    } catch (error) {
        console.error('❌ Calculation failed:', error.message);
    }

    await prisma.$disconnect();
}

directRecalculate();
