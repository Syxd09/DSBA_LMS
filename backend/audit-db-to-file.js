const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
    try {
        const result = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
        const tables = result.map(r => r.tablename).sort();
        fs.writeFileSync('db_tables.txt', JSON.stringify(tables, null, 2));
        console.log('✅ Tables written to db_tables.txt');
    } catch (e) {
        fs.writeFileSync('db_tables_error.txt', e.message);
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
