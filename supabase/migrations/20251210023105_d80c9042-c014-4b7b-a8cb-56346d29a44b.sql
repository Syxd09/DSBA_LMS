-- Add grading_rules table for department-specific grading
CREATE TABLE IF NOT EXISTS public.grading_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  min_percentage DECIMAL(5,2) NOT NULL,
  max_percentage DECIMAL(5,2) NOT NULL,
  grade VARCHAR(5) NOT NULL,
  grade_point DECIMAL(4,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (department_id, grade)
);

-- Add final_marks table for aggregated student marks
CREATE TABLE IF NOT EXISTS public.final_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id),
  cohort_id UUID REFERENCES public.cohorts(id),
  internal_1 DECIMAL(5,2) DEFAULT 0,
  internal_2 DECIMAL(5,2) DEFAULT 0,
  best_internal DECIMAL(5,2) DEFAULT 0,
  external_marks DECIMAL(5,2) DEFAULT 0,
  total_marks DECIMAL(5,2) DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  grade VARCHAR(5),
  grade_point DECIMAL(4,2),
  co_attainment JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft',
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (student_id, subject_id, cohort_id)
);

-- Add semester_results for SGPA/CGPA tracking
CREATE TABLE IF NOT EXISTS public.semester_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  cohort_id UUID REFERENCES public.cohorts(id),
  semester INTEGER NOT NULL,
  total_credits DECIMAL(5,2) DEFAULT 0,
  earned_credits DECIMAL(5,2) DEFAULT 0,
  sgpa DECIMAL(4,2) DEFAULT 0,
  cgpa DECIMAL(4,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (student_id, cohort_id, semester)
);

-- Add department_settings for internal calculation method
CREATE TABLE IF NOT EXISTS public.department_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE UNIQUE,
  internal_method VARCHAR(20) DEFAULT 'best',
  internal_weight DECIMAL(4,2) DEFAULT 0.40,
  external_weight DECIMAL(4,2) DEFAULT 0.60,
  pass_percentage DECIMAL(5,2) DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add bulk_uploads table for tracking uploads
CREATE TABLE IF NOT EXISTS public.bulk_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_type VARCHAR(50) NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by UUID,
  total_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.grading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for grading_rules
CREATE POLICY "Grading rules viewable by all" ON public.grading_rules FOR SELECT USING (true);
CREATE POLICY "Principals and HODs can manage grading rules" ON public.grading_rules FOR ALL 
  USING (has_role(auth.uid(), 'principal') OR has_role(auth.uid(), 'hod'));

-- RLS policies for final_marks
CREATE POLICY "Final marks viewable appropriately" ON public.final_marks FOR SELECT 
  USING (
    student_id = auth.uid() OR 
    has_role(auth.uid(), 'teacher') OR 
    has_role(auth.uid(), 'hod') OR 
    has_role(auth.uid(), 'principal')
  );
CREATE POLICY "Staff can manage final marks" ON public.final_marks FOR ALL 
  USING (
    has_role(auth.uid(), 'teacher') OR 
    has_role(auth.uid(), 'hod') OR 
    has_role(auth.uid(), 'principal')
  );

-- RLS policies for semester_results
CREATE POLICY "Semester results viewable appropriately" ON public.semester_results FOR SELECT 
  USING (
    student_id = auth.uid() OR 
    has_role(auth.uid(), 'teacher') OR 
    has_role(auth.uid(), 'hod') OR 
    has_role(auth.uid(), 'principal')
  );
CREATE POLICY "Staff can manage semester results" ON public.semester_results FOR ALL 
  USING (has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'principal'));

-- RLS policies for department_settings
CREATE POLICY "Department settings viewable by all" ON public.department_settings FOR SELECT USING (true);
CREATE POLICY "Principals and HODs can manage department settings" ON public.department_settings FOR ALL 
  USING (has_role(auth.uid(), 'principal') OR has_role(auth.uid(), 'hod'));

-- RLS policies for bulk_uploads
CREATE POLICY "Bulk uploads viewable by staff" ON public.bulk_uploads FOR SELECT 
  USING (
    has_role(auth.uid(), 'teacher') OR 
    has_role(auth.uid(), 'hod') OR 
    has_role(auth.uid(), 'principal')
  );
CREATE POLICY "Staff can create bulk uploads" ON public.bulk_uploads FOR INSERT 
  WITH CHECK (
    has_role(auth.uid(), 'teacher') OR 
    has_role(auth.uid(), 'hod') OR 
    has_role(auth.uid(), 'principal')
  );

-- Insert default grading rules (can be customized per department)
INSERT INTO public.grading_rules (department_id, min_percentage, max_percentage, grade, grade_point) VALUES
  (NULL, 90, 100, 'A+', 10),
  (NULL, 80, 89.99, 'A', 9),
  (NULL, 70, 79.99, 'B+', 8),
  (NULL, 60, 69.99, 'B', 7),
  (NULL, 50, 59.99, 'C+', 6),
  (NULL, 45, 49.99, 'C', 5),
  (NULL, 40, 44.99, 'D', 4),
  (NULL, 0, 39.99, 'F', 0);