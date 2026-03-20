const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedPrincipal() {
    console.log('🌱 Creating principal account...');

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash('password', 10);

        // Check if user exists
        const existing = await prisma.user.findUnique({
            where: { email: 'syxdmatheen.09@gmail.com' }
        });

        if (existing) {
            console.log('✅ Principal account already exists!');
            console.log('Email: syxdmatheen.09@gmail.com');
            console.log('Password: 54321');
            return;
        }

        // Create principal
        const principal = await prisma.user.create({
            data: {
                email: 'syxdmatheen.09@gmail.com',
                fullName: 'System Principal',
                password: await bcrypt.hash('#761936', 10),
                role: 'PRINCIPAL'
            }
        });

        console.log('✅ Principal account created successfully!');
        console.log('Email: syxdmatheen.09@gmail.com');
        console.log('Password: #761936');
        console.log(`User ID: ${principal.id}`);

    } catch (error) {
        console.error('❌ Error creating principal:', error.message);
        throw error;
    }
}

seedPrincipal()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
