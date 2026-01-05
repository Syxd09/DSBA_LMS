const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateAPICall() {
    const exam = await prisma.exam.findFirst({
        include: { cohort: true, subject: true }
    });

    console.log('Exam Cohort ID:', exam.cohortId);

    // Simulate the API call that the frontend makes
    const enrollments = await prisma.studentEnrollment.findMany({
        where: { cohortId: exam.cohortId, status: 'active' },
        include: { student: true }
    });

    const students = enrollments.map(e => ({
        studentId: e.student.id,
        rollNumber: e.rollNumber,
        studentName: e.student.fullName
    }));

    console.log('\nAPI Response:');
    console.log('Total students:', students.length);
    if (students.length > 0) {
        console.log('First 3 students:');
        students.slice(0, 3).forEach(s => {
            console.log(`  - ${s.studentName} (${s.rollNumber})`);
        });
    }

    await prisma.$disconnect();
}

simulateAPICall();
