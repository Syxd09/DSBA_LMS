const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.mark.deleteMany();
    await prisma.question.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.cOPOMapping.deleteMany();
    await prisma.courseOutcome.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.curriculum.deleteMany();
    await prisma.programOutcome.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.cohort.deleteMany();
    await prisma.program.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Departments
    console.log('Creating departments...');
    const cse = await prisma.department.create({
        data: {
            name: 'Computer Science and Engineering',
            code: 'CSE',
            description: 'Department of Computer Science and Engineering'
        }
    });

    const ece = await prisma.department.create({
        data: {
            name: 'Electronics and Communication Engineering',
            code: 'ECE',
            description: 'Department of Electronics and Communication Engineering'
        }
    });

    // Create Users
    console.log('Creating users...');
    const admin = await prisma.user.create({
        data: {
            email: 'admin@college.edu',
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'admin'
        }
    });

    const principal = await prisma.user.create({
        data: {
            email: 'principal@college.edu',
            fullName: 'Dr. Rajesh Kumar',
            password: hashedPassword,
            role: 'principal'
        }
    });

    const hodCSE = await prisma.user.create({
        data: {
            email: 'hod.cse@college.edu',
            fullName: 'Dr. Priya Sharma',
            password: hashedPassword,
            role: 'hod',
            departmentId: cse.id
        }
    });

    // Teachers
    const teachers = [];
    for (let i = 1; i <= 3; i++) {
        teachers.push(await prisma.user.create({
            data: {
                email: `teacher${i}.cse@college.edu`,
                fullName: `Prof. Teacher ${i}`,
                password: hashedPassword,
                role: 'teacher',
                departmentId: cse.id
            }
        }));
    }

    // Students
    const students = [];
    const studentNames = [
        'Aarav Kumar', 'Vivaan Sharma', 'Aditya Patel', 'Vihaan Gupta', 'Arjun Singh',
        'Sai Reddy', 'Arnav Rao', 'Ayush Joshi', 'Krishna Iyer', 'Ishaan Mehta',
        'Diya Nair', 'Ananya Desai', 'Saanvi Kumar', 'Aadhya Sharma', 'Kiara Patel',
        'Myra Singh', 'Aanya Reddy', 'Navya Jain', 'Aarohi Menon', 'Pari Agarwal'
    ];

    for (let i = 0; i < studentNames.length; i++) {
        students.push(await prisma.user.create({
            data: {
                email: `student${i + 1}.cse@college.edu`,
                fullName: studentNames[i],
                password: hashedPassword,
                role: 'student',
                departmentId: cse.id
            }
        }));
    }

    // Create Program with POs
    console.log('Creating programs and program outcomes...');
    const btechCSE = await prisma.program.create({
        data: {
            name: 'Bachelor of Technology - Computer Science',
            code: 'BTECH-CSE',
            departmentId: cse.id,
            duration: 4,
            outcomes: {
                create: [
                    { poNumber: 1, description: 'Engineering Knowledge: Apply knowledge of mathematics, science, engineering fundamentals', targetPercent: 60 },
                    { poNumber: 2, description: 'Problem Analysis: Identify, formulate, and analyze complex engineering problems', targetPercent: 60 },
                    { poNumber: 3, description: 'Design/Development of Solutions: Design solutions for complex problems', targetPercent: 60 },
                    { poNumber: 4, description: 'Conduct Investigations: Use research-based knowledge and methods', targetPercent: 60 },
                    { poNumber: 5, description: 'Modern Tool Usage: Create, select and apply appropriate techniques', targetPercent: 60 }
                ]
            }
        }
    });

    // Create Cohorts
    console.log('Creating cohorts...');
    const cohort2024 = await prisma.cohort.create({
        data: {
            name: 'CSE Batch 2024-2028',
            year: 2024,
            programId: btechCSE.id,
            semester: 3,
            academicYear: '2025-26'
        }
    });

    // Enroll Students
    console.log('Enrolling students...');
    for (let i = 0; i < 10; i++) {
        await prisma.enrollment.create({
            data: {
                studentId: students[i].id,
                cohortId: cohort2024.id,
                enrollmentDate: new Date(),
                rollNumber: `CSE2024${String(i + 1).padStart(3, '0')}`
            }
        });
    }

    // Create Curriculum and Subjects
    console.log('Creating curriculum and subjects...');
    const curriculum = await prisma.curriculum.create({
        data: {
            programId: btechCSE.id,
            semester: 3,
            academicYear: '2025-26'
        }
    });

    const dsSubject = await prisma.subject.create({
        data: {
            name: 'Data Structures and Algorithms',
            code: 'CS301',
            credits: 4,
            departmentId: cse.id,
            curriculumId: curriculum.id
        }
    });

    const dbmsSubject = await prisma.subject.create({
        data: {
            name: 'Database Management Systems',
            code: 'CS302',
            credits: 4,
            departmentId: cse.id,
            curriculumId: curriculum.id
        }
    });

    // Assign Teachers
    console.log('Assigning teachers...');
    await prisma.assignment.create({
        data: {
            teacherId: teachers[0].id,
            subjectId: dsSubject.id,
            cohortId: cohort2024.id,
            academicYear: '2025-26',
            semester: 3,
            status: 'active'
        }
    });

    await prisma.assignment.create({
        data: {
            teacherId: teachers[1].id,
            subjectId: dbmsSubject.id,
            cohortId: cohort2024.id,
            academicYear: '2025-26',
            semester: 3,
            status: 'active'
        }
    });

    // Get POs
    const pos = await prisma.programOutcome.findMany({
        where: { programId: btechCSE.id }
    });

    // Create Course Outcomes and CO-PO Mappings
    console.log('Creating course outcomes and mappings...');
    const dsCOs = [];
    for (let i = 1; i <= 5; i++) {
        const co = await prisma.courseOutcome.create({
            data: {
                coNumber: i,
                description: `DS CO${i}: Course outcome ${i}`,
                bloomLevel: 'Understand',
                subjectId: dsSubject.id
            }
        });
        dsCOs.push(co);

        // Map to POs
        const poIndexes = i <= 3 ? [0, 1] : [1, 2];
        for (const idx of poIndexes) {
            if (pos[idx]) {
                await prisma.cOPOMapping.create({
                    data: {
                        coId: co.id,
                        poId: pos[idx].id,
                        correlationLevel: 3
                    }
                });
            }
        }
    }

    const dbmsCOs = [];
    for (let i = 1; i <= 5; i++) {
        const co = await prisma.courseOutcome.create({
            data: {
                coNumber: i,
                description: `DBMS CO${i}: Course outcome ${i}`,
                bloomLevel: 'Apply',
                subjectId: dbmsSubject.id
            }
        });
        dbmsCOs.push(co);

        const poIndexes = i <= 2 ? [0, 1] : [2, 3];
        for (const idx of poIndexes) {
            if (pos[idx]) {
                await prisma.cOPOMapping.create({
                    data: {
                        coId: co.id,
                        poId: pos[idx].id,
                        correlationLevel: 3
                    }
                });
            }
        }
    }

    // Create Exams and Questions
    console.log('Creating exams and questions...');
    const dsMidterm = await prisma.exam.create({
        data: {
            name: 'DS Mid-Term Exam',
            subjectId: dsSubject.id,
            cohortId: cohort2024.id,
            date: new Date('2025-10-15'),
            totalMarks: 50,
            semester: 3,
            academicYear: '2025-26',
            type: 'midterm'
        }
    });

    const dsQuestions = [];
    for (let i = 0; i < 5; i++) {
        dsQuestions.push(await prisma.question.create({
            data: {
                examId: dsMidterm.id,
                questionNumber: i + 1,
                coId: dsCOs[i].id,
                marks: 10,
                bloomLevel: 'Understand'
            }
        }));
    }

    const dbmsMidterm = await prisma.exam.create({
        data: {
            name: 'DBMS Mid-Term Exam',
            subjectId: dbmsSubject.id,
            cohortId: cohort2024.id,
            date: new Date('2025-10-16'),
            totalMarks: 50,
            semester: 3,
            academicYear: '2025-26',
            type: 'midterm'
        }
    });

    const dbmsQuestions = [];
    for (let i = 0; i < 5; i++) {
        dbmsQuestions.push(await prisma.question.create({
            data: {
                examId: dbmsMidterm.id,
                questionNumber: i + 1,
                coId: dbmsCOs[i].id,
                marks: 10,
                bloomLevel: 'Apply'
            }
        }));
    }

    // Enter Marks
    console.log('Entering student marks...');
    const performanceLevels = [95, 88, 75, 72, 68, 65, 58, 52, 45, 38]; // percentages

    for (let studentIdx = 0; studentIdx < 10; studentIdx++) {
        const percentage = performanceLevels[studentIdx] / 100;

        for (const question of dsQuestions) {
            await prisma.mark.create({
                data: {
                    studentId: students[studentIdx].id,
                    examId: dsMidterm.id,
                    questionId: question.id,
                    marksObtained: Math.round(question.marks * percentage * (0.9 + Math.random() * 0.2))
                }
            });
        }

        for (const question of dbmsQuestions) {
            await prisma.mark.create({
                data: {
                    studentId: students[studentIdx].id,
                    examId: dbmsMidterm.id,
                    questionId: question.id,
                    marksObtained: Math.round(question.marks * percentage * (0.9 + Math.random() * 0.2))
                }
            });
        }
    }

    console.log('✅ Database seeding completed!');
    console.log('\n📊 Summary:');
    console.log(`- Departments: 2 (CSE, ECE)`);
    console.log(`- Users: 27 (1 admin, 1 principal, 1 HOD, 3 teachers, 20 students)`);
    console.log(`- Programs: 1 with 5 POs`);
    console.log(`- Cohorts: 1`);
    console.log(`- Students Enrolled: 10`);
    console.log(`- Subjects: 2`);
    console.log(`- Course Outcomes: 10`);
    console.log(`- Exams: 2`);
    console.log(`- Questions: 10`);
    console.log(`- Marks: 100`);
    console.log(`\n🔑 Login Credentials (password: password123):`);
    console.log(`  admin@college.edu`);
    console.log(`  principal@college.edu`);
    console.log(`  hod.cse@college.edu`);
    console.log(`  teacher1.cse@college.edu`);
    console.log(`  student1.cse@college.edu (etc.)`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
