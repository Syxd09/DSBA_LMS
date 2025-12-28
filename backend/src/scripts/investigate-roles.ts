
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const USERS = {
    PRINCIPAL: { email: 'principal@college.edu', password: 'password123' },
    HOD: { email: 'hod.cse@college.edu', password: 'password123' },
    TEACHER: { email: 'teacher.cse@college.edu', password: 'password123' },
    STUDENT: { email: 'student.cse@college.edu', password: 'password123' }
};

async function getToken(email: string, password: string) {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        return res.data.token;
    } catch (error: any) {
        console.error(`❌ Login failed for ${email}:`, error.response?.data?.message || error.message);
        return null;
    }
}

async function verifyPrincipal() {
    console.log('\n🕵️  [PRINCIPAL INVESTIGATION]');
    const token = await getToken(USERS.PRINCIPAL.email, USERS.PRINCIPAL.password);
    if (!token) return;

    // 1. Global View Access
    try {
        const depts = await axios.get(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`✅ [Principal] Can view all departments (${depts.data.length})`);
    } catch (err: any) { console.error('❌ [Principal] Dept View Failed:', err.message); }

    // 2. Unauthorized Action (Try to modify a mark directly - should fail or be restricted? Actually Principal might have power)
    // Let's try to delete a user which is an Admin action typically, or allowed for Principal?
    // Let's try something clearly unauthorized if any? Maybe accessing sys logs?
}

async function verifyHOD() {
    console.log('\n🕵️  [HOD INVESTIGATION]');
    const token = await getToken(USERS.HOD.email, USERS.HOD.password);
    if (!token) return;

    // 1. Dept Isolation
    try {
        const users = await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
        // Check if returns only own dept users? API might not filter yet (bug finding)
        console.log(`ℹ️ [HOD] Users visible: ${users.data.length}. (Check if filtered by Dept)`);
    } catch (err: any) { console.error('❌ [HOD] User View Failed:', err.message); }

    // 2. Assignment Creation
    // Need Subject ID and Cohort ID from previous script... 
    // We'll skip specific ID actions for this generic run unless we fetch them first.
}

async function verifyTeacher() {
    console.log('\n🕵️  [TEACHER INVESTIGATION]');
    const token = await getToken(USERS.TEACHER.email, USERS.TEACHER.password);
    if (!token) return;

    // 1. My Assignments
    try {
        const res = await axios.get(`${API_URL}/assignments`, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`✅ [Teacher] Can view assignments`);
    } catch (err: any) { console.error('❌ [Teacher] Assignments View Failed:', err.message); }

    // 2. Unauthorized Access (Try to see all users)
    try {
        await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
        console.error('❌ [Teacher] FAILED: Could access /users list (Should be blocked)');
    } catch (err: any) {
        if (err.response?.status === 403 || err.response?.status === 401)
            console.log('✅ [Teacher] Blocked from viewing all users (403)');
        else
            console.error(`❌ [Teacher] Unexpected error on /users: ${err.response?.status}`);
    }
}

async function verifyStudent() {
    console.log('\n🕵️  [STUDENT INVESTIGATION]');
    const token = await getToken(USERS.STUDENT.email, USERS.STUDENT.password);
    if (!token) return;

    // 1. Profile View
    try {
        const res = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`✅ [Student] Profile accessible`);
    } catch (err: any) { console.error('❌ [Student] Profile View Failed:', err.message); }

    // 2. Unauthorized Access (Try to create exam)
    try {
        await axios.post(`${API_URL}/exams`, {}, { headers: { Authorization: `Bearer ${token}` } });
        console.error('❌ [Student] FAILED: Could access /exams creation (Should be blocked)');
    } catch (err: any) {
        if (err.response?.status === 403 || err.response?.status === 401)
            console.log('✅ [Student] Blocked from creating exams (403)');
        else
            console.error(`❌ [Student] Unexpected error on /exams: ${err.response?.status}`);
    }
}

async function main() {
    await verifyPrincipal();
    await verifyHOD();
    await verifyTeacher();
    await verifyStudent();
}

main();
