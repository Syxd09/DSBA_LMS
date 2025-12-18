
import { PrismaClient, ExamStatus, BloomLevel } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
    console.log('Starting Analytics Seeding...');

    // 1. Get Subject and Cohort
    const subject = await prisma.subject.findFirst({
        include: { courseOutcomes: true }
    });
    const cohort = await prisma.cohort.findFirst();

    if (!subject || !cohort) {
        console.error('No Subject or Cohort found. Cannot seed.');
        return;
    }
    console.log(`Using Subject: ${subject.name} (${subject.code})`);
    console.log(`Using Cohort: ${cohort.name}`);

    // 2. Create Published Exam
    const exam = await prisma.exam.create({
        data: {
            subjectId: subject.id,
            cohortId: cohort.id,
            examType: 'Mid-Term 1',
            maxMarks: 50,
            status: ExamStatus.PUBLISHED,
            publishedAt: new Date()
        }
    });
    console.log(`Created Exam: ${exam.id}`);

    // 3. Create Section and Questions
    const section = await prisma.examSection.create({
        data: {
            examId: exam.id,
            name: 'Part A',
            maxMarks: 50,
            sequence: 1,
            requiredQuestions: 5
        }
    });

    // Create 5 questions, mapping to available COs cyclically
    const questions = [];
    for (let i = 0; i < 5; i++) {
        const co = subject.courseOutcomes[i % subject.courseOutcomes.length];
        const q = await prisma.question.create({
            data: {
                sectionId: section.id,
                sequence: i + 1,
                maxMarks: 10,
                coId: co?.id,
                bloomLevel: BloomLevel.Apply // Simplified
            }
        });
        questions.push({ ...q, co });
    }
    console.log(`Created ${questions.length} questions.`);

    // 4. Get Students
    const enrollments = await prisma.studentEnrollment.findMany({
        where: { cohortId: cohort.id },
        include: { student: true }
    });
    console.log(`Found ${enrollments.length} enrolled students.`);

    // 5. Generate Marks & Compute
    for (const enrollment of enrollments) {
        const studentId = enrollment.studentId;
        let totalMarks = 0;

        for (const q of questions) {
            // Random marks between 5 and 10
            const marks = Math.floor(Math.random() * 6) + 5;

            // Need a subquestion? Schema says StudentMark links to SubQuestion.
            // Oh, wait. Schema: StudentMark -> SubQuestion. 
            // My Question creation didn't create subquestions.
            // I need to create a default subquestion for each question.
        }
    }

    // Fix: Create SubQuestions first!
    const subQuestions = [];
    for (const q of questions) {
        const sq = await prisma.subQuestion.create({
            data: {
                questionId: q.id,
                label: 'a',
                maxMarks: q.maxMarks,
                coId: q.coId,
                bloomLevel: q.bloomLevel
            }
        });
        subQuestions.push({ ...sq, parentQ: q });
    }

    // Now loop students
    const computedMarksData = [];

    for (const enrollment of enrollments) {
        const studentId = enrollment.studentId;
        let studentTotal = 0;

        for (const sq of subQuestions) {
            const marks = Math.floor(Math.random() * (sq.maxMarks - 4)) + 4; // 4 to max
            studentTotal += marks;

            await prisma.studentMark.create({
                data: {
                    examId: exam.id,
                    studentId,
                    subQuestionId: sq.id,
                    marks: marks
                }
            });
        }

        // Create ComputedMarks
        await prisma.marksComputed.create({
            data: {
                examId: exam.id,
                studentId,
                totalMarks: studentTotal,
                selectedQuestions: {} // Dummy
            }
        });
    }
    console.log('Marks generated and computed.');

    // 6. Calculate CO Attainment
    // Simple logic: For each CO, avg student % for questions mapped to that CO.
    // Group subQuestions by CO
    const coMap = new Map(); // coId -> count, totalPercent

    // Actually, we need to iterate ALL marks to compute attainment accurately per CO.
    // For simplicity in this script:
    // Fetch all marks for this exam.
    const allMarks = await prisma.studentMark.findMany({
        where: { examId: exam.id },
        include: { subQuestion: true }
    });

    const coStats: Record<string, { totalPercent: number; count: number }> = {}; // coId: { totalPercent: 0, count: 0 }

    for (const mark of allMarks) {
        const coId = mark.subQuestion.coId;
        if (coId) {
            if (!coStats[coId]) coStats[coId] = { totalPercent: 0, count: 0 };
            const percent = (Number(mark.marks) / mark.subQuestion.maxMarks) * 100;
            coStats[coId].totalPercent += percent;
            coStats[coId].count++;
        }
    }

    // Upsert CO Attainment
    for (const coId of Object.keys(coStats)) {
        const stat = coStats[coId];
        const achievedAvg = stat.totalPercent / stat.count;

        await prisma.cOAttainment.create({
            data: {
                subjectId: subject.id,
                cohortId: cohort.id,
                coId: coId,
                semester: 1,
                academicYear: '2024',
                targetPercent: 60,
                achievedPercent: achievedAvg,
                studentCount: enrollments.length
            }
        });
    }
    console.log('CO Attainment calculated.');
}

seed()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
