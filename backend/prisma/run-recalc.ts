import { AttainmentService } from '../src/services/attainment.service';
import prisma from '../src/services/db';

async function main() {
    console.log('Starting manual recalculation for BCA105...');
    
    const subject = await prisma.subject.findFirst({
        where: { code: 'BCA105' }
    });
    
    if (!subject) {
        console.log('Subject not found');
        return;
    }
    
    const cohortId = '6ab5d79a-08f1-48db-bc6b-31f755920fb5';
    const semester = 1;
    const academicYear = '2026-2027'; // Matches user page context
    
    // Calculate CO attainment
    const coAttainments = await AttainmentService.calculateCO(
        subject.id,
        cohortId,
        semester,
        academicYear
    );
    
    console.log(`Recalculated ${coAttainments.length} COs.`);
    coAttainments.forEach(att => {
        console.log(`CO ID: ${att.coId} | Target: ${att.targetPercent}% | Achieved: ${att.achievedPercent}% | Status: ${att.status}`);
    });
    
    // Calculate PO attainment
    const subjectWithProgram = await prisma.subject.findUnique({
        where: { id: subject.id },
        include: { curriculum: true }
    });
    
    if (subjectWithProgram?.curriculum?.programId) {
        const poAttainments = await AttainmentService.calculatePO(
            subjectWithProgram.curriculum.programId,
            cohortId,
            semester,
            academicYear
        );
        console.log(`Recalculated ${poAttainments.length} POs.`);
    }
    
    console.log('Done!');
}

main()
    .catch(err => console.error(err))
    .finally(async () => {
        await prisma.$disconnect();
    });
