const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enrollments = await prisma.studentEnrollment.findMany({ include: { cohort: true, student: true }});
  console.log("Total Enrollments:", enrollments.length);
  if (enrollments.length > 0) {
    console.log("Sample Enrollment Cohort:", enrollments[0].cohort.name, enrollments[0].cohortId);
    console.log("Sample Student:", enrollments[0].student.fullName);
  }
  
  const rules = await prisma.gradingRule.findMany();
  console.log("Rules count:", rules.length);
  
  const cohorts = await prisma.academicCohort.findMany();
  console.log("Cohorts:", cohorts.map(c => ({ id: c.id, name: c.name })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
