const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function reset() {
    console.log('🗑️  Deleting all data...\n');

    // Delete in order (respecting foreign keys)
    const deletions = [
        prisma.mark.deleteMany(),
        prisma.examQuestion.deleteMany(),
        prisma.exam.deleteMany(),
        prisma.coPoMapping.deleteMany(),
        prisma.courseOutcome.deleteMany(),
        prisma.programOutcome.deleteMany(),
        prisma.enrollment.deleteMany(),
        prisma.teacherAssignment.deleteMany(),
        prisma.subject.deleteMany(),
        prisma.cohort.deleteMany(),
        prisma.curriculumVersion.deleteMany(),
        prisma.program.deleteMany(),
        prisma.department.deleteMany(),
        prisma.user.deleteMany(),
    ];

    for (const deletion of deletions) {
        await deletion;
    }

    console.log('✓ All data deleted\n');

    // Create principal
    const hash = await bcrypt.hash('password123', 10);

    const principal = await prisma.user.create({
        data: {
            email: 'syxdmatheen.9@gmail.com',
            fullName: 'System Principal',
            password: hash,
            role: 'PRINCIPAL'
        }
    });

    console.log('✅ Database reset complete!\n');
    console.log('📋 Login Credentials:');
    console.log('   Email: syxdmatheen.9@gmail.com');
    console.log('   Password: password123');
    console.log('   Role: PRINCIPAL\n');

    await prisma.$disconnect();
}

reset().catch(console.error);
