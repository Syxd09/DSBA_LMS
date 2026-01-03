-- DropIndex
DROP INDEX "StudentEnrollment_rollNumber_key";

-- AlterTable
ALTER TABLE "ProgramOutcome" ADD COLUMN     "targetPercent" DOUBLE PRECISION NOT NULL DEFAULT 60;
