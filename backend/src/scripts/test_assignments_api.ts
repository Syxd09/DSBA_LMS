import { getAssignments } from '../controllers/assignments.controller';
import prisma from '../services/db';

async function testAssignments() {
    const teacherEmail = 'teacher1.cse@college.edu';
    const user = await prisma.user.findUnique({ where: { email: teacherEmail } });
    
    if (!user) {
        console.log('Teacher not found');
        return;
    }

    const req: any = {
        query: {},
        user: {
            userId: user.id,
            role: 'TEACHER'
        }
    };

    const res: any = {
        json: (data: any) => {
            console.log('--- Assignments Response ---');
            console.log(`Count: ${data.length || 0}`);
            if (data.length > 0) {
                console.log('First Assignment:', JSON.stringify(data[0], null, 2));
            }
        },
        status: (code: number) => {
            console.log('Status:', code);
            return res;
        }
    };

    await getAssignments(req, res);
}

testAssignments().finally(() => prisma.$disconnect());
