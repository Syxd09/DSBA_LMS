import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Generate CO-PO Attainment Report Data
 * @route GET /api/reports/attainment/:cohortId/:subjectId
 */
export const getAttainmentReport = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, subjectId } = req.params;

        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: { program: true }
        });

        const subject = await prisma.subject.findUnique({
            where: { id: subjectId }
        });

        if (!cohort || !subject) return res.status(404).json({ message: 'Cohort or Subject not found' });

        const coAttainments = await prisma.cOAttainment.findMany({
            where: { cohortId, subjectId },
            include: { co: true }
        });

        const poAttainments = await prisma.pOAttainment.findMany({
            where: { cohortId, programId: cohort.programId },
            include: { po: true }
        });

        // Calculate Student-wise Distribution (Advanced)
        const finalMarks = await prisma.finalMark.findMany({
            where: { cohortId, subjectId },
            select: { studentId: true, coAttainment: true, percentage: true }
        });

        const courseOutcomes = await prisma.courseOutcome.findMany({
            where: { subjectId },
            orderBy: { coNumber: 'asc' }
        });

        const detailedCoStats = courseOutcomes.map(co => {
            let attainedCount = 0;
            let totalEvaluated = 0;
            const distribution = { high: 0, medium: 0, low: 0 };

            finalMarks.forEach(fm => {
                const studentCOs = fm.coAttainment as { id: string, percentage: number }[];
                if (Array.isArray(studentCOs)) {
                    const coMark = studentCOs.find(s => s.id === co.id);
                    if (coMark) {
                        const score = coMark.percentage;
                        totalEvaluated++;
                        if (score >= 80) distribution.high++;
                        else if (score >= 60) distribution.medium++;
                        else distribution.low++;
                        if (score >= 60) attainedCount++;
                    }
                }
            });

            return {
                id: co.id,
                coNumber: co.coNumber,
                description: co.description,
                attainedCount,
                totalEvaluated,
                attainmentPercent: totalEvaluated > 0 ? (attainedCount / totalEvaluated) * 100 : 0,
                distribution
            };
        });

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                subjectId,
                { cohortId, subjectId, type: 'DETAILED_ATTAINMENT' }
            );
        }

        // Calculate Bloom's Taxonomy Attainment
        const subQuestions = await prisma.subQuestion.findMany({
            where: { co: { subjectId } },
            select: { id: true, bloomLevel: true, maxMarks: true }
        });

        const studentMarks = await prisma.studentMark.findMany({
            where: { 
                subQuestionId: { in: subQuestions.map(sq => sq.id) },
                studentId: { in: finalMarks.map(fm => fm.studentId) }
            }
        });

        const bloomAttainmentMap: Record<string, { attained: number, total: number }> = {};
        const bloomLevels = [...new Set(subQuestions.map(sq => sq.bloomLevel))];

        bloomLevels.forEach(level => {
            const levelSqs = subQuestions.filter(sq => sq.bloomLevel === level);
            const sqIds = levelSqs.map(sq => sq.id);
            const maxMarksForLevel = levelSqs.reduce((sum, sq) => sum + sq.maxMarks, 0);

            let levelPassCount = 0;
            const uniqueStudents = [...new Set(studentMarks.map(m => m.studentId))];

            uniqueStudents.forEach(studentId => {
                const sMarks = studentMarks.filter(m => m.studentId === studentId && sqIds.includes(m.subQuestionId));
                const obtained = sMarks.reduce((sum, m) => sum + (Number(m.marks) || 0), 0);
                if (maxMarksForLevel > 0 && (obtained / maxMarksForLevel) >= 0.6) {
                    levelPassCount++;
                }
            });

            bloomAttainmentMap[level] = {
                attained: levelPassCount,
                total: uniqueStudents.length
            };
        });

        res.json({
            institution: "DSBA LMS",
            reportGeneratedAt: new Date(),
            cohort: {
                name: cohort.name,
                year: cohort.year,
                program: cohort.program.name
            },
            subject: {
                name: subject.name,
                code: subject.code
            },
            summary: {
                totalStudents: finalMarks.length,
                overallAvg: finalMarks.length > 0 ? finalMarks.reduce((acc, m) => acc + m.percentage, 0) / finalMarks.length : 0
            },
            attainment: {
                co: detailedCoStats,
                po: poAttainments,
                bloom: bloomAttainmentMap, // Added Bloom's data
                rawCoRecords: coAttainments
            }
        });
    } catch (error) {
        console.error('[Reporting] Error generating attainment report:', error);
        res.status(500).json({ message: 'Error generating report', error: String(error) });
    }
};

