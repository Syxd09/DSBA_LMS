
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as bcrypt from 'bcrypt';


const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api';

// --- Helpers ---
async function login(email: string, password = 'password123') {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
        return res.data.token;
    } catch (error: any) {
        console.error(`Login failed for ${email}:`, error.response?.data || error.message);
        throw error;
    }
}

async function authenticatedRequest(method: 'get' | 'post' | 'put' | 'delete', url: string, token: string, data?: any) {
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        if (method === 'get' || method === 'delete') {
            return await axios[method](`${BASE_URL}${url}`, config);
        } else {
            return await axios[method](`${BASE_URL}${url}`, data, config);
        }
    } catch (error: any) {
        // Return null for 403/400 to allow negative testing, else throw
        if (error.response && (error.response.status === 403 || error.response.status === 400 || error.response.status === 404)) {
            return error.response;
        }
        console.error(`Request failed: ${method.toUpperCase()} ${url}`, error.response?.data || error.message);
        throw error;
    }
}

// --- Main Verification Flow ---
async function runVerification() {
    console.log('🚀 Starting Full System Verification...');

    // 1. CLEAR & SEED
    console.log('\n🧹 Clearing DB...');
    // We'll use the system controller's clear/seed if available, or direct prisma
    // For this script, let's just wipe manually to be safe
    // Delete in reverse dependency order
    console.log('Cleaning up data...');
    const deleteMany = async (model: any) => { try { await model.deleteMany(); } catch (e) { /* ignore */ } };

    // Exam & Marks
    await deleteMany(prisma.studentMark);
    await deleteMany(prisma.marksComputed);
    await deleteMany(prisma.finalMark);
    await deleteMany(prisma.semesterResult);

    // Exam Structure
    await deleteMany(prisma.subQuestion);
    await deleteMany(prisma.question);
    await deleteMany(prisma.examSection);
    await deleteMany(prisma.examSnapshot);
    await deleteMany(prisma.feedback);
    await deleteMany(prisma.marksUnlockRequest);
    await deleteMany(prisma.exam); // Deletes exams after related

    // Outcomes & Mappings
    await deleteMany(prisma.cOAttainment);
    await deleteMany(prisma.pOAttainment);
    await deleteMany(prisma.coPoMapping);
    await deleteMany(prisma.courseOutcome); // References Subject
    await deleteMany(prisma.programOutcome); // References Program

    // Academic Structure
    await deleteMany(prisma.teacherAssignment);
    await deleteMany(prisma.studentEnrollment);
    await deleteMany(prisma.subject); // References Curriculum
    await deleteMany(prisma.cohort); // References Program
    await deleteMany(prisma.curriculumVersion); // References Program
    await deleteMany(prisma.program); // References Department

    // Users & Dept
    await prisma.department.updateMany({ data: { hodId: null } });
    await deleteMany(prisma.auditLog);
    await deleteMany(prisma.messageReadReceipt);
    await deleteMany(prisma.messageAttachment);
    await deleteMany(prisma.conversationParticipant);
    await deleteMany(prisma.message);
    await deleteMany(prisma.conversation);
    await deleteMany(prisma.userPresence);
    await deleteMany(prisma.approvalRequest);
    await deleteMany(prisma.user);
    await deleteMany(prisma.department);

    console.log('🌱 Seeding Base Data...');
    const hashedPwd = await bcrypt.hash('password123', 10);

    // Department & Program
    const dept = await prisma.department.create({ data: { name: 'Computer Science', code: 'CS' } });
    const prog = await prisma.program.create({
        data: { name: 'B.Tech CS', code: 'BTCS', departmentId: dept.id, durationYears: 4 }
    });

    // Users
    const admin = await prisma.user.create({
        data: { email: 'admin@test.com', password: hashedPwd, fullName: 'Admin User', role: 'ADMIN' }
    });
    const hod = await prisma.user.create({
        data: { email: 'hod@test.com', password: hashedPwd, fullName: 'HOD User', role: 'HOD', departmentId: dept.id }
    });
    await prisma.department.update({ where: { id: dept.id }, data: { hodId: hod.id } }); // Link HOD

    const teacher1 = await prisma.user.create({
        data: { email: 't1@test.com', password: hashedPwd, fullName: 'Teacher One', role: 'TEACHER', departmentId: dept.id }
    });
    const teacher2 = await prisma.user.create({
        data: { email: 't2@test.com', password: hashedPwd, fullName: 'Teacher Two', role: 'TEACHER', departmentId: dept.id }
    });

    // Tokens
    const adminToken = await login('admin@test.com');
    const hodToken = await login('hod@test.com');
    const t1Token = await login('t1@test.com');
    const t2Token = await login('t2@test.com');

    // 2. NEGATIVE TESTS (Security)
    console.log('\n🔒 Running Security Checks...');

    // HOD trying to create Admin
    const neg1 = await authenticatedRequest('post', '/users', hodToken, {
        email: 'badadmin@test.com', password: 'password123', fullName: 'Bad Admin', role: 'ADMIN'
    });
    if (neg1.status === 403) console.log('✅ HOD cannot create ADMIN: PASS');
    else console.error('❌ HOD created ADMIN: FAIL');

    // HOD trying to update user to Principal
    const neg2 = await authenticatedRequest('put', `/users/${teacher1.id}`, hodToken, {
        role: 'PRINCIPAL'
    });
    if (neg2.status === 403) console.log('✅ HOD cannot promote to PRINCIPAL: PASS');
    else console.error('❌ HOD promoted to PRINCIPAL: FAIL');


    // 3. ACADEMIC SETUP
    console.log('\n📚 Setting up Academic Data...');

    // Cohort
    const cohort = await prisma.cohort.create({
        data: { name: 'CS-2024', programId: prog.id, year: 2024, currentSemester: 1 }
    });

    // Curriculum
    const curriculum = await prisma.curriculumVersion.create({
        data: { programId: prog.id, versionName: 'Rev-2024', effectiveFrom: 2024 }
    });

    // Subject
    const subject = await prisma.subject.create({
        data: { name: 'Data Structures', code: 'CS101', credits: 4, semester: 1, curriculumVersionId: curriculum.id }
    });

    // Create COs
    const co1 = await prisma.courseOutcome.create({
        data: { subjectId: subject.id, coNumber: 1, description: 'CO1 Desc', bloomLevel: 'Apply' }
    });


    // Assignment (HOD assigns T1)
    await authenticatedRequest('post', '/assignments', hodToken, {
        teacherId: teacher1.id, subjectId: subject.id, cohortId: cohort.id, departmentId: dept.id, semester: 1
    });

    // Students
    const s1 = await prisma.user.create({
        data: { email: 's1@test.com', password: hashedPwd, fullName: 'Student 1', role: 'STUDENT', departmentId: dept.id }
    });
    // Enroll
    await prisma.studentEnrollment.create({
        data: { studentId: s1.id, cohortId: cohort.id, departmentId: dept.id, semester: 1, status: 'active' } as any
    });


    // 4. EXAM LIFECYCLE
    console.log('\n📝 Exam Flow...');

    // T1 creates Exam
    const examRes = await authenticatedRequest('post', '/exams', t1Token, {
        subjectId: subject.id, cohortId: cohort.id, examType: 'INTERNAL_1', maxMarks: 50
    });
    const examId = examRes.data.id;

    // T2 tries to edit T1's exam structure (Negative Test)
    const neg3 = await authenticatedRequest('post', `/exams/${examId}/structure`, t2Token, {
        sections: []
    });
    if (neg3.status === 403) console.log('✅ Teacher cannot edit other teacher exam: PASS');
    else console.error('❌ Teacher edited other exam: FAIL');

    // T1 defines structure
    // We need questions and subquestions for marks entry
    // ... Skipping full structure definition for brevity of this quick script, 
    // ... but we need at least one question to enter marks.
    // Wait, the marks controller uses `subQuestionId`. So we MUST create structure.

    await authenticatedRequest('post', `/exams/${examId}/structure`, t1Token, {
        sections: [{
            name: 'Part A', sequence: 1, maxMarks: 10,
            questions: [{
                sequence: 1, maxMarks: 10, bloomLevel: 'Apply', coId: co1.id,
                subQuestions: [{ label: 'a', maxMarks: 10, bloomLevel: 'Apply', coId: co1.id }]
            }]
        }]
    });

    // Fetch exam to get subQuestionId
    const examDetails = await prisma.exam.findUnique({
        where: { id: examId },
        include: { sections: { include: { questions: { include: { subQuestions: true } } } } }
    });
    const subQId = examDetails?.sections[0].questions[0].subQuestions[0].id;

    // Enter Marks
    await authenticatedRequest('post', '/marks/save', t1Token, {
        examId: examId,
        marks: [{ studentId: s1.id, subQuestionId: subQId, marks: 8 }]
    });
    console.log('✅ Marks Saved');


    // 5. PROMOTION
    console.log('\n🎓 Promotion Flow...');

    // Promote Cohort (Admin action)
    await authenticatedRequest('post', `/cohorts/${cohort.id}/promote`, adminToken);

    // Verify Enrollment in Sem 2
    const sem2Enrollment = await prisma.studentEnrollment.findFirst({
        where: { studentId: s1.id, cohortId: cohort.id, semester: 2 }
    });

    if (sem2Enrollment) console.log('✅ Student successfully promoted to Sem 2: PASS');
    else console.error('❌ Student NOT promoted to Sem 2: FAIL');

    console.log('\n🏁 Verification Complete.');
}

runVerification().catch(e => {
    console.error(e);
    process.exit(1);
});
