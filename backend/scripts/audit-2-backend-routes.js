/**
 * Script 2: Find all backend route definitions
 * Maps all express routes to compare with frontend
 */

const fs = require('fs');
const path = require('path');

const routes = [];

function scanRoutes(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        if (file.endsWith('.routes.ts')) {
            scanRouteFile(path.join(dir, file));
        }
    });
}

function scanRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    // Extract route prefix from app.ts mounting
    const routeFileMap = {
        'auth.routes.ts': '/api/auth',
        'users.routes.ts': '/api/users',
        'departments.routes.ts': '/api/departments',
        'programs.routes.ts': '/api/programs',
        'cohorts.routes.ts': '/api/cohorts',
        'subjects.routes.ts': '/api/subjects',
        'enrollments.routes.ts': '/api/enrollments',
        'exams.routes.ts': '/api/exams',
        'marks.routes.ts': '/api/marks',
        'course-outcomes.routes.ts': '/api/course-outcomes',
        'program-outcomes.routes.ts': '/api/program-outcomes',
        'attainment.routes.ts': '/api/attainment',
        'po-attainment.routes.ts': '/api/po-attainment',
        'analytics.routes.ts': '/api/analytics',
        'audit-logs.routes.ts': '/api/audit-logs',
        'feedback.routes.ts': '/api/feedback',
        'assignments.routes.ts': '/api/assignments',
        'grading.routes.ts': '/api/grading',
        'results.routes.ts': '/api/results',
        'timeline.routes.ts': '/api/timeline',
        'system.routes.ts': '/api/system',
        'marks-unlock.routes.ts': '/api/marks-unlock',
        'approvals.routes.ts': '/api/approvals'
    };

    const baseRoute = routeFileMap[fileName] || '/api/unknown';

    // Match router.get/post/put/delete/patch
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let endpoint = match[2];

        // Construct full endpoint
        if (endpoint === '/') {
            endpoint = baseRoute;
        } else {
            endpoint = baseRoute + endpoint;
        }

        routes.push({
            method,
            endpoint,
            file: fileName
        });
    }
}

console.log('🔍 Scanning backend for route definitions...\n');
scanRoutes('d:\\outcome-master\\backend\\src\\routes');

routes.sort((a, b) => a.endpoint.localeCompare(b.endpoint));

console.log(`📊 Found ${routes.length} backend routes:\n`);
console.log('Method | Endpoint | File');
console.log('-'.repeat(100));

routes.forEach(route => {
    console.log(`${route.method.padEnd(7)} | ${route.endpoint.padEnd(50)} | ${route.file}`);
});

// Write to file
fs.writeFileSync(
    'd:\\outcome-master\\backend\\scripts\\audit-backend-routes.json',
    JSON.stringify(routes, null, 2)
);

console.log('\n✅ Results saved to: backend/scripts/audit-backend-routes.json');
