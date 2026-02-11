/**
 * Academic Entity Definitions
 * Mirrors backend Pydantic models in `backend/app/schemas/academic.py`
 */

export interface Program {
    id: string;
    name: string;
    code: string;
    department_id: string;
    created_at?: string;
}

export interface Department {
    id: string;
    name: string;
    code: string;
    head_id?: string; // HOD User ID
}

export interface Cohort {
    id: string;
    name: string; // e.g. "2023-2027"
    program_id: string;
    start_year: number;
    end_year: number;
    current_semester: number;
    is_active: boolean;
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    credits: number;
    type: 'THEORY' | 'LAB' | 'PROJECT' | 'ELECTIVE';
    program_id: string;
}

export interface SubjectOffering {
    id: string;
    subject_id: string;
    cohort_id: string;
    semester: number;
    academic_year: number;
    syllabus_version?: number;
    subject?: Subject; // Expanded
}

export interface Student {
    id: string; // UUID
    usn: string;
    name: string;
    email?: string;
    current_semester: number;
    program_id: string;
    status: 'ACTIVE' | 'GRADUATED' | 'DROPPED';
}
