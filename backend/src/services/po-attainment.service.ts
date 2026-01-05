import prisma from './db';

/**
 * PO Attainment Calculation Service
 * Calculates Program Outcome (PO) attainment from CO attainment
 */

export async function calculatePOAttainmentForSubject(
    subjectId: string,
    cohortId: string
): Promise<void> {
    try {
        console.log(`[PO Attainment] Starting for subject: ${subjectId}`);

        // Get subject with curriculum to access program
        const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
            include: {
                curriculum: {
                    include: {
                        program: true
                    }
                }
            }
        });

        if (!subject || !subject.curriculum) {
            console.log(`[PO Attainment] Subject or curriculum not found`);
            return;
        }

        const programId = subject.curriculum.programId;
        const semester = subject.semester;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        console.log(`[PO Attainment] Program: ${programId}, Semester: ${semester}`);

        // Get CO attainments
        const coAttainments = await prisma.cOAttainment.findMany({
            where: {
                subjectId,
                cohortId,
                semester,
                academicYear
            }
        });

        if (coAttainments.length === 0) {
            console.log(`[PO Attainment] No CO attainments found`);
            return;
        }

        console.log(`[PO Attainment] Found ${coAttainments.length} CO attainments`);

        // Get CO-PO mappings (note: correlationLevel not mappingLevel!)
        const coPOMappings = await prisma.coPoMapping.findMany({
            where: {
                co: {
                    subjectId
                }
            }
        });

        if (coPOMappings.length === 0) {
            console.log(`[PO Attainment] No CO-PO mappings found`);
            return;
        }

        console.log(`[PO Attainment] Found ${coPOMappings.length} mappings`);

        // Group by PO
        const poMappings = new Map<string, Array<{
            coId: string;
            correlationLevel: number;
            coAttainment: number;
        }>>();

        coPOMappings.forEach(mapping => {
            if (mapping.correlationLevel === 0) return;

            const coAttainment = coAttainments.find(ca => ca.coId === mapping.coId);
            if (!coAttainment) return;

            const existing = poMappings.get(mapping.poId) || [];
            existing.push({
                coId: mapping.coId,
                correlationLevel: mapping.correlationLevel,
                coAttainment: coAttainment.achievedPercent
            });
            poMappings.set(mapping.poId, existing);
        });

        console.log(`[PO Attainment] Processing ${poMappings.size} POs`);

        // Calculate PO attainment
        for (const [poId, mappings] of poMappings.entries()) {
            const weightedSum = mappings.reduce(
                (sum, m) => sum + (m.coAttainment * m.correlationLevel),
                0
            );
            const totalWeight = mappings.reduce(
                (sum, m) => sum + m.correlationLevel,
                0
            );

            const achievedPercent = totalWeight > 0 ? (weightedSum / totalWeight) : 0;

            console.log(`[PO Attainment] PO ${poId}: ${achievedPercent.toFixed(2)}%`);

            // Upsert PO attainment
            await prisma.pOAttainment.upsert({
                where: {
                    programId_cohortId_poId_semester_academicYear: {
                        programId: programId,
                        cohortId: cohortId,
                        poId: poId,
                        semester: semester,
                        academicYear: academicYear
                    }
                },
                update: {
                    achievedPercent: achievedPercent,
                    weightedSum: weightedSum,
                    totalWeight: totalWeight,
                    coCount: mappings.length,
                    calculatedAt: new Date(),
                    status: 'CALCULATED'
                },
                create: {
                    programId: programId,
                    cohortId: cohortId,
                    poId: poId,
                    semester: semester,
                    academicYear: academicYear,
                    achievedPercent: achievedPercent,
                    targetPercent: 60,
                    weightedSum: weightedSum,
                    totalWeight: totalWeight,
                    coCount: mappings.length,
                    calculatedAt: new Date(),
                    status: 'CALCULATED'
                }
            });
        }

        console.log(`[PO Attainment] ✅ Complete`);

    } catch (error) {
        console.error(`[PO Attainment] ❌ Error:`, error);
        throw error;
    }
}
