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
     * HIGH-PERFORMANCE Course Outcome (CO) Attainment Calculation
     * Uses bulk data fetching and in-memory map aggregation for O(1) lookups.
     * 
     * Performance: 3 database queries regardless of student count  
     * Target: < 2 seconds for 2000 students
     */
    async calculateCO(subjectId: string, cohortId: string, semester: number, academicYear: string, targetPercent: number = 60) {
        console.log(`[ATTAINMENT] Starting optimized CO calculation for Subject: ${subjectId}, Cohort: ${cohortId}`);
        const startTime = Date.now();

        // ============================================
        // QUERY 1: Get Course Outcomes and Students
        // ============================================
        const [courseOutcomes, enrollments] = await Promise.all([
            prisma.courseOutcome.findMany({
                where: { subjectId },
                orderBy: { coNumber: 'asc' },
                select: { id: true, coNumber: true, description: true, targetPercent: true }
            }),
            prisma.studentEnrollment.findMany({
                where: { cohortId, semester },
                select: { studentId: true }
            })
        ]);

        if (courseOutcomes.length === 0) {
            throw new Error('No Course Outcomes found for this subject');
        }

        const studentIds = enrollments.map(e => e.studentId);
        const totalStudents = studentIds.length;

        if (totalStudents === 0) {
            throw new Error('No students enrolled for this cohort/semester');
        }

        console.log(`[ATTAINMENT] Found ${courseOutcomes.length} COs and ${totalStudents} students`);

        // ============================================
        // QUERY 2: Bulk fetch ALL marks for ALL students
        // ============================================
        const marks = await prisma.studentMark.findMany({
            where: {
                exam: {
                    subjectId,
                    cohortId,
                    status: 'PUBLISHED'
                },
                studentId: { in: studentIds }
            },
            select: {
                studentId: true,
                marks: true,
                subQuestion: {
                    select: {
                        id: true,
                        maxMarks: true,
                        coId: true,
                        question: {
                            select: { coId: true }
                        }
                    }
                }
            }
        });

        console.log(`[ATTAINMENT] Fetched ${marks.length} marks in bulk`);

        // ============================================
        // IN-MEMORY MAP AGGREGATION (O(1) lookups)
        // ============================================

        // Build map of marks by student and CO
        const studentCOScores = new Map<string, Map<string, { scored: number; max: number }>>();

        // Initialize for all students and COs
        for (const studentId of studentIds) {
            const coScores = new Map<string, { scored: number; max: number }>();
            for (const co of courseOutcomes) {
                coScores.set(co.id, { scored: 0, max: 0 });
            }
            studentCOScores.set(studentId, coScores);
        }

        // Aggregate marks into maps
        for (const mark of marks) {
            const studentScores = studentCOScores.get(mark.studentId);
            if (!studentScores) continue; // Safety check

            // Determine which CO this mark belongs to (sub-question CO takes precedence)
            const coId = mark.subQuestion.coId || mark.subQuestion.question.coId;
            if (!coId) continue; // Skip if no CO mapping

            const coScore = studentScores.get(coId);
            if (coScore) {
                coScore.scored += Number(mark.marks || 0);
                coScore.max += mark.subQuestion.maxMarks;
            }
        }

        console.log(`[ATTAINMENT] Aggregated marks into in-memory maps`);

        // ============================================
        // QUERY 3: Batch upsert all CO attainments
        // ============================================
        const results = [];
        const upsertPromises = [];

        for (const co of courseOutcomes) {
            // Calculate pass count for this CO
            let passCount = 0;
            const threshold = co.targetPercent;

            for (const studentId of studentIds) {
                const studentScores = studentCOScores.get(studentId);
                const coScore = studentScores?.get(co.id);

                if (coScore && coScore.max > 0) {
                    const percentage = (coScore.scored / coScore.max) * 100;
                    if (percentage >= threshold) {
                        passCount++;
                    }
                }
            }

            const achievedPercent = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0;

            // Fetch existing attainment to preserve status (e.g. if already APPROVED or LOCKED)
            const existingAtt = await prisma.cOAttainment.findUnique({
                where: {
                    subjectId_cohortId_coId_semester_academicYear: {
                        subjectId, cohortId, coId: co.id, semester, academicYear
                    }
                }
            });
            const statusToSet = (existingAtt?.status === 'APPROVED' || existingAtt?.status === 'LOCKED')
                ? existingAtt.status
                : 'CALCULATED';

            // Batch upsert
            upsertPromises.push(
                prisma.cOAttainment.upsert({
                    where: {
                        subjectId_cohortId_coId_semester_academicYear: {
                            subjectId, cohortId, coId: co.id, semester, academicYear
                        }
                    },
                    update: {
                        targetPercent: threshold,
                        achievedPercent: Number(achievedPercent.toFixed(2)),
                        studentCount: totalStudents,
                        passCount,
                        status: statusToSet,
                        calculatedAt: new Date()
                    },
                    create: {
                        subjectId,
                        cohortId,
                        coId: co.id,
                        semester,
                        academicYear,
                        targetPercent: threshold,
                        achievedPercent: Number(achievedPercent.toFixed(2)),
                        studentCount: totalStudents,
                        passCount,
                        status: statusToSet,
                        calculatedAt: new Date()
                    },
                    include: { co: true }
                })
            );
        }

        // Execute all upserts in transaction
        const attainments = await prisma.$transaction(upsertPromises);

        const duration = Date.now() - startTime;
        console.log(`[ATTAINMENT] ✅ Calculation complete in ${duration}ms`);
        console.log(`[ATTAINMENT] Performance: ${totalStudents} students, ${courseOutcomes.length} COs`);
        console.log(`[ATTAINMENT] Speed: ${(duration / totalStudents).toFixed(2)}ms per student`);

        return attainments;
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

        // Fetch Approved and Calculated CO Attainments
        const coAttainments = await prisma.cOAttainment.findMany({
            where: {
                cohortId,
                semester,
                academicYear,
                status: { in: ['CALCULATED', 'APPROVED', 'LOCKED'] }
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
