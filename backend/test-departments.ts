
import prisma from './src/services/db';

async function testDepartments() {
    try {
        console.log('Testing department operations...');

        // Test fetching departments
        const departments = await prisma.department.findMany();
        console.log('Existing departments:', departments);

        // Test creating a department
        const newDept = await prisma.department.create({
            data: {
                name: 'Test Department',
                code: 'TEST'
            }
        });
        console.log('Created department:', newDept);

        // Clean up
        await prisma.department.delete({ where: { id: newDept.id } });
        console.log('Test department deleted.');

    } catch (error) {
        console.error('Department test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDepartments();
