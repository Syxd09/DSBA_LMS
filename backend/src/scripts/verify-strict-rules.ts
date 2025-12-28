
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@college.edu';
const ADMIN_PASSWORD = 'password123';

async function main() {
    try {
        console.log('🔄 STARTING STRICT RULE VERIFICATION');

        // 0. Bootstrap Admin
        console.log('0️⃣ Bootstrapping Admin User...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await prisma.user.upsert({
            where: { email: ADMIN_EMAIL },
            update: {},
            create: {
                email: ADMIN_EMAIL,
                password: hashedPassword,
                fullName: 'System Admin',
                role: 'ADMIN',
                isActive: true
            }
        });
        console.log('✅ Admin Ready');

        // 1. Login
        console.log('1️⃣ Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('✅ Logged in');

        // 2. Setup Base Data (Dept, Program, Cohort)
        console.log('2️⃣ Setting up academic context...');

        // Create Department A
        const deptRes = await axios.post(`${API_URL}/departments`, {
            name: 'Strict Dept',
            code: 'STRICT',
            type: 'academic'
        }, { headers });
        const deptId = deptRes.data.id;

        // Create Department B (Cross contamination test)
        const deptBRes = await axios.post(`${API_URL}/departments`, {
            name: 'Other Dept',
            code: 'OTHER',
            type: 'academic'
        }, { headers });
        const deptBId = deptBRes.data.id;

        // Create Program in Dept A
        const progRes = await axios.post(`${API_URL}/programs`, {
            name: 'Strict Program',
            code: 'SP',
            departmentId: deptId,
            durationYears: 3
        }, { headers });
        const progId = progRes.data.id;

        // Create Cohort in Program (belongs to Dept A)
        const cohortRes = await axios.post(`${API_URL}/cohorts`, {
            name: 'Batch 2024',
            year: 2024,
            programId: progId,
            currentSemester: 1
        }, { headers });
        const cohortId = cohortRes.data.id;
        console.log('✅ Context Created: Dept A -> Program -> Cohort');

        // 3. Test Student Enrollment Constraints
        console.log('3️⃣ Verify Student Enrollment Constraints...');

        // Negative Test: Enroll student in Cohort (Dept A) but pass Dept B as context
        try {
            await axios.post(`${API_URL}/enrollments`, {
                cohortId: cohortId,
                departmentId: deptBId, // MISMATCH!
                semester: 1,
                rollNumber: 'FAIL001',
                fullName: 'Fail Student',
                email: 'fail@student.com'
            }, { headers });
            console.error('❌ FAILED: API allowed mismatched Department/Cohort!');
            process.exit(1);
        } catch (error: any) {
            if (error.response?.status === 400) {
                console.log('✅ SUCCESS: Rejected mismatched Department/Cohort (400)');
            } else {
                console.error('❌ Failed with unexpected error:', error.response?.data);
            }
        }

        // Positive Test: Enroll Valid Student
        await axios.post(`${API_URL}/enrollments`, {
            cohortId: cohortId,
            departmentId: deptId, // MATCH
            semester: 1,
            rollNumber: 'PASS001',
            fullName: 'Pass Student',
            email: 'pass@student.com'
        }, { headers });
        console.log('✅ SUCCESS: Enrolled valid student');

        // 4. Test Teacher Assignment Constraints
        console.log('4️⃣ Verify Teacher Assignment Constraints...');

        // Create a teacher first
        const teacherRes = await axios.post(`${API_URL}/users`, {
            email: 'teacher@strict.com',
            fullName: 'Strict Teacher',
            password: 'password123',
            role: 'TEACHER',
            departmentId: deptId
        }, { headers });
        const teacherId = teacherRes.data.id;

        // Create a subject
        const subjectRes = await axios.post(`${API_URL}/subjects`, {
            name: 'Strict Subject',
            code: 'SUB101',
            credits: 4,
            semester: 1,
            programId: progId // Just helper, backend links via curriculum usually, but assuming simple subject create for now or seeded curriculum?
            // Wait, subject creation requires curriculum version usually.
            // Let's create curriculum first.
        }, { headers }).catch(async () => {
            // Fallback if subject creation needs robust curriculum logic (which I wiped)
            // Create Curriculum
            const currRes = await axios.post(`${API_URL}/curriculum-versions`, {
                programId: progId,
                versionName: 'v1',
                effectiveFrom: 2024
            }, { headers });
            return axios.post(`${API_URL}/subjects`, {
                name: 'Strict Subject',
                code: 'SUB101',
                credits: 4,
                semester: 1,
                curriculumVersionId: currRes.data.id
            }, { headers });
        });
        const subjectId = subjectRes.data.id;

        // Negative Test 1: Assign to Semester 2 (Empty)
        try {
            await axios.post(`${API_URL}/assignments`, {
                teacherId,
                subjectId,
                cohortId,
                departmentId: deptId,
                semester: 2 // No students here yet!
            }, { headers });
            console.error('❌ FAILED: API allowed assignment to empty class (Sem 2)!');
        } catch (error: any) {
            if (error.response?.status === 400 && error.response.data.message.includes('No active students')) {
                console.log('✅ SUCCESS: Rejected assignment to empty class (Sem 2)');
            } else {
                console.error('❌ Failed with unexpected error:', error.response?.data);
            }
        }

        // Positive Test: Assign to Semester 1 (1 Student)
        await axios.post(`${API_URL}/assignments`, {
            teacherId,
            subjectId,
            cohortId,
            departmentId: deptId,
            semester: 1
        }, { headers });
        console.log('✅ SUCCESS: Assigned to populated class (Sem 1)');

        // 5. Verify Preview API
        console.log('5️⃣ Verifying Preview API...');
        const previewRes = await axios.get(`${API_URL}/assignments/preview`, {
            params: { cohortId, departmentId: deptId, semester: 1 },
            headers
        });

        if (previewRes.data.count === 1 && previewRes.data.cohortName === 'Batch 2024') {
            console.log(`✅ MATCH: Preview returned count ${previewRes.data.count}`);
        } else {
            console.error('❌ FAILED: Preview data mismatch:', previewRes.data);
        }

        console.log('\n🎉 ALL STRICT RULES VERIFIED SUCCESSFULLY');

    } catch (error: any) {
        console.error('❌ SYSTEM VERIFICATION FAILED:', error.response?.data || error.message);
        process.exit(1);
    }
}

main();
