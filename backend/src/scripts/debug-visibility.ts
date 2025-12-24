
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'shivam.9@gmail.com';
    console.log(`Checking data for teacher: ${email}`);

    const teacher = await prisma.user.findUnique({
        where: { email },
        include: { teacherAssignments: { include: { cohort: true, subject: true } } }
    });

    if (!teacher) {
        console.log('Teacher not found');
        return;
    }

    console.log(`Teacher ID: ${teacher.id}`);
    console.log(`Assignments: ${teacher.teacherAssignments.length}`);

    for (const assignment of teacher.teacherAssignments) {
        console.log('--------------------------------------------------');
        console.log(`SUBJECT: ${assignment.subject.code} - ${assignment.subject.name}`);
        console.log(`DETAILS: Cohort: "${assignment.cohort.name}" (ID: ${assignment.cohortId}) | Assigned Sem: ${assignment.semester}`);

        // Check strict match (Sem + Cohort)
        const strictCount = await prisma.studentEnrollment.count({
            where: {
                cohortId: assignment.cohortId,
                semester: assignment.semester
            }
        });

        // Check cohort match (Any Sem)
        const laxCount = await prisma.studentEnrollment.count({
            where: {
                cohortId: assignment.cohortId
            }
        });

        console.log(`STUDENTS (Strict Sem ${assignment.semester}): ${strictCount}`);
        console.log(`STUDENTS (Any Sem in Batch): ${laxCount}`);

        if (laxCount > 0) {
            const sample = await prisma.studentEnrollment.findFirst({
                where: { cohortId: assignment.cohortId },
                select: { student: { select: { fullName: true, email: true } }, semester: true }
            });
            console.log(`SAMPLE STUDENT: ${sample?.student.fullName} (Sem ${sample?.semester})`);
        } else {
            console.log("WARNING: No students found in this cohort at all.");
        }
    }
    console.log('--------------------------------------------------');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
