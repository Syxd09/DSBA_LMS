import { Response } from 'express';
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

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                subjectId,
                { cohortId, subjectId, type: 'CO_PO_ATTAINMENT' }
            );
        }

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
            attainment: {
                co: coAttainments,
                po: poAttainments
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
        const { cohortId } = req.query;
        
        if (!cohortId) return res.status(400).json({ message: 'Cohort ID is required' });

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                String(cohortId),
                { cohortId, type: 'ACADEMIC_SUMMARY' }
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
            where: { cohortId: String(cohortId) },
            include: {
                subject: { select: { name: true, code: true } }
            }
        });

        // Group marks by student
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
        });

        res.json(studentData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching academic summary', error: String(error) });
    }
};
