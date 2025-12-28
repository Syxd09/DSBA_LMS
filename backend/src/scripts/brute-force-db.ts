
import { PrismaClient } from '@prisma/client';

const candidates = [
    'postgresql://obe_user:obe_secret_123@127.0.0.1:5432/obe_db?schema=public',
    'postgresql://postgres:postgrespassword@127.0.0.1:5432/outcome_db?schema=public',
    'postgresql://postgres:postgrespassword@127.0.0.1:5432/obe_db?schema=public',
    'postgresql://postgres:postgres@127.0.0.1:5432/obe_db?schema=public',
    'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public',
    'postgresql://postgres:admin@127.0.0.1:5432/obe_db?schema=public',
    'postgresql://postgres:password@127.0.0.1:5432/obe_db?schema=public'
];

async function checkCreds() {
    console.log('🔐 Starting Credential Discovery...');

    for (const url of candidates) {
        const masked = url.replace(/:[^:@]*@/, ':****@');
        console.log(`\nTesting: ${masked}`);

        const prisma = new PrismaClient({
            datasources: { db: { url } },
            log: [] // Quiet logs
        });

        try {
            await prisma.$connect();
            console.log('✅ SUCCESS! Found valid credentials.');
            console.log(`VALID_URL=${url}`);

            // Validate schema existence lightly
            try {
                const count = await prisma.user.count();
                console.log(`   (Confirmed access to User table. Count: ${count})`);
            } catch (e) {
                console.log('   (Warning: Connected, but User table might be missing or empty)');
            }

            await prisma.$disconnect();
            process.exit(0); // Exit on first success
        } catch (error: any) {
            console.log(`❌ Failed: ${error.message.split('\n').pop()}`); // Log last line of error
            await prisma.$disconnect();
        }
    }
    console.log('\n❌ No valid credentials found in candidate list.');
}

checkCreds();
