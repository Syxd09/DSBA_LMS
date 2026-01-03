const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function enrollStudents() {
    try {
        console.log('Starting student enrollment...\n');

        // Get teacher assignments to know which cohorts to enroll students in
        const assignments = await prisma.teacherAssignment.findMany({
            where: { semester: 1 },
            include: {
                cohort: true
            }
        });

        if (assignments.length === 0) {
            console.log('No teacher assignments found for Semester 1');
            return;
        }

        console.log(`Found ${assignments.length} teacher assignments for Semester 1\n`);

        // Create 10 test students
        const hashedPassword = await bcrypt.hash('Student@123', 10);
        const studentEmails = [
            'alice.johnson@college.edu',
            'bob.smith@college.edu',
            'charlie.brown@college.edu',
            'diana.prince@college.edu',
            'ethan.hunt@college.edu',
            'fiona.green@college.edu',
            'george.white@college.edu',
            'hannah.lee@college.edu',
            'ivan.petrov@college.edu',
            'julia.roberts@college.edu'
        ];

        const studentNames = [
            'Alice Johnson',
            'Bob Smith',
            'Charlie Brown',
            'Diana Prince',
            'Ethan Hunt',
            'Fiona Green',
            'George White',
            'Hannah Lee',
            'Ivan Petrov',
            'Julia Roberts'
        ];

        console.log('Creating student users...');
        const createdStudents = [];

        for (let i = 0; i < 10; i++) {
            try {
                const student = await prisma.user.create({
                    data: {
                        email: studentEmails[i],
                        fullName: studentNames[i],
                        password: hashedPassword,
                        role: 'STUDENT'
                    }
                });
                createdStudents.push(student);
                console.log(`✓ Created: ${student.fullName}`);
            } catch (error) {
                if (error.code === 'P2002') {
                    console.log(`- Skipped: ${studentNames[i]} (already exists)`);
                    const existingStudent = await prisma.user.findUnique({
                        where: { email: studentEmails[i] }
                    });
                    createdStudents.push(existingStudent);
                } else {
                    console.error(`✗ Error creating ${studentNames[i]}:`, error.message);
                }
            }
        }

        console.log(`\n${createdStudents.length} students ready for enrollment\n`);

        // Enroll students in each cohort from teacher assignments
        let totalEnrollments = 0;

        for (const assignment of assignments) {
            console.log(`Enrolling students in: ${assignment.cohort.name} (Semester 1)`);

            for (let i = 0; i < createdStudents.length; i++) {
                const student = createdStudents[i];
                const rollNumber = `${assignment.cohort.name.substring(0, 3).toUpperCase()}-S1-${String(i + 1).padStart(3, '0')}`;

                try {
                    await prisma.enrollment.create({
                        data: {
                            studentId: student.id,
                            cohortId: assignment.cohortId,
                            departmentId: assignment.departmentId,
                            semester: 1,
                            rollNumber: rollNumber,
                            status: 'active'
                        }
                    });
                    totalEnrollments++;
                    console.log(`  ✓ Enrolled: ${student.fullName} (${rollNumber})`);
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`  - Skipped: ${student.fullName} (already enrolled)`);
                    } else {
                        console.error(`  ✗ Error enrolling ${student.fullName}:`, error.message);
                    }
                }
            }
            console.log('');
        }

        console.log(`\n✅ SUCCESS!`);
        console.log(`Total enrollments created: ${totalEnrollments}`);
        console.log(`\nNow login as teacher and check the Students page!`);
        console.log(`Password for all students: Student@123\n`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

enrollStudents();
