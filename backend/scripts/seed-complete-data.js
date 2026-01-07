const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedCompleteData() {
    console.log('🌱 Creating complete test data...\n');

    try {
        const dept = await prisma.department.findFirst({ where: { code: 'CSE' } });
        const teacher = await prisma.user.findUnique({ where: { email: 'teacher@test.com' } });

        if (!dept || !teacher) {
            throw new Error('Run seed-test-users.js first!');
        }

        // 1. Program
        let program = await prisma.program.upsert({
            where: { code: 'BTECHCSE' },
            update: {},
            create: {
                name: 'B.Tech Computer Science',
                code: 'BTECHCSE',
                departmentId: dept.id,
                durationYears: 4,
                isActive: true
            }
        });
        console.log('✓ Program');

        // 2. Cohorts (NO departmentId!)
        const cohort2022 = await prisma.cohort.upsert({
            where: { programId_year: { programId: program.id, year: 2022 } },
            update: {},
            create: {
                programId: program.id,
                year: 2022,
                name: '2022-2026 Batch',
                currentSemester: 5,
                isActive: true
            }
        });
        console.log('✓ Cohort 2022-2026');

        // 3. Curriculum
        let curriculum = await prisma.curriculumVersion.findFirst({
            where: { programId: program.id }
        });

        if (!curriculum) {
            curriculum = await prisma.curriculumVersion.create({
                data: {
                    programId: program.id,
                    versionName: '2021',
                    effectiveFrom: 2021,
                    isActive: true
                }
            });
        }
        console.log('✓ Curriculum');

        // 4. Subjects
        const subjects = [];
        const subjectData = [
            { code: 'CS501', name: 'Database Management Systems', credits: 4, semester: 5 },
            { code: 'CS502', name: 'Operating Systems', credits: 4, semester: 5 },
            { code: 'CS503', name: 'Computer Networks', credits: 4, semester: 5 }
        ];

        for (const data of subjectData) {
            const subj = await prisma.subject.upsert({
                where: { code: data.code },
                update: {},
                create: {
                    ...data,
                    curriculumVersionId: curriculum.id,
                    isActive: true
                }
            });
            subjects.push(subj);
        }
        console.log(`✓ ${subjects.length} Subjects`);

        // 5. Students
        console.log('\n5. Creating Students...');
        const password = await bcrypt.hash('student123', 10);
        const students = [];

        for (let i = 1; i <= 10; i++) {
            const email = `student${i}@test.com`;
            const student = await prisma.user.upsert({
                where: { email },
                update: {},
                create: {
                    email,
                    password,
                    fullName: `Student ${i}`,
                    role: 'STUDENT',
                    departmentId: dept.id
                }
            });
            students.push(student);
        }
        console.log(`✓ ${students.length} Students`);

        // 6. Enrollments
        console.log('\n6. Creating Enrollments...');
        for (const student of students) {
            await prisma.studentEnrollment.upsert({
                where: {
                    studentId_cohortId_semester: {
                        studentId: student.id,
                        cohortId: cohort2022.id,
                        semester: 5
                    }
                },
                update: {},
                create: {
                    studentId: student.id,
                    cohortId: cohort2022.id,
                    departmentId: dept.id,
                    semester: 5,
                    rollNumber: `CSE2022${String(students.indexOf(student) + 1).padStart(3, '0')}`,
                    status: 'active'
                }
            });
        }
        console.log(`✓ ${students.length} Enrollments`);

        // 7. Teacher Assignments
        for (const subject of subjects) {
            await prisma.teacherAssignment.upsert({
                where: {
                    teacherId_subjectId_cohortId: {
                        teacherId: teacher.id,
                        subjectId: subject.id,
                        cohortId: cohort2022.id
                    }
                },
                update: {},
                create: {
                    teacherId: teacher.id,
                    subjectId: subject.id,
                    cohortId: cohort2022.id,
                    departmentId: dept.id,
                    semester: 5,
                    academicYear: '2024-25'
                }
            });
        }
        console.log(`✓ ${subjects.length} Teacher Assignments`);

        // 8. Feedback Template
        let template = await prisma.feedbackTemplate.findFirst({
            where: { name: 'Academic Performance' }
        });

        if (!template) {
            template = await prisma.feedbackTemplate.create({
                data: {
                    name: 'Academic Performance',
                    description: 'Standard evaluation',
                    departmentId: dept.id,
                    isActive: true,
                    createdBy: teacher.id,
                    categories: {
                        create: [
                            { name: 'Understanding', weight: 25, displayOrder: 1 },
                            { name: 'Problem Solving', weight: 25, displayOrder: 2 },
                            { name: 'Participation', weight: 20, displayOrder: 3 },
                            { name: 'Assignments', weight: 20, displayOrder: 4 },
                            { name: 'Progress', weight: 10, displayOrder: 5 }
                        ]
                    }
                }
            });
        }
        console.log('✓ Template\n');

        console.log('✅ Complete!\n');
        console.log(`Students: ${students.length}`);
        console.log(`Subjects: ${subjects.length} (assigned to teacher)`);
        console.log('\n🎯 Login: teacher@test.com / password123\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedCompleteData();
