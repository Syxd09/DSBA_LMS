/*
  Warnings:

  - Added the required column `semester` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marksObtained` to the `StudentMark` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "semester" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "StudentMark" ADD COLUMN     "marksObtained" DOUBLE PRECISION NOT NULL;
