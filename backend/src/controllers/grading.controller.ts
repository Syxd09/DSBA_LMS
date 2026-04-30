import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getGradingRules = async (req: AuthRequest, res: Response) => {
    try {
        const { departmentId } = req.query;
        const rules = await prisma.gradingRule.findMany({
            where: departmentId
                ? { OR: [{ departmentId: String(departmentId) }, { departmentId: null }] }
                : { departmentId: null },
            orderBy: { minPercentage: 'desc' }
        });
        res.json(rules);
    } catch (error) {
        res.json([]);
    }
};

export const createGradingRule = async (req: AuthRequest, res: Response) => {
    try {
        const { grade, minPercentage, maxPercentage, gradePoint, departmentId } = req.body;
        const user = req.user;

        if (!['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '')) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const rule = await prisma.gradingRule.create({
            data: {
                grade,
                minPercentage: parseFloat(minPercentage),
                maxPercentage: parseFloat(maxPercentage),
                gradePoint: parseFloat(gradePoint),
                departmentId: departmentId || null
            }
        });

        res.status(201).json(rule);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to create grading rule', error: error.message });
    }
};

export const deleteGradingRule = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '')) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await prisma.gradingRule.delete({
            where: { id }
        });

        res.json({ message: 'Rule deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to delete grading rule', error: error.message });
    }
};

export const getFinalMarks = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, subjectId, cohortId } = req.query;
        const where: import('@prisma/client').Prisma.FinalMarkWhereInput = {};
        if (studentId) where.studentId = String(studentId);
        if (subjectId) where.subjectId = String(subjectId);
        if (cohortId) where.cohortId = String(cohortId);

        const marks = await prisma.finalMark.findMany({ 
            where,
            include: {
                student: {
                    select: { fullName: true, registrationNumber: true, email: true, id: true }
                },
                subject: {
                    select: { name: true, code: true }
                }
            }
        });
        res.json(marks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching final marks' });
    }
};

