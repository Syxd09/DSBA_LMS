
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('⚠️  STARTING FULL DATABASE RESET  ⚠️');
    console.log('This will delete ALL data. Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        // 1. Transactional Data (Marks, Results, Feedback)
        console.log('Deleting Transactional Data...');
        await prisma.studentMark.deleteMany({});
        await prisma.marksComputed.deleteMany({});
        await prisma.examSnapshot.deleteMany({});
        await prisma.semesterResult.deleteMany({});
        await prisma.finalMark.deleteMany({});
        await prisma.feedback.deleteMany({});
        await prisma.marksUnlockRequest.deleteMany({});
        await prisma.approvalRequest.deleteMany({});

        // 2. Academic structure (Exams, Assignments, Attainment)
        console.log('Deleting Assignments & Exams...');
        // Delete sub-questions first
        await prisma.subQuestion.deleteMany({});
        await prisma.question.deleteMany({});
        await prisma.examSection.deleteMany({});
        await prisma.exam.deleteMany({});

        await prisma.teacherAssignment.deleteMany({});

        // Attainment
        await prisma.cOAttainment.deleteMany({});
        await prisma.pOAttainment.deleteMany({});
        await prisma.coPoMapping.deleteMany({});

        // 3. Outcomes & Subjects
        console.log('Deleting Outcomes & Subjects...');
        await prisma.courseOutcome.deleteMany({});
        await prisma.programOutcome.deleteMany({});
        await prisma.subject.deleteMany({});
        await prisma.curriculumVersion.deleteMany({});

        // 4. Enrollments & Cohorts
        console.log('Deleting Enrollments & Cohorts...');
        await prisma.studentEnrollment.deleteMany({});
        await prisma.cohort.deleteMany({});

        // 5. Programs & Departments
        console.log('Deleting Programs & Departments...');
        await prisma.program.deleteMany({});
        await prisma.gradingRule.deleteMany({});
        await prisma.department.deleteMany({});

        // 6. User Data
        console.log('Deleting Users & Logs...');
        await prisma.messageGroupMember.deleteMany({});
        await prisma.message.deleteMany({});
        await prisma.messageGroup.deleteMany({});

        // Nullify circular references before deletion if any (e.g., department.hodId)
        // Usually handled by ON DELETE SET NULL but Prisma might need manual help if strict
        // We deleted departments first, so HOD links shouldn't block user deletion if properly set up.
        // But Department -> User (hodId) and User -> Department (departmentId) is circular.
        // We deleted Department already. 
        // Wait, User references Department via departmentId (FK on User).
        // Department references User via hodId (FK on Department).
        // To delete Department, we effectively need to handle the User FK?
        // Actually, if we delete Department, users just lose their departmentId (if optional) or we delete users first?
        // User.departmentId is nullable? Yes.
        // Department.hodId is nullable? Yes.
        // We deleted Department in Step 5. If that succeeded, we are good.

        await prisma.auditLog.deleteMany({});
        await prisma.user.deleteMany({});

        console.log('✅ DATABASE FULLY RESET');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
