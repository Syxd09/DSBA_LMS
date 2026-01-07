const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testSimple() {
    console.log('Testing simple creates...\n');

    try {
        const dept = await prisma.department.findFirst({ where: { code: 'CSE' } });
        console.log('✓ Found department:', dept.name);

        const program = await prisma.program.findFirst({ where: { code: 'BTECHCSE' } });
        if (program) {
            console.log('✓ Program exists');
        } else {
            console.log('Creating program...');
            const newProg = await prisma.program.create({
                data: {
                    name: 'B.Tech CSE',
                    code: 'BTECHCSE',
                    departmentId: dept.id,
                    durationYears: 4,
                    isActive: true
                }
            });
            console.log('✓ Program created:', newProg.id);
        }

        const prog = await prisma.program.findFirst({ where: { code: 'BTECHCSE' } });

        // Test Cohort creation with minimal fields
        console.log('\nTesting Cohort creation...');
        const cohortTest = await prisma.cohort.create({
            data: {
                programId: prog.id,
                year: 2099,  // Use future year to avoid conflicts
                name: 'Test Batch 2099',
                currentSemester: 1
            }
        });
        console.log('✓ Cohort created:', cohortTest.id);

        // Clean up test cohort
        await prisma.cohort.delete({ where: { id: cohortTest.id } });
        console.log('✓ Test cohort cleaned up');

        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('\n❌ FULL ERROR:');
        console.error('Message:', error.message);
        console.error('\nMeta:', JSON.stringify(error.meta, null, 2));
        console.error('\nCode:', error.code);
        console.error('\nStack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testSimple();
