/**
 * Script 4: Database Schema Validation
 * Validates Prisma schema against actual database structure
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateSchema() {
    console.log('🔍 Validating Database Schema...\n');

    const issues = [];

    try {
        // Test 1: Check for NULL constraint violations
        console.log('📋 Test 1: Checking for NULL constraint issues...');

        // Check Exam table
        const examsWithNulls = await prisma.$queryRaw`
            SELECT 
                COUNT(*) FILTER (WHERE semester IS NULL) as null_semester,
                COUNT(*) FILTER (WHERE "updatedAt" IS NULL) as null_updated,
                COUNT(*) as total
            FROM "Exam"
        `;

        if (examsWithNulls[0].null_semester > 0) {
            issues.push({
                severity: 'ERROR',
                table: 'Exam',
                field: 'semester',
                issue: `${examsWithNulls[0].null_semester} exams have NULL semester (schema expects NOT NULL)`,
                impact: 'Exam queries may fail'
            });
        }

        if (examsWithNulls[0].null_updated > 0) {
            issues.push({
                severity: 'WARNING',
                table: 'Exam',
                field: 'updatedAt',
                issue: `${examsWithNulls[0].null_updated} exams have NULL updatedAt`,
                impact: 'Audit trails incomplete'
            });
        }

        console.log(`  ✓ Exam table: ${examsWithNulls[0].total} rows checked`);

        // Test 2: Check StudentEnrollment status enum
        console.log('\n📋 Test 2: Checking enum values...');

        const invalidStatuses = await prisma.$queryRaw`
            SELECT DISTINCT status, COUNT(*) as count
            FROM "StudentEnrollment"
            WHERE status NOT IN ('active', 'inactive', 'graduated', 'dropped')
            GROUP BY status
        `;

        if (invalidStatuses.length > 0) {
            invalidStatuses.forEach(row => {
                issues.push({
                    severity: 'ERROR',
                    table: 'StudentEnrollment',
                    field: 'status',
                    issue: `Invalid status value: "${row.status}" (${row.count} rows)`,
                    impact: 'Queries filtering by status may fail'
                });
            });
        }

        console.log('  ✓ Enrollment status enum validated');

        // Test 3: Check for orphaned relations
        console.log('\n📋 Test 3: Checking for orphaned relations...');

        // Check enrollments without valid students
        const orphanedEnrollments = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM "StudentEnrollment" se
            LEFT JOIN student s ON se."studentId" = s.id
            WHERE s.id IS NULL
        `;

        if (orphanedEnrollments[0].count > 0) {
            issues.push({
                severity: 'ERROR',
                table: 'StudentEnrollment',
                field: 'studentId',
                issue: `${orphanedEnrollments[0].count} enrollments reference non-existent students`,
                impact: 'Queries with student joins will fail'
            });
        }

        console.log(`  ✓ Orphaned relations: ${orphanedEnrollments[0].count} found`);

        // Test 4: Check Marks table constraints
        console.log('\n📋 Test 4: Checking Marks table...');

        const marksIssues = await prisma.$queryRaw`
            SELECT 
                COUNT(*) FILTER (WHERE "marksObtained" > "maxMarks") as exceeds_max,
                COUNT(*) FILTER (WHERE "marksObtained" < 0) as negative_marks,
                COUNT(*) as total
            FROM "Marks"
        `;

        if (marksIssues[0].exceeds_max > 0) {
            issues.push({
                severity: 'ERROR',
                table: 'Marks',
                field: 'marksObtained',
                issue: `${marksIssues[0].exceeds_max} marks exceed maxMarks`,
                impact: 'Invalid data affects calculations'
            });
        }

        if (marksIssues[0].negative_marks > 0) {
            issues.push({
                severity: 'ERROR',
                table: 'Marks',
                field: 'marksObtained',
                issue: `${marksIssues[0].negative_marks} marks are negative`,
                impact: 'Invalid data affects calculations'
            });
        }

        console.log(`  ✓ Marks table: ${marksIssues[0].total} rows validated`);

        // Test 5: Check TeacherAssignment overlaps
        console.log('\n📋 Test 5: Checking teacher assignment conflicts...');

        const assignmentConflicts = await prisma.$queryRaw`
            SELECT 
                ta1."teacherId",
                ta1."subjectId",
                ta1."cohortId",
                ta1."semester",
                COUNT(*) as conflict_count
            FROM "TeacherAssignment" ta1
            INNER JOIN "TeacherAssignment" ta2 
                ON ta1."teacherId" = ta2."teacherId"
                AND ta1."subjectId" = ta2."subjectId"
                AND ta1."cohortId" = ta2."cohortId"
                AND ta1."semester" = ta2."semester"
                AND ta1.id != ta2.id
            GROUP BY ta1."teacherId", ta1."subjectId", ta1."cohortId", ta1."semester"
        `;

        if (assignmentConflicts.length > 0) {
            issues.push({
                severity: 'WARNING',
                table: 'TeacherAssignment',
                field: 'teacherId/subjectId/cohortId/semester',
                issue: `${assignmentConflicts.length} duplicate teacher assignments found`,
                impact: 'Teachers may see duplicate data'
            });
        }

        console.log(`  ✓ Assignment conflicts: ${assignmentConflicts.length} found`);

    } catch (error) {
        console.error('❌ Schema validation error:', error);
        issues.push({
            severity: 'CRITICAL',
            table: 'N/A',
            field: 'N/A',
            issue: error.message,
            impact: 'Validation incomplete'
        });
    } finally {
        await prisma.$disconnect();
    }

    // Print summary
    console.log('\n' + '='.repeat(100));
    console.log('SCHEMA VALIDATION SUMMARY');
    console.log('='.repeat(100));

    if (issues.length === 0) {
        console.log(' ✅ No schema issues found!');
    } else {
        critical = issues.filter(i => i.severity === 'CRITICAL');
        errors = issues.filter(i => i.severity === 'ERROR');
        warnings = issues.filter(i => i.severity === 'WARNING');

        console.log(`\n🔴 CRITICAL: ${critical.length}`);
        console.log(`🔴 ERRORS: ${errors.length}`);
        console.log(`🟡 WARNINGS: ${warnings.length}`);
        console.log(`\nTotal Issues: ${issues.length}\n`);

        issues.forEach((issue, i) => {
            console.log(`${i + 1}. [${issue.severity}] ${issue.table}.${issue.field}`);
            console.log(`   Issue: ${issue.issue}`);
            console.log(`   Impact: ${issue.impact}\n`);
        });
    }

    // Save to file
    const fs = require('fs');
    fs.writeFileSync(
        'd:\\outcome-master\\backend\\scripts\\audit-4-schema-validation.json',
        JSON.stringify({ issues, summary: { total: issues.length, critical: critical.length, errors: errors.length, warnings: warnings.length } }, null, 2)
    );

    console.log('✅ Full report saved to: backend/scripts/audit-4-schema-validation.json');
}

validateSchema();
