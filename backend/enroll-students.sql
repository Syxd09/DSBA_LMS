-- Quick Student Enrollment Script
-- This will create 10 students and enroll them in the teacher's assigned cohorts

-- First, let's get the cohort IDs and department from teacher assignments
-- Based on the screenshot, the teacher has 3 assignments in Semester 1

-- Create 10 test students
INSERT INTO "User" (id, email, "fullName", password, role, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'student101@college.edu', 'Alice Johnson', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student102@college.edu', 'Bob Smith', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student103@college.edu', 'Charlie Brown', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student104@college.edu', 'Diana Prince', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student105@college.edu', 'Ethan Hunt', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student106@college.edu', 'Fiona Green', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student107@college.edu', 'George White', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student108@college.edu', 'Hannah Lee', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student109@college.edu', 'Ivan Petrov', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW()),
  (gen_random_uuid(), 'student110@college.edu', 'Julia Roberts', '$2a$10$rQ3pX7Qh5zKZxW8vY9nLPesRJYnJxS8xHxYKZxW8vY9nLPesRJYnJ', 'STUDENT', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Now enroll these students in the first cohort (Semester 1)
-- Get the first cohort ID from teacher assignments
WITH first_cohort AS (
  SELECT "cohortId", "departmentId"
  FROM "TeacherAssignment"
  WHERE semester = 1
  LIMIT 1
),
student_ids AS (
  SELECT id, email, 
         ROW_NUMBER() OVER (ORDER BY email) as rn
  FROM "User"
  WHERE email LIKE 'student10%@college.edu'
)
INSERT INTO "Enrollment" (
  id, 
  "studentId", 
  "cohortId", 
  "departmentId",
  semester, 
  "rollNumber", 
  status,
  "createdAt", 
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  s.id,
  c."cohortId",
  c."departmentId",
  1,
  'SEM1-' || LPAD(s.rn::text, 3, '0'),
  'active',
  NOW(),
  NOW()
FROM student_ids s
CROSS JOIN first_cohort c
ON CONFLICT DO NOTHING;

-- Enroll same students in the second cohort (if exists)
WITH second_cohort AS (
  SELECT "cohortId", "departmentId"
  FROM "TeacherAssignment"
  WHERE semester = 1
  OFFSET 1 LIMIT 1
),
student_ids AS (
  SELECT id, email, 
         ROW_NUMBER() OVER (ORDER BY email) as rn
  FROM "User"
  WHERE email LIKE 'student10%@college.edu'
)
INSERT INTO "Enrollment" (
  id, 
  "studentId", 
  "cohortId", 
  "departmentId",
  semester, 
  "rollNumber", 
  status,
  "createdAt", 
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  s.id,
  c."cohortId",
  c."departmentId",
  1,
  'SEM1-' || LPAD((s.rn + 10)::text, 3, '0'),
  'active',
  NOW(),
  NOW()
FROM student_ids s
CROSS JOIN second_cohort c
WHERE c."cohortId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enroll same students in the third cohort (if exists)
WITH third_cohort AS (
  SELECT "cohortId", "departmentId"
  FROM "TeacherAssignment"
  WHERE semester = 1
  OFFSET 2 LIMIT 1
),
student_ids AS (
  SELECT id, email, 
         ROW_NUMBER() OVER (ORDER BY email) as rn
  FROM "User"
  WHERE email LIKE 'student10%@college.edu'
)
INSERT INTO "Enrollment" (
  id, 
  "studentId", 
  "cohortId", 
  "departmentId",
  semester, 
  "rollNumber", 
  status,
  "createdAt", 
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  s.id,
  c."cohortId",
  c."departmentId",
  1,
  'SEM1-' || LPAD((s.rn + 20)::text, 3, '0'),
  'active',
  NOW(),
  NOW()
FROM student_ids s
CROSS JOIN third_cohort c
WHERE c."cohortId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verify the enrollments
SELECT 
  COUNT(*) as total_enrollments,
  semester,
  c.name as cohort_name
FROM "Enrollment" e
LEFT JOIN "Cohort" c ON e."cohortId" = c.id
GROUP BY semester, c.name
ORDER BY semester, c.name;
