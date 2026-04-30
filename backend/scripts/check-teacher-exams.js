const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({
    where: { fullName: { contains: 'Kavita' } }
  });
  
  if (!user) {
    console.log('Teacher not found');
    return;
  }
  
  console.log('User Found:', user.id, user.fullName);
  
  const exams = await prisma.exam.findMany({
    where: { teacherId: user.id },
    include: {
      subject: true,
      cohort: true
    }
  });
  
  console.log('Exams found:', exams.length);
  console.log(JSON.stringify(exams, null, 2));
}

run().finally(() => prisma.$disconnect());
