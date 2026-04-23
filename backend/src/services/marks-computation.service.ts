import prisma from './db';

/**
 * Marks Computation Service
 * Aggregates individual StudentMark entries into exam-level totals (MarksComputed).
 * Handles FIRST_N and BEST_N question selection logic at the section level.
 */

export async function calculateMarksComputed(examId: string): Promise<void> {
    try {
        console.log(`[Marks Computation] Starting for exam: ${examId}`);

        // 1. Fetch exam structure and rules
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

        if (!exam) {
            console.error(`[Marks Computation] Exam not found: ${examId}`);
            return;
        }

        // 2. Get all student marks for this exam
        const studentMarks = await prisma.studentMark.findMany({
            where: { examId }
        });

        if (studentMarks.length === 0) {
            console.log(`[Marks Computation] No marks found for exam: ${examId}`);
            return;
        }

        // 3. Group marks by student
        const marksByStudent = new Map<string, typeof studentMarks>();
        studentMarks.forEach(m => {
            const existing = marksByStudent.get(m.studentId) || [];
            existing.push(m);
            marksByStudent.set(m.studentId, existing);
        });

        console.log(`[Marks Computation] Processing ${marksByStudent.size} students`);

        // 4. Calculate total for each student based on rules
        for (const [studentId, studentRecord] of marksByStudent.entries()) {
            let totalExamMarks = 0;
            const selectedQuestionsData: any[] = [];

            // Process each section
            for (const section of exam.sections) {
                const questionScores: Array<{ questionId: string; score: number; sequence: number }> = [];

                // Calculate total score for each question in the section
                for (const question of section.questions) {
                    const subQuestionIds = question.subQuestions.map(sq => sq.id);
                    const questionMarks = studentRecord.filter(m => subQuestionIds.includes(m.subQuestionId));
                    const questionTotal = questionMarks.reduce((sum, m) => sum + Number(m.marks), 0);
                    
                    questionScores.push({
                        questionId: question.id,
                        score: questionTotal,
                        sequence: question.sequence
                    });
                }

                // Apply Selection Mode (FIRST_N or BEST_N)
                let selected: typeof questionScores = [];
                if (section.selectionMode === 'BEST_N') {
                    // Sort by score descending, then by sequence
                    selected = [...questionScores].sort((a, b) => b.score - a.score || a.sequence - b.sequence)
                        .slice(0, section.requiredQuestions);
                } else {
                    // FIRST_N: Sort by sequence and take top N
                    selected = [...questionScores].sort((a, b) => a.sequence - b.sequence)
                        .slice(0, section.requiredQuestions);
                }

                const sectionTotal = selected.reduce((sum, q) => sum + q.score, 0);
                totalExamMarks += sectionTotal;
                
                selectedQuestionsData.push({
                    sectionId: section.id,
                    sectionName: section.name,
                    selectedQuestions: selected,
                    sectionTotal
                });
            }

            // 5. Upsert into MarksComputed
            await prisma.marksComputed.upsert({
                where: {
                    examId_studentId: {
                        examId,
                        studentId
                    }
                },
                update: {
                    totalMarks: totalExamMarks,
                    selectedQuestions: selectedQuestionsData,
                    computedAt: new Date()
                },
                create: {
                    examId,
                    studentId,
                    totalMarks: totalExamMarks,
                    selectedQuestions: selectedQuestionsData
                }
            });
        }

        console.log(`[Marks Computation] ✅ Successfully computed marks for ${marksByStudent.size} students`);

    } catch (error) {
        console.error(`[Marks Computation] ❌ Error calculating marks:`, error);
        throw error;
    }
}
