/**
 * Marks & Exam Definitions
 * Mirrors backend Pydantic models in `backend/app/schemas/exam.py` and `marks.py`
 */

import { Subject } from './academic';

export type ExamType = 'IA1' | 'IA2' | 'ASSIGNMENT1' | 'ASSIGNMENT2' | 'EXT';
export type ExamStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'published' | 'locked' | 'LOCKED';

export interface Exam {
    id: string;
    name: string;
    exam_type: ExamType;
    date: string;
    max_marks: number;
    weightage: number;
    status: ExamStatus;
    offering_id: string;
    cohort_id: string;
    subject?: Subject; // Optional expansion
    sections?: ExamSection[];
}

export interface ExamSection {
    id: string;
    name: string; // "Part A", "Part B"
    exam_id: string;
    max_marks: number;
    required_questions: number; // For "Answer any X"
    questions?: Question[];
}

export interface Question {
    id: string;
    section_id: string;
    question_number: string; // "1", "2"
    max_marks: number;
    co_id: string; // Mapped CO
    bloom_level: string; // "L1", "L2", etc.
    sub_questions?: SubQuestion[];
}

export interface SubQuestion {
    id: string;
    question_id: string;
    sub_question_number: string; // "a", "b"
    text?: string;
    max_marks: number;
    co_id: string;
    bloom_level: string;
}

export interface StudentMark {
    student_id: string; // USN
    sub_question_id: string;
    marks: number;
    is_absent: boolean;
    remarks?: string;
}

export interface MarksEntryGridRow {
    student_id: string;
    student_name: string;
    usn: string;
    marks: Record<string, number>; // sub_question_id -> marks
    total: number;
}
