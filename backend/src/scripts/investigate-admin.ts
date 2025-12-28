
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@college.edu';
const ADMIN_PASSWORD = 'password123';

let token = '';

async function bootstrapAdmin() {
    console.log('0️⃣ Bootstrapping Admin User...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: { password: hashedPassword, role: 'ADMIN', isActive: true },
        create: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            fullName: 'System Admin',
            role: 'ADMIN',
            isActive: true
        }
    });
    console.log('✅ Admin Bootstrapped');
}

async function loginAdmin() {
    try {
        console.log('🔹 [1] Logging in as Admin...');
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        token = res.data.token;
        console.log('✅ Admin Login Success.');
        return true;
    } catch (error: any) {
        console.error('❌ Admin Login Failed:', error.response?.data || error.message);
        return false;
    }
}

async function createAcademicStructure() {
    try {
        console.log('🔹 [2] Creating Departments & Programs...');

        // Create CSE Dept
        const deptRes = await axios.post(`${API_URL}/departments`, {
            name: 'Computer Science',
            code: 'CSE'
        }, { headers: { Authorization: `Bearer ${token}` } });
        const deptId = deptRes.data.id;
        console.log('✅ Dept CSE Created:', deptId);

        // Create MBA Dept
        const dept2Res = await axios.post(`${API_URL}/departments`, {
            name: 'Business Administration',
            code: 'MBA'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Dept MBA Created:', dept2Res.data.id);

        // Create Program (B.Tech)
        const progRes = await axios.post(`${API_URL}/programs`, {
            name: 'Bachelor of Technology',
            code: 'B.Tech',
            departmentId: deptId,
            durationYears: 4
        }, { headers: { Authorization: `Bearer ${token}` } });
        const progId = progRes.data.id;
        console.log('✅ Program B.Tech Created:', progId);

        // Create Cohort (2025)
        const cohortRes = await axios.post(`${API_URL}/cohorts`, {
            name: 'Batch 2025',
            year: 2025,
            programId: progId,
            currentSemester: 1
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Cohort 2025 Created:', cohortRes.data.id);

        return { deptId, progId, cohortId: cohortRes.data.id };
    } catch (error: any) {
        if (error.response?.data?.message?.includes('already exists')) {
            console.log('⚠️ Structure already exists (Skipping)');
            // Fetch existing for context if needed, but for now just proceed
            return null;
        }
        console.error('❌ Structure Creation Failed:', error.response?.data || error.message);
        return null;
    }
}

async function createUsers(deptId: string) {
    if (!deptId) return;
    try {
        console.log('🔹 [3] Creating Users (Principal, HOD, Teacher, Student)...');

        const roles = [
            { email: 'principal@college.edu', role: 'PRINCIPAL', name: 'Principal User' },
            { email: 'hod.cse@college.edu', role: 'HOD', name: 'HOD CSE', deptId },
            { email: 'teacher.cse@college.edu', role: 'TEACHER', name: 'Teacher CSE', deptId },
            { email: 'student.cse@college.edu', role: 'STUDENT', name: 'Student CSE', deptId }
        ];

        for (const u of roles) {
            try {
                await axios.post(`${API_URL}/users`, {
                    email: u.email,
                    password: 'password123',
                    fullName: u.name,
                    role: u.role,
                    departmentId: u.deptId
                }, { headers: { Authorization: `Bearer ${token}` } });
                console.log(`✅ Created ${u.role}: ${u.email}`);
            } catch (err: any) {
                if (err.response?.data?.message === 'User already exists') {
                    console.log(`⚠️ User ${u.email} already exists`);
                } else {
                    console.error(`❌ Failed to create ${u.email}:`, err.response?.data);
                }
            }
        }

    } catch (error: any) {
        console.error('❌ User Creation Failed:', error.response?.data || error.message);
    }
}

async function runNegativeTests(deptId: string) {
    if (!deptId) return;
    console.log('🔹 [4] Running Negative Tests (Invalid Actions)...');

    // 1. Try to create user with invalid role
    try {
        await axios.post(`${API_URL}/users`, {
            email: 'fake@role.com',
            password: '123',
            fullName: 'Fake Role',
            role: 'SUPER_GOD_MODE'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.error('❌ FAILED: API accepted invalid role!');
    } catch (err: any) {
        if (err.response?.status === 400) console.log('✅ SUCCESS: Rejected invalid role');
        else console.error('❌ Failed with unexpected error:', err.response?.status);
    }

    // 2. Try to create Department without Code
    try {
        await axios.post(`${API_URL}/departments`, {
            name: 'No Code Dept'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.error('❌ FAILED: API accepted department without code!');
    } catch (err: any) {
        if (err.response?.status === 400) console.log('✅ SUCCESS: Rejected missing code');
        else console.error('❌ Failed with unexpected error:', err.response?.status);
    }
}

async function main() {
    await bootstrapAdmin();
    if (await loginAdmin()) {
        const context = await createAcademicStructure();
        if (context) {
            await createUsers(context.deptId);
            await runNegativeTests(context.deptId);
        }
    }
}

main();
