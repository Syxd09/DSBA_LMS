import { PrismaClient } from '@prisma/client';
import { calculateCOAttainmentForExam } from './src/services/co-attainment.service';
import { calculatePOAttainmentForSubject } from './src/services/po-attainment.service';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Finding CS23 Data Structures exam...\n');

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
        console.log('❌ No published CS23 exam found');
        return;
    }

    console.log('✅ Found:', exam.subject.name);
    console.log(`   Exam ID: ${exam.id}\n`);

    const marks = await prisma.studentMark.count({ where: { examId: exam.id } });
    console.log(`📊 Marks: ${marks} records\n`);

    if (marks === 0) {
        console.log('❌ No marks entered!');
        return;
    }

    console.log('🔄 Running CO calculation...');
    await calculateCOAttainmentForExam(exam.id);

    console.log('🔄 Running PO calculation...');
    await calculatePOAttainmentForSubject(exam.subjectId, exam.cohortId);

    const results = await prisma.cOAttainment.findMany({
        where: { subjectId: exam.subjectId },
        include: { co: true }
    });

    console.log(`\n✅ Created ${results.length} CO records:`);
    results.forEach(r => {
        console.log(`   ${r.co.code}: ${r.achievedPercent}%`);
    });

    console.log('\n🎉 Refresh CO-PO Analytics!');
    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
