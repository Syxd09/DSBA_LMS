import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Get Department with code 'CS'
    const department = await prisma.department.findFirst({
        where: { code: 'CS' }
    });

    if (!department) {
        console.error('Department with code CS not found');
        return;
    }

    // 2. Get the HOD user Shivam
    const hod = await prisma.user.findFirst({
        where: { email: 'shivam@gmail.com', role: 'HOD' }
    });

    if (!hod) {
        console.error('HOD Shivam not found');
        return;
    }

    console.log(`Linking HOD ${hod.fullName} (${hod.email}) as hodId for Department ${department.name} (${department.code})`);

    // 3. Update User departmentId
    await prisma.user.update({
        where: { id: hod.id },
        data: { departmentId: department.id }
    });

    // 4. Update Department hodId
    await prisma.department.update({
        where: { id: department.id },
        data: { hodId: hod.id }
    });

    console.log('Linkage successfully established!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
