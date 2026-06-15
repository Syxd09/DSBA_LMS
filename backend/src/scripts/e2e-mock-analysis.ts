
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { calculateMarksComputed } from '../services/marks-computation.service';
import { getAtRiskStudentsCount } from '../controllers/student-analytics.controller';

const prisma = new PrismaClient();

async function deepAnalysis() {
    console.log('🔍 Starting Deep E2E Analysis...');
    
    // --- 0. CLEANUP PREVIOUS RUNS ---
    console.log('🧹 Cleaning up previous E2E data...');
    try {
        const oldDept = await prisma.department.findUnique({ where: { code: 'E2E' } });
        if (oldDept) {
            await prisma.marksComputed.deleteMany({ where: { student: { departmentId: oldDept.id } } });
            await prisma.studentMark.deleteMany({ where: { student: { departmentId: oldDept.id } } });
            await prisma.subQuestion.deleteMany({ where: { question: { section: { exam: { cohort: { program: { departmentId: oldDept.id } } } } } } });
            await prisma.question.deleteMany({ where: { section: { exam: { cohort: { program: { departmentId: oldDept.id } } } } } });
            await prisma.examSection.deleteMany({ where: { exam: { cohort: { program: { departmentId: oldDept.id } } } } });
            await prisma.exam.deleteMany({ where: { cohort: { program: { departmentId: oldDept.id } } } });
            await prisma.studentEnrollment.deleteMany({ where: { departmentId: oldDept.id } });
            await prisma.courseOutcome.deleteMany({ where: { subject: { curriculum: { program: { departmentId: oldDept.id } } } } });
            await prisma.subject.deleteMany({ where: { curriculum: { program: { departmentId: oldDept.id } } } });
            await prisma.curriculumVersion.deleteMany({ where: { program: { departmentId: oldDept.id } } });
            await prisma.cohort.deleteMany({ where: { program: { departmentId: oldDept.id } } });
            await prisma.program.deleteMany({ where: { departmentId: oldDept.id } });
            await prisma.user.deleteMany({ where: { departmentId: oldDept.id } });
            await prisma.department.delete({ where: { id: oldDept.id } });
        }
    } catch (cleanupErr) {
        console.log('   (Cleanup partial or skipped)');
    }

    const startTime = Date.now();

    try {
        // --- 1. SETUP CLEAN DATA ---
        const password = await bcrypt.hash('password123', 10);
        const dept = await prisma.department.upsert({
            where: { code: 'E2E' },
            update: {},
            create: { name: 'E2E Testing Dept', code: 'E2E' }
        });

        const prog = await prisma.program.upsert({
            where: { code: 'E2EP' },
            update: {},
            create: { name: 'E2E Program', code: 'E2EP', departmentId: dept.id }
        });

        const cv = await prisma.curriculumVersion.create({
            data: { programId: prog.id, versionName: 'E2E-CV', effectiveFrom: 2024 }
        });

        const cohort = await prisma.cohort.create({
            data: { name: 'E2E Cohort 2024', year: 2024, programId: prog.id, currentSemester: 1 }
        });

        const subject = await prisma.subject.create({
            data: { name: 'E2E Subject', code: 'E2ES1', credits: 4, semester: 1, curriculumVersionId: cv.id }
        });

        const co = await prisma.courseOutcome.create({
            data: { subjectId: subject.id, coNumber: 1, description: 'E2E CO1', bloomLevel: 'Apply' }
        });

        const teacher = await prisma.user.upsert({
            where: { email: 'e2e.teacher@test.com' },
            update: { departmentId: dept.id },
            create: { email: 'e2e.teacher@test.com', password, fullName: 'E2E Teacher', role: 'TEACHER', departmentId: dept.id }
        });

        const student = await prisma.user.upsert({
            where: { email: 'e2e.student@test.com' },
            update: { departmentId: dept.id },
            create: { email: 'e2e.student@test.com', password, fullName: 'E2E Student', role: 'STUDENT', departmentId: dept.id, registrationNumber: 'E2E-101' }
        });

        await prisma.studentEnrollment.create({
            data: { studentId: student.id, cohortId: cohort.id, departmentId: dept.id, semester: 1, status: 'active' } as any
        });

        // --- 2. EXAM & STRUCTURE ---
        const exam = await prisma.exam.create({
            data: {
                subjectId: subject.id,
                cohortId: cohort.id,
                examType: 'Internal 1',
                maxMarks: 10,
                semester: 1,
                teacherId: teacher.id,
                status: 'DRAFT'
            }
        });

        const section = await prisma.examSection.create({
            data: { examId: exam.id, name: 'Section A', sequence: 1, maxMarks: 10 }
        });

        const question = await prisma.question.create({
            data: { sectionId: section.id, sequence: 1, maxMarks: 10, coId: co.id, bloomLevel: 'Apply' }
        });

        const subQ = await prisma.subQuestion.create({
            data: { questionId: question.id, label: 'a', maxMarks: 10, coId: co.id, bloomLevel: 'Apply' }
        });

        // --- 3. MARKS ENTRY ---
        await prisma.studentMark.create({
            data: {
                examId: exam.id,
                studentId: student.id,
                subQuestionId: subQ.id,
                marks: 2,
                marksObtained: 2,
                enteredBy: teacher.id
            }
        });

        console.log('✅ Setup Complete. Proceeding to Analysis...');

        // --- 3.5 TRIGGER COMPUTATION ---
        console.log('⚡ Triggering Marks Computation...');
        await calculateMarksComputed(exam.id);

        // --- 4. ANALYSIS ---
        console.log('\n--- DATA INTEGRITY CHECK ---');
        
        const smCount = await prisma.studentMark.count({ where: { examId: exam.id } });
        console.log(`- StudentMark records: ${smCount} (Expected: 1)`);

        const cmCount = await prisma.marksComputed.count({ where: { examId: exam.id } });
        console.log(`- MarksComputed records: ${cmCount} (Expected: 1 if auto-computed)`);
        if (cmCount === 0) {
            console.log('⚠️  ANALYSIS ALERT: MarksComputed was NOT automatically populated.');
        }

        const coAttainment = await prisma.cOAttainment.findMany({ where: { examId_cohortId_coId_semester_academicYear: undefined as any } as any }); // dummy
        const realCoAttCount = await prisma.cOAttainment.count({ where: { subjectId: subject.id, cohortId: cohort.id } });
        console.log(`- COAttainment records: ${realCoAttCount} (Expected: 1 if published/calculated)`);

        const atRiskCount = await getAtRiskStudentsCount({ departmentId: dept.id });
        console.log(`- At-Risk Students matching Dept E2E: ${atRiskCount} (Expected: 1)`);

        console.log('\n--- ANALYTICS (AT RISK) CHECK ---');
        // Check if student risk calculation works without MarksComputed
        const riskData = await prisma.studentEnrollment.findFirst({
            where: { studentId: student.id }
        });

        console.log('\n--- CONCLUSION ---');
        if (cmCount === 0) {
            console.log('❌ GAP DETECTED: The system does not automatically populate Student Totals (MarksComputed).');
            console.log('   This means "At Risk Students" will be EMPTY in the dashboard.');
        } else {
            console.log('✅ System is correctly populating calculated tables.');
        }

    } catch (err) {
        console.error('❌ E2E Analysis Failed:', err);
    } finally {
        await prisma.$disconnect();
        console.log(`\nAnalysis finished in ${Date.now() - startTime}ms`);
    }
}

deepAnalysis();
