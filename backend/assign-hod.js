const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignHODToDepartment() {
    try {
        console.log('Assigning HOD to department...\n');

        // Find the HOD user
        const hod = await prisma.user.findFirst({
            where: { role: 'HOD' }
        });

        if (!hod) {
            console.log('❌ No HOD user found!');
            return;
        }

        console.log(`Found HOD: ${hod.fullName} (${hod.email})`);

        // Find the BCA department
        const department = await prisma.department.findFirst({
            where: { code: 'BCA234' }
        });

        if (!department) {
            console.log('❌ BCA department not found!');
            return;
        }

        console.log(`Found Department: ${department.name} (${department.code})`);

        // Assign HOD to department
        await prisma.department.update({
            where: { id: department.id },
            data: { hodId: hod.id }
        });

        console.log(`\n✅ Successfully assigned ${hod.fullName} as HOD of ${department.name}!`);
        console.log('\nNow the HOD can see all subjects in the BCA department.');
        console.log('Refresh the Subjects page in the browser!\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

assignHODToDepartment();
