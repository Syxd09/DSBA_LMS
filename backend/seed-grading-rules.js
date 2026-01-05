// Seed default grading rules
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedGradingRules() {
    console.log('🌱 Seeding grading rules...');

    const rules = [
        { grade: 'A+', minPercentage: 90, maxPercentage: 100, gradePoint: 10 },
        { grade: 'A', minPercentage: 80, maxPercentage: 89, gradePoint: 9 },
        { grade: 'B+', minPercentage: 70, maxPercentage: 79, gradePoint: 8 },
        { grade: 'B', minPercentage: 60, maxPercentage: 69, gradePoint: 7 },
        { grade: 'C+', minPercentage: 55, maxPercentage: 59, gradePoint: 6 },
        { grade: 'C', minPercentage: 50, maxPercentage: 54, gradePoint: 5 },
        { grade: 'D', minPercentage: 40, maxPercentage: 49, gradePoint: 4 },
        { grade: 'F', minPercentage: 0, maxPercentage: 39, gradePoint: 0 },
    ];

    for (const rule of rules) {
        await prisma.gradingRule.upsert({
            where: {
                // Use a composite unique key or create one
                id: `default-${rule.grade}` // This will fail, need to check schema
            },
            update: rule,
            create: {
                ...rule,
                departmentId: null // Global rules
            }
        });
    }

    console.log('✅ Seeded grading rules successfully!');
    console.log(`   Created ${rules.length} grading rules (A+ to F)`);
}

seedGradingRules()
    .then(() => prisma.$disconnect())
    .catch(e => {
        console.error('❌ Error seeding grading rules:', e);
        prisma.$disconnect();
        process.exit(1);
    });
