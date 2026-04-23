
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Controlled Data Setup...');

    // --- 1. CLEANUP ---
    console.log('\n🧹 Cleaning Database...');
    const deleteMany = async (model: any) => { try { await model.deleteMany(); } catch (e) { /* ignore */ } };

    await deleteMany(prisma.studentMark);
    await deleteMany(prisma.marksComputed);
    await deleteMany(prisma.finalMark);
    await deleteMany(prisma.semesterResult);
    await deleteMany(prisma.subQuestion);
    await deleteMany(prisma.question);
    await deleteMany(prisma.examSection);
    await deleteMany(prisma.examSnapshot);
    await deleteMany(prisma.messageReadReceipt);
    await deleteMany(prisma.messageAttachment);
    await deleteMany(prisma.conversationParticipant);
    await deleteMany(prisma.message);
    await deleteMany(prisma.conversation);
    await deleteMany(prisma.marksUnlockRequest);
    await deleteMany(prisma.exam);

    await deleteMany(prisma.cOAttainment);
    await deleteMany(prisma.pOAttainment);
    await deleteMany(prisma.coPoMapping);
    await deleteMany(prisma.courseOutcome);
    await deleteMany(prisma.programOutcome);

    await deleteMany(prisma.teacherAssignment);
    await deleteMany(prisma.studentEnrollment);
    await deleteMany(prisma.subject);
    await deleteMany(prisma.cohort);
    await deleteMany(prisma.curriculumVersion);
    await deleteMany(prisma.program);

    await prisma.department.updateMany({ data: { hodId: null } });
    await deleteMany(prisma.auditLog);
    await deleteMany(prisma.userPresence);
    await deleteMany(prisma.approvalRequest);
    await deleteMany(prisma.user);
    await deleteMany(prisma.department);
    console.log('✅ Cleanup Complete.');

    const password = await bcrypt.hash('password123', 10);

    // --- 2. DEPARTMENTS & PROGRAMS ---
    console.log('\nBuilding Academic Structure...');

    // Depts
    const deptCA = await prisma.department.create({ data: { name: 'Computer Applications', code: 'CA' } });
    const deptCom = await prisma.department.create({ data: { name: 'Commerce', code: 'COM' } });
    const deptMgmt = await prisma.department.create({ data: { name: 'Management', code: 'MGMT' } });

    // Programs
    const bca = await prisma.program.create({ data: { name: 'BCA', code: 'BCA', departmentId: deptCA.id, durationYears: 3 } });
    const bcom = await prisma.program.create({ data: { name: 'BCom', code: 'BCOM', departmentId: deptCom.id, durationYears: 3 } });
    const bba = await prisma.program.create({ data: { name: 'BBA', code: 'BBA', departmentId: deptMgmt.id, durationYears: 3 } });

    // Admin User (System Admin)
    await prisma.user.create({
        data: { email: 'admin@test.com', password, fullName: 'System Admin', role: 'ADMIN' }
    });

    // --- 3. COHORTS ---
    // Mapping: 2023->Sem5, 2024->Sem3, 2025->Sem1
    const createCohorts = async (prog: any, codePrefix: string) => {
        const c23 = await prisma.cohort.create({ data: { name: `${codePrefix} 2023`, year: 2023, programId: prog.id, currentSemester: 5 } });
        const c24 = await prisma.cohort.create({ data: { name: `${codePrefix} 2024`, year: 2024, programId: prog.id, currentSemester: 3 } });
        const c25 = await prisma.cohort.create({ data: { name: `${codePrefix} 2025`, year: 2025, programId: prog.id, currentSemester: 1 } });
        return { c23, c24, c25 };
    };

    const bcaCohorts = await createCohorts(bca, 'BCA');
    const bcomCohorts = await createCohorts(bcom, 'BCom');
    const bbaCohorts = await createCohorts(bba, 'BBA');

    // --- 4. HODs ---
    const createHOD = async (email: string, name: string, deptId: string) => {
        const user = await prisma.user.create({
            data: { email, password, fullName: name, role: 'HOD', departmentId: deptId }
        });
        await prisma.department.update({ where: { id: deptId }, data: { hodId: user.id } });
        return user;
    };

    await createHOD('hod.bca@test.com', 'HOD BCA', deptCA.id);
    await createHOD('hod.bcom@test.com', 'HOD BCom', deptCom.id);
    await createHOD('hod.bba@test.com', 'HOD BBA', deptMgmt.id);

    // --- 5. CURRICULUM, SUBJECTS, COs, POs ---
    // Minimal setup for Verification

    // Helper to create subject & COs
    const createSubject = async (cvId: string, code: string, name: string, sem: number, deptId: string) => {
        const sub = await prisma.subject.create({
            data: { name, code, credits: 4, semester: sem, curriculumVersionId: cvId }
        });
        // Create 5 COs
        for (let i = 1; i <= 5; i++) {
            await prisma.courseOutcome.create({
                data: { subjectId: sub.id, coNumber: i, description: `${code} CO${i}`, bloomLevel: 'Apply' }
            });
        }
        return sub;
    };

    // Helper to setup program foundation
    const setupProgramFoundation = async (prog: any, deptId: string) => {
        // CV
        const cv = await prisma.curriculumVersion.create({
            data: { programId: prog.id, versionName: 'Rev-2023', effectiveFrom: 2023 }
        });
        // POs (1-10)
        for (let i = 1; i <= 10; i++) {
            await prisma.programOutcome.create({
                data: { programId: prog.id, poNumber: i, description: `${prog.code} PO${i}` }
            });
        }
        return cv;
    };

    const bcaCV = await setupProgramFoundation(bca, deptCA.id);
    const bcomCV = await setupProgramFoundation(bcom, deptCom.id);
    const bbaCV = await setupProgramFoundation(bba, deptMgmt.id);

    // --- 6. TEACHERS & ASSIGNMENTS ---
    console.log('\nCreating Teachers & Assignments...');

    const createTeacher = async (email: string, name: string, deptId: string) => {
        return await prisma.user.create({
            data: { email, password, fullName: name, role: 'TEACHER', departmentId: deptId }
        });
    };

    const assign = async (teacherId: string, subjectId: string, cohortId: string, deptId: string, sem: number) => {
        await prisma.teacherAssignment.create({
            data: { teacherId, subjectId, cohortId, departmentId: deptId, semester: sem, academicYear: '2025-26' }
        });
    };

    // BCA Teachers
    const tA = await createTeacher('teacher.a@test.com', 'Teacher A', deptCA.id);
    const subNet = await createSubject(bcaCV.id, 'BCA301', 'Computer Networks', 3, deptCA.id); // Sem 3
    await assign(tA.id, subNet.id, bcaCohorts.c24.id, deptCA.id, 3); // 2024 is Sem 3

    const tB = await createTeacher('teacher.b@test.com', 'Teacher B', deptCA.id);
    const subDBMS = await createSubject(bcaCV.id, 'BCA101', 'DBMS', 1, deptCA.id); // Sem 1 (Wait, DBMS in Sem 1? User said Sem 1 + 3, assuming distinct subs or same sub different cohort. Let's do distinct for clarity or same logic. User said: Teacher B -> DBMS -> Sem 1 + Sem 3. Usually DBMS is one sem. I will assign DBMS to Sem 1 Cohort, and maybe DBMS_Adv to Sem 3 Cohort to follow "Teacher B -> DBMS" theme but verify multi-sem capability. Or simply assign DBMS to both (if curriculum allows). Let's assuming distinct subjects for academic logic: DBMS I (Sem 1) and DBMS II (Sem 3) to satisfy "DBMS -> Sem 1 + Sem 3" request strictly)
    // Actually, let's make it creating subjects per request precisely.
    // User: Teacher B -> DBMS -> Sem 1 + Sem 3. 
    // I will create DBMS for Sem 1. And Advance DBMS for Sem 3.
    const subDBMS1 = await createSubject(bcaCV.id, 'BCA102', 'DBMS', 1, deptCA.id);
    const subDBMS2 = await createSubject(bcaCV.id, 'BCA302', 'Adv DBMS', 3, deptCA.id);
    await assign(tB.id, subDBMS1.id, bcaCohorts.c25.id, deptCA.id, 1); // 2025 is Sem 1
    await assign(tB.id, subDBMS2.id, bcaCohorts.c24.id, deptCA.id, 3); // 2024 is Sem 3

    const tC = await createTeacher('teacher.c@test.com', 'Teacher C', deptCA.id);
    const subOS = await createSubject(bcaCV.id, 'BCA501', 'Operating Systems', 5, deptCA.id);
    await assign(tC.id, subOS.id, bcaCohorts.c23.id, deptCA.id, 5); // 2023 is Sem 5

    // BCom Teachers
    const tD = await createTeacher('teacher.d@test.com', 'Teacher D', deptCom.id);
    const subAcc = await createSubject(bcomCV.id, 'BCOM101', 'Financial Accounting', 1, deptCom.id);
    await assign(tD.id, subAcc.id, bcomCohorts.c25.id, deptCom.id, 1);

    const tE = await createTeacher('teacher.e@test.com', 'Teacher E', deptCom.id);
    const subEco = await createSubject(bcomCV.id, 'BCOM301', 'Business Economics', 3, deptCom.id);
    await assign(tE.id, subEco.id, bcomCohorts.c24.id, deptCom.id, 3);

    // BBA Teachers
    const tF = await createTeacher('teacher.f@test.com', 'Teacher F', deptMgmt.id);
    const subMgmt = await createSubject(bbaCV.id, 'BBA101', 'Principles of Mgmt', 1, deptMgmt.id);
    await assign(tF.id, subMgmt.id, bbaCohorts.c25.id, deptMgmt.id, 1);

    const tG = await createTeacher('teacher.g@test.com', 'Teacher G', deptMgmt.id);
    // Marketing Sem 3 + Sem 5
    const subMkt3 = await createSubject(bbaCV.id, 'BBA301', 'Marketing Mgmt', 3, deptMgmt.id);
    const subMkt5 = await createSubject(bbaCV.id, 'BBA501', 'Adv Marketing', 5, deptMgmt.id);
    await assign(tG.id, subMkt3.id, bbaCohorts.c24.id, deptMgmt.id, 3);
    await assign(tG.id, subMkt5.id, bbaCohorts.c23.id, deptMgmt.id, 5);


    // --- 7. STUDENTS ---
    console.log('\nCreating Students...');
    // 10 students per cohort

    const enrollStudents = async (cohort: any, deptId: string, sem: number, prefix: string) => {
        for (let i = 1; i <= 10; i++) {
            const email = `${prefix.toLowerCase()}${cohort.year}.${i}@test.com`;
            const registrationNumber = `${prefix}-${cohort.year}-${String(i).padStart(3, '0')}`;
            const user = await prisma.user.create({
                data: { 
                    email, 
                    password, 
                    fullName: `${prefix} Student ${cohort.year} - ${i}`, 
                    role: 'STUDENT', 
                    departmentId: deptId,
                    registrationNumber
                }
            });
            await prisma.studentEnrollment.create({
                data: {
                    studentId: user.id,
                    cohortId: cohort.id,
                    departmentId: deptId,
                    semester: sem,
                    status: 'active'
                } as any
            });
        }
    };

    // BCA Enrollment
    await enrollStudents(bcaCohorts.c25, deptCA.id, 1, 'BCA');
    await enrollStudents(bcaCohorts.c24, deptCA.id, 3, 'BCA');
    await enrollStudents(bcaCohorts.c23, deptCA.id, 5, 'BCA');

    // BCom Enrollment
    await enrollStudents(bcomCohorts.c25, deptCom.id, 1, 'BCom');
    await enrollStudents(bcomCohorts.c24, deptCom.id, 3, 'BCom');
    await enrollStudents(bcomCohorts.c23, deptCom.id, 5, 'BCom');

    // BBA Enrollment
    await enrollStudents(bbaCohorts.c25, deptMgmt.id, 1, 'BBA');
    await enrollStudents(bbaCohorts.c24, deptMgmt.id, 3, 'BBA');
    await enrollStudents(bbaCohorts.c23, deptMgmt.id, 5, 'BBA');

    console.log('\n✅ Controlled Data Setup Completed Successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
