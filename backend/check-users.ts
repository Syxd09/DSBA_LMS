
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
    if (count > 0) {
        const users = await prisma.user.findMany({ select: { email: true, role: true, fullName: true } });
        console.log('Existing users:', users);
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
