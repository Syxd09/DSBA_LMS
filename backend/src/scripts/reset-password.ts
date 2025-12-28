
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword() {
    const email = 'admin@college.edu';
    const newPassword = 'password123';

    console.log(`🔐 Resetting password for ${email}...`);

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        console.log(`✅ Password successfully updated for ${user.email}`);
    } catch (error) {
        console.error('❌ Failed to update password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
