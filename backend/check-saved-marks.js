const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSavedMarks() {
    const examId = '5fb99d2e-4263-4274-8f26-4406cd6d8fb9';

    const marks = await prisma.studentMark.findMany({
        where: { examId },
        include: {
            student: { select: { fullName: true } },
            subQuestion: { select: { label: true } }
        },
        take: 10
    });

    console.log(`Found ${marks.length} marks in database for exam ${examId.substring(0, 8)}`);

    if (marks.length > 0) {
        console.log('\nFirst 5 marks:');
        marks.slice(0, 5).forEach(m => {
            console.log(`  ${m.student.fullName} - Q${m.subQuestion.label}: ${m.marks}`);
        });
    } else {
        console.log('❌ NO MARKS FOUND IN DATABASE!');
    }

    await prisma.$disconnect();
}

checkSavedMarks();