export const calculateGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, subjectId, cohort_id, subject_id } = req.body;

        // Support both snake_case and camelCase
        const finalCohortId = cohortId || cohort_id;
        const finalSubjectId = subjectId || subject_id;

        if (!finalCohortId || !finalSubjectId) {
            return res.status(400).json({ message: 'Cohort ID and Subject ID are required' });
        }

        // Get cohort to verify it exists
        const cohort = await prisma.cohort.findUnique({
            where: { id: finalCohortId }
        });

        if (!cohort) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        // Get all students enrolled in this cohort
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId: finalCohortId },
            include: { student: true }
        });

        console.log(`[Grade Calc] Found ${enrollments.length} enrollments for cohort ${finalCohortId}`);

        const students = enrollments.map(e => e.student);

        if (!students.length) {
            return res.status(400).json({
                message: 'No students enrolled in this cohort',
                cohortId: finalCohortId
            });
        }

        // Get exams for this subject and cohort
        const exams = await prisma.exam.findMany({
            where: {
                cohortId: finalCohortId,
                subjectId: finalSubjectId,
                status: 'PUBLISHED'
            },
            include: {
                studentMarks: {
                    include: {
                        subQuestion: {
                            include: {
                                question: true
                            }
                        }
                    }
                }
            }
        });

        // Get grading rules
        const rules = await prisma.gradingRule.findMany({
            orderBy: { minPercentage: 'desc' }
        });

        if (!rules.length) {
            return res.status(400).json({ message: 'No grading rules configured' });
        }

        // Calculate grades for each student
        const results = [];

        for (const student of students) {
            const studentExamMarks: Record<string, number> = {};

            // Aggregate marks by exam type
            exams.forEach(exam => {
                const marksForStudent = exam.studentMarks.filter(m => m.studentId === student.id);
                const total = marksForStudent.reduce((sum, m) => sum + (Number(m.marks) ?? 0), 0);

                studentExamMarks[exam.examType] = total;
            });

            // Calculate final marks (Best of 2 internals + External)
            const internal1 = studentExamMarks['INTERNAL_1'] ?? 0;
            const internal2 = studentExamMarks['INTERNAL_2'] ?? 0;
            const external = studentExamMarks['EXTERNAL'] ?? 0;
            
            // Get max marks for the involved exams to calculate correct percentage
            // Default to institutional standards if exams are missing
            const int1Exam = exams.find(e => e.examType === 'INTERNAL_1');
            const int2Exam = exams.find(e => e.examType === 'INTERNAL_2');
            const extExam = exams.find(e => e.examType === 'EXTERNAL');

            const maxInt = Math.max(int1Exam?.maxMarks || 0, int2Exam?.maxMarks || 0) || 30;
            const maxExt = extExam?.maxMarks || 70;
            const maxTotal = maxInt + maxExt;

            const bestInternal = Math.max(internal1, internal2);
            const totalMarks = bestInternal + external;

            // Calculate percentage with precision
            const percentage = Math.round(((totalMarks / maxTotal) * 100) * 100) / 100;

            // Assign grade based on percentage
            let grade = 'F';
            let gradePoint = 0;

            for (const rule of rules) {
                if (percentage >= rule.minPercentage && percentage <= rule.maxPercentage) {
                    grade = rule.grade;
                    gradePoint = rule.gradePoint;
                    break;
                }
            }

            // Upsert FinalMark
            await prisma.finalMark.upsert({
                where: {
                    studentId_subjectId_cohortId: {
                        studentId: student.id,
                        subjectId: finalSubjectId,
                        cohortId: finalCohortId
                    }
                },
                update: {
                    internal1,
                    internal2,
                    bestInternal,
                    externalMarks: external,
                    totalMarks,
                    percentage,
                    grade,
                    gradePoint,
                    computedAt: new Date()
                },
                create: {
                    studentId: student.id,
                    subjectId: finalSubjectId,
                    cohortId: finalCohortId,
                    internal1,
                    internal2,
                    bestInternal,
                    externalMarks: external,
                    totalMarks,
                    percentage,
                    grade,
                    gradePoint,
                    status: 'calculated'
                }
            });

            results.push({
                studentId: student.id,
                grade,
                percentage,
                totalMarks
            });
        }

        res.json({
            message: 'Grades calculated successfully',
            studentsProcessed: results.length,
            results
        });
    } catch (error) {
        console.error('Error calculating grades:', error);
        res.status(500).json({
            message: 'Error calculating grades',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const getSemesterResults = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const results = await prisma.semesterResult.findMany({
            where: { studentId },
            orderBy: { semester: 'asc' }
        });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching semester results' });
    }
};

export const calculateSGPA = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, cohortId, semester } = req.body;

        if (!studentId || !cohortId || !semester) {
            return res.status(400).json({ message: 'Student ID, Cohort ID, and Semester are required' });
        }

        // Get all final marks for this student in this semester
        const marks = await prisma.finalMark.findMany({
            where: {
                studentId,
                cohortId
            },
            include: {
                subject: true
            }
        });

        if (!marks.length) {
            return res.status(404).json({ message: 'No grades found for this student' });
        }

        // Calculate SGPA: Σ(Credit × GradePoint) / Σ(Credit)
        let totalCredits = 0;
        let totalPoints = 0;
        let earnedCredits = 0;

        marks.forEach(mark => {
            const credits = mark.subject.credits || 3;
            totalCredits += credits;
            totalPoints += credits * mark.gradePoint;

            // Credits earned (if grade not F)
            if (mark.grade !== 'F') {
                earnedCredits += credits;
            }
        });

        const sgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

        // Get all previous semester results for CGPA
        const previousResults = await prisma.semesterResult.findMany({
            where: {
                studentId,
                cohortId,
                semester: { lt: semester }
            }
        });

        // Calculate CGPA (credit-weighted average across semesters)
        let allCredits = totalCredits;
        let allPoints = totalPoints;

        previousResults.forEach(result => {
            allCredits += result.totalCredits;
            allPoints += result.sgpa * result.totalCredits;
        });

        const cgpa = allCredits > 0 ? parseFloat((allPoints / allCredits).toFixed(2)) : 0;

        // Save semester result
        await prisma.semesterResult.upsert({
            where: {
                studentId_cohortId_semester: {
                    studentId,
                    cohortId,
                    semester
                }
            },
            update: {
                totalCredits,
                earnedCredits,
                sgpa,
                cgpa,
                status: 'calculated'
            },
            create: {
                studentId,
                cohortId,
                semester,
                totalCredits,
                earnedCredits,
                sgpa,
                cgpa,
                status: 'calculated'
            }
        });

        res.json({
            sgpa,
            cgpa,
            totalCredits,
            earnedCredits,
            subjectsIncluded: marks.length
        });
    } catch (error) {
        console.error('Error calculating SGPA:', error);
        res.status(500).json({ message: 'Error calculating SGPA' });
    }
};

