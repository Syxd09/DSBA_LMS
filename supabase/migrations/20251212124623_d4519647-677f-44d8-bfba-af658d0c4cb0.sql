-- Allow principals and HODs to manage student enrollments
CREATE POLICY "Principals and HODs can manage enrollments"
ON public.student_enrollments
FOR ALL
USING (has_role(auth.uid(), 'principal'::app_role) OR has_role(auth.uid(), 'hod'::app_role));

-- Allow HODs to view all user roles
CREATE POLICY "HODs can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'hod'::app_role));

-- Allow principals and HODs to manage course outcomes
CREATE POLICY "Principals and HODs can manage course outcomes"
ON public.course_outcomes
FOR ALL
USING (has_role(auth.uid(), 'principal'::app_role) OR has_role(auth.uid(), 'hod'::app_role));

-- Allow teachers to manage course outcomes for their subjects
CREATE POLICY "Teachers can manage their course outcomes"
ON public.course_outcomes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM teacher_assignments ta
    WHERE ta.teacher_id = auth.uid()
    AND ta.subject_id = course_outcomes.subject_id
  )
);

-- Allow teachers to insert marks for bulk computed marks
CREATE POLICY "Teachers can manage computed marks"
ON public.marks_computed
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM exams e
    WHERE e.id = marks_computed.exam_id
    AND e.teacher_id = auth.uid()
  ) OR has_role(auth.uid(), 'principal'::app_role) OR has_role(auth.uid(), 'hod'::app_role)
);

-- Allow viewing CO-PO mappings to all staff
CREATE POLICY "Staff can manage CO-PO mappings"
ON public.co_po_mappings
FOR ALL
USING (has_role(auth.uid(), 'principal'::app_role) OR has_role(auth.uid(), 'hod'::app_role));