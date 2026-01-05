const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Clear existing data in order
    console.log('Clearing existing data...');
    try {
        // Unlink HODs from Departments first to break circular dependency
        await prisma.department.updateMany({ data: { hodId: null } });

        await prisma.studentMark.deleteMany();
        await prisma.subQuestion.deleteMany();
        await prisma.question.deleteMany();
        await prisma.examSection.deleteMany();
        await prisma.exam.deleteMany();
        await prisma.coPoMapping.deleteMany();
        await prisma.cOAttainment.deleteMany();
        await prisma.courseOutcome.deleteMany();
        await prisma.teacherAssignment.deleteMany();
        await prisma.subject.deleteMany();
        await prisma.curriculumVersion.deleteMany();
        await prisma.studentEnrollment.deleteMany();
        await prisma.cohort.deleteMany();
        await prisma.pOAttainment.deleteMany();
        await prisma.programOutcome.deleteMany();
        await prisma.program.deleteMany();

        // Delete Users before Departments (Users belong to Dept)
        await prisma.user.deleteMany();
        await prisma.department.deleteMany();

    } catch (e) {
        console.log('Note: Some tables might be empty or missing, continuing...', e.message);
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Create Departments
    console.log('Creating departments...');
    const cse = await prisma.department.create({
        data: {
            name: 'Computer Science and Engineering',
            code: 'CSE'
        }
    });

    const ece = await prisma.department.create({
        data: {
            name: 'Electronics and Communication Engineering',
            code: 'ECE'
        }
    });

    // 3. Create Users
    console.log('Creating users...');

    // Principal (The one user requested)
    const principal = await prisma.user.create({
        data: {
            email: 'syxdmatheen.9@gmail.com',
            fullName: 'System Principal',
            password: hashedPassword,
            role: 'PRINCIPAL'
        }
    });

    // Admin
    await prisma.user.create({
        data: {
            email: 'admin@college.edu',
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    // HOD
    const hodCSE = await prisma.user.create({
        data: {
            email: 'hod.cse@college.edu',
            fullName: 'Dr. Priya Sharma',
            password: hashedPassword,
            role: 'HOD',
            departmentId: cse.id,
            departmentLed: { connect: { id: cse.id } } // Connect as HOD of department? Schema line 121 hodId
        }
    });
    // Update department with HOD (since it's a circular relation sometimes)
    await prisma.department.update({
        where: { id: cse.id },
        data: { hodId: hodCSE.id }
    });


    // Teachers
    const teachers = [];
    for (let i = 1; i <= 3; i++) {
        teachers.push(await prisma.user.create({
            data: {
                email: `teacher${i}.cse@college.edu`,
                fullName: `Prof. Teacher ${i}`,
                password: hashedPassword,
                role: 'TEACHER',
                departmentId: cse.id
            }
        }));
    }

    // Students
    const students = [];
    const studentNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayush', 'Krishna', 'Ishaan'];

    for (let i = 0; i < studentNames.length; i++) {
        students.push(await prisma.user.create({
            data: {
                email: `student${i + 1}.cse@college.edu`,
                fullName: studentNames[i],
                password: hashedPassword,
                role: 'STUDENT',
                departmentId: cse.id
            }
        }));
    }

    // 4. Create Program & POs
    console.log('Creating programs...');
    const bca = await prisma.program.create({
        data: {
            name: 'Bachelor of Computer Applications',
            code: 'BCA',
            departmentId: cse.id,
            durationYears: 3,
            outcomes: {
                create: [
                    { poNumber: 1, description: 'Knowledge Application', targetPercent: 60 },
                    { poNumber: 2, description: 'Problem Analysis', targetPercent: 60 },
                    { poNumber: 3, description: 'Design Solutions', targetPercent: 60 },
                    { poNumber: 4, description: 'Modern Tool Usage', targetPercent: 60 }
                ]
            }
        }
    });

    // 5. Create Cohort
    console.log('Creating cohort...');
    const cohort2025 = await prisma.cohort.create({
        data: {
            name: 'Class of 2025',
            year: 2025,
            programId: bca.id,
            currentSemester: 1
        }
    });

    // 6. Enroll Students
    console.log('Enrolling students...');
    for (const student of students) {
        await prisma.studentEnrollment.create({
            data: {
                studentId: student.id,
                cohortId: cohort2025.id,
                departmentId: cse.id,
                semester: 1,
                rollNumber: 'BCA25' + student.id.substring(0, 4)
            }
        });
    }

    // 7. Curriculum & Subjects & COs
    console.log('Creating curriculum...');
    const curriculum = await prisma.curriculumVersion.create({
        data: {
            programId: bca.id,
            versionName: 'v1.0',
            effectiveFrom: 2024
        }
    });

    const mathSubject = await prisma.subject.create({
        data: {
            name: 'Advanced Mathematics',
            code: 'MATH101',
            credits: 4,
            semester: 1,
            curriculumVersionId: curriculum.id,
            curriculumVersionId: curriculum.id
        }
    });

    // Create COs for Math
    const mathCOs = [];
    for (let i = 1; i <= 5; i++) {
        mathCOs.push(await prisma.courseOutcome.create({
            data: {
                subjectId: mathSubject.id,
                coNumber: i,
                description: `Understand math concept ${i}`,
                bloomLevel: 'Understand' // Enum
            }
        }));
    }

    // Map COs to POs
    const pos = await prisma.programOutcome.findMany({ where: { programId: bca.id } });
    if (pos.length > 0) {
        await prisma.coPoMapping.create({
            data: {
                coId: mathCOs[0].id,
                poId: pos[0].id,
                correlationLevel: 3
            }
        });
    }

    // Assign Teacher
    await prisma.teacherAssignment.create({
        data: {
            teacherId: teachers[0].id,
            subjectId: mathSubject.id,
            cohortId: cohort2025.id,
            departmentId: cse.id,
            semester: 1,
            academicYear: '2026-27'
        }
    });

    // 8. Create Exam with Structure
    console.log('Creating exam...');
    const exam = await prisma.exam.create({
        data: {
            subjectId: mathSubject.id,
            cohortId: cohort2025.id,
            examType: 'INTERNAL_1',
            maxMarks: 50,
            passingMarks: 20,
            examDate: new Date('2025-09-15T10:00:00Z'),
            duration: 90,
            instructions: 'Answer all questions',
            status: 'SCHEDULED',
            teacherId: teachers[0].id
        }
    });

    // Create Section
    const section = await prisma.examSection.create({
        data: {
            examId: exam.id,
            name: 'Part A',
            sequence: 1,
            maxMarks: 50
        }
    });

    // Create Questions with SubQuestions
    for (let i = 1; i <= 5; i++) {
        const question = await prisma.question.create({
            data: {
                sectionId: section.id,
                sequence: i,
                maxMarks: 10,
                bloomLevel: 'Apply',
                coId: mathCOs[i - 1]?.id, // Assign CO to question
                subQuestions: {
                    create: [
                        {
                            label: 'a',
                            maxMarks: 5,
                            bloomLevel: 'Apply',
                            coId: mathCOs[i - 1]?.id
                        },
                        {
                            label: 'b',
                            maxMarks: 5,
                            bloomLevel: 'Understand',
                            coId: mathCOs[i - 1]?.id
                        }
                    ]
                }
            }
        });
    }

    console.log('✅ Seeding complete! Login with syxdmatheen.9@gmail.com / password123');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
