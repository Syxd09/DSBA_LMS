const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserToPrincipal() {
    try {
        console.log('Updating user to PRINCIPAL role...\n');

        const user = await prisma.user.update({
            where: {
                email: 'syxdmatheen.9@gmail.com'
            },
            data: {
                role: 'PRINCIPAL'
            }
        });

        console.log('✅ User updated successfully!');
        console.log('\n📋 User Details:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.fullName}`);
        console.log(`   Role: ${user.role}`);
        console.log('\nYou can now login as Principal!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateUserToPrincipal();
