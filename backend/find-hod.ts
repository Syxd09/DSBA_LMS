import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'shivam@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      departmentLed: true,
      department: true
    }
  });
  console.log('Logged-in HOD details:', JSON.stringify(user, null, 2));

  if (user) {
    const deptId = user.departmentId || user.departmentLed?.id;
    console.log('Department ID:', deptId);
    
    if (deptId) {
      const studentCount = await prisma.studentEnrollment.count({
        where: { departmentId: deptId }
      });
      console.log('Students in this department:', studentCount);

      const facultyCount = await prisma.user.count({
        where: { departmentId: deptId, role: 'TEACHER' }
      });
      console.log('Faculty in this department:', facultyCount);

      const subjectCount = await prisma.subject.count({
        where: {
          curriculum: {
            program: {
              departmentId: deptId
            }
          }
        }
      });
      console.log('Subjects in this department:', subjectCount);

      const feedbackCount = await prisma.teacherStudentFeedback.count({
        where: {
          student: {
            departmentId: deptId
          }
        }
      });
      console.log('Feedback entries for students in this department:', feedbackCount);
    }
  }

  const allDepts = await prisma.department.findMany({
    include: {
      hod: true,
      _count: {
        select: {
          users: true,
          studentEnrollments: true
        }
      }
    }
  });
  console.log('All departments in DB:', JSON.stringify(allDepts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
