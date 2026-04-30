import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding standard grading rules...');

  const rules = [
    { grade: 'O', minPercentage: 90, maxPercentage: 100, gradePoint: 10.0 },
    { grade: 'S', minPercentage: 80, maxPercentage: 89.99, gradePoint: 9.0 },
    { grade: 'A+', minPercentage: 70, maxPercentage: 79.99, gradePoint: 8.0 },
    { grade: 'A', minPercentage: 60, maxPercentage: 69.99, gradePoint: 7.0 },
    { grade: 'B', minPercentage: 50, maxPercentage: 59.99, gradePoint: 6.0 },
    { grade: 'C', minPercentage: 40, maxPercentage: 49.99, gradePoint: 5.0 },
    { grade: 'F', minPercentage: 0, maxPercentage: 39.99, gradePoint: 0.0 },
  ];

  for (const rule of rules) {
    await prisma.gradingRule.upsert({
      where: { id: `rule-${rule.grade}` }, // Using deterministic IDs for upsert
      update: rule,
      create: {
        id: `rule-${rule.grade}`,
        ...rule
      }
    });
    console.log(`✅ Rule for grade ${rule.grade} added/updated.`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
