import prisma from '../services/db';

async function main() {
    const teacherEmail = 'teacher1.cse@college.edu';
    const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
    
    if (!teacher) {
        console.log('Teacher not found');
        return;
    }

    const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: teacher.id },
        include: { subject: true, cohort: true }
    });

    console.log(`Assignments for ${teacherEmail}: ${assignments.length}`);
    
    for (const a of assignments) {
        console.log(`\nAssignment: ${a.subject.code} - ${a.cohort.name}`);
        console.log(`Assignment DeptID: ${a.departmentId}`);
        
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { cohortId: a.cohortId, semester: a.semester }
        });
        
        if (enrollment) {
            console.log(`Enrollment DeptID: ${enrollment.departmentId}`);
            if (enrollment.departmentId !== a.departmentId) {
                console.log('❌ MISMATCH FOUND');
            } else {
                console.log('✅ Match');
            }
        } else {
            console.log('No enrollments found for this assignment');
        }
    }
}

main().finally(() => prisma.$disconnect());
