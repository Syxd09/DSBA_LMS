import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface COAttainmentData {
  co: string;
  attainment: number;
  target: number;
  description?: string;
}

export interface BloomDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface SubjectPerformance {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  average: number;
  highest: number;
  lowest: number;
  pass_rate: number;
  total_students: number;
}

export function useCOAttainment(subjectId: string | null) {
  return useQuery({
    queryKey: ['co-attainment', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      // Get course outcomes for the subject
      const { data: cos, error: coError } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('co_number');
      
      if (coError) throw coError;
      
      // Get marks data for this subject's exams to calculate attainment
      const { data: exams } = await supabase
        .from('exams')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('status', 'published');
      
      const examIds = exams?.map(e => e.id) || [];
      
      if (examIds.length === 0) {
        return cos?.map(co => ({
          co: `CO${co.co_number}`,
          attainment: 0,
          target: 70,
          description: co.description
        })) || [];
      }
      
      // Get questions mapped to each CO
      const { data: subQuestions } = await supabase
        .from('sub_questions')
        .select(`
          id,
          co_id,
          max_marks,
          question:questions!inner(
            section_id,
            exam_sections!inner(exam_id)
          )
        `)
        .in('question.exam_sections.exam_id', examIds);
      
      // Get student marks
      const { data: marks } = await supabase
        .from('student_marks')
        .select('sub_question_id, marks')
        .in('exam_id', examIds);
      
      // Calculate attainment per CO
      const attainmentMap: Record<string, { total: number; max: number }> = {};
      
      cos?.forEach(co => {
        attainmentMap[co.id] = { total: 0, max: 0 };
      });
      
      subQuestions?.forEach(sq => {
        if (sq.co_id && attainmentMap[sq.co_id]) {
          const sqMarks = marks?.filter(m => m.sub_question_id === sq.id) || [];
          const totalMarks = sqMarks.reduce((sum, m) => sum + Number(m.marks), 0);
          const maxPossible = sqMarks.length * sq.max_marks;
          
          attainmentMap[sq.co_id].total += totalMarks;
          attainmentMap[sq.co_id].max += maxPossible;
        }
      });
      
      return cos?.map(co => ({
        co: `CO${co.co_number}`,
        attainment: attainmentMap[co.id]?.max > 0 
          ? Math.round((attainmentMap[co.id].total / attainmentMap[co.id].max) * 100)
          : 0,
        target: 70,
        description: co.description
      })) || [];
    },
    enabled: !!subjectId,
  });
}

export function useBloomDistribution(examId: string | null) {
  return useQuery({
    queryKey: ['bloom-distribution', examId],
    queryFn: async () => {
      if (!examId) return [];
      
      const { data: questions, error } = await supabase
        .from('questions')
        .select(`
          bloom_level,
          max_marks,
          section:exam_sections!inner(exam_id)
        `)
        .eq('section.exam_id', examId);
      
      if (error) throw error;
      
      const bloomCounts: Record<string, number> = {
        'L1': 0, 'L2': 0, 'L3': 0, 'L4': 0, 'L5': 0, 'L6': 0
      };
      
      questions?.forEach(q => {
        if (q.bloom_level && bloomCounts[q.bloom_level] !== undefined) {
          bloomCounts[q.bloom_level]++;
        }
      });
      
      const total = Object.values(bloomCounts).reduce((a, b) => a + b, 0);
      
      const levelNames: Record<string, string> = {
        'L1': 'Remember',
        'L2': 'Understand',
        'L3': 'Apply',
        'L4': 'Analyze',
        'L5': 'Evaluate',
        'L6': 'Create'
      };
      
      return Object.entries(bloomCounts).map(([level, count]) => ({
        level: levelNames[level] || level,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));
    },
    enabled: !!examId,
  });
}

export function useSubjectPerformance(cohortId: string | null) {
  return useQuery({
    queryKey: ['subject-performance', cohortId],
    queryFn: async () => {
      if (!cohortId) return [];
      
      const { data: exams, error } = await supabase
        .from('exams')
        .select(`
          id,
          max_marks,
          subject:subjects(id, name, code)
        `)
        .eq('cohort_id', cohortId)
        .eq('status', 'published');
      
      if (error) throw error;
      
      const performanceBySubject: Record<string, SubjectPerformance> = {};
      
      for (const exam of exams || []) {
        if (!exam.subject) continue;
        
        const { data: marks } = await supabase
          .from('student_marks')
          .select('student_id, marks')
          .eq('exam_id', exam.id);
        
        // Aggregate marks per student
        const studentTotals: Record<string, number> = {};
        marks?.forEach(m => {
          studentTotals[m.student_id] = (studentTotals[m.student_id] || 0) + Number(m.marks);
        });
        
        const totals = Object.values(studentTotals);
        if (totals.length === 0) continue;
        
        const subjectId = exam.subject.id;
        const passThreshold = exam.max_marks * 0.4;
        
        if (!performanceBySubject[subjectId]) {
          performanceBySubject[subjectId] = {
            subject_id: subjectId,
            subject_name: exam.subject.name,
            subject_code: exam.subject.code,
            average: 0,
            highest: 0,
            lowest: Infinity,
            pass_rate: 0,
            total_students: 0
          };
        }
        
        const perf = performanceBySubject[subjectId];
        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
        const passed = totals.filter(t => t >= passThreshold).length;
        
        perf.average = Math.round(((perf.average + avg) / 2) * 100) / 100;
        perf.highest = Math.max(perf.highest, ...totals);
        perf.lowest = Math.min(perf.lowest, ...totals);
        perf.pass_rate = Math.round((passed / totals.length) * 100);
        perf.total_students = totals.length;
      }
      
      return Object.values(performanceBySubject);
    },
    enabled: !!cohortId,
  });
}

export function useDepartmentStats() {
  return useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name, code');
      
      if (deptError) throw deptError;
      
      const { data: programs } = await supabase
        .from('programs')
        .select('id, department_id');
      
      const { data: cohorts } = await supabase
        .from('cohorts')
        .select('id, program_id');
      
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('cohort_id, status');
      
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, department');
      
      return departments?.map(dept => {
        const deptPrograms = programs?.filter(p => p.department_id === dept.id) || [];
        const programIds = deptPrograms.map(p => p.id);
        const deptCohorts = cohorts?.filter(c => programIds.includes(c.program_id)) || [];
        const cohortIds = deptCohorts.map(c => c.id);
        const deptEnrollments = enrollments?.filter(e => cohortIds.includes(e.cohort_id)) || [];
        const teacherIds = teacherRoles?.map(r => r.user_id) || [];
        const deptTeachers = profiles?.filter(p => 
          teacherIds.includes(p.user_id) && p.department === dept.name
        ) || [];
        
        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          students: deptEnrollments.filter(e => e.status === 'active').length,
          teachers: deptTeachers.length,
          programs: deptPrograms.length
        };
      }) || [];
    },
  });
}
