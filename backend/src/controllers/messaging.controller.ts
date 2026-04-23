/**
 * ENTERPRISE MESSAGING SYSTEM - CONTROLLER
 * 
 * Production-grade messaging controller with strict RBAC enforcement
 * Supports: Group chats, 1-to-1 messaging, file attachments, read receipts
 * 
 * Authority Matrix:
 * - Create Groups: Principal, Admin, HOD
 * - Manage Members: Group Owner/Admin
 * - Send Messages: All roles (except Students)
 * - Delete Groups: Principal, Admin only
 * 
 * Security: All actions validated server-side with audit logging
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';

/**
 * Create a new conversation (Group or Direct)
 * 
 * @route POST /api/messaging/conversations
 * @access Principal, Admin, HOD (Groups) | Teacher (Direct only)
 */
export const createConversation = async (req: AuthRequest, res: Response) => {
    try {
        const { type, name, description, participantIds } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Validate type
        if (!['DIRECT', 'GROUP'].includes(type)) {
            return res.status(400).json({ message: 'Invalid conversation type' });
        }

        // RBAC: Only Principal/Admin/HOD can create groups
        if (type === 'GROUP' && !['PRINCIPAL', 'ADMIN', 'HOD'].includes(userRole!)) {
            await createAuditLog(userId, 'GROUP_CREATE_DENIED', 'conversation', '', undefined, {
                reason: 'Insufficient role',
                attemptedRole: userRole
            });
            return res.status(403).json({
                message: 'Only Principal, Admin, or HOD can create group conversations'
            });
        }

        // Validate group name
        if (type === 'GROUP' && !name) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        // Validate participants
        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            return res.status(400).json({ message: 'At least one participant is required' });
        }

        // Direct chat validation: Exactly 1 other participant
        if (type === 'DIRECT' && participantIds.length !== 1) {
            return res.status(400).json({
                message: 'Direct conversations must have exactly one other participant'
            });
        }

        // Check if direct conversation already exists
        if (type === 'DIRECT') {
            const otherUserId = participantIds[0];
            const existingConvo = await prisma.conversation.findFirst({
                where: {
                    type: 'DIRECT',
                    AND: [
                        { participants: { some: { userId } } },
                        { participants: { some: { userId: otherUserId } } }
                    ]
                },
                include: {
                    participants: {
                        include: { user: { select: { id: true, fullName: true, registrationNumber: true, role: true } } }
                    }
                }
            });

            if (existingConvo) {
                return res.json(existingConvo);
            }
        }

        // Create conversation with creator as OWNER
        const conversation = await prisma.conversation.create({
            data: {
                type,
                name: type === 'GROUP' ? name : null,
                description: type === 'GROUP' ? description : null,
                createdBy: userId,
                participants: {
                    create: [
                        // Creator is OWNER for groups, MEMBER for direct
                        {
                            userId,
                            role: type === 'GROUP' ? 'OWNER' : 'MEMBER'
                        },
                        // Other participants
                        ...participantIds.map((id: string) => ({
                            userId: id,
                            role: 'MEMBER' as any // Cast to any to handle type mismatch if necessary, or use ParticipantRole.MEMBER
                        }))
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true, registrationNumber: true,
                                email: true,
                                role: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        fullName: true, registrationNumber: true,
                        role: true
                    }
                }
            }
        });

        // Audit log
        await createAuditLog(userId, 'CONVERSATION_CREATED', 'conversation', conversation.id, undefined, {
            type,
            participantCount: participantIds.length + 1
        });

        res.status(201).json(conversation);
    } catch (error: any) {
        console.error('[Messaging] Error creating conversation:', error);
        res.status(500).json({
            message: 'Failed to create conversation',
            error: error.message
        });
    }
};

/**
 * Get all conversations for the current user
 * 
 * @route GET /api/messaging/conversations
 * @access Authenticated users
 */
