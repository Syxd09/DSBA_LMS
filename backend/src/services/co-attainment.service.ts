import prisma from './db';

/**
 * CO Attainment Calculation Service
 * Calculates Course Outcome (CO) attainment based on student marks
 */

export async function calculateCOAttainmentForExam(examId: string): Promise<void> {
    try {
        console.log(`[CO Attainment] Starting calculation for exam: ${examId}`);

        // Fetch exam with all necessary data
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                cohort: true,
                subject: true,
                sections: {
                    include: {
                        questions: {
                            include: {
                                subQuestions: {
                                    include: {
                                        co: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!exam) {
            console.error(`[CO Attainment] Exam not found: ${examId}`);
            return;
        }

        // Get semester directly from subject (it's an Int field)
        const semester = exam.subject.semester;

        // Derive academic year from current date
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        console.log(`[CO Attainment] Exam: ${exam.examType}, Subject: ${exam.subject.name}, Semester: ${semester}, Year: ${academicYear}`);

        // Get all sub-questions and group by CO
        const subQuestions = exam.sections
            .flatMap(s => s.questions)
            .flatMap(q => q.subQuestions);

        if (subQuestions.length === 0) {
            console.log(`[CO Attainment] No sub-questions found`);
            return;
        }

        // Group by CO
        const coSubQuestions = new Map<string, typeof subQuestions>();
        subQuestions.forEach(sq => {
            if (!sq.coId) return;
            const existing = coSubQuestions.get(sq.coId) || [];
            existing.push(sq);
            coSubQuestions.set(sq.coId, existing);
        });

        console.log(`[CO Attainment] Found ${coSubQuestions.size} COs`);

        // Get student marks
        const studentMarks = await prisma.studentMark.findMany({
            where: { examId }
        });

        if (studentMarks.length === 0) {
            console.log(`[CO Attainment] No marks found`);
            return;
        }

        const studentIds = [...new Set(studentMarks.map(m => m.studentId))];
        const totalStudents = studentIds.length;

        console.log(`[CO Attainment] Processing ${totalStudents} students`);

        // Calculate for each CO
        for (const [coId, coSqs] of coSubQuestions.entries()) {
            const coSubQuestionIds = coSqs.map(sq => sq.id);
            const coMaxMarks = coSqs.reduce((sum, sq) => sum + Number(sq.maxMarks), 0);

            // Get targetPercent from the associated CO
            const targetCO = coSqs.find(sq => sq.co)?.co;
            const threshold = targetCO?.targetPercent ?? 60;

            let passCount = 0;

            for (const studentId of studentIds) {
                const studentCoMarks = studentMarks.filter(
                    m => m.studentId === studentId && coSubQuestionIds.includes(m.subQuestionId)
                );

                const obtainedMarks = studentCoMarks.reduce((sum, m) => sum + Number(m.marks), 0);
                const percentage = coMaxMarks > 0 ? (obtainedMarks / coMaxMarks) * 100 : 0;

                if (percentage >= threshold) {
                    passCount++;
                }
            }

            const achievedPercent = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0;

            console.log(`[CO Attainment] CO ${coId}: ${passCount}/${totalStudents} = ${achievedPercent.toFixed(2)}%`);

            // Upsert CO attainment
            await prisma.cOAttainment.upsert({
                where: {
                    subjectId_cohortId_coId_semester_academicYear: {
                        subjectId: exam.subjectId,
                        cohortId: exam.cohortId,
                        coId: coId,
                        semester: semester,
                        academicYear: academicYear
                    }
                },
                update: {
                    achievedPercent: achievedPercent,
                    targetPercent: threshold,
                    studentCount: totalStudents,
                    passCount: passCount,
                    calculatedAt: new Date(),
                    status: 'CALCULATED'
                },
                create: {
                    subjectId: exam.subjectId,
                    cohortId: exam.cohortId,
                    coId: coId,
                    semester: semester,
                    academicYear: academicYear,
                    achievedPercent: achievedPercent,
                    targetPercent: threshold,
                    studentCount: totalStudents,
                    passCount: passCount,
                    calculatedAt: new Date(),
                    status: 'CALCULATED'
                }
            });
        }

        console.log(`[CO Attainment] ✅ Complete`);

    } catch (error) {
        console.error(`[CO Attainment] ❌ Error:`, error);
        throw error;
    }
}
