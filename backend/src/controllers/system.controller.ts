import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import bcrypt from 'bcrypt';

// Seed demo data for testing
export const seedDemoData = async (req: AuthRequest, res: Response) => {
    try {
        const results = {
            departments: 0,
            programs: 0,
            cohorts: 0,
            students: 0,
            teachers: 0,
            subjects: 0,
            courseOutcomes: 0,
        };

        // 1. Create Departments
        const deptCS = await prisma.department.upsert({
            where: { code: 'CS' },
            update: {},
            create: { name: 'Computer Science', code: 'CS' }
        });
        const deptEC = await prisma.department.upsert({
            where: { code: 'EC' },
            update: {},
            create: { name: 'Electronics & Communication', code: 'EC' }
        });
        results.departments = 2;

        // 2. Create Programs
        const progBCA = await prisma.program.upsert({
            where: { code: 'BCA' },
            update: {},
            create: { name: 'Bachelor of Computer Applications', code: 'BCA', departmentId: deptCS.id, durationYears: 3 }
        });
        const progMCA = await prisma.program.upsert({
            where: { code: 'MCA' },
            update: {},
            create: { name: 'Master of Computer Applications', code: 'MCA', departmentId: deptCS.id, durationYears: 2 }
        });
        const progBE = await prisma.program.upsert({
            where: { code: 'BE-EC' },
            update: {},
            create: { name: 'Bachelor of Engineering (EC)', code: 'BE-EC', departmentId: deptEC.id, durationYears: 4 }
        });
        results.programs = 3;

        // 3. Create Curriculum Versions
        const cvBCA = await prisma.curriculumVersion.upsert({
            where: { id: 'cv-bca-2024' },
            update: {},
            create: { id: 'cv-bca-2024', programId: progBCA.id, versionName: '2024 Curriculum', effectiveFrom: 2024 }
        });
        const cvMCA = await prisma.curriculumVersion.upsert({
            where: { id: 'cv-mca-2024' },
            update: {},
            create: { id: 'cv-mca-2024', programId: progMCA.id, versionName: '2024 Curriculum', effectiveFrom: 2024 }
        });

        // 4. Create Cohorts
        const cohortBCA = await prisma.cohort.upsert({
            where: { id: 'cohort-bca-2024' },
            update: {},
            create: { id: 'cohort-bca-2024', name: 'BCA 2024-27', year: 2024, programId: progBCA.id, currentSemester: 1 }
        });
        const cohortMCA = await prisma.cohort.upsert({
            where: { id: 'cohort-mca-2024' },
            update: {},
            create: { id: 'cohort-mca-2024', name: 'MCA 2024-26', year: 2024, programId: progMCA.id, currentSemester: 1 }
        });
        results.cohorts = 2;

        // 5. Create Subjects
        const subjects = [
            { code: 'CS101', name: 'Programming Fundamentals', credits: 4, semester: 1, curriculumVersionId: cvBCA.id },
            { code: 'CS102', name: 'Data Structures', credits: 4, semester: 1, curriculumVersionId: cvBCA.id },
            { code: 'CS103', name: 'Database Management', credits: 3, semester: 2, curriculumVersionId: cvBCA.id },
            { code: 'MCA101', name: 'Advanced Programming', credits: 4, semester: 1, curriculumVersionId: cvMCA.id },
        ];

        for (const subj of subjects) {
            await prisma.subject.upsert({
                where: { code: subj.code },
                update: {},
                create: subj
            });
            results.subjects++;
        }

        // 6. Create Teachers
        const hashedPassword = await bcrypt.hash('Teacher@123', 10);
        const teacherEmails = [
            { email: 'john.doe@college.edu', fullName: 'Dr. John Doe', deptId: deptCS.id },
            { email: 'jane.smith@college.edu', fullName: 'Prof. Jane Smith', deptId: deptCS.id },
            { email: 'david.wilson@college.edu', fullName: 'Dr. David Wilson', deptId: deptEC.id },
        ];

        for (const t of teacherEmails) {
            await prisma.user.upsert({
                where: { email: t.email },
                update: {},
                create: {
                    email: t.email,
                    fullName: t.fullName,
                    password: hashedPassword,
                    role: 'TEACHER',
                    departmentId: t.deptId
                }
            });
            results.teachers++;
        }

        // 7. Create Students
        const studentPassword = await bcrypt.hash('Student@123', 10);
        const studentData = [
            { email: 'student1@college.edu', fullName: 'Amit Kumar', roll: '2024BCA001', cohortId: cohortBCA.id, deptId: deptCS.id },
            { email: 'student2@college.edu', fullName: 'Priya Sharma', roll: '2024BCA002', cohortId: cohortBCA.id, deptId: deptCS.id },
            { email: 'student3@college.edu', fullName: 'Rahul Verma', roll: '2024BCA003', cohortId: cohortBCA.id, deptId: deptCS.id },
            { email: 'student4@college.edu', fullName: 'Sneha Patel', roll: '2024BCA004', cohortId: cohortBCA.id, deptId: deptCS.id },
            { email: 'student5@college.edu', fullName: 'Vikram Singh', roll: '2024BCA005', cohortId: cohortBCA.id, deptId: deptCS.id },
            { email: 'student6@college.edu', fullName: 'Ananya Reddy', roll: '2024MCA001', cohortId: cohortMCA.id, deptId: deptCS.id },
            { email: 'student7@college.edu', fullName: 'Karthik Nair', roll: '2024MCA002', cohortId: cohortMCA.id, deptId: deptCS.id },
        ];

        for (const s of studentData) {
            const user = await prisma.user.upsert({
                where: { email: s.email },
                update: {},
                create: {
                    email: s.email,
                    fullName: s.fullName,
                    password: studentPassword,
                    role: 'STUDENT',
                    departmentId: s.deptId
                }
            });

            await prisma.studentEnrollment.upsert({
                where: { rollNumber: s.roll },
                update: {},
                create: {
                    studentId: user.id,
                    cohortId: s.cohortId,
                    departmentId: s.deptId,
                    semester: 1,
                    rollNumber: s.roll,
                    status: 'active'
                }
            });
            results.students++;
        }

        // 8. Create Course Outcomes for first subject
        const cs101 = await prisma.subject.findUnique({ where: { code: 'CS101' } });
        if (cs101) {
            const cos = [
                { coNumber: 1, description: 'Understand basic programming concepts', bloomLevel: 'Understand' },
                { coNumber: 2, description: 'Apply programming logic to solve problems', bloomLevel: 'Apply' },
                { coNumber: 3, description: 'Analyze algorithms for efficiency', bloomLevel: 'Analyze' },
            ];

            for (const co of cos) {
                await prisma.courseOutcome.upsert({
                    where: { id: `co-cs101-${co.coNumber}` },
                    update: {},
                    create: {
                        id: `co-cs101-${co.coNumber}`,
                        subjectId: cs101.id,
                        coNumber: co.coNumber,
                        description: co.description,
                        bloomLevel: co.bloomLevel as import('@prisma/client').BloomLevel
                    }
                });
                results.courseOutcomes++;
            }
        }

        // 9. Create Admin/Principal/HOD users
        const adminPassword = await bcrypt.hash('Admin@123', 10);
        await prisma.user.upsert({
            where: { email: 'admin@college.edu' },
            update: {},
            create: { email: 'admin@college.edu', fullName: 'System Admin', password: adminPassword, role: 'ADMIN' }
        });
        await prisma.user.upsert({
            where: { email: 'principal@college.edu' },
            update: {},
            create: { email: 'principal@college.edu', fullName: 'Dr. Principal', password: adminPassword, role: 'PRINCIPAL' }
        });

        // Create HOD and link to department
        const hodUser = await prisma.user.upsert({
            where: { email: 'hod.cs@college.edu' },
            update: {},
            create: { email: 'hod.cs@college.edu', fullName: 'Dr. HOD Computer Science', password: adminPassword, role: 'HOD', departmentId: deptCS.id }
        });
        await prisma.department.update({
            where: { id: deptCS.id },
            data: { hodId: hodUser.id }
        });

        res.json({
            message: 'Demo data seeded successfully!',
            results,
            credentials: {
                admin: { email: 'admin@college.edu', password: 'Admin@123' },
                principal: { email: 'principal@college.edu', password: 'Admin@123' },
                hod: { email: 'hod.cs@college.edu', password: 'Admin@123' },
                teacher: { email: 'john.doe@college.edu', password: 'Teacher@123' },
                student: { email: 'student1@college.edu', password: 'Student@123' }
            }
        });
    } catch (error) {
        console.error('Error seeding demo data:', error);
        res.status(500).json({ message: 'Error seeding demo data', error: String(error) });
    }
};

// Clear all data (for reset)
export const clearAllData = async (req: AuthRequest, res: Response) => {
    try {
        // Delete in order of dependencies
        await prisma.studentMark.deleteMany();
        await prisma.marksComputed.deleteMany();
        await prisma.finalMark.deleteMany();
        await prisma.semesterResult.deleteMany();
        await prisma.studentEnrollment.deleteMany();
        await prisma.teacherAssignment.deleteMany();
        await prisma.subQuestion.deleteMany();
        await prisma.question.deleteMany();
        await prisma.exam.deleteMany();
        await prisma.coPoMapping.deleteMany();
        await prisma.courseOutcome.deleteMany();
        await prisma.subject.deleteMany();
        await prisma.cohort.deleteMany();
        await prisma.curriculumVersion.deleteMany();
        await prisma.program.deleteMany();
        await prisma.department.updateMany({ data: { hodId: null } });
        await prisma.user.deleteMany();
        await prisma.department.deleteMany();

        res.json({ message: 'All data cleared successfully' });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ message: 'Error clearing data', error: String(error) });
    }
};
