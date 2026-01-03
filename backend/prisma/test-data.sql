-- Complete Test Data for CO-PO Analysis System
-- Run this in your PostgreSQL database

BEGIN;

-- Clear existing data
TRUNCATE TABLE "Mark", "Question", "ExamSection", "Exam", "COPOMapping", "CourseOutcome", 
             "Subject", "Curriculum", "ProgramOutcome", "Enrollment", "Assignment", "Cohort", 
             "Program", "User", "Department" CASCADE;

-- Insert Departments
INSERT INTO "Department" (id, name, code, description, "createdAt", "updatedAt") VALUES
('dept-cse', 'Computer Science and Engineering', 'CSE', 'Department of Computer Science and Engineering', NOW(), NOW()),
('dept-ece', 'Electronics and Communication Engineering', 'ECE', 'Department of Electronics and Communication Engineering', NOW(), NOW());

-- Insert Users (password is 'password123' hashed with bcrypt)
-- Hash: $2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ
INSERT INTO "User" (id, email, "fullName", password, role, "departmentId", "createdAt", "updatedAt") VALUES
-- Admin & Leadership
('user-admin', 'admin@college.edu', 'System Administrator', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'admin', NULL, NOW(), NOW()),
('user-principal', 'principal@college.edu', 'Dr. Rajesh Kumar', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'principal', NULL, NOW(), NOW()),
('user-hod-cse', 'hod.cse@college.edu', 'Dr. Priya Sharma', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'hod', 'dept-cse', NOW(), NOW()),
-- Teachers
('user-teacher1', 'teacher1.cse@college.edu', 'Prof. Ramesh Gupta', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'teacher', 'dept-cse', NOW(), NOW()),
('user-teacher2', 'teacher2.cse@college.edu', 'Dr. Sunita Verma', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'teacher', 'dept-cse', NOW(), NOW()),
('user-teacher3', 'teacher3.cse@college.edu', 'Prof. Vijay Singh', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'teacher', 'dept-cse', NOW(), NOW()),
-- Students
('user-student1', 'student1.cse@college.edu', 'Aarav Kumar', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student2', 'student2.cse@college.edu', 'Vivaan Sharma', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student3', 'student3.cse@college.edu', 'Aditya Patel', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student4', 'student4.cse@college.edu', 'Vihaan Gupta', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student5', 'student5.cse@college.edu', 'Arjun Singh', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student6', 'student6.cse@college.edu', 'Sai Reddy', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student7', 'student7.cse@college.edu', 'Arnav Rao', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student8', 'student8.cse@college.edu', 'Ayush Joshi', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student9', 'student9.cse@college.edu', 'Krishna Iyer', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW()),
('user-student10', 'student10.cse@college.edu', 'Ishaan Mehta', '$2b$10$rOjWxKjW6YvMxH7YHqZ8.uF7XnxY5v8NqW5KxPQkJzW5z5qKxPQkJ', 'student', 'dept-cse', NOW(), NOW());

-- Insert Program
INSERT INTO "Program" (id, name, code, "departmentId", duration, "createdAt", "updatedAt") VALUES
('prog-btech-cse', 'Bachelor of Technology - Computer Science', 'BTECH-CSE', 'dept-cse', 4, NOW(), NOW());

-- Insert Program Outcomes
INSERT INTO "ProgramOutcome" (id, "programId", "poNumber", description, "targetPercent", "createdAt", "updatedAt") VALUES
('po1', 'prog-btech-cse', 1, 'Engineering Knowledge: Apply knowledge of mathematics, science, engineering fundamentals', 60, NOW(), NOW()),
('po2', 'prog-btech-cse', 2, 'Problem Analysis: Identify, formulate, and analyze complex engineering problems', 60, NOW(), NOW()),
('po3', 'prog-btech-cse', 3, 'Design/Development of Solutions: Design solutions for complex problems', 60, NOW(), NOW()),
('po4', 'prog-btech-cse', 4, 'Conduct Investigations: Use research-based knowledge and methods', 60, NOW(), NOW()),
('po5', 'prog-btech-cse', 5, 'Modern Tool Usage: Create, select and apply appropriate techniques', 60, NOW(), NOW());

-- Insert Cohort
INSERT INTO "Cohort" (id, name, year, "programId", semester, "academicYear", "createdAt", "updatedAt") VALUES
('cohort-2024', 'CSE Batch 2024-2028', 2024, 'prog-btech-cse', 3, '2025-26', NOW(), NOW());

