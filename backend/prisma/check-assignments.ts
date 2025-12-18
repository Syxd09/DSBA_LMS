
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        include: {
            _count: {
                select: { teacherAssignments: true }
            }
        }
    });

    console.log('--- Teacher Assignment Counts ---');
    teachers.forEach(t => {
        console.log(`${t.fullName}: ${t._count.teacherAssignments} assignments`);
    });

    const enrollments = await prisma.studentEnrollment.groupBy({
        by: ['cohortId', 'semester'],
        _count: true
    });
    console.log('\n--- Student Enrollments ---');
    console.log(enrollments);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
