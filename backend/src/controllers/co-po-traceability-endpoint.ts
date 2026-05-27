// Add this function to the existing analytics.controller.ts file

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

// ... existing imports and functions ...

// Helper function for attainment levels
function getAttainmentLevel(percent: number, targetPercent: number): number {
    if (percent >= targetPercent) return 3;
    if (percent >= targetPercent * 0.8) return 2;
    if (percent >= targetPercent * 0.6) return 1;
    return 0;
}

export const getCOPOTraceability = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester } = req.params;

        // Get subject with program context
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
            return res.status(404).json({ message: 'Subject or curriculum not found' });
        }

        // Get cohort
        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: { program: true }
        });

        if (!cohort) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        // Get CO attainments with PO mappings
        const coAttainments = await prisma.cOAttainment.findMany({
            where: {
                subjectId,
                cohortId,
                semester: parseInt(semester),
                academicYear
            },
            include: {
                co: {
                    include: {
                        poMappings: {
                            include: {
                                po: true
                            }
                        }
                    }
                }
            }
        });

        // Transform CO attainments with levels
        const coWithLevels = coAttainments.map(coAtt => ({
            id: coAtt.id,
            co: {
                id: coAtt.co.id,
                coNumber: coAtt.co.coNumber,
                description: coAtt.co.description
            },
            achievedPercent: coAtt.achievedPercent,
            targetPercent: coAtt.targetPercent,
            level: getAttainmentLevel(coAtt.achievedPercent, coAtt.targetPercent),
            passCount: coAtt.passCount,
            studentCount: coAtt.studentCount,
            poMappings: coAtt.co.poMappings.map(m => ({
                po: {
                    id: m.po.id,
                    poNumber: m.po.poNumber,
                    description: m.po.description
                },
                correlationLevel: m.correlationLevel
            }))
        }));

        // Get PO attainments
        const poAttainments = await prisma.pOAttainment.findMany({
            where: {
                programId: subject.curriculum.programId,
                cohortId,
                semester: parseInt(semester),
                academicYear
            },
            include: {
                po: true
            }
        });

        // Build breakdown for each PO
        const poWithBreakdown = poAttainments.map(po => {
            // Find all COs that map to this PO
            const contributingCOs = coAttainments.filter(coAtt =>
                coAtt.co.poMappings.some(m => m.poId === po.poId)
            );

            const breakdown = contributingCOs.map(coAtt => {
                const mapping = coAtt.co.poMappings.find(m => m.poId === po.poId);
                return {
                    co: {
                        id: coAtt.coId,
                        coNumber: coAtt.co.coNumber
                    },
                    coAttainment: coAtt.achievedPercent,
                    correlationLevel: mapping?.correlationLevel || 0,
                    product: coAtt.achievedPercent * (mapping?.correlationLevel || 0)
                };
            });

            return {
                id: po.id,
                po: {
                    id: po.po.id,
                    poNumber: po.po.poNumber,
                    description: po.po.description
                },
                achievedPercent: po.achievedPercent,
                targetPercent: po.targetPercent,
                level: getAttainmentLevel(po.achievedPercent, po.targetPercent),
                weightedSum: po.weightedSum,
                totalWeight: po.totalWeight,
                breakdown
            };
        });

        res.json({
            context: {
                program: cohort.program,
                cohort: {
                    id: cohort.id,
                    name: cohort.name,
                    year: cohort.year
                },
                semester: parseInt(semester),
                academicYear,
                subject: {
                    id: subject.id,
                    name: subject.name,
                    code: subject.code,
                    credits: subject.credits
                },
                lastCalculated: coAttainments[0]?.calculatedAt || null
            },
            coAttainments: coWithLevels,
            poAttainments: poWithBreakdown
        });
    } catch (error) {
        console.error('[CO-PO Traceability] Error:', error);
        res.status(500).json({
            message: 'Error fetching traceability data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
