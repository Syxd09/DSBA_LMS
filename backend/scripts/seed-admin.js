const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding admin user...');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create or update admin user
    const admin = await prisma.user.upsert({
        where: { email: 'syxdmatheen.9@gmail.com' },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true
        },
        create: {
            email: 'syxdmatheen.9@gmail.com',
            password: hashedPassword,
            fullName: 'Syed Matheen',
            role: 'ADMIN',
            isActive: true
        }
    });

    console.log('✅ Admin user created/updated:');
    console.log('   Email:', admin.email);
    console.log('   Name:', admin.fullName);
    console.log('   Role:', admin.role);
    console.log('   ID:', admin.id);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding admin user:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
