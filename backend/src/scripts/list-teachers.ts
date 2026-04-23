
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        select: { email: true, fullName: true }
    });
    console.log(JSON.stringify(teachers, null, 2));
}
main().finally(() => prisma.$disconnect());
