-- SQL to assign COs to Data Structures exam sub-questions
-- Run this in Prisma Studio or pgAdmin

-- Step 1: Get exam ID and CO IDs
WITH exam_info AS (
  SELECT e.id as exam_id, e."subjectId" 
  FROM "Exam" e
  JOIN "Subject" s ON e."subjectId" = s.id
  WHERE s.code = 'CS23'
  LIMIT 1
),
cos AS (
  SELECT id, "coNumber", code
  FROM "CourseOutcome"
  WHERE "subjectId" = (SELECT "subjectId" FROM exam_info)
  ORDER BY "coNumber"
),
subqs AS (
  SELECT sq.id, sq.code, 
         ROW_NUMBER() OVER (ORDER BY q."sectionId", q.number, sq.number) as rn
  FROM "SubQuestion" sq
  JOIN "Question" q ON sq."questionId" = q.id
  JOIN "Section" s ON q."sectionId" = s.id
  WHERE s."examId" = (SELECT exam_id FROM exam_info)
)
UPDATE "SubQuestion" sq
SET "coId" = (
  SELECT co.id 
  FROM cos
  WHERE co."coNumber" = ((subqs.rn - 1) % (SELECT COUNT(*) FROM cos)) + 1
)
FROM subqs
WHERE sq.id = subqs.id;

-- Verify the update
SELECT sq.code, co.code as co_code
FROM "SubQuestion" sq
LEFT JOIN "CourseOutcome" co ON sq."coId" = co.id
JOIN "Question" q ON sq."questionId" = q.id
JOIN "Section" s ON q."sectionId" = s.id
JOIN "Exam" e ON s."examId" = e.id
JOIN "Subject" sub ON e."subjectId" = sub.id
WHERE sub.code = 'CS23';
