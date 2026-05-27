import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Student Analytics Controller
 * Provides detailed student performance analysis and at-risk detection
 */

interface StudentPerformance {
    studentId: string;
    studentName: string;
    registrationNumber: string;
    cohortName: string;
    overallPerformance: {
        totalExams: number;
        averagePercentage: number;
        passRate: number;
        grade: string;
    };
    subjectPerformance: Array<{
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        averageMarks: number;
        maxMarks: number;
        percentage: number;
        status: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'At Risk';
        examsCompleted: number;
    }>;
    coPerformance: Array<{
        coId: string;
        coNumber: number;
        description: string;
        achievedPercent: number;
        status: 'Strong' | 'Moderate' | 'Weak';
    }>;
    bloomPerformance: Array<{
        level: string;
        percentage: number;
        strength: 'Strong' | 'Moderate' | 'Weak';
    }>;
    trend: {
        isImproving: boolean;
        changePercent: number;
        message: string;
    };
    riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    recommendations: string[];
}

function determineBloomLevel(marksObtained: number, maxMarks: number): 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' {
    const percentage = (marksObtained / maxMarks) * 100;

    if (percentage >= 90) return 'CREATE';
    if (percentage >= 75) return 'EVALUATE';
    if (percentage >= 60) return 'ANALYZE';
    if (percentage >= 45) return 'APPLY';
    if (percentage >= 30) return 'UNDERSTAND';
    return 'REMEMBER';
}

/**
 * Calculate trend analysis by comparing current performance with historical data
 */
async function calculateTrendAnalysis(
    studentId: string,
    currentPercentage: number,
    currentMarks: any[]
): Promise<{ isImproving: boolean; changePercent: number; message: string }> {
    try {
        if (!currentMarks || currentMarks.length === 0) {
            return {
                isImproving: false,
                changePercent: 0,
                message: 'No current marks available for comparison'
            };
        }

        // Get historical marks (limit to last 100 for performance)
        const historicalMarks = await prisma.studentMark.findMany({
            where: {
                studentId,
                NOT: {
                    id: { in: currentMarks.map(m => m.id) }
                }
            },
            include: {
                subQuestion: {
                    select: {
                        maxMarks: true
                    }
                }
            },
            orderBy: {
                enteredAt: 'desc'
            },
            take: 100
        });

        if (historicalMarks.length === 0) {
            return {
                isImproving: false,
                changePercent: 0,
                message: 'Insufficient historical data for trend analysis'
            };
        }

        // Calculate historical average percentage
        let historicalTotalMarks = 0;
        let historicalMaxMarks = 0;

        for (const mark of historicalMarks) {
            historicalTotalMarks += mark.marksObtained;
            historicalMaxMarks += mark.subQuestion.maxMarks;
        }

        if (historicalMaxMarks === 0) {
            return {
                isImproving: false,
                changePercent: 0,
                message: 'Invalid historical data'
            };
        }

        const historicalPercentage = (historicalTotalMarks / historicalMaxMarks) * 100;
        const changePercent = Number((currentPercentage - historicalPercentage).toFixed(2));
        const isImproving = changePercent > 0;

        let message = '';
        if (Math.abs(changePercent) < 2) {
            message = 'Performance is stable with minimal change';
        } else if (isImproving) {
            message = `Performance improved by ${Math.abs(changePercent).toFixed(1)}% compared to historical average`;
        } else {
            message = `Performance declined by ${Math.abs(changePercent).toFixed(1)}% compared to historical average`;
        }

        return {
            isImproving,
            changePercent,
            message
        };
    } catch (error) {
        console.error('Error calculating trend:', error);
        return {
            isImproving: false,
            changePercent: 0,
            message: 'Trend calculation unavailable'
        };
    }
}

/**
 * Get comprehensive analytics for a single student
 */
