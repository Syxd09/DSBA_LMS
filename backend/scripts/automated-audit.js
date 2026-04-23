const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..', 'src');
const FRONTEND_ROOT = path.join(__dirname, '..', '..', 'src');

/**
 * Deep scan for a pattern and report locations
 */
function scanDir(dir, extension, pattern, exclude = []) {
    const results = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (exclude.some(ex => fullPath.includes(ex))) continue;

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results.push(...scanDir(fullPath, extension, pattern, exclude));
        } else if (file.endsWith(extension)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (pattern.test(content)) {
                results.push({
                    file: fullPath,
                    matches: content.match(pattern).length
                });
            }
        }
    }
    return results;
}

console.log('🔍 Starting Automated Code Audit...');

// 1. Check for Unprotected Routes in backend
console.log('\n--- Route Protection Audit ---');
const routesDir = path.join(BACKEND_ROOT, 'routes');
const unprotectedRoutes = [];
fs.readdirSync(routesDir).forEach(file => {
    if (file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
        // Find lines with http methods but no authenticateToken or requireRole
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (/\.(get|post|put|delete|patch)\(/.test(line) && 
                !/authenticateToken|requireRole|requireOwnershipOrRole|public/.test(line)) {
                unprotectedRoutes.push(`${file}:${idx + 1} -> ${line.trim()}`);
            }
        });
    }
});

if (unprotectedRoutes.length > 0) {
    console.log('⚠️ Found potential unprotected routes:');
    unprotectedRoutes.forEach(r => console.log('  ', r));
} else {
    console.log('✅ All analyzed routes seem protected.');
}

// 2. Check for Missing Error Handling in controllers
console.log('\n--- Error Handling Audit ---');
const controllersDir = path.join(BACKEND_ROOT, 'controllers');
const missingTryCatch = [];
fs.readdirSync(controllersDir).forEach(file => {
    if (file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
        const exports = content.match(/export const (\w+) = async/g) || [];
        exports.forEach(exp => {
            const funcName = exp.match(/export const (\w+)/)[1];
            // Naive check: does the function body contain 'catch'?
            // This is simplified but effective for quick audit
            const funcBody = content.split(exp)[1].split('export const')[0];
            if (!/catch\s*\(/.test(funcBody)) {
                missingTryCatch.push(`${file}: ${funcName}`);
            }
        });
    }
});

if (missingTryCatch.length > 0) {
    console.log('⚠️ Found controllers missing catch blocks:');
    missingTryCatch.forEach(m => console.log('  ', m));
} else {
    console.log('✅ All exported controllers have catch blocks.');
}

// 3. Check for Hardcoded Academic Years
console.log('\n--- Hardcoded Config Audit ---');
const hardcodedYears = scanDir(BACKEND_ROOT, '.ts', /'2025-26'|"2025-26"/);
if (hardcodedYears.length > 0) {
    console.log('⚠️ Found hardcoded academic years ("2025-26"):');
    hardcodedYears.forEach(h => console.log('  ', h.file));
}

// 4. API Consistency Check (Frontend vs Backend)
console.log('\n--- API Consistency Audit ---');
const backendRoutePatterns = [];
fs.readdirSync(routesDir).forEach(file => {
    if (file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
        const matches = content.match(/\.(get|post|put|delete|patch)\(['"](.*?)['"]/g) || [];
        matches.forEach(m => {
            const endpoint = m.split("('")[1] || m.split('("')[1];
            if (endpoint) backendRoutePatterns.push(endpoint.replace(/['"]/, ''));
        });
    }
});

console.log(`✅ Identified ${backendRoutePatterns.length} backend endpoints.`);

const frontendServiceCalls = scanDir(FRONTEND_ROOT, '.tsx', /api\.(get|post|put|delete|patch)\(['"](.*?)['"]/);
console.log(`✅ Identified ${frontendServiceCalls.length} frontend files making API calls.`);

// 5. Database Transaction Safety Audit
console.log('\n--- DB Transaction Audit ---');
const multiactions = scanDir(controllersDir, '.ts', /prisma\.\w+\.(create|update|delete)/);
const missingTransactions = [];
multiactions.forEach(item => {
    const content = fs.readFileSync(item.file, 'utf8');
    // If a file has multiple mutations but no $transaction
    if ((content.match(/prisma\.\w+\.(create|update|delete)/g) || []).length > 2 && !/\$transaction/.test(content)) {
        missingTransactions.push(item.file);
    }
});

if (missingTransactions.length > 0) {
    console.log('⚠️ Found files with multiple DB operations potentially missing transactions:');
    missingTransactions.forEach(m => console.log('  ', m));
} else {
    console.log('✅ Multiple DB operations seem atomic or transactional where critical.');
}

console.log('\n--- Audit Complete ---');
