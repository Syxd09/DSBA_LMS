-- CreateIndex
CREATE INDEX "COAttainment_subjectId_cohortId_semester_idx" ON "COAttainment"("subjectId", "cohortId", "semester");

-- CreateIndex
CREATE INDEX "COAttainment_coId_idx" ON "COAttainment"("coId");

-- CreateIndex
CREATE INDEX "COAttainment_status_idx" ON "COAttainment"("status");

-- CreateIndex
CREATE INDEX "SubQuestion_questionId_idx" ON "SubQuestion"("questionId");

-- CreateIndex
CREATE INDEX "SubQuestion_coId_idx" ON "SubQuestion"("coId");

-- CreateIndex
CREATE INDEX "SubQuestion_questionId_coId_idx" ON "SubQuestion"("questionId", "coId");
