
import dotenv from 'dotenv';
dotenv.config();
console.log('JWT_SECRET defined:', !!process.env.JWT_SECRET);
if (process.env.JWT_SECRET) console.log('JWT_SECRET length:', process.env.JWT_SECRET.length);
else console.log('JWT_SECRET is MISSING');
console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
