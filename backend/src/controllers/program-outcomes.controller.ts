
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getProgramOutcomes = async (req: AuthRequest, res: Response) => {
    try {
        const { programId } = req.query;

        if (!programId) {
            return res.status(400).json({ message: 'Program ID is required' });
        }

        const outcomes = await prisma.programOutcome.findMany({
            where: { programId: String(programId) },
            orderBy: { poNumber: 'asc' },
            include: {
                program: { select: { name: true, code: true } }
            }
        });
        res.json(outcomes);
    } catch (error) {
        console.error('Error fetching program outcomes:', error);
        res.status(500).json({ message: 'Error fetching program outcomes', error: String(error) });
    }
};

export const createProgramOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { programId, poNumber, description } = req.body;

        if (!programId || !poNumber || !description) {
            return res.status(400).json({ message: 'Program ID, PO Number, and Description are required' });
        }

        const outcome = await prisma.programOutcome.create({
            data: {
                programId,
                poNumber: parseInt(poNumber),
                description
            }
        });

        res.status(201).json(outcome);
    } catch (error) {
        console.error('Error creating program outcome:', error);
        res.status(500).json({ message: 'Error creating program outcome', error: String(error) });
    }
};

export const updateProgramOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { poNumber, description } = req.body;

        const outcome = await prisma.programOutcome.update({
            where: { id },
            data: {
                ...(poNumber && { poNumber: parseInt(poNumber) }),
                ...(description && { description })
            }
        });

        res.json(outcome);
    } catch (error) {
        console.error('Error updating program outcome:', error);
        res.status(500).json({ message: 'Error updating program outcome', error: String(error) });
    }
};

export const deleteProgramOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.programOutcome.delete({ where: { id } });
        res.json({ message: 'Program outcome deleted' });
    } catch (error) {
        console.error('Error deleting program outcome:', error);
        res.status(500).json({ message: 'Error deleting program outcome', error: String(error) });
    }
};
