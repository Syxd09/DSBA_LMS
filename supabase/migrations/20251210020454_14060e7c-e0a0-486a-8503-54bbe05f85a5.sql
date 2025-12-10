-- Add INSERT, UPDATE, DELETE policies for questions table (for teachers managing their exams)
CREATE POLICY "Teachers can manage questions for their exam sections"
ON public.questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM exam_sections es
    JOIN exams e ON e.id = es.exam_id
    WHERE es.id = questions.section_id
    AND (e.teacher_id = auth.uid() OR has_role(auth.uid(), 'principal'))
  )
);

-- Add INSERT, UPDATE, DELETE policies for sub_questions table
CREATE POLICY "Teachers can manage sub_questions for their exam questions"
ON public.sub_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM questions q
    JOIN exam_sections es ON es.id = q.section_id
    JOIN exams e ON e.id = es.exam_id
    WHERE q.id = sub_questions.question_id
    AND (e.teacher_id = auth.uid() OR has_role(auth.uid(), 'principal'))
  )
);