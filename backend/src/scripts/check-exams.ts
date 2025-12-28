
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function main() {
    try {
        console.log('🚀 Checking Exams...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'teacher.a@test.com',
            password: 'password123'
        });
        const token = loginRes.data.token;

        const assignmentsRes = await axios.get(`${BASE_URL}/assignments`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const assignments = assignmentsRes.data.data || assignmentsRes.data;
        const assignment = assignments.find((a: any) => a.subject.name === 'Computer Networks');
        if (!assignment) {
            console.log('No Assignment!');
            return;
        }

        const examsRes = await axios.get(`${BASE_URL}/exams?subjectId=${assignment.subjectId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Exams:', JSON.stringify(examsRes.data, null, 2));

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}
main();