export const getStudentAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const { cohortId, semester } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Get student enrollment info
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                ...(cohortId && { cohortId: String(cohortId) }),
                ...(semester && { semester: Number(semester) })
            },
            include: {
                student: { select: { fullName: true, registrationNumber: true, email: true } },
                cohort: {
                    select: {
                        name: true,
                        program: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Student enrollment not found'
            });
        }

        // Get all marks for this student
        const marks = await prisma.studentMark.findMany({
            where: { studentId },
            include: {
                exam: {
                    include: {
                        subject: { select: { id: true, name: true, code: true } },
                        cohort: true
                    }
                },
                subQuestion: {
                    include: {
                        co: { select: { coNumber: true, description: true, bloomLevel: true, targetPercent: true } }
                    }
                }
            }
        });

        if (marks.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No exam data available for this student yet',
                data: {
                    studentId,
                    studentName: enrollment.student.fullName,
                    registrationNumber: enrollment.student.registrationNumber,
                    cohortName: enrollment.cohort.name,
                    overallPerformance: {
                        totalExams: 0,
                        averagePercentage: 0,
                        passRate: 0,
                        grade: 'N/A'
                    },
                    subjectPerformance: [],
                    coPerformance: [],
                    bloomPerformance: [],
                    trend: {
                        isImproving: false,
                        changePercent: 0,
                        message: 'No historical data available'
                    },
                    riskLevel: 'none',
                    riskFactors: [],
                    recommendations: ['Complete exams to see performance analytics']
                }
            });
        }

        // Calculate subject-wise performance
        const subjectMap = new Map<string, {
            subjectId: string;
            subjectName: string;
            subjectCode: string;
            totalMarks: number;
            maxMarks: number;
            examIds: Set<string>;
        }>();

        marks.forEach(mark => {
            const subject = mark.exam.subject;
            if (!subjectMap.has(subject.id)) {
                subjectMap.set(subject.id, {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    subjectCode: subject.code,
                    totalMarks: 0,
                    maxMarks: 0,
                    examIds: new Set()
                });
            }
            const entry = subjectMap.get(subject.id)!;
            entry.totalMarks += Number(mark.marks);
            entry.maxMarks += mark.subQuestion.maxMarks;
            entry.examIds.add(mark.exam.id);
        });

        const subjectPerformance = Array.from(subjectMap.values()).map(sub => {
            const percentage = sub.maxMarks > 0 ? (sub.totalMarks / sub.maxMarks) * 100 : 0;
            let status: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'At Risk';

            if (percentage >= 80) status = 'Excellent';
            else if (percentage >= 65) status = 'Good';
            else if (percentage >= 50) status = 'Average';
            else if (percentage >= 40) status = 'Poor';
            else status = 'At Risk';

            return {
                subjectId: sub.subjectId,
                subjectName: sub.subjectName,
                subjectCode: sub.subjectCode,
                averageMarks: Number(sub.totalMarks.toFixed(2)),
                maxMarks: sub.maxMarks,
                percentage: Number(percentage.toFixed(2)),
                status,
                examsCompleted: sub.examIds.size
            };
        });

        // Calculate CO-wise performance
        const coMap = new Map<string, {
            coNumber: number;
            description: string;
            totalMarks: number;
            maxMarks: number;
            targetPercent: number;
        }>();

        marks.forEach(mark => {
            if (mark.subQuestion.co) {
                const co = mark.subQuestion.co;
                const key = `${co.coNumber}-${co.description}`;
                if (!coMap.has(key)) {
                    coMap.set(key, {
                        coNumber: co.coNumber,
                        description: co.description,
                        totalMarks: 0,
                        maxMarks: 0,
                        targetPercent: co.targetPercent ?? 60
                    });
                }
                const entry = coMap.get(key)!;
                entry.totalMarks += Number(mark.marks);
                entry.maxMarks += mark.subQuestion.maxMarks;
            }
        });

        const coPerformance = Array.from(coMap.values()).map(co => {
            const achievedPercent = co.maxMarks > 0 ? (co.totalMarks / co.maxMarks) * 100 : 0;
            let strength: 'Strong' | 'Moderate' | 'Weak';

            // Scale threshold dynamically relative to co's targetPercent
            const threshold = co.targetPercent;
            if (achievedPercent >= threshold) strength = 'Strong';
            else if (achievedPercent >= threshold * 0.7) strength = 'Moderate';
            else strength = 'Weak';

            return {
                coId: `CO${co.coNumber}`,
                coNumber: co.coNumber,
                description: co.description,
                achievedPercent: Number(achievedPercent.toFixed(2)),
                status: strength
            };
        }).sort((a, b) => a.coNumber - b.coNumber);

        // Calculate Bloom level performance
        const bloomMap = new Map<string, { totalMarks: number; maxMarks: number }>();

        marks.forEach(mark => {
            if (mark.subQuestion.co) {
                const level = mark.subQuestion.bloomLevel;
                if (!bloomMap.has(level)) {
                    bloomMap.set(level, { totalMarks: 0, maxMarks: 0 });
                }
                const entry = bloomMap.get(level)!;
                entry.totalMarks += Number(mark.marks);
                entry.maxMarks += mark.subQuestion.maxMarks;
            }
        });

        const bloomPerformance = Array.from(bloomMap.entries()).map(([level, data]) => {
            const percentage = data.maxMarks > 0 ? (data.totalMarks / data.maxMarks) * 100 : 0;
            let strength: 'Strong' | 'Moderate' | 'Weak';

            if (percentage >= 70) strength = 'Strong';
            else if (percentage >= 50) strength = 'Moderate';
            else strength = 'Weak';

            return {
                level,
                percentage: Number(percentage.toFixed(2)),
                strength
            };
        });

        // Calculate overall performance
        const totalMarks = marks.reduce((sum, m) => sum + Number(m.marks), 0);
        const totalMaxMarks = marks.reduce((sum, m) => sum + m.subQuestion.maxMarks, 0);
        const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

        const uniqueExams = new Set(marks.map(m => m.exam.id)).size;
        const passThreshold = 40;
        const passCount = subjectPerformance.filter(s => s.percentage >= passThreshold).length;
        const passRate = subjectPerformance.length > 0 ? (passCount / subjectPerformance.length) * 100 : 0;

        let grade = 'F';
        if (overallPercentage >= 80) grade = 'A+';
        else if (overallPercentage >= 70) grade = 'A';
        else if (overallPercentage >= 60) grade = 'B';
        else if (overallPercentage >= 50) grade = 'C';
        else if (overallPercentage >= 40) grade = 'D';

        // Risk assessment
        const riskFactors: string[] = [];
        let riskScore = 0;

        if (overallPercentage < 40) {
            riskFactors.push('Overall performance below passing threshold');
            riskScore += 3;
        } else if (overallPercentage < 50) {
            riskFactors.push('Overall performance at borderline level');
            riskScore += 2;
        }

        const failingSubjects = subjectPerformance.filter(s => s.percentage < 40);
        if (failingSubjects.length > 0) {
            riskFactors.push(`Failing in ${failingSubjects.length} subject(s): ${failingSubjects.map(s => s.subjectCode).join(', ')}`);
            riskScore += failingSubjects.length;
        }

        const weakCOs = coPerformance.filter(co => co.status === 'Weak');
        if (weakCOs.length > 2) {
            riskFactors.push(`Weak performance in ${weakCOs.length} Course Outcomes`);
            riskScore += 1;
        }

        let riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
        if (riskScore === 0) riskLevel = 'none';
        else if (riskScore <= 2) riskLevel = 'low';
        else if (riskScore <= 4) riskLevel = 'medium';
        else if (riskScore <= 6) riskLevel = 'high';
        else riskLevel = 'critical';

        // Generate recommendations
        const recommendations: string[] = [];

        if (riskLevel !== 'none') {
            failingSubjects.forEach(sub => {
                recommendations.push(`Focus on improving ${sub.subjectName} - current score: ${sub.percentage.toFixed(1)}%`);
            });
            weakCOs.forEach(co => {
                recommendations.push(`Strengthen understanding of CO${co.coNumber}: ${co.description}`);
            });

            const weakBloom = bloomPerformance.filter(b => b.strength === 'Weak');
            if (weakBloom.length > 0) {
                recommendations.push(`Work on ${weakBloom.map(b => b.level).join(', ')} level questions`);
            }
        } else {
            recommendations.push('Keep up the good work!');
            const moderateCOs = coPerformance.filter(co => co.status === 'Moderate');
            if (moderateCOs.length > 0) {
                recommendations.push(`Consider strengthening ${moderateCOs.length} moderate-performing COs for excellence`);
            }
        }

        const analytics: StudentPerformance = {
            studentId,
            studentName: enrollment.student.fullName,
            registrationNumber: enrollment.student.registrationNumber || '',
            cohortName: enrollment.cohort.name,
            overallPerformance: {
                totalExams: uniqueExams,
                averagePercentage: Number(overallPercentage.toFixed(2)),
                passRate: Number(passRate.toFixed(2)),
                grade
            },
            subjectPerformance: subjectPerformance.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)),
            coPerformance,
            bloomPerformance,
            trend: await calculateTrendAnalysis(studentId, overallPercentage, marks),
            riskLevel,
            riskFactors,
            recommendations
        };

        res.json({
            success: true,
            data: analytics
        });

    } catch (error: any) {
        console.error('Error getting student analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve student analytics. Please try again later.',
            error: error.message
        });
    }
};

