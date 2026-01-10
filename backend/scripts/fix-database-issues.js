const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDatabaseIssues() {
    console.log('🔧 Fixing Database Issues...\n');

    try {
        // Fix 1: Remove exam with NULL semester
        console.log('📋 Fix 1: Checking for exams with NULL semester...');

        const nullSemesterExams = await prisma.exam.findMany({
            where: { semester: null },
            select: { id: true, subjectId: true, cohortId: true, examType: true }
        });

        if (nullSemesterExams.length > 0) {
            console.log(`   Found ${nullSemesterExams.length} exam(s) with NULL semester:`);
            nullSemesterExams.forEach(exam => {
                console.log(`   - ID: ${exam.id}, Type: ${exam.examType}`);
            });

            // Delete these exams
            const deleted = await prisma.exam.deleteMany({
                where: { semester: null }
            });

            console.log(`   ✅ Deleted ${deleted.count} exam(s)\n`);
        } else {
            console.log('   ✅ No exams with NULL semester found\n');
        }

        // Fix 2: Verify no more NULL semesters
        console.log('📋 Fix 2: Verifying database state...');

        const totalExams = await prisma.exam.count();
        const examsWithSemester = await prisma.exam.count({
            where: { semester: { not: null } }
        });

        console.log(`   Total exams: ${totalExams}`);
        console.log(`   Exams with valid semester: ${examsWithSemester}`);

        if (totalExams === examsWithSemester) {
            console.log('   ✅ All exams have valid semester values\n');
        } else {
            console.log(`   ⚠️  Warning: ${totalExams - examsWithSemester} exams still have issues\n`);
        }

        console.log('✅ Database fixes complete!');

    } catch (error) {
        console.error('❌ Error fixing database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDatabaseIssues();
