const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExamStudentsEndpoint() {
    try {
        console.log('🔍 Checking what /exams/cohort/:id/students returns...\n');

        // Get the cohort
        const cohort = await prisma.cohort.findFirst({
            where: {
                OR: [
                    { name: { contains: '2022-2026' } },
                    { year: 2022 }
                ]
            }
        });

        console.log(`Found cohort: ${cohort.name} (${cohort.id})\n`);

        // Simulate the controller query
        const students = await prisma.student.findMany({
            where: {
                enrollments: {
                    some: {
                        cohortId: cohort.id
                    }
                }
            },
            include: {
                enrollments: {
                    where: { cohortId: cohort.id },
                    include: { department: true }
                }
            }
        });

        console.log(`📊 /exams/cohort/${cohort.id}/students would return: ${students.length} students\n`);

        students.forEach((student, i) => {
            const enrollment = student.enrollments[0];
            console.log(`${i + 1}. ${enrollment.rollNumber} - ${student.fullName}`);
            console.log(`   Email: ${student.email} | Active: ${student.isActive}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkExamStudentsEndpoint();