/**
 * Internal helper to calculate risk for a student
 */
async function calculateStudentRisk(studentId: string) {
    const computedMarks = await prisma.marksComputed.findMany({
        where: { studentId },
        include: { exam: { select: { maxMarks: true } } }
    });

    if (computedMarks.length === 0) return { percentage: 0, risk: 'low' as const, examsCompleted: 0 };

    const totalMarks = computedMarks.reduce((sum, m) => sum + Number(m.totalMarks), 0);
    const totalMax = computedMarks.reduce((sum, m) => sum + m.exam.maxMarks, 0);
    const percentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;

    let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (percentage < 30) risk = 'critical';
    else if (percentage < 45) risk = 'high';
    else if (percentage < 60) risk = 'medium';

    return { percentage, risk, examsCompleted: computedMarks.length };
}

/**
 * Get count of at-risk students for dashboard
 */
export const getAtRiskStudentsCount = async (filters: { cohortId?: string; departmentId?: string } = {}) => {
    try {
        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                ...filters,
                status: 'active'
            },
            select: { studentId: true }
        });

        // Deduplicate enrollments by studentId to ensure each student is only counted once
        const uniqueStudentIds = new Set(enrollments.map(e => e.studentId));
        let count = 0;
        for (const studentId of uniqueStudentIds) {
            const { risk } = await calculateStudentRisk(studentId);
            if (['medium', 'high', 'critical'].includes(risk)) {
                count++;
            }
        }
        return count;
    } catch (error) {
        console.error('Error counting at-risk students:', error);
        return 0;
    }
};

