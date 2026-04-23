import prisma from '../services/db';

async function main() {
    console.log('--- Teacher Assignments ---');
    const assignments = await prisma.teacherAssignment.findMany({
        include: {
            teacher: { select: { email: true, fullName: true } },
            cohort: { select: { name: true } },
            subject: { select: { name: true, code: true } }
        }
    });
    console.log(JSON.stringify(assignments, null, 2));
}

main().finally(() => prisma.$disconnect());
