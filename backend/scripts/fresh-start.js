const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetDatabase() {
    console.log('🗑️  COMPLETE DATABASE RESET\n');

    try {
        // Use raw SQL to delete everything
        console.log('Truncating all tables...\n');

        // Get all table names
        const tables = await prisma.$queryRaw`
            SELECT tablename 
            FROM pg_tables 
           WHERE schemaname = 'public'
        `;

        // Disable foreign key checks
        await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

        // Truncate each table
        for (const { tablename } of tables) {
            if (tablename !== '_prisma_migrations') {
                try {
                    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
                    console.log(`✓ Cleared ${tablename}`);
                } catch (e) {
                    console.log(`⏭️  Skipped ${tablename}`);
                }
            }
        }

        // Re-enable foreign key checks
        await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');

        console.log('\n✅ All tables cleared!\n');

        // Create Principal user
        console.log('👤 Creating Principal user...\n');

        const hashedPassword = await bcrypt.hash('syxd123', 10);

        const principal = await prisma.user.create({
            data: {
                email: 'syxdmatheen.9@gmail.com',
                password: hashedPassword,
                fullName: 'Syed Matheen',
                role: 'PRINCIPAL',
                isActive: true,
                departmentId: null
            }
        });

        console.log('✅ SUCCESS!\n');
        console.log('═══════════════════════════════════════');
        console.log('🔑 YOUR LOGIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log(`📧 Email:    syxdmatheen.9@gmail.com`);
        console.log(`🔒 Password: syxd123`);
        console.log(`👤 Role:     PRINCIPAL`);
        console.log(`📛 Name:     Syed Matheen`);
        console.log(`🆔 ID:       ${principal.id}`);
        console.log('═══════════════════════════════════════\n');
        console.log('🎉 Database is fresh! Only your Principal account exists.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
