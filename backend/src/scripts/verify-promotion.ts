
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const generateId = () => Math.random().toString(36).substring(2, 8);

async function run() {
    console.log('🚀 Starting Promotion Logic Verification...');

    try {
        // 1. Login as Admin
        const login = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@college.edu',
            password: 'password123'
        });
        const token = login.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('✅ Admin Logged In');

        // 2. Create Dept & Program
        const dept = await axios.post(`${API_URL}/departments`, { name: `Promote Dept ${generateId()}`, code: `PD-${generateId()}` }, { headers });
        const prog = await axios.post(`${API_URL}/programs`, { name: 'Promote Prog', code: `PP-${generateId()}`, departmentId: dept.data.id }, { headers });
        const deptId = dept.data.id;
        const programId = prog.data.id;

        // 3. Create Cohort (Sem 1)
        const cohort = await axios.post(`${API_URL}/cohorts`, { name: 'Batch Promote', year: 2024, programId, currentSemester: 1 }, { headers });
        const cohortId = cohort.data.id;
        console.log(`✅ Cohort Created: ${cohortId} (Sem 1)`);

        // 4. Enroll Student (Sem 1)
        const sEmail = `student.promo.${generateId()}@test.com`;
        await axios.post(`${API_URL}/enrollments`, {
            cohortId, departmentId: deptId, semester: 1,
            rollNumber: `P-${generateId()}`,
            email: sEmail, fullName: 'Promo Student'
        }, { headers });
        console.log('✅ Student Enrolled (Sem 1)');

        // 5. Verify Sem 1 Count
        const check1 = await axios.get(`${API_URL}/enrollments?cohortId=${cohortId}&semester=1`, { headers });
        if (check1.data.length !== 1) throw new Error('Setup Failed: Sem 1 count mismatch');

        // 6. PROMOTE
        console.log('🔄 Executing Promotion...');
        await axios.post(`${API_URL}/cohorts/${cohortId}/promote`, {}, { headers });

        // 7. Verify Sem 2 Count (The Fix)
        const check2 = await axios.get(`${API_URL}/enrollments?cohortId=${cohortId}&semester=2`, { headers });
        console.log(`📊 Sem 2 Student Count: ${check2.data.length}`);

        if (check2.data.length === 1) {
            console.log('✅ SUCCESS: Student successfully migrated to Semester 2');
        } else {
            console.error('❌ FAILURE: Student NOT found in Semester 2');
            process.exit(1);
        }

    } catch (e: any) {
        console.error('❌ CRASH:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
        process.exit(1);
    }
}

run();
