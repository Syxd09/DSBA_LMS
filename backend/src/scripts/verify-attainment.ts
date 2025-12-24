
import prisma from '../services/db';
import { AttainmentService } from '../services/attainment.service';

async function verifyAttainment() {
    console.log('🔍 Starting Attainment Verification...');

    try {
        // 1. Check for valid context
        const subject = await prisma.subject.findFirst();
        const cohort = await prisma.cohort.findFirst();

        if (!subject || !cohort) {
            console.log('⚠️ No Subject or Cohort found. Skipping calculation check.');
            return;
        }

        console.log(`✅ Found Context: Subject ${subject.code}, Cohort ${cohort.name}`);

        // 2. Check for Marks
        const marksCount = await prisma.studentMark.count({
            where: { exam: { subjectId: subject.id } }
        });
        console.log(`📊 Found ${marksCount} marks for this subject.`);

        if (marksCount === 0) {
            console.log('⚠️ No marks found. Cannot verify calculation math.');
        } else {
            // 3. Run CO Calculation
            console.log('🔄 Running CO Calculation...');
            const coResults = await AttainmentService.calculateCO(
                subject.id,
                cohort.id,
                subject.semester,
                "2023-2024", // Assuming default academic year, or fetch dynamic
                60
            );
            console.log('✅ CO Calculation Result:', JSON.stringify(coResults, null, 2));
        }

        // 4. Check POs
        const program = await prisma.program.findFirst({ where: { id: cohort.programId } });
        if (program) {
            console.log('🔄 Running PO Calculation...');
            // We can try to calculate PO even if COs aren't fully approved yet, 
            // but the service throws if no approved COs.
            // We'll wrap in try/catch to see if it acts correctly.
            try {
                const poResults = await AttainmentService.calculatePO(
                    program.id,
                    cohort.id,
                    subject.semester,
                    "2023-2024"
                );
                console.log('✅ PO Calculation Result:', JSON.stringify(poResults, null, 2));
            } catch (e: any) {
                console.log(`ℹ️ PO Calculation info: ${e.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAttainment();
