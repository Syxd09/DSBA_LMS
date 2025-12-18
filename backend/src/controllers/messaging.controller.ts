
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const createGroup = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, memberIds } = req.body; // memberIds: string[] of userIds
        const creatorId = req.user?.userId;

        // Validation?
        if (!name || !type) return res.status(400).json({ message: 'Name and Type are required' });

        const group = await prisma.messageGroup.create({
            data: {
                name,
                type,
                members: {
                    create: [
                        { userId: creatorId! }, // Add creator
                        ...(memberIds?.map((uid: string) => ({ userId: uid })) || [])
                    ]
                }
            },
            include: { members: true }
        });

        res.json(group);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating group', error });
    }
};

export const getGroups = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        const groups = await prisma.messageGroup.findMany({
            where: {
                members: {
                    some: { userId }
                }
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching groups', error });
    }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const messages = await prisma.message.findMany({
            where: { groupId },
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, fullName: true, role: true } } }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { content } = req.body;
        const senderId = req.user?.userId;

        if (!content) return res.status(400).json({ message: 'Content is required' });

        const message = await prisma.message.create({
            data: {
                groupId,
                senderId: senderId!,
                content,
                type: 'TEXT'
            },
            include: { sender: { select: { id: true, fullName: true } } }
        });

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error });
    }
};