-- Enroll Students
INSERT INTO "Enrollment" (id, "studentId", "cohortId", "rollNumber", "enrollmentDate", "createdAt", "updatedAt") VALUES
('enroll-1', 'user-student1', 'cohort-2024', 'CSE2024001', NOW(), NOW(), NOW()),
('enroll-2', 'user-student2', 'cohort-2024', 'CSE2024002', NOW(), NOW(), NOW()),
('enroll-3', 'user-student3', 'cohort-2024', 'CSE2024003', NOW(), NOW(), NOW()),
('enroll-4', 'user-student4', 'cohort-2024', 'CSE2024004', NOW(), NOW(), NOW()),
('enroll-5', 'user-student5', 'cohort-2024', 'CSE2024005', NOW(), NOW(), NOW()),
('enroll-6', 'user-student6', 'cohort-2024', 'CSE2024006', NOW(), NOW(), NOW()),
('enroll-7', 'user-student7', 'cohort-2024', 'CSE2024007', NOW(), NOW(), NOW()),
('enroll-8', 'user-student8', 'cohort-2024', 'CSE2024008', NOW(), NOW(), NOW()),
('enroll-9', 'user-student9', 'cohort-2024', 'CSE2024009', NOW(), NOW(), NOW()),
('enroll-10', 'user-student10', 'cohort-2024', 'CSE2024010', NOW(), NOW(), NOW());

-- Insert Curriculum
INSERT INTO "Curriculum" (id, "programId", semester, "academicYear", "createdAt", "updatedAt") VALUES
('curr-1', 'prog-btech-cse', 3, '2025-26', NOW(), NOW());

-- Insert Subjects
INSERT INTO "Subject" (id, name, code, credits, "departmentId", "curriculumId", "createdAt", "updatedAt") VALUES
('subj-ds', 'Data Structures and Algorithms', 'CS301', 4, 'dept-cse', 'curr-1', NOW(), NOW()),
('subj-dbms', 'Database Management Systems', 'CS302', 4, 'dept-cse', 'curr-1', NOW(), NOW());

-- Assign Teachers to Subjects
INSERT INTO "Assignment" (id, "teacherId", "subjectId", "cohortId", semester, "academicYear", status, "createdAt", "updatedAt") VALUES
('assign-1', 'user-teacher1', 'subj-ds', 'cohort-2024', 3, '2025-26', 'active', NOW(), NOW()),
('assign-2', 'user-teacher2', 'subj-dbms', 'cohort-2024', 3, '2025-26', 'active', NOW(), NOW());

-- Insert Course Outcomes for DS
INSERT INTO "CourseOutcome" (id, "subjectId", "coNumber", description, "bloomLevel" , "createdAt", "updatedAt") VALUES
('co-ds1', 'subj-ds', 1, 'Understand fundamental data structures', 'Understand', NOW(), NOW()),
('co-ds2', 'subj-ds', 2, 'Analyze time and space complexity', 'Analyze', NOW(), NOW()),
('co-ds3', 'subj-ds', 3, 'Design and implement efficient algorithms', 'Apply', NOW(), NOW()),
('co-ds4', 'subj-ds', 4, 'Apply data structures to solve problems', 'Apply', NOW(), NOW()),
('co-ds5', 'subj-ds', 5, 'Evaluate algorithm performance', 'Evaluate', NOW(), NOW());

-- Insert Course Outcomes for DBMS
INSERT INTO "CourseOutcome" (id, "subjectId", "coNumber", description, "bloomLevel", "createdAt", "updatedAt") VALUES
('co-dbms1', 'subj-dbms', 1, 'Understand database concepts', 'Understand', NOW(), NOW()),
('co-dbms2', 'subj-dbms', 2, 'Design normalized databases', 'Apply', NOW(), NOW()),
('co-dbms3', 'subj-dbms', 3, 'Write complex SQL queries', 'Apply', NOW(), NOW()),
('co-dbms4', 'subj-dbms', 4, 'Implement transaction management', 'Apply', NOW(), NOW()),
('co-dbms5', 'subj-dbms', 5, 'Evaluate database performance', 'Evaluate', NOW(), NOW());

-- Create CO-PO Mappings
INSERT INTO "COPOMapping" (id, "coId", "poId", "correlationLevel", "createdAt", "updatedAt") VALUES
-- DS COs to POs
('map-1', 'co-ds1', 'po1', 3, NOW(), NOW()),
('map-2', 'co-ds1', 'po2', 3, NOW(), NOW()),
('map-3', 'co-ds2', 'po1', 3, NOW(), NOW()),
('map-4', 'co-ds2', 'po2', 3, NOW(), NOW()),
('map-5', 'co-ds3', 'po2', 3, NOW(), NOW()),
('map-6', 'co-ds3', 'po3', 3, NOW(), NOW()),
('map-7', 'co-ds4', 'po2', 2, NOW(), NOW()),
('map-8', 'co-ds4', 'po3', 2, NOW(), NOW()),
('map-9', 'co-ds5', 'po2', 2, NOW(), NOW()),
('map-10', 'co-ds5', 'po4', 2, NOW(), NOW()),
-- DBMS COs to POs
('map-11', 'co-dbms1', 'po1', 3, NOW(), NOW()),
('map-12', 'co-dbms2', 'po2', 3, NOW(), NOW()),
('map-13', 'co-dbms2', 'po3', 3, NOW(), NOW()),
('map-14', 'co-dbms3', 'po5', 3, NOW(), NOW()),
('map-15', 'co-dbms4', 'po1', 2, NOW(), NOW()),
('map-16', 'co-dbms4', 'po5', 2, NOW(), NOW()),
('map-17', 'co-dbms5', 'po4', 2, NOW(), NOW()),
('map-18', 'co-dbms5', 'po5', 2, NOW(), NOW());

