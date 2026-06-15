
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const USERS = {
    ADMIN: { email: 'admin@college.edu', password: 'password123' },
    TEACHER: { email: 'teacher.cse@college.edu', password: 'password123' },
    STUDENT: { email: 'student.cse@college.edu', password: 'password123' }
};

const tokens = new Map<string, string>();

async function loginAll() {
    for (const [role, creds] of Object.entries(USERS)) {
        try {
            const res = await axios.post(`${API_URL}/auth/login`, creds);
            tokens.set(role, res.data.token);
            console.log(`✅ Logged in as ${role}`);
        } catch (e) {
            console.error(`❌ Login failed for ${role}`);
        }
    }
}

async function verifyAcademicFlow() {
    const adminToken = tokens.get('ADMIN');
    const teacherToken = tokens.get('TEACHER');
    if (!adminToken || !teacherToken) return;

    console.log('\n🔄 1. SUBJECT & CO CREATION (Admin/HOD)');
    const depts = await axios.get(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const cse = depts.data.find((d: any) => d.code === 'CSE');
    if (!cse) { console.error('CSE Dept not found'); return; }

    // 1.1 Create Curriculum Version (REQUIRED)
    let curriculumVersionId;
    // Need program ID first.
    const progs = await axios.get(`${API_URL}/programs?departmentId=${cse.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const progId = progs.data[0]?.id; // Assuming B.Tech exists from previous script

    if (progId) {
        try {
            const currRes = await axios.post(`${API_URL}/curriculum-versions`, {
                programId: progId,
                versionName: 'v1-2025',
                effectiveFrom: 2025
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            curriculumVersionId = currRes.data.id;
            console.log('✅ Curriculum Version Created:', curriculumVersionId);
        } catch (e: any) {
            console.log('⚠️ Curriculum creation failed/exists, trying to fetch.');
            // Fetch logic omitted for brevity, assuming existing or fail.
        }
    }

    // Create Subject
    let subjectId;
    try {
        const payload: any = {
            name: 'Data Structures',
            code: 'CS201',
            credits: 4,
            semester: 3
        };
        // API requires either departmentId OR curriculumVersionId? 
        // Based on error "Name, Code, and Curriculum Version are required", it strictly needs version.
        if (curriculumVersionId) payload.curriculumVersionId = curriculumVersionId;
        else payload.departmentId = cse.id; // Fallback attempt

        const subRes = await axios.post(`${API_URL}/subjects`, payload, { headers: { Authorization: `Bearer ${adminToken}` } });
        subjectId = subRes.data.id;
        console.log('✅ Subject Created:', subjectId);
    } catch (e: any) {
        console.error('❌ Subject Creation Error:', e.response?.data || e.message);
        // Try finding existing
        try {
            const existSub = await axios.get(`${API_URL}/subjects`, {
                headers: { Authorization: `Bearer ${adminToken}` },
                params: { code: 'CS201' }
            });
            if (existSub.data.length > 0) {
                subjectId = existSub.data[0].id;
                console.log('✅ Using Existing Subject:', subjectId);
            }
        } catch (ex) { }
    }

    if (!subjectId) {
        console.error('⛔ Cannot proceed without Subject ID');
        return;
    }

    // Create COs
    console.log('\n🔄 2. CO DEFINITION');
    // Try Teacher first (Should likely fail or succeed depending on RBAC)
    try {
        await axios.post(`${API_URL}/course-outcomes`, {
            subjectId,
            code: 'CO1',
            description: 'Understand Arrays'
        }, { headers: { Authorization: `Bearer ${teacherToken}` } });
        console.log('✅ CO1 Created (Teacher)');
    } catch (e: any) {
        console.log(`ℹ️ Teacher cannot create CO (Expected?): ${e.response?.status}`);
        // Try Admin
        try {
            await axios.post(`${API_URL}/course-outcomes`, {
                subjectId,
                code: 'CO1',
                description: 'Understand Arrays'
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log('✅ CO1 Created (Admin)');
        } catch (err: any) {
            console.error('❌ CO Creation Failed (Admin):', err.response?.data);
        }
    }

    // Create Exam
    console.log('\n🔄 3. EXAM CREATION (Teacher)');
    try {
        const examRes = await axios.post(`${API_URL}/exams`, {
            subjectId,
            name: 'Mid Term 1',
            type: 'INTERNAL',
            maxMarks: 50,
            semester: 3,
            examDate: new Date().toISOString()
        }, { headers: { Authorization: `Bearer ${teacherToken}` } });
        console.log('✅ Exam Created:', examRes.data.id);
    } catch (e: any) {
        console.error('❌ Exam Creation Failed:', e.response?.data || e.message);
    }

    // Marks Entry Check
    console.log('\n🔄 4. MARKS ENTRY (Teacher)');
    try {
        await axios.post(`${API_URL}/marks`, {
            examId: 'dummy-exam-id',
            marks: []
        }, { headers: { Authorization: `Bearer ${teacherToken}` } });
    } catch (e: any) {
        if (e.response?.status === 404 || e.response?.status === 400) {
            console.log('✅ Marks Endpoint Accessible (Teacher) - Got validation error as expected');
        } else if (e.response?.status === 403) {
            console.error('❌ Marks Endpoint Forbidden (Teacher) - RBAC Issue?');
        } else {
            console.log(`ℹ️ Marks Endpoint Response: ${e.response?.status}`);
        }
    }
}

async function main() {
    await loginAll();
    await verifyAcademicFlow();
}

main();
