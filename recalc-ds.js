// Find and recalculate Data Structures exam
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZWYwYzIyMC05MTc3LTQ1ZTMtYmYzNC05NTM0ZDgzZWE4NzQiLCJyb2xlIjoiVEVBQ0hFUiIsImVtYWlsIjoidGVhY2hlcjEuY3NlQGNvbGxlZ2UuZWR1IiwiZGVwYXJ0bWVudElkIjoiMGQ4NjI1ZWYtMGQyMi00OWM5LTk5ODctODY5ZGY5NzA4NzM3IiwiaWF0IjoxNzY3NTI5NjA1LCJleHAiOjE3Njc2MTYwMDV9.bQtFoTf63hcDcaj87tGGYuj7POP4anAMmZaohnalZMo';

async function recalculateDS() {
    // Get all exams
    const examsRes = await fetch('http://localhost:3000/api/exams', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const exams = await examsRes.json();

    console.log('\n=== ALL EXAMS ===');
    exams.forEach(e => {
        console.log(`${e.id}`);
        console.log(`  Subject: ${e.subject.name}`);
        console.log(`  Status: ${e.status}`);
        console.log(`  Type: ${e.examType || e.exam_type}`);
        console.log('');
    });

    // Find Data Structures exam
    const dsExam = exams.find(e =>
        e.subject.name.toLowerCase().includes('data') ||
        e.subject.name.toLowerCase().includes('structure')
    );

    if (!dsExam) {
        console.log(' No Data Structures exam found!');
        return;
    }

    console.log(`\n Found Data Structures exam: ${dsExam.id}`);
    console.log(`   Subject: ${dsExam.subject.name}`);
    console.log(`   Status: ${dsExam.status}`);

    if (dsExam.status !== 'PUBLISHED') {
        console.log('\n  Exam is not published! Status:', dsExam.status);
        console.log('   Please publish the exam first.');
        return;
    }

    // Trigger recalculation
    console.log('\n Triggering recalculation...');
    const recalcRes = await fetch(`http://localhost:3000/api/exams/${dsExam.id}/recalculate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await recalcRes.json();
    console.log('\n RESULT:');
    console.log(JSON.stringify(result, null, 2));
}

recalculateDS().catch(console.error);
