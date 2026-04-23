const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const examId = 'ec1830d9-9f2e-4cee-b48f-5bd5e8d75693';
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { cohortId: true, subjectId: true }
  });

  if (!exam) {
    console.log('Exam not found');
    return;
  }

  console.log(`Exam ${examId} belongs to Cohort: ${exam.cohortId}, Subject: ${exam.subjectId}`);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { cohortId: exam.cohortId },
    include: { student: true }
  });

  console.log(`Found ${enrollments.length} enrollments for this cohort.`);
  enrollments.forEach(e => {
    console.log(`- Student: ${e.student.fullName} (${e.student.registrationNumber}), Status: ${e.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
