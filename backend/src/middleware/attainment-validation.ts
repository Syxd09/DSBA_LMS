import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Validation result interface
 */
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    data?: any;
}

/**
 * Attainment Validation Utilities
 * Ensures calculations can proceed safely without crashing
 */
export class AttainmentValidator {
    /**
     * Validate data completeness before CO calculation
     */
    static async validateCOCalculation(
        subjectId: string,
        cohortId: string,
        semester: number,
        academicYear: string
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const data: any = {};

        try {
            // 1. Check if subject exists
            const subject = await prisma.subject.findUnique({
                where: { id: subjectId },
                include: { courseOutcomes: true }
            });

            if (!subject) {
                errors.push('Subject not found. Please select a valid subject.');
                return { isValid: false, errors, warnings };
            }

            if (!subject.courseOutcomes || subject.courseOutcomes.length === 0) {
                errors.push(`No Course Outcomes defined for ${subject.name}. Please create Course Outcomes before calculating attainment.`);
                return { isValid: false, errors, warnings };
            }

            data.subject = subject;
            data.coCount = subject.courseOutcomes.length;

            // 2. Check if cohort exists
            const cohort = await prisma.cohort.findUnique({
                where: { id: cohortId },
                include: { program: true }
            });

            if (!cohort) {
                errors.push('Cohort not found. Please select a valid cohort.');
                return { isValid: false, errors, warnings };
            }

            data.cohort = cohort;

            // 3. Check students enrollment
            const enrollments = await prisma.studentEnrollment.findMany({
                where: { cohortId, semester },
                include: { student: { select: { fullName: true, email: true } } }
            });

            if (enrollments.length === 0) {
                errors.push(`No students enrolled in ${cohort.name} for Semester ${semester}. Please enroll students before calculating attainment.`);
                return { isValid: false, errors, warnings };
            }

            data.studentCount = enrollments.length;
            data.studentIds = enrollments.map(e => e.studentId);

            // 4. Check for published exams
            const exams = await prisma.exam.findMany({
                where: {
                    subjectId,
                    cohortId,
                    status: 'PUBLISHED'
                },
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

            if (exams.length === 0) {
                errors.push(`No published exams found for ${subject.name} in ${cohort.name}. Please publish at least one exam before calculating attainment.`);
                return { isValid: false, errors, warnings };
            }

            data.examCount = exams.length;
            data.exams = exams;

            // 5. Check for marks completeness
            const marksIssues: string[] = [];
            let totalExpectedMarks = 0;
            let totalActualMarks = 0;

            for (const exam of exams) {
                const subQuestionIds: string[] = [];

                for (const section of exam.sections) {
                    for (const question of section.questions) {
                        subQuestionIds.push(...question.subQuestions.map(sq => sq.id));
                    }
                }

                if (subQuestionIds.length === 0) {
                    warnings.push(`Exam "${exam.examType}" has no questions. It will be skipped in calculations.`);
                    continue;
                }

                totalExpectedMarks += subQuestionIds.length * enrollments.length;

                const marks = await prisma.studentMark.findMany({
                    where: {
                        examId: exam.id,
                        subQuestionId: { in: subQuestionIds },
                        studentId: { in: data.studentIds }
                    }
                });

                totalActualMarks += marks.length;

                const expectedForExam = subQuestionIds.length * enrollments.length;
                const actualForExam = marks.length;

                if (actualForExam < expectedForExam) {
                    const percentageMissing = ((expectedForExam - actualForExam) / expectedForExam * 100).toFixed(1);
                    warnings.push(`Exam "${exam.examType}": ${expectedForExam - actualForExam} marks missing (${percentageMissing}% incomplete). Missing marks will be treated as 0.`);
                }
            }

            data.marksCompleteness = totalExpectedMarks > 0
                ? ((totalActualMarks / totalExpectedMarks) * 100).toFixed(1)
                : 0;

            if (totalActualMarks === 0) {
                errors.push('No marks have been entered for any exam. Please enter student marks before calculating attainment.');
                return { isValid: false, errors, warnings };
            }

            // 6. Check for CO mapping in questions
            let questionsWithoutCO = 0;
            let totalQuestions = 0;

            for (const exam of exams) {
                for (const section of exam.sections) {
                    for (const question of section.questions) {
                        for (const subQuestion of question.subQuestions) {
                            totalQuestions++;
                            if (!subQuestion.coId && !question.coId) {
                                questionsWithoutCO++;
                            }
                        }
                    }
                }
            }

            if (questionsWithoutCO > 0) {
                const percentage = ((questionsWithoutCO / totalQuestions) * 100).toFixed(1);
                if (questionsWithoutCO === totalQuestions) {
                    errors.push(`All questions in exams are not mapped to any Course Outcome. Please map questions to COs before calculating attainment.`);
                    return { isValid: false, errors, warnings };
                } else {
                    warnings.push(`${questionsWithoutCO} out of ${totalQuestions} questions (${percentage}%) are not mapped to any CO. They will be excluded from calculations.`);
                }
            }

            // All validations passed
            return {
                isValid: true,
                errors,
                warnings,
                data
            };

        } catch (error: any) {
            errors.push(`Validation failed: ${error.message || 'Unknown error'}. Please contact support if this persists.`);
            return { isValid: false, errors, warnings };
        }
    }

    /**
     * Validate PO calculation prerequisites
     */
    static async validatePOCalculation(
        programId: string,
        cohortId: string,
        semester: number,
        academicYear: string
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const data: any = {};

        try {
            // 1. Check if program exists
            const program = await prisma.program.findUnique({
                where: { id: programId },
                include: { outcomes: true }
            });

            if (!program) {
                errors.push('Program not found.');
                return { isValid: false, errors, warnings };
            }

            if (!program.outcomes || program.outcomes.length === 0) {
                errors.push(`No Program Outcomes defined for ${program.name}. Please create Program Outcomes first.`);
                return { isValid: false, errors, warnings };
            }

            data.program = program;
            data.poCount = program.outcomes.length;

            // 2. Check for approved CO attainments
            const coAttainments = await prisma.cOAttainment.findMany({
                where: {
                    cohortId,
                    semester,
                    academicYear,
                    status: { in: ['APPROVED', 'LOCKED'] }
                },
                include: {
                    co: { include: { poMappings: true } },
                    subject: { select: { name: true } }
                }
            });

            if (coAttainments.length === 0) {
                errors.push(`No approved CO attainments found for this cohort/semester. Please calculate and approve CO attainments before calculating PO attainment.`);
                return { isValid: false, errors, warnings };
            }

            data.coAttainmentCount = coAttainments.length;

            // 3. Check CO-PO mappings
            let unmappedCOs = 0;
            for (const coAtt of coAttainments) {
                if (!coAtt.co.poMappings || coAtt.co.poMappings.length === 0) {
                    unmappedCOs++;
                }
            }

            if (unmappedCOs > 0) {
                if (unmappedCOs === coAttainments.length) {
                    errors.push(`None of the Course Outcomes are mapped to Program Outcomes. Please create CO-PO mappings first.`);
                    return { isValid: false, errors, warnings };
                } else {
                    warnings.push(`${unmappedCOs} out of ${coAttainments.length} COs are not mapped to any PO. They will be excluded from PO calculations.`);
                }
            }

            return {
                isValid: true,
                errors,
                warnings,
                data
            };

        } catch (error: any) {
            errors.push(`Validation failed: ${error.message}`);
            return { isValid: false, errors, warnings };
        }
    }
}

/**
 * Middleware to validate attainment calculation requests
 */
export const validateAttainmentCalculation = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const { subjectId, cohortId, semester, academicYear } = req.body;

    if (!subjectId || !cohortId || !semester || !academicYear) {
        return res.status(400).json({
            success: false,
            message: 'Missing required parameters',
            errors: ['Subject ID, Cohort ID, Semester, and Academic Year are required']
        });
    }

    const validation = await AttainmentValidator.validateCOCalculation(
        subjectId,
        cohortId,
        Number(semester),
        String(academicYear)
    );

    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed. Please fix the following issues before calculating attainment:',
            errors: validation.errors,
            warnings: validation.warnings
        });
    }

    // Attach validation data to request for use in controller
    (req as any).validationData = validation.data;
    (req as any).validationWarnings = validation.warnings;

    next();
};
