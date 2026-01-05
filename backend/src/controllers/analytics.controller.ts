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
                    include: {
                        questions: {
                            include: {
                                subQuestions: true
                            }
                        }
                    }
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
        let totalSubQuestions = 0;

        // Aggregate sub-questions (where Bloom levels are actually stored)
        exam.sections.forEach(section => {
            section.questions.forEach(q => {
                q.subQuestions?.forEach(sq => {
                    distribution[sq.bloomLevel] = (distribution[sq.bloomLevel] || 0) + 1;
                    totalSubQuestions++;
                });
            });
        });

        // Sort by Bloom level for consistent display
        const bloomOrder = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
        const result = Object.keys(distribution)
            .sort((a, b) => bloomOrder.indexOf(a) - bloomOrder.indexOf(b))
            .map(level => ({
                level,
                count: distribution[level],
                percentage: totalSubQuestions ? Math.round((distribution[level] / totalSubQuestions) * 100) : 0
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
                studentMarks: {
                    include: {
                        subQuestion: true
                    }
                }
            }
        });

        // Group by subject and calculate from StudentMarks
        const subjectStats = new Map<string, {
            name: string;
            code: string;
            marks: number[];
        }>();

        exams.forEach(exam => {
            const subjectId = exam.subjectId;
            const current = subjectStats.get(subjectId) || {
                name: exam.subject.name,
                code: exam.subject.code,
                marks: []
            };

            // Group marks by student and calculate totals
            const studentTotals = new Map<string, number>();

            exam.studentMarks.forEach(mark => {
                const studentId = mark.studentId;
                const currentTotal = studentTotals.get(studentId) || 0;
                studentTotals.set(studentId, currentTotal + Number(mark.marks));
            });

            // Convert to percentages and add to marks array
            studentTotals.forEach(total => {
                const percentage = exam.maxMarks > 0 ? (total / exam.maxMarks) * 100 : 0;
                current.marks.push(percentage);
            });

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
            .map(([subId, stats]) => {
                const marks = stats.marks;
                const studentCount = marks.length;
                const average = marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
                const highest = marks.length > 0 ? Math.max(...marks) : 0;
                const lowest = marks.length > 0 ? Math.min(...marks) : 0;
                const passed = marks.filter(m => m >= 50).length;

                return {
                    subject_id: subId,
                    subject_name: stats.name,
                    subject_code: stats.code,
                    average: Math.round(average),
                    highest: Math.round(highest),
                    lowest: Math.round(lowest),
                    pass_rate: studentCount > 0 ? Math.round((passed / studentCount) * 100) : 0,
                    total_students: studentCount
                };
            });

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

// Helper function for attainment levels
function getAttainmentLevel(percent: number): number {
    if (percent >= 80) return 3;
    if (percent >= 60) return 2;
    if (percent >= 40) return 1;
    return 0;
}

/**
 * Get CO-PO traceability data for NAAC compliance reporting.
 * 
 * Returns comprehensive traceability matrix showing:
 * - CO attainment levels with student pass counts
 * - PO attainment with weighted contributions from each CO
 * - Correlation mapping (1=Weak, 2=Medium, 3=Strong)
 * - Formula transparency for audit trail
 * 
 * @route GET /api/analytics/co-po-traceability/:subjectId/:cohortId/:semester
 * @access Private (ADMIN, PRINCIPAL, HOD, TEACHER)
 * @param {string} req.params.subjectId - Subject UUID
 * @param {string} req.params.cohortId - Cohort UUID
 * @param {number} req.params.semester - Semester number
 * @returns {object} 200 - Traceability matrix with CO/PO data
 * @returns {object} 404 - Data not found
 * @returns {object} 500 - Server error
 */
export const getCOPOTraceability = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester } = req.params;

        const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
            include: { curriculum: { include: { program: true } } }
        });

        if (!subject || !subject.curriculum) {
            return res.status(404).json({ message: 'Subject or curriculum not found' });
        }

        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: { program: true }
        });

        if (!cohort) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        const coAttainments = await prisma.cOAttainment.findMany({
            where: { subjectId, cohortId, semester: parseInt(semester), academicYear },
            include: { co: { include: { poMappings: { include: { po: true } } } } }
        });

        const coWithLevels = coAttainments.map(coAtt => ({
            id: coAtt.id,
            co: { id: coAtt.co.id, coNumber: coAtt.co.coNumber, description: coAtt.co.description },
            achievedPercent: coAtt.achievedPercent,
            targetPercent: coAtt.targetPercent,
            level: getAttainmentLevel(coAtt.achievedPercent),
            passCount: coAtt.passCount,
            studentCount: coAtt.studentCount,
            poMappings: coAtt.co.poMappings.map(m => ({
                po: { id: m.po.id, poNumber: m.po.poNumber, description: m.po.description },
                correlationLevel: m.correlationLevel
            }))
        }));

        const poAttainments = await prisma.pOAttainment.findMany({
            where: { programId: subject.curriculum.programId, cohortId, semester: parseInt(semester), academicYear },
            include: { po: true }
        });

        const poWithBreakdown = poAttainments.map(po => {
            const contributingCOs = coAttainments.filter(coAtt =>
                coAtt.co.poMappings.some(m => m.poId === po.poId)
            );

            const breakdown = contributingCOs.map(coAtt => {
                const mapping = coAtt.co.poMappings.find(m => m.poId === po.poId);
                return {
                    co: { id: coAtt.coId, coNumber: coAtt.co.coNumber },
                    coAttainment: coAtt.achievedPercent,
                    correlationLevel: mapping?.correlationLevel || 0,
                    product: coAtt.achievedPercent * (mapping?.correlationLevel || 0)
                };
            });

            return {
                id: po.id,
                po: { id: po.po.id, poNumber: po.po.poNumber, description: po.po.description },
                achievedPercent: po.achievedPercent,
                targetPercent: po.targetPercent,
                level: getAttainmentLevel(po.achievedPercent),
                weightedSum: po.weightedSum,
                totalWeight: po.totalWeight,
                breakdown
            };
        });

        res.json({
            context: {
                program: cohort.program,
                cohort: { id: cohort.id, name: cohort.name, year: cohort.year },
                semester: parseInt(semester),
                academicYear,
                subject: { id: subject.id, name: subject.name, code: subject.code, credits: subject.credits },
                lastCalculated: coAttainments[0]?.calculatedAt || null
            },
            coAttainments: coWithLevels,
            poAttainments: poWithBreakdown
        });
    } catch (error) {
        console.error('[CO-PO Traceability] Error:', error);
        res.status(500).json({ message: 'Error fetching traceability data' });
    }
};
