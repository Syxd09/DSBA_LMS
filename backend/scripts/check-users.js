const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                role: true,
                fullName: true
            }
        });

        console.log('\n=== Existing Users ===');
        users.forEach(u => {
            console.log(`${u.role.padEnd(12)} | ${u.email.padEnd(30)} | ${u.fullName}`);
        });
        console.log(`\nTotal: ${users.length} users`);

        const hasTeacher = users.some(u => u.role === 'TEACHER');
        const hasHOD = users.some(u => u.role === 'HOD');
        const hasPrincipal = users.some(u => u.role === 'PRINCIPAL');

        console.log('\n=== Phase 6B Role Coverage ===');
        console.log(`Teacher:   ${hasTeacher ? '✓ Found' : '✗ Missing'}`);
        console.log(`HOD:       ${hasHOD ? '✓ Found' : '✗ Missing'}`);
        console.log(`Principal: ${hasPrincipal ? '✓ Found' : '✗ Missing'}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
