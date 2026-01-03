const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedData() {
    try {
        console.log('🌱 Starting basic data seeding...\n');

        // 1. Create Principal User
        const email = 'syxdmatheen.9@gmail.com';
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (!existingUser) {
            console.log('Creating Principal user...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            await prisma.user.create({
                data: {
                    email,
                    fullName: 'System Principal',
                    password: hashedPassword,
                    role: 'PRINCIPAL'
                }
            });
            console.log('✅ Principal user created (syxdmatheen.9@gmail.com / password123)');
        } else {
            console.log('ℹ️  Principal user already exists, resetting password...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword }
            });
            console.log('✅ Principal password reset to password123');
        }

        // 2. Create Department
        console.log('Creating Department...');
        const dept = await prisma.department.upsert({
            where: { code: 'CSE' },
            update: {},
            create: {
                name: 'Computer Science Engineering',
                code: 'CSE',
                hodId: existingUser ? existingUser.id : undefined // Ideally separate HOD user
            }
        });
        console.log('✅ Department CSE created/found');

        // 3. Create Program
        console.log('Creating Program...');
        const program = await prisma.program.upsert({
            where: { code: 'BCA' }, // Assuming code is unique if defined as such, otherwise create
            update: {},
            create: {
                name: 'Bachelor of Computer Applications',
                code: 'BCA',
                departmentId: dept.id
            }
        });
        console.log('✅ Program BCA created');

        // 4. Create Cohort
        console.log('Creating Cohort...');
        const cohort = await prisma.cohort.create({
            data: {
                name: 'Class of 2025',
                year: 2025,
                programId: program.id,
                currentSemester: 1
            }
        });
        console.log('✅ Cohort 2025 created');

        // 5. Create Subject
        console.log('Creating Subject...');
        const subject = await prisma.subject.create({
            data: {
                name: 'Advanced Mathematics',
                code: 'MATH101',
                departmentId: dept.id,
                semester: 1,
                credits: 4
            }
        });
        console.log('✅ Subject MATH101 created');

        console.log('\n🎉 Seeding complete! You can now log in.');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedData();
