import prisma from './db';

/**
 * GAP 3: Validate that all CO IDs belong to the exam's subject
 * This ensures NAAC compliance and prevents cross-subject CO assignment
 */
export async function validateExamStructureCOs(sections: any[], examId: string): Promise<{ valid: boolean; message?: string }> {
    // Get exam's subject
    const exam = await prisma.exam.findUnique({
        where: { id: examId },
        select: { subjectId: true }
    });

    if (!exam) {
        return { valid: false, message: 'Exam not found' };
    }

    // Collect all CO IDs from structure
    const allCOIds = new Set<string>();
    sections.forEach((section: any) => {
        section.questions?.forEach((q: any) => {
            if (q.coId) allCOIds.add(q.coId);
            q.subQuestions?.forEach((sq: any) => {
                if (sq.coId) allCOIds.add(sq.coId);
            });
        });
    });

    if (allCOIds.size === 0) {
        return { valid: true }; // No COs to validate
    }

    // Count how many of these COs belong to the exam's subject
    const validCOs = await prisma.courseOutcome.count({
        where: {
            id: { in: Array.from(allCOIds) },
            subjectId: exam.subjectId
        }
    });

    if (validCOs !== allCOIds.size) {
        return {
            valid: false,
            message: 'Invalid CO assignment: All COs must belong to the exam\'s subject. Some selected COs are from a different subject.'
        };
    }

    return { valid: true };
}
