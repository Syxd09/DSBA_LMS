
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Get the BCA department
    const department = await prisma.department.findFirst({
        where: { name: 'BCA' }
    });

    if (!department) {
        console.error('Department BCA not found');
        return;
    }

    // 2. Get the HOD user
    const hod = await prisma.user.findUnique({
        where: { email: 'hod.cse@college.edu' }
    });

    // Also get teacher and student to link them for convenience
    const teacher = await prisma.user.findUnique({ where: { email: 'teacher.cse@college.edu' } });
    const student = await prisma.user.findUnique({ where: { email: 'student.cse@college.edu' } });

    if (!hod) {
        console.error('HOD user not found');
        return;
    }

    console.log(`Linking HOD ${hod.email} to Department ${department.name}`);

    // 3. Link them
    // Update User
    await prisma.user.update({
        where: { id: hod.id },
        data: { departmentId: department.id }
    });

    // Update Department
    await prisma.department.update({
        where: { id: department.id },
        data: { hodId: hod.id }
    });

    // Link Teacher and Student if they exist
    if (teacher) {
        await prisma.user.update({ where: { id: teacher.id }, data: { departmentId: department.id } });
        console.log('Linked Teacher');
    }
    if (student) {
        await prisma.user.update({ where: { id: student.id }, data: { departmentId: department.id } });
        console.log('Linked Student');
    }

    console.log('Linkage complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
