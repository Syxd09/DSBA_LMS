const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
    const exam = await prisma.exam.findFirst();
    console.log('Current Exam ID:', exam?.id);
    await prisma.$disconnect();
})();
