const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showExamStructure() {
    const exams = await prisma.exam.findMany({
        include: {
            sections: {
                include: {
                    questions: true
                },
                orderBy: { sequence: 'asc' }
            }
        }
    });

    console.log(`Found ${exams.length} exam(s)\n`);

    for (const exam of exams) {
        console.log(`Exam: ${exam.examType}`);
        console.log(`  Sections: ${exam.sections.length}`);
        console.log(`  Total Questions: ${exam.sections.reduce((s, sec) => s + sec.questions.length, 0)}`);
        console.log(`  Section details:`);
        exam.sections.forEach(sec => {
            console.log(`    - ${sec.name}: ${sec.questions.length} questions`);
        });
        console.log();
    }

    await prisma.$disconnect();
}

showExamStructure();
