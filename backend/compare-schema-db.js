const fs = require('fs');

const schemaPath = 'd:/outcome-master 1/backend/prisma/schema.prisma';
const tablesPath = 'd:/outcome-master 1/backend/db_tables.txt';

try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const models = Array.from(schema.matchAll(/^model (\w+) {/gm), m => m[1]).sort();
    
    const dbTables = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
    const userTables = dbTables.filter(t => t !== '_prisma_migrations').sort();

    const missingInDb = models.filter(m => !userTables.includes(m));
    const extraInDb = userTables.filter(t => !models.includes(t));

    const results = {
        modelsTotal: models.length,
        userTablesTotal: userTables.length,
        missingInDb,
        extraInDb
    };

    fs.writeFileSync('compare_results.txt', JSON.stringify(results, null, 2));
    console.log('✅ Results written to compare_results.txt');

} catch (e) {
    fs.writeFileSync('compare_error.txt', e.message);
    console.error(e);
}
