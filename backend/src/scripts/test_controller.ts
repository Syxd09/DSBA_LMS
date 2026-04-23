import { getEnrollments } from '../controllers/enrollments.controller';
import prisma from '../services/db';

async function testController() {
    const teacherEmail = 'teacher1.cse@college.edu';
    const user = await prisma.user.findUnique({ where: { email: teacherEmail } });
    
    if (!user) {
        console.log('Teacher not found');
        return;
    }

    const req: any = {
        query: {
            cohortId: 'f47e7327-d451-4c18-aa22-79d2edecfade',
            semester: '1'
        },
        user: {
            userId: user.id,
            role: 'TEACHER'
        }
    };

    const res: any = {
        json: (data: any) => {
            console.log('--- API Response ---');
            console.log(`Count: ${data.length || 0}`);
            if (data.length > 0) {
                console.log('First student:', data[0].student.fullName);
            }
            console.log(JSON.stringify(data, null, 2));
        },
        status: (code: number) => {
            console.log('Status:', code);
            return res;
        }
    };

    await getEnrollments(req, res);
}

testController().finally(() => prisma.$disconnect());
