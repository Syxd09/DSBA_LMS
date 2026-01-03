const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetDatabase() {
    try {
        console.log('🗑️  Starting database reset...\n');

        // Delete all data in the correct order (respecting foreign keys)
        console.log('Deleting all records...');

        await prisma.mark.deleteMany();
        console.log('✓ Marks deleted');

        await prisma.examQuestion.deleteMany();
        console.log('✓ Exam questions deleted');

        await prisma.exam.deleteMany();
        console.log('✓ Exams deleted');

        await prisma.coPoMapping.deleteMany();
        console.log('✓ CO-PO mappings deleted');

        await prisma.courseOutcome.deleteMany();
        console.log('✓ Course outcomes deleted');

        await prisma.programOutcome.deleteMany();
        console.log('✓ Program outcomes deleted');

        await prisma.enrollment.deleteMany();
        console.log('✓ Enrollments deleted');

        await prisma.teacherAssignment.deleteMany();
        console.log('✓ Teacher assignments deleted');

        await prisma.subject.deleteMany();
        console.log('✓ Subjects deleted');

        await prisma.cohort.deleteMany();
        console.log('✓ Cohorts deleted');

        await prisma.curriculumVersion.deleteMany();
        console.log('✓ Curriculum versions deleted');

        await prisma.program.deleteMany();
        console.log('✓ Programs deleted');

        await prisma.department.deleteMany();
        console.log('✓ Departments deleted');

        await prisma.user.deleteMany();
        console.log('✓ Users deleted');

        console.log('\n✅ All data cleared!\n');

        // Create principal user
        console.log('Creating principal user...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        const principal = await prisma.user.create({
            data: {
                email: 'syxdmatheen.9@gmail.com',
                fullName: 'System Principal',
                password: hashedPassword,
                role: 'PRINCIPAL'
            }
        });

        console.log('\n✅ Database reset complete!');
        console.log('\n📋 Login Credentials:');
        console.log('   Email: syxdmatheen.9@gmail.com');
        console.log('   Password: password123');
        console.log('   Role: PRINCIPAL\n');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
