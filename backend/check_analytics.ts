
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
    console.log('Checking Analytics Data Integrity...');

    const studentMarksCount = await prisma.studentMark.count();
    console.log(`Total Student Marks (Raw Source): ${studentMarksCount}`);

    const marksComputedCount = await prisma.marksComputed.count();
    console.log(`Total Marks Computed (Derived): ${marksComputedCount}`);

    const coAttainmentCount = await prisma.cOAttainment.count();
    console.log(`Total CO Attainment (Derived): ${coAttainmentCount}`);

    if (marksComputedCount === 0 && studentMarksCount > 0) {
        console.log('ISSUE FOUND: Raw marks exist but Computed Marks are empty. Analytics will be empty/wrong.');
    }

    if (coAttainmentCount === 0 && studentMarksCount > 0) {
        console.log('ISSUE FOUND: Raw marks exist but CO Attainment is empty. Analytics will be wrong.');
    }

    // Sample check
    if (marksComputedCount > 0) {
        const sample = await prisma.marksComputed.findFirst();
        console.log('Sample Computed Mark:', sample);
    }
}

checkData()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
