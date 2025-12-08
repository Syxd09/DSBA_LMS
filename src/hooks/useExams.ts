import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Exam {
  id: string;
  subject_id: string;
  cohort_id: string;
  exam_type: string;
  max_marks: number;
  status: string;
  teacher_id: string | null;
  created_at: string;
  published_at: string | null;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  cohort?: {
    id: string;
    name: string;
  };
}

export interface ExamSection {
  id: string;
  exam_id: string;
  name: string;
  sequence: number;
  max_marks: number;
  selection_mode: string;
  required_questions: number;
}

export interface Question {
  id: string;
  section_id: string;
  sequence: number;
  max_marks: number;
  bloom_level: string;
  co_id: string | null;
  is_optional: boolean;
  group_key: string | null;
}

export interface SubQuestion {
  id: string;
  question_id: string;
  label: string;
  max_marks: number;
  bloom_level: string;
  co_id: string | null;
}

export function useTeacherExams() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-exams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(id, name, code),
          cohort:cohorts(id, name)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Exam[];
    },
    enabled: !!user?.id,
  });
}

export function useExamDetails(examId: string | null) {
  return useQuery({
    queryKey: ['exam-details', examId],
    queryFn: async () => {
      if (!examId) return null;

      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(id, name, code),
          cohort:cohorts(id, name)
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      const { data: sections, error: sectionsError } = await supabase
        .from('exam_sections')
        .select('*')
        .eq('exam_id', examId)
        .order('sequence');

      if (sectionsError) throw sectionsError;

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('section_id', sections.map(s => s.id))
        .order('sequence');

      if (questionsError) throw questionsError;

      const questionIds = questions.map(q => q.id);
      let subQuestions: SubQuestion[] = [];

      if (questionIds.length > 0) {
        const { data: subs, error: subsError } = await supabase
          .from('sub_questions')
          .select('*')
          .in('question_id', questionIds);

        if (subsError) throw subsError;
        subQuestions = subs;
      }

      return {
        exam: exam as Exam,
        sections: sections as ExamSection[],
        questions: questions as Question[],
        subQuestions,
      };
    },
    enabled: !!examId,
  });
}

export function useExamStudents(cohortId: string | null) {
  return useQuery({
    queryKey: ['exam-students', cohortId],
    queryFn: async () => {
      if (!cohortId) return [];

      const { data: enrollments, error } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          student_id,
          roll_number,
          status
        `)
        .eq('cohort_id', cohortId)
        .eq('status', 'active');

      if (error) throw error;

      // Fetch profiles for students
      const studentIds = enrollments.map(e => e.student_id);
      if (studentIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]));

      return enrollments.map(e => ({
        studentId: e.student_id,
        rollNumber: e.roll_number,
        studentName: profileMap.get(e.student_id) || 'Unknown',
      }));
    },
    enabled: !!cohortId,
  });
}

export function useStudentMarks(examId: string | null) {
  return useQuery({
    queryKey: ['student-marks', examId],
    queryFn: async () => {
      if (!examId) return [];

      const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('exam_id', examId);

      if (error) throw error;
      return data;
    },
    enabled: !!examId,
  });
}

export function useSaveMarks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      examId, 
      marks 
    }: { 
      examId: string; 
      marks: Array<{ studentId: string; subQuestionId: string; marks: number }> 
    }) => {
      // Delete existing marks for this exam and insert new ones
      const { error: deleteError } = await supabase
        .from('student_marks')
        .delete()
        .eq('exam_id', examId);

      if (deleteError) throw deleteError;

      if (marks.length === 0) return;

      const insertData = marks.map(m => ({
        exam_id: examId,
        student_id: m.studentId,
        sub_question_id: m.subQuestionId,
        marks: m.marks,
        entered_by: user?.id,
      }));

      const { error: insertError } = await supabase
        .from('student_marks')
        .insert(insertData);

      if (insertError) throw insertError;
    },
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ['student-marks', examId] });
    },
  });
}

export function usePublishExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase
        .from('exams')
        .update({ 
          status: 'published', 
          published_at: new Date().toISOString() 
        })
        .eq('id', examId);

      if (error) throw error;
    },
    onSuccess: (_, examId) => {
      queryClient.invalidateQueries({ queryKey: ['exam-details', examId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
  });
}

export function useCreateExamStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      examId, 
      sections 
    }: { 
      examId: string; 
      sections: Array<{
        name: string;
        sequence: number;
        maxMarks: number;
        selectionMode: string;
        requiredQuestions: number;
        questions: Array<{
          sequence: number;
          maxMarks: number;
          bloomLevel: string;
          coId: string | null;
          isOptional: boolean;
          subQuestions: Array<{
            label: string;
            maxMarks: number;
            bloomLevel: string;
            coId: string | null;
          }>;
        }>;
      }> 
    }) => {
      // Delete existing structure
      const { data: existingSections } = await supabase
        .from('exam_sections')
        .select('id')
        .eq('exam_id', examId);

      if (existingSections && existingSections.length > 0) {
        await supabase
          .from('exam_sections')
          .delete()
          .eq('exam_id', examId);
      }

      // Create new sections
      for (const section of sections) {
        const { data: newSection, error: sectionError } = await supabase
          .from('exam_sections')
          .insert({
            exam_id: examId,
            name: section.name,
            sequence: section.sequence,
            max_marks: section.maxMarks,
            selection_mode: section.selectionMode,
            required_questions: section.requiredQuestions,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Create questions
        for (const question of section.questions) {
          const { data: newQuestion, error: questionError } = await supabase
            .from('questions')
            .insert({
              section_id: newSection.id,
              sequence: question.sequence,
              max_marks: question.maxMarks,
              bloom_level: question.bloomLevel,
              co_id: question.coId,
              is_optional: question.isOptional,
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Create sub-questions
          if (question.subQuestions.length > 0) {
            const subQuestionsData = question.subQuestions.map(sq => ({
              question_id: newQuestion.id,
              label: sq.label,
              max_marks: sq.maxMarks,
              bloom_level: sq.bloomLevel,
              co_id: sq.coId,
            }));

            const { error: subError } = await supabase
              .from('sub_questions')
              .insert(subQuestionsData);

            if (subError) throw subError;
          }
        }
      }
    },
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ['exam-details', examId] });
    },
  });
}