/**
 * Get Performance Distribution Report
 * @route GET /api/reports/distribution?departmentId=...
 */
export const getPerformanceDistributionReport = async (req: AuthRequest, res: Response) => {
    try {
        const { departmentId } = req.query;

        const cohorts = await prisma.cohort.findMany({
            where: departmentId ? { program: { departmentId: String(departmentId) } } : {},
            include: { 
                program: true,
                finalMarks: {
                    select: { percentage: true }
                }
            }
        });

        const distribution = cohorts.map(cohort => {
            const marks = cohort.finalMarks || [];
            const above80 = marks.filter(m => m.percentage >= 80).length;
            const between60And80 = marks.filter(m => m.percentage >= 60 && m.percentage < 80).length;
            const below60 = marks.filter(m => m.percentage < 60).length;
            const total = marks.length;

            return {
                cohortId: cohort.id,
                cohortName: cohort.name,
                program: cohort.program.name,
                stats: {
                    above80,
                    above80Percent: total > 0 ? (above80 / total) * 100 : 0,
                    between60And80,
                    between60And80Percent: total > 0 ? (between60And80 / total) * 100 : 0,
                    below60,
                    below60Percent: total > 0 ? (below60 / total) * 100 : 0,
                    total
                }
            };
        });

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                departmentId ? String(departmentId) : 'ALL',
                { departmentId, type: 'PERFORMANCE_DISTRIBUTION' }
            );
        }

        res.json(distribution);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching distribution', error: String(error) });
    }
};

/**
 * Get Faculty Workload & Assignments Report
 * @route GET /api/reports/faculty-workload
 */
export const getFacultyWorkloadReport = async (req: AuthRequest, res: Response) => {
    try {
        const { departmentId } = req.query;

        const assignments = await prisma.teacherAssignment.findMany({
            where: departmentId ? { teacher: { departmentId: String(departmentId) } } : {},
            include: {
                teacher: {
                    select: { fullName: true, email: true, registrationNumber: true }
                },
                subject: {
                    select: { name: true, code: true, credits: true, semester: true }
                },
                cohort: {
                    select: { name: true }
                }
            },
            orderBy: { teacher: { fullName: 'asc' } }
        });

        // Enhance with real-time metrics
        const enhancedAssignments = await Promise.all(assignments.map(async (a) => {
            const studentCount = await prisma.studentEnrollment.count({
                where: { cohortId: a.cohortId }
            });

            const avgMarks = await prisma.finalMark.aggregate({
                where: { 
                    cohortId: a.cohortId,
                    subjectId: a.subjectId
                },
                _avg: {
                    percentage: true
                }
            });

            return {
                ...a,
                metrics: {
                    studentCount,
                    averagePercentage: avgMarks._avg.percentage || 0
                }
            };
        }));

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                'FACULTY_WORKLOAD',
                { departmentId, type: 'FACULTY_WORKLOAD' }
            );
        }

        res.json(enhancedAssignments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching faculty workload', error: String(error) });
    }
};

/**
 * Get Comprehensive Academic Summary
 * @route GET /api/reports/academic-summary
 */
