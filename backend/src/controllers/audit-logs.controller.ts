
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const logs = await prisma.auditLog.findMany({
            where: {},
            orderBy: { createdAt: 'desc' },
            take: parseInt(String(limit)) || 50,
            skip: parseInt(String(offset)) || 0
        });

        // Get all unique user IDs from logs
        const userIds = [...new Set(logs.map(log => log.userId))];

        // Fetch all users in one query
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, email: true, role: true }
        });

        // Create lookup map
        const userMap = new Map(users.map(u => [u.id, u]));

        // Transform logs
        const result = logs.map(log => {
            const user = userMap.get(log.userId);
            return {
                id: log.id,
                userId: log.userId,
                userName: user?.fullName || 'Unknown User',
                action: log.action,
                tableName: log.entityType,
                recordId: log.entityId,
                oldData: log.oldValue,
                newData: log.newValue,
                description: log.description,
                ipAddress: log.ipAddress,
                createdAt: log.createdAt.toISOString(),
                user: { fullName: user?.fullName || 'Unknown User', email: user?.email || '' }
            };
        });

        res.json(result);
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

        const allDepartments = await prisma.department.findMany({
            select: {
                id: true,
                programs: {
                    select: {
                        curricula: {
                            select: {
                                _count: { select: { subjects: true } }
                            }
                        }
                    }
                }
            }
        });

        const departmentsWithoutSubjects = allDepartments.filter((dept: any) => {
            const totalSubjects = dept.programs.reduce((sum: number, prog: any) => {
                const progSubjects = prog.curricula.reduce((psum: number, curr: any) => psum + curr._count.subjects, 0);
                return sum + progSubjects;
            }, 0);
            return totalSubjects === 0;
        }).length;

        const subjectsWithoutAttainments = await prisma.subject.count({
            where: { courseOutcomes: { none: {} } }
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
            alerts: {
                pendingApprovals: pendingApprovalsCount,
                departmentsWithoutSubjects: departmentsWithoutSubjects,
                incompleteAttainments: subjectsWithoutAttainments,
                studentsAtRisk: 0
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats', error: String(error) });
    }
};
