const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllExams() {
    const exams = await prisma.exam.findMany({
        include: {
            subject: true,
            cohort: true,
            sections: {
                include: {
                    questions: true
                }
            }
        }
    });

    console.log(`Total exams: ${exams.length}\n`);

    exams.forEach((exam, idx) => {
        const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
        console.log(`${idx + 1}. ${exam.subject.name} (${exam.examType})`);
        console.log(`   Cohort: ${exam.cohort.name}`);
        console.log(`   Sections: ${exam.sections.length}, Questions: ${totalQuestions}`);
        console.log(`   Status: ${exam.status}`);
        console.log(`   ID: ${exam.id}\n`);
    });

    await prisma.$disconnect();
}

listAllExams();
