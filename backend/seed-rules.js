const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rules = [
    { grade: 'O', minPercentage: 90, maxPercentage: 100, gradePoint: 10.0 },
    { grade: 'A+', minPercentage: 80, maxPercentage: 89.99, gradePoint: 9.0 },
    { grade: 'A', minPercentage: 70, maxPercentage: 79.99, gradePoint: 8.0 },
    { grade: 'B+', minPercentage: 60, maxPercentage: 69.99, gradePoint: 7.0 },
    { grade: 'B', minPercentage: 50, maxPercentage: 59.99, gradePoint: 6.0 },
    { grade: 'C', minPercentage: 40, maxPercentage: 49.99, gradePoint: 5.0 },
    { grade: 'F', minPercentage: 0, maxPercentage: 39.99, gradePoint: 0.0 }
  ];

  console.log("Seeding default grading rules...");
  for (const rule of rules) {
    await prisma.gradingRule.create({ data: rule });
  }
  console.log("Seeding complete. Created", rules.length, "rules.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
