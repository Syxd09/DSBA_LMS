import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradingApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export interface GradingRule {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number;
}

export interface FinalMarks {
  id: string;
  student_id: string;
  subject_id: string;
  cohort_id: string;
  internal_1: number | null;
  internal_2: number | null;
  best_internal: number;
  external_marks: number | null;
  total_marks: number;
  percentage: number;
  grade: string;
  grade_point: number;
}

export function useGrading() {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['grading-rules'],
    queryFn: () => gradingApi.getRules(),
  });

  const calculateGradesMutation = useMutation({
    mutationFn: ({ cohortId, subjectId }: { cohortId: string; subjectId: string }) =>
      gradingApi.calculateGrades(cohortId, subjectId),
    onSuccess: () => {
      toast({ title: 'Grades calculated successfully' });
      queryClient.invalidateQueries({ queryKey: ['final-marks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error calculating grades',
        description: error.response?.data?.detail || 'Failed to calculate grades',
        variant: 'destructive',
      });
    },
  });

  const useFinalMarks = (params?: { cohort_id?: string; subject_id?: string }) => {
    return useQuery({
      queryKey: ['final-marks', params],
      queryFn: () => gradingApi.getFinalMarks(params),
    });
  };

  return {
    rules,
    loadingRules,
    calculateGrades: calculateGradesMutation.mutate,
    isCalculating: calculateGradesMutation.isPending,
    useFinalMarks,
  };
}

export function useGradingRules() {
  return useQuery({
    queryKey: ['grading-rules'],
    queryFn: () => gradingApi.getRules(),
  });
}

export function useFinalMarks(params?: { cohort_id?: string; subject_id?: string }) {
  return useQuery({
    queryKey: ['final-marks', params],
    queryFn: () => gradingApi.getFinalMarks(params),
    enabled: !!(params?.cohort_id || params?.subject_id),
  });
}
