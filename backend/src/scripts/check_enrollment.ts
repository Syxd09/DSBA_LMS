import prisma from '../services/db';

async function main() {
    const e = await prisma.studentEnrollment.findFirst({
        where: { cohortId: 'f47e7327-d451-4c18-aa22-79d2edecfade' }
    });
    console.log(JSON.stringify(e, null, 2));
}

main().finally(() => prisma.$disconnect());
