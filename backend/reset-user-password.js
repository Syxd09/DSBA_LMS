const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetPassword() {
    const email = 'syxdmatheen.9@gmail.com';
    const newPassword = 'password123';

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log(`❌ User ${email} not found!`);
            // List all users to see who exists
            const users = await prisma.user.findMany({
                take: 5,
                select: { email: true, role: true }
            });
            console.log('Existing users:', users);
            return;
        }

        console.log(`Found user: ${user.email} (${user.role})`);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });

        console.log(`✅ Password for ${email} has been reset to: ${newPassword}`);

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
