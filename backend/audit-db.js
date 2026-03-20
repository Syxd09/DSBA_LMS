const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  try {
    console.log('--- Database Audit ---');
    
    // Check tables
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
    console.log('Found tables:', tables.map(t => t.tablename).join(', '));

    // Check FeedbackTemplate table specifically
    const templateCount = await prisma.feedbackTemplate.count().catch(e => {
        console.error('Error counting FeedbackTemplate:', e.message);
        return 'ERROR';
    });
    console.log('FeedbackTemplate count:', templateCount);

    // Check Categories
    const categoryCount = await prisma.feedbackTemplateCategory.count().catch(e => {
        console.error('Error counting FeedbackTemplateCategory:', e.message);
        return 'ERROR';
    });
    console.log('FeedbackTemplateCategory count:', categoryCount);

    // Check Options
    const optionCount = await prisma.feedbackCategoryOption.count().catch(e => {
        console.error('Error counting FeedbackCategoryOption:', e.message);
        return 'ERROR';
    });
    console.log('FeedbackCategoryOption count:', optionCount);

    // Check if there are any templates without categories or categories without options
    const brokenTemplates = await prisma.feedbackTemplate.findMany({
        where: { categories: { none: {} } },
        select: { id: true, name: true }
    });
    console.log('Templates without categories:', brokenTemplates.length);

    const brokenCategories = await prisma.feedbackTemplateCategory.findMany({
        where: { options: { none: {} } },
        select: { id: true, name: true, templateId: true }
    });
    console.log('Categories without options:', brokenCategories.length);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
