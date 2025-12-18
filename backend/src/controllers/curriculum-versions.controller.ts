
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getCurriculumVersions = async (req: AuthRequest, res: Response) => {
    try {
        const versions = await prisma.curriculumVersion.findMany({
            orderBy: { effectiveFrom: 'desc' },
            include: {
                program: {
                    select: { id: true, name: true, code: true }
                }
            }
        });
        res.json(versions);
    } catch (error) {
        console.error('Error fetching curriculum versions:', error);
        res.status(500).json({ message: 'Error fetching curriculum versions', error: String(error) });
    }
};

export const createCurriculumVersion = async (req: AuthRequest, res: Response) => {
    try {
        const { programId, versionName, effectiveFrom } = req.body;

        if (!programId || !versionName || !effectiveFrom) {
            return res.status(400).json({ message: 'Program, Version Name, and Effective From year are required' });
        }

        const version = await prisma.curriculumVersion.create({
            data: {
                programId,
                versionName,
                effectiveFrom: parseInt(effectiveFrom),
                isActive: true
            },
            include: { program: true }
        });

        res.status(201).json(version);
    } catch (error) {
        console.error('Error creating curriculum version:', error);
        res.status(500).json({ message: 'Error creating curriculum version', error: String(error) });
    }
};
