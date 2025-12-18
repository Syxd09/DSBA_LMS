
import axios from 'axios';

async function main() {
    try {
        console.log('Attempting login...');
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'principal@college.edu',
            password: 'password123'
        });
        console.log('Login Success:', response.data);
    } catch (error: any) {
        if (error.response) {
            console.error('Login Failed Status:', error.response.status);
            console.error('Login Failed Data:', error.response.data);
        } else {
            console.error('Login Error:', error.message);
        }
    }
}

main();
