
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Departments ---');
    const departments = await prisma.department.findMany({ include: { hod: true } });
    console.dir(departments, { depth: null });

    console.log('\n--- HOD User ---');
    const hod = await prisma.user.findUnique({
        where: { email: 'hod.cse@college.edu' },
        include: { department: true, departmentLed: true }
    });
    console.dir(hod, { depth: null });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
