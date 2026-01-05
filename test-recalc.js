// Quick test to call recalculation endpoint
const examId = '5fb99d2e-4263-4274-8f26-4406cd6d8fb9';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZWYwYzIyMC05MTc3LTQ1ZTMtYmYzNC05NTM0ZDgzZWE4NzQiLCJyb2xlIjoiVEVBQ0hFUiIsImVtYWlsIjoidGVhY2hlcjEuY3NlQGNvbGxlZ2UuZWR1IiwiZGVwYXJ0bWVudElkIjoiMGQ4NjI1ZWYtMGQyMi00OWM5LTk5ODctODY5ZGY5NzA4NzM3IiwiaWF0IjoxNzY3NTI5NjA1LCJleHAiOjE3Njc2MTYwMDV9.bQtFoTf63hcDcaj87tGGYuj7POP4anAMmZaohnalZMo';

fetch(`http://localhost:3000/api/exams/${examId}/recalculate`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
    .then(res => res.json())
    .then(data => {
        console.log('\n=== RECALCULATION RESULT ===');
        console.log(JSON.stringify(data, null, 2));
    })
    .catch(error => {
        console.error('\n=== ERROR ===');
        console.error(error.message);
    });
