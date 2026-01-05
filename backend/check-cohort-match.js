const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCohortMatch() {
    const exam = await prisma.exam.findFirst({
        include: {
            cohort: true,
            subject: true
        }
    });

    console.log('Exam:', {
        id: exam?.id,
        subject: exam?.subject.name,
        examType: exam?.examType,
        cohortId: exam?.cohortId,
        cohortName: exam?.cohort.name
    });

    const enrollments = await prisma.studentEnrollment.findMany({
        where: { cohortId: exam?.cohortId },
        include: { student: true }
    });

    console.log('\nEnrollments for this exam\'s cohort:', enrollments.length);
    if (enrollments.length > 0) {
        console.log('Students:', enrollments.map(e => e.student.fullName));
    }

    await prisma.$disconnect();
}

checkCohortMatch();
