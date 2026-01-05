// Recalculate ALL published exams using Principal token
const principalToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3YzMyZDNiNi00M2Q3LTQ5M2QtOTUxYi1mYjc1MTk2YTZhNDgiLCJyb2xlIjoiUFJJTkNJUEFMIiwiaWF0IjoxNzY3NjAxMzI2LCJleHAiOjE3Njc2ODc3MjZ9.FVKNQWqYu4zQZJ8NxDmV-HKZ_pC2VfUe1_N0HI2V3Hc';

async function recalculateAll() {
    console.log('🔍 Fetching ALL published exams as Principal...\n');

    const res = await fetch('http://localhost:3000/api/exams', {
        headers: { 'Authorization': `Bearer ${principalToken}` }
    });

    if (!res.ok) {
        console.log('❌ Failed to fetch exams:', await res.text());
        return;
    }

    const exams = await res.json();
    const publishedExams = exams.filter(e => e.status === 'PUBLISHED');

    console.log(`Found ${publishedExams.length} published exam(s):\n`);
    publishedExams.forEach(e => {
        console.log(`  📝 ${e.subject.name} (${e.subject.code})`);
        console.log(`     ID: ${e.id}`);
        console.log(`     Type: ${e.examType || e.exam_type}`);
        console.log('');
    });

    for (const exam of publishedExams) {
        console.log(`\n🔄 Recalculating: ${exam.subject.name}...`);

        const recalcRes = await fetch(`http://localhost:3000/api/exams/${exam.id}/recalculate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${principalToken}` }
        });

        const result = await recalcRes.json();

        if (recalcRes.ok) {
            console.log(`   ✅ Success! CO: ${result.results.coAttainments}, PO: ${result.results.poAttainments}`);
        } else {
            console.log(`   ❌ Failed:`, result.message);
        }
    }

    console.log('\n\n🎉 Done! Refresh your CO-PO Analytics page now!');
}

recalculateAll().catch(console.error);