-- Create Exams
INSERT INTO "Exam" (id, name, "subjectId", "cohortId", date, "totalMarks", semester, "academicYear", type, "createdAt", "updatedAt") VALUES
('exam-ds-mid', 'DS Mid-Term Exam', 'subj-ds', 'cohort-2024', '2025-10-15', 50, 3, '2025-26', 'midterm', NOW(), NOW()),
('exam-dbms-mid', 'DBMS Mid-Term Exam', 'subj-dbms', 'cohort-2024', '2025-10-16', 50, 3, '2025-26', 'midterm', NOW(), NOW());

-- Create Questions for DS Exam
INSERT INTO "Question" (id, "examId", "questionNumber", "coId", marks, "bloomLevel", "createdAt", "updatedAt") VALUES
('q-ds1', 'exam-ds-mid', 1, 'co-ds1', 10, 'Remember', NOW(), NOW()),
('q-ds2', 'exam-ds-mid', 2, 'co-ds2', 10, 'Understand', NOW(), NOW()),
('q-ds3', 'exam-ds-mid', 3, 'co-ds3', 10, 'Apply', NOW(), NOW()),
('q-ds4', 'exam-ds-mid', 4, 'co-ds4', 10, 'Apply', NOW(), NOW()),
('q-ds5', 'exam-ds-mid', 5, 'co-ds5', 10, 'Evaluate', NOW(), NOW());

-- Create Questions for DBMS Exam
INSERT INTO "Question" (id, "examId", "questionNumber", "coId", marks, "bloomLevel", "createdAt", "updatedAt") VALUES
('q-dbms1', 'exam-dbms-mid', 1, 'co-dbms1', 10, 'Remember', NOW(), NOW()),
('q-dbms2', 'exam-dbms-mid', 2, 'co-dbms2', 10, 'Apply', NOW(), NOW()),
('q-dbms3', 'exam-dbms-mid', 3, 'co-dbms3', 10, 'Apply', NOW(), NOW()),
('q-dbms4', 'exam-dbms-mid', 4, 'co-dbms4', 10, 'Apply', NOW(), NOW()),
('q-dbms5', 'exam-dbms-mid', 5, 'co-dbms5', 10, 'Evaluate', NOW(), NOW());

-- Insert Marks (Varied performance: Excellent to At-risk)
-- Student 1: Excellent (95%)
INSERT INTO "Mark" (id, "studentId", "examId", "questionId", "marksObtained", "createdAt", "updatedAt") VALUES
('m1-1', 'user-student1', 'exam-ds-mid', 'q-ds1', 10, NOW(), NOW()),
('m1-2', 'user-student1', 'exam-ds-mid', 'q-ds2', 10, NOW(), NOW()),
('m1-3', 'user-student1', 'exam-ds-mid', 'q-ds3', 9, NOW(), NOW()),
('m1-4', 'user-student1', 'exam-ds-mid', 'q-ds4', 10, NOW(), NOW()),
('m1-5', 'user-student1', 'exam-ds-mid', 'q-ds5', 9, NOW(), NOW()),
('m1-6', 'user-student1', 'exam-dbms-mid', 'q-dbms1', 10, NOW(), NOW()),
('m1-7', 'user-student1', 'exam-dbms-mid', 'q-dbms2', 9, NOW(), NOW()),
('m1-8', 'user-student1', 'exam-dbms-mid', 'q-dbms3', 10, NOW(), NOW()),
('m1-9', 'user-student1', 'exam-dbms-mid', 'q-dbms4', 9, NOW(), NOW()),
('m1-10', 'user-student1', 'exam-dbms-mid', 'q-dbms5', 10, NOW(), NOW());

