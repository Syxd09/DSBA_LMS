
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';
// We need a token. For now we assume a valid token is available or we mock the request structure if unit testing.
// Actually, since we are running against a real backend, we need to login first.
// But Hardcoding login might be tricky if user/pass changes.
// I'll assume we can use the 'admin' login if available, or just mock the login flow.

async function verify() {
    try {
        // 1. Login
        console.log('Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com', // Assuming default admin
            password: 'admin' // Assuming default pass
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Test Invalid Assignment (Missing fields)
        console.log('\nTest 1: Creating Assignment with missing fields...');
        try {
            await axios.post(`${API_URL}/assignments`, {}, { headers });
            console.error('FAILED: Should have rejected empty body');
        } catch (e: any) {
            if (e.response?.status === 400 && e.response.data.message === 'Validation failed') {
                console.log('PASSED: Rejected with 400 Validation failed');
                console.log('Errors:', JSON.stringify(e.response.data.errors, null, 2));
            } else {
                console.error('FAILED: Update response was', e.response?.status, e.response?.data);
            }
        }

        // 3. Test Invalid Types (String for semester)
        console.log('\nTest 2: Creating Assignment with invalid types (string instead of UUID)...');
        try {
            await axios.post(`${API_URL}/assignments`, {
                teacherId: 'not-a-uuid',
                subjectId: 'not-a-uuid',
                cohortId: 'not-a-uuid',
                departmentId: 'not-a-uuid',
                semester: 5
            }, { headers });
            console.error('FAILED: Should have rejected invalid UUIDs');
        } catch (e: any) {
            if (e.response?.status === 400) {
                console.log('PASSED: Rejected invalid UUIDs correctly');
                console.log('Errors:', JSON.stringify(e.response.data.errors, null, 2));
            } else {
                console.error('FAILED: Unexpected response', e.response?.status);
            }
        }

    } catch (error: any) {
        console.error('Verification failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

verify();