export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true, registrationNumber: true,
                                email: true,
                                role: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1, // Last message for preview
                    include: {
                        sender: {
                            select: {
                                id: true,
                                fullName: true, registrationNumber: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        messages: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Calculate unread count for each conversation
        const enriched = await Promise.all(conversations.map(async (convo) => {
            const participant = convo.participants.find(p => p.userId === userId);

            const unreadCount = await prisma.message.count({
                where: {
                    conversationId: convo.id,
                    senderId: { not: userId },
                    createdAt: { gt: participant?.lastReadAt || new Date(0) }
                }
            });

            return {
                ...convo,
                unreadCount
            };
        }));

        res.json(enriched);
    } catch (error: any) {
        console.error('[Messaging] Error fetching conversations:', error);
        res.status(500).json({
            message: 'Failed to fetch conversations',
            error: error.message
        });
    }
};

/**
 * Get conversation by ID with messages
 * 
 * @route GET /api/messaging/conversations/:id
 * @access Conversation participants
 */
export const getConversationById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { limit = 30, before } = req.query;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Verify user is a participant
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            }
        });

        if (!participant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true, registrationNumber: true,
                                email: true,
                                role: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                messages: {
                    where: before ? {
                        createdAt: { lt: new Date(before as string) }
                    } : undefined,
                    orderBy: { createdAt: 'desc' },
                    take: Number(limit),
                    include: {
                        sender: {
                            select: {
                                id: true,
                                fullName: true, registrationNumber: true,
                                role: true,
                                avatarUrl: true
                            }
                        },
                        attachments: true,
                        readReceipts: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        fullName: true, registrationNumber: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        res.json({
            ...conversation,
            messages: conversation.messages.reverse() // Chronological order
        });
    } catch (error: any) {
        console.error('[Messaging] Error fetching conversation:', error);
        res.status(500).json({
            message: 'Failed to fetch conversation',
            error: error.message
        });
    }
};

/**
 * Send a message in a conversation
 * 
 * @route POST /api/messaging/conversations/:id/messages
 * @access Conversation participants (non-students)
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { id: conversationId } = req.params;
        const { content, messageType = 'TEXT' } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Block students from sending messages
        if (userRole === 'STUDENT') {
            await createAuditLog(userId, 'MESSAGE_SEND_DENIED', 'message', '', undefined, {
                reason: 'Students cannot send messages'
            });
            return res.status(403).json({
                message: 'Students are not allowed to send messages'
            });
        }

        // Validate content
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        if (content.length > 10000) {
            return res.status(400).json({ message: 'Message too long (max 10,000 characters)' });
        }

        // Verify participant
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        // Create message
        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId: userId,
                content,
                messageType
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        fullName: true, registrationNumber: true,
                        role: true,
                        avatarUrl: true
                    }
                },
                attachments: true
            }
        });

        // Update conversation's updatedAt
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        // Audit log
        await createAuditLog(userId, 'MESSAGE_SENT', 'message', message.id, undefined, {
            conversationId,
            messageType
        });

        res.status(201).json(message);
    } catch (error: any) {
        console.error('[Messaging] Error sending message:', error);
        res.status(500).json({
            message: 'Failed to send message',
            error: error.message
        });
    }
};

/**
 * Mark messages as read
 * 
 * @route  POST /api/messaging/conversations/:id/read
 * @access Conversation participants
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Verify participant
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        // Update lastReadAt
        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            },
            data: {
                lastReadAt: new Date()
            }
        });

        res.json({ message: 'Marked as read' });
    } catch (error: any) {
        console.error('[Messaging] Error marking as read:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Add participants to a group conversation
 * 
 * @route POST /api/messaging/conversations/:id/participants
 * @access Group owner/admin only
 */
export const addParticipants = async (req: AuthRequest, res: Response) => {
    try {
        const { id: conversationId } = req.params;
        const { userIds } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'User IDs are required' });
        }

        // Get conversation and verify it's a group
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: true
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        if (conversation.type !== 'GROUP') {
            return res.status(400).json({ message: 'Can only add participants to group conversations' });
        }

        // Verify user is owner or admin
        const userParticipant = conversation.participants.find(p => p.userId === userId);
        if (!userParticipant || !['OWNER', 'ADMIN'].includes(userParticipant.role)) {
            return res.status(403).json({
                message: 'Only group owner or admin can add participants'
            });
        }

        // Add participants
        const addedParticipants = await Promise.all(
            userIds.map(id =>
                prisma.conversationParticipant.create({
                    data: {
                        conversationId,
                        userId: id,
                        role: 'MEMBER'
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true, registrationNumber: true,
                                role: true,
                                avatarUrl: true
                            }
                        }
                    }
                }).catch(() => null) // Skip if already exists
            )
        );

        const successfulAdds = addedParticipants.filter(p => p !== null);

        // Audit log
        await createAuditLog(userId, 'PARTICIPANTS_ADDED', 'conversation', conversationId, undefined, {
            addedCount: successfulAdds.length
        });

        res.json({
            message: `Added ${successfulAdds.length} participant(s)`,
            participants: successfulAdds
        });
    } catch (error: any) {
        console.error('[Messaging] Error adding participants:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Remove participant from group conversation
 * 
 * @route DELETE /api/messaging/conversations/:id/participants/:userId
 * @access Group owner/admin only
 */
export const removeParticipant = async (req: AuthRequest, res: Response) => {
    try {
        const { id: conversationId, userId: targetUserId } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true }
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Verify permissions
        const userParticipant = conversation.participants.find(p => p.userId === userId);
        if (!userParticipant || !['OWNER', 'ADMIN'].includes(userParticipant.role)) {
            return res.status(403).json({
                message: 'Only group owner or admin can remove participants'
            });
        }

        // Cannot remove owner
        const targetParticipant = conversation.participants.find(p => p.userId === targetUserId);
        if (targetParticipant?.role === 'OWNER') {
            return res.status(400).json({ message: 'Cannot remove group owner' });
        }

        await prisma.conversationParticipant.delete({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: targetUserId
                }
            }
        });

        await createAuditLog(userId, 'PARTICIPANT_REMOVED', 'conversation', conversationId, undefined, {
            removedUserId: targetUserId
        });

        res.json({ message: 'Participant removed' });
    } catch (error: any) {
        console.error('[Messaging] Error removing participant:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete a conversation
 * 
 * @route DELETE /api/messaging/conversations/:id
 * @access Principal, Admin (or group owner)
 */
export const deleteConversation = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: { participants: true }
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Only Principal/Admin can delete, or group owner
        const isOwner = conversation.participants.some(
            p => p.userId === userId && p.role === 'OWNER'
        );

        if (!['PRINCIPAL', 'ADMIN'].includes(userRole!) && !isOwner) {
            return res.status(403).json({
                message: 'Only Principal, Admin, or group owner can delete conversations'
            });
        }

        await prisma.conversation.delete({ where: { id } });

        await createAuditLog(userId, 'CONVERSATION_DELETED', 'conversation', id);

        res.json({ message: 'Conversation deleted' });
    } catch (error: any) {
        console.error('[Messaging] Error deleting conversation:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Clear all messages in a conversation
 * 
 * @route DELETE /api/messaging/conversations/:id/messages
 * @access Principal, Admin (or conversation participant)
 */
export const clearMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Verify participant
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        // Deletion authority: Principal, Admin, or Participant (if they want to clear their own view? 
        // No, this deletes for everyone. So restrict to Principal/Admin/Owner)
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true }
        });

        const isOwner = conversation?.participants.some(p => p.userId === userId && p.role === 'OWNER');
        
        if (!['PRINCIPAL', 'ADMIN'].includes(userRole!) && !isOwner) {
            return res.status(403).json({
                message: 'Only Principal, Admin, or group owner can clear the chat for everyone'
            });
        }

        // Delete all messages in the conversation
        await prisma.message.deleteMany({
            where: { conversationId }
        });

        // Audit log
        await createAuditLog(userId, 'MESSAGES_CLEARED', 'conversation', conversationId);

        res.json({ message: 'Chat cleared successfully' });
    } catch (error: any) {
        console.error('[Messaging] Error clearing messages:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get contacts for messaging based on authority matrix
 * @route GET /api/messaging/contacts
 */
export const getMessagingContacts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role?.toUpperCase();

        if (!userId || !role) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let eligibleRoles: string[] = [];

        // Authority Matrix
        switch (role) {
            case 'PRINCIPAL':
                eligibleRoles = ['ADMIN', 'HOD', 'TEACHER'];
                break;
            case 'ADMIN':
                eligibleRoles = ['PRINCIPAL', 'HOD'];
                break;
            case 'HOD':
                eligibleRoles = ['PRINCIPAL', 'ADMIN', 'TEACHER'];
                break;
            case 'TEACHER':
                eligibleRoles = ['HOD', 'TEACHER'];
                break;
            case 'STUDENT':
                eligibleRoles = []; // Students are read-only
                break;
            default:
                eligibleRoles = [];
        }

        const contacts = await prisma.user.findMany({
            where: {
                id: { not: userId },
                role: { in: eligibleRoles as any }
            },
            select: {
                id: true,
                fullName: true, registrationNumber: true,
                email: true,
                role: true,
                avatarUrl: true
            },
            orderBy: {
                fullName: 'asc'
            }
        });

        res.json(contacts);
    } catch (error: any) {
        console.error('[Messaging] Error fetching contacts:', error);
        res.status(500).json({ message: 'Failed to fetch contacts', error: error.message });
    }
};
