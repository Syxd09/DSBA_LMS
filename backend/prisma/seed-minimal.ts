
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting Database Cleanup...');

    // Delete all data in correct order (respecting foreign key constraints)
    const deleteMany = async (model: any, name: string) => {
        try {
            const result = await model.deleteMany();
            console.log(`✅ Deleted ${name}`);
            return result;
        } catch (e) {
            console.log(`⚠️  Could not delete ${name}:`, e);
        }
    };

    // Delete child records first
    await deleteMany(prisma.studentMark, 'Student Marks');
    await deleteMany(prisma.marksComputed, 'Computed Marks');
    await deleteMany(prisma.finalMark, 'Final Marks');
    await deleteMany(prisma.semesterResult, 'Semester Results');
    await deleteMany(prisma.subQuestion, 'Sub Questions');
    await deleteMany(prisma.question, 'Questions');
    await deleteMany(prisma.examSection, 'Exam Sections');
    await deleteMany(prisma.examSnapshot, 'Exam Snapshots');
    await deleteMany(prisma.feedback, 'Feedback');
    await deleteMany(prisma.marksUnlockRequest, 'Marks Unlock Requests');
    await deleteMany(prisma.exam, 'Exams');

    await deleteMany(prisma.cOAttainment, 'CO Attainments');
    await deleteMany(prisma.pOAttainment, 'PO Attainments');
    await deleteMany(prisma.coPoMapping, 'CO-PO Mappings');
    await deleteMany(prisma.courseOutcome, 'Course Outcomes');
    await deleteMany(prisma.programOutcome, 'Program Outcomes');

    await deleteMany(prisma.teacherAssignment, 'Teacher Assignments');
    await deleteMany(prisma.studentEnrollment, 'Student Enrollments');
    await deleteMany(prisma.subject, 'Subjects');
    await deleteMany(prisma.cohort, 'Cohorts');
    await deleteMany(prisma.curriculumVersion, 'Curriculum Versions');
    await deleteMany(prisma.program, 'Programs');

    // Clear hodId references before deleting users
    await prisma.department.updateMany({ data: { hodId: null } });
    console.log('✅ Cleared HOD references');

    await deleteMany(prisma.auditLog, 'Audit Logs');
    await deleteMany(prisma.message, 'Messages');
    await deleteMany(prisma.messageGroupMember, 'Message Group Members');
    await deleteMany(prisma.messageGroup, 'Message Groups');
    await deleteMany(prisma.approvalRequest, 'Approval Requests');
    await deleteMany(prisma.user, 'Users');
    await deleteMany(prisma.department, 'Departments');

    console.log('\n✨ Database cleaned successfully!\n');

    // Create password hash
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create only 2 users
    const admin = await prisma.user.create({
        data: {
            email: 'admin@college.edu',
            fullName: 'System Admin',
            password: hashedPassword,
            role: Role.ADMIN,
        },
    });
    console.log(`✅ Created user: ${admin.email} (${admin.role})`);

    const principal = await prisma.user.create({
        data: {
            email: 'principal@college.edu',
            fullName: 'Principal User',
            password: hashedPassword,
            role: Role.PRINCIPAL,
        },
    });
    console.log(`✅ Created user: ${principal.email} (${principal.role})`);

    console.log('\n🎉 Minimal seed completed! Only 2 users created.');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin     - admin@college.edu / password123');
    console.log('   Principal - principal@college.edu / password123');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
