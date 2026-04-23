import prisma from '../services/db';

async function main() {
    const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        include: {
            teacherAssignments: true
        }
    });

    console.log(`Found ${teachers.length} teachers`);
    for (const t of teachers) {
        console.log(`Teacher: ${t.email} (${t.id}) - Assignments: ${t.teacherAssignments.length}`);
    }
}

main().finally(() => prisma.$disconnect());
