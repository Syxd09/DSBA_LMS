import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUG INFO ---');
    console.log('DATABASE_URL env:', process.env.DATABASE_URL);
    console.log('------------------');
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Defined (Starts with ' + process.env.DATABASE_URL.substring(0, 10) + '...)' : 'Undefined');

    try {
        await prisma.$connect();
        console.log('Successfully connected to the database.');

        const count = await prisma.user.count();
        console.log('User count:', count);

    } catch (e: any) {
        console.error('Connection failed:', e.message);
        console.error('Full Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
