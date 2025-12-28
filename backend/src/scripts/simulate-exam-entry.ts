
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function main() {
    try {
        console.log('🚀 Starting Exam & Marks Entry Simulation...');

        // 1. Login
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'teacher.a@test.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('✅ Logged in as Teacher A');

        // 2. Get Assignment
        const assignmentsRes = await axios.get(`${BASE_URL}/assignments`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : assignmentsRes.data.data;
        const assignment = assignments.find((a: any) => a.subject.name === 'Computer Networks');

        if (!assignment) throw new Error('Assignment not found');
        console.log(`✅ Found Assignment: ${assignment.subject.name}`);

        // 3. Create OR Fetch Exam
        let examId;
        try {
            console.log('Attempting to create exam...');
            const examRes = await axios.post(`${BASE_URL}/exams`, {
                subjectId: assignment.subjectId,
                cohortId: assignment.cohortId,
                examType: 'Internal 1',
                maxMarks: 50
            }, { headers: { Authorization: `Bearer ${token}` } });
            examId = examRes.data.id;
            console.log(`✅ Exam Created: ID ${examId}`);
        } catch (e: any) {
            console.log('⚠️ Exam creation failed. Fetching existing...');
            const existingExamsRes = await axios.get(`${BASE_URL}/exams?subjectId=${assignment.subjectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const existing = existingExamsRes.data.find((ex: any) => ex.examType === 'Internal 1' && ex.cohortId === assignment.cohortId);
            if (existing) {
                examId = existing.id;
                console.log(`✅ Found Existing Exam: ID ${examId}`);
            } else {
                throw new Error('Could not find existing exam. Error: ' + e.message);
            }
        }

        // 4. Update Structure
        console.log('Updating structure with Correct Endpoint (POST)...');
        const coRes = await axios.get(`${BASE_URL}/course-outcomes?subjectId=${assignment.subjectId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const co1 = coRes.data[0];

        // USE POST for structure update as per exams.routes.ts
        await axios.post(`${BASE_URL}/exams/${examId}/structure`, {
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
        console.log('✅ Exam Structure Updated');

        // 5. Enter Marks
        console.log('Fetching students...');
        const studentsRes = await axios.get(`${BASE_URL}/enrollments?cohortId=${assignment.cohortId}&limit=100`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const students = studentsRes.data.data || studentsRes.data;
        console.log(`✅ Found ${students.length} Students to grade`);

        const updatedExam = await axios.get(`${BASE_URL}/exams/${examId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        let subQuestionId;
        if (updatedExam.data.sections && updatedExam.data.sections[0].questions[0].subQuestions) {
            subQuestionId = updatedExam.data.sections[0].questions[0].subQuestions[0].id;
        } else {
            console.log("Structure:", JSON.stringify(updatedExam.data.sections, null, 2));
            throw new Error('Exam structure mismatch, cannot find subQuestionId');
        }

        const marksData = students.map((s: any) => ({
            studentId: s.studentId,
            subQuestionId: subQuestionId,
            marks: 8
        }));

        console.log('Saving marks (Correct Endpoint POST /marks/save)...');
        await axios.post(`${BASE_URL}/marks/save`, {
            examId: examId,
            marks: marksData
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Marks Saved Successfully');

    } catch (error: any) {
        console.error('❌ Error details:', error.response?.data || error.message);
        process.exit(1);
    }
}

main();
