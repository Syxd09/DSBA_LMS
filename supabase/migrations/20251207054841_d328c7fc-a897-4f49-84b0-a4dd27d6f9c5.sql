-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('principal', 'hod', 'teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  hod_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create programs table (e.g., BCA, BBA)
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  duration_years INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cohorts/batches table
CREATE TABLE public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  year INT NOT NULL,
  name TEXT NOT NULL,
  current_semester INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, year)
);

-- Create curriculum_versions table
CREATE TABLE public.curriculum_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  effective_from INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  credits INT NOT NULL DEFAULT 3,
  semester INT NOT NULL,
  curriculum_version_id UUID REFERENCES public.curriculum_versions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create course_outcomes table (COs)
CREATE TABLE public.course_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  co_number INT NOT NULL,
  description TEXT NOT NULL,
  bloom_level TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, co_number)
);

-- Create program_outcomes table (POs)
CREATE TABLE public.program_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  po_number INT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, po_number)
);

-- Create CO-PO mapping table
CREATE TABLE public.co_po_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  co_id UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES public.program_outcomes(id) ON DELETE CASCADE,
  correlation_level INT NOT NULL CHECK (correlation_level BETWEEN 1 AND 3),
  UNIQUE(co_id, po_id)
);

-- Create exams table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('internal1', 'internal2')),
  max_marks INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'locked')),
  teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(subject_id, cohort_id, exam_type)
);

-- Create exam_sections table
CREATE TABLE public.exam_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence INT NOT NULL,
  required_questions INT NOT NULL DEFAULT 1,
  selection_mode TEXT NOT NULL DEFAULT 'FIRST_N' CHECK (selection_mode IN ('FIRST_N', 'BEST_N')),
  max_marks INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create questions table (metadata only)
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
  sequence INT NOT NULL,
  max_marks INT NOT NULL,
  co_id UUID REFERENCES public.course_outcomes(id),
  bloom_level TEXT NOT NULL CHECK (bloom_level IN ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create')),
  is_optional BOOLEAN NOT NULL DEFAULT false,
  group_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sub_questions table
CREATE TABLE public.sub_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  max_marks INT NOT NULL,
  co_id UUID REFERENCES public.course_outcomes(id),
  bloom_level TEXT NOT NULL CHECK (bloom_level IN ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create student_enrollments table
CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  roll_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'detained', 'graduated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, cohort_id),
  UNIQUE(roll_number)
);

-- Create student_marks table (per sub-question)
CREATE TABLE public.student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_question_id UUID NOT NULL REFERENCES public.sub_questions(id) ON DELETE CASCADE,
  marks DECIMAL(5,2) NOT NULL,
  entered_by UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id, sub_question_id)
);

-- Create marks_computed table (final computed marks after selection)
CREATE TABLE public.marks_computed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_marks DECIMAL(5,2) NOT NULL,
  selected_questions JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Create exam_snapshots table (immutable records)
CREATE TABLE public.exam_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create teacher_assignments table
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id, cohort_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks_computed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profile updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: Users can view all profiles, update their own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- User roles: Only principals can manage, users can view their own
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'principal'));

CREATE POLICY "Principals can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Departments: Viewable by all authenticated, managed by principal
CREATE POLICY "Departments viewable by all"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Principals can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Programs: Viewable by all authenticated
CREATE POLICY "Programs viewable by all"
  ON public.programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Principals can manage programs"
  ON public.programs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Cohorts: Viewable by all authenticated
CREATE POLICY "Cohorts viewable by all"
  ON public.cohorts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Principals and HODs can manage cohorts"
  ON public.cohorts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'hod'));

-- Subjects: Viewable by all authenticated
CREATE POLICY "Subjects viewable by all"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Principals can manage subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'hod'));

-- Curriculum versions: Viewable by all
CREATE POLICY "Curriculum versions viewable by all"
  ON public.curriculum_versions FOR SELECT
  TO authenticated
  USING (true);

-- Course outcomes: Viewable by all
CREATE POLICY "Course outcomes viewable by all"
  ON public.course_outcomes FOR SELECT
  TO authenticated
  USING (true);

-- Program outcomes: Viewable by all
CREATE POLICY "Program outcomes viewable by all"
  ON public.program_outcomes FOR SELECT
  TO authenticated
  USING (true);

-- CO-PO mappings: Viewable by all
CREATE POLICY "CO-PO mappings viewable by all"
  ON public.co_po_mappings FOR SELECT
  TO authenticated
  USING (true);

-- Exams: Teachers can manage their own, others can view
CREATE POLICY "Exams viewable by authenticated users"
  ON public.exams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage their exams"
  ON public.exams FOR ALL
  TO authenticated
  USING (
    teacher_id = auth.uid() 
    OR public.has_role(auth.uid(), 'principal') 
    OR public.has_role(auth.uid(), 'hod')
  );

-- Exam sections: Same as exams
CREATE POLICY "Exam sections viewable by all"
  ON public.exam_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage exam sections"
  ON public.exam_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = exam_id AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'principal'))
    )
  );

-- Questions: Same access as exam sections
CREATE POLICY "Questions viewable by all"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

-- Sub-questions: Same access
CREATE POLICY "Sub-questions viewable by all"
  ON public.sub_questions FOR SELECT
  TO authenticated
  USING (true);

-- Student enrollments: Students can view their own, staff can view all
CREATE POLICY "Enrollments viewable by all authenticated"
  ON public.student_enrollments FOR SELECT
  TO authenticated
  USING (true);

-- Student marks: Students see their own, teachers see their exams
CREATE POLICY "Students can view their own marks"
  ON public.student_marks FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.exams WHERE id = exam_id AND teacher_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'hod')
  );

CREATE POLICY "Teachers can insert marks for their exams"
  ON public.student_marks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = exam_id AND teacher_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Teachers can update marks for their draft exams"
  ON public.student_marks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = exam_id AND teacher_id = auth.uid() AND status = 'draft'
    )
  );

-- Marks computed: Same as student marks
CREATE POLICY "Computed marks viewable appropriately"
  ON public.marks_computed FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'principal')
  );

-- Exam snapshots: Viewable by staff
CREATE POLICY "Snapshots viewable by staff"
  ON public.exam_snapshots FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'principal')
  );

-- Audit logs: Only principal can view
CREATE POLICY "Audit logs viewable by principal"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Teacher assignments: Viewable by all, managed by HOD/Principal
CREATE POLICY "Teacher assignments viewable by all"
  ON public.teacher_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HOD and Principal can manage assignments"
  ON public.teacher_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'hod'));