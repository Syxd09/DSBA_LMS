const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function verifyTeacherData() {
    const output = [];

    output.push('=== TEACHER DATA VERIFICATION ===\n');

    const teacher = await prisma.user.findFirst({
        where: { role: 'TEACHER' }
    });

    if (!teacher) {
        output.push('No teacher found\n');
        fs.writeFileSync('teacher-verification-result.txt', output.join('\n'));
        return;
    }

    output.push(`Teacher: ${teacher.fullName} (${teacher.email})\n`);

    const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: teacher.id },
        include: {
            subject: true,
            cohort: true
        }
    });

    output.push(`\nAssignments: ${assignments.length}\n`);

    for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i];
        output.push(`\nAssignment ${i + 1}:`);
        output.push(`  Subject: ${a.subject.name}`);
        output.push(`  Cohort: ${a.cohort.name}`);
        output.push(`  Semester: ${a.semester}`);
        output.push(`  Cohort ID: ${a.cohortId}`);

        const enrollments = await prisma.enrollment.count({
            where: {
                cohortId: a.cohortId,
                semester: a.semester
            }
        });

        output.push(`  Students in this cohort/semester: ${enrollments}`);
    }

    fs.writeFileSync('teacher-verification-result.txt', output.join('\n'));
    console.log('Results written to teacher-verification-result.txt');

    await prisma.$disconnect();
}

verifyTeacherData().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