/**
 * Get list of at-risk students
 */
export const getAtRiskStudents = async (req: AuthRequest, res: Response) => {
    try {
        let { cohortId, departmentId, riskLevel = 'medium' } = req.query;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        // RBAC: HOD sees only their department
        if (userRole === 'HOD') {
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });
            const targetDepartmentId = department?.id || req.user?.departmentId;
            if (targetDepartmentId) {
                departmentId = targetDepartmentId;
            } else {
                return res.json({ success: true, count: 0, data: [] });
            }
        }

        const where: any = { status: 'active' };
        if (cohortId) where.cohortId = String(cohortId);
        if (departmentId) where.departmentId = String(departmentId);

        // RBAC: Teacher sees only their assigned cohorts
        if (userRole === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                select: { cohortId: true }
            });
            const allowedCohortIds = assignments.map(a => a.cohortId);
            
            if (cohortId && !allowedCohortIds.includes(String(cohortId))) {
               return res.status(403).json({ message: 'Access denied to this cohort' });
            }
            
            if (!cohortId) {
                where.cohortId = { in: allowedCohortIds };
            }
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where,
            include: {
                student: { select: { id: true, fullName: true, registrationNumber: true, email: true } },
                cohort: { select: { name: true } },
                department: { select: { name: true } }
            },
            take: 100
        });

        const atRiskStudents = [];
        const processedStudentIds = new Set<string>();

        for (const enrollment of enrollments) {
            // Deduplicate: If we've already processed this student, skip
            if (processedStudentIds.has(enrollment.studentId)) continue;
            processedStudentIds.add(enrollment.studentId);

            const { percentage, risk, examsCompleted } = await calculateStudentRisk(enrollment.studentId);

            const riskPriority: Record<string, number> = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
            const riskLevelStr = typeof riskLevel === 'string' ? riskLevel.toLowerCase() : '';
            const requestedPriority = ['low', 'medium', 'high', 'critical'].includes(riskLevelStr)
                ? riskPriority[riskLevelStr]
                : 1;
            const studentPriority = ['low', 'medium', 'high', 'critical'].includes(risk)
                ? riskPriority[risk]
                : 0;

            if (studentPriority >= requestedPriority) {
                atRiskStudents.push({
                    studentId: enrollment.studentId,
                    studentName: enrollment.student.fullName,
                    email: enrollment.student.email,
                    registrationNumber: enrollment.student.registrationNumber,
                    cohort: enrollment.cohort.name,
                    department: enrollment.department.name,
                    currentPercentage: Number(percentage.toFixed(2)),
                    riskLevel: risk,
                    examsCompleted
                });
            }
        }

        const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        atRiskStudents.sort((a: any, b: any) => {
            const aRisk = String(a.riskLevel).toLowerCase();
            const bRisk = String(b.riskLevel).toLowerCase();

            const aVal = ['critical', 'high', 'medium', 'low'].includes(aRisk) ? riskOrder[aRisk] : 4;
            const bVal = ['critical', 'high', 'medium', 'low'].includes(bRisk) ? riskOrder[bRisk] : 4;

            const riskDiff = aVal - bVal;
            if (riskDiff !== 0) return riskDiff;
            return a.currentPercentage - b.currentPercentage;
        });

        res.json({
            success: true,
            count: atRiskStudents.length,
            data: atRiskStudents
        });

    } catch (error: any) {
        console.error('Error getting at-risk students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve at-risk students',
            error: error.message
        });
    }
};

