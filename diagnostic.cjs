const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC START ---');
    
    // 1. Find subject BCA105
    const subject = await prisma.subject.findFirst({
        where: { code: 'BCA105' }
    });
    
    if (!subject) {
        console.log('❌ Subject BCA105 not found!');
        return;
    }
    console.log(`✅ Subject: ${subject.name} (ID: ${subject.id})`);
    
    // 2. Find Course Outcomes for this subject
    const cos = await prisma.courseOutcome.findMany({
        where: { subjectId: subject.id }
    });
    console.log('\n--- COURSE OUTCOMES IN DB ---');
    cos.forEach(co => {
        console.log(`CO${co.coNumber}: ${co.description} | Target: ${co.targetPercent}%`);
    });
    
    // 3. Find CO Attainment records in DB
    const attainments = await prisma.cOAttainment.findMany({
        where: { subjectId: subject.id }
    });
    console.log('\n--- CO ATTAINMENTS IN DB ---');
    attainments.forEach(att => {
        console.log(`ID: ${att.id} | CO ID: ${att.coId} | Target: ${att.targetPercent}% | Achieved: ${att.achievedPercent}% | Status: ${att.status}`);
    });
    
    // 4. Find Exams for this subject
    const exams = await prisma.exam.findMany({
        where: { subjectId: subject.id }
    });
    console.log('\n--- EXAMS IN DB ---');
    exams.forEach(ex => {
        console.log(`ID: ${ex.id} | Type: ${ex.examType} | Status: ${ex.status} | Cohort ID: ${ex.cohortId} | Semester: ${ex.semester}`);
    });
    
    console.log('\n--- DIAGNOSTIC END ---');
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
