const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullCheck() {
    try {
        console.log('=== FULL DATABASE STATE ===\n');

        const users = await prisma.user.count();
        const students = await prisma.user.count({ where: { role: 'STUDENT' } });
        const teachers = await prisma.user.count({ where: { role: 'TEACHER' } });

        console.log('Users:', { total: users, students, teachers });

        const cohorts = await prisma.cohort.findMany({ include: { program: true } });
        console.log('\nCohorts:', cohorts.map(c => ({
            name: c.name,
            year: c.year,
            id: c.id.substring(0, 8)
        })));

        const enrollments = await prisma.studentEnrollment.count();
        console.log('\nTotal Enrollments:', enrollments);

        const exams = await prisma.exam.findMany({
            include: {
                subject: true,
                cohort: true,
                sections: {
                    include: {
                        questions: {
                            include: {
                                subQuestions: true
                            }
                        }
                    }
                }
            }
        });

        console.log('\n=== EXAMS ===');
        console.log('Total Exams:', exams.length);

        exams.forEach((exam, idx) => {
            const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
            const totalSubQuestions = exam.sections.reduce((sum, s) =>
                sum + s.questions.reduce((qSum, q) => qSum + q.subQuestions.length, 0), 0);

            console.log(`\nExam ${idx + 1}:`);
            console.log('  Subject:', exam.subject.name, '(' + exam.subject.code + ')');
            console.log('  Type:', exam.examType);
            console.log('  Cohort:', exam.cohort.name);
            console.log('  CohortID:', exam.cohortId.substring(0, 8));
            console.log('  Status:', exam.status);
            console.log('  Sections:', exam.sections.length);
            console.log('  Questions:', totalQuestions);
            console.log('  SubQuestions:', totalSubQuestions);
            console.log('  ID:', exam.id.substring(0, 8));
        });

        // Check enrollments for first exam's cohort
        if (exams.length > 0) {
            const examCohortId = exams[0].cohortId;
            const cohortEnrollments = await prisma.studentEnrollment.findMany({
                where: { cohortId: examCohortId, status: 'active' },
                include: { student: { select: { fullName: true } } }
            });

            console.log('\n=== ENROLLMENTS FOR EXAM COHORT ===');
            console.log('Count:', cohortEnrollments.length);
            if (cohortEnrollments.length > 0) {
                console.log('Students:', cohortEnrollments.map(e => e.student.fullName).join(', '));
            }
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fullCheck();
