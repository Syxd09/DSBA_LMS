/*
  Warnings:

  - A unique constraint covering the columns `[teacherId,subjectId,cohortId,semester,academicYear]` on the table `TeacherAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeacherAssignment_teacherId_subjectId_cohortId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_subjectId_cohortId_semester_aca_key" ON "TeacherAssignment"("teacherId", "subjectId", "cohortId", "semester", "academicYear");
