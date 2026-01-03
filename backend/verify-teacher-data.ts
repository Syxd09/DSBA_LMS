import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTeacherData() {
    console.log('=== TEACHER DATA VERIFICATION ===\n');

    // Find the teacher user
    const teacher = await prisma.user.findFirst({
        where: { email: { contains: 'syxd' } }
    });

    if (!teacher) {
        console.log('❌ Teacher "syxd" not found');
        return;
    }

    console.log('✅ Teacher found:');
    console.log(`   ID: ${teacher.id}`);
    console.log(`   Email: ${teacher.email}`);
    console.log(`   Name: ${teacher.fullName}`);
    console.log(`   Role: ${teacher.role}\n`);

    // Check teacher assignments
    const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: teacher.id },
        include: {
            subject: true,
            cohort: {
                include: {
                    program: true
                }
            }
        }
    });

    console.log(`📚 Teacher Assignments: ${assignments.length}`);
    assignments.forEach((assignment, idx) => {
        console.log(`\n   Assignment ${idx + 1}:`);
        console.log(`   - Subject: ${assignment.subject.name} (${assignment.subject.code})`);
        console.log(`   - Cohort: ${assignment.cohort.name}`);
        console.log(`   - Program: ${assignment.cohort.program?.name || 'N/A'}`);
        console.log(`   - Semester: ${assignment.semester}`);
        console.log(`   - Academic Year: ${assignment.academicYear}`);
        console.log(`   - Cohort ID: ${assignment.cohortId}`);
    });

    // For each assignment, check if students are enrolled
    console.log(`\n=== STUDENT ENROLLMENTS ===\n`);

    for (const assignment of assignments) {
        const enrollments = await prisma.enrollment.findMany({
            where: {
                cohortId: assignment.cohortId,
                semester: assignment.semester
            },
            include: {
                student: true
            }
        });

        console.log(`📋 Cohort: ${assignment.cohort.name}, Semester: ${assignment.semester}`);
        console.log(`   Students enrolled: ${enrollments.length}`);

        if (enrollments.length > 0) {
            console.log(`   Students:`);
            enrollments.forEach(enrollment => {
                console.log(`   - ${enrollment.student.fullName} (${enrollment.rollNumber})`);
            });
        } else {
            console.log(`   ⚠️  No students enrolled in this cohort/semester!`);
        }
        console.log('');
    }

    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Teacher has ${assignments.length} subject assignments`);

    let totalExpectedStudents = 0;
    for (const assignment of assignments) {
        const count = await prisma.enrollment.count({
            where: {
                cohortId: assignment.cohortId,
                semester: assignment.semester
            }
        });
        totalExpectedStudents += count;
    }

    console.log(`Total students across all assignments: ${totalExpectedStudents}`);

    if (totalExpectedStudents === 0) {
        console.log('\n⚠️  ISSUE: No students are enrolled in the cohorts/semesters where the teacher is assigned!');
        console.log('ACTION: You need to enroll students in the cohorts/semesters that match the teacher assignments.');
    }

    await prisma.$disconnect();
}

verifyTeacherData().catch(console.error);
