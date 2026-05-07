import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
  const cohorts = await prisma.cohort.findMany({ include: { program: true } });
  console.log('--- Cohorts ---');
  cohorts.forEach(c => console.log(`${c.name} (ID: ${c.id}) - Program: ${c.program.name} - Sem: ${c.currentSemester}`));

  const assignments = await prisma.teacherAssignment.findMany({
    include: { teacher: true, subject: true, cohort: true }
  });
  console.log('\n--- Teacher Assignments ---');
  if (assignments.length === 0) {
    console.log('No assignments found.');
  } else {
    assignments.forEach(a => {
      console.log(`Teacher: ${a.teacher.fullName}, Subject: ${a.subject.name} (${a.subject.code}), Cohort: ${a.cohort.name}, Sem: ${a.semester}`);
    });
  }

  const marks = await prisma.finalMark.findMany({
    include: { subject: true, student: true, cohort: true },
    take: 10
  });
  console.log('\n--- Sample Final Marks ---');
  marks.forEach(m => {
    console.log(`Student: ${m.student.fullName}, Subject: ${m.subject.name} (${m.subject.code}), Cohort: ${m.cohort.name}`);
  });
}

checkData().finally(() => prisma.$disconnect());
