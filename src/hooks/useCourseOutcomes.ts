import { useQuery } from '@tanstack/react-query';
import { subjectsApi } from '@/lib/api';

export interface CourseOutcome {
  id: string;
  subject_id: string;
  co_number: number;
  description: string;
  bloom_level: string;
  created_at: string;
}

export function useCourseOutcomes(subjectId?: string) {
  return useQuery({
    queryKey: ['course-outcomes', subjectId],
    queryFn: () => subjectsApi.getOutcomes(subjectId!),
    enabled: !!subjectId,
  });
}
