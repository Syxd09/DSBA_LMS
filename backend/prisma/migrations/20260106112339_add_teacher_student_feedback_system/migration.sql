/*
  Warnings:

  - You are about to drop the column `newData` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `oldData` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `recordId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `tableName` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `entityId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Exam` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExamStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "ExamStatus" ADD VALUE 'COMPLETED';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "newData",
DROP COLUMN "oldData",
DROP COLUMN "recordId",
DROP COLUMN "tableName",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "oldValue" JSONB,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "customTypeName" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "examDate" TIMESTAMP(3),
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "passingMarks" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "StudentEnrollment" ADD COLUMN     "subjectId" TEXT;

-- CreateTable
CREATE TABLE "FeedbackTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "programId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackTemplateCategory" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION DEFAULT 1.0,

    CONSTRAINT "FeedbackTemplateCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherStudentFeedback" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "cohortId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "starRating" INTEGER NOT NULL,
    "reviewText" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherStudentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackCategoryRating" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "FeedbackCategoryRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAnalyticsCache" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "avgMarks" DOUBLE PRECISION NOT NULL,
    "marksBand" TEXT NOT NULL,
    "feedbackScore" DOUBLE PRECISION NOT NULL,
    "alignmentIndex" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "categoryInsights" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marksUpdatedAt" TIMESTAMP(3),
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FeedbackAnalyticsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackTemplate_departmentId_idx" ON "FeedbackTemplate"("departmentId");

-- CreateIndex
CREATE INDEX "FeedbackTemplate_programId_idx" ON "FeedbackTemplate"("programId");

-- CreateIndex
CREATE INDEX "FeedbackTemplate_isActive_idx" ON "FeedbackTemplate"("isActive");

-- CreateIndex
CREATE INDEX "FeedbackTemplateCategory_templateId_idx" ON "FeedbackTemplateCategory"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackTemplateCategory_templateId_displayOrder_key" ON "FeedbackTemplateCategory"("templateId", "displayOrder");

-- CreateIndex
CREATE INDEX "TeacherStudentFeedback_studentId_idx" ON "TeacherStudentFeedback"("studentId");

-- CreateIndex
CREATE INDEX "TeacherStudentFeedback_teacherId_idx" ON "TeacherStudentFeedback"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherStudentFeedback_subjectId_cohortId_semester_idx" ON "TeacherStudentFeedback"("subjectId", "cohortId", "semester");

-- CreateIndex
CREATE INDEX "TeacherStudentFeedback_status_idx" ON "TeacherStudentFeedback"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherStudentFeedback_teacherId_studentId_subjectId_semest_key" ON "TeacherStudentFeedback"("teacherId", "studentId", "subjectId", "semester", "cohortId");

-- CreateIndex
CREATE INDEX "FeedbackCategoryRating_feedbackId_idx" ON "FeedbackCategoryRating"("feedbackId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackCategoryRating_feedbackId_categoryId_key" ON "FeedbackCategoryRating"("feedbackId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackAnalyticsCache_feedbackId_key" ON "FeedbackAnalyticsCache"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackAnalyticsCache_isStale_idx" ON "FeedbackAnalyticsCache"("isStale");

-- CreateIndex
CREATE INDEX "FeedbackAnalyticsCache_feedbackId_idx" ON "FeedbackAnalyticsCache"("feedbackId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackTemplate" ADD CONSTRAINT "FeedbackTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackTemplate" ADD CONSTRAINT "FeedbackTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackTemplateCategory" ADD CONSTRAINT "FeedbackTemplateCategory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FeedbackTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentFeedback" ADD CONSTRAINT "TeacherStudentFeedback_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentFeedback" ADD CONSTRAINT "TeacherStudentFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentFeedback" ADD CONSTRAINT "TeacherStudentFeedback_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentFeedback" ADD CONSTRAINT "TeacherStudentFeedback_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentFeedback" ADD CONSTRAINT "TeacherStudentFeedback_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FeedbackTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentFeedback" ADD CONSTRAINT "TeacherStudentFeedback_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackCategoryRating" ADD CONSTRAINT "FeedbackCategoryRating_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "TeacherStudentFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackCategoryRating" ADD CONSTRAINT "FeedbackCategoryRating_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FeedbackTemplateCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAnalyticsCache" ADD CONSTRAINT "FeedbackAnalyticsCache_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "TeacherStudentFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
