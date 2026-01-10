/**
 * Script 1: Find all API calls in frontend
 * Extracts all axios API calls to cross-reference with backend routes
 */

const fs = require('fs');
const path = require('path');

const apiCalls = new Set();
const fileIssues = [];

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
            scanDirectory(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            scanFile(fullPath);
        }
    });
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative('d:\\outcome-master\\src', filePath);

    // Match api.get/post/put/delete/patch calls
    const apiRegex = /api\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = apiRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const endpoint = match[2];

        apiCalls.add(JSON.stringify({
            method,
            endpoint,
            file: relativePath
        }));
    }
}

console.log('🔍 Scanning frontend for API calls...\n');
scanDirectory('d:\\outcome-master\\src');

const calls = Array.from(apiCalls).map(JSON.parse).sort((a, b) => a.endpoint.localeCompare(b.endpoint));

console.log(`📊 Found ${calls.length} unique API calls:\n`);
console.log('Method | Endpoint | File');
console.log('-'.repeat(100));

calls.forEach(call => {
    console.log(`${call.method.padEnd(7)} | ${call.endpoint.padEnd(50)} | ${call.file}`);
});

// Write to file for analysis
fs.writeFileSync(
    'd:\\outcome-master\\backend\\scripts\\audit-frontend-api-calls.json',
    JSON.stringify(calls, null, 2)
);

console.log('\n✅ Results saved to: backend/scripts/audit-frontend-api-calls.json');
