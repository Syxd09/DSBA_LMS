const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttainmentData() {
    console.log('=== CHECKING ATTAINMENT DATA ===\n');

    // Check COAttainment records
    const coAttainments = await prisma.cOAttainment.findMany({
        include: {
            subject: { select: { name: true, code: true } },
            co: { select: { coNumber: true, code: true } }
        }
    });

    console.log(`📊 COAttainment records: ${coAttainments.length}\n`);

    if (coAttainments.length > 0) {
        coAttainments.forEach(att => {
            console.log(`  ${att.subject.name} (${att.subject.code}) - ${att.co.code}`);
            console.log(`    Achieved: ${att.achievedPercent}% / Target: ${att.targetPercent}%`);
            console.log(`    Students: ${att.passCount}/${att.studentCount}`);
            console.log('');
        });
    } else {
        console.log('  ❌ No CO attainment records found!\n');
    }

    // Check POAttainment records
    const poAttainments = await prisma.pOAttainment.findMany();
    console.log(`📊 POAttainment records: ${poAttainments.length}\n`);

    // Check published exams
    const publishedExams = await prisma.exam.findMany({
        where: { status: 'PUBLISHED' },
        include: {
            subject: { select: { name: true, code: true } }
        }
    });

    console.log(`📝 Published exams: ${publishedExams.length}\n`);
    publishedExams.forEach(exam => {
        console.log(`  ${exam.subject.name} (${exam.subject.code})`);
        console.log(`    Exam ID: ${exam.id}`);
        console.log(`    Type: ${exam.examType}`);
        console.log('');
    });

    // Check if Data Structures exam has marks
    const dsExam = publishedExams.find(e => e.subject.code === 'CS23');
    if (dsExam) {
        const marksCount = await prisma.studentMark.count({
            where: { examId: dsExam.id }
        });
        console.log(`  CS23 Data Structures marks: ${marksCount} records\n`);

        if (marksCount > 0) {
            console.log('✅ Exam has marks - ready for recalculation!\n');
            console.log(`Run: node -e "require('./backend/src/services/co-attainment.service').calculateCOAttainmentForExam('${dsExam.id}')"`);
        }
    }

    await prisma.$disconnect();
}

checkAttainmentData().catch(console.error);
