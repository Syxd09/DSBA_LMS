const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubQuestions() {
    const exam = await prisma.exam.findFirst({
        include: {
            sections: {
                include: {
                    questions: {
                        include: {
                            subQuestions: true
                        }
                    }
                }
            }
        }
    });

    console.log('Exam Structure:');
    console.log('  Sections:', exam.sections.length);

    exam.sections.forEach(section => {
        console.log(`\n  Section: ${section.name}`);
        console.log(`    Questions: ${section.questions.length}`);

        section.questions.forEach((q, idx) => {
            console.log(`      Q${idx + 1}: maxMarks=${q.maxMarks}, subQuestions=${q.subQuestions.length}`);
        });
    });

    const totalSubQ = exam.sections.reduce((sum, s) =>
        sum + s.questions.reduce((qSum, q) => qSum + q.subQuestions.length, 0), 0);

    console.log('\n  Total SubQuestions:', totalSubQ);

    if (totalSubQ === 0) {
        console.log('\n⚠️  WARNING: No sub-questions found!');
        console.log('   The frontend expects sub-questions for marks entry.');
    }

    await prisma.$disconnect();
}

checkSubQuestions();
