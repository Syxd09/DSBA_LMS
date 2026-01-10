/**
 * Script 3: Cross-reference frontend API calls with backend routes
 * Identifies missing endpoints and mismatches
 */

const fs = require('fs');

const frontendCalls = JSON.parse(fs.readFileSync('d:\\outcome-master\\backend\\scripts\\audit-frontend-api-calls.json', 'utf8'));
const backendRoutes = JSON.parse(fs.readFileSync('d:\\outcome-master\\backend\\scripts\\audit-backend-routes.json', 'utf8'));

console.log('🔍 Cross-referencing frontend API calls with backend routes...\n');

const missingEndpoints = [];
const matchedEndpoints = [];

frontendCalls.forEach(call => {
    // Normalize endpoint (remove query params, replace :params)
    let normalizedEndpoint = call.endpoint.split('?')[0].split('$')[0];

    // Add /api prefix if frontend call doesn't have it
    if (!normalizedEndpoint.startsWith('/api/')) {
        normalizedEndpoint = '/api' + normalizedEndpoint;
    }

    // Try to match with backend routes
    const found = backendRoutes.some(route => {
        if (route.method !== call.method) return false;

        // Exact match
        if (route.endpoint === normalizedEndpoint) return true;

        // Parameter match (e.g., /api/users/:id matches /api/users/123)
        const routeParts = route.endpoint.split('/');
        const callParts = normalizedEndpoint.split('/');

        if (routeParts.length !== callParts.length) return false;

        return routeParts.every((part, i) => {
            if (part.startsWith(':')) return true; // Parameter placeholder
            return part === callParts[i];
        });
    });

    if (found) {
        matchedEndpoints.push(call);
    } else {
        missingEndpoints.push(call);
    }
});

console.log(`✅ Matched: ${matchedEndpoints.length} endpoints`);
console.log(`❌ Missing: ${missingEndpoints.length} endpoints\n`);

if (missingEndpoints.length > 0) {
    console.log('⚠️  MISSING BACKEND ENDPOINTS:');
    console.log('='.repeat(100));
    console.log('Method | Endpoint | Called From');
    console.log('-'.repeat(100));

    missingEndpoints.forEach(call => {
        console.log(`${call.method.padEnd(7)} | ${call.endpoint.padEnd(50)} | ${call.file}`);
    });
}

// Save results
const report = {
    summary: {
        totalFrontendCalls: frontendCalls.length,
        totalBackendRoutes: backendRoutes.length,
        matched: matchedEndpoints.length,
        missing: missingEndpoints.length
    },
    missingEndpoints,
    matchedEndpoints
};

fs.writeFileSync(
    'd:\\outcome-master\\backend\\scripts\\audit-3-mismatch-report.json',
    JSON.stringify(report, null, 2)
);

console.log('\n✅ Full report saved to: backend/scripts/audit-3-mismatch-report.json');
