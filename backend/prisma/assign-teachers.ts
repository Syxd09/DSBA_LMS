
import { PrismaClient, BloomLevel } from '@prisma/client';

const prisma = new PrismaClient();

// Sample subjects mapping
const SUBJECTS_MAP: Record<string, Record<number, { name: string, code: string }[]>> = {
    'BCA': {
        1: [{ name: 'Mathematics I', code: 'BCA101' }, { name: 'Programming in C', code: 'BCA102' }, { name: 'Digital Electronics', code: 'BCA103' }],
        3: [{ name: 'Data Structures', code: 'BCA301' }, { name: 'Java Programming', code: 'BCA302' }, { name: 'DBMS', code: 'BCA303' }],
        5: [{ name: 'Web Programming', code: 'BCA501' }, { name: 'Software Engineering', code: 'BCA502' }, { name: 'Computer Networks', code: 'BCA503' }]
    },
    'BBA': {
        1: [{ name: 'Principles of Management', code: 'BBA101' }, { name: 'Business Economics', code: 'BBA102' }, { name: 'Accounting I', code: 'BBA103' }],
        3: [{ name: 'HR Management', code: 'BBA301' }, { name: 'Marketing Management', code: 'BBA302' }, { name: 'Business Law', code: 'BBA303' }],
        5: [{ name: 'Entrepreneurship', code: 'BBA501' }, { name: 'Financial Management', code: 'BBA502' }, { name: 'Taxation', code: 'BBA503' }]
    },
    'Bcom': {
        1: [{ name: 'Financial Accounting', code: 'BCM101' }, { name: 'Business Org', code: 'BCM102' }, { name: 'English', code: 'BCM103' }],
        3: [{ name: 'Corporate Acct', code: 'BCM301' }, { name: 'Business Stat', code: 'BCM302' }, { name: 'Banking', code: 'BCM303' }],
        5: [{ name: 'Cost Accounting', code: 'BCM501' }, { name: 'Income Tax', code: 'BCM502' }, { name: 'Auditing', code: 'BCM503' }]
    }
};

async function main() {
    console.log('Starting Teacher Assignments...');

    // Get Departments
    const departments = await prisma.department.findMany({
        include: { programs: true, users: { where: { role: 'TEACHER' } } }
    });

    for (const dept of departments) {
        if (!SUBJECTS_MAP[dept.name]) {
            console.log(`Skipping unknown department map: ${dept.name}`);
            continue;
        }

        console.log(`Processing ${dept.name}...`);

        // 1. Get/Create Program & Curriculum
        // Assuming 1 program per dept from previous seed
        const program = dept.programs[0];
        if (!program) {
            console.log('No program found!');
            continue;
        }

        // Create Curriculum Version
        const curriculum = await prisma.curriculumVersion.upsert({
            where: { id: `curric-${program.id}` }, // Fixed ID for simplicity/upsert
            update: {},
            create: {
                id: `curric-${program.id}`,
                programId: program.id,
                versionName: '2023 Regulation',
                effectiveFrom: 2023
            }
        });

        const teachers = dept.users;
        if (teachers.length === 0) {
            console.log('No teachers found!');
            continue;
        }

        // 2. Process Semesters 1, 3, 5
        for (const sem of [1, 3, 5]) {
            const subjectList = SUBJECTS_MAP[dept.name][sem];
            const cohortYear = sem === 1 ? 2024 : sem === 3 ? 2023 : 2022;

            // Find Cohort
            const cohort = await prisma.cohort.findFirst({
                where: { programId: program.id, year: cohortYear }
            });

            if (!cohort) {
                console.log(`Cohort for year ${cohortYear} not found.`);
                continue;
            }

            // Create Subjects and Assign Teachers
            // We distribute subjects round-robin among available teachers
            // Offset starting teacher by semester index to ensure rotation
            // Sem 1 -> Start 0, Sem 3 -> Start 1, Sem 5 -> Start 2
            let teacherIndex = (Math.floor(sem / 2)) % teachers.length;

            for (const subData of subjectList) {
                // Upsert Subject
                const subject = await prisma.subject.upsert({
                    where: { code: subData.code },
                    update: {},
                    create: {
                        name: subData.name,
                        code: subData.code,
                        semester: sem,
                        curriculumVersionId: curriculum.id,
                        credits: 3
                    }
                });

                // Assign Teacher
                const teacher = teachers[teacherIndex % teachers.length];

                // Create Assignment
                await prisma.teacherAssignment.upsert({
                    where: {
                        teacherId_subjectId_cohortId: {
                            teacherId: teacher.id,
                            subjectId: subject.id,
                            cohortId: cohort.id
                        }
                    },
                    update: {},
                    create: {
                        teacherId: teacher.id,
                        subjectId: subject.id,
                        cohortId: cohort.id,
                        departmentId: dept.id,
                        semester: sem,
                        academicYear: '2024-2025' // Keeping simple
                    }
                });
                console.log(`  Assigned ${teacher.fullName} to ${subject.name} (${cohort.name})`);

                // Create some COs for the subject so data isn't empty in other views
                for (let co = 1; co <= 5; co++) {
                    await prisma.courseOutcome.upsert({
                        where: { subjectId_coNumber: { subjectId: subject.id, coNumber: co } },
                        update: {},
                        create: {
                            subjectId: subject.id,
                            coNumber: co,
                            description: `Understand the concepts of ${subData.name} - CO${co}`,
                            bloomLevel: Object.values(BloomLevel)[co % 6]
                        }
                    });
                }

                teacherIndex++;
            }
        }
    }
    console.log('Assignments complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
