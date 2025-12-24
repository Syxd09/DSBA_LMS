
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Promoting students of Cohort 2024-2027 to Sem 2...');

    // Find the cohort (using ID from previous debug output if possible, or name)
    const cohort = await prisma.cohort.findFirst({
        where: { name: { contains: '2027' } }
    });

    if (!cohort) {
        console.log('Cohort not found');
        return;
    }

    console.log(`Cohort ID: ${cohort.id}`);

    const result = await prisma.studentEnrollment.updateMany({
        where: { cohortId: cohort.id, semester: 1 },
        data: { semester: 2 }
    });

    console.log(`Updated ${result.count} students to Semester 2.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
