import { Response } from 'express';
import { AuthRequest } from '../middleware/feedback-rbac.middleware';
import prisma from '../services/db';
import {
    getAnalytics,
    forceRecalculateAll,
    recalculateStaleAnalytics
} from '../services/analytics.service';


/**
 * @route   GET /api/feedback-analytics/student/:studentId
 * @desc    Get analytics for a student (with optional filters)
 * @access  Student (own), Teacher (assigned), HOD (dept), Principal, Admin
 */
export const getStudentFeedbackAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { studentId } = req.params;
        const { subjectId, semester } = req.query;

        // RBAC: Student can only view own analytics
        if (user.role === 'STUDENT' && studentId !== user.id) {
            return res.status(403).json({ message: 'You can only view your own analytics' });
        }

        // RBAC: HOD can only view department students
        if (user.role === 'HOD') {
            const student = await prisma.user.findUnique({
                where: { id: studentId },
                select: { departmentId: true }
            });

            if (student?.departmentId !== user.departmentId) {
                return res.status(403).json({
                    message: 'You can only view analytics for students in your department'
                });
            }
        }

        // Build where clause for feedback
        const whereClause: any = {
            studentId,
            status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED'] }  // Only non-DRAFT feedback
        };

        if (subjectId) {
            whereClause.subjectId = subjectId as string;
        }
        if (semester) {
            whereClause.semester = parseInt(semester as string);
        }

        // Get all feedback for the student
        const feedbacks = await prisma.teacherStudentFeedback.findMany({
            where: whereClause,
            include: {
                subject: {
                    select: { id: true, name: true, code: true }
                },
                teacher: {
                    select: { id: true, fullName: true, registrationNumber: true }
                },
                cohort: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get or calculate analytics for each feedback
        const analytics = await Promise.all(
            feedbacks.map(async (feedback) => {
                try {
                    const analyticsData = await getAnalytics(feedback.id);

                    return {
                        feedbackId: feedback.id,
                        subject: feedback.subject,
                        semester: feedback.semester,
                        teacher: feedback.teacher,
                        cohort: feedback.cohort,
                        starRating: feedback.starRating,
                        avgMarks: analyticsData.avgMarks,
                        marksBand: analyticsData.marksBand,
                        feedbackScore: analyticsData.feedbackScore,
                        alignmentIndex: analyticsData.alignmentIndex,
                        riskLevel: analyticsData.riskLevel,
                        categoryInsights: analyticsData.categoryInsights,
                        calculatedAt: analyticsData.calculatedAt,
                        isStale: analyticsData.isStale
                    };
                } catch (error) {
                    console.error(`Failed to get analytics for feedback ${feedback.id}:`, error);
                    return null;
                }
            })
        );

        // Filter out failed analytics
        const validAnalytics = analytics.filter(a => a !== null);

        return res.json({
            studentId,
            analytics: validAnalytics
        });
    } catch (error: any) {
        console.error('Error getting student analytics:', error);
        return res.status(500).json({
            message: 'Failed to get student analytics',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/feedback-analytics/department/:departmentId
 * @desc    Get aggregated analytics for a department
 * @access  HOD (own dept), Principal, Admin
 */
export const getDepartmentAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // RBAC: Only HOD (own dept), Principal, Admin
        if (user.role !== 'HOD' && user.role !== 'PRINCIPAL' && user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { departmentId } = req.params;

        // RBAC: HOD can only view own department
        if (user.role === 'HOD' && departmentId !== user.departmentId) {
            return res.status(403).json({
                message: 'You can only view analytics for your own department'
            });
        }

        const { semester, cohortId, teacherId } = req.query;

        // Get department info
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
            select: { id: true, name: true }
        });

        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Build where clause for analytics
        const whereClause: any = {
            feedback: {
                student: {
                    departmentId
                },
                status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED'] }
            }
        };

        if (semester) {
            whereClause.feedback.semester = parseInt(semester as string);
        }
        if (cohortId) {
            whereClause.feedback.cohortId = cohortId as string;
        }
        if (teacherId) {
            whereClause.feedback.teacherId = teacherId as string;
        }

        // Get all analytics for the department
        const analyticsCache = await prisma.feedbackAnalyticsCache.findMany({
            where: whereClause,
            include: {
                feedback: {
                    include: {
                        student: {
                            select: { id: true, fullName: true, registrationNumber: true }
                        },
                        subject: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });

        // Calculate aggregate statistics
        const totalFeedback = analyticsCache.length;

        let totalFeedbackScore = 0;
        let totalMarks = 0;
        let totalAlignment = 0;
        let marksCount = 0;
        let alignmentCount = 0;

        const riskDistribution = {
            CRITICAL: 0,
            HIGH: 0,
            MODERATE: 0,
            STABLE: 0
        };

        const bandDistribution = {
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0
        };

        const atRiskStudents: any[] = [];

        analyticsCache.forEach(analytics => {
            totalFeedbackScore += analytics.feedbackScore || 0;

            if (analytics.avgMarks !== null) {
                totalMarks += analytics.avgMarks;
                marksCount++;
            }

            if (analytics.alignmentIndex !== null) {
                totalAlignment += analytics.alignmentIndex;
                alignmentCount++;
            }

            // Risk distribution
            if (analytics.riskLevel) {
                riskDistribution[analytics.riskLevel as keyof typeof riskDistribution]++;
            }

            // Band distribution
            if (analytics.marksBand) {
                bandDistribution[analytics.marksBand as keyof typeof bandDistribution]++;
            }

            // Collect at-risk students
            if (analytics.riskLevel === 'CRITICAL' || analytics.riskLevel === 'HIGH') {
                atRiskStudents.push({
                    studentId: analytics.feedback.student.id,
                    studentName: analytics.feedback.student.fullName,
                    subjectId: analytics.feedback.subject.id,
                    subjectName: analytics.feedback.subject.name,
                    riskLevel: analytics.riskLevel,
                    avgMarks: analytics.avgMarks,
                    alignmentIndex: analytics.alignmentIndex
                });
            }
        });

        const avgFeedbackScore = totalFeedback > 0
            ? Math.round((totalFeedbackScore / totalFeedback) * 100) / 100
            : 0;

        const avgMarks = marksCount > 0
            ? Math.round((totalMarks / marksCount) * 100) / 100
            : 0;

        const avgAlignmentIndex = alignmentCount > 0
            ? Math.round((totalAlignment / alignmentCount) * 100) / 100
            : 0;

        return res.json({
            departmentId,
            departmentName: department.name,
            summary: {
                totalFeedback,
                avgFeedbackScore,
                avgMarks,
                avgAlignmentIndex,
                riskDistribution,
                bandDistribution
            },
            atRiskStudents: atRiskStudents.slice(0, 20)  // Top 20 at-risk students
        });
    } catch (error: any) {
        console.error('Error getting department analytics:', error);
        return res.status(500).json({
            message: 'Failed to get department analytics',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/feedback-analytics/college
 * @desc    Get aggregated analytics for entire college
 * @access  Principal, Admin
 */
export const getCollegeAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // RBAC: Only Principal/Admin
        if (user.role !== 'PRINCIPAL' && user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only Principal or Admin can view college-wide analytics' });
        }

        const { semester, departmentId } = req.query;

        // Build where clause
        const whereClause: any = {
            feedback: {
                status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED'] }
            }
        };

        if (semester) {
            whereClause.feedback.semester = parseInt(semester as string);
        }
        if (departmentId) {
            whereClause.feedback.student = {
                departmentId: departmentId as string
            };
        }

        // Get all analytics
        const analyticsCache = await prisma.feedbackAnalyticsCache.findMany({
            where: whereClause,
            include: {
                feedback: {
                    include: {
                        student: {
                            select: {
                                departmentId: true,
                                department: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Calculate college-wide statistics
        const totalFeedback = analyticsCache.length;

        let totalFeedbackScore = 0;
        let totalMarks = 0;
        let totalAlignment = 0;
        let marksCount = 0;
        let alignmentCount = 0;

        const riskDistribution = {
            CRITICAL: 0,
            HIGH: 0,
            MODERATE: 0,
            STABLE: 0
        };

        const departmentStats: Map<string, any> = new Map();

        analyticsCache.forEach(analytics => {
            totalFeedbackScore += analytics.feedbackScore || 0;

            if (analytics.avgMarks !== null) {
                totalMarks += analytics.avgMarks;
                marksCount++;
            }

            if (analytics.alignmentIndex !== null) {
                totalAlignment += analytics.alignmentIndex;
                alignmentCount++;
            }

            // Risk distribution
            if (analytics.riskLevel) {
                riskDistribution[analytics.riskLevel as keyof typeof riskDistribution]++;
            }

            // Department-wise statistics
            const deptId = analytics.feedback.student.departmentId;
            if (deptId) {
                if (!departmentStats.has(deptId)) {
                    departmentStats.set(deptId, {
                        departmentId: deptId,
                        departmentName: analytics.feedback.student.department?.name || 'Unknown',
                        count: 0,
                        totalFeedbackScore: 0,
                        totalMarks: 0,
                        marksCount: 0
                    });
                }

                const deptStat = departmentStats.get(deptId);
                deptStat.count++;
                deptStat.totalFeedbackScore += analytics.feedbackScore || 0;
                if (analytics.avgMarks !== null) {
                    deptStat.totalMarks += analytics.avgMarks;
                    deptStat.marksCount++;
                }
            }
        });

        const avgFeedbackScore = totalFeedback > 0
            ? Math.round((totalFeedbackScore / totalFeedback) * 100) / 100
            : 0;

        const avgMarks = marksCount > 0
            ? Math.round((totalMarks / marksCount) * 100) / 100
            : 0;

        const avgAlignmentIndex = alignmentCount > 0
            ? Math.round((totalAlignment / alignmentCount) * 100) / 100
            : 0;

        // Format department comparison
        const departmentComparison = Array.from(departmentStats.values()).map(dept => ({
            departmentId: dept.departmentId,
            departmentName: dept.departmentName,
            totalStudents: dept.count,
            avgFeedbackScore: dept.count > 0
                ? Math.round((dept.totalFeedbackScore / dept.count) * 100) / 100
                : 0,
            avgMarks: dept.marksCount > 0
                ? Math.round((dept.totalMarks / dept.marksCount) * 100) / 100
                : 0
        }));

        return res.json({
            summary: {
                totalFeedback,
                avgFeedbackScore,
                avgMarks,
                avgAlignmentIndex,
                riskDistribution
            },
            departmentComparison
        });
    } catch (error: any) {
        console.error('Error getting college analytics:', error);
        return res.status(500).json({
            message: 'Failed to get college analytics',
            error: error.message
        });
    }
};

/**
 * @route   POST /api/feedback-analytics/recalculate
 * @desc    Manually recalculate analytics (Admin only)
 * @access  Admin
 */
export const manualRecalculate = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // RBAC: Admin only
        if (user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only administrators can manually recalculate analytics' });
        }

        const { studentId, subjectId, semester, departmentId, forceAll } = req.body;

        const startTime = Date.now();
        let count = 0;

        // Force recalculate all OR only stale
        if (forceAll) {
            count = await forceRecalculateAll({
                studentId,
                subjectId,
                semester,
                departmentId
            });
        } else {
            count = await recalculateStaleAnalytics({
                studentId,
                subjectId,
                semester,
                departmentId
            });
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        return res.json({
            message: 'Analytics recalculated successfully',
            count,
            duration: `${duration}s`,
            mode: forceAll ? 'force' : 'stale-only'
        });
    } catch (error: any) {
        console.error('Error recalculating analytics:', error);
        return res.status(500).json({
            message: 'Failed to recalculate analytics',
            error: error.message
        });
    }
};
