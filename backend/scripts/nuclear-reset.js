const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetDatabase() {
    console.log('🗑️  COMPLETE DATABASE RESET\n');
    console.log('⚠️  WARNING: This will delete ALL data!\n');

    try {
        // Delete in correct order (children first, then parents)
        console.log('Deleting all data...\n');

        // Level 5: Deepest dependencies
        await prisma.$executeRawUnsafe('DELETE FROM "MarkEntry"');
        await prisma.$executeRawUnsafe('DELETE FROM "MessageAttachment"');
        await prisma.$executeRawUnsafe('DELETE FROM "FeedbackResponse"');
        console.log('✓ Level 5 deleted');

        // Level 4
        await prisma.$executeRawUnsafe('DELETE FROM "Message"');
        await prisma.$executeRawUnsafe('DELETE FROM "Assessment"');
        await prisma.$executeRawUnsafe('DELETE FROM "FeedbackAssignment"');
        await prisma.$executeRawUnsafe('DELETE FROM "MarksUnlockRequest"');
        console.log('✓ Level 4 deleted');

        // Level 3
        await prisma.$executeRawUnsafe('DELETE FROM "ConversationParticipant"');
        await prisma.$executeRawUnsafe('DELETE FROM "Feedback"');
        await prisma.$executeRawUnsafe('DELETE FROM "TeacherAssignment"');
        await prisma.$executeRawUnsafe('DELETE FROM "Enrollment"');
        await prisma.$executeRawUnsafe('DELETE FROM "COPOMapping"');
        console.log('✓ Level 3 deleted');

        // Level 2
        await prisma.$executeRawUnsafe('DELETE FROM "Conversation"');
        await prisma.$executeRawUnsafe('DELETE FROM "Subject"');
        await prisma.$executeRawUnsafe('DELETE FROM "CourseOutcome"');
        await prisma.$executeRawUnsafe('DELETE FROM "ProgramOutcome"');
        await prisma.$executeRawUnsafe('DELETE FROM "Cohort"');
        await prisma.$executeRawUnsafe('DELETE FROM "AttainmentTarget"');
        console.log('✓ Level 2 deleted');

        // Level 1
        await prisma.$executeRawUnsafe('DELETE FROM "Semester"');
        await prisma.$executeRawUnsafe('DELETE FROM "Program"');
        await prisma.$executeRawUnsafe('DELETE FROM "AcademicYear"');
        console.log('✓ Level 1 deleted');

        // Level 0
        await prisma.$executeRawUnsafe('DELETE FROM "Department"');
        await prisma.$executeRawUnsafe('DELETE FROM "UserPresence"');
        await prisma.$executeRawUnsafe('DELETE FROM "AuditLog"');
        console.log('✓ Level 0 deleted');

        // Finally delete users
        await prisma.$executeRawUnsafe('DELETE FROM "User"');
        console.log('✓ All users deleted\n');

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
        console.log('═══════════════════════════════════════\n');
        console.log('✅ Database is now fresh with only your Principal account!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        // Don't throw - continue even if some tables don't exist
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
