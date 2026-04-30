const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Clear existing data in order
    console.log('Clearing existing data...');
    try {
        await prisma.department.updateMany({ data: { hodId: null } });
        await prisma.studentMark.deleteMany();
        await prisma.marksComputed.deleteMany();
        await prisma.finalMark.deleteMany();
        await prisma.semesterResult.deleteMany();
        await prisma.studentEnrollment.deleteMany();
        await prisma.teacherAssignment.deleteMany();
        await prisma.subQuestion.deleteMany();
        await prisma.question.deleteMany();
        await prisma.examSection.deleteMany();
        await prisma.exam.deleteMany();
        await prisma.coPoMapping.deleteMany();
        await prisma.cOAttainment.deleteMany();
        await prisma.courseOutcome.deleteMany();
        await prisma.subject.deleteMany();
        await prisma.curriculumVersion.deleteMany();
        await prisma.cohort.deleteMany();
        await prisma.pOAttainment.deleteMany();
        await prisma.programOutcome.deleteMany();
        await prisma.program.deleteMany();
        await prisma.user.deleteMany();
        await prisma.department.deleteMany();
    } catch (e) {
        console.log('Note: Some tables might be empty or missing, continuing...');
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Create Departments
    console.log('Creating departments...');
    const cse = await prisma.department.create({
        data: { name: 'Computer Science and Engineering', code: 'CSE' }
    });

    const ece = await prisma.department.create({
        data: { name: 'Electronics and Communication Engineering', code: 'ECE' }
    });

    // 3. Create Key Users
    console.log('Creating key users...');
    const principal = await prisma.user.create({
        data: {
            email: 'syxdmatheen.09@gmail.com',
            fullName: 'System Principal',
            password: hashedPassword,
            role: 'PRINCIPAL'
        }
    });

    await prisma.user.create({
        data: {
            email: 'admin@college.edu',
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    const hodCSE = await prisma.user.create({
        data: {
            email: 'hod.cse@college.edu',
            fullName: 'Dr. Priya Sharma',
            password: hashedPassword,
            role: 'HOD',
            departmentId: cse.id
        }
    });

    await prisma.department.update({
        where: { id: cse.id },
        data: { hodId: hodCSE.id }
    });

    // 4. Create Teachers
    console.log('Creating teachers...');
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

    // 5. Create Students
    console.log('Creating students...');
    const studentNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayush', 'Krishna', 'Ishaan'];
    const students = [];
    for (let i = 0; i < studentNames.length; i++) {
        students.push(await prisma.user.create({
            data: {
                email: `student${i + 1}.cse@college.edu`,
                fullName: studentNames[i],
                password: hashedPassword,
                role: 'STUDENT',
                departmentId: cse.id,
                registrationNumber: `REG2025${i + 1}`
            }
        }));
    }

    // 6. Program, Cohort, Enrollment
    console.log('Setting up academic structure...');
    const bca = await prisma.program.create({
        data: {
            name: 'Bachelor of Computer Applications',
            code: 'BCA',
            departmentId: cse.id,
            durationYears: 3,
            programOutcomes: {
                create: [
                    { poNumber: 1, description: 'Knowledge Application', targetPercent: 60 },
                    { poNumber: 2, description: 'Problem Analysis', targetPercent: 60 }
                ]
            }
        }
    });

    const cohort2025 = await prisma.cohort.create({
        data: {
            name: 'Class of 2025',
            year: 2025,
            programId: bca.id,
            currentSemester: 1
        }
    });

    for (const student of students) {
        await prisma.studentEnrollment.create({
            data: { studentId: student.id, cohortId: cohort2025.id, departmentId: cse.id, semester: 1 }
        });
    }

    // 7. Curriculum & Subjects
    const curriculum = await prisma.curriculumVersion.create({
        data: { programId: bca.id, versionName: 'v1.0', effectiveFrom: 2024 }
    });

    const mathSubject = await prisma.subject.create({
        data: { name: 'Advanced Mathematics', code: 'MATH101', credits: 4, semester: 1, curriculumVersionId: curriculum.id }
    });

    const mathCOs = [];
    for (let i = 1; i <= 3; i++) {
        mathCOs.push(await prisma.courseOutcome.create({
            data: {
                subjectId: mathSubject.id,
                coNumber: i,
                description: `Understand math concept ${i}`,
                bloomLevel: 'Understand'
            }
        }));
    }

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

    // 8. Exam
    const exam = await prisma.exam.create({
        data: {
            subjectId: mathSubject.id,
            cohortId: cohort2025.id,
            examType: 'INTERNAL_1',
            maxMarks: 50,
            passingMarks: 20,
            status: 'SCHEDULED',
            teacherId: teachers[0].id,
            semester: 1
        }
    });

    const section = await prisma.examSection.create({
        data: { examId: exam.id, name: 'Part A', sequence: 1, maxMarks: 50 }
    });

    for (let i = 1; i <= 3; i++) {
        await prisma.question.create({
            data: {
                sectionId: section.id,
                sequence: i,
                maxMarks: 10,
                bloomLevel: 'Apply',
                coId: mathCOs[i - 1]?.id,
                subQuestions: {
                    create: [
                        { label: 'a', maxMarks: 10, bloomLevel: 'Apply', coId: mathCOs[i - 1]?.id }
                    ]
                }
            }
        });
    }

    console.log('✅ Seeding complete! All users now have password: password123');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
