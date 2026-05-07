import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCOData() {
  const allCohorts = await prisma.cohort.findMany();
  const targetCohort = allCohorts[0];

  const coAttainments = await prisma.cOAttainment.findMany({
    where: { cohortId: targetCohort.id },
    take: 5
  });
  console.log("Cohort CO Attainments:", JSON.stringify(coAttainments, null, 2));

  const poAttainments = await prisma.pOAttainment.findMany({
    where: { cohortId: targetCohort.id },
    take: 5
  });
  console.log("Cohort PO Attainments:", JSON.stringify(poAttainments, null, 2));
}

checkCOData().catch(console.error).finally(() => prisma.$disconnect());
