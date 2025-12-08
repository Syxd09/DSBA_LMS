import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CourseOutcome {
  id: string;
  subject_id: string;
  co_number: number;
  description: string;
  bloom_level: string;
}

export function useCourseOutcomes(subjectId: string | null) {
  return useQuery({
    queryKey: ['course-outcomes', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];

      const { data, error } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('co_number');

      if (error) throw error;
      return data as CourseOutcome[];
    },
    enabled: !!subjectId,
  });
}
