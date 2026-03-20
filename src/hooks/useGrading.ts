import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export interface GradingRule {
  id: string;
  departmentId: string | null;
  minPercentage: number;
  maxPercentage: number;
  grade: string;
  gradePoint: number;
}

export interface FinalMark {
  id: string;
  studentId: string;
  subjectId: string;
  cohortId: string;
  internal1: number;
  internal2: number;
  bestInternal: number;
  externalMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  coAttainment: Record<string, number>;
  status: string;
}

export function useGradingRules(departmentId?: string) {
  return useQuery({
    queryKey: ['grading-rules', departmentId],
    queryFn: async () => {
      const { data } = await api.get(`/grading/rules${departmentId ? `?departmentId=${departmentId}` : ''}`);
      return data || [];
    },
  });
}

export function useCreateGradingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleData: Omit<GradingRule, 'id'>) => {
      const { data } = await api.post('/grading/rules', ruleData);
      return data as GradingRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradingRules'] });
      toast({ title: 'Success', description: 'Grading rule added successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to create rule', 
        variant: 'destructive' 
      });
    }
  });
}

export function useDeleteGradingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/grading/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradingRules'] });
      toast({ title: 'Success', description: 'Rule deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to delete rule', 
        variant: 'destructive' 
      });
    }
  });
}

export function useFinalMarks(filters: { student_id?: string; subject_id?: string; cohort_id?: string }) {
  return useQuery({
    queryKey: ['final-marks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.student_id) params.append('studentId', filters.student_id);
      if (filters.subject_id) params.append('subjectId', filters.subject_id);
      if (filters.cohort_id) params.append('cohortId', filters.cohort_id);

      const { data } = await api.get(`/grading/final-marks?${params.toString()}`);
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
      await api.post('/grading/calculate', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['final-marks'] });
      toast({ title: 'Grades calculated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to calculate grades', description: error.response?.data?.message || error.message, variant: 'destructive' });
    },
  });
}

export function useSemesterResults(studentId: string | null) {
  return useQuery({
    queryKey: ['semester-results', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data } = await api.get(`/grading/semester-results/${studentId}`);
      return data || [];
    },
    enabled: !!studentId,
  });
}

export function useCalculateSGPA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { student_id: string; cohort_id: string; semester: number }) => {
      const { data } = await api.post('/grading/calculate-sgpa', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semester-results'] });
      toast({ title: 'SGPA/CGPA calculated' });
    },
  });
}
