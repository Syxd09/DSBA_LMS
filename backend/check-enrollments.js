const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnrollments() {
    try {
        console.log('Checking database state...\n');

        // Check cohorts
        const cohorts = await prisma.cohort.findMany({
            include: { program: true }
        });
        console.log('📚 Cohorts:', cohorts.map(c => ({
            name: c.name,
            year: c.year,
            semester: c.currentSemester,
            programCode: c.program.code
        })));

        // Check enrollments
        const enrollments = await prisma.studentEnrollment.findMany({
            include: {
                student: { select: { fullName: true, email: true } },
                cohort: { select: { name: true, year: true } }
            }
        });
        console.log('\n👥 Student Enrollments:', enrollments.length);
        if (enrollments.length > 0) {
            console.log('First enrollment:', {
                student: enrollments[0].student.fullName,
                cohort: enrollments[0].cohort.name,
                semester: enrollments[0].semester,
                rollNumber: enrollments[0].rollNumber
            });
        }

        // Check teacher assignments
        const assignments = await prisma.teacherAssignment.findMany({
            include: {
                subject: { select: { name: true, code: true } },
                cohort: { select: { name: true } }
            }
        });
        console.log('\n📝 Teacher Assignments:', assignments.map(a => ({
            subject: a.subject.code,
            cohort: a.cohort.name,
            semester: a.semester,
            academicYear: a.academicYear
        })));

        // Check exams
        const exams = await prisma.exam.findMany({
            include: {
                subject: { select: { name: true } },
                cohort: { select: { name: true } }
            }
        });
        console.log('\n📋 Exams:', exams.map(e => ({
            subject: e.subject.name,
            cohort: e.cohort.name,
            type: e.examType,
            status: e.status
        })));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEnrollments();
