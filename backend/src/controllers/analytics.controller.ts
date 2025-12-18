import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';


export const getCOAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId } = req.params;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        // RBAC: Verify Teacher Assignment
        if (userRole === 'TEACHER') {
            const assignment = await prisma.teacherAssignment.findFirst({
                where: {
                    teacherId: userId,
                    subjectId: subjectId
                }
            });
            if (!assignment) {
                return res.status(403).json({ message: 'Not authorized to view analytics for this subject' });
            }
        }

        // Fetch latest calculated attainment for this subject
        // We might simply average across all cohorts/semesters if not specified, 
        // or just pick the latest active one. For analytics dashboard, let's aggregate.
        const attainments = await prisma.cOAttainment.findMany({
            where: { subjectId: String(subjectId) },
            include: {
                co: true
            }
        });

        // Group by CO and average the attainment
        const coMap = new Map<string, { total: number; count: number; target: number; desc: string }>();

        attainments.forEach(att => {
            const coLabel = `CO${att.co.coNumber}`;
            const current = coMap.get(coLabel) || { total: 0, count: 0, target: 0, desc: att.co.description };
            current.total += att.achievedPercent;
            current.target += att.targetPercent;
            current.count += 1;
            coMap.set(coLabel, current);
        });

        // If no calculated data, maybe fetch COs and return 0s?
        if (coMap.size === 0) {
            const cos = await prisma.courseOutcome.findMany({
                where: { subjectId: String(subjectId) },
                orderBy: { coNumber: 'asc' }
            });
            return res.json(cos.map(co => ({
                co: `CO${co.coNumber}`,
                attainment: 0,
                target: 60, // Default
                description: co.description
            })));
        }

        const data = Array.from(coMap.entries()).map(([co, stats]) => ({
            co,
            attainment: Math.round(stats.total / stats.count),
            target: Math.round(stats.target / stats.count),
            description: stats.desc
        })).sort((a, b) => a.co.localeCompare(b.co, undefined, { numeric: true }));

        res.json(data);
    } catch (error) {
        console.error('Error fetching CO attainment:', error);
        res.status(500).json({ message: 'Error fetching CO attainment' });
    }
};

export const getBloomDistribution = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.params;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                sections: {
                    include: { questions: true }
                }
            }
        });

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // RBAC: Verify Teacher Assignment
        if (userRole === 'TEACHER') {
            const assignment = await prisma.teacherAssignment.findFirst({
                where: {
                    teacherId: userId,
                    subjectId: exam.subjectId
                }
            });
            if (!assignment) {
                return res.status(403).json({ message: 'Not authorized for this exam' });
            }
        }

        const distribution: Record<string, number> = {};
        let totalQuestions = 0;

        exam.sections.forEach(section => {
            section.questions.forEach(q => {
                distribution[q.bloomLevel] = (distribution[q.bloomLevel] || 0) + 1;
                totalQuestions++;
            });
        });

        const result = Object.keys(distribution).map(level => ({
            level,
            count: distribution[level],
            percentage: totalQuestions ? Math.round((distribution[level] / totalQuestions) * 100) : 0
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching Bloom distribution' });
    }
};

export const getSubjectPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId } = req.params;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        // RBAC: Verify Teacher Assignment to Cohort
        if (userRole === 'TEACHER') {
            const assignment = await prisma.teacherAssignment.findFirst({
                where: {
                    teacherId: userId,
                    cohortId: cohortId
                }
            });
            // Teachers can see cohort performance IF they teach that cohort (even for other subjects? Maybe restrict to their subjects?)
            // Usually performance chart shows ALL subjects for comparison. 
            // If we restrict stripy, the chart loses value. 
            // Let's restricting to "Must teach at least one subject to this cohort".
            if (!assignment) {
                return res.status(403).json({ message: 'Not authorized for this cohort' });
            }
        }

        // Get all published exams for this cohort
        const exams = await prisma.exam.findMany({
            where: {
                cohortId,
                status: 'PUBLISHED'
            },
            include: {
                subject: true,
                computedMarks: true
            }
        });

        // Group by subject
        const subjectStats = new Map<string, {
            name: string;
            code: string;
            totalMarks: number;
            maxMarks: number;
            studentCount: number;
            passed: number;
            highest: number;
            lowest: number;
        }>();

        exams.forEach(exam => {
            const subjectId = exam.subjectId;
            const current = subjectStats.get(subjectId) || {
                name: exam.subject.name,
                code: exam.subject.code,
                totalMarks: 0,
                maxMarks: 0,
                studentCount: 0,
                passed: 0,
                highest: 0,
                lowest: 100 // Percent
            };

            exam.computedMarks.forEach(mark => {
                const percentage = (Number(mark.totalMarks) / exam.maxMarks) * 100;
                current.totalMarks += percentage;
                current.studentCount++;
                if (percentage >= 50) current.passed++; // Assuming 50% pass
                if (percentage > current.highest) current.highest = percentage;
                if (percentage < current.lowest) current.lowest = percentage;
            });

            // Average across exams? Simple aggregation for now
            subjectStats.set(subjectId, current);
        });

        // If teacher, maybe filter to only their subjects?
        // "teachers should only be able to see ... subjects assigned to that teacher only"
        let allowedSubjectIds: string[] = [];
        if (userRole === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId, cohortId },
                select: { subjectId: true }
            });
            allowedSubjectIds = assignments.map(a => a.subjectId);
        }

        const data = Array.from(subjectStats.entries())
            .filter(([subId]) => userRole !== 'TEACHER' || allowedSubjectIds.includes(subId))
            .map(([subId, stats]) => ({
                subjectId: subId,
                subjectName: stats.name,
                subjectCode: stats.code,
                average: stats.studentCount ? Math.round(stats.totalMarks / stats.studentCount) : 0,
                highest: Math.round(stats.highest),
                lowest: stats.studentCount ? Math.round(stats.lowest) : 0,
                passRate: stats.studentCount ? Math.round((stats.passed / stats.studentCount) * 100) : 0,
                totalStudents: stats.studentCount
            }));

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching performance' });
    }
};

export const getDepartmentStats = async (req: AuthRequest, res: Response) => {
    try {
        // HOD only sees their department
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        let where = {};
        if (userRole === 'HOD') {
            const hod = await prisma.department.findUnique({ where: { hodId: userId } });
            if (hod) where = { id: hod.id };
        }

        const departments = await prisma.department.findMany({
            where,
            include: {
                _count: {
                    select: { users: true, programs: true }
                }
            }
        });

        // Count teachers specifically (users includes students)
        const stats = await Promise.all(departments.map(async (dept) => {
            const teachers = await prisma.user.count({
                where: { departmentId: dept.id, role: 'TEACHER' }
            });
            const students = await prisma.user.count({
                where: { departmentId: dept.id, role: 'STUDENT' }
            });

            return {
                id: dept.id,
                name: dept.name,
                code: dept.code,
                students: students,
                teachers: teachers,
                programs: dept._count.programs
            };
        }));

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching department stats' });
    }
};
