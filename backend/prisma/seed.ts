
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
        {
            email: 'admin@college.edu',
            fullName: 'System Admin',
            password: hashedPassword,
            role: Role.ADMIN,
        },
        {
            email: 'principal@college.edu',
            fullName: 'Principal User',
            password: hashedPassword,
            role: Role.PRINCIPAL,
        },
        {
            email: 'hod.cse@college.edu',
            fullName: 'HOD CSE',
            password: hashedPassword,
            role: Role.HOD,
        },
        {
            email: 'teacher.cse@college.edu',
            fullName: 'Teacher CSE',
            password: hashedPassword,
            role: Role.TEACHER,
        },
        {
            email: 'student.cse@college.edu',
            fullName: 'Student CSE',
            password: hashedPassword,
            role: Role.STUDENT,
        },
    ];

    for (const user of users) {
        const upsertedUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: user,
        });
        console.log(`Created user: ${upsertedUser.email} (${upsertedUser.role})`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
