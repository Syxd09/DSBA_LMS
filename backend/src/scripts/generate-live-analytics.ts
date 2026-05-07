
import { PrismaClient } from '@prisma/client';
import { calculateCOAttainmentForExam } from '../services/co-attainment.service';
import { calculatePOAttainmentForSubject } from '../services/po-attainment.service';

const prisma = new PrismaClient();

async function generateLiveAnalytics() {
    console.log('📊 Starting Live Analytics Generation...');

    // 1. Get all subject-cohort pairs that have exams with marks
    const pairings = await prisma.exam.findMany({
        where: { 
            studentMarks: { some: {} },
            status: { in: ['PUBLISHED', 'LOCKED'] }
        },
        select: { subjectId: true, cohortId: true },
        distinct: ['subjectId', 'cohortId']
    });

    console.log(`Found ${pairings.length} subject-cohort pairs to process.`);

    // 2. Get grading rules
    const rules = await prisma.gradingRule.findMany({
        orderBy: { minPercentage: 'desc' }
    });

    if (rules.length === 0) {
        console.error('❌ No grading rules found. Please seed grading rules first.');
        return;
    }

    for (const pair of pairings) {
        const { subjectId, cohortId } = pair;
        console.log(`\n🔄 Processing Subject: ${subjectId} | Cohort: ${cohortId}`);

        // Get enrollments
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId: cohortId },
            include: { student: true }
        });

        if (enrollments.length === 0) {
            console.log('   ⚠️ No students enrolled.');
            continue;
        }

        // Get all exams for this pair that have marks
        const exams = await prisma.exam.findMany({
            where: {
                cohortId,
                subjectId,
                studentMarks: { some: {} },
                status: { in: ['PUBLISHED', 'LOCKED'] }
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

        console.log(`   Found ${exams.length} published exams.`);

        for (const enrollment of enrollments) {
            const student = enrollment.student;
            const studentExamMarks: Record<string, number> = {};

            // Aggregate marks by exam type
            exams.forEach(exam => {
                const marksForStudent = exam.studentMarks.filter(m => m.studentId === student.id);
                const total = marksForStudent.reduce((sum, m) => sum + (Number(m.marksObtained || m.marks) ?? 0), 0);
                studentExamMarks[exam.examType] = total;
            });

            // Standard calculation (Best of internals + External)
            const internal1 = studentExamMarks['INTERNAL_1'] ?? 0;
            const internal2 = studentExamMarks['INTERNAL_2'] ?? 0;
            const external = studentExamMarks['EXTERNAL'] ?? 0;
            
            const int1Exam = exams.find(e => e.examType === 'INTERNAL_1');
            const int2Exam = exams.find(e => e.examType === 'INTERNAL_2');
            const extExam = exams.find(e => e.examType === 'EXTERNAL');

            const maxInt = Math.max(int1Exam?.maxMarks || 0, int2Exam?.maxMarks || 0) || 30;
            const maxExt = extExam?.maxMarks || 70;
            const maxTotal = maxInt + maxExt;

            const bestInternal = Math.max(internal1, internal2);
            const totalMarks = bestInternal + external;
            const percentage = maxTotal > 0 ? Math.round(((totalMarks / maxTotal) * 100) * 100) / 100 : 0;

            let grade = 'F';
            let gradePoint = 0;
            for (const rule of rules) {
                if (percentage >= rule.minPercentage && percentage <= rule.maxPercentage) {
                    grade = rule.grade;
                    gradePoint = rule.gradePoint;
                    break;
                }
            }

            // --- REAL CO ATTAINMENT CALCULATION ---
            const studentCoMarks: Record<string, { obtained: number, max: number }> = {};
            exams.forEach(exam => {
                const marksForStudent = exam.studentMarks.filter(m => m.studentId === student.id);
                marksForStudent.forEach(mark => {
                    const coId = mark.subQuestion?.coId || mark.subQuestion?.question?.coId;
                    if (coId) {
                        if (!studentCoMarks[coId]) {
                            studentCoMarks[coId] = { obtained: 0, max: 0 };
                        }
                        studentCoMarks[coId].obtained += Number(mark.marksObtained || mark.marks) || 0;
                        studentCoMarks[coId].max += mark.subQuestion?.maxMarks || 0;
                    }
                });
            });

            const coAttainment = Object.entries(studentCoMarks).map(([id, stats]) => ({
                id,
                percentage: stats.max > 0 ? (stats.obtained / stats.max) * 100 : 0
            }));

            // Save to FinalMark
            await prisma.finalMark.upsert({
                where: {
                    studentId_subjectId_cohortId: {
                        studentId: student.id,
                        subjectId: subjectId,
                        cohortId: cohortId
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
                    coAttainment,
                    computedAt: new Date(),
                    status: 'calculated'
                },
                create: {
                    studentId: student.id,
                    subjectId: subjectId,
                    cohortId: cohortId,
                    internal1,
                    internal2,
                    bestInternal,
                    externalMarks: external,
                    totalMarks,
                    percentage,
                    grade,
                    gradePoint,
                    coAttainment,
                    status: 'calculated'
                }
            });
        }
        console.log(`   ✅ Processed ${enrollments.length} students for subject ${subjectId}`);

        // 3. Trigger Persistent CO & PO Attainment Calculations
        try {
            for (const exam of exams) {
                await calculateCOAttainmentForExam(exam.id);
            }
            await calculatePOAttainmentForSubject(subjectId, cohortId);
            console.log(`   ✨ Persistent CO/PO Attainment recalculated for subject ${subjectId}`);
        } catch (attainErr) {
            console.error(`   ❌ Error calculating persistent attainment for ${subjectId}:`, attainErr);
        }
    }

    console.log('\n✨ Live Analytics Generation Complete!');
}

generateLiveAnalytics()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
