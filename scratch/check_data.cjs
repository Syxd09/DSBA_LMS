const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const cohort = await prisma.cohort.findFirst();
  if (!cohort) {
    console.log("No cohorts found");
    return;
  }
  console.log(`Checking data for cohort: ${cohort.name} (${cohort.id})`);

  const marks = await prisma.finalMark.findMany({
    where: { cohortId: cohort.id },
    take: 5
  });
  console.log("Sample Marks:", JSON.stringify(marks, null, 2));

  const feedbacks = await prisma.teacherStudentFeedback.findMany({
    where: { cohortId: cohort.id },
    take: 5
  });
  console.log("Sample Feedbacks:", JSON.stringify(feedbacks, null, 2));

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { cohortId: cohort.id },
    include: { student: true },
    take: 5
  });
  console.log("Sample Enrollments:", JSON.stringify(enrollments, null, 2));
}

checkData().finally(() => prisma.$disconnect());
