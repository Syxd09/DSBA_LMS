
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const teacherEmail = 'shivam.9@gmail.com';
    console.log(`Teacher: ${teacherEmail}`);

    // 1. Get Teacher Assignments
    const teacher = await prisma.user.findUnique({
        where: { email: teacherEmail },
        include: { teacherAssignments: { include: { cohort: true, subject: true } } }
    });

    if (!teacher) { console.log('Teacher not found'); return; }

    console.log(`Assignments Found: ${teacher.teacherAssignments.length}`);

    for (const assign of teacher.teacherAssignments) {
        console.log(`\n--- Assignment ---`);
        console.log(`Subject: ${assign.subject.code}`);
        console.log(`Cohort: ${assign.cohort.name} (ID: ${assign.cohortId})`);
        console.log(`Sem: ${assign.semester}`);

        // 2. Count Students in this Cohort (ignoring semester)
        const count = await prisma.studentEnrollment.count({
            where: { cohortId: assign.cohortId }
        });
        console.log(`Total Students in Cohort: ${count}`);

        // 3. List top 3 students
        const students = await prisma.studentEnrollment.findMany({
            where: { cohortId: assign.cohortId },
            take: 3,
            select: { rollNumber: true, semester: true }
        });
        if (students.length > 0) {
            console.log('Sample Students:', students);
        } else {
            console.log('NO STUDENTS FOUND IN DB FOR THIS COHORT!');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
