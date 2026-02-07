const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetDatabase() {
    console.log('🗑️  Clearing entire database...\n');

    try {
        // First check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: 'syxdmatheen.9@gmail.com' }
        });

        if (existingUser) {
            console.log('⚠️  User already exists, deleting...');
            await prisma.user.delete({
                where: { email: 'syxdmatheen.9@gmail.com' }
            });
        }

        // Delete all users
        const deletedUsers = await prisma.user.deleteMany({});
        console.log(`✓ Deleted ${deletedUsers.count} users\n`);

        // Create Principal user
        console.log('👤 Creating fresh Principal user...\n');

        const hashedPassword = await bcrypt.hash('syxd123', 10);

        const principal = await prisma.user.create({
            data: {
                email: 'syxdmatheen.9@gmail.com',
                password: hashedPassword,
                fullName: 'Syed Matheen',
                role: 'PRINCIPAL',
                isActive: true,
                departmentId: null
            }
        });

        console.log('✅ Principal user created successfully!\n');
        console.log('═══════════════════════════════════════');
        console.log('🔑 LOGIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log(`📧 Email:    syxdmatheen.9@gmail.com`);
        console.log(`🔒 Password: syxd123`);
        console.log(`👤 Role:     PRINCIPAL`);
        console.log(`📛 Name:     Syed Matheen`);
        console.log(`🆔 ID:       ${principal.id}`);
        console.log('═══════════════════════════════════════\n');

        console.log('✅ Database reset complete! You can now login.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
