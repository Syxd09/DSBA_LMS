const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUpsert() {
    console.log('Testing upsert operations...\n');

    try {
        const dept = await prisma.department.findFirst({ where: { code: 'CSE' } });

        // Test 1: Program upsert
        console.log('1. Testing Program upsert...');
        const program = await prisma.program.upsert({
            where: { code: 'BTECHCSE' },
            update: {},
            create: {
                name: 'B.Tech CSE',
                code: 'BTECHCSE',
                departmentId: dept.id,
                durationYears: 4,
                isActive: true
            }
        });
        console.log('✓ Program upsert works');

        // Test 2: Cohort upsert with composite key
        console.log('\n2. Testing Cohort upsert with composite key...');
        const cohort = await prisma.cohort.upsert({
            where: {
                programId_year: {
                    programId: program.id,
                    year: 2022
                }
            },
            update: {},
            create: {
                programId: program.id,
                year: 2022,
                name: '2022-2026 Batch',
                currentSemester: 5,
                isActive: true
            }
        });
        console.log('✓ Cohort upsert works:', cohort.name);

        // Test 3: CurriculumVersion
        console.log('\n3. Testing CurriculumVersion...');
        let curriculum = await prisma.curriculumVersion.findFirst({
            where: { programId: program.id, versionName: '2021' }
        });

        if (!curriculum) {
            curriculum = await prisma.curriculumVersion.create({
                data: {
                    programId: program.id,
                    versionName: '2021',
                    effectiveFrom: 2021,
                    isActive: true
                }
            });
            console.log('✓ CurriculumVersion created');
        } else {
            console.log('✓ CurriculumVersion exists');
        }

        // Test 4: Subject upsert
        console.log('\n4. Testing Subject upsert...');
        const subject = await prisma.subject.upsert({
            where: { code: 'CS501' },
            update: {},
            create: {
                code: 'CS501',
                name: 'Database Management Systems',
                credits: 4,
                semester: 5,
                curriculumVersionId: curriculum.id,
                isActive: true
            }
        });
        console.log('✓ Subject upsert works:', subject.name);

        console.log('\n✅ All upserts passed!');

    } catch (error) {
        console.error('\n❌ ERROR at step:', error.message);
        console.error('\nFull error:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testUpsert();
