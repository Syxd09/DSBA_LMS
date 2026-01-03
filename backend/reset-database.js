const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetDatabase() {
    console.log('Starting database reset...\n');

    try {
        // Delete in correct order
        await prisma.$transaction([
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
        ]);

        console.log('All data cleared!\n');

        // Create principal
        const hashedPassword = await bcrypt.hash('password123', 10);

        await prisma.user.create({
            data: {
                email: 'syxdmatheen.9@gmail.com',
                fullName: 'System Principal',
                password: hashedPassword,
                role: 'PRINCIPAL'
            }
        });

        console.log('Principal user created successfully!');
        console.log('\nLogin Credentials:');
        console.log('Email: syxdmatheen.9@gmail.com');
        console.log('Password: password123');
        console.log('Role: PRINCIPAL\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
