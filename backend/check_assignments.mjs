import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAssignments() {
  const allCohorts = await prisma.cohort.findMany();
  const targetCohort = allCohorts[0];
  console.log(`Checking assignments for cohort: ${targetCohort.name} (${targetCohort.id})`);

  const assignments = await prisma.teacherAssignment.findMany({
    where: { cohortId: targetCohort.id },
    include: { teacher: { select: { fullName: true } }, subject: { select: { name: true } } }
  });
  console.log("All Assignments for this Cohort:", JSON.stringify(assignments, null, 2));
}

checkAssignments().catch(console.error).finally(() => prisma.$disconnect());
