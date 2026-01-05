const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeacherAssignment() {
    // Get all teachers
    const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        select: { id: true, email: true, fullName: true }
    });

    console.log('Teachers:');
    teachers.forEach((t, idx) => {
        console.log(`  ${idx + 1}. ${t.fullName} (${t.email})`);
        console.log(`     ID: ${t.id.substring(0, 8)}...`);
    });

    // Get the exam
    const exam = await prisma.exam.findFirst({
        include: {
            subject: true,
            cohort: true
        }
    });

    console.log('\nExam:');
    console.log('  Subject:', exam.subject.name);
    console.log('  Teacher ID:', exam.teacherId?.substring(0, 8) + '...');

    const examTeacher = teachers.find(t => t.id === exam.teacherId);
    console.log('  Assigned to:', examTeacher?.fullName, '(' + examTeacher?.email + ')');

    // Get teacher assignment
    const assignment = await prisma.teacherAssignment.findFirst({
        where: {
            subjectId: exam.subjectId,
            cohortId: exam.cohortId
        },
        include: {
            teacher: true,
            subject: true,
            cohort: true
        }
    });

    console.log('\nTeacher Assignment:');
    console.log('  Teacher:', assignment?.teacher.fullName);
    console.log('  Subject:', assignment?.subject.name);
    console.log('  Cohort:', assignment?.cohort.name);

    await prisma.$disconnect();
}

checkTeacherAssignment();
