const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  try {
    console.log('--- TABLES IN DB ---');
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
    console.log(JSON.stringify(tables, null, 2));

    console.log('--- SCHEMA CHECK ---');
    try {
      const count = await prisma.feedbackTemplate.count();
      console.log('FeedbackTemplate count:', count);
    } catch (e) {
      console.log('Error FeedbackTemplate:', e.message);
    }

    try {
      const count = await prisma.feedbackTemplateCategory.count();
      console.log('FeedbackTemplateCategory count:', count);
    } catch (e) {
      console.log('Error FeedbackTemplateCategory:', e.message);
    }

    try {
      const count = await prisma.feedbackCategoryOption.count();
      console.log('FeedbackCategoryOption count:', count);
    } catch (e) {
      console.log('Error FeedbackCategoryOption:', e.message);
    }

  } catch (err) {
    console.error('CRITICAL AUDIT ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
