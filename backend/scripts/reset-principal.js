const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAndResetPrincipal() {
    try {
        // Find principal user
        const principal = await prisma.user.findFirst({
            where: { role: 'PRINCIPAL' }
        });

        if (!principal) {
            console.log('❌ No Principal user found!');
            console.log('Run: node scripts/seed-test-users.js');
            return;
        }

        console.log('\n📋 Principal User Found:');
        console.log(`   Email: ${principal.email}`);
        console.log(`   Name: ${principal.fullName}`);
        console.log(`   Active: ${principal.isActive}`);
        console.log(`   Department: ${principal.departmentId || 'None (College-level)'}`);

        // Reset password to 'password123'
        const newPassword = await bcrypt.hash('password123', 10);

        await prisma.user.update({
            where: { id: principal.id },
            data: {
                password: newPassword,
                isActive: true
            }
        });

        console.log('\n✅ Password reset to: password123');
        console.log('\n🔑 Login with:');
        console.log(`   Email: ${principal.email}`);
        console.log(`   Password: password123`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndResetPrincipal();
