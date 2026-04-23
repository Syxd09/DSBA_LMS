export type UserRole = 'principal' | 'hod' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
}

export interface ExamSection {
  id: string;
  name: string;
  requiredQuestions: number;
  totalQuestions: number;
  selectionMode: 'FIRST_N' | 'BEST_N';
  maxMarks: number;
}

export interface Question {
  id: string;
  sectionId: string;
  sequence: number;
  maxMarks: number;
  coMapping: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  isOptional: boolean;
  subQuestions: SubQuestion[];
}

export interface SubQuestion {
  id: string;
  label: string;
  maxMarks: number;
  coMapping: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
}

export interface StudentMark {
  studentId: string;
  studentName: string;
  registrationNumber: string;
  marks: Record<string, number>; // subQuestionId -> marks
  totalMarks: number;
  selectedQuestions: string[];
}

export interface COAttainment {
  co: string;
  description: string;
  attainment: number;
  target: number;
}

export interface BloomPerformance {
  level: string;
  percentage: number;
  questionsAttempted: number;
  totalQuestions: number;
}

export interface DepartmentStats {
  name: string;
  passPercentage: number;
  averageScore: number;
  totalStudents: number;
  atRiskStudents: number;
}
