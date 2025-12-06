import { User, Subject, DepartmentStats, COAttainment, BloomPerformance, StudentMark } from './types';

export const mockUsers: User[] = [
  { id: '1', name: 'Dr. Rajesh Kumar', email: 'principal@college.edu', role: 'principal', avatar: '' },
  { id: '2', name: 'Dr. Priya Sharma', email: 'hod.cs@college.edu', role: 'hod', department: 'Computer Science' },
  { id: '3', name: 'Prof. Amit Verma', email: 'amit.verma@college.edu', role: 'teacher', department: 'Computer Science' },
  { id: '4', name: 'Rahul Mehta', email: 'rahul.mehta@student.edu', role: 'student', department: 'Computer Science' },
];

export const mockSubjects: Subject[] = [
  { id: '1', name: 'Data Structures', code: 'CS201', credits: 4, semester: 3 },
  { id: '2', name: 'Database Management', code: 'CS202', credits: 4, semester: 3 },
  { id: '3', name: 'Operating Systems', code: 'CS203', credits: 3, semester: 3 },
  { id: '4', name: 'Computer Networks', code: 'CS301', credits: 4, semester: 5 },
  { id: '5', name: 'Software Engineering', code: 'CS302', credits: 3, semester: 5 },
];

export const mockDepartmentStats: DepartmentStats[] = [
  { name: 'Computer Science', passPercentage: 87, averageScore: 72.5, totalStudents: 240, atRiskStudents: 18 },
  { name: 'Electronics', passPercentage: 82, averageScore: 68.3, totalStudents: 180, atRiskStudents: 24 },
  { name: 'Mechanical', passPercentage: 79, averageScore: 65.8, totalStudents: 200, atRiskStudents: 32 },
  { name: 'Civil', passPercentage: 84, averageScore: 70.2, totalStudents: 160, atRiskStudents: 15 },
  { name: 'Business Admin', passPercentage: 91, averageScore: 75.4, totalStudents: 220, atRiskStudents: 12 },
];

export const mockCOAttainment: COAttainment[] = [
  { co: 'CO1', description: 'Apply fundamental concepts', attainment: 78, target: 70 },
  { co: 'CO2', description: 'Analyze complex problems', attainment: 65, target: 70 },
  { co: 'CO3', description: 'Design efficient solutions', attainment: 72, target: 70 },
  { co: 'CO4', description: 'Implement algorithms', attainment: 81, target: 70 },
  { co: 'CO5', description: 'Evaluate performance', attainment: 68, target: 70 },
];

export const mockBloomPerformance: BloomPerformance[] = [
  { level: 'Remember', percentage: 85, questionsAttempted: 12, totalQuestions: 14 },
  { level: 'Understand', percentage: 78, questionsAttempted: 10, totalQuestions: 12 },
  { level: 'Apply', percentage: 72, questionsAttempted: 8, totalQuestions: 10 },
  { level: 'Analyze', percentage: 65, questionsAttempted: 6, totalQuestions: 8 },
  { level: 'Evaluate', percentage: 58, questionsAttempted: 4, totalQuestions: 6 },
  { level: 'Create', percentage: 52, questionsAttempted: 3, totalQuestions: 5 },
];

export const mockStudentMarks: StudentMark[] = [
  { studentId: '1', studentName: 'Rahul Mehta', rollNumber: 'CS2021001', marks: { 'q1a': 8, 'q1b': 7, 'q2a': 9, 'q2b': 6, 'q3a': 8, 'q3b': 7 }, totalMarks: 45, selectedQuestions: ['q1', 'q2', 'q3'] },
  { studentId: '2', studentName: 'Priya Singh', rollNumber: 'CS2021002', marks: { 'q1a': 9, 'q1b': 8, 'q2a': 7, 'q2b': 8, 'q3a': 9, 'q3b': 8 }, totalMarks: 49, selectedQuestions: ['q1', 'q2', 'q3'] },
  { studentId: '3', studentName: 'Amit Kumar', rollNumber: 'CS2021003', marks: { 'q1a': 6, 'q1b': 5, 'q2a': 7, 'q2b': 6, 'q3a': 5, 'q3b': 6 }, totalMarks: 35, selectedQuestions: ['q1', 'q2', 'q3'] },
  { studentId: '4', studentName: 'Sneha Patel', rollNumber: 'CS2021004', marks: { 'q1a': 10, 'q1b': 9, 'q2a': 8, 'q2b': 9, 'q3a': 10, 'q3b': 8 }, totalMarks: 54, selectedQuestions: ['q1', 'q2', 'q3'] },
  { studentId: '5', studentName: 'Vikram Joshi', rollNumber: 'CS2021005', marks: { 'q1a': 7, 'q1b': 6, 'q2a': 8, 'q2b': 7, 'q3a': 7, 'q3b': 7 }, totalMarks: 42, selectedQuestions: ['q1', 'q2', 'q3'] },
];

export const examPerformanceData = [
  { name: 'Internal 1', average: 65, highest: 92, lowest: 28, passRate: 78 },
  { name: 'Internal 2', average: 71, highest: 95, lowest: 32, passRate: 84 },
];

export const coTrendData = [
  { semester: 'Sem 1', CO1: 72, CO2: 68, CO3: 75, CO4: 70, CO5: 65 },
  { semester: 'Sem 2', CO1: 75, CO2: 70, CO3: 78, CO4: 73, CO5: 68 },
  { semester: 'Sem 3', CO1: 78, CO2: 72, CO3: 80, CO4: 76, CO5: 71 },
  { semester: 'Sem 4', CO1: 80, CO2: 75, CO3: 82, CO4: 78, CO5: 74 },
];

export const bloomDistributionData = [
  { name: 'Remember', value: 25, color: 'hsl(var(--chart-1))' },
  { name: 'Understand', value: 22, color: 'hsl(var(--chart-2))' },
  { name: 'Apply', value: 20, color: 'hsl(var(--chart-3))' },
  { name: 'Analyze', value: 15, color: 'hsl(var(--chart-4))' },
  { name: 'Evaluate', value: 10, color: 'hsl(var(--chart-5))' },
  { name: 'Create', value: 8, color: 'hsl(var(--primary))' },
];
