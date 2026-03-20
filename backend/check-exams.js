const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.exam.findMany({
    include: {
      subject: true,
      cohort: true,
      studentMarks: true
    }
  });
  console.log("Total exams in DB:", exams.length);
  for (const exam of exams) {
    console.log(`Exam: ${exam.title} (${exam.examType}), Subject: ${exam.subject?.name}, Cohort: ${exam.cohort?.name}, Status: ${exam.status}, Marks Count: ${exam.studentMarks?.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
