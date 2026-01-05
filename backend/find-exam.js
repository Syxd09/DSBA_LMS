const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findExam() {
    console.log('🔍 Searching for Data Structures exam...\n');

    // Find all exams with "data" or "structure" in subject name
    const exams = await prisma.exam.findMany({
        include: {
            subject: true
        }
    });

    console.log(`Found ${exams.length} total exams:\n`);

    exams.forEach(exam => {
        console.log(`📝 ${exam.subject.name} (${exam.subject.code})`);
        console.log(`   Status: ${exam.status}`);
        console.log(`   Exam Type: ${exam.examType}`);
        console.log(`   Exam ID: ${exam.id}`);
        console.log('');
    });

    // Find the one with "data" in name
    const dsExam = exams.find(e =>
        e.subject.name.toLowerCase().includes('data') ||
        e.subject.name.toLowerCase().includes('structure')
    );

    if (dsExam) {
        console.log(`\n✅ Found Data Structures exam!`);
        console.log(`   Subject Code: ${dsExam.subject.code}`);
        console.log(`   Subject ID: ${dsExam.subjectId}`);
        console.log(`   Status: ${dsExam.status}`);

        // Get sub-questions
        const subQuestions = await prisma.subQuestion.findMany({
            where: {
                question: {
                    section: {
                        examId: dsExam.id
                    }
                }
            },
            include: {
                question: {
                    include: {
                        section: true
                    }
                },
                co: true
            }
        });

        console.log(`\n📊 Sub-questions: ${subQuestions.length}`);
        console.log(`   With CO: ${subQuestions.filter(sq => sq.coId).length}`);
        console.log(`   Without CO: ${subQuestions.filter(sq => !sq.coId).length}`);

        if (subQuestions.length > 0) {
            console.log(`\nSub-question details:`);
            subQuestions.forEach(sq => {
                console.log(`   ${sq.code}: CO = ${sq.co ? sq.co.code : 'NOT ASSIGNED'}`);
            });
        }
    }

    await prisma.$disconnect();
}

findExam().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
