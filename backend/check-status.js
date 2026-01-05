const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentStatus() {
    const enrollment = await prisma.studentEnrollment.findFirst({
        include: {
            student: true,
            cohort: true
        }
    });

    console.log('Sample enrollment:', {
        student: enrollment?.student.fullName,
        cohort: enrollment?.cohort.name,
        cohortId: enrollment?.cohortId,
        status: enrollment?.status,
        semester: enrollment?.semester
    });

    const allEnrollments = await prisma.studentEnrollment.findMany();
    console.log('\nTotal enrollments:', allEnrollments.length);
    console.log('All statuses:', allEnrollments.map(e => e.status));

    await prisma.$disconnect();
}

checkStudentStatus();
