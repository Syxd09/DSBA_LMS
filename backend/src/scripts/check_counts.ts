import prisma from '../services/db';

async function main() {
    const ta = await prisma.teacherAssignment.count();
    const se = await prisma.studentEnrollment.count();
    const active_se = await prisma.studentEnrollment.count({ where: { status: 'active' } });
    console.log({ 
        teacherAssignments: ta, 
        studentEnrollments: se, 
        activeEnrollments: active_se 
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
