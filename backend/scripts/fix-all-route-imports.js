/**
 * Enterprise-grade route import fixer
 * Systematically fixes all broken import statements in route files
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'src', 'routes');

// Files identified with import issues
const problematicFiles = [
    'bulk.routes.ts',
    'marks-unlock.routes.ts',
    'curriculum-version.routes.ts',
    'course-outcomes.routes.ts',
    'departments.routes.ts',
    'teacher-assignments.routes.ts',
    'co-attainment.routes.ts',
    'cohorts.routes.ts',
    'exams.routes.ts',
    'grading.routes.ts'
];

let fixedCount = 0;
let errorCount = 0;

console.log('🔧 Starting systematic route file fixes...\n');

problematicFiles.forEach(filename => {
    const filePath = path.join(routesDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipped: ${filename} (not found)`);
        return;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;

        // Fix 1: Replace escaped newline in imports
        content = content.replace(
            /middleware';\\\\nimport \{ Role \}/g,
            "middleware';\r\nimport { Role }"
        );

        // Fix 2: Ensure Role import exists if requireRole is used
        if (content.includes('requireRole(') && !content.includes("import { Role }")) {
            const rbacImportMatch = content.match(/(import.*requireRole.*from.*rbac\.middleware.*';?\r?\n)/);
            if (rbacImportMatch) {
                content = content.replace(
                    rbacImportMatch[0],
                    rbacImportMatch[0] + "import { Role } from '@prisma/client';\r\n"
                );
            }
        }

        // Fix 3: Move misplaced imports to top
        const lines = content.split(/\r?\n/);
        const imports = [];
        const other = [];
        let inImports = true;
        let foundFirstNonImport = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('import ') && inImports) {
                imports.push(lines[i]);
            } else if (line.startsWith('import ') && foundFirstNonImport) {
                // This is a misplaced import, move it to top
                imports.push(lines[i]);
            } else {
                if (line === '' && !foundFirstNonImport && imports.length > 0) {
                    // Empty line after imports is ok
                } else if (line && !line.startsWith('import ')) {
                    foundFirstNonImport = true;
                    inImports = false;
                }
                other.push(lines[i]);
            }
        }

        // Rebuild file
        content = imports.join('\r\n') + '\r\n' + other.join('\r\n');

        // Only write if changed
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`✅ Fixed: ${filename}`);
            fixedCount++;
        } else {
            console.log(`✓  OK: ${filename} (no changes needed)`);
        }

    } catch (error) {
        console.error(`❌ Error fixing ${filename}:`, error.message);
        errorCount++;
    }
});

console.log(`\n📊 Summary:`);
console.log(`   Fixed: ${fixedCount}`);
console.log(`   OK: ${problematicFiles.length - fixedCount - errorCount}`);
console.log(`   Errors: ${errorCount}`);
console.log(`   Total: ${problematicFiles.length}`);

if (errorCount > 0) {
    process.exit(1);
}
