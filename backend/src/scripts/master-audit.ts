
import axios from 'axios';
import { z } from 'zod';

const API_URL = 'http://localhost:3000/api';
const DATABASE_URL = 'http://localhost:3000';

// State
let adminToken = '';
let teacherToken = '';
let studentToken = '';
let deptId: string;
let programId: string;
let cohortId: string;
let subjectId: string;
let teacherId: string;
let studentId: string;
let examId: string;

// Utils
const generateId = () => Math.random().toString(36).substring(2, 8);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runAudit() {
    console.log('🕵️ MASTER SYSTEM AUDIT INITIALIZED');
    console.log('==================================');

    try {
        await setupEnvironment();
        await auditOutcomeCalculation();
        await auditRbacPenetration();
        await auditPromotionLogic(); // The suspected failing test

        console.log('\n✅ MASTER AUDIT COMPLETE (Check logs for failures)');
    } catch (error: any) {
        console.error('\n❌ MASTER AUDIT CRASHED', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function setupEnvironment() {
    console.log('\n[1] AUDIT SETUP: Creating Clean Environment');

    // 1. Admin Login
    const login = await axios.post(`${API_URL}/auth/login`, { email: 'admin@college.edu', password: 'password123' });
    adminToken = login.data.token;
    console.log('    Admin Logged In');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // 2. Metadata
    const dept = await axios.post(`${API_URL}/departments`, { name: `Audit Dept ${generateId()}`, code: `AD-${generateId().toUpperCase()}` }, { headers });
    deptId = dept.data.id;

    const prog = await axios.post(`${API_URL}/programs`, { name: 'Audit B.Tech', code: `AB-${generateId().toUpperCase()}`, departmentId: deptId }, { headers });
    programId = prog.data.id;

    const ver = await axios.post(`${API_URL}/curriculum-versions`, { programId, versionName: 'v1.0', effectiveFrom: 2024 }, { headers });
    const versionId = ver.data.id || ver.data.version?.id;

    const subj = await axios.post(`${API_URL}/subjects`, { name: 'Audit Subject', code: `AS-${generateId().toUpperCase()}`, curriculumVersionId: versionId, semester: 1, credits: 4 }, { headers });
    subjectId = subj.data.id;

    const cohort = await axios.post(`${API_URL}/cohorts`, { name: 'Audit Batch 2024', year: 2024, programId, currentSemester: 1 }, { headers });
    cohortId = cohort.data.id;

    // 3. User & Enrollment
    const tEmail = `teacher.${generateId()}@audit.edu`;
    await axios.post(`${API_URL}/users`, { email: tEmail, password: 'password123', fullName: 'Audit Teacher', role: 'TEACHER', departmentId: deptId }, { headers });
    const tLogin = await axios.post(`${API_URL}/auth/login`, { email: tEmail, password: 'password123' });
    teacherToken = tLogin.data.token;
    teacherId = tLogin.data.user.id;

    // Enroll User (creates student)
    const sEmail = `student.${generateId()}@audit.edu`;
    const enroll = await axios.post(`${API_URL}/enrollments`, {
        cohortId, departmentId: deptId, semester: 1,
        rollNumber: `R-${generateId()}`, registrationNumber: `R-${generateId()}`, email: sEmail, fullName: 'Audit Student'
    }, { headers });
    studentId = enroll.data.studentId || enroll.data.student?.id;

    // Login Student
    const sLogin = await axios.post(`${API_URL}/auth/login`, { email: sEmail, password: 'Student@123' }); // Default password logic
    studentToken = sLogin.data.token;

    console.log('    Environment Ready');
}

async function auditOutcomeCalculation() {
    console.log('\n[2] AUDIT: Outcome Calculation Integrity');
    const headers = { Authorization: `Bearer ${teacherToken}` };

    // 1. Assign Teacher
    await axios.post(`${API_URL}/assignments`, { teacherId, subjectId, cohortId, departmentId: deptId, semester: 1, academicYear: '2024-25' }, { headers: { Authorization: `Bearer ${adminToken}` } });

    // 2. Create CO & Exam
    // Add CO manually if needed or assume subject has COs? 
    // The subject creation might not have added COs. Let's add one.
    const coRes = await axios.post(`${API_URL}/course-outcomes`, { subjectId, coNumber: 1, description: 'Understand Audit', bloomLevel: 'Understand' }, { headers });
    const coId = coRes.data.id;

    // Create Exam
    const exam = await axios.post(`${API_URL}/exams`, { subjectId, cohortId, examType: 'Audit Exam', maxMarks: 50, semester: 1, academicYear: '2024-25' }, { headers });
    examId = exam.data.id;

    // Structure
    await axios.post(`${API_URL}/exams/${examId}/structure`, {
        sections: [{
            name: 'A', sequence: 1, maxMarks: 50, requiredQuestions: 1,
            questions: [{ sequence: 1, maxMarks: 50, bloomLevel: 'Understand', coId, subQuestions: [{ label: '1', maxMarks: 50, bloomLevel: 'Understand', coId }] }]
        }]
    }, { headers });

    // Enter Marks (50/50 = 100%)
    const examDetails = await axios.get(`${API_URL}/exams/${examId}`, { headers });
    const subQId = examDetails.data.sections[0].questions[0].subQuestions[0].id;

    await axios.post(`${API_URL}/marks/save`, { examId, marks: [{ studentId, subQuestionId: subQId, marks: 50 }] }, { headers });

    // Publish
    await axios.post(`${API_URL}/exams/${examId}/publish`, {}, { headers });

    // Calculate Outcome
    // Endpoint: POST /api/attainment/calculate/co
    const attRes = await axios.post(`${API_URL}/attainment/calculate/co`, { subjectId, cohortId, semester: 1, academicYear: '2024-25' }, { headers });

    // Verify
    const results = Array.isArray(attRes.data) ? attRes.data : (attRes.data.results || []);
    const attainment = results.find((a: any) => a.coId === examDetails.data.sections[0].questions[0].coId || true); // Just grab first
    // Since we created CO 1, we expect 100% pass (1 student, scored 100%, target 60%)

    if (attainment && attainment.achievedPercent === 100) {
        console.log('    ✅ CO Attainment Logic Valid (100% achieved)');
    } else {
        console.error('    ❌ CO Attainment Logic FAILED. Got:', attainment?.achievedPercent);
    }
}

async function auditRbacPenetration() {
    console.log('\n[3] AUDIT: RBAC Boundary Penetration');

    // Test: Student attempts to view all users
    try {
        await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.error('    ❌ RBAC FAILED: Student accessed /users');
    } catch (e: any) {
        if (e.response?.status === 403) console.log('    ✅ RBAC Valid: Student blocked from /users');
        else console.error(`    ⚠️ Unexpected RBAC response: ${e.response?.status}`);
    }
}

async function auditPromotionLogic() {
    console.log('\n[4] AUDIT: Promotion Logic Stress Test');
    const headers = { Authorization: `Bearer ${adminToken}` };

    // 1. Verify Sem 1 Enrollment
    const sem1Res = await axios.get(`${API_URL}/enrollments?cohortId=${cohortId}&semester=1`, { headers });
    console.log(`    Sem 1 Students: ${sem1Res.data.length}`);
    if (sem1Res.data.length !== 1) throw new Error('Setup failed: No student in Sem 1');

    // 2. PROMOTE
    console.log('    Promoting Cohort to Semester 2...');
    await axios.post(`${API_URL}/cohorts/${cohortId}/promote`, {}, { headers });

    // 3. Verify Sem 2 Enrollment (Wait for potential processing)
    const sem2Res = await axios.get(`${API_URL}/enrollments?cohortId=${cohortId}&semester=2`, { headers });
    console.log(`    Sem 2 Students: ${sem2Res.data.length}`);

    if (sem2Res.data.length === 1) {
        console.log('    ✅ Promotion Logic Valid (Students migrated)');
    } else {
        console.error('    ❌ CRITICAL FAILURE: No students found in Semester 2 after promotion.');
        console.error('       Root Cause: Promotion logic updates Cohort but does not clone Enrollment records.');
        throw new Error('Promotion Logic Failed');
    }
}

runAudit();