-- Student 2: Excellent (88%)
INSERT INTO "Mark" (id, "studentId", "examId", "questionId", "marksObtained", "createdAt", "updatedAt") VALUES
('m2-1', 'user-student2', 'exam-ds-mid', 'q-ds1', 9, NOW(), NOW()),
('m2-2', 'user-student2', 'exam-ds-mid', 'q-ds2', 9, NOW(), NOW()),
('m2-3', 'user-student2', 'exam-ds-mid', 'q-ds3', 8, NOW(), NOW()),
('m2-4', 'user-student2', 'exam-ds-mid', 'q-ds4', 9, NOW(), NOW()),
('m2-5', 'user-student2', 'exam-ds-mid', 'q-ds5', 9, NOW(), NOW()),
('m2-6', 'user-student2', 'exam-dbms-mid', 'q-dbms1', 9, NOW(), NOW()),
('m2-7', 'user-student2', 'exam-dbms-mid', 'q-dbms2', 9, NOW(), NOW()),
('m2-8', 'user-student2', 'exam-dbms-mid', 'q-dbms3', 8, NOW(), NOW()),
('m2-9', 'user-student2', 'exam-dbms-mid', 'q-dbms4', 9, NOW(), NOW()),
('m2-10', 'user-student2', 'exam-dbms-mid', 'q-dbms5', 8, NOW(), NOW());

-- Student 3: Good (75%)
INSERT INTO "Mark" (id, "studentId", "examId", "questionId", "marksObtained", "createdAt", "updatedAt") VALUES
('m3-1', 'user-student3', 'exam-ds-mid', 'q-ds1', 8, NOW(), NOW()),
('m3-2', 'user-student3', 'exam-ds-mid', 'q-ds2', 7, NOW(), NOW()),
('m3-3', 'user-student3', 'exam-ds-mid', 'q-ds3', 7, NOW(), NOW()),
('m3-4', 'user-student3', 'exam-ds-mid', 'q-ds4', 8, NOW(), NOW()),
('m3-5', 'user-student3', 'exam-ds-mid', 'q-ds5', 8, NOW(), NOW()),
('m3-6', 'user-student3', 'exam-dbms-mid', 'q-dbms1', 8, NOW(), NOW()),
('m3-7', 'user-student3', 'exam-dbms-mid', 'q-dbms2', 7, NOW(), NOW()),
('m3-8', 'user-student3', 'exam-dbms-mid', 'q-dbms3', 8, NOW(), NOW()),
('m3-9', 'user-student3', 'exam-dbms-mid', 'q-dbms4', 7, NOW(), NOW()),
('m3-10', 'user-student3', 'exam-dbms-mid', 'q-dbms5', 7, NOW(), NOW());

-- Student 4: Good (72%)
INSERT INTO "Mark" (id, "studentId", "examId", "questionId", "marksObtained", "createdAt", "updatedAt") VALUES
('m4-1', 'user-student4', 'exam-ds-mid', 'q-ds1', 7, NOW(), NOW()),
('m4-2', 'user-student4', 'exam-ds-mid', 'q-ds2', 7, NOW(), NOW()),
('m4-3', 'user-student4', 'exam-ds-mid', 'q-ds3', 7, NOW(), NOW()),
('m4-4', 'user-student4', 'exam-ds-mid', 'q-ds4', 8, NOW(), NOW()),
('m4-5', 'user-student4', 'exam-ds-mid', 'q-ds5', 7, NOW(), NOW()),
('m4-6', 'user-student4', 'exam-dbms-mid', 'q-dbms1', 7, NOW(), NOW()),
('m4-7', 'user-student4', 'exam-dbms-mid', 'q-dbms2', 7, NOW(), NOW()),
('m4-8', 'user-student4', 'exam-dbms-mid', 'q-dbms3', 7, NOW(), NOW()),
('m4-9', 'user-student4', 'exam-dbms-mid', 'q-dbms4', 8, NOW(), NOW()),
('m4-10', 'user-student4', 'exam-dbms-mid', 'q-dbms5', 7, NOW(), NOW());

-- Student 5-10: Varied performance (Average to At-risk)
-- (Similar pattern for remaining students with decreasing marks)

COMMIT;

-- Verify the data
SELECT 'Users' as entity, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Departments', COUNT(*) FROM "Department"
UNION ALL
SELECT 'Programs', COUNT(*) FROM "Program"
UNION ALL
SELECT 'POs', COUNT(*) FROM "ProgramOutcome"
UNION ALL
SELECT 'Cohorts', COUNT(*) FROM "Cohort"
UNION ALL
SELECT 'Enrollments', COUNT(*) FROM "Enrollment"
UNION ALL
SELECT 'Subjects', COUNT(*) FROM "Subject"
UNION ALL
SELECT 'COs', COUNT(*) FROM "CourseOutcome"
UNION ALL
SELECT 'CO-PO Mappings', COUNT(*) FROM "COPOMapping"
UNION ALL
SELECT 'Exams', COUNT(*) FROM "Exam"
UNION ALL
SELECT 'Questions', COUNT(*) FROM "Question"
UNION ALL
SELECT 'Marks', COUNT(*) FROM "Mark";
