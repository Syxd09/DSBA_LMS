import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CourseOutcome {
  id: string;
  code: string;
  description: string;
  program_id: string;
  subject_id: string;
}

export function useCourseOutcomes(subjectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: outcomes = [], isLoading } = useQuery({
    queryKey: ['course-outcomes', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data } = await api.get(`/course-outcomes/${subjectId}`);
      return data as CourseOutcome[];
    },
    enabled: !!subjectId,
  });

  const createOutcome = useMutation({
    mutationFn: async (outcome: Omit<CourseOutcome, 'id'>) => {
      const { data } = await api.post('/course-outcomes', outcome);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-outcomes', subjectId] });
    },
  });

  return {
    outcomes,
    isLoading,
    createOutcome,
  };
}
