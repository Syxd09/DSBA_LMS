const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateStudentCount() {
    try {
        console.log('🔍 Investigating student count discrepancy...\n');

        // Get the cohort ID from the context (2022-2026 Batch)
        const cohort = await prisma.cohort.findFirst({
            where: {
                OR: [
                    { name: { contains: '2022-2026' } },
                    { year: 2022 }
                ]
            }
        });

        if (!cohort) {
            console.log('❌ Cohort not found');
            return;
        }

        console.log(`✅ Found cohort: ${cohort.name} (${cohort.id})\n`);

        // Get all enrollments for this cohort in semester 1
        const allEnrollments = await prisma.studentEnrollment.findMany({
            where: {
                cohortId: cohort.id,
                semester: 1
            },
            include: {
                student: {
                    select: {
                        fullName: true,
                        email: true,
                        isActive: true
                    }
                }
            },
            orderBy: {
                rollNumber: 'asc'
            }
        });

        console.log(`📊 Total enrollments found: ${allEnrollments.length}\n`);
        console.log('Student List:');
        console.log('─'.repeat(80));

        allEnrollments.forEach((enrollment, index) => {
            console.log(`${index + 1}. ${enrollment.rollNumber} - ${enrollment.student.fullName}`);
            console.log(`   Status: ${enrollment.status || 'N/A'} | Student Active: ${enrollment.student.isActive}`);
        });

        console.log('─'.repeat(80));

        // Count by status
        const activeEnrollments = allEnrollments.filter(e => e.status === 'active');
        const inactiveEnrollments = allEnrollments.filter(e => e.status !== 'active');
        const activeStudents = allEnrollments.filter(e => e.student.isActive);
        const inactiveStudents = allEnrollments.filter(e => !e.student.isActive);

        console.log('\n📈 Summary:');
        console.log(`Total Enrollments: ${allEnrollments.length}`);
        console.log(`Active Enrollment Status: ${activeEnrollments.length}`);
        console.log(`Inactive Enrollment Status: ${inactiveEnrollments.length}`);
        console.log(`Active Students: ${activeStudents.length}`);
        console.log(`Inactive Students: ${inactiveStudents.length}`);

        if (inactiveEnrollments.length > 0) {
            console.log('\n❗ Inactive Enrollments:');
            inactiveEnrollments.forEach(e => {
                console.log(`  - ${e.rollNumber}: ${e.student.fullName} (${e.status})`);
            });
        }

        if (inactiveStudents.length > 0) {
            console.log('\n❗ Inactive Students:');
            inactiveStudents.forEach(e => {
                console.log(`  - ${e.rollNumber}: ${e.student.fullName}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

investigateStudentCount();
