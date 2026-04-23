/**
 * FILE UPLOAD MIDDLEWARE & CONTROLLER
 * 
 * Secure file upload for messaging attachments
 * Supports: Images (PNG, JPG, WebP), Documents (PDF, DOCX), CSV
 * Max file size: 50MB
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/messaging');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create conversation-specific folder
        const conversationId = (req.params as any).id;
        const folder = path.join(uploadDir, conversationId);

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        cb(null, folder);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-random-originalname
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    }
});

// File filter - allowed types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
        // Images
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        // Documents
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'text/csv',
        'application/vnd.ms-excel', // CSV alternative
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: images, PDF, DOCX, CSV`));
    }
};

// Multer upload instance
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    }
});

/**
 * Upload attachment and send message
 * 
 * @route POST /api/messaging/conversations/:id/upload
 * @access Conversation participants
 */
export const uploadAttachment = async (req: AuthRequest, res: Response) => {
    try {
        const { id: conversationId } = req.params;
        const { content = '' } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Block students
        if (userRole === 'STUDENT') {
            return res.status(403).json({ message: 'Students cannot send messages' });
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
            return res.status(403).json({ message: 'Not a participant' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Determine message type
        let messageType: 'IMAGE' | 'FILE' = 'FILE';
        if (req.file.mimetype.startsWith('image/')) {
            messageType = 'IMAGE';
        }

        // Create message with attachment
        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId: userId,
                content: content || `Sent a file: ${req.file.originalname}`,
                messageType,
                attachments: {
                    create: {
                        fileName: req.file.originalname,
                        fileSize: req.file.size,
                        fileType: req.file.mimetype,
                        fileUrl: `/uploads/messaging/${conversationId}/${req.file.filename}`
                    }
                }
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

        // Update conversation
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        // Audit log
        await createAuditLog(userId, 'ATTACHMENT_UPLOADED', 'message', message.id, undefined, {
            conversationId,
            fileName: req.file.originalname,
            fileSize: req.file.size
        });

        res.status(201).json(message);
    } catch (error: any) {
        console.error('[Messaging] Error uploading attachment:', error);
        res.status(500).json({
            message: 'Failed to upload attachment',
            error: error.message
        });
    }
};

/**
 * Download/serve attachment
 * 
 * @route GET /api/messaging/files/:conversationId/:filename
 * @access Conversation participants only
 */
export const serveFile = async (req: AuthRequest, res: Response) => {
    try {
        const { conversationId, filename } = req.params;
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
            return res.status(403).json({ message: 'Access denied' });
        }

        const filePath = path.join(uploadDir, conversationId, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Serve file
        res.sendFile(filePath);
    } catch (error: any) {
        console.error('[Messaging] Error serving file:', error);
        res.status(500).json({ error: error.message });
    }
};
