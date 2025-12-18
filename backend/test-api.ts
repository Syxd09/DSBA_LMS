
import axios from 'axios';

async function testDepartmentsAPI() {
    try {
        // First login
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'principal@college.edu',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful, got token');

        // Now test departments
        console.log('Fetching departments...');
        const deptRes = await axios.get('http://localhost:3000/api/departments', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Departments:', deptRes.data);

    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testDepartmentsAPI();
