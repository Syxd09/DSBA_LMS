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
    rollNumber: string;
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
                student: { select: { fullName: true, email: true } },
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
                        co: { select: { coNumber: true, description: true, bloomLevel: true } }
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
                    rollNumber: enrollment.rollNumber,
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
                        maxMarks: 0
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

            if (achievedPercent >= 70) strength = 'Strong';
            else if (achievedPercent >= 50) strength = 'Moderate';
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
            rollNumber: enrollment.rollNumber,
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
            trend: {
                isImproving: false, // TODO: Implement trend calculation with historical data
                changePercent: 0,
                message: 'Trend analysis requires multiple assessment periods'
            },
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
 * Get list of at-risk students
 */
export const getAtRiskStudents = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, departmentId, riskLevel = 'medium' } = req.query;

        // This is a simplified version - in production, you'd run the full analytics
        // for each student and filter. For performance, consider caching results.

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                ...(cohortId && { cohortId: String(cohortId) }),
                ...(departmentId && { departmentId: String(departmentId) }),
                status: 'active'
            },
            include: {
                student: { select: { id: true, fullName: true, email: true } },
                cohort: { select: { name: true } },
                department: { select: { name: true } }
            },
            take: 100 // Limit for performance
        });

        const atRiskStudents = [];

        for (const enrollment of enrollments) {
            // Quick risk check based on computed marks
            const computedMarks = await prisma.marksComputed.findMany({
                where: {
                    studentId: enrollment.studentId
                },
                include: {
                    exam: { select: { maxMarks: true } }
                }
            });

            if (computedMarks.length > 0) {
                const totalMarks = computedMarks.reduce((sum, m) => sum + Number(m.totalMarks), 0);
                const totalMax = computedMarks.reduce((sum, m) => sum + m.exam.maxMarks, 0);
                const percentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;

                let studentRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
                if (percentage < 30) studentRisk = 'critical';
                else if (percentage < 40) studentRisk = 'high';
                else if (percentage < 50) studentRisk = 'medium';

                // Filter based on requested risk level
                const riskLevels = ['low', 'medium', 'high', 'critical'];
                const requestedIndex = riskLevels.indexOf(String(riskLevel));
                const studentIndex = riskLevels.indexOf(studentRisk);

                if (studentIndex >= requestedIndex) {
                    atRiskStudents.push({
                        studentId: enrollment.student.id,
                        studentName: enrollment.student.fullName,
                        email: enrollment.student.email,
                        rollNumber: enrollment.rollNumber,
                        cohort: enrollment.cohort.name,
                        department: enrollment.department.name,
                        currentPercentage: Number(percentage.toFixed(2)),
                        riskLevel: studentRisk,
                        examsCompleted: computedMarks.length
                    });
                }
            }
        }

        // Sort by risk level (critical first) then by percentage (lowest first)
        atRiskStudents.sort((a, b) => {
            const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
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
