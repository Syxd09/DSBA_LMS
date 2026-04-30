const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Updating all user passwords to "password123"...');
    const hash = await bcrypt.hash('password123', 10);
    const result = await prisma.user.updateMany({
        data: { password: hash }
    });
    console.log(`✅ Success! Updated ${result.count} users.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
