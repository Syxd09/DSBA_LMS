
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const roles = ['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'STUDENT'];

    for (const role of roles) {
        // @ts-ignore
        const users = await prisma.user.findMany({
            where: { role: role as any },
            orderBy: { email: 'asc' },
            take: role === 'STUDENT' ? 5 : undefined // Limit students for brevity
        });

        if (users.length > 0) {
            console.log(`\n--- ${role}s ---`);
            users.forEach(u => {
                console.log(`${u.fullName} | ${u.email}`);
            });
            if (role === 'STUDENT') {
                const count = await prisma.user.count({ where: { role: 'STUDENT' } });
                console.log(`... and ${count - 5} more students`);
            }
        }
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
