import prisma from '../services/db';

async function main() {
    const email = 'teacher1.cse@college.edu';
    console.log(`\n🔍 Debugging assignments for: ${email}`);
    
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            teacherAssignments: {
                include: { cohort: true, subject: true }
            }
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('--- Teacher info ---');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`FullName: ${user.fullName}`);
    console.log(`Assignments Found: ${user.teacherAssignments.length}`);
    
    for (const a of user.teacherAssignments) {
        console.log(`\n📍 Assignment: ${a.subject.code} (${a.subject.name})`);
        console.log(`   Cohort: ${a.cohort.name} (ID: ${a.cohortId})`);
        console.log(`   Semester: ${a.semester}`);
        
        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                cohortId: a.cohortId,
                semester: a.semester
            },
            include: { student: true }
        });
        
        console.log(`   ✅ Students found in this cohort/sem: ${enrollments.length}`);
        if (enrollments.length > 0) {
            console.log(`   Sample students:`);
            enrollments.slice(0, 3).forEach(e => {
                console.log(`     - ${e.student.fullName} (${e.student.registrationNumber})`);
            });
        } else {
            console.log(`   ⚠️ WARNING: No student enrollments found for this cohort in semester ${a.semester}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