export const getAcademicSummaryReport = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, semester } = req.query;

        if (!cohortId) {
            return res.status(400).json({ message: 'cohortId is required' });
        }

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                String(cohortId),
                { cohortId, semester, type: 'ACADEMIC_SUMMARY' }
            );
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId: String(cohortId) },
            include: {
                student: {
                    select: { fullName: true, email: true, registrationNumber: true }
                },
                cohort: {
                    select: { name: true, program: { select: { name: true } } }
                }
            }
        });

        const finalMarks = await prisma.finalMark.findMany({
            where: { 
                cohortId: String(cohortId),
                ...(semester ? { subject: { semester: Number(semester) } } : {})
            },
            include: {
                subject: { select: { name: true, code: true } }
            }
        });

        const studentData = enrollments.map(e => {
            const marks = finalMarks.filter(m => m.studentId === e.studentId);
            return {
                registrationNumber: e.student.registrationNumber,
                name: e.student.fullName,
                email: e.student.email,
                cohort: e.cohort.name,
                program: e.cohort.program.name,
                subjects: marks.map(m => ({
                    code: m.subject.code,
                    name: m.subject.name,
                    percentage: m.percentage,
                    grade: m.grade,
                    point: m.gradePoint
                })),
                overallAvg: marks.length > 0 ? marks.reduce((a, b) => a + b.percentage, 0) / marks.length : 0
            };
        }).sort((a, b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || ''));

        const uniqueSubjects = [...new Set(finalMarks.map(m => m.subjectId))];
        
        res.json({
            departmentName: enrollments[0]?.cohort?.program?.name || 'Academic Unit',
            totalStudents: enrollments.length,
            totalPrograms: 1, 
            totalCourses: uniqueSubjects.length,
            recentReports: [
                { title: 'Semester Attainment Analysis', type: 'PDF', date: '2 hours ago' },
                { title: 'Course Exit Survey Summary', type: 'CSV', date: 'Yesterday' },
                { title: 'Student Performance Ledger', type: 'XLSX', date: '3 days ago' }
            ],
            students: studentData
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching academic summary', error: String(error) });
    }
};

