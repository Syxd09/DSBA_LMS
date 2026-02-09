import { useQuery } from '@tanstack/react-query';
import { offeringsApi } from '@/lib/api';

export interface CourseOutcome {
  id: string;
  offering_id: string; // Changed from subject_id
  subject_id?: string; // Optional for backward compatibility if needed
  co_number: number;
  description: string;
  bloom_level: string;
  created_at: string;
}

export function useCourseOutcomes(offeringId?: string) {
  return useQuery({
    queryKey: ['course-outcomes', offeringId],
    queryFn: () => offeringsApi.getOutcomes(offeringId!),
    enabled: !!offeringId,
  });
}
