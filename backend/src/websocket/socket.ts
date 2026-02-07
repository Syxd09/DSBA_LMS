/**
 * WEBSOCKET SERVER - REAL-TIME MESSAGING
 * 
 * Production-grade Socket.IO implementation for:
 * - Real-time message delivery
 * - Typing indicators
 * - Read receipts
 * - Online presence
 * 
 * Security: JWT authentication on connection
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../services/db';

interface SocketUser {
    userId: string;
    role: string;
    email: string;
}

interface AuthenticatedSocket extends Socket {
    user?: SocketUser;
}

export function initializeWebSocket(server: HTTPServer) {
    const io = new SocketIOServer(server, {
        cors: {
            origin: [
                'http://localhost:8080',  // Vite dev server
                'http://localhost:8081',  // Alternative Vite port
                'http://localhost:5173',  // Alternative Vite port
                'http://localhost',       // Docker frontend
                'http://localhost:80',    // Docker frontend explicit port
                process.env.FRONTEND_URL! // Existing frontend URL
            ],
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: '/socket.io',
        transports: ['websocket', 'polling']
    });

    // Authentication middleware
    io.use(async (socket: any, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            socket.user = {
                userId: decoded.userId,
                role: decoded.role,
                email: decoded.email
            };

            next();
        } catch (error) {
            console.error('[Socket] Authentication error:', error);
            next(new Error('Invalid token'));
        }
    });

    // Connection handling
    io.on('connection', async (socket: AuthenticatedSocket) => {
        const userId = socket.user?.userId;
        console.log(`[Socket] User connected: ${userId}`);

        if (!userId) {
            socket.disconnect();
            return;
        }

        // Update online presence
        await prisma.userPresence.upsert({
            where: { userId },
            create: {
                userId,
                isOnline: true,
                lastSeenAt: new Date(),
                socketId: socket.id
            },
            update: {
                isOnline: true,
                lastSeenAt: new Date(),
                socketId: socket.id
            }
        });

        // Broadcast online status to all participants' conversations
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId }
                }
            },
            select: {
                id: true,
                participants: {
                    select: { userId: true }
                }
            }
        });

        conversations.forEach(conv => {
            conv.participants.forEach(p => {
                if (p.userId !== userId) {
                    io.to(`user:${p.userId}`).emit('user-status-changed', {
                        userId,
                        isOnline: true
                    });
                }
            });
        });

        // Join user's personal room
        socket.join(`user:${userId}`);

        /**
         * JOIN CONVERSATION
         * User joins a conversation room to receive real-time messages
         */
        socket.on('join-conversation', async (data: { conversationId: string }) => {
            try {
                const { conversationId } = data;

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
                    socket.emit('error', { message: 'Not a participant' });
                    return;
                }

                socket.join(`conversation:${conversationId}`);
                console.log(`[Socket] User ${userId} joined conversation ${conversationId}`);
            } catch (error) {
                console.error('[Socket] Error joining conversation:', error);
                socket.emit('error', { message: 'Failed to join conversation' });
            }
        });

        /**
         * LEAVE CONVERSATION
         */
        socket.on('leave-conversation', (data: { conversationId: string }) => {
            const { conversationId } = data;
            socket.leave(`conversation:${conversationId}`);
        });

        /**
         * SEND MESSAGE (Real-time)
         * Broadcasts message to all conversation participants
         */
        socket.on('send-message', async (data: {
            conversationId: string;
            content: string;
            messageType?: 'TEXT' | 'IMAGE' | 'FILE';
        }) => {
            try {
                const { conversationId, content, messageType = 'TEXT' } = data;

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
                    socket.emit('error', { message: 'Not a participant' });
                    return;
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
                                fullName: true,
                                role: true,
                                avatarUrl: true
                            }
                        },
                        attachments: true
                    }
                });

                // Update conversation timestamp
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() }
                });

                // Broadcast to conversation room
                io.to(`conversation:${conversationId}`).emit('message-received', message);

            } catch (error) {
                console.error('[Socket] Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        /**
         * TYPING INDICATOR
         * Broadcast typing status to conversation
         */
        socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
            const { conversationId, isTyping } = data;

            socket.to(`conversation:${conversationId}`).emit('user-typing', {
                userId,
                conversationId,
                isTyping
            });
        });

        /**
         * MARK AS READ
         * Update read receipts
         */
        socket.on('mark-read', async (data: { conversationId: string }) => {
            try {
                const { conversationId } = data;

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

                // Notify sender of read receipt
                socket.to(`conversation:${conversationId}`).emit('message-read', {
                    userId,
                    conversationId,
                    readAt: new Date()
                });

            } catch (error) {
                console.error('[Socket] Error marking as read:', error);
            }
        });

        /**
         * DISCONNECT
         * Update presence to offline
         */
        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${userId}`);

            await prisma.userPresence.update({
                where: { userId },
                data: {
                    isOnline: false,
                    lastSeenAt: new Date(),
                    socketId: null
                }
            });

            // Broadcast offline status
            conversations.forEach(conv => {
                conv.participants.forEach(p => {
                    if (p.userId !== userId) {
                        io.to(`user:${p.userId}`).emit('user-status-changed', {
                            userId,
                            isOnline: false,
                            lastSeenAt: new Date()
                        });
                    }
                });
            });
        });
    });

    console.log('[Socket.IO] WebSocket server initialized');
    return io;
}
