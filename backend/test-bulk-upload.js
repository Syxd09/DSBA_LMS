const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBulkUpload() {
    const examId = '4fdf2606-ed96-4cfa-8fcc-65397afbcd5d'; // Replace with actual exam ID

    // Test the same logic as the backend endpoint
    const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
            cohort: true,
            sections: {
                include: {
                    questions: { include: { subQuestions: true } }
                }
            }
        }
    });

    if (!exam) {
        console.log('❌ Exam not found');
        return;
    }

    console.log('✅ Exam found:', exam.examType);
    console.log('   Cohort:', exam.cohort.name);

    const enrollments = await prisma.studentEnrollment.findMany({
        where: { cohortId: exam.cohortId, status: 'active' },
        include: { student: true }
    });

    console.log('   Students:', enrollments.length);

    const allSubQuestions = exam.sections.flatMap(s => s.questions.flatMap(q => q.subQuestions));
    console.log('   Sub-questions:', allSubQuestions.length);

    console.log('\nSub-question IDs and labels:');
    allSubQuestions.forEach((sq, idx) => {
        console.log(`   ${idx + 1}. ID: ${sq.id.substring(0, 8)}..., Label: ${sq.label}, Max: ${sq.maxMarks}`);
    });

    console.log('\nStudent roll numbers:');
    enrollments.slice(0, 3).forEach(e => {
        console.log(`   ${e.rollNumber} - ${e.student.fullName}`);
    });

    await prisma.$disconnect();
}

testBulkUpload();
