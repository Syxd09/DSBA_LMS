import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndCreateUsers() {
    console.log('Checking existing users...');

    const existingUsers = await prisma.user.findMany({
        select: {
            email: true,
            role: true,
            fullName: true,
            departmentId: true
        }
    });

    console.log('\n=== Existing Users ===');
    console.log(JSON.stringify(existingUsers, null, 2));
    console.log(`\nTotal users: ${existingUsers.length}`);

    // Check if we have test users for each role
    const hasTeacher = existingUsers.some(u => u.role === 'TEACHER');
    const hasHOD = existingUsers.some(u => u.role === 'HOD');
    const hasPrincipal = existingUsers.some(u => u.role === 'PRINCIPAL');

    console.log('\n=== Role Coverage ===');
    console.log(`Teacher: ${hasTeacher ? '✓' : '✗'}`);
    console.log(`HOD: ${hasHOD ? '✓' : '✗'}`);
    console.log(`Principal: ${hasPrincipal ? '✓' : '✗'}`);

    // If missing any role, we need to create test users
    if (!hasTeacher || !hasHOD || !hasPrincipal) {
        console.log('\n⚠️  Missing test users for Phase 6B testing');
        console.log('Run: npm run seed to create test users');
    } else {
        console.log('\n✓ All required roles have users - ready for testing');
    }

    await prisma.$disconnect();
}

checkAndCreateUsers().catch(console.error);
