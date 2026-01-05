// Find CS23 Data Structures exam and recalculate
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZWYwYzIyMC05MTc3LTQ1ZTMtYmYzNC05NTM0ZDgzZWE4NzQiLCJyb2xlIjoiVEVBQ0hFUiIsImVtYWlsIjoidGVhY2hlcjEuY3NlQGNvbGxlZ2UuZWR1IiwiZGVwYXJ0bWVudElkIjoiMGQ4NjI1ZWYtMGQyMi00OWM5LTk5ODctODY5ZGY5NzA4NzM3IiwiaWF0IjoxNzY3NTI5NjA1LCJleHAiOjE3Njc2MTYwMDV9.bQtFoTf63hcDcaj87tGGYuj7POP4anAMmZaohnalZMo';

async function findAndRecalculate() {
    const res = await fetch('http://localhost:3000/api/exams', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const exams = await res.json();

    console.log('\n=== SEARCHING FOR CS23 DATA STRUCTURES ===\n');

    const dsExam = exams.find(e =>
        e.subject?.code === 'CS23' ||
        e.subject?.name?.toLowerCase().includes('data') ||
        e.subject?.name?.toLowerCase().includes('structure')
    );

    if (!dsExam) {
        console.log('All exams found:');
        exams.forEach(e => console.log(`  - ${e.subject?.name} (${e.subject?.code}) - ${e.status}`));
        console.log('\n❌ CS23 Data Structures exam not found in API response');
        return;
    }

    console.log('✅ FOUND EXAM:');
    console.log(`   ID: ${dsExam.id}`);
    console.log(`   Subject: ${dsExam.subject.name} (${dsExam.subject.code})`);
    console.log(`   Status: ${dsExam.status}`);
    console.log(`   Max Marks: ${dsExam.maxMarks || dsExam.max_marks}`);

    if (dsExam.status !== 'PUBLISHED') {
        console.log(`\n⚠️  Status is ${dsExam.status}, not PUBLISHED!`);
        return;
    }

    console.log('\n🔄 Triggering CO-PO recalculation...\n');

    const recalcRes = await fetch(`http://localhost:3000/api/exams/${dsExam.id}/recalculate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await recalcRes.json();

    if (recalcRes.ok) {
        console.log('✅ SUCCESS!');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n📊 Now refresh your CO-PO Analytics page to see the data!');
    } else {
        console.log('❌ ERROR:');
        console.log(JSON.stringify(result, null, 2));
    }
}

findAndRecalculate().catch(console.error);
