const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function reset() {
    console.log('Resetting database...\n');

    // Truncate all tables
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Mark" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ExamQuestion" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Exam" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "CoPoMapping" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "CourseOutcome" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ProgramOutcome" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Enrollment" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "TeacherAssignment" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Subject" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Cohort" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "CurriculumVersion" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Program" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Department" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');

    console.log('✓ All tables cleared\n');

    // Create principal
    const hash = await bcrypt.hash('password123', 10);

    await prisma.user.create({
        data: {
            email: 'syxdmatheen.9@gmail.com',
            fullName: 'System Principal',
            password: hash,
            role: 'PRINCIPAL'
        }
    });

    console.log('✅ Database reset complete!\n');
    console.log('📋 Login:');
    console.log('   Email: syxdmatheen.9@gmail.com');
    console.log('   Password: password123');
    console.log('   Role: PRINCIPAL\n');

    await prisma.$disconnect();
}

reset().catch(e => {
    console.error(e);
    process.exit(1);
});
