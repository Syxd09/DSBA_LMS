import { forceRecalculateAll } from '../src/services/analytics.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting full feedback analytics cache recalculation...');
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