export const updateFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;

        if (req.user?.role !== 'TEACHER' && req.user?.role !== 'HOD' && req.user?.role !== 'ADMIN' && req.user?.role !== 'PRINCIPAL') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const mark = await prisma.finalMark.update({
            where: { id },
            data: { feedback }
        });

        res.json({ message: 'Feedback updated', mark });
    } catch (error) {
        console.error('Error updating feedback:', error);
        res.status(500).json({ message: 'Error updating feedback' });
    }
};

export const bulkUpdateGradeStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, subjectId, status } = req.body;
        const user = req.user;

        if (!['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '')) {
            return res.status(403).json({ message: 'Only authorities can perform bulk status updates' });
        }

        if (status === 'LOCKED' && !['ADMIN', 'PRINCIPAL'].includes(user?.role || '')) {
            return res.status(403).json({ message: 'Only Principal or Admin can lock grades permanently' });
        }

        const result = await prisma.finalMark.updateMany({
            where: { cohortId, subjectId },
            data: { status }
        });

        res.json({ message: `Status updated to ${status} for ${result.count} students`, count: result.count });
    } catch (error: any) {
        console.error('Error bulk updating grade status:', error);
        res.status(500).json({ message: 'Failed to update grade status', error: error.message });
    }
};

export const bulkCalculateSGPA = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, semester } = req.body;
        const user = req.user;

        if (!['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '')) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId },
            select: { studentId: true }
        });

        const studentIds = enrollments.map(e => e.studentId);
        const results = [];

        for (const studentId of studentIds) {
            // Re-using logic from calculateSGPA but in a loop
            // We could optimize this but for a typical class of 60-120 it's fine
            const marks = await prisma.finalMark.findMany({
                where: { studentId, cohortId },
                include: { subject: true }
            });

            if (marks.length === 0) continue;

            let totalCredits = 0;
            let totalPoints = 0;
            let earnedCredits = 0;

            marks.forEach(mark => {
                const credits = mark.subject.credits || 3;
                totalCredits += credits;
                totalPoints += credits * mark.gradePoint;
                if (mark.grade !== 'F') earnedCredits += credits;
            });

            const sgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
            
            // CGPA calculation
            const previousResults = await prisma.semesterResult.findMany({
                where: { studentId, cohortId, semester: { lt: semester } }
            });

            let allCredits = totalCredits;
            let allPoints = totalPoints;
            previousResults.forEach(r => {
                allCredits += r.totalCredits;
                allPoints += r.sgpa * r.totalCredits;
            });

            const cgpa = allCredits > 0 ? parseFloat((allPoints / allCredits).toFixed(2)) : 0;

            await prisma.semesterResult.upsert({
                where: { studentId_cohortId_semester: { studentId, cohortId, semester } },
                update: { totalCredits, earnedCredits, sgpa, cgpa, status: 'calculated' },
                create: { studentId, cohortId, semester, totalCredits, earnedCredits, sgpa, cgpa, status: 'calculated' }
            });

            results.push({ studentId, sgpa, cgpa });
        }

        res.json({ message: `SGPA/CGPA calculated for ${results.length} students`, count: results.length });
    } catch (error: any) {
        console.error('Error bulk calculating SGPA:', error);
        res.status(500).json({ message: 'Failed to calculate bulk SGPA', error: error.message });
    }
};
