
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const DATABASE_URL = 'http://localhost:3000';

// Utils
const generateId = () => Math.random().toString(36).substring(2, 8);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// State
let adminToken = '';
let teacherToken = '';
let studentToken = '';
let studentEmail = ''; // Stored for enrollment

// Test Data IDs
let deptId: string;
let programId: string;
let cohortId: string;
let subjectId: string;
let teacherId: string;
let studentId: string;
let examId: string;

async function runTests() {
    console.log('🚀 STARTING FULL SYSTEM TEST SUITE');
    console.log('==================================');

    try {
        await checkHealth();
        await testAuth();
        await testMetadataCreation();
        await testUserCreation();
        await testWorkflowSetup();
        await testRbac();
        await testEdgeCases();
        await testWorkflowExecution();

        console.log('\n✅ ALL SYSTEM TESTS PASSED SUCCESSFULLY');
    } catch (error: any) {
        console.error('\n❌ SYSTEM TEST FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

async function checkHealth() {
    console.log('\n[1] Health Check');
    try {
        const res = await axios.get(`${DATABASE_URL}/health`);
        console.log(`    Status: ${res.data.status}`);
        if (res.data.status === 'healthy') console.log('✅ Server is healthy');
        else {
            console.error('    Response:', JSON.stringify(res.data));
            throw new Error(`Server unhealthy: ${res.data.status}`);
        }
    } catch (e: any) {
        console.error('    Check Failed:', e.message);
        throw e;
    }
}

async function testAuth() {
    console.log('\n[2] Authentication Testing');
    const res = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@college.edu',
        password: 'Admin@123'
    });
    adminToken = res.data.token;
    console.log('✅ Admin Login Successful');
}

async function testMetadataCreation() {
    console.log('\n[3] Metadata Creation (Admin)');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Create Dept
    console.log('   -> Creating Department...');
    const deptRes = await axios.post(`${API_URL}/departments`, {
        name: `Test Dept ${generateId()}`,
        code: `TD-${generateId().toUpperCase()}`
    }, { headers });
    deptId = deptRes.data.id;
    console.log(`      ✅ ID: ${deptId}`);

    // Create Program
    console.log('   -> Creating Program...');
    const progRes = await axios.post(`${API_URL}/programs`, {
        name: 'Test Program B.Tech',
        code: `TP-${generateId().toUpperCase()}`,
        departmentId: deptId,
        durationYears: 4
    }, { headers });
    programId = progRes.data.id;
    console.log(`      ✅ ID: ${programId}`);

    // Create Curriculum
    console.log('   -> Creating Curriculum...');
    const verRes = await axios.post(`${API_URL}/curriculum-versions`, {
        programId: programId,
        versionName: 'v1.0',
        effectiveFrom: 2024
    }, { headers });
    const versionId = verRes.data.id || verRes.data.version?.id;
    console.log(`      ✅ ID: ${versionId}`);

    // Create Subject
    console.log('   -> Creating Subject...');
    const subjRes = await axios.post(`${API_URL}/subjects`, {
        name: 'System Test Subject',
        code: `STS-${generateId().toUpperCase()}`,
        curriculumVersionId: versionId,
        semester: 1,
        credits: 4
    }, { headers });
    subjectId = subjRes.data.id;
    console.log(`      ✅ ID: ${subjectId}`);

    // Create Cohort
    console.log('   -> Creating Cohort...');
    const cohortRes = await axios.post(`${API_URL}/cohorts`, {
        name: 'Batch 2024',
        year: 2024,
        programId: programId,
        currentSemester: 1
    }, { headers });
    cohortId = cohortRes.data.id;
    console.log(`      ✅ ID: ${cohortId}`);
}

async function testUserCreation() {
    console.log('\n[4] User Creation');
    const headers = { Authorization: `Bearer ${adminToken}` };

    // Create Teacher
    const tEmail = `teacher.${generateId()}@college.edu`;
    const tPass = 'password123';
    console.log('   -> Creating Teacher...');
    await axios.post(`${API_URL}/users`, {
        email: tEmail,
        password: tPass,
        fullName: 'Test Teacher',
        role: 'TEACHER',
        departmentId: deptId
    }, { headers });

    // Login Teacher
    const tLogin = await axios.post(`${API_URL}/auth/login`, { email: tEmail, password: tPass });
    teacherToken = tLogin.data.token;
    teacherId = tLogin.data.user.id;
    console.log('      ✅ Teacher Created & Logged In');

    // Create Student
    const sEmail = `student.${generateId()}@college.edu`;
    studentEmail = sEmail; // Capture email
    const sPass = 'password123';
    console.log('   -> Creating Student...');
    const sRes = await axios.post(`${API_URL}/users`, {
        email: sEmail,
        password: sPass,
        fullName: 'Test Student',
        role: 'STUDENT',
        departmentId: deptId
    }, { headers });
    studentId = sRes.data.id;

    // Login Student
    const sLogin = await axios.post(`${API_URL}/auth/login`, { email: sEmail, password: sPass });
    studentToken = sLogin.data.token;
    console.log('      ✅ Student Created & Logged In');
}

function validateState() {
    console.log('\n[DEBUG] Validating State...');
    const ids = { deptId, programId, cohortId, subjectId, teacherId, studentId, teacherToken, studentToken, studentEmail };
    let missing = [];
    for (const [key, val] of Object.entries(ids)) {
        if (!val) missing.push(key);
        else console.log(`      Found ${key}: ${val.substring(0, 8)}...`);
    }
    if (missing.length > 0) {
        throw new Error(`MISSING IDs: ${missing.join(', ')}`);
    }
    console.log('      ✅ State Valid');
}

async function testWorkflowSetup() {
    validateState();
    console.log('\n[5] Workflow Setup');
    const headers = { Authorization: `Bearer ${adminToken}` };

    // Assign Teacher
    console.log('   -> Assigning Teacher...');
    // Note: assignments route was patched to use 'all' for validation
    await axios.post(`${API_URL}/assignments`, {
        teacherId: teacherId,
        subjectId: subjectId,
        cohortId: cohortId,
        departmentId: deptId,
        semester: 1,
        academicYear: '2024-25'
    }, { headers });
    console.log('      ✅ Teacher Assigned');

    // Enroll Student (Requires email/fullName as per schema)
    console.log('   -> Enrolling Student...');
    // Note: enrollments route was patched to use 'all' for validation
    // Removing studentId, Adding email/fullName
    await axios.post(`${API_URL}/enrollments`, {
        cohortId: cohortId,
        departmentId: deptId,
        rollNumber: `RN-${generateId().toUpperCase()}`,
        semester: 1,
        email: studentEmail,
        fullName: 'Test Student'
    }, { headers });
    console.log('      ✅ Student Enrolled');
}

async function testRbac() {
    console.log('\n[6] RBAC Security Testing');

    // 1. Student tries to create Department
    try {
        await axios.post(`${API_URL}/departments`, {
            name: 'Hacker Dept',
            code: 'HACK'
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        throw new Error('❌ RBAC FAIL: Student created department');
    } catch (e: any) {
        if (e.response && e.response.status === 403) console.log('   ✅ RBAC Pass: Student blocked from creating Dept');
        else throw e;
    }

    // 2. Teacher tries to create Course
    try {
        await axios.post(`${API_URL}/programs`, {
            name: 'Hacker Prog',
            code: 'HKP',
            departmentId: deptId
        }, { headers: { Authorization: `Bearer ${teacherToken}` } });
        throw new Error('❌ RBAC FAIL: Teacher created program');
    } catch (e: any) {
        if (e.response && e.response.status === 403) console.log('   ✅ RBAC Pass: Teacher blocked from creating Program');
        else throw e;
    }
}

async function testEdgeCases() {
    console.log('\n[7] Edge Cases & Data Integrity');
    const headers = { Authorization: `Bearer ${adminToken}` };

    // 1. Duplicate Email
    try {
        await axios.post(`${API_URL}/users`, {
            email: 'admin@college.edu',
            password: 'password123',
            fullName: 'Fake Admin',
            role: 'STUDENT'
        }, { headers });
        throw new Error('❌ DB Integrity FAIL: Duplicate email allowed');
    } catch (e: any) {
        if (e.response && (e.response.status === 400 || e.response.status === 500))
            console.log('   ✅ DB Integrity Pass: Duplicate email blocked');
        else throw e;
    }

    // 2. Invalid Login
    try {
        await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@college.edu',
            password: 'WraongPassword'
        });
        throw new Error('❌ Auth FAIL: Wrong password allowed');
    } catch (e: any) {
        if (e.response && e.response.status === 401) console.log('   ✅ Auth Pass: Invalid credentials blocked');
        else throw e;
    }
}

async function testWorkflowExecution() {
    console.log('\n[8] Academic Workflow Execution');
    const headers = { Authorization: `Bearer ${teacherToken}` };

    // 1. Create Exam (Internal 1)
    console.log('   -> Creating Exam...');
    const examRes = await axios.post(`${API_URL}/exams`, {
        subjectId: subjectId,
        cohortId: cohortId,
        examType: 'Internal 1',
        maxMarks: 50
    }, { headers });
    examId = examRes.data.id;
    console.log('      ✅ Exam Created (Internal 1)');

    // 2. Define Exam Structure
    console.log('   -> Defining Structure...');
    await axios.put(`${API_URL}/exams/${examId}/structure`, {
        sections: [{
            name: 'Part A',
            sequence: 1,
            maxMarks: 50,
            questions: [{
                sequence: 1,
                maxMarks: 50,
                bloomLevel: 'Apply',
                isOptional: false,
                subQuestions: [{
                    label: 'a',
                    maxMarks: 50,
                    bloomLevel: 'Apply'
                }]
            }]
        }]
    }, { headers });
    console.log('      ✅ Structure Defined');

    // 3. Enter Marks
    console.log('   -> Entering Marks...');
    const examDetails = await axios.get(`${API_URL}/exams/${examId}`, { headers });
    const section = examDetails.data.sections[0];
    const question = section.questions[0];
    const subQuestionId = question.subQuestions?.[0]?.id || question.id; // Handle subQuestions

    await axios.post(`${API_URL}/marks/save`, {
        examId: examId,
        marks: [{
            studentId: studentId, // Student ID from earlier
            subQuestionId: subQuestionId,
            marks: 45
        }]
    }, { headers });
    console.log('      ✅ Marks Entered Successfully');
}

runTests();