export const getClassDetailedReport = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, semester } = req.query;

        if (!cohortId) {
            return res.status(400).json({ message: 'cohortId is required' });
        }

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                String(cohortId),
                { cohortId, semester, type: 'CLASS_DETAILED' }
            );
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { 
                cohortId: String(cohortId),
                ...(semester ? { semester: Number(semester) } : {})
            },
            include: {
                student: {
                    select: { id: true, fullName: true, registrationNumber: true }
                },
                cohort: {
                    select: { name: true, currentSemester: true, program: { select: { name: true, id: true } } }
                }
            }
        });

        if (!enrollments.length) {
            return res.json({ students: [] });
        }

        const progId = enrollments[0].cohort.program.id;
        const requestedSem = semester ? Number(semester) : null;
        const cohortSem = enrollments[0].cohort.currentSemester;
        const semToUse = requestedSem || cohortSem;

        // Fetch data for the targeted semester
        const [finalMarks, teacherAssignments, semesterResults, coAttainments, poAttainments, feedbacks] = await Promise.all([
            prisma.finalMark.findMany({
                where: { 
                    cohortId: String(cohortId),
                    subject: { semester: semToUse }
                },
                include: { subject: true }
            }),
            prisma.teacherAssignment.findMany({
                where: { cohortId: String(cohortId), semester: semToUse },
                include: { teacher: { select: { fullName: true } }, subject: { select: { id: true, name: true } } }
            }),
            prisma.semesterResult.findMany({
                where: { cohortId: String(cohortId), semester: semToUse }
            }),
            prisma.cOAttainment.findMany({
                where: { cohortId: String(cohortId), semester: semToUse }
            }),
            prisma.pOAttainment.findMany({
                where: { cohortId: String(cohortId), programId: progId, semester: semToUse }
            }),
            prisma.teacherStudentFeedback.findMany({
                where: { cohortId: String(cohortId), semester: semToUse }
            })
        ]);

        // If current semester data is sparse, try fetching semester 1 as fallback (common for initial batches)
        let fallbackCoAttainments = coAttainments;
        let fallbackPoAttainments = poAttainments;
        let fallbackFeedbacks = feedbacks;

        if (coAttainments.length === 0 || poAttainments.length === 0 || teacherAssignments.length === 0) {
            const fallbackSem = semToUse > 1 ? semToUse - 1 : 1;
            const [fCo, fPo, fFeed, fAssign] = await Promise.all([
                prisma.cOAttainment.findMany({ where: { cohortId: String(cohortId), semester: fallbackSem } }),
                prisma.pOAttainment.findMany({ where: { cohortId: String(cohortId), programId: progId, semester: fallbackSem } }),
                prisma.teacherStudentFeedback.findMany({ where: { cohortId: String(cohortId), semester: fallbackSem } }),
                prisma.teacherAssignment.findMany({ 
                    where: { cohortId: String(cohortId), semester: fallbackSem },
                    include: { teacher: { select: { fullName: true } }, subject: { select: { id: true, name: true } } }
                })
            ]);
            
            if (coAttainments.length === 0) fallbackCoAttainments = fCo;
            if (poAttainments.length === 0) fallbackPoAttainments = fPo;
            if (feedbacks.length === 0) fallbackFeedbacks = fFeed;
            if (teacherAssignments.length === 0) {
                // Merge or replace assignments
                // For reports, we often want the most recent assignment for a subject
                teacherAssignments.push(...fAssign);
            }
        }

        const reportData = enrollments.map(e => {
            const studentMarks = finalMarks.filter(m => m.studentId === e.studentId);
            const studentResult = semesterResults.find(r => r.studentId === e.studentId);
            const studentFeedbacks = fallbackFeedbacks.filter(f => f.studentId === e.studentId);

            const subjectDetails = studentMarks.map(m => {
                const assignment = teacherAssignments.find(ta => ta.subjectId === m.subjectId);
                
                // 1. Try student-specific CO attainment from FinalMark
                let studentCoAtt = 0;
                let hasStudentCo = false;
                if (m.coAttainment && Array.isArray(m.coAttainment)) {
                    const coRecords = m.coAttainment as any[];
                    if (coRecords.length > 0) {
                        const totalCoPercent = coRecords.reduce((sum, rec) => sum + (Number(rec.percentage) || 0), 0);
                        studentCoAtt = totalCoPercent / coRecords.length;
                        hasStudentCo = true;
                    }
                }
                
                // 2. Fallback to cohort-wide average for this subject if student-specific is missing
                if (!hasStudentCo || studentCoAtt === 0) {
                    const subjectCoData = fallbackCoAttainments.filter(ca => ca.subjectId === m.subjectId);
                    if (subjectCoData.length > 0) {
                        studentCoAtt = subjectCoData.reduce((acc, curr) => acc + curr.achievedPercent, 0) / subjectCoData.length;
                    }
                }
                
                const subjectFeedback = studentFeedbacks.find(f => f.subjectId === m.subjectId);

                return {
                    subjectCode: m.subject.code,
                    subjectName: m.subject.name,
                    faculty: assignment?.teacher?.fullName || 'Not Assigned',
                    internal1: m.internal1,
                    internal2: m.internal2,
                    external: m.externalMarks,
                    total: m.totalMarks,
                    grade: m.grade,
                    subjectSgpa: m.gradePoint,
                    coAttainment: studentCoAtt.toFixed(2),
                    feedbackRating: subjectFeedback?.starRating || 0
                };
            });

            const avgPoAtt = fallbackPoAttainments.length ? fallbackPoAttainments.reduce((acc, curr) => acc + curr.achievedPercent, 0) / fallbackPoAttainments.length : 0;
            const avgOverallFeedback = studentFeedbacks.length ? studentFeedbacks.reduce((acc, curr) => acc + curr.starRating, 0) / studentFeedbacks.length : 0;

            // Calculate "Live SGPA" if stored result is missing
            let liveSgpa = studentResult?.sgpa || 0;
            if (liveSgpa === 0 && subjectDetails.length > 0) {
                let totalCredits = 0;
                let weightedPoints = 0;
                studentMarks.forEach(sm => {
                    const credits = sm.subject.credits || 3;
                    totalCredits += credits;
                    weightedPoints += (sm.gradePoint || 0) * credits;
                });
                if (totalCredits > 0) {
                    liveSgpa = parseFloat((weightedPoints / totalCredits).toFixed(2));
                }
            }

            return {
                registrationNumber: e.student.registrationNumber,
                name: e.student.fullName,
                subjects: subjectDetails,
                overallSgpa: liveSgpa,
                poAttainment: avgPoAtt.toFixed(2),
                feedbackRating: avgOverallFeedback.toFixed(1)
            };
        });

        res.json({
            cohortName: enrollments[0].cohort.name,
            programName: enrollments[0].cohort.program.name,
            semester: semToUse,
            students: reportData
        });
    } catch (error) {
        console.error('Error in getClassDetailedReport:', error);
        res.status(500).json({ message: 'Error generating detailed report', error: String(error) });
    }
};
