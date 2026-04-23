import prisma from '../services/db';

async function main() {
    const users = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        take: 50,
        select: { email: true, fullName: true, role: true }
    });
    console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
