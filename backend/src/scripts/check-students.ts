
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking enrollments for BCA 2023-2026...');

    // Find the cohort first to be sure
    const cohort = await prisma.cohort.findFirst({
        where: {
            name: { contains: '2023-2026' },
            program: { code: { contains: 'BCA' } }
        },
        include: { program: true }
    });

    if (!cohort) {
        console.log('Cohort not found');
        return;
    }
    console.log(`Found Cohort: ${cohort.name} (ID: ${cohort.id})`);

    // Count enrollments by semester
    const enrollments = await prisma.studentEnrollment.findMany({
        where: { cohortId: cohort.id },
        select: { semester: true, student: { select: { fullName: true } } }
    });

    console.log(`Total Enrollments: ${enrollments.length}`);
    const bySem: any = {};
    enrollments.forEach(e => {
        bySem[e.semester] = (bySem[e.semester] || 0) + 1;
    });
    console.log('Enrollments by Semester:', bySem);

    if (enrollments.length > 0) {
        console.log('Sample Student:', enrollments[0]);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
