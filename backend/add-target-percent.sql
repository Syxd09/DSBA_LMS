-- Add targetPercent column to ProgramOutcome table
ALTER TABLE "ProgramOutcome" 
ADD COLUMN IF NOT EXISTS "targetPercent" DOUBLE PRECISION NOT NULL DEFAULT 60;
