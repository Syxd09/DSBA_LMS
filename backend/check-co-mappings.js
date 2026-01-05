const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCOmappings() {
    console.log('🔍 Checking Data Structures (CS23) exam structure...\n');

    // Find the exam
    const exam = await prisma.exam.findFirst({
        where: {
            status: 'PUBLISHED',
            subject: { code: 'CS23' }
        },
        include: {
            subject: true,
            sections: {
                include: {
                    questions: {
                        include: {
                            subQuestions: {
                                include: {
                                    co: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!exam) {
        console.log('❌ No published CS23 exam found!');
        await prisma.$disconnect();
        return;
    }

    console.log(`✅ Found: ${exam.subject.name} (${exam.subject.code})`);
    console.log(`   Exam ID: ${exam.id}\n`);

    // Check sections and questions
    console.log(`📋 Exam Structure:`);
    console.log(`   Sections: ${exam.sections.length}`);

    let totalQuestions = 0;
    let totalSubQuestions = 0;
    let subQuestionsWithCO = 0;

    exam.sections.forEach(section => {
        totalQuestions += section.questions.length;
        section.questions.forEach(q => {
            totalSubQuestions += q.subQuestions.length;
            q.subQuestions.forEach(sq => {
                if (sq.coId) subQuestionsWithCO++;
            });
        });
    });

    console.log(`   Questions: ${totalQuestions}`);
    console.log(`   Sub-questions: ${totalSubQuestions}`);
    console.log(`   Sub-questions with CO mapping: ${subQuestionsWithCO}\n`);

    if (subQuestionsWithCO === 0) {
        console.log('❌ PROBLEM FOUND: No CO mappings on sub-questions!');
        console.log('   This is why attainment shows 0%.');
        console.log('\n💡 Solution: You need to:');
        console.log('   1. Go to Exam Structure Builder');
        console.log('   2. Assign CO to each sub-question');
        console.log('   3. Save the structure');
        console.log('   4. Then recalculate attainment');
    } else {
        console.log('✅ CO mappings exist!');
        console.log('\nCO breakdown:');
        const coMap = new Map();
        exam.sections.forEach(s => s.questions.forEach(q => q.subQuestions.forEach(sq => {
            if (sq.co) {
                const count = coMap.get(sq.co.code) || 0;
                coMap.set(sq.co.code, count + 1);
            }
        })));
        coMap.forEach((count, code) => {
            console.log(`   ${code}: ${count} sub-questions`);
        });

        // Check student marks
        const marksCount = await prisma.studentMark.count({
            where: { examId: exam.id }
        });
        console.log(`\n📊 Student marks: ${marksCount} records`);

        if (marksCount > 0) {
            console.log('\n✅ Everything looks good! Ready for recalculation.');
            console.log(`\nRun this command to trigger calculation:`);
            console.log(`curl -X POST http://localhost:3000/api/exams/${exam.id}/recalculate -H "Authorization: Bearer YOUR_TOKEN"`);
        }
    }

    await prisma.$disconnect();
}

checkCOmappings().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
