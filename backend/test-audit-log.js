const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuditLog() {
    try {
        // Get first user
        const user = await prisma.user.findFirst();

        if (!user) {
            console.log('❌ No users found in database');
            return;
        }

        console.log('✅ Found user:', user.fullName, user.id);

        // Try to create an audit log
        const auditLog = await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'TEST',
                entityType: 'Test',
                entityId: 'test-123',
                description: 'Test audit log creation',
                ipAddress: '127.0.0.1'
            }
        });

        console.log('✅ Created audit log:', auditLog.id);

        // Count total audit logs
        const count = await prisma.auditLog.count();
        console.log('📊 Total audit logs in database:', count);

        // Get all audit logs
        const logs = await prisma.auditLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { fullName: true }
                }
            }
        });

        console.log('📋 Recent audit logs:');
        logs.forEach(log => {
            console.log(`  - ${log.action} on ${log.entityType} by ${log.user.fullName} at ${log.createdAt}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) {
            console.error('   Error code:', error.code);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testAuditLog();
