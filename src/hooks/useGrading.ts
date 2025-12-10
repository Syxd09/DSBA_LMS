import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface GradingRule {
  id: string;
  department_id: string | null;
  min_percentage: number;
  max_percentage: number;
  grade: string;
  grade_point: number;
}

export interface FinalMark {
  id: string;
  student_id: string;
  subject_id: string;
  cohort_id: string;
  internal_1: number;
  internal_2: number;
  best_internal: number;
  external_marks: number;
  total_marks: number;
  percentage: number;
  grade: string;
  grade_point: number;
  co_attainment: Record<string, number>;
  status: string;
}

export function useGradingRules(departmentId?: string) {
  return useQuery({
    queryKey: ['grading-rules', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('grading_rules')
        .select('*')
        .order('min_percentage', { ascending: false });
      
      if (departmentId) {
        query = query.or(`department_id.eq.${departmentId},department_id.is.null`);
      } else {
        query = query.is('department_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFinalMarks(filters: { student_id?: string; subject_id?: string; cohort_id?: string }) {
  return useQuery({
    queryKey: ['final-marks', filters],
    queryFn: async () => {
      let query = supabase
        .from('final_marks')
        .select('*');
      
      if (filters.student_id) query = query.eq('student_id', filters.student_id);
      if (filters.subject_id) query = query.eq('subject_id', filters.subject_id);
      if (filters.cohort_id) query = query.eq('cohort_id', filters.cohort_id);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCalculateGrades() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { 
      cohort_id: string; 
      subject_id: string;
      internal_method?: 'best' | 'avg' | 'weighted';
    }) => {
      // Get all published exams for this subject and cohort
      const { data: exams, error: examError } = await supabase
        .from('exams')
        .select('id, exam_type, max_marks')
        .eq('subject_id', params.subject_id)
        .eq('cohort_id', params.cohort_id)
        .eq('status', 'published');
      
      if (examError) throw examError;
      
      const i1Exam = exams?.find(e => e.exam_type === 'I1');
      const i2Exam = exams?.find(e => e.exam_type === 'I2');
      const extExam = exams?.find(e => e.exam_type === 'External');
      
      // Get students in this cohort
      const { data: students, error: studentsError } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('cohort_id', params.cohort_id)
        .eq('status', 'active');
      
      if (studentsError) throw studentsError;
      
      // Get grading rules
      const { data: gradingRules } = await supabase
        .from('grading_rules')
        .select('*')
        .order('min_percentage', { ascending: false });
      
      const results = [];
      
      for (const student of students || []) {
        let internal1 = 0;
        let internal2 = 0;
        let external = 0;
        
        // Get marks for each exam
        if (i1Exam) {
          const { data: marks } = await supabase
            .from('student_marks')
            .select('marks')
            .eq('exam_id', i1Exam.id)
            .eq('student_id', student.student_id);
          
          internal1 = marks?.reduce((sum, m) => sum + Number(m.marks), 0) || 0;
        }
        
        if (i2Exam) {
          const { data: marks } = await supabase
            .from('student_marks')
            .select('marks')
            .eq('exam_id', i2Exam.id)
            .eq('student_id', student.student_id);
          
          internal2 = marks?.reduce((sum, m) => sum + Number(m.marks), 0) || 0;
        }
        
        if (extExam) {
          const { data: marks } = await supabase
            .from('student_marks')
            .select('marks')
            .eq('exam_id', extExam.id)
            .eq('student_id', student.student_id);
          
          external = marks?.reduce((sum, m) => sum + Number(m.marks), 0) || 0;
        }
        
        // Calculate best internal based on method
        let bestInternal = 0;
        const method = params.internal_method || 'best';
        
        switch (method) {
          case 'best':
            bestInternal = Math.max(internal1, internal2);
            break;
          case 'avg':
            bestInternal = (internal1 + internal2) / 2;
            break;
          case 'weighted':
            bestInternal = internal1 * 0.4 + internal2 * 0.6;
            break;
        }
        
        // Calculate total (40% internal + 60% external)
        const totalMax = (i1Exam?.max_marks || 0) * 0.4 + (extExam?.max_marks || 0) * 0.6;
        const total = bestInternal * 0.4 + external * 0.6;
        const percentage = totalMax > 0 ? (total / totalMax) * 100 : 0;
        
        // Determine grade
        const gradeRule = gradingRules?.find(r => 
          percentage >= r.min_percentage && percentage <= r.max_percentage
        );
        
        // Upsert final marks
        const { error } = await supabase
          .from('final_marks')
          .upsert({
            student_id: student.student_id,
            subject_id: params.subject_id,
            cohort_id: params.cohort_id,
            internal_1: internal1,
            internal_2: internal2,
            best_internal: bestInternal,
            external_marks: external,
            total_marks: total,
            percentage: Math.round(percentage * 100) / 100,
            grade: gradeRule?.grade || 'F',
            grade_point: gradeRule?.grade_point || 0,
            status: 'calculated',
            computed_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,subject_id,cohort_id'
          });
        
        if (error) throw error;
        
        results.push({
          student_id: student.student_id,
          grade: gradeRule?.grade || 'F',
          percentage
        });
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['final-marks'] });
      toast({ title: 'Grades calculated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to calculate grades', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSemesterResults(studentId: string | null) {
  return useQuery({
    queryKey: ['semester-results', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from('semester_results')
        .select('*')
        .eq('student_id', studentId)
        .order('semester');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
}

export function useCalculateSGPA() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { student_id: string; cohort_id: string; semester: number }) => {
      // Get all final marks for this student in this semester's subjects
      const { data: finalMarks, error: marksError } = await supabase
        .from('final_marks')
        .select(`
          *,
          subject:subjects(credits, semester)
        `)
        .eq('student_id', params.student_id)
        .eq('cohort_id', params.cohort_id);
      
      if (marksError) throw marksError;
      
      // Filter by semester
      const semesterMarks = finalMarks?.filter(m => 
        m.subject && m.subject.semester === params.semester
      ) || [];
      
      let totalCredits = 0;
      let earnedCredits = 0;
      let gradePoints = 0;
      
      semesterMarks.forEach(mark => {
        const credits = mark.subject?.credits || 0;
        totalCredits += credits;
        
        if (mark.grade !== 'F') {
          earnedCredits += credits;
        }
        
        gradePoints += (mark.grade_point || 0) * credits;
      });
      
      const sgpa = totalCredits > 0 ? gradePoints / totalCredits : 0;
      
      // Get previous semesters for CGPA calculation
      const { data: prevResults } = await supabase
        .from('semester_results')
        .select('*')
        .eq('student_id', params.student_id)
        .eq('cohort_id', params.cohort_id)
        .lt('semester', params.semester);
      
      let cumulativeGradePoints = gradePoints;
      let cumulativeCredits = totalCredits;
      
      prevResults?.forEach(r => {
        cumulativeGradePoints += (r.sgpa || 0) * (r.total_credits || 0);
        cumulativeCredits += r.total_credits || 0;
      });
      
      const cgpa = cumulativeCredits > 0 ? cumulativeGradePoints / cumulativeCredits : 0;
      
      // Upsert semester result
      const { error } = await supabase
        .from('semester_results')
        .upsert({
          student_id: params.student_id,
          cohort_id: params.cohort_id,
          semester: params.semester,
          total_credits: totalCredits,
          earned_credits: earnedCredits,
          sgpa: Math.round(sgpa * 100) / 100,
          cgpa: Math.round(cgpa * 100) / 100,
          status: earnedCredits === totalCredits ? 'passed' : 'backlog'
        }, {
          onConflict: 'student_id,cohort_id,semester'
        });
      
      if (error) throw error;
      
      return { sgpa, cgpa };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semester-results'] });
      toast({ title: 'SGPA/CGPA calculated' });
    },
  });
}
