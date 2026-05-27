import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('Logging in as HOD Shivam on Port 3000...');
    let token = '';
    try {
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'shivam@gmail.com',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('Login successful on Port 3000! Token acquired.');
    } catch (loginError: any) {
        console.error('Login failed on Port 3000:');
        if (loginError.response) {
            console.log('Status:', loginError.response.status);
            console.log('Data:', loginError.response.data);
        } else {
            console.error(loginError.message);
        }
        return;
    }

    console.log('Calling department analytics API on Port 3000...');
    try {
        const response = await axios.get(
            'http://localhost:3000/api/feedback-analytics/department/e84c4f27-5b04-4c67-9e2f-5cd20f8a969b',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        console.log('Response status:', response.status);
        console.dir(response.data, { depth: null });
    } catch (error: any) {
        console.error('API call failed on Port 3000:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

main();
