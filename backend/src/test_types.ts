import { Prisma } from '@prisma/client';

type UserUpdate = Prisma.UserUpdateInput;
const x: UserUpdate = {
    teacherAssignments: {
        deleteMany: {}
    }
};
console.log('Types match');
