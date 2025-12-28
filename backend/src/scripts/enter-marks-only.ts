
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function main() {
    try {
        console.log('🚀 Entering Marks Only...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'teacher.a@test.com',
            password: 'password123'
        });
        const token = loginRes.data.token;

        // Find Assignment
        const assignmentsRes = await axios.get(`${BASE_URL}/assignments`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const assignments = assignmentsRes.data.data || assignmentsRes.data;
        const assignment = assignments.find((a: any) => a.subject.name === 'Computer Networks');
        if (!assignment) throw new Error('Assignment not found');

        // Find Exam
        const examsRes = await axios.get(`${BASE_URL}/exams?subjectId=${assignment.subjectId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const exam = examsRes.data.find((ex: any) => ex.examType === 'Internal 1');
        if (!exam) throw new Error('Exam Internal 1 not found for this subject');

        console.log(`✅ Found Exam: ${exam.id}`);

        // Update Structure (Idempotent-ish check?)
        // Assuming structure exists or update it
        // We need structure to get SubQuestionID
        const updatedExam = await axios.get(`${BASE_URL}/exams/${exam.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // If no sections, update structure
        if (!updatedExam.data.sections || updatedExam.data.sections.length === 0) {
            console.log('Structure missing, updating...');
            // Fetch CO
            const coRes = await axios.get(`${BASE_URL}/course-outcomes/subject/${assignment.subjectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const co1 = coRes.data[0];

            await axios.put(`${BASE_URL}/exams/${exam.id}/structure`, {
                sections: [{
                    name: 'Part A',
                    sequence: 1,
                    maxMarks: 10,
                    questions: [{
                        sequence: 1,
                        maxMarks: 10,
                        bloomLevel: 'Apply',
                        coId: co1 ? co1.id : undefined,
                        subQuestions: [{
                            label: 'a',
                            maxMarks: 10,
                            bloomLevel: 'Apply',
                            coId: co1 ? co1.id : undefined
                        }]
                    }]
                }]
            }, { headers: { Authorization: `Bearer ${token}` } });
            console.log('✅ Structure Created');
        }

        // Fetch Exam Again to get IDs
        const finalExam = await axios.get(`${BASE_URL}/exams/${exam.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const subQuestionId = finalExam.data.sections[0].questions[0].subQuestions[0].id;

        // Fetch Students
        const studentsRes = await axios.get(`${BASE_URL}/enrollments?cohortId=${assignment.cohortId}&limit=100`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const students = studentsRes.data.data || studentsRes.data;
        console.log(`✅ Found ${students.length} Students`);

        const marksData = students.map((s: any) => ({
            studentId: s.studentId,
            subQuestionId: subQuestionId,
            marks: 8
        }));

        await axios.post(`${BASE_URL}/marks/save-batch`, {
            examId: exam.id,
            marks: marksData
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Marks Saved Successfully for ' + students.length + ' students.');

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}
main();
