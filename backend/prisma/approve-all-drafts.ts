import { PrismaClient } from '@prisma/client';
import { forceRecalculateAll } from '../src/services/analytics.service';

const prisma = new PrismaClient();

async function main() {
    console.log('Finding all feedbacks in DRAFT status...');
    const drafts = await prisma.teacherStudentFeedback.findMany({
        where: { status: 'DRAFT' }
    });

    console.log(`Found ${drafts.length} draft feedback entries.`);

    if (drafts.length > 0) {
        console.log('Approving all draft feedbacks...');
        await prisma.teacherStudentFeedback.updateMany({
            where: { status: 'DRAFT' },
            data: { 
                status: 'APPROVED',
                approvedBy: '9e4a18b1-a8b0-46df-b9a3-0a3b0d63fabd', // Linked to HOD Shivam
                approvedAt: new Date()
            }
        });
        console.log('All drafts have been successfully approved!');
    }

    console.log('Running full feedback analytics cache recalculation...');
    const count = await forceRecalculateAll();
    console.log(`Recalculated analytics for ${count} feedback records!`);

    const cacheCount = await prisma.feedbackAnalyticsCache.count();
    console.log(`Feedback Analytics Cache now has ${cacheCount} records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
