
const axios = require('axios');

async function verifySystemIntegrity() {
    console.log('🔍 Starting Final System Integrity Check...');
    
    // We assume the local dev server is running
    const API_URL = 'http://localhost:3000/api';
    
    // Mock token or logic would go here if we were running outside.
    // For now, let's just check if the new routes exist in the source.
    
    const fs = require('fs');
    const path = require('path');
    
    const backendRoot = 'd:/outcome-master 1/backend/src';
    const routesPath = path.join(backendRoot, 'app.ts');
    
    console.log('\n--- Route Verification ---');
    if (fs.existsSync(routesPath)) {
        const content = fs.readFileSync(routesPath, 'utf8');
        const expectedRoutes = [
            '/api/attendance',
            '/api/reports',
            '/api/audit-logs'
        ];
        
        expectedRoutes.forEach(route => {
            if (content.includes(route)) {
                console.log(`✅ Route Registered: ${route}`);
            } else {
                console.log(`❌ Route Missing: ${route}`);
            }
        });
    }

    console.log('\n--- Controller Verification ---');
    const controllers = [
        'attendance.controller.ts',
        'reporting.controller.ts',
        'audit.controller.ts'
    ];
    
    controllers.forEach(ctrl => {
        const ctrlPath = path.join(backendRoot, 'controllers', ctrl);
        if (fs.existsSync(ctrlPath)) {
            console.log(`✅ Controller Exists: ${ctrl}`);
        } else {
            console.log(`❌ Controller Missing: ${ctrl}`);
        }
    });

    console.log('\n--- Frontend verification ---');
    const pages = [
        'Attendance.tsx',
        'Reports.tsx',
        'AuditLogs.tsx'
    ];
    
    const frontendRoot = 'd:/outcome-master 1/src/pages';
    pages.forEach(page => {
        const pagePath = path.join(frontendRoot, page);
        if (fs.existsSync(pagePath)) {
            console.log(`✅ Page Exists: ${page}`);
        } else {
            console.log(`❌ Page Missing: ${page}`);
        }
    });

    console.log('\n🚀 Integrity Check Complete.');
}

verifySystemIntegrity().catch(console.error);
