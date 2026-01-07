const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // Use bcrypt (not bcryptjs)

const prisma = new PrismaClient();

async function seedTestUsers() {
    console.log('🌱 Seeding test users for Phase 6B testing...\n');

    try {
        // Create Department first (required for users)
        let dept = await prisma.department.findFirst({
            where: { code: 'CSE' }
        });

        if (!dept) {
            console.log('Creating CSE Department...');
            dept = await prisma.department.create({
                data: {
                    name: 'Computer Science Engineering',
                    code: 'CSE',
                    isActive: true
                }
            });
            console.log('✓ Department created:', dept.name);
        } else {
            console.log('✓ Department exists:', dept.name);
        }

        // Password for all test users
        const password = await bcrypt.hash('password123', 10);

        // Create test users for each role
        const testUsers = [
            {
                email: 'teacher@test.com',
                password,
                fullName: 'Test Teacher',
                role: 'TEACHER',
                departmentId: dept.id
            },
            {
                email: 'hod@test.com',
                password,
                fullName: 'Test HOD',
                role: 'HOD',
                departmentId: dept.id
            },
            {
                email: 'principal@test.com',
                password,
                fullName: 'Test Principal',
                role: 'PRINCIPAL',
                departmentId: null // Principal is college-level
            },
            {
                email: 'admin@test.com',
                password,
                fullName: 'Test Admin',
                role: 'ADMIN',
                departmentId: null
            }
        ];

        console.log('\nCreating test users...');
        for (const userData of testUsers) {
            const existing = await prisma.user.findUnique({
                where: { email: userData.email }
            });

            if (existing) {
                console.log(`⏭️  ${userData.role}: ${userData.email} (already exists)`);
            } else {
                const user = await prisma.user.create({ data: userData });
                console.log(`✓ ${userData.role}: ${userData.email}`);
            }
        }

        // Also update Department HOD
        const hod = await prisma.user.findUnique({
            where: { email: 'hod@test.com' }
        });

        if (hod && dept) {
            await prisma.department.update({
                where: { id: dept.id },
                data: { hodId: hod.id }
            });
            console.log(`✓ Set ${hod.fullName} as HOD of ${dept.name}`);
        }

        console.log('\n✅ Seed completed successfully!');
        console.log('\n📝 Test Credentials:');
        console.log('  Teacher:   teacher@test.com / password123');
        console.log('  HOD:       hod@test.com / password123');
        console.log('  Principal: principal@test.com / password123');
        console.log('  Admin:     admin@test.com / password123');

    } catch (error) {
        console.error('\n❌ Seed failed:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedTestUsers();
