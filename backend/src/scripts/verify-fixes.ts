
import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://localhost:3000/api';
const USERS = {
    STUDENT: { email: 'student.cse@college.edu', password: 'password123' },
    ADMIN: { email: 'admin@college.edu', password: 'password123' }
};

const results = {
    studentProfile: false,
    invalidRole: false,
    details: [] as string[]
};

async function checkStudentProfile() {
    results.details.push('🔍 [1] Verifying Student Profile Fix (/auth/me)...');
    try {
        const login = await axios.post(`${API_URL}/auth/login`, USERS.STUDENT);
        const token = login.data.token;

        const profile = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (profile.status === 200 && profile.data.email === USERS.STUDENT.email) {
            results.details.push('✅ SUCCESS: /auth/me returned correct profile');
            results.studentProfile = true;
        } else {
            results.details.push(`❌ FAILED: Unexpected response ${JSON.stringify(profile.data)}`);
        }
    } catch (e: any) {
        results.details.push(`❌ FAILED: /auth/me still broken: ${e.message}`);
    }
}

async function checkInvalidRole() {
    results.details.push('\n🔍 [2] Verifying Invalid Role Validation...');
    try {
        const login = await axios.post(`${API_URL}/auth/login`, USERS.ADMIN);
        const token = login.data.token;

        await axios.post(`${API_URL}/users`, {
            email: 'bad.role@test.com',
            password: '123',
            fullName: 'Bad Role',
            role: 'INVALID_ROLE_XYZ'
        }, { headers: { Authorization: `Bearer ${token}` } });

        results.details.push('❌ FAILED: API accepted invalid role (Should be 400)');

    } catch (e: any) {
        if (e.response?.status === 400 && e.response.data.message.includes('Invalid role')) {
            results.details.push('✅ SUCCESS: API rejected invalid role with 400 Bad Request');
            results.invalidRole = true;
        } else {
            results.details.push(`❌ FAILED: Unexpected error code. Expected 400, Got ${e.response?.status}`);
        }
    }
}

async function main() {
    await checkStudentProfile();
    await checkInvalidRole();
    fs.writeFileSync('verification_result.json', JSON.stringify(results, null, 2));
    console.log('Results written to verification_result.json');
}

main();
