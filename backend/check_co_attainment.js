const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const sample = await prisma.finalMark.findFirst({
      where: { coAttainment: { not: null } }
    });
    console.log('---START---');
    console.log(JSON.stringify(sample?.coAttainment, null, 2));
    console.log('---END---');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
