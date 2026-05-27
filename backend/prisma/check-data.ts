
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Departments ---');
    const departments = await prisma.department.findMany({ include: { hod: true } });
    console.dir(departments, { depth: null });

    console.log('\n--- HOD User ---');
    const hod = await prisma.user.findFirst({
        where: { email: 'shivam@gmail.com' },
        include: { department: true, departmentLed: true }
    });
    console.dir(hod, { depth: null });

    console.log('\n--- Aarav Patel User ---');
    const aarav = await prisma.user.findFirst({
        where: { fullName: 'Aarav Patel' },
        include: { department: true }
    });
    console.dir(aarav, { depth: null });

    console.log('\n--- Query Analytics Cache like HOD ---');
    const deptId = 'e84c4f27-5b04-4c67-9e2f-5cd20f8a969b';
    const whereClause: any = {
        feedback: {
            student: {
                departmentId: deptId
            },
            status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED'] }
        }
    };
    const results = await prisma.feedbackAnalyticsCache.findMany({
        where: whereClause,
        include: {
            feedback: {
                include: {
                    student: { select: { id: true, fullName: true, registrationNumber: true, departmentId: true } },
                    subject: { select: { id: true, name: true } }
                }
            }
        }
    });
    console.dir(results, { depth: null });

    console.log('\n--- Feedback Analytics Cache Count ---');
    const cacheCount = await prisma.feedbackAnalyticsCache.count();
    console.log(`Total Cache Records: ${cacheCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
