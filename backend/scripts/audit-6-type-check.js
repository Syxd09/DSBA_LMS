/**
 * Script 6: Type Consistency Validation
 * Checks for type mismatches between frontend and backend
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Phase 4: Type Consistency Validation\n');

const typeIssues = [];

// Extract TypeScript interfaces from frontend
function extractInterfaces(dir, interfaces = {}) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.includes('node_modules')) {
            extractInterfaces(fullPath, interfaces);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');

            // Match interface definitions
            const interfaceRegex = /interface\s+(\w+)\s*{([^}]+)}/g;
            let match;

            while ((match = interfaceRegex.exec(content)) !== null) {
                const name = match[1];
                const body = match[2];

                // Extract fields
                const fields = [];
                const fieldRegex = /(\w+)(\?)?:\s*([^;]+);/g;
                let fieldMatch;

                while ((fieldMatch = fieldRegex.exec(body)) !== null) {
                    fields.push({
                        name: fieldMatch[1],
                        optional: !!fieldMatch[2],
                        type: fieldMatch[3].trim()
                    });
                }

                if (!interfaces[name]) {
                    interfaces[name] = {
                        file: path.relative('d:\\outcome-master\\src', fullPath),
                        fields
                    };
                }
            }
        }
    });

    return interfaces;
}

// Check 1: Extract frontend types
console.log('📋 Check 1: Extracting frontend TypeScript interfaces...');

const frontendInterfaces = extractInterfaces('d:\\outcome-master\\src');

console.log(`  Found ${Object.keys(frontendInterfaces).length} interfaces`);

// Check 2: Common type mismatches
console.log('\n📋 Check 2: Checking for common type issues...');

// Check for Date vs string mismatches
Object.entries(frontendInterfaces).forEach(([name, def]) => {
    def.fields.forEach(field => {
        // Date fields that might be strings
        if (field.name.includes('date') || field.name.includes('Date') ||
            field.name.includes('At') || field.name === 'timestamp') {

            if (field.type === 'string') {
                typeIssues.push({
                    severity: 'INFO',
                    interface: name,
                    field: field.name,
                    issue: `Date field typed as 'string' - should be 'Date' or 'string' with clarification`,
                    category: 'Date Handling'
                });
            }
        }

        //  Snake_case vs camelCase
        if (field.name.includes('_')) {
            typeIssues.push({
                severity: 'WARNING',
                interface: name,
                field: field.name,
                issue: `Field uses snake_case instead of camelCase - API mismatch likely`,
                category: 'Naming Convention'
            });
        }

        // Check for 'any' type usage
        if (field.type === 'any') {
            typeIssues.push({
                severity: 'WARNING',
                interface: name,
                field: field.name,
                issue: `Field typed as 'any' - lose type safety`,
                category: 'Type Safety'
            });
        }
    });
});

console.log(`  Found ${typeIssues.length} type issues`);

// Check 3: API response type consistency
console.log('\n📋 Check 3: Checking API response types...');

// Check api.types.ts for consistency
const apiTypesFile = 'd:\\outcome-master\\src\\types\\api.types.ts';
if (fs.existsSync(apiTypesFile)) {
    const content = fs.readFileSync(apiTypesFile, 'utf8');

    // Check for common issues
    if (!content.includes('Exam') && !content.includes('exam')) {
        typeIssues.push({
            severity: 'WARNING',
            interface: 'api.types.ts',
            field: 'N/A',
            issue: 'No Exam type definition found in api.types.ts',
            category: 'Missing Types'
        });
    }

    if (!content.includes('Student') && !content.includes('student')) {
        typeIssues.push({
            severity: 'WARNING',
            interface: 'api.types.ts',
            field: 'N/A',
            issue: 'No Student type definition found in api.types.ts',
            category: 'Missing Types'
        });
    }

    if (!content.includes('CourseOutcome') && !content.includes('CO')) {
        typeIssues.push({
            severity: 'WARNING',
            interface: 'api.types.ts',
            field: 'N/A',
            issue: 'No CourseOutcome type definition found in api.types.ts',
            category: 'Missing Types'
        });
    }
}

console.log('  API types checked');

// Summary
console.log('\n' + '='.repeat(100));
console.log('TYPE CONSISTENCY VALIDATION SUMMARY');
console.log('='.repeat(100));

const errors = typeIssues.filter(i => i.severity === 'ERROR');
const warnings = typeIssues.filter(i => i.severity === 'WARNING');
const info = typeIssues.filter(i => i.severity === 'INFO');

console.log(`\n🔴 ERRORS: ${errors.length}`);
console.log(`🟡 WARNINGS: ${warnings.length}`);
console.log(`ℹ️  INFO: ${info.length}`);
console.log(`\nTotal: ${typeIssues.length}\n`);

// Group by category
const byCategory = {};
typeIssues.forEach(issue => {
    if (!byCategory[issue.category]) {
        byCategory[issue.category] = [];
    }
    byCategory[issue.category].push(issue);
});

Object.entries(byCategory).forEach(([category, issues]) => {
    console.log(`\n${category} (${issues.length} issues):`);
    issues.slice(0, 5).forEach(issue => {
        console.log(`  - [${issue.severity}] ${issue.interface}.${issue.field}: ${issue.issue}`);
    });
    if (issues.length > 5) {
        console.log(`  ... and ${issues.length - 5} more`);
    }
});

// Save results
fs.writeFileSync(
    'd:\\outcome-master\\backend\\scripts\\audit-6-type-check.json',
    JSON.stringify({
        issues: typeIssues,
        summary: {
            total: typeIssues.length,
            errors: errors.length,
            warnings: warnings.length,
            info: info.length
        },
        byCategory
    }, null, 2)
);

console.log('\n✅ Results saved to: backend/scripts/audit-6-type-check.json');
