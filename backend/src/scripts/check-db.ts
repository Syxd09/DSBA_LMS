
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb() {
    console.log('🔌 Testing Database Connection...');
    console.log(`URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')}`); // Mask password

    try {
        await prisma.$connect();
        console.log('✅ Connection Successful!');

        const userCount = await prisma.user.count();
        console.log(`📊 Found ${userCount} users.`);

        const subjects = await prisma.subject.count();
        console.log(`📚 Found ${subjects} subjects.`);

    } catch (error: any) {
        console.error('❌ Database Connection Failed:');
        console.error(error.message);
        if (error.code) console.error(`Error Code: ${error.code}`);
    } finally {
        await prisma.$disconnect();
    }
}

checkDb();
