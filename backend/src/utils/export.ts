/**
 * Export utilities for generating CSV and Excel files
 */

import { Response } from 'express';

/**
 * Convert an array of objects to CSV string
 */
export const toCSV = <T extends Record<string, unknown>>(
    data: T[],
    columns?: { key: keyof T; header: string }[]
): string => {
    if (data.length === 0) return '';

    // Use provided columns or auto-detect from first item
    const cols = columns || Object.keys(data[0]).map(key => ({
        key: key as keyof T,
        header: key.toString()
    }));

    // Build header row
    const header = cols.map(c => escapeCSV(c.header)).join(',');

    // Build data rows
    const rows = data.map(item =>
        cols.map(c => {
            const key = String(c.key);
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                return '';
            }
            const value = Reflect.get(item, key);
            return escapeCSV(String(value ?? ''));
        }).join(',')
    );

    return [header, ...rows].join('\n');
};

/**
 * Escape a CSV field value
 */
const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
};

/**
 * Send CSV response with proper headers
 */
export const sendCSV = (
    res: Response,
    data: string,
    filename: string
): void => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
};

/**
 * Format a date for export
 */
export const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

/**
 * Format a datetime for export
 */
export const formatDateTime = (date: Date | string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:MM:SS
};

/**
 * Common export column configurations
 */
export const exportColumns = {
    student: [
        { key: 'rollNumber' as const, header: 'Roll Number' },
        { key: 'studentName' as const, header: 'Student Name' },
        { key: 'email' as const, header: 'Email' },
    ],
    marks: [
        { key: 'rollNumber' as const, header: 'Roll Number' },
        { key: 'studentName' as const, header: 'Student Name' },
        { key: 'questionNumber' as const, header: 'Question' },
        { key: 'marks' as const, header: 'Marks' },
        { key: 'maxMarks' as const, header: 'Max Marks' },
    ],
    results: [
        { key: 'rollNumber' as const, header: 'Roll Number' },
        { key: 'studentName' as const, header: 'Student Name' },
        { key: 'subjectCode' as const, header: 'Subject Code' },
        { key: 'subjectName' as const, header: 'Subject' },
        { key: 'internal1' as const, header: 'Internal 1' },
        { key: 'internal2' as const, header: 'Internal 2' },
        { key: 'bestInternal' as const, header: 'Best Internal' },
        { key: 'external' as const, header: 'External' },
        { key: 'total' as const, header: 'Total' },
        { key: 'grade' as const, header: 'Grade' },
    ],
};
