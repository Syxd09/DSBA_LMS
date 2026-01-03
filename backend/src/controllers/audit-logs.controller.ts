
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { action, limit = 100 } = req.query;

        const whereClause: import('@prisma/client').Prisma.AuditLogWhereInput = {};
        if (action && action !== 'all') {
            whereClause.action = action as string;
        }

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string) || 100,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true
                    }
                }
            }
        });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Error fetching audit logs', error: String(error) });
    }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const [
            departmentCount,
            programCount,
            userCount,
            cohortCount,
            subjectCount,
            examCount,
            teacherCount,
            studentCount,
            pendingApprovalsCount
        ] = await Promise.all([
            prisma.department.count(),
            prisma.program.count(),
            prisma.user.count(),
            prisma.cohort.count(),
            prisma.subject.count(),
            prisma.exam.count(),
            prisma.user.count({ where: { role: 'TEACHER' } }),
            prisma.user.count({ where: { role: 'STUDENT' } }),
            prisma.approvalRequest.count({ where: { status: 'PENDING' } })
        ]);

        // Calculate departments without subjects
        // Note: Departments don't directly have subjects. Subjects are linked via:
        // Department -> Program -> CurriculumVersion -> Subject
        const allDepartments = await prisma.department.findMany({
            select: {
                id: true,
                programs: {
                    select: {
                        curriculums: {
                            select: {
                                _count: {
                                    select: { subjects: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Count departments that have no subjects across all their programs/curriculums
        const departmentsWithoutSubjects = allDepartments.filter(dept => {
            const totalSubjects = dept.programs.reduce((sum, prog) => {
                const progSubjects = prog.curriculums.reduce((psum, curr) => psum + curr._count.subjects, 0);
                return sum + progSubjects;
            }, 0);
            return totalSubjects === 0;
        }).length;

        // Calculate subjects without CO attainments
        const subjectsWithoutAttainments = await prisma.subject.count({
            where: {
                courseOutcomes: {
                    none: {}
                }
            }
        });

        res.json({
            departments: departmentCount,
            programs: programCount,
            users: userCount,
            cohorts: cohortCount,
            subjects: subjectCount,
            exams: examCount,
            teachers: teacherCount,
            students: studentCount,
            // Alert data
            alerts: {
                pendingApprovals: pendingApprovalsCount,
                departmentsWithoutSubjects: departmentsWithoutSubjects,
                incompleteAttainments: subjectsWithoutAttainments,
                studentsAtRisk: 0 // Placeholder for future implementation
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats', error: String(error) });
    }
};
