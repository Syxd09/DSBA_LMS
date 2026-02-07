const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function safeDelete(modelName, displayName) {
    try {
        const result = await prisma[modelName].deleteMany({});
        console.log(`✓ Deleted ${displayName}`);
        return result;
    } catch (error) {
        console.log(`⏭️  Skipped ${displayName} (table doesn't exist)`);
    }
}

async function resetDatabase() {
    console.log('🗑️  Clearing entire database...\n');

    try {
        // Delete all data in correct order (respecting foreign keys)

        // User-related data
        await safeDelete('auditLog', 'audit logs');
        await safeDelete('notification', 'notifications');

        // Messaging
        await safeDelete('messageAttachment', 'message attachments');
        await safeDelete('message', 'messages');
        await safeDelete('conversationParticipant', 'conversation participants');
        await safeDelete('conversation', 'conversations');
        await safeDelete('userPresence', 'user presence');

        // Feedback system
        await safeDelete('feedbackResponse', 'feedback responses');
        await safeDelete('feedbackAssignment', 'feedback assignments');
        await safeDelete('feedback', 'feedback');

        // Marks and assessments
        await safeDelete('markEntry', 'mark entries');
        await safeDelete('marksUnlockRequest', 'marks unlock requests');
        await safeDelete('attainmentTarget', 'attainment targets');
        await safeDelete('assessment', 'assessments');

        // CO-PO mappings
        await safeDelete('coPOMapping', 'CO-PO mappings');
        await safeDelete('programOutcome', 'program outcomes');
        await safeDelete('courseOutcome', 'course outcomes');

        // Academic structure
        await safeDelete('teacherAssignment', 'teacher assignments');
        await safeDelete('enrollment', 'enrollments');
        await safeDelete('subject', 'subjects');
        await safeDelete('cohort', 'cohorts');
        await safeDelete('semester', 'semesters');
        await safeDelete('academicYear', 'academic years');
        await safeDelete('program', 'programs');
        await safeDelete('department', 'departments');

        // Users last (after all related data)
        await safeDelete('user', 'users');

        console.log('\n✅ Database cleared successfully!\n');

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
                departmentId: null // Principal is college-level
            }
        });

        console.log('✅ Principal user created successfully!\n');
        console.log('═══════════════════════════════════════');
        console.log('🔑 LOGIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log(`📧 Email:    syxdmatheen.9@gmail.com`);
        console.log(`🔒 Password: syxd123`);
        console.log(`👤 Role:     PRINCIPAL`);
        console.log(`📛 Name:     Syed Matheen`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