/**
 * Get detailed performance for a student in a specific subject
 */
export const getStudentPerformanceDetail = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, subjectId } = req.params;

        const marks = await prisma.studentMark.findMany({
            where: {
                studentId,
                exam: { subjectId }
            },
            include: {
                exam: {
                    select: {
                        id: true,
                        examType: true,
                        maxMarks: true,
                        publishedAt: true
                    }
                },
                subQuestion: {
                    include: {
                        co: { select: { coNumber: true, description: true, bloomLevel: true } },
                        question: { select: { maxMarks: true } }
                    }
                }
            },
            orderBy: { exam: { publishedAt: 'asc' } }
        });

        if (marks.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No marks found for this student in the specified subject'
            });
        }

        // Group by exam
        const examMap = new Map<string, any>();
        marks.forEach(mark => {
            if (!examMap.has(mark.exam.id)) {
                examMap.set(mark.exam.id, {
                    examId: mark.exam.id,
                    examType: mark.exam.examType,
                    maxMarks: mark.exam.maxMarks,
                    publishedAt: mark.exam.publishedAt,
                    totalScored: 0,
                    totalMax: 0,
                    coBreakdown: new Map()
                });
            }

            const exam = examMap.get(mark.exam.id)!;
            exam.totalScored += Number(mark.marks);
            exam.totalMax += mark.subQuestion.maxMarks;

            if (mark.subQuestion.co) {
                const coKey = `CO${mark.subQuestion.co.coNumber}`;
                if (!exam.coBreakdown.has(coKey)) {
                    exam.coBreakdown.set(coKey, {
                        coNumber: mark.subQuestion.co.coNumber,
                        description: mark.subQuestion.co.description,
                        scored: 0,
                        max: 0
                    });
                }
                const co = exam.coBreakdown.get(coKey)!;
                co.scored += Number(mark.marks);
                co.max += mark.subQuestion.maxMarks;
            }
        });

        const examDetails = Array.from(examMap.values()).map(exam => ({
            examId: exam.examId,
            examType: exam.examType,
            scored: Number(exam.totalScored.toFixed(2)),
            maxMarks: exam.maxMarks,
            percentage: exam.totalMax > 0 ? Number(((exam.totalScored / exam.totalMax) * 100).toFixed(2)) : 0,
            publishedAt: exam.publishedAt,
            coBreakdown: Array.from(exam.coBreakdown.values()).map((co: any) => ({
                coNumber: co.coNumber,
                description: co.description,
                scored: Number(co.scored.toFixed(2)),
                max: co.max,
                percentage: co.max > 0 ? Number(((co.scored / co.max) * 100).toFixed(2)) : 0
            })).sort((a, b) => a.coNumber - b.coNumber)
        }));

        res.json({
            success: true,
            data: {
                studentId,
                subjectId,
                exams: examDetails,
                totalExams: examDetails.length,
                overallPercentage: examDetails.length > 0
                    ? Number((examDetails.reduce((sum, e) => sum + e.percentage, 0) / examDetails.length).toFixed(2))
                    : 0
            }
        });

    } catch (error: any) {
        console.error('Error getting student performance detail:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve student performance details',
            error: error.message
        });
    }
};
