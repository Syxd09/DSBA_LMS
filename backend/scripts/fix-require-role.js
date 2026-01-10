/**
 * Script to fix all requireRole calls from array syntax to variadic Role enum syntax
 * Old: requireRole(['ADMIN', 'PRINCIPAL'])
 * New: requireRole(Role.ADMIN, Role.PRINCIPAL)
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.ts'));

let totalChanges = 0;

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // Check if file needs Role import
    const hasRequireRole = content.includes('requireRole(');
    const hasRoleImport = content.includes("import { Role } from '@prisma/client'");

    if (hasRequireRole && !hasRoleImport) {
        // Add Role import after other imports
        const rbacImportLine = content.match(/import.*requireRole.*from.*rbac\.middleware.*/);
        if (rbacImportLine) {
            content = content.replace(
                rbacImportLine[0],
                rbacImportLine[0] + "\\nimport { Role } from '@prisma/client';"
            );
            changed = true;
        }
    }

    // Replace all requireRole([...]) with requireRole(Role.X, Role.Y, ...)
    const regex = /requireRole\(\[([^\]]+)\]\)/g;
    const matches = [...content.matchAll(regex)];

    matches.forEach(match => {
        const rolesString = match[1];
        // Extract role names like 'ADMIN', 'PRINCIPAL'
        const roles = rolesString.match(/'(\w+)'/g || []);
        if (roles && roles.length > 0) {
            // Convert ['ADMIN', 'PRINCIPAL'] to Role.ADMIN, Role.PRINCIPAL
            const roleEnums = roles.map(r => `Role.${r.replace(/'/g, '')}`).join(', ');
            const oldCall = match[0];
            const newCall = `requireRole(${roleEnums})`;
            content = content.replace(oldCall, newCall);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ Fixed: ${file}`);
        totalChanges++;
    }
});

console.log(`\\n✨ Total files updated: ${totalChanges}`);
