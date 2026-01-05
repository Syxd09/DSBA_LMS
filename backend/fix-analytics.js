const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignAndRecalculate() {
    console.log('🎯 FIXING CO-PO ANALYTICS\n');
    console.log('='.repeat(50) + '\n');

    // Find Data Structures exam
    const exam = await prisma.exam.findFirst({
        where: {
            subject: {
                name: { contains: 'data', mode: 'insensitive' }
            }
        },
        include: { subject: true }
    });

    if (!exam) {
        console.log('❌ Exam not found');
        await prisma.$disconnect();
        return;
    }

    console.log(`✅ Exam: ${exam.subject.name} (${exam.subject.code})`);
    console.log(`   ID: ${exam.id}\n`);

    // Get COs for this subject
    const cos = await prisma.courseOutcome.findMany({
        where: { subjectId: exam.subjectId },
        orderBy: { coNumber: 'asc' }
    });

    console.log(`📚 Course Outcomes: ${cos.length}`);
    if (cos.length === 0) {
        console.log('\n❌ ERROR: No COs exist for this subject!');
        console.log('   Create COs in "Course Outcomes (CO)" page first');
        await prisma.$disconnect();
        return;
    }

    cos.forEach(co => console.log(`   - ${co.code}: ${co.description}`));

    // Get all sub-questions
    const subQuestions = await prisma.subQuestion.findMany({
        where: {
            question: {
                section: {
                    examId: exam.id
                }
            }
        },
        orderBy: [
            { question: { section: { name: 'asc' } } },
            { question: { number: 'asc' } },
            { number: 'asc' }
        ]
    });

    console.log(`\n📊 Sub-questions: ${subQuestions.length}`);

    if (subQuestions.length === 0) {
        console.log('❌ No sub-questions found!');
        await prisma.$disconnect();
        return;
    }

    // Assign COs (round-robin distribution)
    console.log(`\n🔄 Assigning COs...\n`);

    for (let i = 0; i < subQuestions.length; i++) {
        const sq = subQuestions[i];
        const co = cos[i % cos.length]; // Distribute evenly

        await prisma.subQuestion.update({
            where: { id: sq.id },
            data: { coId: co.id }
        });

        console.log(`   ✅ ${sq.code || `Sub-Q ${i + 1}`} → ${co.code}`);
    }

    console.log(`\n✅ Assigned COs to ${subQuestions.length} sub-questions!\n`);
    console.log('='.repeat(50));
    console.log('\n🔄 Now recalculating attainment...\n');

    // Import calculation functions
    const { calculateCOAttainmentForExam } = require('./src/services/co-attainment.service');
    const { calculatePOAttainmentForSubject } = require('./src/services/po-attainment.service');

    try {
        await calculateCOAttainmentForExam(exam.id);
        console.log('✅ CO attainment calculated!');

        await calculatePOAttainmentForSubject(exam.subjectId, exam.cohortId);
        console.log('✅ PO attainment calculated!');

        // Show results
        const results = await prisma.cOAttainment.findMany({
            where: { subjectId: exam.subjectId },
            include: { co: true }
        });

        console.log(`\n📈 RESULTS (${results.length} COs):\n`);
        results.forEach(r => {
            const bar = '█'.repeat(Math.round(r.achievedPercent / 5));
            console.log(`   ${r.co.code}: ${r.achievedPercent.toFixed(1)}% ${bar}`);
            console.log(`          (${r.passCount}/${r.studentCount} students passed)`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('\n🎉 SUCCESS! Refresh your CO-PO Analytics page now!');
        console.log('\n' + '='.repeat(50) + '\n');

    } catch (error) {
        console.error('\n❌ Calculation failed:', error.message);
        console.error(error.stack);
    }

    await prisma.$disconnect();
}

assignAndRecalculate();
