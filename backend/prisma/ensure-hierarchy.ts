
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Get Department
    const department = await prisma.department.findUnique({
        where: { name: 'BCA' },
        include: { programs: { include: { cohorts: true } } }
    });

    if (!department) {
        console.error('Department BCA not found!');
        return;
    }

    console.log('Department:', department.name);

    // 2. Check/Create Program
    let program = department.programs[0];
    if (!program) {
        console.log('No Program found. Creating default Program "BCA Core"...');
        program = await prisma.program.create({
            data: {
                name: 'Bachelor of Computer Applications',
                code: 'BCA-CORE',
                departmentId: department.id,
                durationYears: 3
            }
        });
        console.log('Created Program:', program.name);
    } else {
        console.log('Found Program:', program.name);
    }

    // 3. Check/Create Cohort
    // Fetch cohorts again if we just created the program (though program var has none if we just created it)
    const cohorts = await prisma.cohort.findMany({ where: { programId: program.id } });

    if (cohorts.length === 0) {
        console.log('No Cohorts found. Creating default Cohort "2024-2027"...');
        const cohort = await prisma.cohort.create({
            data: {
                programId: program.id,
                name: '2024-2027',
                year: 2024,
                currentSemester: 1
            }
        });
        console.log('Created Cohort:', cohort.name);
    } else {
        console.log('Found Cohorts:', cohorts.map(c => c.name).join(', '));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
