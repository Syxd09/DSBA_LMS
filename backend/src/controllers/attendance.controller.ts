import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Record attendance for a class
 * @route POST /api/attendance
 * @access Teacher, HOD, Principal
 */
export const recordAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, date, attendanceData } = req.body;
        const teacherId = req.user?.userId;

        if (!subjectId || !date || !attendanceData || !Array.isArray(attendanceData)) {
            return res.status(400).json({ message: 'Subject ID, Date, and Attendance Data are required' });
        }

        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const formattedDate = new Date(date);
        formattedDate.setHours(0, 0, 0, 0);

        const records = await Promise.all(attendanceData.map(record => 
            prisma.attendance.upsert({
                where: {
                    studentId_subjectId_date: {
                        studentId: record.studentId,
                        subjectId,
                        date: formattedDate
                    }
                },
                update: {
                    status: record.status,
                    remarks: record.remarks,
                    recordedBy: teacherId
                },
                create: {
                    studentId: record.studentId,
                    subjectId,
                    date: formattedDate,
                    status: record.status,
                    remarks: record.remarks,
                    recordedBy: teacherId
                }
            })
        ));

        res.json({ message: `Successfully recorded attendance for ${records.length} students`, count: records.length });
    } catch (error) {
        console.error('[Attendance] Error recording:', error);
        res.status(500).json({ message: 'Error recording attendance', error: String(error) });
    }
};

/**
 * Get attendance report for a subject
 * @route GET /api/attendance/subject/:subjectId
 */
export const getSubjectAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId } = req.params;
        const { startDate, endDate } = req.query;

        const where: any = { subjectId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                student: {
                    select: { id: true, fullName: true, registrationNumber: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        res.json(attendance);
    } catch (error) {
        console.error('[Attendance] Error fetching report:', error);
        res.status(500).json({ message: 'Error fetching attendance', error: String(error) });
    }
};
