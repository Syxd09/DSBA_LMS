
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'teacher.1cse@college.edu';
    console.log(`Checking data for teacher: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            teacherAssignments: {
                include: {
                    cohort: true,
                    subject: true,
                    department: true
                }
            }
        }
    });

    if (!user) {
        console.log('Teacher not found');
        return;
    }

    console.log(`Teacher ID: ${user.id}`);
    console.log(`Role: ${user.role}`);
    console.log(`Assignments Count: ${user.teacherAssignments.length}`);

    for (const a of user.teacherAssignments) {
        console.log(`\nAssignment ID: ${a.id}`);
        console.log(`  Subject: ${a.subject.name} (${a.subject.code})`);
        console.log(`  Cohort: ${a.cohort.name} (ID: ${a.cohortId})`);
        console.log(`  Semester: ${a.semester}`);
        console.log(`  Department: ${a.department.name} (ID: ${a.departmentId})`);

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                cohortId: a.cohortId,
                semester: a.semester
            },
            include: {
                student: {
                    select: {
                        fullName: true,
                        registrationNumber: true,
                        isActive: true
                    }
                }
            }
        });

        console.log(`  Enrollments for this Cohort/Semester: ${enrollments.length}`);
        if (enrollments.length > 0) {
            console.log(`  First 5 students:`);
            enrollments.slice(0, 5).forEach(e => {
                console.log(`    - ${e.student.fullName} (${e.student.registrationNumber}) [Active: ${e.student.isActive}]`);
            });
        } else {
            // Check if there are ANY enrollments for this cohort regardless of semester
            const totalCohortEnrollments = await prisma.studentEnrollment.count({
                where: { cohortId: a.cohortId }
            });
            console.log(`  Total enrollments for this Cohort across ALL semesters: ${totalCohortEnrollments}`);
            
            if (totalCohortEnrollments > 0) {
                const sample = await prisma.studentEnrollment.findFirst({
                   where: { cohortId: a.cohortId },
                   select: { semester: true }
                });
                console.log(`  Example students in this cohort are in Semester: ${sample?.semester}`);
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
