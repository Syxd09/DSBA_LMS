const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExam() {
    const exam = await prisma.exam.findFirst({
        include: {
            subject: true,
            cohort: true
        }
    });

    console.log('Exam details:');
    console.log('  ID:', exam.id);
    console.log('  Type:', exam.examType);
    console.log('  Teacher ID:', exam.teacherId);
    console.log('  Subject:', exam.subject.name);
    console.log('  Cohort:', exam.cohort.name);

    // Check if teacher exists
    if (exam.teacherId) {
        const teacher = await prisma.user.findUnique({
            where: { id: exam.teacherId }
        });
        console.log('  Teacher:', teacher?.fullName, '(', teacher?.email, ')');
    }

    // Check logged-in user
    const principal = await prisma.user.findUnique({
        where: { email: 'syxdmatheen.9@gmail.com' }
    });
    console.log('\nLogged-in user:');
    console.log('  Email:', principal?.email);
    console.log('  Role:', principal?.role);
    console.log('  ID:', principal?.id);

    await prisma.$disconnect();
}

checkExam();
