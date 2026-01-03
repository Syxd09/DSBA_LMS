const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');

const prisma = new PrismaClient();
const logFile = 'reset-log.txt';

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function reset() {
    // Clear log file
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

    log('Starting database reset...');

    try {
        log('Deleting marks...');
        await prisma.mark.deleteMany({});

        log('Deleting exam questions...');
        await prisma.examQuestion.deleteMany({});

        log('Deleting exams...');
        await prisma.exam.deleteMany({});

        log('Deleting CO-PO mappings...');
        await prisma.coPoMapping.deleteMany({});

        log('Deleting course outcomes...');
        await prisma.courseOutcome.deleteMany({});

        log('Deleting program outcomes...');
        await prisma.programOutcome.deleteMany({});

        log('Deleting enrollments...');
        await prisma.enrollment.deleteMany({});

        log('Deleting teacher assignments...');
        await prisma.teacherAssignment.deleteMany({});

        log('Deleting subjects...');
        await prisma.subject.deleteMany({});

        log('Deleting cohorts...');
        await prisma.cohort.deleteMany({});

        log('Deleting curriculum versions...');
        await prisma.curriculumVersion.deleteMany({});

        log('Deleting programs...');
        await prisma.program.deleteMany({});

        log('Deleting departments...');
        await prisma.department.deleteMany({});

        log('Deleting users...');
        await prisma.user.deleteMany({});

        log('\n✅ All data deleted!\n');

        // Create principal
        log('Creating principal user...');
        const hash = await bcrypt.hash('password123', 10);

        await prisma.user.create({
            data: {
                email: 'syxdmatheen.9@gmail.com',
                fullName: 'System Principal',
                password: hash,
                role: 'PRINCIPAL'
            }
        });

        log('\n✅ DATABASE RESET COMPLETE!');
        log('\n📋 Login Credentials:');
        log('   Email: syxdmatheen.9@gmail.com');
        log('   Password: password123');
        log('   Role: PRINCIPAL');

    } catch (error) {
        log('\n❌ ERROR: ' + error.message);
        log(error.stack);
    } finally {
        await prisma.$disconnect();
        log('\nCheck reset-log.txt for full output');
    }
}

reset();
