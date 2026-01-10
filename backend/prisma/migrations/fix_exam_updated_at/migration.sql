-- Fix Exam.updatedAt constraint
ALTER TABLE "Exam" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "Exam" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
