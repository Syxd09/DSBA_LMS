const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignCOs() {
    console.log('🔍 Finding CS23 exam sub-questions...\n');

    // Get the Data Structures exam with all structure
    const exam = await prisma.exam.findFirst({
        where: {
            subject: { code: 'CS23' },
            status: 'PUBLISHED'
        },
        include: {
            subject: true,
            sections: {
                include: {
                    questions: {
                        include: {
                            subQuestions: {
                                include: { co: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!exam) {
        console.log('❌ Exam not found!');
        await prisma.$disconnect();
        return;
    }

    console.log(`✅ Found: ${exam.subject.name}`);

    // Get all COs for this subject
    const cos = await prisma.courseOutcome.findMany({
        where: { subjectId: exam.subjectId },
        orderBy: { coNumber: 'asc' }
    });

    console.log(`📚 Available COs: ${cos.length}`);
    cos.forEach(co => console.log(`   - ${co.code}: ${co.description}`));

    if (cos.length === 0) {
        console.log('\n❌ No COs defined for this subject!');
        console.log('   Create COs first in Course Outcomes page.');
        await prisma.$disconnect();
        return;
    }

    // Count sub-questions
    let totalSubQuestions = 0;
    let withCO = 0;

    exam.sections.forEach(s => s.questions.forEach(q => {
        totalSubQuestions += q.subQuestions.length;
        q.subQuestions.forEach(sq => {
            if (sq.coId) withCO++;
        });
    }));

    console.log(`\n📊 Sub-questions: ${totalSubQuestions} total, ${withCO} with CO`);

    if (totalSubQuestions === 0) {
        console.log('\n❌ No sub-questions found!');
        console.log('   The exam structure might not be saved properly.');
        await prisma.$disconnect();
        return;
    }

    // Auto-assign COs to sub-questions (round-robin)
    console.log(`\n🔄 Auto-assigning COs...`);

    let coIndex = 0;
    let updated = 0;

    for (const section of exam.sections) {
        for (const question of section.questions) {
            for (const subQuestion of question.subQuestions) {
                if (!subQuestion.coId) {
                    const co = cos[coIndex % cos.length];
                    await prisma.subQuestion.update({
                        where: { id: subQuestion.id },
                        data: { coId: co.id }
                    });
                    console.log(`   ✅ ${subQuestion.code} → ${co.code}`);
                    updated++;
                    coIndex++;
                }
            }
        }
    }

    console.log(`\n✅ Updated ${updated} sub-questions with CO mappings!`);
    console.log(`\nNow run the recalculation to see results in analytics!`);

    await prisma.$disconnect();
}

assignCOs().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
