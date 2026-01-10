import { PrismaClient } from '@prisma/client';
import { calculateCOAttainmentForExam } from '../services/co-attainment.service';
import { calculatePOAttainmentForSubject } from '../services/po-attainment.service';

const prisma = new PrismaClient();

async function testAttainment() {
    try {
        console.log('=== Testing Attainment Calculations ===\n');

        // Find a published exam
        const publishedExam = await prisma.exam.findFirst({
            where: { status: 'PUBLISHED' },
            include: { subject: true, cohort: true }
        });

        if (!publishedExam) {
            console.log('❌ No published exams found!');
            return;
        }

        console.log(`✅ Found published exam: ${publishedExam.examType}`);
        console.log(`   Subject: ${publishedExam.subject.name}`);
        console.log(`   Cohort: ${publishedExam.cohort.name}`);
        console.log(` Exam ID: ${publishedExam.id}\n`);

        // Check if it has marks
        const marksCount = await prisma.studentMark.count({
            where: { examId: publishedExam.id }
        });
        console.log(`📊 Found ${marksCount} student marks\n`);

        if (marksCount === 0) {
            console.log('⚠️  No marks entered for this exam. Cannot calculate attainment.');
            return;
        }

        // Test CO calculation
        console.log('🔄 Running CO Attainment calculation...');
        await calculateCOAttainmentForExam(publishedExam.id);

        // Check results
        const coAttainments = await prisma.cOAttainment.findMany({
            where: {
                subjectId: publishedExam.subjectId,
                cohortId: publishedExam.cohortId
            },
            include: { co: true }
        });

        console.log(`\n✅ CO Attainment results: ${coAttainments.length} records created`);
        coAttainments.forEach(att => {
            console.log(`   CO${att.co.coNumber}: ${att.achievedPercent.toFixed(2)}% (${att.passCount}/${att.studentCount} students)`);
        });

        // Test PO calculation
        console.log('\n🔄 Running PO Attainment calculation...');
        await calculatePOAttainmentForSubject(publishedExam.subjectId, publishedExam.cohortId);

        // Check results
        const poAttainments = await prisma.pOAttainment.findMany({
            where: {
                cohortId: publishedExam.cohortId,
                semester: publishedExam.semester
            },
            include: { po: true }
        });

        console.log(`\n✅ PO Attainment results: ${poAttainments.length} records created`);
        poAttainments.forEach(att => {
            console.log(`   PO${att.poId}: ${att.achievedPercent.toFixed(2)}%`);
        });

        console.log('\n🎉 All calculations completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAttainment();
