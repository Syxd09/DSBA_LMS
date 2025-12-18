
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEPARTMENTS = ['BCA', 'BBA', 'Bcom'];
const PASSWORD = 'password123';

async function main() {
    console.log('Starting mock data generation...');
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    // 1. Ensure Principal
    await prisma.user.upsert({
        where: { email: 'principal@college.edu' },
        update: { role: Role.PRINCIPAL },
        create: {
            email: 'principal@college.edu',
            fullName: 'Principal User',
            password: hashedPassword,
            role: Role.PRINCIPAL,
        }
    });
    console.log('Verified Principal.');

    for (const deptName of DEPARTMENTS) {
        console.log(`\nProcessing Department: ${deptName}`);

        // 2. Create Department
        const dept = await prisma.department.upsert({
            where: { name: deptName },
            update: {},
            create: {
                name: deptName,
                code: deptName.toUpperCase(),
            }
        });

        // 3. Create HOD
        const hodEmail = `hod.${deptName.toLowerCase()}@college.edu`;
        const hod = await prisma.user.upsert({
            where: { email: hodEmail },
            update: { departmentId: dept.id, role: Role.HOD },
            create: {
                email: hodEmail,
                fullName: `HOD ${deptName}`,
                password: hashedPassword,
                role: Role.HOD,
                departmentId: dept.id,
            }
        });

        // Link HOD to Department
        await prisma.department.update({
            where: { id: dept.id },
            data: { hodId: hod.id }
        });
        console.log(`- Created HOD: ${hodEmail}`);

        // 4. Create Teachers (4 per dept)
        for (let i = 1; i <= 4; i++) {
            const teacherEmail = `teacher${i}.${deptName.toLowerCase()}@college.edu`;
            await prisma.user.upsert({
                where: { email: teacherEmail },
                update: { departmentId: dept.id, role: Role.TEACHER },
                create: {
                    email: teacherEmail,
                    fullName: `Teacher ${i} ${deptName}`,
                    password: hashedPassword,
                    role: Role.TEACHER,
                    departmentId: dept.id,
                }
            });
        }
        console.log(`- Created 4 Teachers for ${deptName}`);

        // 5. Create Program
        const programCode = `${deptName}-CORE`;
        const program = await prisma.program.upsert({
            where: { code: programCode },
            update: {},
            create: {
                name: `Bachelor of ${deptName}`,
                code: programCode,
                departmentId: dept.id,
                durationYears: 3
            }
        });

        // 6. Create Cohorts and Students (3 semesters sets)
        // We act like we have 3 cohorts: 1st Year (Sem 1), 2nd Year (Sem 3), 3rd Year (Sem 5)
        const cohortConfigs = [
            { year: 2024, name: '2024-2027', sem: 1 },
            { year: 2023, name: '2023-2026', sem: 3 },
            { year: 2022, name: '2022-2025', sem: 5 }
        ];

        for (const config of cohortConfigs) {
            // Find or Create Cohort
            // Note: unique constraint is [programId, year]
            const cohort = await prisma.cohort.upsert({
                where: {
                    programId_year: {
                        programId: program.id,
                        year: config.year
                    }
                },
                update: { currentSemester: config.sem },
                create: {
                    programId: program.id,
                    name: config.name,
                    year: config.year,
                    currentSemester: config.sem
                }
            });

            // Create 10 Students for this cohort
            for (let i = 1; i <= 10; i++) {
                const rollNo = `${deptName}${config.year}${String(i).padStart(3, '0')}`; // e.g., BCA2024001
                const studentEmail = `student${i}.${deptName.toLowerCase()}.${config.year}@college.edu`;

                const student = await prisma.user.upsert({
                    where: { email: studentEmail },
                    update: { departmentId: dept.id, role: Role.STUDENT },
                    create: {
                        email: studentEmail,
                        fullName: `Student ${i} ${deptName} ${config.year}`,
                        password: hashedPassword,
                        role: Role.STUDENT,
                        departmentId: dept.id,
                    }
                });

                // Create Enrollment
                await prisma.studentEnrollment.upsert({
                    where: {
                        studentId_cohortId_semester: {
                            studentId: student.id,
                            cohortId: cohort.id,
                            semester: config.sem
                        }
                    },
                    update: {},
                    create: {
                        studentId: student.id,
                        cohortId: cohort.id,
                        departmentId: dept.id,
                        semester: config.sem,
                        rollNumber: rollNo,
                        status: 'active'
                    }
                });
            }
            console.log(`- Created 10 Students for Cohort ${cohort.name} (Sem ${config.sem})`);
        }
    }
    console.log('\nMock data generation complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
