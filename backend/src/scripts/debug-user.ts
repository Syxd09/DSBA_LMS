
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const email = 'teacher.1cse@college.edu';
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            teacherAssignments: {
                include: { cohort: true, subject: true }
            }
        }
    });

    const result = {
        email,
        found: !!user,
        user: user ? {
            id: user.id,
            role: user.role,
            assignmentCount: user.teacherAssignments.length,
            assignments: user.teacherAssignments.map(a => ({
                id: a.id,
                cohortId: a.cohortId,
                cohortName: a.cohort.name,
                semester: a.semester,
                subject: a.subject.code
            }))
        } : null
    };

    fs.writeFileSync('tmp/user_debug.json', JSON.stringify(result, null, 2));
    console.log('Result written to tmp/user_debug.json');
}

main().finally(() => prisma.$disconnect());
