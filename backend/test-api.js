const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPI() {
    const pos = await prisma.programOutcome.findMany({
        include: {
            program: { select: { id: true, name: true, code: true, departmentId: true } }
        }
    });

    console.log('API Response Preview:\n');
    console.log(JSON.stringify(pos.slice(0, 2), null, 2));

    await prisma.$disconnect();
}

testAPI();
