const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.exam.updateMany({
    data: { status: 'PUBLISHED' }
  });
  console.log(`Updated ${result.count} exams to PUBLISHED status.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
