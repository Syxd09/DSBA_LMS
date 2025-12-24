import prisma from './db';

interface POResult {
    poNumber: number;
    poDescription: string;
    achievedPercent: number;
    targetPercent: number;
    isAttained: boolean;
    coCount: number;
    status: string;
}

export const AttainmentService = {
    /**
     * Calculate Course Outcome (CO) Attainment
     * Iterates through all exams, questions, and marks for a cohort/subject.
     */
    async calculateCO(subjectId: string, cohortId: string, semester: number, academicYear: string, targetPercent: number = 60) {
        console.log(`Calculating CO Attainment for Subject: ${subjectId}, Cohort: ${cohortId}`);

        // 1. Get Course Outcomes
        const courseOutcomes = await prisma.courseOutcome.findMany({
            where: { subjectId },
            orderBy: { coNumber: 'asc' }
        });

        if (courseOutcomes.length === 0) throw new Error('No Course Outcomes found for this subject');

        // 2. Get Students
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId, semester },
            select: { studentId: true }
        });
        const studentIds = enrollments.map(e => e.studentId);
        const totalStudents = studentIds.length;

        if (totalStudents === 0) throw new Error('No students enrolled for this cohort/semester');

        // 3. Get Exams & Marks
        // Optimization: Fetch only necessary fields
        const exams = await prisma.exam.findMany({
            where: { subjectId, cohortId, status: 'PUBLISHED' },
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

        const results = [];

        // 4. Calculate per CO
        for (const co of courseOutcomes) {
            let studentScores: Record<string, { scored: number; max: number }> = {};

            // Initialize scores
            studentIds.forEach(id => {
                studentScores[id] = { scored: 0, max: 0 };
            });

            // Aggregate Marks
            for (const exam of exams) {
                for (const section of exam.sections) {
                    for (const question of section.questions) {
                        const relevantSubQuestions = question.subQuestions.filter(
                            sq => sq.coId === co.id || question.coId === co.id
                        );

                        for (const sq of relevantSubQuestions) {
                            // Fetch all marks for this subquestion in one go (batched by studentIds)
                            const marks = await prisma.studentMark.findMany({
                                where: {
                                    examId: exam.id,
                                    subQuestionId: sq.id,
                                    studentId: { in: studentIds }
                                }
                            });

                            // Add to totals
                            marks.forEach(mark => {
                                if (studentScores[mark.studentId]) {
                                    studentScores[mark.studentId].scored += Number(mark.marks);
                                    studentScores[mark.studentId].max += sq.maxMarks;
                                }
                            });

                            // For students who didn't attempt, we still add max marks to their potential total?
                            // Usually if absent/not attempted, it counts as 0 scored but max marks still exist.
                            // The above loop only finds *existing* marks. 
                            // We need to ensure max marks are added for ALL students even if they have no mark entry (absent).
                            studentIds.forEach(sid => {
                                // If we rely strictly on 'marks' existing, we miss absent students.
                                // Correct logic: Always add max marks to denominator.
                                if (studentScores[sid]) {
                                    studentScores[sid].max += sq.maxMarks;
                                }
                            });
                        }
                    }
                }
            }

            // Calculate Pass Count
            let passCount = 0;
            Object.values(studentScores).forEach(score => {
                if (score.max > 0) {
                    const percentage = (score.scored / score.max) * 100;
                    if (percentage >= targetPercent) passCount++;
                }
            });

            const achievedPercent = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0;

            // Upsert result
            const attainment = await prisma.cOAttainment.upsert({
                where: {
                    subjectId_cohortId_coId_semester_academicYear: {
                        subjectId, cohortId, coId: co.id, semester, academicYear
                    }
                },
                update: {
                    targetPercent,
                    achievedPercent,
                    studentCount: totalStudents,
                    passCount,
                    status: 'CALCULATED',
                    calculatedAt: new Date()
                },
                create: {
                    subjectId, cohortId, coId: co.id, semester, academicYear,
                    targetPercent, achievedPercent, studentCount: totalStudents, passCount,
                    status: 'CALCULATED', calculatedAt: new Date()
                },
                include: { co: true }
            });

            results.push(attainment);
        }

        return results;
    },

    /**
     * Calculate Program Outcome (PO) Attainment
     * Aggregates CO attainments based on mapping weights.
     */
    async calculatePO(programId: string, cohortId: string, semester: number, academicYear: string) {
        console.log(`Calculating PO Attainment for Program: ${programId}, Cohort: ${cohortId}`);

        const programOutcomes = await prisma.programOutcome.findMany({
            where: { programId }
        });

        if (programOutcomes.length === 0) throw new Error('No Program Outcomes defined');

        // Fetch Approved CO Attainments
        const coAttainments = await prisma.cOAttainment.findMany({
            where: {
                cohortId,
                semester,
                academicYear,
                status: { in: ['APPROVED', 'LOCKED'] }
            },
            include: {
                co: { include: { poMappings: true } }
            }
        });

        if (coAttainments.length === 0) throw new Error('No approved CO attainments found');

        const results: POResult[] = [];

        for (const po of programOutcomes) {
            let weightedSum = 0;
            let totalWeight = 0;
            let coCount = 0;

            for (const coAtt of coAttainments) {
                const mapping = coAtt.co.poMappings.find(m => m.poId === po.id);
                if (mapping) {
                    const weight = mapping.correlationLevel;
                    weightedSum += coAtt.achievedPercent * weight;
                    totalWeight += weight;
                    coCount++;
                }
            }

            const achievedPercent = totalWeight > 0 ? weightedSum / totalWeight : 0;

            // Upsert
            const poAttainment = await prisma.pOAttainment.upsert({
                where: {
                    programId_cohortId_poId_semester_academicYear: {
                        programId, cohortId, poId: po.id, semester, academicYear
                    }
                },
                update: {
                    achievedPercent: Number(achievedPercent.toFixed(2)),
                    weightedSum, totalWeight, coCount,
                    status: 'CALCULATED', calculatedAt: new Date()
                },
                create: {
                    programId, cohortId, poId: po.id, semester, academicYear,
                    achievedPercent: Number(achievedPercent.toFixed(2)),
                    weightedSum, totalWeight, coCount,
                    status: 'CALCULATED', calculatedAt: new Date()
                }
            });

            results.push({
                poNumber: po.poNumber,
                poDescription: po.description,
                achievedPercent: poAttainment.achievedPercent,
                targetPercent: poAttainment.targetPercent,
                isAttained: poAttainment.achievedPercent >= poAttainment.targetPercent,
                coCount,
                status: poAttainment.status
            });
        }

        return results;
    }
};
