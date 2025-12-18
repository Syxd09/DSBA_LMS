
import { PrismaClient, BloomLevel } from '@prisma/client';

const prisma = new PrismaClient();

const SUBJECTS_INT = {
    'BCA': [
        { name: 'Mathematics II', code: 'BCA201' }, { name: 'Adv C Programming', code: 'BCA202' }, { name: 'Digital Arch', code: 'BCA203' }
    ],
    'BBA': [
        { name: 'Org Behavior', code: 'BBA201' }, { name: 'Macro Economics', code: 'BBA202' }, { name: 'Accounting II', code: 'BBA203' }
    ],
    'Bcom': [
        { name: 'Corp Law', code: 'BCM201' }, { name: 'Marketing', code: 'BCM202' }, { name: 'Hindi/Kannada', code: 'BCM203' }
    ]
};

async function main() {
    console.log('Fixing demo data to Semesters 1, 2, 3...');

    const departments = await prisma.department.findMany({ include: { programs: true, users: { where: { role: 'TEACHER' } } } });

    for (const dept of departments) {
        if (!dept.programs[0]) continue;
        const programId = dept.programs[0].id;
        const teachers = dept.users;

        // 1. Update Cohorts and Enrollments to be Sem 1, 2, 3
        // We will map:
        // 2024 (Sem 1) -> Keep as Sem 1
        // 2023 (Sem 3) -> Change to Sem 2 (Year 2023)
        // 2022 (Sem 5) -> Change to Sem 3 (Year 2022)

        const cohortUpdates = [
            { year: 2024, newSem: 1 },
            { year: 2023, newSem: 2 },
            { year: 2022, newSem: 3 }
        ];

        for (const update of cohortUpdates) {
            const cohort = await prisma.cohort.findFirst({
                where: { programId, year: update.year }
            });

            if (cohort) {
                console.log(`Updating Cohort ${cohort.name} to Semester ${update.newSem}`);
                // Update Cohort
                await prisma.cohort.update({
                    where: { id: cohort.id },
                    data: { currentSemester: update.newSem }
                });

                // Update Enrollments
                await prisma.studentEnrollment.updateMany({
                    where: { cohortId: cohort.id },
                    data: { semester: update.newSem }
                });

                // Process Subjects/Assignments for this Semester
                // We need to ensure Subjects exist for this new semester
                // For Sem 1 (exists), Sem 3 (exists), Sem 2 (Need to create!)

                let subjectList: { name: string, code: string }[] = [];

                if (update.newSem === 2) {
                    // Create Sem 2 subjects
                    subjectList = SUBJECTS_INT[dept.name as keyof typeof SUBJECTS_INT] || [];
                } else if (update.newSem === 1 || update.newSem === 3) {
                    // Already created, but we need to ensure assignments match the logic
                    // Actually, if we just run assignment logic again updates/creates will handle it
                    // For brevity, let's just handle Sem 2 creation here specifically
                }

                if (subjectList.length > 0) {
                    // Get Curriculum
                    const curriculum = await prisma.curriculumVersion.findFirst({ where: { programId } });

                    let teacherIndex = (Math.floor(update.newSem / 2)) % teachers.length;

                    for (const subData of subjectList) {
                        // Upsert Subject
                        const subject = await prisma.subject.upsert({
                            where: { code: subData.code },
                            update: { semester: update.newSem },
                            create: {
                                name: subData.name,
                                code: subData.code,
                                semester: update.newSem,
                                curriculumVersionId: curriculum!.id,
                                credits: 3
                            }
                        });

                        // Assign Teacher
                        const teacher = teachers[teacherIndex % teachers.length];
                        await prisma.teacherAssignment.upsert({
                            where: {
                                teacherId_subjectId_cohortId: {
                                    teacherId: teacher.id,
                                    subjectId: subject.id,
                                    cohortId: cohort.id
                                }
                            },
                            update: { semester: update.newSem },
                            create: {
                                teacherId: teacher.id,
                                subjectId: subject.id,
                                cohortId: cohort.id,
                                departmentId: dept.id,
                                semester: update.newSem,
                                academicYear: '2024-2025'
                            }
                        });
                        console.log(`  Assigned ${teacher.fullName} (Teacher ${teacherIndex}) to ${subject.name} (Sem ${update.newSem})`);

                        // Add COs
                        for (let co = 1; co <= 5; co++) {
                            await prisma.courseOutcome.upsert({
                                where: { subjectId_coNumber: { subjectId: subject.id, coNumber: co } },
                                update: {},
                                create: {
                                    subjectId: subject.id,
                                    coNumber: co,
                                    description: `Understand ${subData.name} - CO${co}`,
                                    bloomLevel: Object.values(BloomLevel)[co % 6]
                                }
                            });
                        }
                        teacherIndex++;
                    }
                }
            }
        }
    }
    console.log('Fix complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
