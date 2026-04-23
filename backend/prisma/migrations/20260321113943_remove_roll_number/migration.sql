/*
  Warnings:

  - You are about to drop the column `weight` on the `FeedbackTemplateCategory` table. All the data in the column will be lost.
  - You are about to drop the column `rollNumber` on the `StudentEnrollment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[registrationNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `question` to the `FeedbackTemplateCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FeedbackTemplateCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FeedbackTemplateCategory" DROP COLUMN "weight",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "question" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "StudentEnrollment" DROP COLUMN "rollNumber";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "registrationNumber" TEXT;

-- CreateTable
CREATE TABLE "FeedbackCategoryOption" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackCategoryOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackCategoryOption_categoryId_order_idx" ON "FeedbackCategoryOption"("categoryId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "User_registrationNumber_key" ON "User"("registrationNumber");

-- AddForeignKey
ALTER TABLE "FeedbackCategoryOption" ADD CONSTRAINT "FeedbackCategoryOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FeedbackTemplateCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
