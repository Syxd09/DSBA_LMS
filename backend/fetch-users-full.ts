
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            createdAt: true,
            departmentId: true,
            mobileNumber: true,
            password: true
        }
    });
    fs.writeFileSync('all_users.json', JSON.stringify(users, null, 2));
    console.log(`Successfully fetched ${users.length} users and saved to all_users.json`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
