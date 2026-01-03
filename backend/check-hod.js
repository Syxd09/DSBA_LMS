const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHOD() {
    try {
        // Find all HOD users
        const hods = await prisma.user.findMany({
            where: { role: 'HOD' }
        });

        console.log('HOD Users found:', hods.length);

        for (const hod of hods) {
            console.log(`\n📋 HOD: ${hod.fullName} (${hod.email})`);
            console.log(`   User ID: ${hod.id}`);
            console.log(`   Department ID in User: ${hod.departmentId || 'None'}`);

            // Check if HOD is assigned to a department
            const department = await prisma.department.findFirst({
                where: { hodId: hod.id }
            });

            if (department) {
                console.log(`   ✅ Assigned as HOD of: ${department.name} (${department.code})`);

                // Count subjects in this department
                const subjects = await prisma.subject.count({
                    where: {
                        curriculum: {
                            program: {
                                departmentId: department.id
                            }
                        }
                    }
                });
                console.log(`   📚 Subjects in department: ${subjects}`);
            } else {
                console.log(`   ❌ NOT assigned as HOD of any department!`);
                console.log(`   This is why subjects don't show up!`);
            }
        }

        // Check all departments and their HODs
        console.log('\n\n📂 All Departments:');
        const departments = await prisma.department.findMany({
            include: {
                hod: true
            }
        });

        for (const dept of departments) {
            console.log(`\n   ${dept.name} (${dept.code})`);
            console.log(`   HOD: ${dept.hod ? dept.hod.fullName : 'No HOD assigned'}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkHOD();
