
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const generateId = () => Math.random().toString(36).substring(2, 8);

async function smokeTest() {
    console.log('🚀 Starting System Smoke Test...');

    try {
        // 1. Create Department
        console.log('1. Creating Department...');
        const dept = await prisma.department.create({
            data: {
                name: `Test Dept ${generateId()}`,
                code: `TD-${generateId().toUpperCase()}`
            }
        });
        console.log(`✅ Department Created: ${dept.code}`);

        // 2. Create Program
        console.log('2. Creating Program...');
        const program = await prisma.program.create({
            data: {
                name: 'Test Program',
                code: `TP-${generateId().toUpperCase()}`,
                departmentId: dept.id,
                durationYears: 4
            }
        });
        console.log(`✅ Program Created: ${program.code}`);

        // 3. Create Curriculum Version
        console.log('3. Creating Curriculum Version...');
        const version = await prisma.curriculumVersion.create({
            data: {
                versionName: 'v1.0',
                effectiveFrom: 2024,
                programId: program.id,
                isActive: true
            }
        });
        console.log(`✅ Curriculum Version Created: ${version.versionName}`);

        // 4. Create Subject
        console.log('4. Creating Subject...');
        const subject = await prisma.subject.create({
            data: {
                name: 'System Verification',
                code: `SV-${generateId().toUpperCase()}`,
                curriculumVersionId: version.id,
                semester: 1,
                credits: 4
            }
        });
        console.log(`✅ Subject Created: ${subject.code}`);

        // 5. Create Cohort
        console.log('5. Creating Cohort (Batch)...');
        const cohort = await prisma.cohort.create({
            data: {
                name: 'Test Batch 2024',
                year: 2024,
                programId: program.id,
                currentSemester: 1
            }
        });
        console.log(`✅ Cohort Created: ${cohort.name}`);

        // 6. Create Teacher
        console.log('6. Creating Teacher...');
        const teacherEmail = `teacher.test.${generateId()}@college.edu`;
        const teacher = await prisma.user.create({
            data: {
                email: teacherEmail,
                password: 'hashed_password_placeholder',
                fullName: 'Test Teacher',
                role: Role.TEACHER,
                departmentId: dept.id
            }
        });
        console.log(`✅ Teacher Created: ${teacher.email}`);

        // 7. Teacher Assignment
        console.log('7. Assigning Teacher to Subject...');
        const assignment = await prisma.teacherAssignment.create({
            data: {
                teacherId: teacher.id,
                subjectId: subject.id,
                cohortId: cohort.id,
                departmentId: dept.id,
                semester: 1,
                academicYear: '2024-25'
            }
        });
        console.log('✅ Teacher Assigned');

        // 8. Create Student
        console.log('8. Creating Student...');
        const studentEmail = `student.test.${generateId()}@college.edu`;
        const student = await prisma.user.create({
            data: {
                email: studentEmail,
                password: 'hashed_password_placeholder',
                fullName: 'Test Student',
                role: Role.STUDENT,
                departmentId: dept.id
            }
        });
        console.log(`✅ Student Created: ${student.email}`);

        // 9. Enroll Student
        console.log('9. Enrolling Student...');
        const enrollment = await prisma.studentEnrollment.create({
            data: {
                studentId: student.id,
                cohortId: cohort.id,
                departmentId: dept.id,
                rollNumber: `RN-${generateId().toUpperCase()}`,
                semester: 1
            }
        });
        console.log(`✅ Student Enrolled: ${enrollment.rollNumber}`);

        console.log('🎉 SMOKE TEST PASSED: All core entities created successfully.');

    } catch (error) {
        console.error('❌ SMOKE TEST FAILED');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

smokeTest();
