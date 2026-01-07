const fs = require('fs');
const path = require('path');

// Script to extract all API endpoints from frontend and backend

const results = {
    frontend: [],
    backend: [],
    mismatches: []
};

// Extract frontend API calls
function extractFrontendAPIs(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    files.forEach(file => {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            extractFrontendAPIs(fullPath);
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');

            // Match API calls: api.get('/path'), api.post('/path'), etc.
            const apiRegex = /api\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
            let match;

            while ((match = apiRegex.exec(content)) !== null) {
                const method = match[1].toUpperCase();
                const endpoint = match[2];

                results.frontend.push({
                    method,
                    endpoint,
                    file: fullPath.replace(process.cwd() + '\\', '')
                });
            }
        }
    });
}

// Extract backend route definitions
function extractBackendRoutes(routeFile) {
    const content = fs.readFileSync(routeFile, 'utf8');
    const fileName = path.basename(routeFile);

    // Match router.get('/path', ...), router.post('/path', ...), etc.
    const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const endpoint = match[2];

        results.backend.push({
            method,
            endpoint,
            file: fileName
        });
    }
}

// Main execution
console.log('🔍 Starting API Endpoint Analysis...\\n');

// Extract frontend APIs
console.log('📱 Scanning frontend...');
extractFrontendAPIs(path.join(process.cwd(), 'src'));
console.log(`   Found ${results.frontend.length} frontend API calls\\n`);

// Extract backend routes
console.log('⚙️  Scanning backend routes...');
const routesDir = path.join(process.cwd(), 'backend', 'src', 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.ts'));

routeFiles.forEach(file => {
    extractBackendRoutes(path.join(routesDir, file));
});
console.log(`   Found ${results.backend.length} backend routes\\n`);

// Read app.ts to get route prefixes
const appContent = fs.readFileSync(path.join(process.cwd(), 'backend', 'src', 'app.ts'), 'utf8');
const prefixRegex = /app\.use\(['"`]\/api\/([^'"`]+)['"`],\s*(\w+Routes)/g;
const prefixes = {};

let prefixMatch;
while ((prefixMatch = prefixRegex.exec(appContent)) !== null) {
    const prefix = prefixMatch[1];
    const routeVar = prefixMatch[2];
    prefixes[routeVar] = '/' + prefix;
}

// Map route variable names to prefixes
const routeFileToPrefix = {
    'auth.routes.ts': '/auth',
    'exams.routes.ts': '/exams',
    'marks.routes.ts': '/marks',
    'assignments.routes.ts': '/assignments',
    'enrollments.routes.ts': '/enrollments',
    'grading.routes.ts': '/grading',
    'analytics.routes.ts': '/analytics',
    'approvals.routes.ts': '/approvals',
    'feedback.routes.ts': '/feedback',
    'messaging.routes.ts': '/messaging',
    'departments.routes.ts': '/departments',
    'programs.routes.ts': '/programs',
    'subjects.routes.ts': '/subjects',
    'users.routes.ts': '/users',
    'cohorts.routes.ts': '/cohorts',
    'course-outcomes.routes.ts': '/course-outcomes',
    'audit-logs.routes.ts': '/audit-logs',
    'results.routes.ts': '/results',
    'curriculum-versions.routes.ts': '/curriculum-versions',
    'system.routes.ts': '/system',
    'attainment.routes.ts': '/attainment',
    'po-attainment.routes.ts': '/po-attainment',
    'marks-unlock.routes.ts': '/marks-unlock',
    'program-outcomes.routes.ts': '/program-outcomes',
    'feedback-template.routes.ts': '/feedback-template',
    'teacher-feedback.routes.ts': '/teacher-feedback',
    'feedback-analytics.routes.ts': '/feedback-analytics',
    'bulk.routes.ts': '/bulk',
    'timeline.routes.ts': '/timeline'
};

// Add full paths to backend routes
results.backend = results.backend.map(route => {
    const prefix = routeFileToPrefix[route.file] || '';
    return {
        ...route,
        fullPath: '/api' + prefix + route.endpoint
    };
});

// Find mismatches
console.log('🔎 Cross-referencing...\\n');

// Frontend endpoints not in backend
results.frontend.forEach(fe => {
    const found = results.backend.some(be =>
        be.method === fe.method &&
        (be.fullPath === fe.endpoint || be.fullPath === '/api' + fe.endpoint)
    );

    if (!found) {
        results.mismatches.push({
            type: 'MISSING_BACKEND',
            method: fe.method,
            endpoint: fe.endpoint,
            usedIn: fe.file
        });
    }
});

// Generate report
const report = {
    summary: {
        frontendAPICalls: results.frontend.length,
        backendRoutes: results.backend.length,
        missingBackendEndpoints: results.mismatches.filter(m => m.type === 'MISSING_BACKEND').length
    },
    missingBackendEndpoints: results.mismatches.filter(m => m.type === 'MISSING_BACKEND'),
    allFrontendAPIs: results.frontend,
    allBackendRoutes: results.backend
};

// Write report
fs.writeFileSync(
    path.join(process.cwd(), 'api-audit-report.json'),
    JSON.stringify(report, null, 2)
);

console.log('📊 SUMMARY');
console.log('==========================================');
console.log(`Frontend API Calls:        ${report.summary.frontendAPICalls}`);
console.log(`Backend Routes:            ${report.summary.backendRoutes}`);
console.log(`Missing Backend Endpoints: ${report.summary.missingBackendEndpoints}`);
console.log('\\n✅ Report saved to: api-audit-report.json\\n');

// Show top 10 missing endpoints
if (report.missingBackendEndpoints.length > 0) {
    console.log('⚠️  TOP MISSING BACKEND ENDPOINTS:');
    console.log('==========================================');
    report.missingBackendEndpoints.slice(0, 10).forEach((m, i) => {
        console.log(`${i + 1}. ${m.method} ${m.endpoint}`);
        console.log(`   Used in: ${m.usedIn}\\n`);
    });
}
