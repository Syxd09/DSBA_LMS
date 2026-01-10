/**
 * Script 5: Business Logic Validation
 * Analyzes critical calculation logic for accuracy
 */

const fs = require('fs');
const path = require('path');

const logicIssues = [];

// Function to extract and analyze calculation logic
function analyzeFile(filePath, checks) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative('d:\\outcome-master\\backend\\src', filePath);

    checks.forEach(check => {
        const matches = content.match(check.pattern);
        if (matches) {
            check.validate(content, relativePath, matches);
        } else if (check.required) {
            logicIssues.push({
                severity: 'WARNING',
                file: relativePath,
                issue: check.missingMessage,
                category: check.category
            });
        }
    });
}

console.log('🔍 Phase 3: Business Logic Validation\n');

// Check 1: CO Attainment Calculation Logic
console.log('📋 Check 1: CO Attainment Calculation...');

const coAttainmentChecks = [
    {
        pattern: /attainment\s*=\s*\(.*?\)\s*[\*\/]\s*100/g,
        category: 'CO Attainment',
        required: true,
        missingMessage: 'CO attainment calculation not found',
        validate: (content, file, matches) => {
            // Check if using correct formula: (students >= threshold / total students) * 100
            if (!content.includes('threshold') && !content.includes('target')) {
                logicIssues.push({
                    severity: 'ERROR',
                    file,
                    issue: 'CO attainment may not be using threshold/target in calculation',
                    category: 'CO Attainment',
                    line: 'Formula may be incorrect'
                });
            }

            if (!content.includes('totalStudents') && !content.includes('total_students')) {
                logicIssues.push({
                    severity: 'WARNING',
                    file,
                    issue: 'CO attainment may not be dividing by total students',
                    category: 'CO Attainment'
                });
            }
        }
    }
];

const attainmentFiles = [
    'd:\\outcome-master\\backend\\src\\controllers\\attainment.controller.ts',
    'd:\\outcome-master\\backend\\src\\services\\attainment.service.ts'
];

attainmentFiles.forEach(file => {
    if (fs.existsSync(file)) {
        analyzeFile(file, coAttainmentChecks);
    }
});

console.log(`  Found ${logicIssues.filter(i => i.category === 'CO Attainment').length} CO attainment issues`);

// Check 2: Grading Calculation
console.log('\n📋 Check 2: Grading Logic...');

const gradingChecks = [
    {
        pattern: /grade\s*=|calculateGrade/g,
        category: 'Grading',
        required: true,
        missingMessage: 'Grading calculation not found',
        validate: (content, file) => {
            // Check for division by zero protection
            if (content.includes('/') && !content.includes('!== 0') && !content.includes('> 0')) {
                logicIssues.push({
                    severity: 'WARNING',
                    file,
                    issue: 'Potential division by zero in grading calculation',
                    category: 'Grading'
                });
            }

            // Check for percentage calculation
            if (!content.includes('percentage') && content.includes('marks')) {
                logicIssues.push({
                    severity: 'INFO',
                    file,
                    issue: 'Grading may not calculate percentage before assigning grade',
                    category: 'Grading'
                });
            }
        }
    }
];

const gradingFiles = [
    'd:\\outcome-master\\backend\\src\\controllers\\grading.controller.ts',
    'd:\\outcome-master\\backend\\src\\services\\grading.service.ts'
];

gradingFiles.forEach(file => {
    if (fs.existsSync(file)) {
        analyzeFile(file, gradingChecks);
    }
});

console.log(`  Found ${logicIssues.filter(i => i.category === 'Grading').length} grading issues`);

// Check 3: Enrollment Filtering Logic
console.log('\n📋 Check 3: Enrollment Filtering...');

const enrollmentFile = 'd:\\outcome-master\\backend\\src\\controllers\\enrollments.controller.ts';
if (fs.existsSync(enrollmentFile)) {
    const content = fs.readFileSync(enrollmentFile, 'utf8');

    // Check for semester + cohort filtering
    if (content.includes('cohortId') && !content.includes('semester')) {
        logicIssues.push({
            severity: 'WARNING',
            file: 'controllers/enrollments.controller.ts',
            issue: 'Some queries filter by cohort but not semester - may return wrong students',
            category: 'Enrollment Filtering'
        });
    }

    // Check for status filtering
    if (!content.includes('status') || !content.includes("'active'")) {
        logicIssues.push({
            severity: 'INFO',
            file: 'controllers/enrollments.controller.ts',
            issue: 'Not all enrollment queries filter by active status',
            category: 'Enrollment Filtering'
        });
    }
}

console.log(`  Found ${logicIssues.filter(i => i.category === 'Enrollment Filtering').length} enrollment issues`);

// Check 4: Marks Aggregation
console.log('\n📋 Check 4: Marks Aggregation...');

const marksFile = 'd:\\outcome-master\\backend\\src\\controllers\\marks.controller.ts';
if (fs.existsSync(marksFile)) {
    const content = fs.readFileSync(marksFile, 'utf8');

    // Check for correct aggregation
    if (content.includes('SUM') || content.includes('sum')) {
        if (!content.includes('GROUP BY') && !content.includes('groupBy')) {
            logicIssues.push({
                severity: 'ERROR',
                file: 'controllers/marks.controller.ts',
                issue: 'SUM without GROUP BY - marks may be incorrectly aggregated',
                category: 'Marks Aggregation'
            });
        }
    }

    // Check for null handling
    if (!content.includes('COALESCE') && !content.includes('??') && content.includes('marks')) {
        logicIssues.push({
            severity: 'WARNING',
            file: 'controllers/marks.controller.ts',
            issue: 'No null coalescing for marks - null values may break calculations',
            category: 'Marks Aggregation'
        });
    }
}

console.log(`  Found ${logicIssues.filter(i => i.category === 'Marks Aggregation').length} marks issues`);

// Summary
console.log('\n' + '='.repeat(100));
console.log('BUSINESS LOGIC VALIDATION SUMMARY');
console.log('='.repeat(100));

const errors = logicIssues.filter(i => i.severity === 'ERROR');
const warnings = logicIssues.filter(i => i.severity === 'WARNING');
const info = logicIssues.filter(i => i.severity === 'INFO');

console.log(`\n🔴 ERRORS: ${errors.length}`);
console.log(`🟡 WARNINGS: ${warnings.length}`);
console.log(`ℹ️  INFO: ${info.length}`);
console.log(`\nTotal: ${logicIssues.length}\n`);

if (logicIssues.length > 0) {
    logicIssues.forEach((issue, i) => {
        console.log(`${i + 1}. [${issue.severity}] ${issue.category}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   Issue: ${issue.issue}\n`);
    });
}

// Save results
fs.writeFileSync(
    'd:\\outcome-master\\backend\\scripts\\audit-5-logic-validation.json',
    JSON.stringify({
        issues: logicIssues,
        summary: {
            total: logicIssues.length,
            errors: errors.length,
            warnings: warnings.length,
            info: info.length
        }
    }, null, 2)
);

console.log('✅ Results saved to: backend/scripts/audit-5-logic-validation.json');
